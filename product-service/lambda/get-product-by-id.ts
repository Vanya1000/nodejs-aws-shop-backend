import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { errorResponse, successResponse } from '../utils';

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

const getTableItem = async (
  tableName: string,
  keyName: string,
  keyValue: string
) => {
  try {
    const response = await ddbDocClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          [keyName]: keyValue,
        },
      })
    );
    return response.Item;
  } catch (error) {
    console.log('error', error);
    throw new Error(`Failed to get item from table: ${tableName}`);
  }
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return errorResponse(400, 'Product ID is required');
  }

  try {
    const [productItem, stockItem] = await Promise.all([
      getTableItem('products', 'id', productId),
      getTableItem('stocks', 'product_id', productId),
    ]);

    if (!productItem) {
      return errorResponse(404, 'Product not found');
    }

    const productWithStocks = {
      ...productItem,
      count: stockItem?.count || 0,
    };

    return successResponse(productWithStocks);
  } catch {
    return errorResponse(500, 'Internal Server Error');
  }
};
