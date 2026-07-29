import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envPaths = [
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../web/.env.local'),
  path.resolve(__dirname, '../../../web/.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}
