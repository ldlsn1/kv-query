/**
 * 面板内容渲染，以及文本解析/格式化工具
 */

import { addFreq } from '../core/data.js';

const SEP = ' | ';

// ---------- 文本解析（来自原项目 parser.js） ----------

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

// UI 渲染

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/**
 * 渲染主面板
 * @param {object} app 应用实例
 * @param {HTMLElement} container 面板容器
 */
export function renderPanel(app, container) {
  container.innerHTML = '';

  // 如果有编辑器打开，面板不显示其他内容，仅显示一个提示（可调整）
  // 这里我们只处理两种状态：显示日志或搜索结果
  // 简单起见，始终先显示日志，再显示当前结果列表（类似原版行为）

  // 显示日志
  const logs = app.state.logs;
  if (logs.length) {
    for (const line of logs) {
      const div = document.createElement('div');
      div.className = line.startsWith('>') ? 'cmd-line' : (line.startsWith('error:') ? 'err' : 'info');
      div.textContent = line;
      container.appendChild(div);
    }
  }

  // 显示结果列表（如果有）
  const results = app.state.results;
  if (results && results.length) {
    // 按频率排序
    const sorted = [...results].sort((a, b) =>
      (app.state.freqMap[b.k] || 0) - (app.state.freqMap[a.k] || 0)
    );

    for (const e of sorted) {
      const div = document.createElement('div');
      div.className = 'entry';
      div.innerHTML = `<span class="key">${esc(e.k)}</span><span class="sep"> : </span><span class="val">${esc(e.v)}</span>`;

      div.addEventListener('click', () => {
        navigator.clipboard.writeText(e.v).catch(() => {});
        addFreq(e.k);
        // 反馈闪烁
        div.classList.add('flash');
        setTimeout(() => div.classList.remove('flash'), 150);
      });

      container.appendChild(div);
    }
  } else if (!logs.length) {
    container.innerHTML = '<div class="info">No data. Type <code>help</code> to get started.</div>';
  }

  // 滚动到底部
  container.scrollTop = container.scrollHeight;
}
