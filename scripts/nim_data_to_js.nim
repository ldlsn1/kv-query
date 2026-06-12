import std/json
import ../data/raw

let jsContent = "export const KV_DATA = " & $(%KV_DATA) & ";"
writeFile("./data/raw.js", jsContent)
echo "✓ converted to js"
