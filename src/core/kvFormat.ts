/**
 * 自定义键值文本格式（"key" value）的解析与序列化。
 * 用于编辑、导入、导出操作。
 *
 * 格式约定：
 * - 标签区由若干条目组成，每个条目可以是：
 *     "key" value         单行值
 *     "key" ```           多行值起始
 *     多行内容...
 *     ```                 多行值结束
 * - 以 // 开头的行视为注释（忽略）
 * - 完全空行忽略
 * - 标签区与频率区在完整文本中用最后一个 `\n---` 分隔
 * - 频率区每行为 "key" number，number 为正整数
 * - 不 trim 任何行，空白原样保留
 */

// 类型定义

/** 一个键值条目 */
export interface KVEntry {
  key: string;
  value: string;
}

/** parseKVText（纯标签区）的返回值 */
export interface ParsedKVText {
  tags: KVEntry[];
  invalidLines: string[];
}

/** parseFullText（完整文本）的返回值 */
export interface ParsedFullText {
  entryText: string;
  freqs: Record<string, number>;
  invalidLines: string[];
}

// 内部常量

const ESCAPE_CHARS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

//工具函数

/** 转义 HTML 特殊字符 */
export const escapeHTML = (str: string): string =>
  str.replace(/[&<>"]/g, (char) => ESCAPE_CHARS[char]);

/**
 * 转义键中的反斜杠和双引号，保证用双引号包裹时不破坏边界。
 * 只做最小转义，与 parseKVLine 配合保证可逆。
 */
export function escapeKVKey(key: string): string {
  return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** 将键值格式化为一行 "key" value */
export function formatKVEntry(key: string, value: string): string {
  return `"${escapeKVKey(key)}" ${value}`;
}

// 解析核心

/**
 * 解析一行 "key" value（单行值格式）。
 * 要求：
 * - 行首为双引号
 * - 正确解析键中的转义
 * - 键的结束双引号后 **必须紧跟一个空格** 作为键值分隔符
 * - 空格之后的所有内容（包括可能的尾部空格）作为值原样保留
 */
function parseKVLine(line: string): KVEntry | null {
  if (line[0] !== '"') return null;

  let i = 1;
  let key = '';
  let escaped = false;

  for (; i < line.length; i++) {
    const c = line[i];
    if (escaped) {
      key += c;
      escaped = false;
      continue;
    }
    if (c === '\\') {
      escaped = true;
      continue;
    }
    if (c === '"') {
      i++; // 跳过结束引号
      break;
    }
    key += c;
  }

  // 结束引号后必须是空格，否则格式错误
  if (line[i] !== ' ') return null;

  // 值从空格后开始，保留所有字符
  const value = line.slice(i + 1);
  return { key, value };
}

/**
 * 解析纯标签区文本（不含 `---` 频率分隔线）。
 * 支持：
 * - "key" value      单行条目
 * - "key" ``` … ```  多行条目
 * - // 注释
 * - 空行忽略
 *
 * 注意：多行起始检测必须放在单行检测之前，
 * 否则 "key" ``` 会被当作单行值处理（值为 ```）。
 */
export function parseKVText(text: string): ParsedKVText {
  const tags: KVEntry[] = [];
  const invalidLines: string[] = [];
  let multiline: { key: string; lines: string[] } | null = null;

  for (const [idx, rawLine] of text.split('\n').entries()) {
    // 多行收集模式
    if (multiline) {
      if (rawLine === '```') {
        tags.push({ key: multiline.key, value: multiline.lines.join('\n') });
        multiline = null;
      } else {
        multiline.lines.push(rawLine);
      }
      continue;
    }

    // 忽略空行与注释
    if (rawLine === '' || rawLine.startsWith('//')) continue;

    // 统一尝试按单行键值解析
    const parsed = parseKVLine(rawLine);
    if (parsed) {
      // 如果值正好是 ``` ，则进入多行模式
      if (parsed.value === '```') {
        multiline = { key: parsed.key, lines: [] };
      } else {
        tags.push(parsed);
      }
      continue;
    }

    // 无法识别的行
    invalidLines.push(`  Line ${idx + 1}  ${rawLine}`);
  }

  // 未闭合的多行内容直接作为值
  if (multiline) {
    tags.push({ key: multiline.key, value: multiline.lines.join('\n') });
  }

  return { tags, invalidLines };
}

/**
 * 解析频率区文本（`---` 之后的部分）。
 * 每行格式："key" number。
 *
 * @param freqText  频率区文本
 * @param startLine 频率区第一行在全文中的行号（1-based），用于报错行号
 */
function parseFreqSection(
  freqText: string,
  startLine: number
): { freqs: Record<string, number>; invalidLines: string[] } {
  const lines = freqText.split('\n');
  const freqs: Record<string, number> = {};
  const invalidLines: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    // 空行或注释
    if (rawLine === '' || rawLine.startsWith('//')) continue;

    const parsed = parseKVLine(rawLine);
    if (parsed) {
      const n = parseInt(parsed.value, 10);
      if (!isNaN(n) && n > 0) {
        freqs[parsed.key] = n;
        continue;
      }
    }
    // 格式错误
    invalidLines.push(`  Line ${startLine + idx}  ${rawLine}`);
  }

  return { freqs, invalidLines };
}

/**
 * 解析编辑/导入的完整文本。
 *
 * 使用 最后一个 `\n---` 作为标签区和频率区的分隔线，
 * 这样标签区可以安全地包含 `---` 行（例如在多行值内部）。
 */
export function parseFullText(fullText: string): ParsedFullText {
  const sepIdx = fullText.lastIndexOf('\n---');
  let entryText: string;
  let freqText: string;

  if (sepIdx === -1) {
    entryText = fullText;
    freqText = '';
  } else {
    entryText = fullText.slice(0, sepIdx);
    // 跳过 `\n---` 本身（4 个字符）
    freqText = fullText.slice(sepIdx + 4);
  }

  // 解析标签区（忽略返回的 tags，仅用于校验无效行）
  const { invalidLines: tagInvalid } = parseKVText(entryText);

  // 计算频率区在全文中的起始行号（1-based）
  const entryLineCount = entryText.split('\n').length;
  const freqStartLine = sepIdx === -1 ? entryLineCount + 1 : entryLineCount + 1;

  const { freqs, invalidLines: freqInvalid } = parseFreqSection(freqText, freqStartLine);

  return {
    entryText,
    freqs,
    invalidLines: [...tagInvalid, ...freqInvalid],
  };
}
