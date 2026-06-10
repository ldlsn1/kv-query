export const HELP = {
  get: {
    summary: 'get entries by searching tags',
    usage: 'get <option> [term ...]',
    desc: `alias: g

options:
  -a     list all entries, sorted by access frequency
  -s     strict match, OR logic
  -sa    strict match, AND logic
  -c     contains match, OR logic
  -ca    contains match, AND logic

notes:
  strict mode matches whole tags (split by " | ")
  contains mode matches any substring in tags

examples:
  get -a
  get -s fruit
  get -sa fruit red
  get -ca vegetable red`,
  },

  g: {
    summary: 'alias for get',
    usage: 'g <option> [term ...]',
    desc: `notes:
  \`help get\` for full details.`,
  },

  ls: {
    summary: 'list all entries (alias for `get -a`)',
    usage: 'ls',
    desc: ``,
  },

  edit: {
    summary: 'edit entries in a textarea',
    usage: 'edit',
    desc: `notes:
  open a textarea with the current data for editing.
  the data consists of two sections separated by a line containing only \`---\`.

edit content structure:
  above \`---\`: tag-value entries.
  below \`---\`: frequency records (only shown for entries with frequency > 0).

format rules:
  each entry line follows \`"<key>" <value>\`
  • The key is enclosed in double quotes and may contain escaped characters: \`\\"\` for a literal double quote and \`\\\\\` for a backslash.
  • The value is everything after the closing quote and a single space; it does not need quotes and can contain any characters.
  • Multiline values are supported using \`"<key>" \`\`\`\\n...\\n\`\`\`\`.

  each frequency line follows \`"<key>" <positive integer>\`
  • The integer represents how many times the entry has been accessed (click frequency).
  • lines starting with \`//\` are treated as comments and ignored.
  • empty lines are ignored.
  • a line that doesn't match either format will be reported as invalid and skipped when saved.

  the frequency section is optional. If omitted, no frequency changes are applied.
  when you save, the app parses the text, updates entries and frequencies, and rebuilds the search index instantly.

  use \`import\` and \`export\` to manage your data.

format example:
  "tag1 | tag2" some content
  "tag3" \`\`\`
  multi-line
  content
  \`\`\`
  ---
  "tag3" 1`,
  },
  
  import: {
    summary: 'import data from text or file',
    usage: 'import [-a | -f]',
    desc: `default: replace all entries via text editor

options:
  -a     append to existing entries
  -f     import from a local file instead of the editor

examples:
  import        // replace via editor
  import -a     // append via editor
  import -f -a  // append from file`,
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
