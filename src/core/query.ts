import { getEntries, getIndex } from './data.ts';

/**
 * 搜索逻辑：基于 data 模块提供的索引缓存进行查询
 */

// 数组交集，大规模情况可以用双指针提高效率
function intersect(arrays: number[][]): number[] {
  if (!arrays.length) return [];
  return arrays.reduce((a, b) => {
    const setB = new Set(b);
    return a.filter(x => setB.has(x));
  });
}

// 数组并集
function union(arrays: number[][]): number[] {
  return [...new Set(arrays.flat())];
}

/**
 * @param terms  搜索词
 * @param strict  true=严格匹配标签，false=包含匹配
 * @param isAnd   true=AND 逻辑，false=OR
 * @returns 匹配的条目
 */
export function search(terms: string[], strict: boolean, isAnd: boolean): { k: string; v: string }[] {
  const index = getIndex();
  const entries = getEntries();

  // 如果没有索引，返回空数组（理论上不会发生）
  if (!index) return [];

  const { m: keywordMap, k: sortedKeywords } = index;

  const matchGroups = terms.map(term => {
    const ids = new Set<number>();
    if (strict) { // 严格匹配：直接从关键词映射中找
      if (keywordMap[term]) keywordMap[term].forEach(id => ids.add(id));
    } else {
      for (const kw of sortedKeywords) {
        if (kw.includes(term)) keywordMap[kw].forEach(id => ids.add(id));
      }
    }
    return [...ids];
  });

  const resultIds = isAnd ? intersect(matchGroups) : union(matchGroups);
  resultIds.sort((a, b) => a - b);
  return resultIds.map(id => entries[id]);
}
