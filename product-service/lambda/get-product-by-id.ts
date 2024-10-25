import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { products } from '../mocks/products';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const productId = event.pathParameters?.productId;

    const product = products.find(p => p.id === productId);

    if (!product) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Product not found' }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(product),
    };
};
