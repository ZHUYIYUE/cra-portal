#!/usr/bin/env python3
"""
CRA Portal - 数据迁移脚本
从线上 Render API 拉取数据，导入 Supabase 数据库

使用方法：
  1. 先在 Supabase SQL Editor 运行 supabase/schema.sql 创建表
  2. 设置环境变量：
     export SUPABASE_URL=https://xxx.supabase.co
     export SUPABASE_KEY=eyJxxx...
     export SOURCE_URL=https://cra-portal.onrender.com
  3. 运行：python migrate_data.py
"""

import os
import sys
import json
import requests
from supabase import create_client

# 配置
SOURCE_URL = os.environ.get("SOURCE_URL", "https://cra-portal.onrender.com")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 请设置 SUPABASE_URL 和 SUPABASE_KEY 环境变量")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_api(path):
    """从源 API 获取数据"""
    url = f"{SOURCE_URL}{path}"
    print(f"  ⬇️  获取 {path} ...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def migrate_projects():
    """迁移项目"""
    print("\n📋 迁移项目...")
    data = fetch_api("/api/projects")
    if not data.get("success"):
        print("  ❌ 获取项目失败")
        return 0

    count = 0
    for p in data["projects"]:
        row = {
            "id": p["id"],
            "name": p["name"],
            "code": p.get("code", ""),
            "stage": p.get("stage", ""),
            "dbl_date": p.get("dbl_date", ""),
            "notes": p.get("notes", ""),
            "created_at": p.get("created_at", ""),
            "updated_at": p.get("updated_at", "")
        }
        sb.table("projects").upsert(row).execute()
        count += 1
        print(f"  ✅ 项目: {p['name']} ({p['id']})")

    print(f"  📊 共迁移 {count} 个项目")
    return count


def migrate_centers():
    """迁移中心"""
    print("\n🏥 迁移中心...")
    data = fetch_api("/api/centers")
    if not data.get("success"):
        print("  ❌ 获取中心失败")
        return 0

    count = 0
    for c in data["centers"]:
        row = {
            "id": c["id"],
            "project_id": c["project_id"],
            "code": c.get("code", ""),
            "name": c["name"],
            "department": c.get("department", ""),
            "address": c.get("address", ""),
            "pi_name": c.get("pi_name", ""),
            "pi_phone": c.get("pi_phone", ""),
            "pi_email": c.get("pi_email", ""),
            "contact_crc": c.get("contact_crc", ""),
            "contact_crc_phone": c.get("contact_crc_phone", ""),
            "contact_ethics": c.get("contact_ethics", ""),
            "milestones": c.get("milestones", {}),
            "notes": c.get("notes", ""),
            "created_at": c.get("created_at", ""),
            "updated_at": c.get("updated_at", "")
        }
        sb.table("centers").upsert(row).execute()
        count += 1
        print(f"  ✅ 中心: {c.get('code', '')} {c['name']} ({c['id']})")

    print(f"  📊 共迁移 {count} 个中心")
    return count


def migrate_tasks():
    """迁移任务"""
    print("\n📝 迁移待办事项...")
    data = fetch_api("/api/tasks")
    if not data.get("success"):
        print("  ❌ 获取任务失败")
        return 0

    count = 0
    for t in data["tasks"]:
        row = {
            "id": t["id"],
            "title": t["title"],
            "project_id": t["project_id"],
            "center_id": t.get("center_id", "") or "",
            "priority": t.get("priority", "medium"),
            "ability_type": t.get("ability_type", "execution"),
            "due_date": t.get("due_date", "") or "",
            "done": t.get("done", False),
            "task_status": t.get("task_status", "pending"),
            "created_at": t.get("created_at", "")
        }
        sb.table("tasks").upsert(row).execute()
        count += 1
        print(f"  ✅ 任务: {t['title'][:30]}... ({t['id']})")

    print(f"  📊 共迁移 {count} 个任务")
    return count


def migrate_findings():
    """迁移监查问题"""
    print("\n🔍 迁移监查问题...")
    data = fetch_api("/api/findings")
    if not data.get("success"):
        print("  ❌ 获取监查问题失败")
        return 0

    count = 0
    for f in data["findings"]:
        row = {
            "id": f["id"],
            "project_id": f["project_id"],
            "center_id": f.get("center_id", "") or "",
            "category": f.get("category", ""),
            "description": f["description"],
            "severity": f.get("severity", "Minor"),
            "status": f.get("status", "Open"),
            "found_date": f.get("found_date", "") or "",
            "due_date": f.get("due_date", "") or "",
            "corrective_action": f.get("corrective_action", "") or "",
            "finding_number": f.get("finding_number", "") or "",
            "created_at": f.get("created_at", ""),
            "updated_at": f.get("updated_at", "")
        }
        sb.table("findings").upsert(row).execute()
        count += 1
        print(f"  ✅ 问题: {f['description'][:30]}... ({f['id']})")

    print(f"  📊 共迁移 {count} 个监查问题")
    return count


def main():
    print("=" * 50)
    print("CRA Portal 数据迁移工具")
    print(f"源地址: {SOURCE_URL}")
    print(f"目标: Supabase ({SUPABASE_URL})")
    print("=" * 50)

    total = 0
    total += migrate_projects()
    total += migrate_centers()
    total += migrate_tasks()
    total += migrate_findings()

    print("\n" + "=" * 50)
    print(f"✅ 迁移完成！共迁移 {total} 条记录")
    print("=" * 50)

    # 验证
    print("\n🔍 验证数据...")
    for table in ["projects", "centers", "tasks", "findings"]:
        result = sb.table(table).select("*", count="exact").execute()
        print(f"  {table}: {result.count} 条")


if __name__ == "__main__":
    main()
