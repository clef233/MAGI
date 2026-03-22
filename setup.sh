#!/bin/bash
echo "========================================"
echo "  MAGI 安装向导"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 Python3，请先安装"
    echo "  Mac: brew install python3"
    echo "  Ubuntu: sudo apt install python3 python3-pip"
    exit 1
fi
echo "[OK] Python3 已安装"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装"
    echo "  下载地址: https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js 已安装"

# 安装后端
echo ""
echo "[1/3] 安装后端依赖..."
cd "$SCRIPT_DIR/backend"
pip3 install -e . 2>/dev/null || pip3 install fastapi "uvicorn[standard]" pydantic pydantic-settings python-multipart aiosqlite "sqlalchemy[asyncio]" httpx openai anthropic
echo "[OK] 后端依赖已安装"

# 安装前端
echo ""
echo "[2/3] 安装前端依赖..."
cd "$SCRIPT_DIR/frontend"
npm install
echo "[OK] 前端依赖已安装"

echo ""
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo ""
echo "  运行: ./start.sh"
echo "  首次使用: 打开 http://localhost:3000 点击'快速配置'"
echo ""