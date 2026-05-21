import { parseCommand } from './parser.js';
import {
  HELP,
  hasHelpFlag,
  usageOf,
  commandHelpText,
  allHelpText,
} from './helper.js';
import { getEntries, getFreqMap, setEntries, importEntries, mergeFreq } from '../core/data.js';
import { search } from '../core/query.js';
import { parseKVText, escapeKVKey, formatKVEntry } from '../core/kvFormat.js';
import { copyText, downloadText } from '../core/utils.js';

// 搜索命令
function cmdGet(app, args) {
  const opt = args[0];
  const terms = args.slice(1);

  let results;
  switch (opt) {
    case '-a':
      results = getEntries();
      break;
    case '-s':
      results = search(terms, true, false);
      break;
    case '-sa':
      results = search(terms, true, true);
      break;
    case '-c':
      results = search(terms, false, false);
      break;
    case '-ca':
      results = search(terms, false, true);
      break;
    default:
      throw new Error(`unknown option: ${opt}\n${usageOf('get')}`);
  }
  app.setResults(results);
}

// 编辑命令：弹出编辑器，保存后更新数据，不显示条目
function cmdEdit(app) {
  app.setResults([]);
  const text = entriesToText();
  app.showEditor(text, (newText) => {
    const parsed = parseKVText(newText);
    let msg = '';

    if (parsed.tags.length) {
      setEntries(parsed.tags.map(t => ({ k: t.key, v: t.value })));
      mergeFreq(parsed.freqs);
      msg = `saved (${getEntries().length} entries)`;
    } else {
      msg = `error: no valid entries saved.`;
    }

    if (parsed.invalidLines.length) {
      msg += `
skipped:
${parsed.invalidLines.join('\n')}`;
    }

    app.log(msg);
    app.render();
  });
}

// 导入命令：弹出编辑器，不显示条目
function cmdImport(app, args) {
  app.setResults([]);
  const mode = args[0] === '-a' ? 'append' : args[0] === '-o' ? 'overwrite' : 'replace';
  app.showEditor('', (text) => {
    const parsed = parseKVText(text);
    if (parsed.tags.length) {
      const incoming = parsed.tags.map(t => ({ k: t.key, v: t.value }));
      importEntries(incoming, mode);
      app.log(`imported (mode: ${mode}, ${getEntries().length} entries)`);
    }
    app.render();
  });
}

// 导出命令：不显示条目
function cmdExport(app, args) {
  app.setResults([]);
  const text = entriesToText();


  if (!args.length || args[0] === '-f') {
    downloadText(text, 'kv_data.txt');
    app.log('Exported as kv_data.txt');
    return;
  }

  if (args[0] === '-c') {
    copyText(text);
    app.log('Copied to clipboard.');
    return;
  }

  throw new Error(`unknown option: ${args[0]}\n${usageOf('export')}`);
}

// 帮助命令：不显示条目
function cmdHelp(app, args) {
  app.setResults([]);
  const name = args[0];
  if (name) {
    app.log(commandHelpText(name));
  } else {
    app.log(allHelpText());
  }
}

function entriesToText() {
  const entries = getEntries();
  const freqMap = getFreqMap();
  const lines = entries.map(e => formatKVEntry(e.k, e.v));
  lines.push('---');
  for (const e of entries) {
    if (freqMap[e.k] > 0) {
      lines.push(`"${escapeKVKey(e.k)}" ${freqMap[e.k]}`);
    }
  }
  return lines.join('\n');
}

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
