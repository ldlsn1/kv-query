import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KV_DATA } from '../data/raw.js';

// 这是一个「索引缓存」生成过程的演示脚本

// 构建 AoS 条目数组 + 倒排索引
const entries = []; // { k, v }[]
for (let i = 0; i < KV_DATA.length; i += 2) {
  entries.push({
    k: KV_DATA[i],      // 标签字符串（" | " 分隔）
    v: KV_DATA[i + 1],  // 对应值
  });
}

// 构建倒排索引
const keywordMap = Object.create(null);
entries.forEach(({ k }, id) => {
  k.split(' | ').forEach(tag => {
    if (!keywordMap[tag]) keywordMap[tag] = [];
    keywordMap[tag].push(id);
  });
});
for (const tag in keywordMap) {
  keywordMap[tag].sort((a, b) => a - b);
}
const sortedKeywords = Object.keys(keywordMap).sort();

// 组装索引对象
const INDEX = {
  m: keywordMap,      // 关键词 → ID 数组
  k: sortedKeywords,  // 排序后的关键词列表
};

// 生成输出文件内容
const content = `// Auto-generated at ${new Date().toISOString()}
export const ENTRIES = ${JSON.stringify(entries, null, 2)};

export const INDEX = ${JSON.stringify(INDEX, null, 2)};
`;

const outputPath = path.resolve('data/index.js');
fs.writeFileSync(outputPath, content, 'utf-8');
console.log(`✓ Cache built: ${outputPath}`);
console.log(`   Entries: ${entries.length}, Keywords: ${sortedKeywords.length}`);
