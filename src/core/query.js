/**
 * 搜索逻辑：利用运行时索引，支持严格/包含、AND/OR 匹配
 */

import { buildIndex, getEntries } from './data.js';

/** 交集 */
function intersect(arrays) {
  if (!arrays.length) return [];
  return arrays.reduce((a, b) => {
    const setB = new Set(b);
    return a.filter(x => setB.has(x));
  });
}

/** 并集 */
function union(arrays) {
  return [...new Set(arrays.flat())].sort((a, b) => a - b);
}

/**
 * @param {string[]} terms 搜索词
 * @param {boolean} strict  true=严格匹配标签，false=包含匹配（匹配 key 或 value）
 * @param {boolean} isAnd   true=AND 逻辑，false=OR
 * @returns {Array<{k, v}>} 匹配的条目
 */
export function search(terms, strict, isAnd) {
  const { keywordMap, sortedKeywords } = buildIndex();
  const entries = getEntries();

  const matchGroups = terms.map(term => {
    const ids = new Set();
    if (strict) {
      if (keywordMap[term]) keywordMap[term].forEach(id => ids.add(id));
    } else {
      // 包含匹配：检查所有关键词，以及条目的 key 和 value
      for (const kw of sortedKeywords) {
        if (kw.includes(term)) keywordMap[kw].forEach(id => ids.add(id));
      }
      // 同时检查 value 中包含 term 的条目
      entries.forEach((entry, idx) => {
        if (entry.v.includes(term)) ids.add(idx);
      });
    }
    return [...ids].sort((a, b) => a - b);
  });

  const resultIds = isAnd ? intersect(matchGroups) : union(matchGroups);
  return resultIds.map(id => entries[id]);
}
