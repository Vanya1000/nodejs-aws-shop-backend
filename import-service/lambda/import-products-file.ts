import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { errorResponse, successResponse } from '../utils';

const s3Client = new S3Client();
const bucketName = process.env.BUCKET_NAME as string;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return errorResponse(400, 'File name is required');
  }

  const key = `uploaded/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return successResponse({ signedUrl });
  } catch {
    return errorResponse(500, 'Internal Server Error');
  }
};
