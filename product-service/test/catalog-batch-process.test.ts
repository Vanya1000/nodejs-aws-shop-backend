import { SQSEvent, SQSRecord } from 'aws-lambda';
import { validateProduct, saveProductToDB } from '../utils';
import { sendSNSMessage } from '../utils/sns';
import { handler } from '../lambda/catalog-batch-process';

jest.mock('../utils', () => ({
  validateProduct: jest.fn(),
  saveProductToDB: jest.fn(),
}));

jest.mock('../utils/sns', () => ({
  sendSNSMessage: jest.fn(),
}));

describe('Catalog batch process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process records successfully', async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ name: 'Product 1', price: 100 }),
        } as SQSRecord,
      ],
    };

    const validatedProduct = { name: 'Product 1', price: 100 };
    const savedProduct = { id: '1', name: 'Product 1', price: 100 };

    (validateProduct as jest.Mock).mockReturnValue(validatedProduct);
    (saveProductToDB as jest.Mock).mockResolvedValue(savedProduct);
    (sendSNSMessage as jest.Mock).mockResolvedValue(undefined);

    await handler(mockEvent);

    expect(validateProduct).toHaveBeenCalledWith(mockEvent.Records[0].body);
    expect(saveProductToDB).toHaveBeenCalledWith(validatedProduct);
    expect(sendSNSMessage).toHaveBeenCalledWith(
      `Product created successfully: ${JSON.stringify(savedProduct)}`,
      savedProduct.price
    );
  });

  it('should handle validation errors', async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ name: 'Invalid Product', price: -1 }),
        } as SQSRecord,
      ],
    };

    const validationError = new Error('Invalid product');

    (validateProduct as jest.Mock).mockImplementation(() => {
      throw validationError;
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await handler(mockEvent);

    expect(validateProduct).toHaveBeenCalledWith(mockEvent.Records[0].body);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Product validation failed',
      validationError
    );
    expect(saveProductToDB).not.toHaveBeenCalled();
    expect(sendSNSMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle database errors', async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ name: 'Product 2', price: 200 }),
        } as SQSRecord,
      ],
    };

    const validatedProduct = { name: 'Product 2', price: 200 };
    const dbError = new Error('Database error');

    (validateProduct as jest.Mock).mockReturnValue(validatedProduct);
    (saveProductToDB as jest.Mock).mockRejectedValue(dbError);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await handler(mockEvent);

    expect(saveProductToDB).toHaveBeenCalledWith(validatedProduct);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Database operation error',
      dbError
    );
    expect(sendSNSMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle SNS errors', async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ name: 'Product 3', price: 300 }),
        } as SQSRecord,
      ],
    };

    const validatedProduct = { name: 'Product 3', price: 300 };
    const savedProduct = { id: '3', name: 'Product 3', price: 300 };
    const snsError = new Error('SNS error');

    (validateProduct as jest.Mock).mockReturnValue(validatedProduct);
    (saveProductToDB as jest.Mock).mockResolvedValue(savedProduct);
    (sendSNSMessage as jest.Mock).mockRejectedValue(snsError);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await handler(mockEvent);

    expect(sendSNSMessage).toHaveBeenCalledWith(
      `Product created successfully: ${JSON.stringify(savedProduct)}`,
      savedProduct.price
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Database operation error',
      snsError
    );

    consoleSpy.mockRestore();
  });

  it('should process multiple records', async () => {
    const mockEvent: SQSEvent = {
      Records: [
        {
          body: JSON.stringify({ name: 'Product A', price: 150 }),
        } as SQSRecord,
        {
          body: JSON.stringify({ name: 'Product B', price: 250 }),
        } as SQSRecord,
      ],
    };

    const validatedProductA = { name: 'Product A', price: 150 };
    const validatedProductB = { name: 'Product B', price: 250 };

    const savedProductA = { id: 'A', name: 'Product A', price: 150 };
    const savedProductB = { id: 'B', name: 'Product B', price: 250 };

    (validateProduct as jest.Mock)
      .mockReturnValueOnce(validatedProductA)
      .mockReturnValueOnce(validatedProductB);
    (saveProductToDB as jest.Mock)
      .mockResolvedValueOnce(savedProductA)
      .mockResolvedValueOnce(savedProductB);
    (sendSNSMessage as jest.Mock).mockResolvedValue(undefined);

    await handler(mockEvent);

    expect(validateProduct).toHaveBeenCalledTimes(2);
    expect(saveProductToDB).toHaveBeenCalledTimes(2);
    expect(sendSNSMessage).toHaveBeenCalledTimes(2);
  });
});
