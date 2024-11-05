import { Readable } from 'stream';
import csv from 'csv-parser';

export const parseCSV = (body: Readable, objectKey: string) => {
  return new Promise<void>((resolve, reject) => {
    body
      .pipe(csv())
      .on('data', (data: unknown) => {
        console.log('Record:', data);
      })
      .on('end', () => {
        console.log(`Finished processing file: ${objectKey}`);
        resolve();
      })
      .on('error', (error) => {
        console.error('Error by parsing the CSV file:', error);
        reject(error);
      });
  });
};
