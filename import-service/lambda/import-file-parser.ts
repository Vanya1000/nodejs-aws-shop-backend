import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { S3Event } from 'aws-lambda';
import { Readable } from 'stream';
import { parseCSV } from '../utils';

const s3Client = new S3Client({});
const bucketName = process.env.BUCKET_NAME as string;

export const handler = async (event: S3Event): Promise<void> => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const key = record.s3.object.key;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await s3Client.send(command);

      if (response.Body instanceof Readable) {
        await parseCSV(response.Body, key);

        const parsedKey = key.replace('uploaded/', 'parsed/');

        const copyParams = {
          Bucket: bucketName,
          CopySource: encodeURIComponent(`${bucketName}/${key}`),
          Key: parsedKey,
        };

        await s3Client.send(new CopyObjectCommand(copyParams));

        const deleteParams = {
          Bucket: bucketName,
          Key: key,
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } else {
        console.error(
          `Unable to read object body as a stream for file: ${key}`
        );
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  }
};
