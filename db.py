"""
数据库模块 - PostgreSQL 存储层
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_connection():
    """获取数据库连接"""
    if not DATABASE_URL:
        return None
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    """初始化数据库表结构"""
    conn = get_connection()
    if conn is None:
        print('[DB] DATABASE_URL 未设置，跳过数据库初始化')
        return False
    
    try:
        cur = conn.cursor()
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR(8) PRIMARY KEY,
                name VARCHAR(255) NOT NULL DEFAULT '未命名项目',
                code VARCHAR(100) DEFAULT '',
                stage VARCHAR(50) DEFAULT '进行中',
                center_count INTEGER DEFAULT 0,
                dbl_date VARCHAR(20) DEFAULT '',
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(8) PRIMARY KEY,
                title VARCHAR(500) NOT NULL DEFAULT '未命名任务',
                project_id VARCHAR(8) DEFAULT '',
                center_id VARCHAR(8) DEFAULT '',
                priority VARCHAR(20) DEFAULT 'medium',
                ability_type VARCHAR(50) DEFAULT 'execution',
                due_date VARCHAR(20) DEFAULT '',
                done BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS centers (
                id VARCHAR(8) PRIMARY KEY,
                project_id VARCHAR(8) DEFAULT '',
                code VARCHAR(100) DEFAULT '',
                name VARCHAR(255) DEFAULT '未命名中心',
                pi_name VARCHAR(255) DEFAULT '',
                pi_phone VARCHAR(50) DEFAULT '',
                pi_email VARCHAR(255) DEFAULT '',
                department VARCHAR(255) DEFAULT '',
                contact_crc VARCHAR(255) DEFAULT '',
                contact_crc_phone VARCHAR(50) DEFAULT '',
                contact_ethics TEXT DEFAULT '',
                address TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                milestones JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS startup_tasks (
                id VARCHAR(8) PRIMARY KEY,
                name VARCHAR(255) NOT NULL DEFAULT '未命名启动任务',
                description TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS startup_logs (
                id VARCHAR(8) PRIMARY KEY,
                startup_task_id VARCHAR(8) DEFAULT '',
                startup_task_name VARCHAR(255) DEFAULT '',
                target_task_id VARCHAR(8) DEFAULT '',
                target_task_name VARCHAR(255) DEFAULT '',
                calmness_before INTEGER DEFAULT 2,
                calmness_after INTEGER DEFAULT 2,
                duration_minutes INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS findings (
                id VARCHAR(8) PRIMARY KEY,
                finding_number VARCHAR(20) DEFAULT '',
                project_id VARCHAR(8) DEFAULT '',
                center_id VARCHAR(8) DEFAULT '',
                description TEXT DEFAULT '',
                category VARCHAR(100) DEFAULT '其他',
                severity VARCHAR(20) DEFAULT 'Minor',
                status VARCHAR(20) DEFAULT 'Open',
                found_date VARCHAR(20) DEFAULT '',
                due_date VARCHAR(20) DEFAULT '',
                corrective_action TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cur.execute('''
            CREATE TABLE IF NOT EXISTS status_kv (
                key VARCHAR(50) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 升级 centers 表：添加新字段（如果不存在）
        try:
            cur.execute("""SELECT column_name FROM information_schema.columns 
                        WHERE table_name='centers' AND column_name='pi_name'""")
            if cur.fetchone() is None:
                # 旧表没有新字段，需要升级
                # 先检查是否有 pi 字段（旧版），如果有则迁移数据
                cur.execute("""SELECT column_name FROM information_schema.columns 
                            WHERE table_name='centers' AND column_name='pi'""")
                if cur.fetchone():
                    cur.execute("ALTER TABLE centers RENAME COLUMN pi TO pi_name")
                    print('[DB] centers.pi 重命名为 pi_name')
                else:
                    cur.execute("ALTER TABLE centers ADD COLUMN pi_name VARCHAR(255) DEFAULT ''")
                
                cur.execute("ALTER TABLE centers ADD COLUMN pi_phone VARCHAR(50) DEFAULT ''")
                cur.execute("ALTER TABLE centers ADD COLUMN pi_email VARCHAR(255) DEFAULT ''")
                cur.execute("ALTER TABLE centers ADD COLUMN contact_crc VARCHAR(255) DEFAULT ''")
                cur.execute("ALTER TABLE centers ADD COLUMN contact_crc_phone VARCHAR(50) DEFAULT ''")
                cur.execute("ALTER TABLE centers ADD COLUMN contact_ethics TEXT DEFAULT ''")
                cur.execute("ALTER TABLE centers ADD COLUMN address TEXT DEFAULT ''")
                print('[DB] centers 表已升级，添加新字段')
        except Exception as e:
            print(f'[DB] centers 表升级检查失败: {e}')
        
        conn.commit()
        print('[DB] 数据库表初始化完成')
        return True
    except Exception as e:
        conn.rollback()
        print(f'[DB] 初始化失败: {e}')
        return False
    finally:
        cur.close()
        conn.close()


def serialize_row(row):
    """将数据库行转换为 JSON 安全的字典"""
    if row is None:
        return None
    result = {}
    for k, v in row.items():
        if hasattr(v, 'isoformat'):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = v
        else:
            result[k] = v
    return result


# ========== projects ==========

def get_projects():
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    cur.execute('SELECT * FROM projects ORDER BY created_at')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def get_project(project_id):
    conn = get_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    cur.execute('SELECT * FROM projects WHERE id = %s', (project_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return serialize_row(row) if row else None

def insert_project(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO projects ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_project error: {e}')
    finally:
        cur.close()
        conn.close()
    return data

def update_project(project_id, data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    data = {k: v for k, v in data.items() if k != 'id' and k != 'created_at'}
    if not data:
        cur.close()
        conn.close()
        return data
    set_clause = ','.join([f"{k} = %s" for k in data.keys()])
    sql = f"UPDATE projects SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
    try:
        cur.execute(sql, list(data.values()) + [project_id])
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_project error: {e}')
    finally:
        cur.close()
        conn.close()
    return {**data, 'id': project_id}

def delete_project(project_id):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM projects WHERE id = %s', (project_id,))
        cur.execute('DELETE FROM tasks WHERE project_id = %s', (project_id,))
        cur.execute('DELETE FROM centers WHERE project_id = %s', (project_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] delete_project error: {e}')
    finally:
        cur.close()
        conn.close()


# ========== tasks ==========

def get_tasks(project_id=None, center_id=None):
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    if center_id:
        cur.execute('SELECT * FROM tasks WHERE center_id = %s ORDER BY created_at', (center_id,))
    elif project_id:
        cur.execute('SELECT * FROM tasks WHERE project_id = %s ORDER BY created_at', (project_id,))
    else:
        cur.execute('SELECT * FROM tasks ORDER BY created_at')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def get_task(task_id):
    conn = get_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    cur.execute('SELECT * FROM tasks WHERE id = %s', (task_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return serialize_row(row) if row else None

def insert_task(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO tasks ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_task error: {e}')
    finally:
        cur.close()
        conn.close()
    return data

def update_task(task_id, data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    data = {k: v for k, v in data.items() if k != 'id' and k != 'created_at'}
    if not data:
        cur.close()
        conn.close()
        return data
    set_clause = ','.join([f"{k} = %s" for k in data.keys()])
    sql = f"UPDATE tasks SET {set_clause} WHERE id = %s"
    try:
        cur.execute(sql, list(data.values()) + [task_id])
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_task error: {e}')
    finally:
        cur.close()
        conn.close()
    return {**data, 'id': task_id}

def delete_task(task_id):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM tasks WHERE id = %s', (task_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] delete_task error: {e}')
    finally:
        cur.close()
        conn.close()


# ========== centers ==========

def get_centers(project_id=None):
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    if project_id:
        cur.execute('SELECT * FROM centers WHERE project_id = %s ORDER BY created_at', (project_id,))
    else:
        cur.execute('SELECT * FROM centers ORDER BY created_at')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def get_center(center_id):
    conn = get_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    cur.execute('SELECT * FROM centers WHERE id = %s', (center_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return serialize_row(row) if row else None

def insert_center(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO centers ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_center error: {e}')
    finally:
        cur.close()
        conn.close()
    return data

def update_center(center_id, data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    data = {k: v for k, v in data.items() if k != 'id' and k != 'created_at'}
    if not data:
        cur.close()
        conn.close()
        return data
    set_clause = ','.join([f"{k} = %s" for k in data.keys()])
    sql = f"UPDATE centers SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
    try:
        cur.execute(sql, list(data.values()) + [center_id])
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_center error: {e}')
    finally:
        cur.close()
        conn.close()
    return {**data, 'id': center_id}

def update_center_milestone(center_id, milestone_idx, done, actual_date=None):
    conn = get_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    try:
        cur.execute('SELECT milestones FROM centers WHERE id = %s', (center_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return None
        milestones = row['milestones']
        if isinstance(milestones, str):
            milestones = json.loads(milestones)
        if milestone_idx < 0 or milestone_idx >= len(milestones):
            cur.close()
            conn.close()
            return None
        milestones[milestone_idx]['done'] = done
        if actual_date:
            milestones[milestone_idx]['actual_date'] = actual_date
        cur.execute(
            'UPDATE centers SET milestones = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s',
            (json.dumps(milestones, ensure_ascii=False), center_id)
        )
        conn.commit()
        result = milestones[milestone_idx]
        cur.close()
        conn.close()
        return result
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_center_milestone error: {e}')
        cur.close()
        conn.close()
        return None

def delete_center(center_id):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM centers WHERE id = %s', (center_id,))
        cur.execute('DELETE FROM tasks WHERE center_id = %s', (center_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] delete_center error: {e}')
    finally:
        cur.close()
        conn.close()


# ========== startup_tasks ==========

def get_startup_tasks():
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    cur.execute('SELECT * FROM startup_tasks ORDER BY created_at')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def insert_startup_task(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO startup_tasks ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_startup_task error: {e}')
    finally:
        cur.close()
        conn.close()
    return data

def update_startup_task(task_id, data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    data = {k: v for k, v in data.items() if k != 'id' and k != 'created_at'}
    if not data:
        cur.close()
        conn.close()
        return data
    set_clause = ','.join([f"{k} = %s" for k in data.keys()])
    sql = f"UPDATE startup_tasks SET {set_clause} WHERE id = %s"
    try:
        cur.execute(sql, list(data.values()) + [task_id])
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_startup_task error: {e}')
    finally:
        cur.close()
        conn.close()
    return {**data, 'id': task_id}

def delete_startup_task(task_id):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM startup_tasks WHERE id = %s', (task_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] delete_startup_task error: {e}')
    finally:
        cur.close()
        conn.close()


# ========== startup_logs ==========

def get_startup_logs():
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    cur.execute('SELECT * FROM startup_logs ORDER BY executed_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def insert_startup_log(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO startup_logs ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_startup_log error: {e}')
    finally:
        cur.close()
        conn.close()
    return data


# ========== findings ==========

def get_findings(project_id=None, center_id=None, status=None):
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    conditions = []
    vals = []
    if project_id:
        conditions.append('project_id = %s')
        vals.append(project_id)
    if center_id:
        conditions.append('center_id = %s')
        vals.append(center_id)
    if status:
        conditions.append('status = %s')
        vals.append(status)
    where = ' AND '.join(conditions) if conditions else '1=1'
    sql = f'SELECT * FROM findings WHERE {where} ORDER BY created_at'
    cur.execute(sql, vals)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def get_findings_all():
    conn = get_connection()
    if conn is None:
        return []
    cur = conn.cursor()
    cur.execute('SELECT * FROM findings ORDER BY created_at')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [serialize_row(r) for r in rows]

def insert_finding(data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    fields = list(data.keys())
    vals = [data.get(f) for f in fields]
    placeholders = ','.join(['%s'] * len(fields))
    sql = f"INSERT INTO findings ({','.join(fields)}) VALUES ({placeholders})"
    try:
        cur.execute(sql, vals)
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] insert_finding error: {e}')
    finally:
        cur.close()
        conn.close()
    return data

def update_finding(finding_id, data):
    conn = get_connection()
    if conn is None:
        return data
    cur = conn.cursor()
    data = {k: v for k, v in data.items() if k != 'id' and k != 'created_at'}
    if not data:
        cur.close()
        conn.close()
        return data
    set_clause = ','.join([f"{k} = %s" for k in data.keys()])
    sql = f"UPDATE findings SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
    try:
        cur.execute(sql, list(data.values()) + [finding_id])
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] update_finding error: {e}')
    finally:
        cur.close()
        conn.close()
    return {**data, 'id': finding_id}

def delete_finding(finding_id):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM findings WHERE id = %s', (finding_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] delete_finding error: {e}')
    finally:
        cur.close()
        conn.close()


# ========== status KV ==========

def get_status_kv(key):
    conn = get_connection()
    if conn is None:
        return None
    cur = conn.cursor()
    cur.execute('SELECT value FROM status_kv WHERE key = %s', (key,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row and row.get('value'):
        val = row['value']
        if isinstance(val, str):
            return json.loads(val)
        return val
    return None

def set_status_kv(key, value):
    conn = get_connection()
    if conn is None:
        return
    cur = conn.cursor()
    val_json = json.dumps(value, ensure_ascii=False)
    sql = '''
        INSERT INTO status_kv (key, value, updated_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = %s, updated_at = CURRENT_TIMESTAMP
    '''
    try:
        cur.execute(sql, (key, val_json, val_json))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f'[DB] set_status_kv error: {e}')
    finally:
        cur.close()
        conn.close()
