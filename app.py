#!/usr/bin/env python3
"""
CRA Portal - 临床研究助理管理中心
完整版：支持项目CRUD、待办事项、文件管理
"""

import os
import json
import uuid
import subprocess
import urllib.request
import urllib.parse
import base64
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
STARTUP_TASKS_FILE = DATA_DIR / 'startup_tasks.json'
STARTUP_LOGS_FILE = DATA_DIR / 'startup_logs.json'

# ========== 数据初始化 ==========

def pull_file_from_github(rel_path, local_path):
    """启动时从 GitHub 拉取数据文件到本地"""
    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        return False
    repo = 'ZHUYIYUE/cra-portal'
    url = f'https://api.github.com/repos/{repo}/contents/{rel_path}?ref=main'
    req = urllib.request.Request(url, headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            info = json.loads(resp.read())
            import base64
            content = base64.b64decode(info['content']).decode('utf-8')
            local_path.parent.mkdir(exist_ok=True)
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'[GitHub Pull] {rel_path} 已从 GitHub 拉取 ({len(content)} bytes)')
            return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f'[GitHub Pull] {rel_path} 在 GitHub 上不存在，跳过')
        else:
            print(f'[GitHub Pull] {rel_path} 拉取失败: {e}')
    except Exception as e:
        print(f'[GitHub Pull] {rel_path} 异常: {e}')
    return False

def ensure_data_dir():
    """确保数据目录存在，并尝试从 GitHub 拉取已有数据"""
    DATA_DIR.mkdir(exist_ok=True)
    
    # 启动时尝试从 GitHub 拉取数据
    print('[GitHub Pull] 尝试从 GitHub 拉取数据文件...')
    pull_file_from_github('data/projects.json', PROJECTS_FILE)
    pull_file_from_github('data/tasks.json', TASKS_FILE)
    pull_file_from_github('data/centers.json', CENTERS_FILE)
    pull_file_from_github('data/startup_tasks.json', STARTUP_TASKS_FILE)
    pull_file_from_github('data/startup_logs.json', STARTUP_LOGS_FILE)
    
    # 仍然拉取失败的文件初始化为空数组
    if not PROJECTS_FILE.exists():
        write_json(PROJECTS_FILE, [])
    if not TASKS_FILE.exists():
        write_json(TASKS_FILE, [])
    if not CENTERS_FILE.exists():
        write_json(CENTERS_FILE, [])
    if not STARTUP_TASKS_FILE.exists():
        write_json(STARTUP_TASKS_FILE, [])
    if not STARTUP_LOGS_FILE.exists():
        write_json(STARTUP_LOGS_FILE, [])

def read_json(path):
    """读取JSON文件"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def write_json(path, data):
    """写入JSON文件，并同步到 GitHub"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # 异步同步到 GitHub（最佳effort，失败不阻塞）
    try:
        sync_to_github(path)
    except Exception as e:
        print(f"[GitHub Sync] 同步失败（非阻塞）: {e}")

def sync_to_github(path):
    """将本地 data 文件同步到 GitHub 仓库"""
    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        return  # 没有 token 就跳过
    
    repo = 'ZHUYIYUE/cra-portal'  # GitHub 仓库
    branch = 'main'
    
    # 计算文件在仓库中的相对路径
    rel_path = str(path)
    
    # 读取文件内容并 base64 编码
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content_b64 = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    
    # 先获取文件当前的 SHA（GitHub API 需要）
    get_url = f'https://api.github.com/repos/{repo}/contents/{rel_path}?ref={branch}'
    get_req = urllib.request.Request(get_url, headers={
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    })
    try:
        with urllib.request.urlopen(get_req, timeout=10) as resp:
            file_info = json.loads(resp.read())
            file_sha = file_info['sha']
    except urllib.error.HTTPError as e:
        if e.code == 404:
            file_sha = None  # 文件不存在，需要创建
        else:
            raise
    
    # 提交内容
    put_data = {
        'message': f'auto-sync: update {rel_path}',
        'content': content_b64,
        'branch': branch,
        'sha': file_sha
    }
    import http.client
    put_url = f'https://api.github.com/repos/{repo}/contents/{rel_path}'
    put_req = urllib.request.Request(put_url, 
        data=json.dumps(put_data).encode('utf-8'),
        headers={
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        method='PUT'
    )
    with urllib.request.urlopen(put_req, timeout=10) as resp:
        print(f"[GitHub Sync] {rel_path} 同步成功")

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
    current = read_json(DATA_DIR / 'status.json') or {}
    status = {
        "energy": data.get('energy', current.get('energy', 'medium')),
        "calmness": data.get('calmness', current.get('calmness', 'medium')),
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
    # 推荐逻辑说明：
    # - deep_focus(深度专注): 写方案/审文件/复杂分析，需精力+平静都高
    # - communication(沟通协调): 打电话/催进度/邮件沟通，需精力高
    # - planning(规划整理): 理里程碑/排访视计划，需平静度高
    # - execution(执行归档): 填表/归档/跑流程，两个要求都不高
    # 推荐度排名：1=最推荐，2=次推荐，3=可做但不最佳
    # 高+高：深度专注效率最高，其次是规划
    # 高+中：沟通协作最顺，深度专注也不错
    # 高+低：执行归档最稳，沟通协作也可
    # 中+高：规划整理最合适，学习回顾也不错
    # 中+中：执行归档最稳，沟通协作也可
    # 中+低：执行归档最稳，学习回顾也可
    # 低+高：学习回顾最合适，规划整理也可
    # 低+中：执行归档最稳，学习回顾也可
    # 低+低：都不推荐，建议休息
    energy_calm_map = {
        ('high', 'high'):   {'deep_focus': 1, 'planning': 2, 'communication': 3, 'execution': 3, 'learning_review': 3},
        ('high', 'medium'): {'communication': 1, 'deep_focus': 2, 'execution': 3, 'planning': 3, 'learning_review': 3},
        ('high', 'low'):    {'execution': 1, 'communication': 2, 'planning': 3, 'learning_review': 3},
        ('medium', 'high'): {'planning': 1, 'learning_review': 2, 'deep_focus': 3, 'communication': 3, 'execution': 3},
        ('medium', 'medium'): {'execution': 1, 'communication': 2, 'planning': 3, 'deep_focus': 3, 'learning_review': 3},
        ('medium', 'low'): {'execution': 1, 'learning_review': 2, 'communication': 3},
        ('low', 'high'):   {'learning_review': 1, 'planning': 2, 'execution': 3},
        ('low', 'medium'): {'execution': 1, 'learning_review': 2, 'planning': 3},
        ('low', 'low'):    {},
    }
    # 转成按推荐度排序的列表
    rank_map = energy_calm_map.get((energy, calmness), {'execution': 1})
    recommended_types = sorted(rank_map.keys(), key=lambda x: rank_map[x])
    
    # 分离推荐和其他任务
    recommended = [t for t in pending if t.get('ability_type') in rank_map]
    other = [t for t in pending if t.get('ability_type') not in rank_map]
    
    # 给每个任务加上推荐度排名
    for t in recommended:
        t['recommend_rank'] = rank_map.get(t.get('ability_type'), None)
    for t in other:
        t['recommend_rank'] = rank_map.get(t.get('ability_type'), None)
    return jsonify({
        "success": True,
        "status": status,
        "recommended_types": recommended_types,
        "recommend_ranks": rank_map,
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

# ========== 启动任务 API ==========

@app.route('/api/startup-tasks', methods=['GET'])
def get_startup_tasks():
    """获取所有启动任务"""
    tasks = read_json(STARTUP_TASKS_FILE)
    return jsonify({"success": True, "tasks": tasks})

@app.route('/api/startup-tasks', methods=['POST'])
def create_startup_task():
    """创建启动任务"""
    data = request.json or {}
    task = {
        "id": str(uuid.uuid4())[:8],
        "name": data.get('name', '未命名启动任务'),
        "description": data.get('description', ''),
        "created_at": datetime.now().isoformat()
    }
    tasks = read_json(STARTUP_TASKS_FILE)
    tasks.append(task)
    write_json(STARTUP_TASKS_FILE, tasks)
    return jsonify({"success": True, "task": task})

@app.route('/api/startup-tasks/<task_id>', methods=['PUT'])
def update_startup_task(task_id):
    """更新启动任务"""
    tasks = read_json(STARTUP_TASKS_FILE)
    idx = next((i for i, t in enumerate(tasks) if t['id'] == task_id), None)
    if idx is None:
        return jsonify({"success": False, "error": "启动任务不存在"}), 404
    data = request.json or {}
    for field in ['name', 'description']:
        if field in data:
            tasks[idx][field] = data[field]
    write_json(STARTUP_TASKS_FILE, tasks)
    return jsonify({"success": True, "task": tasks[idx]})

@app.route('/api/startup-tasks/<task_id>', methods=['DELETE'])
def delete_startup_task(task_id):
    """删除启动任务"""
    tasks = read_json(STARTUP_TASKS_FILE)
    tasks = [t for t in tasks if t['id'] != task_id]
    write_json(STARTUP_TASKS_FILE, tasks)
    return jsonify({"success": True})

@app.route('/api/startup-logs', methods=['GET'])
def get_startup_logs():
    """获取执行日志"""
    logs = read_json(STARTUP_LOGS_FILE)
    # 按时间倒序
    logs.sort(key=lambda x: x.get('executed_at', ''), reverse=True)
    return jsonify({"success": True, "logs": logs})

@app.route('/api/startup-logs', methods=['POST'])
def create_startup_log():
    """记录一次启动任务执行"""
    data = request.json or {}
    log = {
        "id": str(uuid.uuid4())[:8],
        "startup_task_id": data.get('startup_task_id', ''),
        "startup_task_name": data.get('startup_task_name', ''),
        "target_task_id": data.get('target_task_id', ''),
        "target_task_name": data.get('target_task_name', ''),
        "calmness_before": data.get('calmness_before', 2),
        "calmness_after": data.get('calmness_after', 2),
        "duration_minutes": data.get('duration_minutes', 0),
        "notes": data.get('notes', ''),
        "executed_at": datetime.now().isoformat()
    }
    logs = read_json(STARTUP_LOGS_FILE)
    logs.append(log)
    write_json(STARTUP_LOGS_FILE, logs)
    return jsonify({"success": True, "log": log})

@app.route('/api/startup-stats', methods=['GET'])
def get_startup_stats():
    """统计分析：哪些启动任务效果最好"""
    logs = read_json(STARTUP_LOGS_FILE)
    tasks = read_json(STARTUP_TASKS_FILE)
    
    if not logs:
        return jsonify({"success": True, "stats": []})
    
    # 按启动任务分组统计
    task_stats = {}
    for log in logs:
        task_id = log.get('startup_task_id')
        if not task_id:
            continue
        if task_id not in task_stats:
            task_stats[task_id] = {
                'task_id': task_id,
                'task_name': log.get('startup_task_name', '未知'),
                'count': 0,
                'total_calmness_before': 0,
                'total_calmness_after': 0,
                'total_duration': 0,
                'calmness_improvement': []
            }
        task_stats[task_id]['count'] += 1
        task_stats[task_id]['total_calmness_before'] += log.get('calmness_before', 2)
        task_stats[task_id]['total_calmness_after'] += log.get('calmness_after', 2)
        task_stats[task_id]['total_duration'] += log.get('duration_minutes', 0)
        improvement = log.get('calmness_after', 2) - log.get('calmness_before', 2)
        task_stats[task_id]['calmness_improvement'].append(improvement)
    
    # 计算平均值和改善率
    result = []
    for task_id, stats in task_stats.items():
        avg_before = stats['total_calmness_before'] / stats['count']
        avg_after = stats['total_calmness_after'] / stats['count']
        avg_improvement = sum(stats['calmness_improvement']) / stats['count']
        avg_duration = stats['total_duration'] / stats['count']
        improvement_rate = len([x for x in stats['calmness_improvement'] if x > 0]) / stats['count'] * 100
        
        result.append({
            'task_id': task_id,
            'task_name': stats['task_name'],
            'count': stats['count'],
            'avg_calmness_before': round(avg_before, 2),
            'avg_calmness_after': round(avg_after, 2),
            'avg_improvement': round(avg_improvement, 2),
            'avg_duration': round(avg_duration, 1),
            'improvement_rate': round(improvement_rate, 1)
        })
    
    # 按平均改善排序
    result.sort(key=lambda x: x['avg_improvement'], reverse=True)
    
    return jsonify({"success": True, "stats": result})

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
