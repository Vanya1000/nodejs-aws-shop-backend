/* eslint-disable @typescript-eslint/no-explicit-any */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Event } from 'aws-lambda';
import { Readable } from 'stream';
import { parseCSV } from '../utils';
import { mockClient } from 'aws-sdk-client-mock';
import { SdkStreamMixin } from '@aws-sdk/types';

const bucketName = 'test-bucket';
process.env.BUCKET_NAME = bucketName;
import { handler } from '../lambda/import-file-parser';

jest.mock('../utils', () => ({
  parseCSV: jest.fn(),
}));

describe('handler', () => {
  const s3ClientMock = mockClient(S3Client);

  function createMockSdkStream(data: string): Readable & SdkStreamMixin {
    const stream = Readable.from([data]) as Readable & SdkStreamMixin;

    stream.transformToByteArray = async () => {
      return Buffer.from(data);
    };
    stream.transformToString = async () => {
      return data;
    };
    stream.transformToWebStream = () => {
      throw new Error('Not implemented in test');
    };

    return stream;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    s3ClientMock.reset();
  });

  it('should process CSV file from S3', async () => {
    const mockCSVData = 'name,age\nAlice,30\nBob,25\n';

    const event: S3Event = {
      Records: [
        {
          s3: {
            object: {
              key: 'test.csv',
            },
          },
        } as any,
      ],
    };

    s3ClientMock.on(GetObjectCommand).resolves({
      Body: createMockSdkStream(mockCSVData),
    });

    await handler(event);

    expect(s3ClientMock.calls()).toHaveLength(3);
    expect(s3ClientMock.call(0).args[0].input).toEqual({
      Bucket: bucketName,
      Key: 'test.csv',
    });

    expect(parseCSV).toHaveBeenCalledWith(expect.any(Readable), 'test.csv');
  });

  it('should handle non-readable Body', async () => {
    const event: S3Event = {
      Records: [
        {
          s3: {
            object: {
              key: 'test.csv',
            },
          },
        } as any,
      ],
    };

    s3ClientMock.on(GetObjectCommand).resolves({
      Body: undefined,
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await handler(event);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unable to read object body as a stream for file: test.csv'
    );

    expect(parseCSV).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle errors during S3 getObject', async () => {
    const event: S3Event = {
      Records: [
        {
          s3: {
            object: {
              key: 'test.csv',
            },
          },
        } as any,
      ],
    };

    s3ClientMock.on(GetObjectCommand).rejects(new Error('S3 getObject error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await handler(event);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error processing file:',
      expect.any(Error)
    );

    expect(parseCSV).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
