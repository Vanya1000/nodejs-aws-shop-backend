import { z } from 'zod';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ProductSchema = z.object({
  description: z.string(),
  price: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseFloat(val) : val))
    .refine((val) => !isNaN(val), { message: 'Price must be a valid number' })
    .refine((val) => val >= 0, { message: 'Price must be a positive number' }),
  title: z.string(),
  count: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val))
    .refine((val) => Number.isInteger(val) && val >= 0, {
      message: 'Count must be a positive integer',
    }),
});

type ProductType = z.infer<typeof ProductSchema>;

export const validateProduct = (product: string | null) => {
  if (product === null) {
    throw new Error(
      JSON.stringify({
        message: 'Product cannot be null',
      })
    );
  }

  let parsedProduct;

  try {
    parsedProduct = JSON.parse(product);
  } catch {
    throw new Error(
      JSON.stringify({
        message: 'Invalid JSON format: Product cannot be parsed',
      })
    );
  }

  const validation = ProductSchema.safeParse(parsedProduct);

  if (!validation.success) {
    const errorDetails = validation.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new Error(
      JSON.stringify({
        message: 'Validation error',
        errors: errorDetails,
      })
    );
  }

  return validation.data;
};

const dynamoDBClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDBClient);

export const saveProductToDB = async (product: ProductType) => {
  const uuid = uuidv4();
  const { count, ...productData } = product;
  const productWithId = { id: uuid, ...productData };
  const stock = { product_id: uuid, count };

  const transactItems = [
    {
      Put: {
        TableName: 'products',
        Item: productWithId,
      },
    },
    {
      Put: {
        TableName: 'stocks',
        Item: stock,
      },
    },
  ];

  const command = new TransactWriteCommand({ TransactItems: transactItems });
  await ddbDocClient.send(command);

  return { ...productWithId, count };
};
