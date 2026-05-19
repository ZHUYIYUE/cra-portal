#!/bin/bash
# 测试Flask应用
cd ~/.qclaw/workspace/cra-portal
python3 -c "
from app import app
with app.test_client() as client:
    # 测试主页
    resp = client.get('/')
    print('主页测试:', '✓' if resp.status_code == 200 else '✗')
    
    # 测试API
    resp = client.get('/api/projects')
    print('API测试:', '✓' if resp.status_code == 200 else '✗')
    print('返回数据:', resp.get_json())
"
