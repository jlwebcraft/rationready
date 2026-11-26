import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Shop } from '../domain/types.js';
import { defaultDocClient } from './dynamodb.js';

export class ShopRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(docClient: DynamoDBDocumentClient = defaultDocClient, tableName?: string) {
    this.docClient = docClient;
    this.tableName = tableName || process.env.SHOPS_TABLE || 'Shops';
  }

  async getShopById(shopId: string): Promise<Shop | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { shopId },
    });
    const result = await this.docClient.send(command);
    return (result.Item as Shop) || null;
  }

  async listShops(locality?: string): Promise<Shop[]> {
    if (locality && locality.trim() !== '') {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'locality = :locality',
        ExpressionAttributeValues: {
          ':locality': locality.trim(),
        },
      });
      const result = await this.docClient.send(command);
      return (result.Items as Shop[]) || [];
    }

    const command = new ScanCommand({
      TableName: this.tableName,
    });
    const result = await this.docClient.send(command);
    return (result.Items as Shop[]) || [];
  }

  async saveShop(shop: Shop): Promise<Shop> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: shop,
    });
    await this.docClient.send(command);
    return shop;
  }
}

export const shopRepository = new ShopRepository();
