import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { products } from '../mocks/products';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';

const seed = async () => {
  const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

  try {
    for (const p of products) {
      const uuid = uuidv4();
      const productBatch = new PutItemCommand({
        TableName: 'products',
        Item: {
          id: { S: uuid },
          title: { S: p.title },
          description: { S: p.description },
          price: { N: String(p.price) },
        },
      });

      // Add stock to the stocks table
      const stockBatch = new PutItemCommand({
        TableName: 'stocks',
        Item: {
          product_id: { S: uuid },
          count: { N: String(p.count) },
        },
      });

      await dynamoClient.send(productBatch);
      console.log(`Inserted product: ${p.title}`);

      await dynamoClient.send(stockBatch);
      console.log(`Inserted stock for product ID: ${p.id}`);
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Run the seed function
seed().catch((error) => {
  console.error('Unexpected error during seeding:', error);
});
