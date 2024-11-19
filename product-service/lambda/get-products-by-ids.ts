import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { errorResponse, successResponse } from '../utils';

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

const BATCH_SIZE_LIMIT = 100;

const batchGetItems = async (
  tableName: string,
  keyName: string,
  keyValues: string[]
) => {
  try {
    const uniqueKeys = Array.from(new Set(keyValues));
    const batches = [];

    for (let i = 0; i < uniqueKeys.length; i += BATCH_SIZE_LIMIT) {
      const batchKeys = uniqueKeys.slice(i, i + BATCH_SIZE_LIMIT);
      const batch = ddbDocClient.send(
        new BatchGetCommand({
          RequestItems: {
            [tableName]: {
              Keys: batchKeys.map((keyValue) => ({
                [keyName]: keyValue,
              })),
            },
          },
        })
      );
      batches.push(batch);
    }

    const results = await Promise.all(batches);
    const items = results.flatMap(
      (result) => result.Responses?.[tableName] || []
    );
    return items;
  } catch (error) {
    console.error('Error in batchGetItems:', error);
    throw new Error(`Failed to get items from table: ${tableName}`);
  }
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let productIds: string[] = [];

  const httpMethod = event.requestContext?.http?.method;

  if (httpMethod === 'GET') {
    const idsParam = event.queryStringParameters?.ids;
    if (!idsParam) {
      return errorResponse(400, 'Product IDs are required as query parameters');
    }
    productIds = idsParam.split(',');
  } else if (httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      productIds = body.productIds;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return errorResponse(
          400,
          'Product IDs are required in the request body'
        );
      }
    } catch (error) {
      console.error('Invalid request body:', error);
      return errorResponse(400, 'Invalid JSON in request body');
    }
  } else {
    return errorResponse(405, 'Method Not Allowed');
  }

  try {
    const [productItems, stockItems] = await Promise.all([
      batchGetItems('products', 'id', productIds),
      batchGetItems('stocks', 'product_id', productIds),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stockMap = new Map<string, any>();
    for (const stock of stockItems) {
      stockMap.set(stock.product_id, stock);
    }

    const productsWithStocks = productItems.map((product) => {
      const stock = stockMap.get(product.id);
      return {
        ...product,
        count: stock?.count || 0,
      };
    });

    return successResponse(productsWithStocks);
  } catch (error) {
    console.error('Error fetching batch products:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};
