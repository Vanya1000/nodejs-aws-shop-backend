import { APIGatewayProxyEvent } from 'aws-lambda';
import { errorResponse, successResponse } from '../utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../lambda/import-products-file';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const s3ClientMock = mockClient(S3Client);

process.env.BUCKET_NAME = 'test-bucket';

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    s3ClientMock.reset();
  });

  it('should return 400 if name is not provided', async () => {
    const event = {
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response).toEqual(errorResponse(400, 'File name is required'));
  });

  it('should return signed URL if name is provided', async () => {
    const event = {
      queryStringParameters: { name: 'testfile.txt' },
    } as unknown as APIGatewayProxyEvent;

    const mockSignedUrl = 'https://signed-url.com';

    (getSignedUrl as jest.Mock).mockResolvedValue(mockSignedUrl);

    const response = await handler(event);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(S3Client),
      expect.any(PutObjectCommand),
      { expiresIn: 300 }
    );

    expect(response).toEqual(successResponse({ signedUrl: mockSignedUrl }));
  });

  it('should return 500 if getSignedUrl throws an error', async () => {
    const event = {
      queryStringParameters: { name: 'testfile.txt' },
    } as unknown as APIGatewayProxyEvent;

    (getSignedUrl as jest.Mock).mockRejectedValue(new Error('Some error'));

    const response = await handler(event);

    expect(response).toEqual(errorResponse(500, 'Internal Server Error'));
  });
});
