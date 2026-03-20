#!/usr/bin/env python3
"""
将项目代码合并为一个 Markdown 文档
用于发送给 AI 进行分析
"""

import os
import argparse
from pathlib import Path
from datetime import datetime

# 默认排除的目录
EXCLUDE_DIRS = {
    'node_modules', '.git', '__pycache__', '.next', 'dist', 'build',
    '.venv', 'venv', 'env', '.env', 'egg-info', '.mypy_cache',
    '.pytest_cache', '.idea', '.vscode', 'coverage', '.nyc_output'
}

# 默认排除的文件
EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', '.env', '.env.local', '.env.development', '.env.production'
}

# 要包含的文件扩展名
INCLUDE_EXTENSIONS = {
    # Python
    '.py', '.pyx', '.pyi',
    # JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    # Web
    '.html', '.css', '.scss', '.sass', '.less',
    # Config
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    # Data
    '.xml', '.sql',
    # Docs (optional)
    '.md',
    # Shell
    '.sh', '.bat', '.cmd', '.ps1',
    # Other
    '.vue', '.svelte', '.astro'
}

# 特殊文件名（无扩展名也要包含）
SPECIAL_FILES = {
    'Dockerfile', 'docker-compose', 'Makefile', 'Procfile',
    '.gitignore', '.dockerignore', '.editorconfig', '.prettierrc',
    '.eslintrc', '.babelrc', 'tsconfig', 'jsconfig'
}


def should_include(path: Path, include_docs: bool = False, include_all: bool = False) -> bool:
    """判断是否应该包含该文件"""
    name = path.name

    # 排除特定文件
    if name in EXCLUDE_FILES:
        return False

    # 检查是否在排除目录中
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return False

    # 如果是 include_all 模式，包含所有文本文件
    if include_all:
        # 排除二进制文件
        binary_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
                           '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4',
                           '.pdf', '.zip', '.tar', '.gz'}
        return path.suffix.lower() not in binary_extensions

    # 检查扩展名
    if path.suffix.lower() in INCLUDE_EXTENSIONS:
        # 如果是 .md 文件且不包含文档，则排除
        if path.suffix.lower() == '.md' and not include_docs:
            return False
        return True

    # 检查特殊文件名
    for special in SPECIAL_FILES:
        if name.startswith(special) or name == special:
            return True

    return False


def get_language(path: Path) -> str:
    """根据文件扩展名获取语法高亮语言"""
    ext_map = {
        '.py': 'python',
        '.pyx': 'python',
        '.pyi': 'python',
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.toml': 'toml',
        '.ini': 'ini',
        '.cfg': 'ini',
        '.xml': 'xml',
        '.sql': 'sql',
        '.md': 'markdown',
        '.sh': 'bash',
        '.bat': 'batch',
        '.cmd': 'batch',
        '.ps1': 'powershell',
        '.vue': 'vue',
        '.svelte': 'svelte',
        '.astro': 'astro',
    }
    return ext_map.get(path.suffix.lower(), '')


def merge_project(root_dir: str, output_file: str,
                  include_docs: bool = False,
                  include_all: bool = False,
                  max_file_size: int = 100000) -> None:
    """合并项目代码"""

    root = Path(root_dir).resolve()

    # 收集所有要包含的文件
    files = []
    for path in root.rglob('*'):
        if path.is_file() and should_include(path, include_docs, include_all):
            # 检查文件大小
            try:
                if path.stat().st_size <= max_file_size:
                    files.append(path)
            except OSError:
                continue

    # 排序文件
    files.sort()

    # 生成 Markdown
    lines = []
    lines.append(f"# Project: {root.name}")
    lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Root: {root}")
    lines.append(f"Files: {len(files)}")
    lines.append("\n---\n")

    # 目录结构
    lines.append("## Directory Structure\n")
    lines.append("```\n")

    # 生成简化的目录树
    dir_tree = set()
    for f in files:
        try:
            rel = f.relative_to(root)
            for i, part in enumerate(rel.parts[:-1]):
                dir_tree.add(tuple(rel.parts[:i+1]))
        except ValueError:
            continue

    for d in sorted(dir_tree):
        indent = "  " * (len(d) - 1)
        lines.append(f"{indent}{d[-1]}/")

    for f in files:
        try:
            rel = f.relative_to(root)
            depth = len(rel.parts) - 1
            indent = "  " * depth
            lines.append(f"{indent}{f.name}")
        except ValueError:
            continue

    lines.append("```\n")
    lines.append("\n---\n")

    # 文件内容
    lines.append("## Files\n")

    for file_path in files:
        try:
            rel_path = file_path.relative_to(root)
        except ValueError:
            continue

        lang = get_language(file_path)

        lines.append(f"\n### {rel_path}\n")
        lines.append(f"```{lang}")

        try:
            content = file_path.read_text(encoding='utf-8', errors='replace')
            lines.append(content)
        except Exception as e:
            lines.append(f"[Error reading file: {e}]")

        lines.append("```\n")

    # 写入输出文件
    output = Path(output_file)
    output.write_text('\n'.join(lines), encoding='utf-8')

    print(f"[OK] Done!")
    print(f"   Files: {len(files)}")
    print(f"   Output: {output.resolve()}")
    print(f"   Size: {output.stat().st_size / 1024:.1f} KB")


def main():
    parser = argparse.ArgumentParser(
        description='将项目代码合并为一个 Markdown 文档'
    )
    parser.add_argument(
        'path',
        nargs='?',
        default='.',
        help='项目根目录 (默认: 当前目录)'
    )
    parser.add_argument(
        '-o', '--output',
        default='project-code.md',
        help='输出文件名 (默认: project-code.md)'
    )
    parser.add_argument(
        '-d', '--docs',
        action='store_true',
        help='包含 .md 文档文件'
    )
    parser.add_argument(
        '-a', '--all',
        action='store_true',
        help='包含所有文本文件 (不仅仅是代码)'
    )
    parser.add_argument(
        '-s', '--max-size',
        type=int,
        default=100000,
        help='单个文件最大字节数 (默认: 100000)'
    )

    args = parser.parse_args()

    merge_project(
        args.path,
        args.output,
        include_docs=args.docs,
        include_all=args.all,
        max_file_size=args.max_size
    )


if __name__ == '__main__':
    main()