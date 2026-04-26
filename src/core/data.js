/**
 * 数据中心：条目管理、频率维护、索引构建、localStorage 存取
 */

import { KV_DATA } from '../../data/raw.js';

const SEP = ' | ';
const STORAGE_KEY = 'kv_entries';
const FREQ_KEY = 'kv_freq';

let entries = [];
let freqMap = {};

// 首次加载时转换示例数据
function defaultEntries() {
  return Object.entries(KV_DATA).map(([k, v]) => ({ k, v }));
}

/** 从 localStorage 恢复 */
export function load() {
  try {
    entries = JSON.parse(localStorage.getItem(STORAGE_KEY));
    freqMap = JSON.parse(localStorage.getItem(FREQ_KEY) || '{}');
    if (!entries || !entries.length) {
      entries = defaultEntries();
      freqMap = {};
      save();
    }
  } catch {
    entries = defaultEntries();
    freqMap = {};
  }
}

/** 持久化 */
export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  localStorage.setItem(FREQ_KEY, JSON.stringify(freqMap));
}

/** 返回当前条目数组 */
export function getEntries() {
  return entries;
}

/** 增加指定 key 的点击频率并保存 */
export function addFreq(key) {
  freqMap[key] = (freqMap[key] || 0) + 1;
  save();
}

/** 获取频率映射（只读） */
export function getFreqMap() {
  return freqMap;
}

/** 用新条目数组完全替换当前数据 */
export function setEntries(newEntries) {
  entries = [...newEntries];
  // 清理不存在的 key 的频率
  const validKeys = new Set(entries.map(e => e.k));
  for (const k of Object.keys(freqMap)) {
    if (!validKeys.has(k)) delete freqMap[k];
  }
  save();
}

/** 追加条目（支持 append / overwrite 模式） */
export function importEntries(newEntries, mode = 'replace') {
  if (mode === 'replace') {
    setEntries(newEntries);
    return;
  }

  const existingKeys = new Set(entries.map(e => e.k));
  if (mode === 'append') {
    entries = entries.concat(newEntries.filter(e => !existingKeys.has(e.k)));
  } else if (mode === 'overwrite') {
    const map = new Map(entries.map(e => [e.k, e]));
    for (const e of newEntries) map.set(e.k, e);
    entries = [...map.values()];
  }

  const validKeys = new Set(entries.map(e => e.k));
  for (const k of Object.keys(freqMap)) {
    if (!validKeys.has(k)) delete freqMap[k];
  }
  save();
}

/** 运行时构建搜索索引，返回 { keywordMap, sortedKeywords } */
export function buildIndex() {
  const keywordMap = Object.create(null);
  
  entries.forEach(({ k }, id) => {
    const keys = k.split(SEP);
    for (const key of keys) {
      if (!keywordMap[key]) keywordMap[key] = [];
      keywordMap[key].push(id);
    }
  });

  // 排序 ID 数组以优化交集
  for (const key in keywordMap) {
    keywordMap[key].sort((a, b) => a - b);
  }

  const sortedKeywords = Object.keys(keywordMap).sort();
  return { keywordMap, sortedKeywords };
}
