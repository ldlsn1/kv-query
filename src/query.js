import { KV_INDEX } from '../data/index.js';

const ANSI = { reset: '\x1b[0m', blue: '\x1b[34m', dim: '\x1b[2m' };
const blue = t => `${ANSI.blue}${t}${ANSI.reset}`;
const dim = t => `${ANSI.dim}${t}${ANSI.reset}`;

// 交集，大规模情况可以用双指针提高效率
const intersect = (arrays) => {
  if (arrays.length === 0) return [];
  return arrays.reduce((a, b) => {
    const setB = new Set(b); // 小规模数据下 Set 依然最快
    return a.filter(x => setB.has(x));
  });
};

const union = (arrays) => Array.from(new Set(arrays.flat())).sort((a, b) => a - b);

function query(terms, isStrict, isAnd) {
  const matchGroups = terms.map(term => {
    const ids = [];
    if (isStrict) {
      if (KV_INDEX.m[term]) ids.push(...KV_INDEX.m[term]);
    } else {
      // 预排序后的 k 列表
      for (const kw of KV_INDEX.k) {
        if (kw.includes(term)) ids.push(...KV_INDEX.m[kw]);
      }
    }
    return Array.from(new Set(ids));
  });

  const finalIds = isAnd ? intersect(matchGroups) : union(matchGroups);
  
  // 直接从预构建的 v (Values) 数组中取值
  return finalIds.map(id => KV_INDEX.v[id]);
}

function printResults(results) {
  if (results.length === 0) return console.log('  No matches.');
  // res 结构在 build 时已经固定为 { k, v }
  results.forEach(res => console.log(`  ${blue(res.k)} ${dim(':')} ${res.v}`));
}

function main([cmd, ...terms]) {
  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(`
Usage:
  npm run query -- ${blue('COMMAND')} ...

Commands:
  ${blue('ls')}   List all entries
  ${blue('-s')}   Strict match (OR)
  ${blue('-sa')}  Strict match (AND)
  ${blue('-c')}   Contains match (OR)
  ${blue('-ca')}  Contains match (AND)
  ${blue('-h')}   Show help

Examples:
  npm run query -- -s fruit red
  npm run query -- -ca vegetable red
`);
    return;
  }

  switch (cmd) {
    case 'ls':
      printResults(KV_INDEX.v);
      break;
    case '-s':  printResults(query(terms, true, false)); break;
    case '-sa': printResults(query(terms, true, true));  break;
    case '-c':  printResults(query(terms, false, false)); break;
    case '-ca': printResults(query(terms, false, true));  break;
    default:    console.error('Unknown command');
  }
}

main(process.argv.slice(2));
