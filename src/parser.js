function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;

  let i = 0;
  while (i < trimmed.length && trimmed[i] === ' ') i++;
  if (i >= trimmed.length || trimmed[i] !== '"') return null;

  i++;
  let key = '';
  let escaped = false;

  for (; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escaped) {
      key += c;
      escaped = false;
      continue;
    }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { i++; break; }
    key += c;
  }

  const value = trimmed.slice(i).trim();
  return { key, value };
}

export function parseText(text) {
  const lines = text.split('\n');
  const tags = [];
  const freqs = {};
  let inFreq = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === '---') { inFreq = true; continue; }

    const parsed = parseLine(trimmed);
    if (!parsed) continue;

    if (inFreq) {
      const n = parseInt(parsed.value, 10);
      if (!isNaN(n) && n > 0) freqs[parsed.key] = n;
    } else {
      tags.push(parsed);
    }
  }

  return { tags, freqs };
}

export function escapeKey(key) {
  return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatEntry(key, value) {
  return `"${escapeKey(key)}" ${value}`;
}
