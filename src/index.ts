import { promises as fsPromises } from 'fs';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface GetOptions {
  retry?: number;
  delay?: number;
  validator?: (data: any) => boolean;
  schema?: any; // Not supported in v1
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith('https://') ? https : http;
      const req = client.get(url, (res) => {
        const { statusCode, statusMessage } = res;
        if (statusCode && (statusCode < 200 || statusCode >= 300)) {
          res.resume();
          reject(new Error(`HTTP error: ${statusCode} ${statusMessage}`));
          return;
        }
        let rawData = '';
        res.on('data', (chunk) => rawData += chunk);
        res.on('end', () => resolve(rawData));
      });
      req.on('error', (err) => {
        reject(new Error(`Network error: ${err.message}`));
      });
    } catch (err: any) {
      reject(new Error(`Request failed: ${err.message}`));
    }
  });
}

export async function get(source: string, options?: GetOptions): Promise<any> {
  const retryCount = options?.retry ?? 0;
  const retryDelay = options?.delay ?? 0;
  let attempts = 0;

  let isUrl = false;
  try {
    const urlObj = new URL(source);
    isUrl = (urlObj.protocol === 'http:' || urlObj.protocol === 'https:');
  } catch {
    isUrl = false;
  }

  while (true) {
    try {
      let data: string;

      if (isUrl) {
        data = await fetchUrl(source);
      } else {
        try {
          data = await fsPromises.readFile(source, 'utf8');
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            throw new Error(`File not found: ${source}`);
          }
          throw new Error(`File read error: ${err.message}`);
        }
      }

      let jsonData: any;
      try {
        jsonData = JSON.parse(data);
      } catch (err: any) {
        throw new Error(`Invalid JSON: ${err.message}`);
      }

      if (options?.validator) {
        let valid: boolean;
        try {
          valid = options.validator(jsonData);
        } catch (err: any) {
          throw new Error(`Validation function error: ${err.message}`);
        }
        if (!valid) {
          throw new Error('Validation failed: data does not match schema');
        }
      }

      if (options?.schema) {
        throw new Error('Schema validation not supported. Provide a validator function instead.');
      }

      return jsonData;
    } catch (err) {
      if (attempts >= retryCount) {
        throw err;
      }
      attempts++;
      await sleep(retryDelay);
    }
  }
}
