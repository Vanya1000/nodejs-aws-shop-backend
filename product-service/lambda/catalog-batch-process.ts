import { SQSEvent } from 'aws-lambda';
import { saveProductToDB, validateProduct } from '../utils';
import { sendSNSMessage } from '../utils/sns';

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      const validatedProduct = validateProduct(record.body);

      try {
        const product = await saveProductToDB(validatedProduct);
        await sendSNSMessage(
          `Product created successfully: ${JSON.stringify(product)}`,
          product.price
        );
      } catch (error) {
        console.log('Database operation error', error);
      }
    } catch (error) {
      console.log('Product validation failed', error);
    }
  }
};
