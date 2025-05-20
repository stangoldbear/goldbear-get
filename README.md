# goldbear-get

**goldbear-get** is a minimal, reusable, and testable TypeScript module for retrieving JSON data from either remote HTTP/HTTPS endpoints or local file paths. It follows modern software principles such as SOLID, DRY, KISS, and YAGNI, and is built exclusively for Node.js (LTS).

## Features

- Single entry point: one public async function `get()`
- Fetch JSON from:
  - Remote URLs (HTTP/HTTPS)
  - Local file system paths
- Retry support with configurable delay
- Optional data validation via a custom validator function
- Robust and informative error handling
- 100% test coverage using Jest
- Zero external dependencies (uses only Node.js built-in modules)

---

## Installation

```bash
npm install goldbear-get
```

> Or clone and build locally:
```bash
git clone https://github.com/your-org/goldbear-get
cd goldbear-get
npm install
npm run build
```

---

## Usage

```ts
import { get } from 'goldbear-get';

(async () => {
  try {
    const data = await get('https://api.example.com/data.json', {
      retry: 2,
      delay: 1000,
      validator: (json) => Array.isArray(json)
    });
    console.log(data);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
```

---

## API

### `get(source: string, options?: GetOptions): Promise<any>`

Retrieve data from either a URL or a local file path.

#### Parameters:

- `source`: string  
  URL (`http://`, `https://`) or relative file path (e.g. `./data/file.json`)

- `options` *(optional)*:  
  ```ts
  {
    retry?: number;               // number of retries on failure (default: 0)
    delay?: number;               // milliseconds between retries (default: 0)
    validator?: (data: any) => boolean; // optional validation function
    schema?: any;                 // (not supported in v1, use validator)
  }
  ```

#### Returns:

- A Promise that resolves with the parsed JSON data if successful
- Throws an error in case of:
  - network or file error
  - HTTP response status not in 2xx range
  - invalid or malformed JSON
  - validator failure

---

## Example: Local File

```ts
const result = await get('./data/sample.json');
```

---

## Example: With Retry and Validation

```ts
const result = await get('https://my.api/user.json', {
  retry: 3,
  delay: 500,
  validator: (json) => typeof json.id === 'number' && !!json.email
});
```

---

## Limitations

- JSON Schema validation is **not** supported in version 1.x to keep the module dependency-free.
- Only supports Node.js (LTS). Not intended for browser usage.

---

## Development

```bash
npm install
npm run build
npm test
```

Tests are written using [Jest](https://jestjs.io/) and can be found in the `test/` directory.

---

## License

MIT © 2025
