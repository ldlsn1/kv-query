import { parseCommand } from './parser.js';
import {
  HELP,
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
} from '../core/data.ts';
import { search } from '../core/query.ts';
import { escapeKVKey, parseFullText } from '../core/kvFormat.ts';
import { copyText, downloadText, pickTextFile } from '../ui/utils.js';

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
    app.log('no results');
  }
}

/**
 * 编辑命令：弹出编辑器，让用户修改标签区和频率
 */
function cmdEdit(app) {
  // 构建编辑区初始内容：标签区 + --- + 频率行（只显示频率 >0）
  const raw = getRawText();
  const freqMap = getFreqMap();
  const entries = getEntries();

  // 从 freqMap 遍历，避免同名 k 重复出现
  const freqLines = Object.entries(freqMap)
    .filter(([, count]) => count > 0)
    .map(([k, count]) => `"${escapeKVKey(k)}" ${count}`);
  
  const fullText = freqLines.length > 0
    ? raw + '\n---\n' + freqLines.join('\n')
    : raw + '\n---';

  // 弹出编辑器，保存回调中解析并更新
  app.showEditor(fullText, (newText) => {
    const { entryText, freqs, invalidLines } = parseFullText(newText);

    setRawText(entryText);
    mergeFreq(freqs);

    let msg = `saved ${getEntries().length} entries`;
    if (invalidLines.length) {
      msg += `\nskipped:\n${invalidLines.join('\n')}`;
    }
    app.log(msg);
    app.render();
  });
}

/**
 * 导入命令：从编辑器或文件导入数据
 * 支持 -a（追加）和 -f（从文件读取）
 */
async function cmdImport(app, args) {
  const mode = args.includes('-a') ? 'append' : 'replace';

  // 获取文本：-f 通过文件选择，否则弹出编辑器
  let text;
  if (args.includes('-f')) {
    text = await pickTextFile();
    if (!text) return; // 用户取消文件选择
  } else {
    text = await new Promise(resolve => {
      app.showEditor('', resolve, () => resolve(null));
    });
    if (!text) return; // 用户取消编辑器
  }

  // 解析出标签区、频率和无效行
  const { entryText, freqs, invalidLines } = parseFullText(text);

  // 合并/替换标签区
  if (mode === 'append') {
    const current = getRawText();
    setRawText(current ? current + '\n' + entryText : entryText);
  } else {
    setRawText(entryText);
  }

  // 合并频率（新增或覆盖）
  mergeFreq(freqs);

  // 输出结果
  let msg = `imported (mode: ${mode}, ${getEntries().length} entries)`;
  if (invalidLines.length) {
    msg += `\nskipped:\n${invalidLines.join('\n')}`;
  }
  app.log(msg);
  app.render();
}


// 导出命令
function cmdExport(app, args) {
  const freqMap = getFreqMap();
  const entries = getEntries();

  // 构建频率区文本
  const freqLines = Object.entries(freqMap)
    .filter(([, count]) => count > 0)
    .map(([k, count]) => `"${escapeKVKey(k)}" ${count}`);
  
  // 拼接：原始文本 + --- + 频率行
  const fullText = getRawText() + '\n---\n' + freqLines.join('\n');

  if (!args.length || args[0] === '-f') {
    downloadText(fullText, 'kv_data.txt');
    app.log('exported as kv_data.txt');
  } else if (args[0] === '-c') {
    copyText(fullText);
    app.log('copied to clipboard.');
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

  // 重置结果，避免旧数据被非搜索命令展示
  app.state.results = [];

  app.log(`> ${line}`);

  try {
    if (name !== 'help' && args.includes('-h')) {
      app.log(commandHelpText(name));
      app.render();
      return;
    }

    switch (name) {
      case 'get': case 'g':
        cmdGet(app, args);
        break;
      case 'help':
        cmdHelp(app, args);
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
        throw new Error(`unknown command: ${name}\ntype \`help\` to see available commands.`);
    }
  } catch (err) {
    app.log(`error: ${err.message || err}`);
  } finally {
    app.render();
  }
}
