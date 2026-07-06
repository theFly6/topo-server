#!/bin/bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_DIR="$ROOT/pid"
for name in topo-server express; do
  file="$PID_DIR/$name.pid"
  if [[ -f "$file" ]]; then
    pid=$(cat "$file")
    kill "$pid" 2>/dev/null || true
    rm -f "$file"
    echo "stopped $name ($pid)"
  fi
done
