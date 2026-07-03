// ========== 项目页面 + 项目详情 + 中心列表 + 新建/编辑项目 ==========

window.loadProjects = async function(content) {
    content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-folder-open"></i> 项目管理</div></div><p style="color:#999;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> 加载中...</p>`;
    
    try {
        const res = await fetch('/api/projects');
        const data = await res.json();
        if (window.state) {
            window.state.projects = data.projects || [];
        }
        
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-folder-open"></i> 项目管理
                    <button class="btn btn-primary" onclick="window.showCreateProject()" style="margin-left:auto;">
                        <i class="fas fa-plus"></i> 新建项目
                    </button>
                </div>
            </div>
            <div class="projects-grid" id="projectsGrid"></div>
        `;

        const projects = window.state ? window.state.projects : [];
        if (projects.length === 0) {
            document.getElementById('projectsGrid').innerHTML = '<p style="color:#999;grid-column:1/-1;">暂无项目，点击上方按钮创建</p>';
        } else {
            document.getElementById('projectsGrid').innerHTML = projects.map(p => `
            <div class="project-card" onclick="window.viewProject('${p.id}')" style="background:white;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3 style="color:#2c3e50;margin-bottom:10px;font-size:1.1em;"><i class="fas fa-folder"></i> ${(p.name && p.name.trim()) ? window.escHtml(p.name) : '未命名项目'}</h3>
                    <button class="btn-icon" onclick="event.stopPropagation();window.confirmDeleteProject('${p.id}','${window.escHtml(p.name || '未命名')}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                </div>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">编号: ${window.escHtml(p.code || '未设置')}</p>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">中心: ${p.center_count || 0} 个 | 待办: ${p.task_count || 0} 项</p>
                <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${window.escHtml(p.stage || '未知阶段')}</span>
                ${p.dbl_date ? `<br><small style="color:#e74c3c;">⚠️ DBL: ${window.escHtml(p.dbl_date)}</small>` : ''}
            </div>
        `).join('');
        }
    } catch (err) {
        console.error('loadProjects error:', err);
        content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> 项目加载失败</div><p style="padding:20px;color:#e74c3c;">${err.message}</p><button class="btn btn-primary" onclick="window.loadProjects(content)">重试</button></div>`;
    }
};

window.viewProject = async function(projectId) {
    const res = await fetch(`/api/project/${projectId}`);
    const data = await res.json();
    if (!data.success) { alert('加载失败'); return; }
    
    if (window.state) {
        window.state.currentProject = data;
    }
    const p = data;
    
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <button class="btn btn-text" onclick="window.navigateTo('projects')"><i class="fas fa-arrow-left"></i> 返回</button>
                <span style="flex:1;text-align:center;font-size:1.2em;"><i class="fas fa-folder"></i> ${window.escHtml(p.name)}</span>
                <button class="btn btn-primary" onclick="window.showEditProject('${projectId}')"><i class="fas fa-edit"></i> 编辑</button>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item"><label>项目编号</label><span>${window.escHtml(p.code || '未设置')}</span></div>
                <div class="detail-item"><label>当前阶段</label><span>${window.escHtml(p.stage)}</span></div>
                <div class="detail-item"><label>中心数量</label><span>${p.center_count || 0} 家</span></div>
                <div class="detail-item"><label>DBL日期</label><span style="${p.dbl_date ? 'color:#e74c3c;font-weight:bold;' : ''}">${p.dbl_date || '未设置'}</span></div>
            </div>
            ${p.notes ? `<div style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;"><strong>备注：</strong>${window.escHtml(p.notes).replace(/\n/g,'<br>')}</div>` : ''}
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-hospital"></i> 中心列表 (${p.center_count || 0} 家)
                <button class="btn btn-primary btn-sm" onclick="window.showAddCenterModal('${projectId}')" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 添加中心
                </button>
            </div>
            <div id="projectCenters"></div>
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-tasks"></i> 待办事项
                <button class="btn btn-primary btn-sm" onclick="window.showAddTaskForProject('${projectId}')" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 新建
                </button>
            </div>
            <div id="projectTasks"></div>
        </div>
    `;
    
    await window.loadProjectTasks(projectId);
    await window.loadProjectCenters(projectId);
};

window.loadProjectCenters = async function(projectId) {
    try {
        const res = await fetch(`/api/centers?project_id=${projectId}`);
        const data = await res.json();
        if (data.success) {
            const el = document.getElementById('projectCenters');
            if (el) el.dataset.projectId = projectId;
            window.renderCenters(data.centers, projectId);
        }
    } catch (err) {
        console.error('加载中心失败:', err);
    }
};

window.renderCenters = function(centers, projectId) {
    const el = document.getElementById('projectCenters');
    if (!el) return;
    
    if (!centers || centers.length === 0) {
        el.innerHTML = '<p style="color:#999;padding:10px;">暂无中心信息</p>';
        return;
    }
    
    el.innerHTML = centers.map(c => {
        const ms = Array.isArray(c.milestones) ? c.milestones : [];
        const done = ms.filter(m => m.done).length;
        const total = ms.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        
        // 状态色条 — 100%绿 ≥50%橙 有Open问题红 其他蓝
        const hasOpenIssue = (c.open_finding_count || 0) > 0;
        const borderColor = pct === 100 ? '#27ae60' : hasOpenIssue ? '#e74c3c' : pct >= 50 ? '#f39c12' : '#3498db';
        
        // 任务/问题状态
        const taskCount = c.task_count || 0;
        const openFindings = c.open_finding_count || 0;
        const findingCount = c.finding_count || 0;
        
        // PI 信息
        const piName = c.pi_name || c.pi || '';
        const dept = c.department || '';
        
        return `
        <div class="center-card" style="border-left:4px solid ${borderColor};">
            <div class="center-card-header" onclick="window.toggleCenterDetail('${c.id}')">
                <div class="center-card-title">
                    <strong class="center-link" onclick="event.stopPropagation();window.openCenterDetail('${c.id}')">${window.escHtml(c.code)} ${window.escHtml(c.name)}</strong>
                    ${piName || dept ? `<span class="center-meta">${piName ? '<i class="fas fa-user-md"></i> '+window.escHtml(piName) : ''}${piName && dept ? ' · ' : ''}${dept ? window.escHtml(dept) : ''}</span>` : ''}
                </div>
                <div class="center-card-right">
                    ${total > 0 ? `<span class="center-pct ${pct === 100 ? 'pct-green' : pct >= 50 ? 'pct-orange' : 'pct-blue'}">${pct}%</span>` : '<span class="center-pct pct-gray">—</span>'}
                    <i class="fas fa-chevron-down" id="icon-${c.id}" style="color:#ccc;font-size:0.8em;transition:transform .2s;"></i>
                </div>
            </div>
            
            <div class="center-card-stats">
                <div class="cstat ${taskCount > 0 ? 'cstat-warn' : ''}">
                    <span class="cstat-icon">📋</span>
                    <span class="cstat-num">${taskCount}</span>
                    <span class="cstat-label">待办</span>
                </div>
                <div class="cstat ${openFindings > 0 ? 'cstat-danger' : ''}">
                    <span class="cstat-icon">⚠️</span>
                    <span class="cstat-num">${openFindings}</span>
                    <span class="cstat-label">问题</span>
                </div>
                <div class="cstat">
                    <span class="cstat-icon">✅</span>
                    <span class="cstat-num">${done}</span>
                    <span class="cstat-label">/${total} 里程碑</span>
                </div>
            </div>
            
            <div id="detail-${c.id}" class="center-card-detail">
                ${total > 0 ? `
                <div class="milestone-list">
                    ${ms.map((m, i) => {
                        const isOverdue = !m.done && m.date && new Date(m.date) < new Date();
                        const dateStr = m.date ? m.date.slice(5) : '';
                        return `
                        <div class="milestone-item ${m.done ? 'ms-done' : isOverdue ? 'ms-overdue' : ''}" >
                            <input type="checkbox" ${m.done ? 'checked' : ''} 
                                onclick="event.stopPropagation(); window.toggleMilestone('${c.id}', ${i}, this.checked)" />
                            <span class="ms-name">${window.escHtml(m.name)}</span>
                            <span class="ms-date ${isOverdue ? 'ms-date-overdue' : ''}">${dateStr}${isOverdue ? ' ⚠️' : ''}${m.done && m.actual_date ? ' ✅'+m.actual_date.slice(5) : ''}</span>
                        </div>`;
                    }).join('')}
                </div>` : '<div class="ms-empty"><i class="fas fa-inbox"></i> 暂无里程碑</div>'}
            </div>
        </div>`;
    }).join('');
};

window.toggleCenterDetail = function(centerId) {
    const el = document.getElementById('detail-' + centerId);
    const icon = document.getElementById('icon-' + centerId);
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (icon) icon.className = 'fas fa-chevron-up';
    } else {
        el.style.display = 'none';
        if (icon) icon.className = 'fas fa-chevron-down';
    }
};

window.toggleMilestone = async function(centerId, idx, done) {
    try {
        const res = await fetch(`/api/center/${centerId}/milestone/${idx}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({done: done})
        });
        const data = await res.json();
        if (data.success) {
            const currentProjectId = document.getElementById('projectCenters')?.dataset?.projectId;
            if (currentProjectId) window.loadProjectCenters(currentProjectId);
        }
    } catch(e) {
        console.error('更新里程碑失败:', e);
    }
};

window.showAddCenterModal = function(projectId) {
    const code = prompt('中心编号（如：01）:');
    if (!code) return;
    const name = prompt('中心名称:');
    if (!name) return;
    
    fetch('/api/centers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({project_id: projectId, code: code, name: name})
    }).then(r => r.json()).then(data => {
        if (data.success) {
            window.showToast('中心添加成功');
            window.loadProjectCenters(projectId);
        }
    });
};

window.deleteCenter = async function(centerId, projectId) {
    if (!confirm('确定删除该中心？')) return;
    try {
        const res = await fetch(`/api/center/${centerId}`, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) {
            window.showToast('已删除');
            window.loadProjectCenters(projectId);
        }
    } catch (err) {
        console.error(err);
    }
};

// ========== 新建项目 ==========

window.showCreateProject = function() {
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-plus-circle"></i> 新建项目</h3></div>
        <form onsubmit="return window.submitCreateProject(event)">
            <div class="form-group">
                <label>项目名称 *</label>
                <input type="text" name="name" required placeholder="例：JMKX003142-H201" autofocus>
            </div>
            <div class="form-group">
                <label>项目编号/简称</label>
                <input type="text" name="code" placeholder="例：3142iv">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>负责中心数</label>
                    <input type="number" name="center_count" value="5" min="0">
                </div>
                <div class="form-group">
                    <label>当前阶段</label>
                    <select name="stage">
                        <option value="进行中">进行中</option>
                        <option value="SSU阶段">SSU阶段</option>
                        <option value="关中心准备">关中心准备</option>
                        <option value="已结束">已结束</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>DBL日期（数据库锁定）</label>
                <input type="date" name="dbl_date">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3" placeholder="关键节点、注意事项等..."></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 创建</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
};

window.submitCreateProject = async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        code: form.code.value,
        center_count: parseInt(form.center_count.value) || 0,
        stage: form.stage.value,
        dbl_date: form.dbl_date.value,
        notes: form.notes.value
    };
    
    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
        window.closeModal();
        alert('✅ 项目创建成功！');
        window.navigateTo('projects');
    } else {
        alert('❌ 创建失败：' + (result.error || '未知错误'));
    }
};

// ========== 编辑项目 ==========

window.showEditProject = function(projectId) {
    const p = window.state && window.state.currentProject;
    if (!p || p.id !== projectId) {
        fetch(`/api/project/${projectId}`).then(r=>r.json()).then(d=>{
            if (window.state) {
                window.state.currentProject = d;
            }
            window.renderEditForm(d);
        });
        return;
    }
    window.renderEditForm(p);
};

window.renderEditForm = function(p) {
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-edit"></i> 编辑项目</h3></div>
        <form onsubmit="return window.submitEditProject(event, '${p.id}')">
            <div class="form-group">
                <label>项目名称 *</label>
                <input type="text" name="name" required value="${window.escAttr(p.name)}">
            </div>
            <div class="form-group">
                <label>项目编号/简称</label>
                <input type="text" name="code" value="${window.escAttr(p.code || '')}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>负责中心数</label>
                    <input type="number" name="center_count" value="${p.center_count || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>当前阶段</label>
                    <select name="stage">
                        <option value="进行中" ${p.stage==='进行中'?'selected':''}>进行中</option>
                        <option value="SSU阶段" ${p.stage==='SSU阶段'?'selected':''}>SSU阶段</option>
                        <option value="关中心准备" ${p.stage==='关中心准备'?'selected':''}>关中心准备</option>
                        <option value="已结束" ${p.stage==='已结束'?'selected':''}>已结束</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>DBL日期</label>
                <input type="date" name="dbl_date" value="${window.escAttr(p.dbl_date || '')}">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3">${window.escAttr(p.notes || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> 保存</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
};

window.submitEditProject = async function(e, projectId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        code: form.code.value,
        center_count: parseInt(form.center_count.value) || 0,
        stage: form.stage.value,
        dbl_date: form.dbl_date.value,
        notes: form.notes.value
    };
    
    const res = await fetch(`/api/project/${projectId}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
        window.closeModal();
        alert('✅ 保存成功！');
        window.viewProject(projectId);
    } else {
        alert('❌ 保存失败：' + (result.error || '未知错误'));
    }
};

// ========== 删除项目确认 ==========

window.confirmDeleteProject = function(id, name) {
    if (confirm(`确定要删除项目「${name}」吗？\n关联的待办事项也会被删除，此操作不可恢复。`)) {
        fetch(`/api/project/${id}`, {method:'DELETE'}).then(r=>r.json()).then(result=>{
            if (result.success) {
                alert('✅ 已删除');
                window.navigateTo('projects');
            } else {
                alert('❌ 删除失败');
            }
        });
    }
};

// ========== 加载项目任务 ==========

window.loadProjectTasks = async function(projectId) {
    const container = document.getElementById('projectTasks');
    if (!container) return;
    
    const res = await fetch(`/api/tasks?project_id=${projectId}`);
    const data = await res.json();
    const tasks = data.tasks || [];
    
    if (tasks.length === 0) {
        container.innerHTML = '<p style="color:#999;">暂无待办事项</p>';
        return;
    }
    
    container.innerHTML = tasks.map(t => {
        const taskStatus = t.task_status || 'pending';
        const isWaitingCrc = taskStatus === 'waiting_crc' && !t.done;
        return `
        <div class="task-item ${t.done ? 'task-done' : ''}" id="task-${t.id}" data-status="${taskStatus}">
            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="window.toggleTaskDone('${t.id}', ${!t.done})">
            <div class="task-content" onclick="window.viewTaskDetail('${t.id}')">
                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${window.escHtml(t.title)}</h4>
                <p class="task-meta">
                    ${isWaitingCrc ? `<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px;">跟进CRC</span>` : ''}
                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${window.escHtml(t.center_name)} ·` : ''}
                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${window.ABILITY_ICONS[t.ability_type || 'execution']} ${window.ABILITY_LABELS[t.ability_type || 'execution']}</span> ·
                    ${t.due_date ? `<i class="far fa-calendar"></i> ${t.due_date}` : ''}
                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                </p>
            </div>
            <button class="btn-icon" onclick="event.stopPropagation();window.showEditTask('${t.id}')" title="编辑"><i class="fas fa-edit" style="color:#3498db;"></i></button>
            <button class="btn-icon" onclick="event.stopPropagation();window.deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
        </div>
    `}).join('');
};
