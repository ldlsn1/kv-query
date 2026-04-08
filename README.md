# kv_query
轻量、零依赖的 Node.js ESM 键值检索工具，基于预构建倒排索引实现高效查询，适合个人小规模数据（数千条内）使用。

## 目录结构
kv_query/
├── data/
│   ├── raw.js    # 手动维护的原始 KV 数据源
│   └── index.js  # build 自动生成的高效索引文件
├── src/
│   ├── build.js  # 索引构建脚本
│   └── query.js  # 命令行查询脚本
├── package.json
└── README.md

## 数据格式（data/raw.js）
- 关键词用 " | " 严格分隔，不做 trim、不额外处理非常规空格
- 格式："key1 | key2 | ...": "value"

```
export const KV_DATA = {
  "apple | fruit | red": "A sweet red fruit",
  "banana | fruit | yellow": "A long yellow fruit",
  "carrot | vegetable | orange": "A crunchy orange root",
  "tomato | fruit | red | vegetable": "Botanically a fruit, culinarily a vegetable",
  "grape | fruit | purple": "Small round fruit for wine"
};
```

## 工作流程
1. 编辑 data/raw.js 维护自己的 KV 数据
2. 运行 build 构建倒排索引（关键词 → 数据ID）
3. 用 query 命令行快速检索

## 常用命令
```
# 构建索引
npm run build

# 清空索引
npm run clean

# 列出所有数据
npm run query -- ls

# 严格匹配（OR 任一命中）
npm run query -- -s key1 key2

# 严格匹配（AND 全部命中）
npm run query -- -sa key1 key2

# 模糊包含（OR 任一包含）
npm run query -- -c key1 key2

# 模糊包含（AND 全部包含）
npm run query -- -ca key1 key2

# 查看帮助
npm run query -- -h
```

## 查询逻辑
- OR（-s / -c）：取各关键词结果并集，自动去重
- AND（-sa / -ca）：取各关键词结果交集，必须全部命中
- s = strict 严格匹配：关键词与索引词完全相等
- c = contains 模糊包含：索引词包含即匹配
