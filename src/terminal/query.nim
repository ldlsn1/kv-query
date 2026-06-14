import std/[strutils, sets, tables]
import index

#! 运行时查询逻辑

# 包含匹配：线性扫描
func findContainsIds*(idx: KVIndex; term: string): seq[int] =
  var seen = initHashSet[int]()
  for kw in idx.k:
    if kw.contains(term):
      for id in idx.map[kw]:
        if id notin seen:
          seen.incl(id)
          result.add(id)

# 交集 (AND)
func intersect*(sets: seq[seq[int]]): seq[int] =
  if sets.len == 0: return @[]
  if sets.len == 1: return sets[0]
  var base = sets[0]
  for i in 1 ..< sets.len:
    var lookup = initHashSet[int]()  # 复用 HashSet
    for x in sets[i]:
      lookup.incl(x)
    var tmp: seq[int]
    for x in base:
      if x in lookup:
        tmp.add(x)
    base = tmp
  return base

# 并集 (OR)
func union*(sets: seq[seq[int]]): seq[int] =
  var combined = initHashSet[int]()
  for s in sets:
    for x in s:
      combined.incl(x)
  result = newSeqOfCap[int](combined.card)  # 预分配容量
  for x in combined:
    result.add(x)

# 查询接口
func query*(idx: KVIndex; terms: seq[string]; strict: bool; andMode: bool): seq[KVEntry] =
  var groups: seq[seq[int]] = @[]
  for term in terms:
    if strict:
      groups.add(idx.map.getOrDefault(term, @[]))
    else:
      groups.add(findContainsIds(idx, term))

  let final =
    if andMode: intersect(groups)
    else: union(groups)

  # 预分配结果切片
  result = newSeqOfCap[KVEntry](final.len)
  for id in final:
    if id >= 0 and id < idx.v.len:
      result.add(idx.v[id])
