#!/usr/bin/env python3
"""
CRA Portal - 临床研究助理管理中心
PostgreSQL 版：数据持久化到数据库，不受 Render 重启影响
v2026-06-17: 中心详情API + 仪表盘升级
"""

import os
import json
import uuid
from datetime import datetime, date
from flask import Flask, render_template, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from io import BytesIO
from openpyxl import Workbook

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

@app.route('/api/center/<center_id>', methods=['GET', 'PUT'])
def get_center_detail(center_id):
    if request.method == 'GET':
        # 返回中心详情 + 关联的待办 + 监查问题
        center = db.get_center(center_id)
        if not center:
            return jsonify({"success": False, "error": "中心不存在"}), 404
        # 获取该中心的待办
        tasks = db.get_tasks(center_id=center_id)
        # 获取该中心的监查问题
        findings = db.get_findings(center_id=center_id)
        return jsonify({
            "success": True,
            "center": center,
            "tasks": tasks,
            "findings": findings
        })
    else:
        # PUT - 更新中心
        data = request.json or {}
        result = db.update_center(center_id, data)
        return jsonify({"success": True, "center": result})

@app.route('/api/centers', methods=['GET', 'POST'])
def handle_centers():
    if request.method == 'GET':
        project_id = request.args.get('project_id')
        centers = db.get_centers(project_id)
        # 为每个中心附加任务数和问题数
        for c in centers:
            cid = c['id']
            tasks = db.get_tasks(center_id=cid)
            findings = db.get_findings(center_id=cid)
            c['task_count'] = len(tasks)
            c['finding_count'] = len(findings)
            c['open_finding_count'] = len([f for f in findings if f.get('status') == 'Open'])
        return jsonify({"success": True, "centers": centers})
    
    # POST - create_center
    data = request.json or {}
    center = {
        "id": str(uuid.uuid4())[:8],
        "project_id": data.get('project_id', ''),
        "code": data.get('code') or data.get('center_code') or '',
        "name": data.get('name') or data.get('center_name') or '未命名中心',
        "pi_name": data.get('pi_name', ''),
        "pi_phone": data.get('pi_phone', ''),
        "pi_email": data.get('pi_email', ''),
        "department": data.get('department', ''),
        "contact_crc": data.get('contact_crc', ''),
        "contact_crc_phone": data.get('contact_crc_phone', ''),
        "contact_ethics": data.get('contact_ethics', ''),
        "address": data.get('address', ''),
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
        if f.get('status') not in ('Closed', 'Resolved', 'Waiting CRC') and f.get('due_date'):
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
    centers = db.get_centers()
    findings = db.get_findings_all()
    
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.get('stage') == '进行中'])
    total_tasks = len(tasks)
    done_tasks = len([t for t in tasks if t.get('done')])
    pending_tasks = total_tasks - done_tasks
    waiting_crc_tasks = len([t for t in tasks if t.get('task_status') == 'waiting_crc' and not t.get('done')])
    high_priority = len([t for t in tasks if not t.get('done') and t.get('priority') == 'high'])
    
    # 逾期待办（due_date < today 且未完成）
    today = date.today()
    overdue_tasks = 0
    due_soon = 0
    for t in tasks:
        if not t.get('done') and t.get('task_status') != 'waiting_crc' and t.get('due_date'):
            try:
                due = date.fromisoformat(t['due_date'])
                if due < today:
                    overdue_tasks += 1
                elif (due - today).days <= 7 and (due - today).days >= 0:
                    due_soon += 1
            except: pass
    
    # Open监查问题
    open_findings = len([f for f in findings if f.get('status') == 'Open'])
    total_findings = len(findings)
    
    # 各中心进度（里程碑完成率）
    center_progress = []
    for c in centers:
        ms = c.get('milestones', []) or []
        done = sum(1 for m in ms if m.get('done'))
        total = len(ms)
        pct = round(done / total * 100) if total > 0 else 0
        center_progress.append({
            'id': c['id'],
            'code': c.get('code', ''),
            'name': c.get('name', ''),
            'done': done,
            'total': total,
            'pct': pct
        })
    
    return jsonify({
        "success": True,
        "stats": {
            "total_projects": total_projects,
            "active_projects": active_projects,
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "pending_tasks": pending_tasks,
            "waiting_crc_tasks": waiting_crc_tasks,
            "high_priority": high_priority,
            "overdue_tasks": overdue_tasks,
            "due_soon": due_soon,
            "open_findings": open_findings,
            "total_findings": total_findings,
            "center_progress": center_progress
        }
    })

# ========== 数据备份 ==========

@app.route('/api/backup', methods=['GET', 'POST'])
def backup_data():
    """导出所有数据为 JSON 文件"""
    try:
        conn = db.get_connection()
        if not conn:
            return jsonify({"success": False, "error": "数据库连接失败"}), 500
        cursor = conn.cursor()

        # 硬编码表名（避免 information_schema 权限问题）
        known_tables = ['projects', 'tasks', 'centers', 'findings', 'start_logs']
        
        backup_data = {
            "backup_time": datetime.now().isoformat(),
            "tables": {}
        }
        
        for table in known_tables:
            try:
                cursor.execute(f'SELECT * FROM "{table}"')
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                backup_data["tables"][table] = {
                    "columns": columns,
                    "rows": [dict(zip(columns, row)) for row in rows]
                }
            except Exception:
                pass  # 表不存在则跳过
        
        cursor.close()
        conn.close()
        
        json_str = json.dumps(backup_data, ensure_ascii=False, indent=2, default=str)
        filename = f"cra-portal-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        
        # 自动保存到本地 backups 目录（供定时清理）
        try:
            backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
            os.makedirs(backup_dir, exist_ok=True)
            with open(os.path.join(backup_dir, filename), 'w', encoding='utf-8') as f:
                f.write(json_str)
        except Exception:
            pass  # 本地保存失败不影响下载
        
        return Response(
            json_str,
            mimetype='application/json',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== 数据迁移 ==========

# ========== 研究人员 ==========

@app.route('/api/staff', methods=['GET', 'POST'])
def handle_staff():
    if request.method == 'GET':
        center_id = request.args.get('center_id')
        items = db.get_staff(center_id)
        return jsonify({"success": True, "staff": items})
    else:
        data = request.json or {}
        result = db.insert_staff(data)
        return jsonify({"success": True, "staff": result}), 201

@app.route('/api/staff/<staff_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_staff_member(staff_id):
    if request.method == 'GET':
        item = db.get_staff_member(staff_id)
        if not item:
            return jsonify({"success": False, "error": "不存在"}), 404
        return jsonify({"success": True, "staff": item})
    elif request.method == 'PUT':
        data = request.json or {}
        result = db.update_staff(staff_id, data)
        return jsonify({"success": True, "staff": result})
    else:
        db.delete_staff(staff_id)
        return jsonify({"success": True})

# ========== 伦理递交 ==========

@app.route('/api/ethics', methods=['GET', 'POST'])
def handle_ethics():
    if request.method == 'GET':
        center_id = request.args.get('center_id')
        items = db.get_ethics_submissions(center_id)
        return jsonify({"success": True, "ethics": items})
    else:
        data = request.json or {}
        result = db.insert_ethics_submission(data)
        return jsonify({"success": True, "ethics": result}), 201

@app.route('/api/ethics/<sub_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_ethics_submission(sub_id):
    if request.method == 'GET':
        item = db.get_ethics_submission(sub_id)
        if not item:
            return jsonify({"success": False, "error": "不存在"}), 404
        return jsonify({"success": True, "ethics": item})
    elif request.method == 'PUT':
        data = request.json or {}
        result = db.update_ethics_submission(sub_id, data)
        return jsonify({"success": True, "ethics": result})
    else:
        db.delete_ethics_submission(sub_id)
        return jsonify({"success": True})

# ========== 方案偏离 ==========

@app.route('/api/pds', methods=['GET', 'POST'])
def handle_pds():
    if request.method == 'GET':
        center_id = request.args.get('center_id')
        items = db.get_protocol_deviations(center_id)
        return jsonify({"success": True, "pds": items})
    else:
        data = request.json or {}
        result = db.insert_protocol_deviation(data)
        return jsonify({"success": True, "pd": result}), 201

@app.route('/api/pds/<pd_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_pd(pd_id):
    if request.method == 'GET':
        item = db.get_protocol_deviation(pd_id)
        if not item:
            return jsonify({"success": False, "error": "不存在"}), 404
        return jsonify({"success": True, "pd": item})
    elif request.method == 'PUT':
        data = request.json or {}
        result = db.update_protocol_deviation(pd_id, data)
        return jsonify({"success": True, "pd": result})
    else:
        db.delete_protocol_deviation(pd_id)
        return jsonify({"success": True})

# ========== 导出 Excel ==========

@app.route('/api/export/<sheet_type>', methods=['GET'])
def export_excel(sheet_type):
    """导出指定类型数据为 Excel 文件"""
    try:
        wb = Workbook()
        wb.remove(wb.active)

        # 构建项目/中心名称查找表
        projects_map = {p['id']: p.get('name', p['id']) for p in db.get_projects()}
        centers_map = {c['id']: c.get('name', c['id']) for c in db.get_centers()}

        if sheet_type == 'tasks' or sheet_type == 'all':
            ws = wb.create_sheet('待办事项')
            ws.append(['ID', '标题', '项目', '中心', '优先级', '能力类型', '截止日期', '是否完成', '创建时间'])
            tasks = db.get_tasks()
            for t in tasks:
                pid = t.get('project_id','')
                cid = t.get('center_id','')
                p_name = projects_map.get(pid, pid) if pid else ''
                c_name = centers_map.get(cid, cid) if cid else ''
                ws.append([t.get('id',''), t.get('title',''), p_name, c_name,
                           t.get('priority',''), t.get('ability_type',''), t.get('due_date',''),
                           '是' if t.get('done') else '否', str(t.get('created_at',''))])

        if sheet_type == 'findings' or sheet_type == 'all':
            ws = wb.create_sheet('监查问题')
            ws.append(['ID', '问题编号', '项目', '中心', '描述', '分类', '严重程度', '状态', '发现日期', '截止日期', '纠正措施', '创建时间', '更新时间'])
            findings = db.get_findings_all()
            for f in findings:
                pid = f.get('project_id','')
                cid = f.get('center_id','')
                p_name = projects_map.get(pid, pid) if pid else ''
                c_name = centers_map.get(cid, cid) if cid else ''
                ws.append([f.get('id',''), f.get('finding_number',''), p_name, c_name,
                           f.get('description',''), f.get('category',''), f.get('severity',''), f.get('status',''),
                           f.get('found_date',''), f.get('due_date',''), f.get('corrective_action',''),
                           str(f.get('created_at','')), str(f.get('updated_at',''))])

        if sheet_type == 'centers' or sheet_type == 'all':
            ws = wb.create_sheet('中心信息')
            ws.append(['ID', '项目', '中心编号', '中心名称', 'PI', '科室', '备注', '创建时间', '更新时间'])
            centers = db.get_centers()
            for c in centers:
                pid = c.get('project_id','')
                p_name = projects_map.get(pid, pid) if pid else ''
                ws.append([c.get('id',''), p_name, c.get('code',''), c.get('name',''),
                           c.get('pi',''), c.get('department',''), c.get('notes',''),
                           str(c.get('created_at','')), str(c.get('updated_at',''))])

        if sheet_type == 'projects' or sheet_type == 'all':
            ws = wb.create_sheet('项目信息')
            ws.append(['ID', '名称', '编号', '阶段', '中心数', 'DBL日期', '备注', '创建时间', '更新时间'])
            projects = db.get_projects()
            for p in projects:
                ws.append([p.get('id',''), p.get('name',''), p.get('code',''), p.get('stage',''),
                           p.get('center_count',''), p.get('dbl_date',''), p.get('notes',''),
                           str(p.get('created_at','')), str(p.get('updated_at',''))])

        if sheet_type not in ['tasks', 'findings', 'centers', 'projects', 'all']:
            return jsonify({"success": False, "error": f"未知导出类型: {sheet_type}"}), 400

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)

        filename = f"cra-portal-{sheet_type}-{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            buf.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== 数据迁移 ==========

@app.route('/migrate', methods=['POST'])
def migrate_data():
    """从旧 JSON 数据迁移到 PostgreSQL"""
    old_data = {
        "projects": [
            {"id": "3142iv", "code": "3142iv", "name": "JMKX003142iv", "stage": "进行中", "phase": "DBL", "centers_count": 5, "notes": "5家中心：01/07/09/18/21"},
            {"id": "0197", "code": "0197", "name": "JMKX00197", "stage": "进行中", "phase": "SSU", "centers_count": 3, "notes": "3家中心：08/14/18"}
        ],
        "tasks": [
            {"id": "t001", "project_id": "0197", "center_id": "c0197-08", "title": "苏北(08)协议稿+PPT", "priority": "high", "due_date": "2026-06-23", "done": False, "created_at": "2026-06-12"},
            {"id": "t002", "project_id": "0197", "center_id": "c0197-14", "title": "粤北(14)CTMS立项审核+PI签字", "priority": "high", "due_date": "2026-06-20", "done": False, "created_at": "2026-06-12"},
            {"id": "t003", "project_id": "0197", "center_id": "c0197-18", "title": "丽水(18)立项资料电子版预审", "priority": "high", "due_date": "2026-06-25", "done": False, "created_at": "2026-06-12"},
            {"id": "t004", "project_id": "3142iv", "center_id": "c3142-01", "title": "中心01 TMF扫描归档", "priority": "medium", "due_date": "2026-06-20", "done": True, "created_at": "2026-06-15"},
            {"id": "t005", "project_id": "3142iv", "center_id": "c3142-07", "title": "中心07 SDV问题回复", "priority": "medium", "due_date": "2026-06-30", "done": False, "created_at": "2026-06-12"},
            {"id": "t006", "project_id": "3142iv", "center_id": "c3142-09", "title": "中心09 监查报告撰写", "priority": "low", "due_date": "2026-07-05", "done": False, "created_at": "2026-06-12"},
            {"id": "t007", "project_id": "0197", "center_id": None, "title": "浙二TMF清单整理", "priority": "medium", "due_date": "2026-06-23", "done": False, "created_at": "2026-06-12"}
        ],
        "centers": [
            {"id": "c001", "code": "01", "name": "浙江大学医学院附属第二医院", "project_id": "3142iv", "created_at": "2026-05-19T14:20:00"},
            {"id": "c002", "code": "07", "name": "惠州市第三人民医院", "project_id": "3142iv", "created_at": "2026-05-19T14:20:00"},
            {"id": "c003", "code": "09", "name": "宁波市第二医院", "project_id": "3142iv", "created_at": "2026-05-19T14:20:00"},
            {"id": "c004", "code": "18", "name": "福州大学附属省立医院", "project_id": "3142iv", "created_at": "2026-05-19T14:20:00"},
            {"id": "c005", "code": "21", "name": "南昌大学附属第二医院", "project_id": "3142iv", "created_at": "2026-05-19T14:20:00"},
            {"id": "c006", "code": "08", "name": "苏北人民医院", "project_id": "0197", "pi": "闵凌峰", "department": "呼吸与危重症医学科", "created_at": "2026-05-19T14:22:00"},
            {"id": "c007", "code": "14", "name": "粤北人民医院", "project_id": "0197", "pi": "张国平", "department": "肿瘤科", "created_at": "2026-05-19T14:22:00"},
            {"id": "c008", "code": "18", "name": "丽水市中心医院", "project_id": "0197", "pi": "纪建松", "department": "肿瘤科", "created_at": "2026-05-19T14:22:00"}
        ]
    }
    
    imported = {"projects": 0, "tasks": 0, "centers": 0}
    
    for p in old_data["projects"]:
        try:
            db.insert_project(p)
            imported["projects"] += 1
        except: pass
    
    for t in old_data["tasks"]:
        try:
            db.insert_task(t)
            imported["tasks"] += 1
        except: pass
    
    return jsonify({"success": True, "imported": imported})

# ========== 页面路由 ==========

@app.route('/')
def index():
    return render_template('index.html')

# ========== 主程序 ==========

if __name__ == '__main__':
    startup()
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
