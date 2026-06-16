#!/usr/bin/env python3
"""
CRA Portal - 临床研究助理管理中心
PostgreSQL 版：数据持久化到数据库，不受 Render 重启影响
"""

import os
import json
import uuid
from datetime import datetime, date
from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS

import db

app = Flask(__name__)
CORS(app)

# ========== 初始化 ==========

@app.before_request
def before_first():
    """首次请求时初始化数据库表"""
    pass  # 已在 startup 时初始化

def startup():
    """应用启动时的初始化"""
    db.init_db()
    print("=" * 50)
    print("CRA Portal 启动完成（PostgreSQL 版）")

# ========== 项目 API ==========

@app.route('/api/projects', methods=['GET'])
def get_projects():
    projects = db.get_projects()
    tasks = db.get_tasks()
    for p in projects:
        p_tasks = [t for t in tasks if t.get('project_id') == p['id']]
        p['task_count'] = len(p_tasks)
        p['done_count'] = len([t for t in p_tasks if t.get('done')])
    return jsonify({"success": True, "projects": projects})

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json or {}
    project = {
        "id": str(uuid.uuid4())[:8],
        "name": data.get('name', '未命名项目'),
        "code": data.get('code', ''),
        "stage": data.get('stage', '进行中'),
        "center_count": int(data.get('center_count', 0)),
        "dbl_date": data.get('dbl_date', ''),
        "notes": data.get('notes', ''),
    }
    db.insert_project(project)
    project['created_at'] = datetime.now().isoformat()
    project['updated_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "project": project})

@app.route('/api/project/<project_id>', methods=['GET'])
def get_project(project_id):
    project = db.get_project(project_id)
    if not project:
        return jsonify({"success": False, "error": "项目不存在"}), 404
    tasks = [t for t in db.get_tasks() if t.get('project_id') == project_id]
    project['tasks'] = tasks
    return jsonify({"success": True, **project})

@app.route('/api/project/<project_id>', methods=['PUT'])
def update_project(project_id):
    data = request.json or {}
    result = db.update_project(project_id, data)
    return jsonify({"success": True, "project": result})

@app.route('/api/project/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    db.delete_project(project_id)
    return jsonify({"success": True})

# ========== 待办事项 API ==========

@app.route('/api/tasks', methods=['GET'])
def get_all_tasks():
    tasks = db.get_tasks()
    project_id = request.args.get('project_id')
    if project_id:
        tasks = [t for t in tasks if t.get('project_id') == project_id]
    
    centers = db.get_centers()
    center_map = {c['id']: c.get('code', '') + ' ' + c.get('name', '') for c in centers}
    for t in tasks:
        t['center_name'] = center_map.get(t.get('center_id'), '')
    
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    tasks.sort(key=lambda t: (not t.get('done'), priority_order.get(t.get('priority', 'medium'), 1)))
    return jsonify({"success": True, "tasks": tasks})

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json or {}
    task = {
        "id": str(uuid.uuid4())[:8],
        "title": data.get('title', '未命名任务'),
        "project_id": data.get('project_id', ''),
        "center_id": data.get('center_id', ''),
        "priority": data.get('priority', 'medium'),
        "ability_type": data.get('ability_type', 'execution'),
        "due_date": data.get('due_date', ''),
        "done": data.get('done', False),
    }
    db.insert_task(task)
    task['created_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "task": task})

@app.route('/api/task/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json or {}
    result = db.update_task(task_id, data)
    return jsonify({"success": True, "task": result})

@app.route('/api/task/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    db.delete_task(task_id)
    return jsonify({"success": True})

# ========== 中心 API ==========

@app.route('/api/centers', methods=['GET'])
def get_centers():
    centers = db.get_centers()
    project_id = request.args.get('project_id')
    if project_id:
        centers = [c for c in centers if c.get('project_id') == project_id]
    return jsonify({"success": True, "centers": centers})

@app.route('/api/centers', methods=['POST'])
def create_center():
    data = request.json or {}
    center = {
        "id": str(uuid.uuid4())[:8],
        "project_id": data.get('project_id', ''),
        "code": data.get('code') or data.get('center_code') or '',
        "name": data.get('name') or data.get('center_name') or '未命名中心',
        "milestones": data.get('milestones', []),
    }
    db.insert_center(center)
    center['created_at'] = datetime.now().isoformat()
    center['updated_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "center": center})

@app.route('/api/center/<center_id>', methods=['PUT'])
def update_center(center_id):
    data = request.json or {}
    result = db.update_center(center_id, data)
    return jsonify({"success": True, "center": result})

@app.route('/api/center/<center_id>/milestone/<int:milestone_idx>', methods=['PUT'])
def toggle_milestone(center_id, milestone_idx):
    data = request.json or {}
    done = data.get('done')
    actual_date = data.get('actual_date')
    result = db.update_center_milestone(center_id, milestone_idx, done, actual_date)
    if result is None:
        return jsonify({"success": False, "error": "更新失败"}), 400
    centers = db.get_centers()
    center = next((c for c in centers if c['id'] == center_id), None)
    milestones = center.get('milestones', []) if center else []
    done_count = sum(1 for m in milestones if m.get('done'))
    return jsonify({"success": True, "milestone": result, "progress": {"done": done_count, "total": len(milestones)}})

@app.route('/api/center/<center_id>', methods=['DELETE'])
def delete_center(center_id):
    db.delete_center(center_id)
    return jsonify({"success": True})

# ========== 能量状态 API ==========

@app.route('/api/status', methods=['GET'])
def get_status():
    status = db.get_status_kv('energy_calm') or {"energy": "medium", "calmness": "medium"}
    return jsonify(status)

@app.route('/api/status', methods=['POST'])
def set_status():
    data = request.json or {}
    current = db.get_status_kv('energy_calm') or {}
    status = {
        "energy": data.get('energy', current.get('energy', 'medium')),
        "calmness": data.get('calmness', current.get('calmness', 'medium')),
        "updated_at": datetime.now().isoformat()
    }
    db.set_status_kv('energy_calm', status)
    return jsonify({"success": True, "status": status})

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    status = db.get_status_kv('energy_calm') or {"energy": "medium", "calmness": "medium"}
    tasks = db.get_tasks()
    pending = [t for t in tasks if not t.get('done')]
    energy = status.get('energy', 'medium')
    calmness = status.get('calmness', 'medium')
    
    energy_calm_map = {
        ('high', 'high'):    {'deep_focus': 1, 'planning': 2, 'communication': 3, 'execution': 3, 'learning_review': 3},
        ('high', 'medium'): {'communication': 1, 'deep_focus': 2, 'execution': 3, 'planning': 3, 'learning_review': 3},
        ('high', 'low'):     {'execution': 1, 'communication': 2, 'planning': 3, 'learning_review': 3},
        ('medium', 'high'):  {'planning': 1, 'learning_review': 2, 'deep_focus': 3, 'communication': 3, 'execution': 3},
        ('medium', 'medium'):{'execution': 1, 'communication': 2, 'planning': 3, 'deep_focus': 3, 'learning_review': 3},
        ('medium', 'low'):   {'execution': 1, 'learning_review': 2, 'communication': 3},
        ('low', 'high'):     {'learning_review': 1, 'planning': 2, 'execution': 3},
        ('low', 'medium'):   {'execution': 1, 'learning_review': 2, 'planning': 3},
        ('low', 'low'):      {},
    }
    
    rank_map = energy_calm_map.get((energy, calmness), {'execution': 1})
    recommended_types = sorted(rank_map.keys(), key=lambda x: rank_map[x])
    recommended = [t for t in pending if t.get('ability_type') in rank_map]
    other = [t for t in pending if t.get('ability_type') not in rank_map]
    
    for t in recommended + other:
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
    tasks = db.get_startup_tasks()
    return jsonify({"success": True, "tasks": tasks})

@app.route('/api/startup-tasks', methods=['POST'])
def create_startup_task():
    data = request.json or {}
    task = {
        "id": str(uuid.uuid4())[:8],
        "name": data.get('name', '未命名启动任务'),
        "description": data.get('description', ''),
    }
    db.insert_startup_task(task)
    task['created_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "task": task})

@app.route('/api/startup-tasks/<task_id>', methods=['PUT'])
def update_startup_task(task_id):
    data = request.json or {}
    result = db.update_startup_task(task_id, data)
    return jsonify({"success": True, "task": result})

@app.route('/api/startup-tasks/<task_id>', methods=['DELETE'])
def delete_startup_task(task_id):
    db.delete_startup_task(task_id)
    return jsonify({"success": True})

@app.route('/api/startup-logs', methods=['GET'])
def get_startup_logs():
    logs = db.get_startup_logs()
    return jsonify({"success": True, "logs": logs})

@app.route('/api/startup-logs', methods=['POST'])
def create_startup_log():
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
    }
    db.insert_startup_log(log)
    log['executed_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "log": log})

@app.route('/api/startup-stats', methods=['GET'])
def get_startup_stats():
    logs = db.get_startup_logs()
    tasks = db.get_startup_tasks()
    
    if not logs:
        return jsonify({"success": True, "stats": []})
    
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
    result.sort(key=lambda x: x['avg_improvement'], reverse=True)
    return jsonify({"success": True, "stats": result})

# ========== 监查问题 API ==========

@app.route('/api/findings', methods=['GET'])
def get_findings():
    findings = db.get_findings_all()
    project_id = request.args.get('project_id')
    center_id = request.args.get('center_id')
    status = request.args.get('status')
    
    if project_id:
        findings = [f for f in findings if f.get('project_id') == project_id]
    if center_id:
        findings = [f for f in findings if f.get('center_id') == center_id]
    if status:
        findings = [f for f in findings if f.get('status') == status]
    
    projects = db.get_projects()
    centers = db.get_centers()
    project_map = {p['id']: p.get('name', '') for p in projects}
    center_map = {c['id']: c.get('code', '') + ' ' + c.get('name', '') for c in centers}
    
    for f in findings:
        f['project_name'] = project_map.get(f.get('project_id'), '')
        f['center_name'] = center_map.get(f.get('center_id'), '')
    
    severity_order = {'Critical': 0, 'Major': 1, 'Minor': 2}
    findings.sort(key=lambda x: (x.get('status') == 'Closed', x.get('status') == 'Resolved',
                                 severity_order.get(x.get('severity', 'Minor'), 2)))
    return jsonify({"success": True, "findings": findings})

@app.route('/api/findings', methods=['POST'])
def create_finding():
    data = request.json or {}
    findings = db.get_findings_all()
    existing_nums = [int(f.get('finding_number', 'F0').replace('F', '')) for f in findings
                     if f.get('finding_number', '').startswith('F') and f.get('finding_number', '')[1:].isdigit()]
    next_num = max(existing_nums) + 1 if existing_nums else 1
    finding = {
        "id": str(uuid.uuid4())[:8],
        "finding_number": data.get('finding_number', f'F{next_num:03d}'),
        "project_id": data.get('project_id', ''),
        "center_id": data.get('center_id', ''),
        "description": data.get('description', ''),
        "category": data.get('category', '其他'),
        "severity": data.get('severity', 'Minor'),
        "status": data.get('status', 'Open'),
        "found_date": data.get('found_date', date.today().isoformat()),
        "due_date": data.get('due_date', ''),
        "corrective_action": data.get('corrective_action', ''),
    }
    db.insert_finding(finding)
    finding['created_at'] = datetime.now().isoformat()
    finding['updated_at'] = datetime.now().isoformat()
    return jsonify({"success": True, "finding": finding})

@app.route('/api/finding/<finding_id>', methods=['PUT'])
def update_finding(finding_id):
    data = request.json or {}
    result = db.update_finding(finding_id, data)
    return jsonify({"success": True, "finding": result})

@app.route('/api/finding/<finding_id>', methods=['DELETE'])
def delete_finding(finding_id):
    db.delete_finding(finding_id)
    return jsonify({"success": True})

@app.route('/api/findings-stats', methods=['GET'])
def get_findings_stats():
    findings = db.get_findings_all()
    today = date.today()
    total = len(findings)
    by_status = {}
    by_severity = {}
    by_category = {}
    overdue = 0
    for f in findings:
        s = f.get('status', 'Open')
        by_status[s] = by_status.get(s, 0) + 1
        sev = f.get('severity', 'Minor')
        by_severity[sev] = by_severity.get(sev, 0) + 1
        cat = f.get('category', '其他')
        by_category[cat] = by_category.get(cat, 0) + 1
        if f.get('status') not in ('Closed', 'Resolved') and f.get('due_date'):
            try:
                due = date.fromisoformat(f['due_date'])
                if due < today:
                    overdue += 1
            except: pass
    return jsonify({"success": True, "stats": {
        "total": total, "by_status": by_status, "by_severity": by_severity,
        "by_category": by_category, "overdue": overdue
    }})

# ========== 统计 API ==========

@app.route('/api/stats')
def get_stats():
    projects = db.get_projects()
    tasks = db.get_tasks()
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.get('stage') == '进行中'])
    total_tasks = len(tasks)
    done_tasks = len([t for t in tasks if t.get('done')])
    pending_tasks = total_tasks - done_tasks
    high_priority = len([t for t in tasks if not t.get('done') and t.get('priority') == 'high'])
    
    today = date.today()
    due_soon = 0
    for t in tasks:
        if not t.get('done') and t.get('due_date'):
            try:
                due = date.fromisoformat(t['due_date'])
                if (due - today).days <= 7 and (due - today).days >= 0:
                    due_soon += 1
            except: pass
    
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
    return render_template('index.html')

# ========== 主程序 ==========

if __name__ == '__main__':
    startup()
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
