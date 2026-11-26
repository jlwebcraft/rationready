import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Report, ReportType, StockPayload } from '../domain/types.js';
import { defaultDocClient } from './dynamodb.js';

export class ReportRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(docClient: DynamoDBDocumentClient = defaultDocClient, tableName?: string) {
    this.docClient = docClient;
    this.tableName = tableName || process.env.REPORTS_TABLE || 'Reports';
  }

  /**
   * Persists a report to the DynamoDB Reports table.
   */
  async createReport(report: Report): Promise<Report> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: report,
    });
    await this.docClient.send(command);
    return report;
  }

  /**
   * Queries reports for a shop with an optional limit (newest first).
   */
  async getReportsByShopId(shopId: string, limit?: number): Promise<Report[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'shopId = :shopId',
      ExpressionAttributeValues: {
        ':shopId': shopId,
      },
      ScanIndexForward: false, // Descending order (newest first)
      ...(limit ? { Limit: limit } : {}),
    });
    const result = await this.docClient.send(command);
    return (result.Items as Report[]) || [];
  }

  /**
   * P3-10: Queries all reports for a shop handling DynamoDB pagination.
   * Continues fetching until LastEvaluatedKey is undefined.
   */
  async getAllReportsByShopId(shopId: string): Promise<Report[]> {
    const items: Report[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined = undefined;

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'shopId = :shopId',
        ExpressionAttributeValues: {
          ':shopId': shopId,
        },
        ScanIndexForward: false, // Descending order (newest first)
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      });

      const response = await this.docClient.send(command);
      if (response.Items && response.Items.length > 0) {
        items.push(...(response.Items as Report[]));
      }
      exclusiveStartKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (exclusiveStartKey);

    return items;
  }

  /**
   * P3-05: Checks for a recent report by the same user within a time window.
   * Leverages sort-key range expression (reportKey >= REPORT#<sinceIsoString>) for efficiency.
   * Fails closed: if the query throws, callers must not proceed with writes.
   *
   * Note on concurrency: Query-before-write in DynamoDB without conditional locks has a narrow
   * race window for simultaneous requests from the same user sub; this is a known architectural
   * trade-off documented in accordance with project constraints.
   */
  async findRecentUserReport(
    shopId: string,
    reporterSub: string,
    reportType: ReportType,
    sinceIsoString: string,
    commodityCode?: string
  ): Promise<Report | null> {
    const minReportKey = `REPORT#${sinceIsoString}`;
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'shopId = :shopId AND reportKey >= :minReportKey',
      ExpressionAttributeValues: {
        ':shopId': shopId,
        ':minReportKey': minReportKey,
      },
      ScanIndexForward: false,
    });

    const response = await this.docClient.send(command);
    const items = (response.Items as Report[]) || [];

    for (const item of items) {
      if (item.reporterSub === reporterSub && item.reportType === reportType) {
        if (reportType === ReportType.STOCK) {
          const stockPayload = item.payload as StockPayload;
          if (stockPayload && stockPayload.commodityCode === commodityCode) {
            return item;
          }
        } else {
          return item;
        }
      }
    }

    return null;
  }
}

export const reportRepository = new ReportRepository();
