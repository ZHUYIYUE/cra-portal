// CRA Portal 前端逻辑 - 完整版

// 全局状态
const state = {
    currentPage: 'dashboard',
    projects: [],
    tasks: []
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });
    
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('show');
    });
    
    // 点击模态框外部关闭
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    navigateTo('dashboard');
}

// ========== 页面导航 ==========
async function navigateTo(page) {
    state.currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    const titles = { dashboard: '总览', projects: '项目', tasks: '待办事项' };
    document.getElementById('pageTitle').textContent = titles[page] || '总览';
    
    showLoading();
    try {
        await loadPage(page);
    } catch (error) {
        console.error('加载失败:', error);
        showError('加载失败，请刷新重试');
    } finally {
        hideLoading();
    }
}

async function loadPage(page) {
    const content = document.getElementById('pageContent');
    switch(page) {
        case 'dashboard': await loadDashboard(content); break;
        case 'projects': await loadProjects(content); break;
        case 'tasks': await loadTasks(content); break;
    }
}

// ========== 总览页面 ==========
async function loadDashboard(content) {
    const [statsRes, projectsRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/projects')
    ]);
    const stats = await statsRes.json();
    const projData = await projectsRes.json();
    
    state.projects = projData.projects || [];
    
    const s = stats.stats || {};
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card stat-blue">
                <i class="fas fa-folder-open"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.total_projects || 0}</span>
                    <span class="stat-label">项目总数</span>
                </div>
            </div>
            <div class="stat-card stat-green">
                <i class="fas fa-play-circle"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.active_projects || 0}</span>
                    <span class="stat-label">进行中</span>
                </div>
            </div>
            <div class="stat-card stat-orange">
                <i class="fas fa-tasks"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.pending_tasks || 0}</span>
                    <span class="stat-label">待办事项</span>
                </div>
            </div>
            <div class="stat-card stat-red">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.high_priority || 0}</span>
                    <span class="stat-label">高优先级</span>
                </div>
            </div>
        </div>

        ${s.due_soon > 0 ? `<div class="alert-banner"><i class="fas fa-clock"></i> 有 <strong>${s.due_soon}</strong> 个任务将在7天内到期！</div>` : ''}

        <div class="card">
            <div class="card-header"><i class="fas fa-folder"></i> 项目列表</div>
            <div class="projects-grid">
                ${(state.projects.length === 0 ? '<p style="color:#999;grid-column:1/-1;">暂无项目，去"项目"页面创建一个吧</p>' :
                    state.projects.map(p => `
                        <div class="project-card" onclick="viewProject('${p.id}')">
                            <h3><i class="fas fa-folder"></i> ${escHtml(p.name)}</h3>
                            <p>编号: ${escHtml(p.code || '未设置')}</p>
                            <p>中心: ${p.center_count || 0} 个</p>
                            <p>待办: ${p.task_count || 0} 项</p>
                            <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${escHtml(p.stage)}</span>
                            ${p.dbl_date ? `<small style="color:#e74c3c;">DBL: ${escHtml(p.dbl_date)}</small>` : ''}
                        </div>
                    `).join('')
                )}
            </div>
        </div>
    `;
}

// ========== 项目页面 ==========
async function loadProjects(content) {
    const res = await fetch('/api/projects');
    const data = await res.json();
    state.projects = data.projects || [];
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-folder-open"></i> 项目管理
                <button class="btn btn-primary" onclick="showCreateProject()" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 新建项目
                </button>
            </div>
        </div>
        <div class="projects-grid">
            ${state.projects.length === 0 ?
                '<p style="color:#999;grid-column:1/-1;">暂无项目，点击上方按钮创建</p>' :
                state.projects.map(p => `
                    <div class="project-card" onclick="viewProject('${p.id}')">
                        <div style="display:flex;justify-content:space-between;align-items:start;">
                            <h3><i class="fas fa-folder"></i> ${escHtml(p.name)}</h3>
                            <button class="btn-icon" onclick="event.stopPropagation();confirmDeleteProject('${p.id}','${escHtml(p.name)}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                        </div>
                        <p>编号: ${escHtml(p.code || '未设置')}</p>
                        <p>中心: ${p.center_count || 0} 个 | 待办: ${p.task_count || 0} 项</p>
                        <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${escHtml(p.stage)}</span>
                        ${p.dbl_date ? `<br><small style="color:#e74c3c;">⚠️ DBL: ${escHtml(p.dbl_date)}</small>` : ''}
                    </div>
                `).join('')
            )}
        </div>
    `;
}

// ========== 查看项目详情 ==========
async function viewProject(projectId) {
    const res = await fetch(`/api/project/${projectId}`);
    const data = await res.json();
    if (!data.success) { alert('加载失败'); return; }
    
    state.currentProject = data;
    const p = data;
    
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <button class="btn btn-text" onclick="navigateTo('projects')"><i class="fas fa-arrow-left"></i> 返回</button>
                <span style="flex:1;text-align:center;font-size:1.2em;"><i class="fas fa-folder"></i> ${escHtml(p.name)}</span>
                <button class="btn btn-primary" onclick="showEditProject('${projectId}')"><i class="fas fa-edit"></i> 编辑</button>
            </div>
            
            <div class="detail-grid">
                <div class="detail-item"><label>项目编号</label><span>${escHtml(p.code || '未设置')}</span></div>
                <div class="detail-item"><label>当前阶段</label><span>${escHtml(p.stage)}</span></div>
                <div class="detail-item"><label>中心数量</label><span>${p.center_count || 0} 家</span></div>
                <div class="detail-item"><label>DBL日期</label><span style="${p.dbl_date ? 'color:#e74c3c;font-weight:bold;' : ''}">${p.dbl_date || '未设置'}</span></div>
            </div>
            ${p.notes ? `<div style="margin-top:15px;padding:15px;background:#f8f9fa;border-radius:8px;"><strong>备注：</strong>${escHtml(p.notes).replace(/\n/g,'<br>')}</div>` : ''}
        </div>

        <div class="card">
            <div class="card-header">
                <i class="fas fa-tasks"></i> 待办事项
                <button class="btn btn-primary btn-sm" onclick="showAddTaskForProject('${projectId}')" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 新建
                </button>
            </div>
            <div id="projectTasks"></div>
        </div>
    `;
    
    // 加载项目任务
    await loadProjectTasks(projectId);
}

async function loadProjectTasks(projectId) {
    const container = document.getElementById('projectTasks');
    if (!container) return;
    
    const res = await fetch(`/api/tasks?project_id=${projectId}`);
    const data = await res.json();
    const tasks = data.tasks || [];
    
    if (tasks.length === 0) {
        container.innerHTML = '<p style="color:#999;">暂无待办事项</p>';
        return;
    }
    
    container.innerHTML = tasks.map(t => `
        <div class="task-item ${t.done ? 'task-done' : ''}" id="task-${t.id}">
            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${t.id}', ${!t.done})">
            <div class="task-content" onclick="viewTaskDetail('${t.id}')">
                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${escHtml(t.title)}</h4>
                <p class="task-meta">
                    ${t.due_date ? `<i class="far fa-calendar"></i> ${t.due_date}` : ''}
                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                </p>
            </div>
            <button class="btn-icon" onclick="event.stopPropagation();deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
        </div>
    `).join('');
}

// ========== 待办事项页面 ==========
async function loadTasks(content) {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    state.tasks = data.tasks || [];
    
    const projects = state.projects.length > 0 ? state.projects : 
        (await (await fetch('/api/projects')).json()).projects || [];
    
    // 统计
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    const pending = total - done;
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-tasks"></i> 待办事项
                <span style="margin-left:auto;color:#666;font-size:0.9em;">${done}/${total} 已完成</span>
                <button class="btn btn-primary" onclick="showAddTask()" style="margin-left:10px;">
                    <i class="fas fa-plus"></i> 新建待办
                </button>
            </div>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
            <button class="filter-btn active" onclick="filterTasks(this, 'all')">全部 (${total})</button>
            <button class="filter-btn" onclick="filterTasks(this, 'pending')">待完成 (${pending})</button>
            <button class="filter-btn" onclick="filterTasks(this, 'done')">已完成 (${done})</button>
        </div>

        <div class="task-list" id="taskList">
            ${state.tasks.length === 0 ? '<p style="color:#999;padding:20px;">暂无待办事项</p>' :
                state.tasks.map(t => {
                    const proj = projects.find(p => p.id === t.project_id);
                    return `
                        <div class="task-item ${t.done ? 'task-done' : ''}" data-task-id="${t.id}" data-done="${t.done}">
                            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${t.id}', ${!t.done})">
                            <div class="task-content" onclick="viewTaskDetail('${t.id}')">
                                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${escHtml(t.title)}</h4>
                                <p class="task-meta">
                                    ${proj ? `<i class="fas fa-folder"></i> ${escHtml(proj.name)} ·` : ''}
                                    ${t.due_date ? `<i class="far fa-calendar"></i> ${t.due_date}` : '无截止日期'}
                                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                                </p>
                            </div>
                            <button class="btn-icon" onclick="event.stopPropagation();deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
                        </div>
                    `;
                }).join('')
            }
        </div>
    `;
}

function filterTasks(btn, filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('#taskList .task-item').forEach(item => {
        const done = item.dataset.done === 'true';
        if (filter === 'all') item.style.display = '';
        else if (filter === 'pending') item.style.display = done ? 'none' : '';
        else if (filter === 'done') item.style.display = done ? '' : 'none';
    });
}

// ========== 模态框操作 ==========

function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// 新建项目
function showCreateProject() {
    openModal(`
        <div class="modal-header"><h3><i class="fas fa-plus-circle"></i> 新建项目</h3></div>
        <form onsubmit="return submitCreateProject(event)">
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
                <button type="button" class="btn" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
}

async function submitCreateProject(e) {
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
        closeModal();
        alert('✅ 项目创建成功！');
        navigateTo('projects');
    } else {
        alert('❌ 创建失败：' + (result.error || '未知错误'));
    }
}

// 编辑项目
function showEditProject(projectId) {
    const p = state.currentProject;
    if (!p || p.id !== projectId) {
        fetch(`/api/project/${projectId}`).then(r=>r.json()).then(d=>{
            state.currentProject = d;
            renderEditForm(d);
        });
        return;
    }
    renderEditForm(p);
}

function renderEditForm(p) {
    openModal(`
        <div class="modal-header"><h3><i class="fas fa-edit"></i> 编辑项目</h3></div>
        <form onsubmit="return submitEditProject(event, '${p.id}')">
            <div class="form-group">
                <label>项目名称 *</label>
                <input type="text" name="name" required value="${escAttr(p.name)}">
            </div>
            <div class="form-group">
                <label>项目编号/简称</label>
                <input type="text" name="code" value="${escAttr(p.code || '')}">
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
                <input type="date" name="dbl_date" value="${escAttr(p.dbl_date || '')}">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3">${escAttr(p.notes || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> 保存</button>
                <button type="button" class="btn" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
}

async function submitEditProject(e, projectId) {
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
        closeModal();
        alert('✅ 保存成功！');
        viewProject(projectId);
    } else {
        alert('❌ 保存失败：' + (result.error || '未知错误'));
    }
}

// 删除项目确认
function confirmDeleteProject(id, name) {
    if (confirm(`确定要删除项目「${name}」吗？\n关联的待办事项也会被删除，此操作不可恢复。`)) {
        fetch(`/api/project/${id}`, {method:'DELETE'}).then(r=>r.json()).then(result=>{
            if (result.success) {
                alert('✅ 已删除');
                navigateTo('projects');
            } else {
                alert('❌ 删除失败');
            }
        });
    }
}

// 新建待办（全局）
function showAddTask() {
    renderTaskForm('', '新建待办事项');
}

// 为指定项目新建待办
function showAddTaskForProject(projectId) {
    renderTaskForm(projectId, '新建待办事项');
}

function renderTaskForm(projectId, title) {
    openModal(`
        <div class="modal-header"><h3><i class="fas fa-plus-circle"></i> ${title}</h3></div>
        <form onsubmit="return submitCreateTask(event)">
            <div class="form-group">
                <label>任务标题 *</label>
                <input type="text" name="title" required placeholder="例：上传伦理批件到eTMF" autofocus>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>所属项目</label>
                    <select name="project_id">
                        <option value="">不关联项目</option>
                        ${(state.projects || []).map(p => `<option value="${p.id}" ${p.id===projectId?'selected':''}>${escHtml(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select name="priority">
                        <option value="high">🔴 高</option>
                        <option value="medium" selected>🟡 中</option>
                        <option value="low">🟢 低</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>截止日期</label>
                <input type="date" name="due_date">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 创建</button>
                <button type="button" class="btn" onclick="closeModal()">取消</button>
            </div>
        </form>
    `);
}

async function submitCreateTask(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        title: form.title.value,
        project_id: form.project_id.value,
        priority: form.priority.value,
        due_date: form.due_date.value
    };
    
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
        closeModal();
        alert('✅ 待办创建成功！');
        // 如果在项目详情页，刷新项目；否则刷新待办页
        if (state.currentProject && data.project_id === state.currentProject.id) {
            viewProject(state.currentProject.id);
        } else {
            navigateTo('tasks');
        }
    } else {
        alert('❌ 创建失败');
    }
}

// 切换任务完成状态
async function toggleTaskDone(taskId, newDone) {
    const res = await fetch(`/api/task/${taskId}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({done: newDone})
    });
    const result = await res.json();
    
    if (result.success) {
        // 更新UI
        const el = document.getElementById(`task-${taskId}`);
        if (el) {
            el.classList.toggle('task-done', newDone);
            el.dataset.done = newDone;
            const h4 = el.querySelector('h4');
            if (h4) {
                h4.style.textDecoration = newDone ? 'line-through' : '';
                h4.style.color = newDone ? '#999' : '';
            }
        }
    }
}

// 删除任务
async function deleteTaskById(taskId) {
    if (!confirm('确定删除这个待办事项？')) return;
    
    const res = await fetch(`/api/task/${taskId}`, {method:'DELETE'});
    const result = await res.json();
    
    if (result.success) {
        const el = document.getElementById(`task-${taskId}`);
        if (el) el.remove();
        
        // 如果在项目详情页也刷新一下
        if (state.currentProject) {
            await loadProjectTasks(state.currentProject.id);
        }
    }
}

// 查看任务详情（简单弹窗）
function viewTaskDetail(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const proj = (state.projects || []).find(p => p.id === task.project_id);
    alert(
        `📋 ${task.title}\n\n` +
        `项目：${proj ? proj.name : '未关联'}\n` +
        `优先级：{{high:'高',medium:'中',low:'低'}[task.priority]||task.priority}\n` +
        `截止：${task.due_date || '未设置'}\n` +
        `状态：${task.done ? '✅ 已完成' : '⏳ 进行中'}\n\n` +
        `创建时间：${task.created_at ? task.created_id.slice(0,16) : '未知'}`
    );
}

// ========== 工具函数 ==========

function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showLoading() { document.getElementById('loading').classList.add('show'); }
function hideLoading() { document.getElementById('loading').classList.remove('show'); }

function showError(msg) {
    document.getElementById('pageContent').innerHTML =
        `<div class="card"><p style="color:red;"><i class="fas fa-exclamation-circle"></i> ${msg}</p></div>`;
}
