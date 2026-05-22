/**
 * 搜索逻辑：基于 data 模块提供的索引缓存进行查询
 */

import { getEntries, getIndex } from './data.js';

/** 数组交集 */
function intersect(arrays) {
  if (!arrays.length) return [];
  return arrays.reduce((a, b) => {
    const setB = new Set(b);
    return a.filter(x => setB.has(x));
  });
}

/** 数组并集 */
function union(arrays) {
  return [...new Set(arrays.flat())].sort((a, b) => a - b);
}

/**
 * @param {string[]} terms 搜索词
 * @param {boolean} strict  true=严格匹配标签，false=包含匹配
 * @param {boolean} isAnd   true=AND 逻辑，false=OR
 * @returns {Array<{k, v}>} 匹配的条目
 */
export function search(terms, strict, isAnd) {
  const { keywordMap, sortedKeywords } = getIndex(); // 直接使用缓存索引
  const entries = getEntries();

  const matchGroups = terms.map(term => {
    const ids = new Set();
    if (strict) {
      // 严格匹配：直接从关键词映射中找
      if (keywordMap[term]) keywordMap[term].forEach(id => ids.add(id));
    } else {
      // 包含匹配：检查所有关键词及条目的 value
      for (const kw of sortedKeywords) {
        if (kw.includes(term)) keywordMap[kw].forEach(id => ids.add(id));
      }
      entries.forEach((entry, idx) => {
        if (entry.v.includes(term)) ids.add(idx);
      });
    }
    return [...ids].sort((a, b) => a - b);
  });

  const resultIds = isAnd ? intersect(matchGroups) : union(matchGroups);
  return resultIds.map(id => entries[id]);
}
