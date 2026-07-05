#!/usr/bin/env python3
"""
CRA Portal 数据库备份脚本
将 PostgreSQL 数据库所有表导出为 JSON 文件

使用方法:
  python3 backup_db.py              # 备份到 backups/YYYY-MM-DD.json
  python3 backup_db.py --output my_backup.json  # 指定输出文件
"""

import os
import json
import argparse
from datetime import datetime
from db import get_connection

def backup_database(output_path):
    """备份所有表到 JSON 文件"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # 获取所有表名
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    backup_data = {
        "backup_time": datetime.now().isoformat(),
        "tables": {}
    }
    
    # 逐个表导出数据
    for table in tables:
        cursor.execute(f"SELECT * FROM {table}")
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        backup_data["tables"][table] = {
            "columns": columns,
            "rows": [dict(zip(columns, row)) for row in rows]
        }
        print(f"  ✓ {table}: {len(rows)} 条记录")
    
    # 写入文件
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
    
    file_size = os.path.getsize(output_path) / 1024  # KB
    print(f"\n✓ 备份完成: {output_path} ({file_size:.1f} KB)")
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='备份 CRA Portal 数据库')
    parser.add_argument('--output', '-o', help='输出文件路径（默认: backups/YYYY-MM-DD.json）')
    args = parser.parse_args()
    
    # 确定输出路径
    if args.output:
        output_path = args.output
    else:
        os.makedirs('backups', exist_ok=True)
        today = datetime.now().strftime('%Y-%m-%d')
        output_path = f'backups/{today}.json'
    
    print(f"开始备份数据库...")
    print(f"  输出: {output_path}\n")
    
    backup_database(output_path)
