/**
 * 数据模型:
 *   entries  : { k: string, v: string }[]    — 全部 KV 条目
 *   freqMap  : Record<string, number>         — composite key → 点击次数
 *
 * 数据流:
 *   load() ─> localStorage 有数据? ─yes─> 恢复 entries/freqMap
 *               │ no
 *               └─> 写入 EXAMPLE_DATA
 *
 *   执行命令 (get -a / get -s 等) ──> doGet() ──> render(results)
 *                                                      │
 *                                                      ├── 按 freqMap 降序
 *                                                      ├── 创建 DOM
 *                                                      └── 绑定 click
 *
 *   点击条目 ──> freqMap[e.k]++ + save()
 *            ──> 仅 CSS 闪烁反馈（不重排）
 */

import './style.css';
import { parseText, escapeKey, formatEntry } from './parser.js';

const SEP = ' | ';

// --- DOM refs ---
const panel = document.getElementById('panel');
const cliInput = document.getElementById('cliInput');
const cliForm = document.getElementById('cliForm');

// --- State ---
let entries = [];
let freqMap = {};

// --- 首次打开时写入的示例数据 ---
const EXAMPLE_DATA = [
  { k: 'apple | fruit | red',        v: 'A sweet red fruit' },
  { k: 'banana | fruit | yellow',    v: 'A long yellow fruit' },
  { k: 'carrot | vegetable | orange', v: 'A crunchy orange root' },
  { k: 'tomato | fruit | red | vegetable', v: 'Botanically a fruit, culinarily a vegetable' },
  { k: 'grape | fruit | purple',     v: 'Small round fruit for wine' },
];

// --- Persistence ---

function load() {
  try {
    entries = JSON.parse(localStorage.getItem('kv_entries') || 'null');
    freqMap = JSON.parse(localStorage.getItem('kv_freq') || '{}');
    if (!entries) {
      entries = EXAMPLE_DATA;
      save();
    }
  } catch {
    entries = EXAMPLE_DATA;
  }
}

function save() {
  localStorage.setItem('kv_entries', JSON.stringify(entries));
  localStorage.setItem('kv_freq', JSON.stringify(freqMap));
}

// --- Helpers ---

/** HTML 转义 */
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** 在 panel 末尾追加一行 */
function addLine(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  panel.appendChild(d);
}

// --- Render ---

/** 渲染列表，按 freqMap 降序排列 */
function render(list) {
  panel.innerHTML = '';
  if (!list.length) {
    addLine('info', 'No matches.');
    return;
  }

  // 排序（频率高的在前）
  const sorted = [...list].sort((a, b) => (freqMap[b.k] || 0) - (freqMap[a.k] || 0));

  for (const e of sorted) {
    const div = document.createElement('div');
    div.className = 'entry';
    div.innerHTML = `<span class="key">${esc(e.k)}</span><span class="sep"> : </span><span class="val">${esc(e.v)}</span>`;

    // 点击：复制值 + 记录频率 + 闪烁反馈（不触发重排）
    div.addEventListener('click', () => {
      navigator.clipboard.writeText(e.v).catch(() => {});
      freqMap[e.k] = (freqMap[e.k] || 0) + 1;
      save();
      div.classList.add('flash');
      setTimeout(() => div.classList.remove('flash'), 150);
    });

    panel.appendChild(div);
  }
}

// --- Search ---

function getMatches(terms, strict, isAnd) {
  // 每个 term 生成一个 ID 集合
  const groups = terms.map(t =>
    entries.filter(e => {
      const keys = e.k.split(SEP);
      return strict
        ? keys.some(k => k === t)            // 精确匹配标签
        : e.k.includes(t) || e.v.includes(t); // 模糊匹配
    })
  );
  if (!groups.length) return [];
  // AND: 交集；OR: 并集
  return isAnd
    ? groups.reduce((a, b) => a.filter(e => b.includes(e)))
    : [...new Set(groups.flat())];
}

// --- Commands ---

function showHelp() {
  panel.innerHTML = '';
  addLine('cmd-line', 'Commands:');
  addLine('info', '  get -a            List all entries');
  addLine('info', '  get -s <tag>      Strict match (OR)');
  addLine('info', '  get -sa <tag>     Strict match (AND)');
  addLine('info', '  get -c <term>     Contains match (OR)');
  addLine('info', '  get -ca <term>    Contains match (AND)');
  addLine('info', '  edit              Edit entries');
  addLine('info', '  import            Import from text');
  addLine('info', '  export            Export to clipboard');
  addLine('info', '  help              Show this help');
  addLine('info', '');
  addLine('info', 'Click an entry to copy its value & record frequency.');
}

function doGet(opt, terms) {
  switch (opt) {
    case '-a':  render(entries);                            break;
    case '-s':  render(getMatches(terms, true,  false));    break;
    case '-sa': render(getMatches(terms, true,  true));     break;
    case '-c':  render(getMatches(terms, false, false));    break;
    case '-ca': render(getMatches(terms, false, true));     break;
    default:    addLine('err', `Unknown option: ${opt}`);   break;
  }
}

// --- Editor ---

/** 把当前 entries/freqMap 序列化为可编辑文本 */
function entriesToText() {
  const lines = entries.map(e => formatEntry(e.k, e.v));
  lines.push('---');
  // 频率区：只输出有点击记录的条目
  for (const e of entries) {
    if (freqMap[e.k] > 0) {
      lines.push(`"${escapeKey(e.k)}" ${freqMap[e.k]}`);
    }
  }
  return lines.join('\n');
}

/** 弹出全屏文本编辑器 */
function openEditor(text) {
  const overlay = document.createElement('div');
  overlay.className = 'edit-overlay';

  const box = document.createElement('div');
  box.className = 'edit-box';

  const ta = document.createElement('textarea');
  ta.value = text;

  // 按钮组
  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const btnSave = document.createElement('button');
  btnSave.className = 'btn-save';
  btnSave.textContent = 'Save';

  const btnCancel = document.createElement('button');
  btnCancel.className = 'btn-cancel';
  btnCancel.textContent = 'Cancel';

  actions.append(btnSave, btnCancel);
  box.append(ta, actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  ta.focus();

  // Save: 解析文本 → 更新 entries/freqMap → 持久化 → 渲染
  btnSave.onclick = () => {
    const parsed = parseText(ta.value);
    if (parsed.tags.length) {
      // parser.js 返回 { key, value }，统一为 { k, v }
      entries = parsed.tags.map(t => ({ k: t.key, v: t.value }));

      // 合并频率区数据
      for (const [k, v] of Object.entries(parsed.freqs)) {
        freqMap[k] = v;
      }

      // 清理已删除条目的频率
      const activeKeys = new Set(entries.map(e => e.k));
      for (const k of Object.keys(freqMap)) {
        if (!activeKeys.has(k)) delete freqMap[k];
      }

      save();
      render(entries);
    }
    overlay.remove();
  };

  btnCancel.onclick = () => overlay.remove();
}

function doEdit()   { openEditor(entriesToText()); }
function doExport() {
  const text = entriesToText();
  navigator.clipboard.writeText(text).then(() => {
    panel.innerHTML = '';
    addLine('info', 'Exported to clipboard.');
  }).catch(() => {
    // 浏览器不支持 clipboard 时 fallback 到编辑器
    openEditor(text);
  });
}
function doImport() { openEditor(''); }

// --- Init ---

load();

// --- CLI 输入 ---
cliForm.addEventListener('submit', e => {
  e.preventDefault();
  const raw = cliInput.value.trim();
  if (!raw) return;
  cliInput.value = '';
  addLine('cmd-line', `> ${raw}`);

  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1];
  const rest = parts.slice(2);

  switch (cmd) {
    case 'help': case '-h': case 'h':
      showHelp();
      break;
    case 'get':
      if (!arg1) {
        addLine('err', 'Usage: get -a | -s <tag> | -sa <tag> | -c <term> | -ca <term>');
      } else {
        doGet(arg1, rest);
      }
      break;
    case 'ls':
      render(entries);
      break;
    case 'edit':
      doEdit();
      break;
    case 'export':
      doExport();
      break;
    case 'import':
      doImport();
      break;
    default:
      addLine('err', `Unknown command: ${cmd}. Try 'help'`);
  }
});

// 启动时如果已有数据则渲染，否则显示帮助
if (entries.length) {
  render(entries);
} else {
  showHelp();
}
