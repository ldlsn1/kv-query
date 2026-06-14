import { parseKVText, escapeKVKey } from './kvFormat.ts';
import { KV_DATA } from '../../data/raw.js';

/**
 * 数据中心：
 * - 持久化 rawEntryText (用户原始条目文本) 和 freqMap (点击频率)
 * - 维护 entries 数组和搜索索引作为内存缓存
 * - 数据变更后立即重建缓存
 */

const RAW_KEY = 'kv_raw';    // 存储原始条目文本的 localStorage 键名
const FREQ_KEY = 'kv_freq';  // 存储频率映射的 localStorage 键名

// 持久化数据
let rawEntryText = '';  // 用户编辑区 `---` 之前的完整文本
let freqMap: Record<string, number> = {}; // 键 -> 点击次数

// 内存缓存 (不持久化)
let entries: { k: string; v: string }[] = [];  // 解析后的条目数组 { k: 标签, v: 值 }
let cachedIndex: { m: Record<string, number[]>; k: string[] } | null = null; // 搜索索引：m 为关键词映射，k 为排序后的关键词列表

/**
 * 生成默认原始文本（首次使用时调用）
 * 将扁平行数组 KV_DATA 转换为 "key" value 格式的多行文本
 */
function defaultRawText(): string {
  const lines: string[] = [];
  for (let i = 0; i < KV_DATA.length; i += 2) {
    const k = KV_DATA[i];
    const v = KV_DATA[i + 1];
    lines.push(`"${escapeKVKey(k)}" ${v}`);
  }
  return lines.join('\n');
}

/**
 * 从原始文本重建 entries 和搜索索引
 * 每次编辑、导入或初始化后都会调用，保证缓存与数据一致
 */
function rebuildEntries(): void {
  // 解析原始文本，获得标签和无效行（这里只取标签部分）
  const parsed = parseKVText(rawEntryText);
  entries = parsed.tags.map(t => ({ k: t.k, v: t.v }));

  // 构建倒排索引：关键词 -> 包含该词的条目 ID 列表
  const keywordMap: Record<string, number[]> = Object.create(null);
  entries.forEach(({ k }, id) => {
    // 标签严格用 " | " 分隔
    k.split(' | ').forEach(tag => {
      if (!keywordMap[tag]) keywordMap[tag] = [];
      keywordMap[tag].push(id);
    });
  });

  // 对每个关键词的 ID 列表排序（优化后续交集/并集运算）
  for (const tag in keywordMap) {
    keywordMap[tag].sort((a, b) => a - b);
  }

  // 更新缓存
  const sortedKeywords = Object.keys(keywordMap).sort();
  cachedIndex = { m: keywordMap, k: sortedKeywords };
}

// 初始化数据模块
export function load(): void {
  try {
    rawEntryText = localStorage.getItem(RAW_KEY) ?? '';
    freqMap = JSON.parse(localStorage.getItem(FREQ_KEY) || '{}');
    if (!rawEntryText) { // 首次使用，用默认数据填充原始文本
      rawEntryText = defaultRawText();
      freqMap = {};
    }
  } catch {
    // 回退默认
    rawEntryText = defaultRawText();
    freqMap = {};
  }
  // 无论何种情况，最后都重建缓存
  rebuildEntries();
}

/**
 * 持久化保存当前原始文本和频率映射
 */
export function save(): void {
  localStorage.setItem(RAW_KEY, rawEntryText);
  localStorage.setItem(FREQ_KEY, JSON.stringify(freqMap));
}

// 数据访问器

/** 返回当前的原始文本（用于编辑/导出） */
export function getRawText(): string {
  return rawEntryText;
}

/**
 * 设置新的原始文本（编辑或导入后调用）
 * 立即触发 entries 和索引的重建，并持久化
 */
export function setRawText(text: string): void {
  rawEntryText = text;
  rebuildEntries();  // 解析 + 索引立即重建
  save();
}

/** 返回当前所有条目（AoS 数组） */
export function getEntries(): { k: string; v: string }[] {
  return entries;
}

/** 返回当前的频率映射表 */
export function getFreqMap(): Record<string, number> {
  return freqMap;
}

/**
 * 增加某个条目的点击频率
 * 频率变化会立即持久化，但不影响索引
 */
export function addFreq(key: string): void {
  freqMap[key] = (freqMap[key] || 0) + 1;
  save();
}

/**
 * 合并外部频率数据
 * 新频率会覆盖已有键，并持久化
 */
export function mergeFreq(newFreq: Record<string, number>): void {
  Object.assign(freqMap, newFreq);
  save();
}

/**
 * 返回当前的搜索索引缓存，结构为 { m, k }
 * m: 关键词 -> 条目ID数组
 * k: 排序后的关键词列表
 */
export function getIndex(): { m: Record<string, number[]>; k: string[] } | null {
  return cachedIndex;
}
