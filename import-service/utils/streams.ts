import { Readable } from 'stream';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import csv from 'csv-parser';
import { finished } from 'stream/promises';
import 'dotenv/config';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;

export const parseCSV = async (body: Readable, objectKey: string) => {
  try {
    const sqsPromises: Promise<unknown>[] = [];

    const csvStream = body.pipe(csv());

    for await (const data of csvStream) {
      const sqsParams = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(data),
      };
      const sqsPromise = sqsClient.send(new SendMessageCommand(sqsParams));
      sqsPromises.push(sqsPromise);
    }

    await finished(csvStream);

    const results = await Promise.allSettled(sqsPromises);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    console.log(`🗓️Successfully sent ${fulfilled.length} messages.`);
    if (rejected.length > 0) {
      console.error(`🗓️Failed to send ${rejected.length} messages.`);
      rejected.forEach((result, index) => {
        console.error(`❌Error in message ${index}:`, result.reason);
      });
    }

    console.log(`Finished processing file: ${objectKey}`);
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error;
  }
};
