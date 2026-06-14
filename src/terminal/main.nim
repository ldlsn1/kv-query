import std/[os, strformat]
import ../../data/raw
import index
import query

# 编译时构建索引
const idx = buildIndex(KV_DATA)

# ANSI
const
  colorBlue = "\e[34m"
  colorDim = "\e[2m"
  colorReset = "\e[0m"

proc printResults(results: seq[KVEntry]) =
  if results.len == 0:
    echo "  No matches."
    return
  for r in results:
    echo &"  {colorBlue}{r.compositeKey}{colorReset} {colorDim}:{colorReset} {r.value}"

proc printHelp() =
  echo &"Usage: kv_query {colorBlue}<command>{colorReset} [terms]"
  echo ""
  echo "Commands:"
  echo &"  {colorBlue}ls{colorReset}   List all"
  echo &"  {colorBlue}-s{colorReset}   Strict match (OR)"
  echo &"  {colorBlue}-sa{colorReset}  Strict match (AND)"
  echo &"  {colorBlue}-c{colorReset}   Contains match (OR)"
  echo &"  {colorBlue}-ca{colorReset}  Contains match (AND)"
  echo &"  {colorBlue}-h{colorReset}   Show help"

proc main() =
  let args = commandLineParams()

  if args.len < 1 or args[0] == "-h":
    printHelp()
    return

  case args[0]
  of "ls":
    printResults(idx.v)
  of "-s":
    printResults(query(idx, args[1..^1], strict = true, andMode = false))
  of "-sa":
    printResults(query(idx, args[1..^1], strict = true, andMode = true))
  of "-c":
    printResults(query(idx, args[1..^1], strict = false, andMode = false))
  of "-ca":
    printResults(query(idx, args[1..^1], strict = false, andMode = true))
  else:
    echo "Unknown command: ", args[0]
    printHelp()

when isMainModule:
  main()
  