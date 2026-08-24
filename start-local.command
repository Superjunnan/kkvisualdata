#!/bin/zsh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLED_NODE_DIR="/Users/nanmuchuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"

cd "$PROJECT_DIR"

if command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
elif [ -x "$BUNDLED_NODE_DIR/npm" ]; then
  export PATH="$BUNDLED_NODE_DIR:$PATH"
  NPM_BIN="$BUNDLED_NODE_DIR/npm"
else
  echo "未找到 Node.js。请先安装 Node.js 22 或更新版本。"
  read -k 1 "?按任意键退出..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖..."
  "$NPM_BIN" install
fi

echo "正在启动 KK桌球可视化数据平台..."
"$NPM_BIN" run dev &
SERVER_PID=$!

for attempt in {1..40}; do
  if curl -fsS "http://localhost:3000/" >/dev/null 2>&1; then
    open "http://localhost:3000/"
    echo "页面已打开：http://localhost:3000/"
    echo "关闭此窗口或按 Control+C 可停止服务。"
    wait "$SERVER_PID"
    exit 0
  fi
  sleep 0.5
done

echo "启动超时，请检查上方错误信息。"
kill "$SERVER_PID" 2>/dev/null || true
read -k 1 "?按任意键退出..."
exit 1
