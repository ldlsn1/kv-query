export const HELP = {
  get: {
    summary: 'search entries by tags or text',
    usage: 'get <option> [term ...]',
    desc: `options:
  -a     list all entries, sorted by access frequency
  -s     strict tag match, OR logic
  -sa    strict tag match, AND logic
  -c     contains match (key or value), OR logic
  -ca    contains match (key or value), AND logic

notes:
  strict mode matches whole tags (split by "|")
  contains mode matches any substring in key or value

examples:
  get -a
  get -s fruit
  get -sa fruit red
  get -c vegetable
  get -ca vegetable red`,
  },

  ls: {
    summary: 'list all entries (alias for `get -a`)',
    usage: 'ls',
    desc: `examples:
  ls`,
  },

  edit: {
    summary: 'edit entries in a textarea',
    usage: 'edit',
    desc: `notes:
  opens a full-screen textarea with the current data
  lines follow the format: "key" value
  separate tag area and frequency area with "---"

examples:
  edit`,
  },

  import: {
    summary: 'import data from text',
    usage: 'import [-a | -o]',
    desc: `default: replace all entries

options:
  -a     append directly

notes:
  opens an editor to paste text data

examples:
  import
  import -a
  import -o`,
  },

  export: {
    summary: 'export data as text',
    usage: 'export [-f | -c]',
    desc: `default: -f

options:
  -f     download as kv_data.txt
  -c     copy to clipboard

examples:
  export
  export -c`,
  },
};

export function hasHelpFlag(args) {
  return args.includes('-h');
}

export function usageOf(name) {
  return `usage: ${HELP[name]?.usage || name}`;
}

/**
 * 生成单个命令的详细帮助文本
 * 对于 'help' 命令本身，直接返回所有命令的总览（避免冗余）
 */
export function commandHelpText(name) {
  if (name === 'help') {
    return allHelpText();
  }

  const item = HELP[name];
  if (!item) return `unknown command: ${name}`;
  return `  ${name} -> ${item.summary}

usage:
  ${item.usage}
  ${item.desc}`;
}

export function allHelpText() {
  const rows = Object.entries(HELP)
    .map(([name, item]) => `  ${name.padEnd(8)} ${item.summary}`)
    .join('\n');

  return `commands:
${rows}

usage:
  help <command>
  <command> -h

examples:
  import -h
  export -f
  help edit`;
}
