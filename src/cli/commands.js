import { parseCommand } from './parser.js';
import {
  HELP,
  hasHelpFlag,
  usageOf,
  commandHelpText,
  allHelpText,
} from './helper.js';
import {
  getEntries,
  getFreqMap,
  getRawText,
  setRawText,
  mergeFreq,
} from '../core/data.js';
import { search } from '../core/query.js';
import { parseKVText, escapeKVKey } from '../core/kvFormat.js';
import { copyText, downloadText } from '../core/utils.js';

// 搜索命令
function cmdGet(app, args) {
  const opt = args[0];
  const terms = args.slice(1);

  let results;
  switch (opt) {
    case '-a': results = getEntries(); break;
    case '-s': results = search(terms, true, false); break;
    case '-sa': results = search(terms, true, true); break;
    case '-c': results = search(terms, false, false); break;
    case '-ca': results = search(terms, false, true); break;
    default: throw new Error(`unknown option: ${opt}\n${usageOf('get')}`);
  }

  // 按频率排序，设置到结果区（面板渲染）
  const freqMap = getFreqMap();
  const sorted = [...results].sort((a, b) => (freqMap[b.k] || 0) - (freqMap[a.k] || 0));
  app.setResults(sorted);

  if (!sorted.length) {
    app.log('(no results)');
  }
}

// 编辑命令
function cmdEdit(app) {
  // 获取原始条目文本和当前频率映射
  const raw = getRawText();
  const freqMap = getFreqMap();
  const entries = getEntries();

  // 构建频率区文本（只包含频率 > 0 的条目）
  const freqLines = entries
    .filter(e => freqMap[e.k] > 0)
    .map(e => `"${escapeKVKey(e.k)}" ${freqMap[e.k]}`);

  // 拼接完整文本：条目行 + --- + 频率行
  const fullText = freqLines.length > 0
    ? raw + '\n---\n' + freqLines.join('\n')
    : raw + '\n---';

  app.showEditor(fullText, (newText) => {
    // 解析用户编辑后的完整文本
    const parsed = parseKVText(newText);

    // 提取条目部分（--- 之前的原始行）
    // 注意：这里不能用 newText.split('---')[0] 因为用户可能在值中包含 ---
    // 最安全的方法是从 parseKVText 的结果反向组装，
    // 但 tags 已丢失注释和空行。因此采用保留原始文本的方式：
    const sepIndex = newText.lastIndexOf('\n---');
    const entryText = sepIndex !== -1 ? newText.slice(0, sepIndex).trimEnd() : newText.trimEnd();
    
    // 保存条目文本（包含注释、空行等）
    setRawText(entryText);
    // 合并用户手动调整的频率
    mergeFreq(parsed.freqs);

    let msg = `saved (${getEntries().length} entries)`;
    if (parsed.invalidLines.length) {
      msg += `\nskipped:\n${parsed.invalidLines.join('\n')}`;
    }
    app.log(msg);
    app.render();
  });
}

// 导入命令
function cmdImport(app, args) {
  const mode = args[0] === '-a' ? 'append' : 'replace';  // 不再处理 '-o'
  app.showEditor('', (text) => {
    const parsed = parseKVText(text + '\n---');
    let newRaw;

    if (mode === 'replace') {
      newRaw = text;
    } else { // append
      const current = getRawText();
      newRaw = current ? current + '\n' + text : text;
    }

    setRawText(newRaw);
    mergeFreq(parsed.freqs);
    app.log(`imported (mode: ${mode}, ${getEntries().length} entries)`);
    app.render();
  });
}

// 导出命令
function cmdExport(app, args) {
  const freqMap = getFreqMap();
  const entries = getEntries();

  // 构建频率区文本
  const freqLines = entries
    .filter(e => freqMap[e.k] > 0)
    .map(e => `"${escapeKVKey(e.k)}" ${freqMap[e.k]}`);

  // 拼接：原始文本 + --- + 频率行
  const fullText = getRawText() + '\n---\n' + freqLines.join('\n');

  if (!args.length || args[0] === '-f') {
    downloadText(fullText, 'kv_data.txt');
    app.log('Exported as kv_data.txt');
  } else if (args[0] === '-c') {
    copyText(fullText);
    app.log('Copied to clipboard.');
  } else {
    throw new Error(`unknown option: ${args[0]}\n${usageOf('export')}`);
  }
}

// 帮助命令
function cmdHelp(app, args) {
  const name = args[0];
  if (name) {
    app.log(commandHelpText(name));
  } else {
    app.log(allHelpText());
  }
}

// 入口
export async function runCommand(app, line) {
  const { name, args } = parseCommand(line);
  if (!name) return;

  app.log(`> ${line}`);

  try {
    if (name !== 'help' && hasHelpFlag(args)) {
      app.log(commandHelpText(name));
      app.render();
      return;
    }

    switch (name) {
      case 'help': case '-h': case 'h':
        cmdHelp(app, args);
        break;
      case 'get':
        cmdGet(app, args);
        break;
      case 'ls':
        cmdGet(app, ['-a']);
        break;
      case 'edit':
        cmdEdit(app);
        break;
      case 'import':
        cmdImport(app, args);
        break;
      case 'export':
        cmdExport(app, args);
        break;
      default:
        throw new Error(`unknown command: ${name}\nType \`help\` to see available commands.`);
    }
  } catch (err) {
    app.log(`error: ${err.message || err}`);
  } finally {
    app.render();
  }
}
