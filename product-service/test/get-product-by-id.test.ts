import { APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../lambda/get-product-by-id'
import { createApiGatewayEvent } from './utils';
import { products } from '../mocks/products';

describe('Lambda Function Handler get-product-by-id', () => {
  it('should return the product with status code 200 when product is found', async () => {
    const productId = '7567ec4b-b10c-48c5-9345-fc73c48a80aa';

    const event = createApiGatewayEvent({ productId });

    const result: APIGatewayProxyResult = await handler(event);

    const expectedProduct = products.find(p => p.id === productId);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(expectedProduct));
  });

  it('should return 404 when product is not found', async () => {
    const productId = 'non-existent-id';

    const event = createApiGatewayEvent({ productId });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ message: 'Product not found' }));
  });

  it('should return 404 when pathParameters are null', async () => {
    const event = createApiGatewayEvent(null);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(result.body).toBe(JSON.stringify({ message: 'Product not found' }));
  });
});
