/**
 * 命令行分词器，支持双引号包裹和 \" 转义
 */
export function parseCommand(line: string = ''):
  { name: string; args: string[] } {
  const args = tokenize(line.trim());
  return { name: args[0] || '', args: args.slice(1) };
}

function tokenize(line: string) {
  const args = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];

    if (!inQuote && c === '"') {
      const isStartQuote = (i === 0 || line[i - 1] === ' ');
      if (isStartQuote) {
        inQuote = true;
        continue;
      }
      current += c;
      continue;
    }

    if (inQuote && c === '"') {
      const isEndQuote = (i === line.length - 1 || line[i + 1] === ' ');
      if (isEndQuote) {
        inQuote = false;
        continue;
      }
      current += c;
      continue;
    }

    if (inQuote && c === '\\') {
      if (i + 1 < line.length) {
        current += line[i + 1];
        i++;
      }
      continue;
    }

    if (c === ' ' && !inQuote) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += c;
  }

  if (current) args.push(current);
  return args;
}
