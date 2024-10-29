import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { errorResponse, successResponse } from '../utils';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ProductSchema = z.object({
  description: z.string(),
  price: z.number(),
  title: z.string(),
  count: z.number(),
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  if (!event.body) return errorResponse(400, 'Data was not provided');

  try {
    const parsedBody = JSON.parse(event.body);
    const validation = ProductSchema.safeParse(parsedBody);

    if (!validation.success) {
      const errorDetails = validation.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return errorResponse(
        400,
        '',
        JSON.stringify({ message: 'Validation error', errors: errorDetails })
      );
    }

    const uuid = uuidv4();
    const { count, ...productData } = validation.data;
    const product = { id: uuid, ...productData };
    const stock = { product_id: uuid, count };

    const transactItems = [
      {
        Put: {
          TableName: 'products',
          Item: product,
        },
      },
      {
        Put: {
          TableName: 'stocks',
          Item: stock,
        },
      },
    ];

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await ddbDocClient.send(command);

    return successResponse({ message: 'Items successfully inserted', product });
  } catch {
    console.error('Database operation error');
    return errorResponse(500, 'Internal Server Error');
  }
};
