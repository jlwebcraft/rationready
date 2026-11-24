import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Report } from '../domain/types.js';
import { defaultDocClient } from './dynamodb.js';

export class ReportRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(docClient: DynamoDBDocumentClient = defaultDocClient, tableName?: string) {
    this.docClient = docClient;
    this.tableName = tableName || process.env.REPORTS_TABLE || 'Reports';
  }

  async createReport(report: Report): Promise<Report> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: report,
    });
    await this.docClient.send(command);
    return report;
  }

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
}

export const reportRepository = new ReportRepository();
