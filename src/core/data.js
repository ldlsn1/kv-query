/**
 * 数据中心：
 * - 持久化 rawEntryText (用户原始条目文本) 和 freqMap (点击频率)
 * - 维护 entries 数组和搜索索引作为内存缓存
 * - 数据变更后立即重建缓存
 */

import { parseKVText, escapeKVKey } from './kvFormat.js';
import { KV_DATA } from '../../data/raw.js';

const RAW_KEY = 'kv_raw';    // 存储原始条目文本
const FREQ_KEY = 'kv_freq';  // 存储频率映射

// 持久化数据
let rawEntryText = '';       // 用户编辑区 `---` 之前的完整文本
let freqMap = {};

// 内存缓存 (不持久化)
let entries = [];            // 解析后的条目数组 { k, v }
let cachedIndex = null;      // 搜索索引 { keywordMap, sortedKeywords }

/** 生成默认原始文本（首次使用时） */
function defaultRawText() {
  return Object.entries(KV_DATA)
    .map(([k, v]) => `"${escapeKVKey(k)}" ${v}`)
    .join('\n');
}

/** 从原始文本重建 entries 并立即构建搜索索引 */
function rebuildEntries() {
  const parsed = parseKVText(rawEntryText + '\n---'); // 借用解析，只取 tags
  entries = parsed.tags.map(t => ({ k: t.key, v: t.value }));

  // 立即基于新 entries 构建索引缓存
  cachedIndex = buildIndexFromEntries(entries);
}

/** 从条目数组构建搜索索引（纯函数） */
function buildIndexFromEntries(entries) {
  const keywordMap = Object.create(null);
  entries.forEach(({ k }, id) => {
    // 标签用 " | " 分隔
    k.split(' | ').forEach(key => {
      if (!keywordMap[key]) keywordMap[key] = [];
      keywordMap[key].push(id);
    });
  });
  // 对每个关键词的 ID 列表排序（优化交集运算）
  for (const key in keywordMap) {
    keywordMap[key].sort((a, b) => a - b);
  }
  const sortedKeywords = Object.keys(keywordMap).sort();
  return { keywordMap, sortedKeywords };
}

// 初始化
export function load() {
  try {
    rawEntryText = localStorage.getItem(RAW_KEY);
    freqMap = JSON.parse(localStorage.getItem(FREQ_KEY) || '{}');
    if (!rawEntryText) {
      // 首次使用，用默认数据填充原始文本
      rawEntryText = defaultRawText();
      freqMap = {};
    }
  } catch {
    rawEntryText = defaultRawText();
    freqMap = {};
  }
  // 启动时立即解析并构建索引
  rebuildEntries();
}

export function save() {
  localStorage.setItem(RAW_KEY, rawEntryText);
  localStorage.setItem(FREQ_KEY, JSON.stringify(freqMap));
}

// 数据访问器
export function getRawText() {
  return rawEntryText;
}

/** 设置原始文本（编辑/导入的唯一入口），触发缓存重建 */
export function setRawText(text) {
  rawEntryText = text;
  rebuildEntries();  // 解析 + 索引立即重建
  save();
}

export function getEntries() {
  return entries;
}

export function getFreqMap() {
  return freqMap;
}

export function addFreq(key) {
  freqMap[key] = (freqMap[key] || 0) + 1;
  save();   // 频率变化持久化，但不影响索引
}

/** 合并外部频率（编辑或导入时用户可能手动修改频率区） */
export function mergeFreq(newFreq) {
  Object.assign(freqMap, newFreq);
  save();
}

/** 返回缓存的搜索索引（总是最新） */
export function getIndex() {
  return cachedIndex;
}
