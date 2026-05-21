/**
 * 自定义键值文本格式（"key" value）的解析与序列化。
 * 用于编辑、导入、导出操作。
 */

// HTML 转义，防止 XSS 和显示错乱
const ESCAPE_CHARS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
};
export const escapeHTML = str => str.replace(/[&<>"]/g, char => ESCAPE_CHARS[char]);

/**
 * 解析一行文本，提取双引号包裹的键和剩余部分作为值。
 * 例：  "apple | fruit | red" A sweet red fruit
 * 返回： { key: "apple | fruit | red", value: "A sweet red fruit" }
 */
function parseKVLine(line) {
  // 必须以双引号开头
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
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { i++; break; }
    key += c;
  }

  const value = line.slice(i).trim();
  return { key, value };
}

/**
 * 解析完整的键值文本。
 * 格式：若干行 "key" value，用 "---" 分隔可选的频率区。
 * 频率区每行格式："key" number
 * @param {string} text
 * @returns {{
 *   tags: Array<{key: string, value: string}>,
 *   freqs: Record<string, number>,
 *   invalidLines: string[] // 格式为 "  Line 行号  原始行内容"，包含所有非空非注释但格式错误的行
 * }}
 */
export function parseKVText(text) {
  const lines = text.split('\n');
  const tags = [];
  const freqs = {};
  const invalidLines = [];   // 直接存字符串 "行号 原始行内容"
  let inFreq = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    if (trimmed === '---') { inFreq = true; continue; }
    if (!trimmed || trimmed.startsWith('//')) continue;

    const parsed = parseKVLine(trimmed);

    if (!parsed) {
      invalidLines.push(`  Line ${idx + 1}  ${rawLine}`);
      continue;
    }

    if (inFreq) {
      const n = parseInt(parsed.value, 10);
      if (!isNaN(n) && n > 0) {
        freqs[parsed.key] = n;
      } else {
        invalidLines.push(`  Line ${idx + 1}  ${rawLine}`);
      }
    } else {
      tags.push(parsed);
    }
  }

  return { tags, freqs, invalidLines };
}


/**
 * 转义键中的反斜杠和双引号，保证用双引号包裹时不破坏边界。
 * 只做最小转义，与 parseKVLine 配合保证可逆。
 */
export function escapeKVKey(key) {
  return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * 将键值格式化为一行 "key" value
 */
export function formatKVEntry(key, value) {
  return `"${escapeKVKey(key)}" ${value}`;
}
