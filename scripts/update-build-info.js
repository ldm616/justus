import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildInfoPath = path.join(__dirname, '..', 'src', 'buildInfo.ts');

const content = `// This file is auto-generated during build
export const BUILD_INFO = {
  lastUpdated: '${new Date().toISOString()}'
};`;

fs.writeFileSync(buildInfoPath, content);
console.log('Build info updated with timestamp:', new Date().toISOString());