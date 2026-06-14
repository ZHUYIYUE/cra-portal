#!/usr/bin/env python3
"""
CRA Portal - 临床研究助理管理中心
完整版：支持项目CRUD、待办事项、文件管理
"""

import os
import json
import uuid
from datetime import datetime, date
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path

app = Flask(__name__)
CORS(app)

# 配置 - Render 上使用 data/ 目录存储数据
DATA_DIR = Path('data')
PROJECTS_FILE = DATA_DIR / 'projects.json'
TASKS_FILE = DATA_DIR / 'tasks.json'
CENTERS_FILE = DATA_DIR / 'centers.json'

# ========== 数据初始化 ==========

def ensure_data_dir():
    """确保数据目录存在"""
    DATA_DIR.mkdir(exist_ok=True)
    if not PROJECTS_FILE.exists():
        write_json(PROJECTS_FILE, [])
    if not TASKS_FILE.exists():
        write_json(TASKS_FILE, [])

def read_json(path):
    """读取JSON文件"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def write_json(path, data):
    """写入JSON文件"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ========== 项目 API ==========

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """获取所有项目列表"""
    projects = read_json(PROJECTS_FILE)
    # 计算每个项目的任务统计
    tasks = read_json(TASKS_FILE)
    for p in projects:
        p_tasks = [t for t in tasks if t.get('project_id') == p['id']]
        p['task_count'] = len(p_tasks)
        p['done_count'] = len([t for t in p_tasks if t.get('done')])
    return jsonify({"success": True, "projects": projects})

@app.route('/api/projects', methods=['POST'])
def create_project():
    """创建新项目"""
    data = request.json or {}
    project = {
        "id": str(uuid.uuid4())[:8],
        "name": data.get('name', '未命名项目'),
        "code": data.get('code', ''),
        "stage": data.get('stage', '进行中'),
        "center_count": int(data.get('center_count', 0)),
        "dbl_date": data.get('dbl_date', ''),
        "notes": data.get('notes', ''),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    projects = read_json(PROJECTS_FILE)
    projects.append(project)
    write_json(PROJECTS_FILE, projects)
    
    return jsonify({"success": True, "project": project})

@app.route('/api/project/<project_id>', methods=['GET'])
def get_project(project_id):
    """获取单个项目详情"""
    projects = read_json(PROJECTS_FILE)
    project = next((p for p in projects if p['id'] == project_id), None)
    if not project:
        return jsonify({"success": False, "error": "项目不存在"}), 404
    
    # 获取关联的待办事项
    tasks = read_json(TASKS_FILE)
    project_tasks = [t for t in tasks if t.get('project_id') == project_id]
    project['tasks'] = project_tasks
    
    return jsonify({"success": True, **project})

@app.route('/api/project/<project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目信息"""
    projects = read_json(PROJECTS_FILE)
    idx = next((i for i, p in enumerate(projects) if p['id'] == project_id), None)
    if idx is None:
        return jsonify({"success": False, "error": "项目不存在"}), 404
    
    data = request.json or {}
    project = projects[idx]
    
    # 只更新允许的字段
    for field in ['name', 'code', 'stage', 'center_count', 'dbl_date', 'notes']:
        if field in data:
            project[field] = data[field]
    
    project['updated_at'] = datetime.now().isoformat()
    projects[idx] = project
    write_json(PROJECTS_FILE, projects)
    
    return jsonify({"success": True, "project": project})

@app.route('/api/project/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    projects = read_json(PROJECTS_FILE)
    projects = [p for p in projects if p['id'] != project_id]
    write_json(PROJECTS_FILE, projects)
    
    # 同时删除关联的待办事项和中心
    tasks = read_json(TASKS_FILE)
    tasks = [t for t in tasks if t.get('project_id') != project_id]
    write_json(TASKS_FILE, tasks)
    
    centers = read_json(CENTERS_FILE)
    centers = [c for c in centers if c.get('project_id') != project_id]
    write_json(CENTERS_FILE, centers)
    
    return jsonify({"success": True})

# ========== 待办事项 API ==========

@app.route('/api/tasks', methods=['GET'])
def get_all_tasks():
    """获取所有待办事项（可按项目筛选）"""
    tasks = read_json(TASKS_FILE)
    project_id = request.args.get('project_id')
    
    if project_id:
        tasks = [t for t in tasks if t.get('project_id') == project_id]
    
    # 补充中心名称
    centers = read_json(CENTERS_FILE)
    center_map = {c['id']: c.get('code', '') + ' ' + c.get('name', '') for c in centers}
    for t in tasks:
        t['center_name'] = center_map.get(t.get('center_id'), '')
    
    # 按优先级排序：高 > 中 > 低
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    tasks.sort(key=lambda t: (not t.get('done'), priority_order.get(t.get('priority', 'medium'), 1)))
    
    return jsonify({"success": True, "tasks": tasks})

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """创建新待办事项"""
    data = request.json or {}
    task = {
        "id": str(uuid.uuid4())[:8],
        "title": data.get('title', '未命名任务'),
        "project_id": data.get('project_id', ''),
        "center_id": data.get('center_id', ''),
        "priority": data.get('priority', 'medium'),
        "ability_type": data.get('ability_type', 'execution'),
        "due_date": data.get('due_date', ''),
        "done": False,
        "created_at": datetime.now().isoformat()
    }
    
    tasks = read_json(TASKS_FILE)
    tasks.append(task)
    write_json(TASKS_FILE, tasks)
    
    return jsonify({"success": True, "task": task})

@app.route('/api/task/<task_id>', methods=['PUT'])
def update_task(task_id):
    """更新待办事项"""
    tasks = read_json(TASKS_FILE)
    idx = next((i for i, t in enumerate(tasks) if t['id'] == task_id), None)
    if idx is None:
        return jsonify({"success": False, "error": "待办事项不存在"}), 404
    
    data = request.json or {}
    task = tasks[idx]
    
    for field in ['title', 'project_id', 'center_id', 'priority', 'ability_type', 'due_date', 'done']:
        if field in data:
            task[field] = data[field]
    
    tasks[idx] = task
    write_json(TASKS_FILE, tasks)
    
    return jsonify({"success": True, "task": task})

@app.route('/api/task/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除待办事项"""
    tasks = read_json(TASKS_FILE)
    tasks = [t for t in tasks if t['id'] != task_id]
    write_json(TASKS_FILE, tasks)
    
    return jsonify({"success": True})



# ========== 中心 API ==========

@app.route('/api/centers', methods=['GET'])
def get_centers():
    """获取中心列表（可按项目筛选）"""
    centers = read_json(CENTERS_FILE)
    project_id = request.args.get('project_id')
    
    if project_id:
        centers = [c for c in centers if c.get('project_id') == project_id]
    
    return jsonify({"success": True, "centers": centers})

@app.route('/api/centers', methods=['POST'])
def create_center():
    """创建新中心"""
    data = request.json or {}
    # 支持前端传的 center_code / center_name，也接受后端格式 code / name
    center = {
        "id": str(uuid.uuid4())[:8],
        "project_id": data.get('project_id', ''),
        "code": data.get('code') or data.get('center_code') or '',
        "name": data.get('name') or data.get('center_name') or '未命名中心',
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    centers = read_json(CENTERS_FILE)
    centers.append(center)
    write_json(CENTERS_FILE, centers)
    
    return jsonify({"success": True, "center": center})

@app.route('/api/center/<center_id>', methods=['PUT'])
def update_center(center_id):
    """更新中心信息"""
    centers = read_json(CENTERS_FILE)
    idx = next((i for i, c in enumerate(centers) if c['id'] == center_id), None)
    if idx is None:
        return jsonify({"success": False, "error": "中心不存在"}), 404
    
    data = request.json or {}
    center = centers[idx]
    
    for field in ['code', 'name', 'pi', 'department', 'notes', 'milestones']:
        if field in data:
            center[field] = data[field]
    
    center['updated_at'] = datetime.now().isoformat()
    centers[idx] = center
    write_json(CENTERS_FILE, centers)
    
    return jsonify({"success": True, "center": center})

@app.route('/api/center/<center_id>/milestone/<int:milestone_idx>', methods=['PUT'])
def toggle_milestone(center_id, milestone_idx):
    """切换单个里程碑完成状态"""
    centers = read_json(CENTERS_FILE)
    idx = next((i for i, c in enumerate(centers) if c['id'] == center_id), None)
    if idx is None:
        return jsonify({"success": False, "error": "中心不存在"}), 404
    
    center = centers[idx]
    milestones = center.get('milestones', [])
    if milestone_idx < 0 or milestone_idx >= len(milestones):
        return jsonify({"success": False, "error": "里程碑索引无效"}), 400
    
    data = request.json or {}
    milestones[milestone_idx]['done'] = data.get('done', not milestones[milestone_idx].get('done', False))
    if data.get('actual_date'):
        milestones[milestone_idx]['actual_date'] = data['actual_date']
    center['milestones'] = milestones
    center['updated_at'] = datetime.now().isoformat()
    centers[idx] = center
    write_json(CENTERS_FILE, centers)
    
    done_count = sum(1 for m in milestones if m.get('done'))
    return jsonify({"success": True, "milestone": milestones[milestone_idx], "progress": {"done": done_count, "total": len(milestones)}})

@app.route('/api/center/<center_id>', methods=['DELETE'])
def delete_center(center_id):
    """删除中心"""
    centers = read_json(CENTERS_FILE)
    centers = [c for c in centers if c['id'] != center_id]
    write_json(CENTERS_FILE, centers)
    
    # 同时删除关联的任务
    tasks = read_json(TASKS_FILE)
    tasks = [t for t in tasks if t.get('center_id') != center_id]
    write_json(TASKS_FILE, tasks)
    
    return jsonify({"success": True})

@app.route('/api/status', methods=['GET'])
def get_status():
    status_file = DATA_DIR / 'status.json'
    return jsonify(read_json(status_file) or {"energy": "medium", "calmness": "medium"})

@app.route('/api/status', methods=['POST'])
def set_status():
    data = request.json or {}
    status = {
        "energy": data.get('energy', 'medium'),
        "calmness": data.get('calmness', 'medium'),
        "updated_at": datetime.now().isoformat()
    }
    write_json(DATA_DIR / 'status.json', status)
    return jsonify({"success": True, "status": status})

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    status = read_json(DATA_DIR / 'status.json') or {"energy": "medium", "calmness": "medium"}
    tasks = read_json(TASKS_FILE)
    pending = [t for t in tasks if not t.get('done')]
    energy = status.get('energy', 'medium')
    calmness = status.get('calmness', 'medium')
    energy_calm_map = {
        ('high', 'high'): ['deep_focus'],
        ('high', 'medium'): ['deep_focus', 'communication'],
        ('high', 'low'): ['communication'],
        ('medium', 'high'): ['planning', 'deep_focus'],
        ('medium', 'medium'): ['planning', 'execution', 'communication'],
        ('medium', 'low'): ['execution'],
        ('low', 'high'): ['learning_review', 'planning'],
        ('low', 'medium'): ['execution', 'learning_review'],
        ('low', 'low'): [],
    }
    recommended_types = energy_calm_map.get((energy, calmness), ['execution'])
    recommended = [t for t in pending if t.get('ability_type') in recommended_types]
    other = [t for t in pending if t.get('ability_type') not in recommended_types]
    return jsonify({
        "success": True,
        "status": status,
        "recommended_types": recommended_types,
        "recommended_tasks": recommended,
        "other_tasks": other,
        "ability_labels": {
            "deep_focus": "深度专注",
            "communication": "沟通协调",
            "planning": "规划整理",
            "execution": "执行归档",
            "learning_review": "学习回顾"
        }
    })

# ========== 统计 API ==========

@app.route('/api/stats')
def get_stats():
    """获取统计数据"""
    projects = read_json(PROJECTS_FILE)
    tasks = read_json(TASKS_FILE)
    
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.get('stage') == '进行中'])
    total_tasks = len(tasks)
    done_tasks = len([t for t in tasks if t.get('done')])
    pending_tasks = total_tasks - done_tasks
    
    high_priority = len([t for t in tasks if not t.get('done') and t.get('priority') == 'high'])
    
    # 即将到期的任务（7天内）
    today = date.today()
    due_soon = 0
    for t in tasks:
        if not t.get('done') and t.get('due_date'):
            try:
                due = date.fromisoformat(t['due_date'])
                if (due - today).days <= 7 and (due - today).days >= 0:
                    due_soon += 1
            except:
                pass
    
    return jsonify({
        "success": True,
        "stats": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "pending_tasks": pending_tasks,
            "high_priority": high_priority,
            "due_soon": due_soon
        }
    })

# ========== 页面路由 ==========

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

# ========== 主程序 ==========

if __name__ == '__main__':
    ensure_data_dir()
    print("=" * 50)
    print("CRA Portal 启动中...")
    print(f"数据目录: {DATA_DIR.absolute()}")
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
