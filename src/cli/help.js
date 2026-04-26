export const HELP = {
  get: {
    summary: 'search entries by tags or text',
    usage: 'get <option> [term ...]',
    opts: {
      '-a':    'list all entries',
      '-s':    'strict tag match, OR logic',
      '-sa':   'strict tag match, AND logic',
      '-c':    'contains match (key or value), OR logic',
      '-ca':   'contains match (key or value), AND logic',
    },
    desc: `Strict mode matches whole tags (split by "|").\nContains mode matches any substring in key or value.`,
    examples: [
      'get -a',
      'get -s fruit',
      'get -sa fruit red',
      'get -c vegetable',
      'get -ca vegetable red',
    ],
  },
  edit: {
    summary: 'edit entries in a textarea',
    usage: 'edit',
    desc: `Opens a full-screen textarea with the current data.\nLines follow the format: "key" value\nSeparate tag area and frequency area with "---".`,
    examples: ['edit'],
  },
  import: {
    summary: 'import data from text',
    usage: 'import [-a | -o]',
    opts: {
      '-a': 'append (skip duplicates)',
      '-o': 'append and overwrite existing keys',
    },
    desc: 'Opens an editor to paste text data. Default: replace all entries.',
    examples: ['import', 'import -a', 'import -o'],
  },
  export: {
    summary: 'export data as text',
    usage: 'export [-c]',
    opts: { '-c': 'copy to clipboard' },
    desc: 'Default: copy to clipboard.',
    examples: ['export', 'export -c'],
  },
  help: {
    summary: 'show help',
    usage: 'help [command]',
    desc: `With no arguments, lists all commands.\nWith a command name, shows detailed help.`,
    examples: ['help', 'help get', 'get -h'],
  },
};

export function hasHelpFlag(args) {
  return args.includes('-h');
}

export function usageOf(name) {
  return `usage: ${HELP[name]?.usage || name}`;
}

export function commandHelpText(name) {
  const cmd = HELP[name];
  if (!cmd) return `unknown command: ${name}`;
  const lines = [`  ${name} — ${cmd.summary}`, '', `  ${usageOf(name)}`, ''];
  if (cmd.opts) {
    lines.push('options:');
    for (const [flag, desc] of Object.entries(cmd.opts)) {
      lines.push(`  ${flag.padEnd(6)} ${desc}`);
    }
    lines.push('');
  }
  if (cmd.desc) lines.push(`  ${cmd.desc}`, '');
  if (cmd.examples) {
    lines.push('examples:');
    for (const ex of cmd.examples) lines.push(`  ${ex}`);
  }
  return lines.join('\n');
}

export function allHelpText() {
  const rows = Object.keys(HELP)
    .map(name => `  ${name.padEnd(8)} ${HELP[name].summary}`)
    .join('\n');
  return `commands:\n${rows}\n\n  For detailed help: help <command> or <command> -h`;
}
