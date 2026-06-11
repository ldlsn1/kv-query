import { writeFileSync } from 'node:fs';
import { KV_DATA } from '../data/raw.js'

writeFileSync(
  './data/raw.nim',
  `const KV_DATA* = ${JSON.stringify(KV_DATA)}`
);
console.log('✓ converted to nim');
