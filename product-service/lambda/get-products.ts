import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { errorResponse, successResponse } from '../utils';

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

const scanTable = async (tableName: string) => {
  try {
    const params = { TableName: tableName };
    const response = await ddbDocClient.send(new ScanCommand(params));
    return response.Items || [];
  } catch (error) {
    console.log('error', error);
    throw new Error(`Failed to scan table: ${tableName}`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mergeProductsAndStocks = (products: any[], stocks: any[]): any[] => {
  const stockMap = new Map<string, number>();

  stocks.forEach((stock) => {
    if (stock.product_id && stock.count !== undefined) {
      stockMap.set(stock.product_id, stock.count);
    }
  });

  return products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    count: stockMap.get(product.id) || 0,
  }));
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  try {
    const [products, stocks] = await Promise.all([
      scanTable('products'),
      scanTable('stocks'),
    ]);

    const mergedProducts = mergeProductsAndStocks(products, stocks);

    return successResponse(mergedProducts);
  } catch (error) {
    return errorResponse(500, 'Internal Server Error');
  }
};
