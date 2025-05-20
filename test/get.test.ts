import { get } from '../src';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

describe('get function', () => {
  test('fetches and parses JSON from a local file', async () => {
    const filePath = path.join(__dirname, 'temp.json');
    fs.writeFileSync(filePath, JSON.stringify({ foo: 'bar' }));
    const data = await get(filePath);
    expect(data).toEqual({ foo: 'bar' });
    fs.unlinkSync(filePath);
  });

  test('throws error for missing file', async () => {
    const filePath = path.join(__dirname, 'missing.json');
    await expect(get(filePath)).rejects.toThrow(/File not found/);
  });

  test('throws error for invalid JSON', async () => {
    const filePath = path.join(__dirname, 'invalid.json');
    fs.writeFileSync(filePath, 'not json');
    await expect(get(filePath)).rejects.toThrow(/Invalid JSON/);
    fs.unlinkSync(filePath);
  });

  test('fetches and parses JSON from HTTP server', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hello: 'world' }));
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const url = `http://localhost:${port}/`;
    const data = await get(url);
    expect(data).toEqual({ hello: 'world' });
    server.close();
  });

  test('throws error for HTTP 404 response', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const url = `http://localhost:${port}/`;
    await expect(get(url)).rejects.toThrow(/HTTP error: 404/);
    server.close();
  });

  test('retries on failure and succeeds', async () => {
    let count = 0;
    const server = http.createServer((req, res) => {
      count++;
      if (count <= 2) {
        res.destroy();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }
    });
    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const url = `http://localhost:${port}/`;
    const data = await get(url, { retry: 3, delay: 10 });
    expect(data).toEqual({ ok: true });
    server.close();
  });

  test('throws error if validator fails', async () => {
    const filePath = path.join(__dirname, 'validate.json');
    fs.writeFileSync(filePath, JSON.stringify({ val: 42 }));
    await expect(get(filePath, {
      validator: (data) => data.val < 0
    })).rejects.toThrow(/Validation failed/);
    fs.unlinkSync(filePath);
  });

  test('accepts valid data with validator', async () => {
    const filePath = path.join(__dirname, 'validate-ok.json');
    fs.writeFileSync(filePath, JSON.stringify({ val: 42 }));
    const data = await get(filePath, {
      validator: (data) => data.val === 42
    });
    expect(data).toEqual({ val: 42 });
    fs.unlinkSync(filePath);
  });
});
