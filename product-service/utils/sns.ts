import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const topicArn = process.env.TOPIC_ARN;

export const sendSNSMessage = async (
  message: string,
  price: number
): Promise<void> => {
  if (!topicArn) {
    throw new Error('SNS Topic ARN is not defined');
  }

  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      MessageAttributes: {
        price: {
          DataType: 'Number',
          StringValue: price.toString(),
        },
      },
    });
    await snsClient.send(command);
  } catch (error) {
    console.error('Failed to send SNS message:', error);
  }
};
