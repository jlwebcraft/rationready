import crypto from 'node:crypto';
import {
  Report,
  ReportType,
  UserRole,
  EposStatus,
  CommodityAvailability,
  ConfidenceLevel,
  ALLOWED_COMMODITY_CODES,
  AllowedCommodityCode,
  REPORT_EXPIRY_SECONDS,
  REPORT_COOLDOWN_SECONDS,
  REPORT_SOURCE_LABELS,
  createReportKey,
  QueuePayload,
  EposPayload,
  StockPayload,
  SubmitReportInput,
  QueueStatusSummary,
  EposStatusSummary,
  CommodityStockStatusSummary,
  ShopStatusResponse,
  ApiErrorCode,
} from '../domain/types.js';
import { ShopRepository, shopRepository } from '../repositories/shop.repository.js';
import { ReportRepository, reportRepository } from '../repositories/report.repository.js';
import { validateReport } from '../validators/report.validator.js';

export interface ReportingServiceOptions {
  shopRepo?: ShopRepository;
  reportRepo?: ReportRepository;
  clock?: () => Date;
}

export class ReportingService {
  private shopRepo: ShopRepository;
  private reportRepo: ReportRepository;
  private clock: () => Date;

  constructor(options: ReportingServiceOptions = {}) {
    this.shopRepo = options.shopRepo || shopRepository;
    this.reportRepo = options.reportRepo || reportRepository;
    this.clock = options.clock || (() => new Date());
  }

  /**
   * P3-11: Submits a new community or shop manager report.
   * Enforces shop existence, duplicate cooldown (P3-05), server timestamps (P3-04),
   * and TTL expiry calculation.
   */
  async submitReport(
    shopId: string,
    input: SubmitReportInput,
    reporterSub: string,
    reporterRole: UserRole
  ): Promise<Report> {
    // 1. Verify target shop exists
    const shop = await this.shopRepo.getShopById(shopId);
    if (!shop) {
      const err = new Error(`Shop with ID '${shopId}' was not found.`);
      (err as unknown as { code: string; statusCode: number }).code = ApiErrorCode.SHOP_NOT_FOUND;
      (err as unknown as { code: string; statusCode: number }).statusCode = 404;
      throw err;
    }

    const now = this.clock();
    const nowEpochSeconds = Math.floor(now.getTime() / 1000);
    const createdAt = now.toISOString();

    // 2. Enforce 60-second duplicate cooldown protection (P3-05)
    // Cutoff calculated with millisecond precision: now.getTime() - REPORT_COOLDOWN_SECONDS * 1000
    const cutoffIso = new Date(now.getTime() - REPORT_COOLDOWN_SECONDS * 1000).toISOString();
    const commodityCode =
      input.reportType === ReportType.STOCK
        ? (input.payload as StockPayload).commodityCode
        : undefined;

    // Fails closed if query throws
    const recentReport = await this.reportRepo.findRecentUserReport(
      shopId,
      reporterSub,
      input.reportType,
      cutoffIso,
      commodityCode
    );

    if (recentReport) {
      const err = new Error(
        'A recent report was already submitted. Please wait 60 seconds between submissions.'
      );
      (err as unknown as { code: string; statusCode: number }).code = ApiErrorCode.COOLDOWN_ACTIVE;
      (err as unknown as { code: string; statusCode: number }).statusCode = 429;
      throw err;
    }

    // 3. Construct server-side report attributes (P3-04)
    const reportId = crypto.randomUUID();
    const reportKey = createReportKey(createdAt, reportId);
    const expirySeconds = REPORT_EXPIRY_SECONDS[input.reportType];
    const expiresAt = nowEpochSeconds + expirySeconds;

    const report: Report = {
      shopId,
      reportKey,
      reportId,
      reportType: input.reportType,
      createdAt,
      expiresAt,
      reporterSub,
      reporterRole,
      payload: input.payload,
      isDemoData: false,
    };

    // 4. Validate complete report entity
    const validation = validateReport(report);
    if (!validation.valid) {
      const err = new Error(
        `Report validation failed: ${validation.errors?.join(', ') || validation.error}`
      );
      (err as unknown as { code: string; statusCode: number }).code = ApiErrorCode.VALIDATION_ERROR;
      (err as unknown as { code: string; statusCode: number }).statusCode = 400;
      throw err;
    }

    // 5. Persist report
    await this.reportRepo.createReport(report);

    return report;
  }

  /**
   * P3-12: Retrieves aggregated current freshness and status for a shop.
   * Handles pagination (P3-10), filters expired reports (P3-10), deduplicates reporters (P3-06),
   * calculates queue medians with 5-minute rounding (P3-06), ePOS strict majority (P3-07),
   * stock strict majority (P3-08), confidence tiers (P3-09), and provenance labels (P3-09).
   */
  async getShopStatus(shopId: string): Promise<ShopStatusResponse> {
    // 1. Verify shop exists
    const shop = await this.shopRepo.getShopById(shopId);
    if (!shop) {
      const err = new Error(`Shop with ID '${shopId}' was not found.`);
      (err as unknown as { code: string; statusCode: number }).code = ApiErrorCode.SHOP_NOT_FOUND;
      (err as unknown as { code: string; statusCode: number }).statusCode = 404;
      throw err;
    }

    const now = this.clock();
    const nowEpochSeconds = Math.floor(now.getTime() / 1000);

    // 2. Fetch all reports handling DynamoDB pagination (P3-10)
    const allReports = await this.reportRepo.getAllReportsByShopId(shopId);

    // 3. Filter expired reports: report.expiresAt <= nowEpochSeconds is excluded (P3-10)
    const freshReports = allReports.filter((r) => r.expiresAt > nowEpochSeconds);

    // Sort descending by createdAt (newest first) to ensure newest report per user is kept
    freshReports.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    // 4. Deduplicate per user (keep newest per reporter per category) (P3-06)
    const seenQueueUsers = new Set<string>();
    const deduplicatedQueue: Report[] = [];

    const seenEposUsers = new Set<string>();
    const deduplicatedEpos: Report[] = [];

    const seenStockUsers = new Set<string>();
    const deduplicatedStock: Report[] = [];

    for (const report of freshReports) {
      if (report.reportType === ReportType.QUEUE) {
        if (!seenQueueUsers.has(report.reporterSub)) {
          seenQueueUsers.add(report.reporterSub);
          deduplicatedQueue.push(report);
        }
      } else if (report.reportType === ReportType.EPOS) {
        if (!seenEposUsers.has(report.reporterSub)) {
          seenEposUsers.add(report.reporterSub);
          deduplicatedEpos.push(report);
        }
      } else if (report.reportType === ReportType.STOCK) {
        const payload = report.payload as StockPayload;
        const key = `${report.reporterSub}#${payload.commodityCode}`;
        if (!seenStockUsers.has(key)) {
          seenStockUsers.add(key);
          deduplicatedStock.push(report);
        }
      }
    }

    // 5. Calculate Queue Status (P3-06, P3-09)
    const queueSummary = this.calculateQueueStatus(deduplicatedQueue, now);

    // 6. Calculate ePOS Status (P3-07, P3-09)
    const eposSummary = this.calculateEposStatus(deduplicatedEpos, now);

    // 7. Calculate Stock Status (P3-08, P3-09)
    const stockSummaries = ALLOWED_COMMODITY_CODES.map((code) => {
      const commodityReports = deduplicatedStock.filter(
        (r) => (r.payload as StockPayload).commodityCode === code
      );
      return this.calculateCommodityStockStatus(code, commodityReports, now);
    });

    return {
      shopId,
      generatedAt: now.toISOString(),
      queue: queueSummary,
      epos: eposSummary,
      stock: stockSummaries,
    };
  }

  /**
   * P3-06 & P3-09: Calculates median wait time with 5-minute rounding and confidence tier.
   */
  private calculateQueueStatus(reports: Report[], now: Date): QueueStatusSummary {
    if (reports.length === 0) {
      return {
        waitMinutes: 'UNKNOWN',
        latestReportAt: null,
        ageSeconds: null,
        distinctReporterCount: 0,
        confidence: ConfidenceLevel.LOW,
        sources: [],
      };
    }

    const waitTimes = reports
      .map((r) => (r.payload as QueuePayload).waitMinutes)
      .sort((a, b) => a - b);

    // Median calculation
    const n = waitTimes.length;
    let rawMedian: number;
    if (n % 2 === 1) {
      rawMedian = waitTimes[Math.floor(n / 2)];
    } else {
      rawMedian = (waitTimes[n / 2 - 1] + waitTimes[n / 2]) / 2;
    }

    // Round to nearest 5 minutes
    const roundedWait = Math.round(rawMedian / 5) * 5;

    const latestReportAt = reports[0].createdAt;
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(latestReportAt)) / 1000));

    // Confidence tier calculation (P3-09)
    const minVal = waitTimes[0];
    const maxVal = waitTimes[waitTimes.length - 1];
    const range = maxVal - minVal;

    let confidence: ConfidenceLevel;
    if (n === 1) {
      confidence = ConfidenceLevel.LOW;
    } else if (n === 2) {
      confidence = range <= 15 ? ConfidenceLevel.MEDIUM : ConfidenceLevel.MIXED;
    } else {
      // n >= 3
      if (range <= 15) {
        confidence = ConfidenceLevel.HIGH;
      } else if (range <= 30) {
        confidence = ConfidenceLevel.MEDIUM;
      } else {
        confidence = ConfidenceLevel.MIXED;
      }
    }

    return {
      waitMinutes: roundedWait,
      latestReportAt,
      ageSeconds,
      distinctReporterCount: n,
      confidence,
      sources: this.extractSourceLabels(reports),
    };
  }

  /**
   * P3-07 & P3-09: Calculates ePOS strict majority and confidence tier.
   */
  private calculateEposStatus(reports: Report[], now: Date): EposStatusSummary {
    if (reports.length === 0) {
      return {
        status: 'UNKNOWN',
        latestReportAt: null,
        ageSeconds: null,
        distinctReporterCount: 0,
        confidence: ConfidenceLevel.LOW,
        sources: [],
      };
    }

    const total = reports.length;
    const workingCount = reports.filter(
      (r) => (r.payload as EposPayload).status === EposStatus.WORKING
    ).length;
    const notWorkingCount = reports.filter(
      (r) => (r.payload as EposPayload).status === EposStatus.NOT_WORKING
    ).length;

    let status: EposStatus | 'MIXED REPORTS';
    if (workingCount > total / 2) {
      status = EposStatus.WORKING;
    } else if (notWorkingCount > total / 2) {
      status = EposStatus.NOT_WORKING;
    } else {
      status = 'MIXED REPORTS';
    }

    const latestReportAt = reports[0].createdAt;
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(latestReportAt)) / 1000));

    // Confidence tier (P3-09)
    let confidence: ConfidenceLevel;
    if (total === 1) {
      confidence = ConfidenceLevel.LOW;
    } else if (total === 2) {
      confidence =
        workingCount === 2 || notWorkingCount === 2
          ? ConfidenceLevel.MEDIUM
          : ConfidenceLevel.MIXED;
    } else {
      // total >= 3
      const majorityCount = Math.max(workingCount, notWorkingCount);
      if (majorityCount / total >= 0.75) {
        confidence = ConfidenceLevel.HIGH;
      } else if (majorityCount > total / 2) {
        confidence = ConfidenceLevel.MEDIUM;
      } else {
        confidence = ConfidenceLevel.MIXED;
      }
    }

    return {
      status,
      latestReportAt,
      ageSeconds,
      distinctReporterCount: total,
      confidence,
      sources: this.extractSourceLabels(reports),
    };
  }

  /**
   * P3-08 & P3-09: Calculates stock strict majority and confidence tier for a commodity.
   */
  private calculateCommodityStockStatus(
    commodityCode: AllowedCommodityCode,
    reports: Report[],
    now: Date
  ): CommodityStockStatusSummary {
    if (reports.length === 0) {
      return {
        commodityCode,
        availability: 'UNKNOWN',
        latestReportAt: null,
        ageSeconds: null,
        distinctReporterCount: 0,
        confidence: ConfidenceLevel.LOW,
        sources: [],
      };
    }

    const total = reports.length;
    const availableCount = reports.filter(
      (r) => (r.payload as StockPayload).availability === CommodityAvailability.AVAILABLE
    ).length;
    const limitedCount = reports.filter(
      (r) => (r.payload as StockPayload).availability === CommodityAvailability.LIMITED
    ).length;
    const unavailableCount = reports.filter(
      (r) => (r.payload as StockPayload).availability === CommodityAvailability.UNAVAILABLE
    ).length;

    let availability: CommodityAvailability | 'MIXED REPORTS';
    if (availableCount > total / 2) {
      availability = CommodityAvailability.AVAILABLE;
    } else if (limitedCount > total / 2) {
      availability = CommodityAvailability.LIMITED;
    } else if (unavailableCount > total / 2) {
      availability = CommodityAvailability.UNAVAILABLE;
    } else {
      availability = 'MIXED REPORTS';
    }

    const latestReportAt = reports[0].createdAt;
    const ageSeconds = Math.max(0, Math.floor((now.getTime() - Date.parse(latestReportAt)) / 1000));

    // Confidence tier (P3-09)
    let confidence: ConfidenceLevel;
    if (total === 1) {
      confidence = ConfidenceLevel.LOW;
    } else if (total === 2) {
      confidence =
        availableCount === 2 || limitedCount === 2 || unavailableCount === 2
          ? ConfidenceLevel.MEDIUM
          : ConfidenceLevel.MIXED;
    } else {
      // total >= 3
      const maxCount = Math.max(availableCount, limitedCount, unavailableCount);
      if (maxCount / total >= 0.75) {
        confidence = ConfidenceLevel.HIGH;
      } else if (maxCount > total / 2) {
        confidence = ConfidenceLevel.MEDIUM;
      } else {
        confidence = ConfidenceLevel.MIXED;
      }
    }

    return {
      commodityCode,
      availability,
      latestReportAt,
      ageSeconds,
      distinctReporterCount: total,
      confidence,
      sources: this.extractSourceLabels(reports),
    };
  }

  /**
   * P3-09: Extracts deduplicated, canonical source provenance labels.
   */
  private extractSourceLabels(reports: Report[]): string[] {
    const labels: string[] = [];
    const roles = new Set(reports.map((r) => r.reporterRole));

    if (
      roles.has(UserRole.BENEFICIARY) ||
      roles.has(UserRole.VISITOR) ||
      roles.has(UserRole.ADMIN)
    ) {
      labels.push(REPORT_SOURCE_LABELS.COMMUNITY);
    }

    if (roles.has(UserRole.SHOP_MANAGER)) {
      labels.push(REPORT_SOURCE_LABELS.SHOP_MANAGER);
    }

    return labels;
  }
}

export const reportingService = new ReportingService();
