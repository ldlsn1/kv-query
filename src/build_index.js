import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { KV_DATA } from '../data/raw.js';

const SEP = ' | '; // key 的严格分隔符

// 核心目标：提升检索效率
function buildIndex(kvData) {
  const entries = Object.entries(kvData);
  const keywordMap = Object.create(null);
  
  // 建立索引映射
  entries.forEach(([compositeKey, value], id) => {
    const keys = compositeKey.split(SEP);
    for (const key of keys) {
      if (!keywordMap[key]) keywordMap[key] = [];
      keywordMap[key].push(id);
    }
  });

  // 预排序：对每个关键词下的 ID 数组进行升序排列，这样 query 时做 Intersection 效率更高
  for (const key in keywordMap) {
    keywordMap[key].sort((a, b) => a - b);
  }

  // 预排序：对关键词列表进行排序
  const sortedKeywords = Object.keys(keywordMap).sort();

  return {
    m: keywordMap, // Map: keyword -> [sorted ids]
    k: sortedKeywords, // Sorted keywords: 方便模糊匹配
    v: entries.map(([k, v]) => ({ k, v })) // 打平后的原始数据
  };
}

async function main() {
  const index = buildIndex(KV_DATA);
  const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/index.js');
  await writeFile(outPath, `export const KV_INDEX = ${JSON.stringify(index)};\n`, 'utf8');
  console.log(`[build] Success! Keywords: ${index.k.length}, Entries: ${index.v.length}`);
}

main().catch(console.error);
