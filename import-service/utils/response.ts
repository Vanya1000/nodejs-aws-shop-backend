import { APIGatewayProxyResult } from 'aws-lambda';

export const successResponse = (data: unknown): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
};

export const errorResponse = (
  statusCode: number,
  message: string,
  customMessage?: string
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: customMessage ? customMessage : JSON.stringify({ message }),
  };
};
