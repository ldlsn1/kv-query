import { parseCommand } from './parser.js';
import {
  HELP,
  hasHelpFlag,
  usageOf,
  commandHelpText,
  allHelpText,
} from './help.js';
import { getEntries, getFreqMap, setEntries, importEntries, addFreq } from '../core/data.js';
import { search } from '../core/query.js';
import { parseText, escapeKey, formatEntry } from '../ui/panelView.js'; // 解析/格式化工具移至 ui 或独立模块，见后文

// ---------- 命令函数 ----------

function cmdGet(app, args) {
  const opt = args[0];
  const terms = args.slice(1);

  if (hasHelpFlag(args)) {
    app.log(commandHelpText('get'));
    return;
  }

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

function cmdEdit(app) {
  const text = entriesToText();
  app.showEditor(text, (newText) => {
    const parsed = parseText(newText);
    if (parsed.tags.length) {
      setEntries(parsed.tags.map(t => ({ k: t.key, v: t.value })));
      // 频率合并
      for (const [k, v] of Object.entries(parsed.freqs)) {
        app.state.freqMap[k] = v;
      }
      app.log(`saved (${getEntries().length} entries)`);
    }
    app.render();
  });
}

function cmdImport(app, args) {
  const mode = args[0] === '-a' ? 'append' : args[0] === '-o' ? 'overwrite' : 'replace';
  app.showEditor('', (text) => {
    const parsed = parseText(text);
    if (parsed.tags.length) {
      const incoming = parsed.tags.map(t => ({ k: t.key, v: t.value }));
      importEntries(incoming, mode);
      app.log(`imported (mode: ${mode}, ${getEntries().length} entries)`);
    }
    app.render();
  });
}

function cmdExport(app) {
  const text = entriesToText();
  navigator.clipboard.writeText(text).then(() => {
    app.log('Exported to clipboard.');
  }).catch(() => {
    app.log('Export failed, opening editor.');
    app.showEditor(text, () => {});
  });
}

function cmdHelp(app, args) {
  const name = args[0];
  if (name) {
    app.log(commandHelpText(name));
  } else {
    app.log(allHelpText());
  }
}

// ---------- 辅助函数 ----------

function entriesToText() {
  const entries = getEntries();
  const freqMap = getFreqMap();
  const lines = entries.map(e => formatEntry(e.k, e.v));
  lines.push('---');
  for (const e of entries) {
    if (freqMap[e.k] > 0) {
      lines.push(`"${escapeKey(e.k)}" ${freqMap[e.k]}`);
    }
  }
  return lines.join('\n');
}

// ---------- 派发 ----------

export async function runCommand(app, line) {
  const { name, args } = parseCommand(line);
  if (!name) return;

  app.log(`> ${line}`);

  try {
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
        if (hasHelpFlag(args)) { app.log(commandHelpText('edit')); return; }
        cmdEdit(app);
        break;
      case 'import':
        if (hasHelpFlag(args)) { app.log(commandHelpText('import')); return; }
        cmdImport(app, args);
        break;
      case 'export':
        if (hasHelpFlag(args)) { app.log(commandHelpText('export')); return; }
        cmdExport(app);
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
