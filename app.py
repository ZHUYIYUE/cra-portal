#!/usr/bin/env python3
"""
CRA Portal - 临床研究助理管理中心
一个可视化的CRA工作管理平台
"""

import os
import json
import markdown
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import re

app = Flask(__name__)
CORS(app)

# 配置
WORKSPACE = Path.home() / ".qclaw/workspace"
WORK_DIR = WORKSPACE / "work"
PROJECTS_DIR = WORK_DIR / "projects"
FILES_DIR = WORK_DIR / "files"

# ========== 工具函数 ==========

def read_markdown_file(file_path):
    """读取Markdown文件并转换为HTML"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        html = markdown.markdown(content, extensions=['extra', 'nl2br'])
        return {"success": True, "content": content, "html": html}
    except Exception as e:
        return {"success": False, "error": str(e)}

def write_markdown_file(file_path, content):
    """写入Markdown文件"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def parse_project_file(file_path):
    """解析项目Markdown文件，提取结构化数据"""
    result = read_markdown_file(file_path)
    if not result["success"]:
        return result
    
    content = result["content"]
    data = {
        "raw_content": content,
        "project_id": "",
        "project_name": "",
        "centers": [],
        "tasks": []
    }
    
    # 提取项目编号
    match = re.search(r'\*\*项目编号\*\*:\s*(.+)', content)
    if match:
        data["project_id"] = match.group(1).strip()
    
    # 提取项目全称
    match = re.search(r'\*\*项目全称\*\*:\s*(.+)', content)
    if match:
        data["project_name"] = match.group(1).strip()
    
    # 提取中心信息（简单解析）
    center_pattern = r'###\s*0(\d)\s*中心.*?\*\*状态\*\*:\s*(.+?)(?=\n|$)'
    for match in re.finditer(center_pattern, content, re.DOTALL):
        center_id = match.group(1)
        status = match.group(2).strip()
        data["centers"].append({
            "id": f"0{center_id}",
            "status": status
        })
    
    return {"success": True, **data}

# ========== 路由 ==========

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/api/projects')
def get_projects():
    """获取所有项目列表"""
    projects = []
    if PROJECTS_DIR.exists():
        for f in PROJECTS_DIR.glob("*.md"):
            projects.append({
                "id": f.stem,
                "name": f.stem
            })
    return jsonify({"success": True, "projects": projects})

@app.route('/api/project/<project_id>')
def get_project(project_id):
    """获取单个项目详情"""
    file_path = PROJECTS_DIR / f"{project_id}.md"
    if not file_path.exists():
        return jsonify({"success": False, "error": "项目不存在"}), 404
    
    data = parse_project_file(file_path)
    return jsonify(data)

@app.route('/api/project/<project_id>/update', methods=['POST'])
def update_project(project_id):
    """更新项目文件"""
    file_path = PROJECTS_DIR / f"{project_id}.md"
    if not file_path.exists():
        return jsonify({"success": False, "error": "项目不存在"}), 404
    
    data = request.json
    content = data.get("content", "")
    
    result = write_markdown_file(file_path, content)
    return jsonify(result)

@app.route('/api/files/<project_id>')
def get_files(project_id):
    """获取项目文件列表"""
    project_files_dir = FILES_DIR / project_id
    files = []
    
    if project_files_dir.exists():
        for f in project_files_dir.rglob("*"):
            if f.is_file():
                rel_path = f.relative_to(project_files_dir)
                files.append({
                    "name": f.name,
                    "path": str(rel_path),
                    "size": f.stat().st_size
                })
    
    return jsonify({"success": True, "files": files})

@app.route('/api/files/<project_id>/<path:file_path>')
def download_file(project_id, file_path):
    """下载文件"""
    return send_from_directory(FILES_DIR / project_id, file_path)

@app.route('/api/tasks')
def get_all_tasks():
    """获取所有待办事项"""
    tasks = []
    if PROJECTS_DIR.exists():
        for f in PROJECTS_DIR.glob("*.md"):
            result = parse_project_file(f)
            if result["success"] and "tasks" in result:
                for task in result["tasks"]:
                    task["project"] = f.stem
                    tasks.append(task)
    return jsonify({"success": True, "tasks": tasks})

# ========== 主程序 ==========

if __name__ == '__main__':
    print("="*50)
    print("CRA Portal 启动中...")
    print(f"工作目录: {WORK_DIR}")
    print("访问地址: <ADDRESS_REDACTED>")
    print("="*50)
    app.run(host='0.0.0.0', port=8080, debug=True)
