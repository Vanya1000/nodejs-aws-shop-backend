import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  errorResponse,
  saveProductToDB,
  successResponse,
  validateProduct,
} from '../utils';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let validatedProduct;

  try {
    validatedProduct = validateProduct(event.body);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(400, error?.message);
    } else {
      return errorResponse(400, 'Product validation failed');
    }
  }

  try {
    const product = await saveProductToDB(validatedProduct);
    return successResponse({
      message: 'Items successfully inserted',
      product,
    });
  } catch {
    console.error('Database operation error');
    return errorResponse(500, 'Internal Server Error');
  }
};
