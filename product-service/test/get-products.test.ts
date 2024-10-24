import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../lambda/get-products'
import { products } from '../mocks/products';
import { createApiGatewayEvent } from './utils';

describe('Lambda Function Handler get-products', () => {
  it('should return status code 200 and the list of products', async () => {
    const event = createApiGatewayEvent();
    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(products));
  });
});
