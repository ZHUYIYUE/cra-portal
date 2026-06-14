// CRA Portal 前端逻辑 - 完整版 + 状态推荐

// 全局状态
const state = {
    currentPage: 'dashboard',
    projects: [],
    tasks: []
};

// ========== 能力分类定义 ==========

const ABILITY_LABELS = {
    deep_focus: '深度专注',
    communication: '沟通协调',
    planning: '规划整理',
    execution: '执行归档',
    learning_review: '学习回顾'
};

const ABILITY_ICONS = {
    deep_focus: '🧠',
    communication: '💬',
    planning: '📋',
    execution: '⚙️',
    learning_review: '📖'
};

const ABILITY_DESC = {
    deep_focus: '写监查报告、审TMF、写合同初稿、做决策',
    communication: '和PI电话、和CRC确认进度、回复邮件、伦理沟通',
    planning: 'PPT制作、整理思路、规划里程碑、列清单',
    execution: '整理eTMF、打印归档、填表、文件质控回复',
    learning_review: '复盘监查经验、阅读方案更新、总结问题'
};

const ENERGY_DESC = {
    high: '精力充沛，脑子清醒',
    medium: '一般状态，能坐住',
    low: '很累/犯困'
};

const CALM_DESC = {
    high: '内心平静',
    medium: '有点事但不影响',
    low: '焦虑/烦躁'
};

// 状态组合说明：解释为什么推荐这些任务类型
const STATUS_EXPLANATION = {
    'high,high':   '⚡🧘 状态很好，什么都能做。挑最优先的任务开干！',
    'high,medium': '⚡🌊 精力充沛，什么都能做。优先处理紧急或有截止日期的任务。',
    'high,low':    '⚡🔥 精力好但有点烦。先做沟通和执行类，避免需要深度思考的工作，等平静些再处理复杂问题。',
    'medium,high': '🔋🧘 状态不错，什么都能做。适合开会、写邮件、处理文件。',
    'medium,medium': '🔋🌊 普通状态，什么都能做。正常推进就好，别挑。',
    'medium,low':   '🔋🔥 有点烦躁，先做执行和沟通类。复杂方案和规划等心情好点再做。',
    'low,high':    '🪫🧘 身体累了但心态还行。适合规划、归档、学习回顾，不做需要快速反应的沟通。',
    'low,medium':  '🪫🌊 累了但还行。做执行、归档、学习类，不强求深度工作。',
    'low,low':      '🪫🔥 状态差。强行工作效率更低，建议休息30分钟再回来。'
};

// ========== 初始化 ==========

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
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        sb.classList.toggle('show');
        ov.classList.toggle('show', sb.classList.contains('show'));
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ========== 页面导航 ==========

async function navigateTo(page) {
    state.currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    const titles = { dashboard: '总览', projects: '项目', tasks: '待办事项', recommend: '状态推荐' };
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
        case 'recommend': await loadRecommend(content); break;
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
    content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-folder-open"></i> 项目管理</div></div><p style="color:#999;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> 加载中...</p>`;
    
    try {
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
            <div class="projects-grid" id="projectsGrid"></div>
        `;

        if (state.projects.length === 0) {
            document.getElementById('projectsGrid').innerHTML = '<p style="color:#999;grid-column:1/-1;">暂无项目，点击上方按钮创建</p>';
        } else {
            document.getElementById('projectsGrid').innerHTML = state.projects.map(p => `
            <div class="project-card" onclick="viewProject('${p.id}')" style="background:white;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3 style="color:#2c3e50;margin-bottom:10px;font-size:1.1em;"><i class="fas fa-folder"></i> ${(p.name && p.name.trim()) ? escHtml(p.name) : '未命名项目'}</h3>
                    <button class="btn-icon" onclick="event.stopPropagation();confirmDeleteProject('${p.id}','${escHtml(p.name || '未命名')}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                </div>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">编号: ${escHtml(p.code || '未设置')}</p>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">中心: ${p.center_count || 0} 个 | 待办: ${p.task_count || 0} 项</p>
                <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${escHtml(p.stage || '未知阶段')}</span>
                ${p.dbl_date ? `<br><small style="color:#e74c3c;">⚠️ DBL: ${escHtml(p.dbl_date)}</small>` : ''}
            </div>
        `).join('');
        }
    } catch (err) {
        console.error('loadProjects error:', err);
        content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> 项目加载失败</div><p style="padding:20px;color:#e74c3c;">${err.message}</p><button class="btn btn-primary" onclick="loadProjects(content)">重试</button></div>`;
    }
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
                <i class="fas fa-hospital"></i> 中心列表 (${p.center_count || 0} 家)
                <button class="btn btn-primary btn-sm" onclick="showAddCenterModal('${projectId}')" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 添加中心
                </button>
            </div>
            <div id="projectCenters"></div>
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
    
    await loadProjectTasks(projectId);
    await loadProjectCenters(projectId);
}

async function loadProjectCenters(projectId) {
    try {
        const res = await fetch(`/api/centers?project_id=${projectId}`);
        const data = await res.json();
        if (data.success) {
            const el = document.getElementById('projectCenters');
            if (el) el.dataset.projectId = projectId;
            renderCenters(data.centers, projectId);
        }
    } catch (err) {
        console.error('加载中心失败:', err);
    }
}

function renderCenters(centers, projectId) {
    const el = document.getElementById('projectCenters');
    if (!el) return;
    
    if (!centers || centers.length === 0) {
        el.innerHTML = '<p style="color:#999;padding:10px;">暂无中心信息</p>';
        return;
    }
    
    el.innerHTML = centers.map(c => {
        const ms = c.milestones || [];
        const done = ms.filter(m => m.done).length;
        const total = ms.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        const barColor = pct === 100 ? '#27ae60' : pct >= 50 ? '#f39c12' : '#3498db';
        
        return `
        <div style="padding:12px;border-bottom:1px solid #eee;background:#fafafa;">
            <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="toggleCenterDetail('${c.id}')">
                <div style="flex:1;">
                    <strong>${escHtml(c.code)}</strong> - ${escHtml(c.name)}
                    ${c.pi ? `<span style="color:#666;font-size:0.85em;margin-left:8px;"><i class="fas fa-user-md"></i> ${escHtml(c.pi)}</span>` : ''}
                    ${c.department ? `<span style="color:#888;font-size:0.85em;"> | ${escHtml(c.department)}</span>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    ${total > 0 ? `<span style="font-size:0.8em;color:#666;">${done}/${total}</span>
                    <div style="width:60px;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;transition:width .3s;"></div>
                    </div>` : ''}
                    <i class="fas fa-chevron-down" id="icon-${c.id}" style="color:#999;font-size:0.8em;"></i>
                </div>
            </div>
            <div id="detail-${c.id}" style="display:none;margin-top:10px;">
                ${total > 0 ? `
                <div style="background:#fff;border-radius:8px;padding:8px 12px;">
                    ${ms.map((m, i) => {
                        const isOverdue = !m.done && m.date && new Date(m.date) < new Date();
                        const dateStr = m.date ? m.date.slice(5) : '';
                        return `
                        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;gap:8px;" >
                            <input type="checkbox" ${m.done ? 'checked' : ''} 
                                style="width:18px;height:18px;cursor:pointer;accent-color:#27ae60;"
                                onclick="event.stopPropagation(); toggleMilestone('${c.id}', ${i}, this.checked)" />
                            <span style="flex:1;${m.done ? 'text-decoration:line-through;color:#999;' : isOverdue ? 'color:#e74c3c;font-weight:600;' : 'color:#333;'}">${escHtml(m.name)}</span>
                            <span style="font-size:0.8em;color:${isOverdue ? '#e74c3c' : '#888'};white-space:nowrap;">${dateStr}${isOverdue ? ' ⚠️' : ''}${m.done && m.actual_date ? ' ✅'+m.actual_date.slice(5) : ''}</span>
                        </div>`;
                    }).join('')}
                </div>` : '<p style="color:#999;font-size:0.9em;padding:8px;">暂无里程碑</p>'}
            </div>
        </div>`;
    }).join('');
}

function toggleCenterDetail(centerId) {
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
}

async function toggleMilestone(centerId, idx, done) {
    try {
        const res = await fetch(`/api/center/${centerId}/milestone/${idx}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({done: done})
        });
        const data = await res.json();
        if (data.success) {
            const currentProjectId = document.getElementById('projectCenters')?.dataset?.projectId;
            if (currentProjectId) loadProjectCenters(currentProjectId);
        }
    } catch(e) {
        console.error('更新里程碑失败:', e);
    }
}

function showAddCenterModal(projectId) {
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
            showToast('中心添加成功');
            loadProjectCenters(projectId);
        }
    });
}

async function deleteCenter(centerId, projectId) {
    if (!confirm('确定删除该中心？')) return;
    try {
        const res = await fetch(`/api/center/${centerId}`, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) {
            showToast('已删除');
            loadProjectCenters(projectId);
        }
    } catch (err) {
        console.error(err);
    }
}

function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) {
        const t = document.createElement('div');
        t.id = 'toast';
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:6px;z-index:9999;opacity:0;transition:opacity 0.3s';
        document.body.appendChild(t);
    }
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
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
                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${escHtml(t.center_name)} ·` : ''}
                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${ABILITY_ICONS[t.ability_type || 'execution']} ${ABILITY_LABELS[t.ability_type || 'execution']}</span> ·
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
    
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    const pending = total - done;
    
    // 按能力类型分组统计
    const abilityGroups = {};
    state.tasks.filter(t => !t.done).forEach(t => {
        const at = t.ability_type || 'execution';
        if (!abilityGroups[at]) abilityGroups[at] = 0;
        abilityGroups[at]++;
    });
    
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

        <!-- 能力分组概览 -->
        <div class="ability-overview">
            ${Object.keys(ABILITY_LABELS).map(at => `
                <div class="ability-card ability-${at}" onclick="filterByAbility('${at}')">
                    <span class="ability-icon">${ABILITY_ICONS[at]}</span>
                    <span class="ability-name">${ABILITY_LABELS[at]}</span>
                    <span class="ability-count">${abilityGroups[at] || 0}</span>
                </div>
            `).join('')}
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
                        <div class="task-item ${t.done ? 'task-done' : ''}" data-task-id="${t.id}" data-done="${t.done}" data-ability="${t.ability_type || 'execution'}">
                            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${t.id}', ${!t.done})">
                            <div class="task-content" onclick="viewTaskDetail('${t.id}')">
                                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${escHtml(t.title)}</h4>
                                <p class="task-meta">
                                    ${proj ? `<i class="fas fa-folder"></i> ${escHtml(proj.name)} ·` : ''}
                                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${escHtml(t.center_name)} ·` : ''}
                                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${ABILITY_ICONS[t.ability_type || 'execution']} ${ABILITY_LABELS[t.ability_type || 'execution']}</span> ·
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

function filterByAbility(abilityType) {
    document.querySelectorAll('#taskList .task-item').forEach(item => {
        if (item.dataset.ability === abilityType) item.style.display = '';
        else item.style.display = 'none';
    });
    // 取消筛选时双击恢复
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

// ========== 状态推荐页面 ==========

async function loadRecommend(content) {
    const [statusRes, recRes] = await Promise.all([
        fetch('/api/status'), fetch('/api/recommendations')
    ]);
    const statusData = await statusRes.json();
    const recData = await recRes.json();
    
    const currentEnergy = statusData.energy || 'medium';
    const currentCalmness = statusData.calmness || 'medium';
    const recommended = recData.recommended_tasks || [];
    const other = recData.other_tasks || [];
    const recommendedTypes = recData.recommended_types || [];
    
    const energyLevels = ['high', 'medium', 'low'];
    const calmLevels = ['high', 'medium', 'low'];
    const energyEmoji = { high: '⚡', medium: '🔋', low: '🪫' };
    const calmEmoji = { high: '🧘', medium: '🌊', low: '🔥' };
    const energyLabel = { high: '高', medium: '中', low: '低' };
    const calmLabel = { high: '高', medium: '中', low: '低' };

    content.innerHTML = `
        <div class="card">
            <div class="card-header"><i class="fas fa-brain"></i> 当前状态</div>
            <p style="color:#7f8c8d;font-size:0.9em;margin-bottom:16px;">选择你现在的身体精力和内心平静度，系统会推荐最适合你当前状态的任务类型</p>
            
            <div class="status-selector">
                <div class="status-dimension">
                    <h4><i class="fas fa-bolt"></i> 身体精力</h4>
                    <div class="status-options">
                        ${energyLevels.map(l => `
                            <div class="status-opt ${currentEnergy === l ? 'active' : ''}" onclick="selectEnergy('${l}')">
                                <span class="status-emoji">${energyEmoji[l]}</span>
                                <span class="status-level">${energyLabel[l]}</span>
                                <small>${ENERGY_DESC[l]}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="status-dimension">
                    <h4><i class="fas fa-heart"></i> 内心平静度</h4>
                    <div class="status-options">
                        ${calmLevels.map(l => `
                            <div class="status-opt ${currentCalmness === l ? 'active' : ''}" onclick="selectCalmness('${l}')">
                                <span class="status-emoji">${calmEmoji[l]}</span>
                                <span class="status-level">${calmLabel[l]}</span>
                                <small>${CALM_DESC[l]}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- 状态说明 -->
        <div class="card" style="background:#f8f9fa;border-left:4px solid #3498db;">
            <p style="margin:0;color:#2c3e50;font-size:0.95em;">
                ${STATUS_EXPLANATION[`${currentEnergy},${currentCalmness}`] || ''}
            </p>
        </div>

        ${recommendedTypes.length > 0 ? `
        <div class="card">
            <div class="card-header" style="color:#27ae60;">
                <i class="fas fa-check-circle"></i> ✅ 推荐任务
            </div>
            <div class="ability-desc-list">
                ${recommendedTypes.map(t => {
                    const stars = recData.recommend_ranks && recData.recommend_ranks[t]
                        ? '⭐'.repeat(4 - recData.recommend_ranks[t])
                        : '';
                    return `
                    <div class="ability-desc-item">
                        <span class="ability-icon-big">${ABILITY_ICONS[t]}</span>
                        <strong>${ABILITY_LABELS[t]}</strong>
                        ${stars ? `<span style="margin-left:4px;color:#f39c12;">${stars}</span>` : ''}
                        <small>${ABILITY_DESC[t]}</small>
                    </div>
                `}).join('')}
            </div>
            ${recommended.length > 0 ? `
                <div class="rec-task-list">
                    ${recommended.map(t => renderRecTask(t, true)).join('')}
                </div>
            ` : '<p style="color:#999;padding:10px;">当前推荐类型下没有待办任务，可以创建一个</p>'}
        </div>` : `
        <div class="card">
            <div class="card-header" style="color:#e74c3c;">
                <i class="fas fa-bed"></i> 🛌 现在适合休息
            </div>
            <p style="padding:20px;color:#666;">你当前身体精力低且内心不平静，强行工作只会更低效。<br>建议：<strong>休息30分钟</strong>，做点放松的事（散步、冥想、听音乐），状态回升后再回来。</p>
        </div>`}

        ${other.length > 0 ? `
        <div class="card">
            <div class="card-header" style="color:#999;">
                <i class="fas fa-clock"></i> 其他待办（当前状态不太适合）
            </div>
            <div class="rec-task-list" style="opacity:0.6;">
                ${other.map(t => renderRecTask(t, false)).join('')}
            </div>
        </div>` : ''}
    `;
}

function renderRecTask(t, recommended) {
    const abilityIcon = ABILITY_ICONS[t.ability_type || 'execution'];
    const abilityLabel = ABILITY_LABELS[t.ability_type || 'execution'];
    const priorityLabel = {high:'高',medium:'中',low:'低'}[t.priority] || t.priority;
    const priorityClass = `priority-${t.priority || 'medium'}`;
    const rank = t.recommend_rank;
    // rank 1=最推荐→3星, 2=次推荐→2星, 3=可做→1星
    const stars = rank ? '⭐'.repeat(4 - rank) : '';
    
    return `
        <div class="rec-task-item ${recommended ? 'rec-recommended' : 'rec-other'}">
            <div class="rec-task-ability">${stars} ${abilityIcon} ${abilityLabel}</div>
            <div class="rec-task-info">
                <strong>${escHtml(t.title)}</strong>
                <small>${t.center_name ? escHtml(t.center_name) + ' · ' : ''}${t.due_date || '无截止日期'} · <span class="task-priority ${priorityClass}">${priorityLabel}</span></small>
            </div>
        </div>
    `;
}

async function selectEnergy(level) {
    await fetch('/api/status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({energy: level})
    });
    navigateTo('recommend');
}

async function selectCalmness(level) {
    await fetch('/api/status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({calmness: level})
    });
    navigateTo('recommend');
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
                    <label>能力分类</label>
                    <select name="ability_type">
                        ${Object.keys(ABILITY_LABELS).map(k => `<option value="${k}">${ABILITY_ICONS[k]} ${ABILITY_LABELS[k]} — ${ABILITY_DESC[k]}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>优先级</label>
                    <select name="priority">
                        <option value="high">🔴 高</option>
                        <option value="medium" selected>🟡 中</option>
                        <option value="low">🟢 低</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>截止日期</label>
                    <input type="date" name="due_date">
                </div>
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
        ability_type: form.ability_type.value,
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
        
        if (state.currentProject) {
            await loadProjectTasks(state.currentProject.id);
        }
    }
}

// 查看任务详情
function viewTaskDetail(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const proj = (state.projects || []).find(p => p.id === task.project_id);
    const atLabel = ABILITY_LABELS[task.ability_type || 'execution'];
    const atIcon = ABILITY_ICONS[task.ability_type || 'execution'];
    alert(
        `📋 ${task.title}\n\n` +
        `项目：${proj ? proj.name : '未关联'}\n` +
        `能力：${atIcon} ${atLabel}\n` +
        `优先级：${{high:'高',medium:'中',low:'低'}[task.priority]||task.priority}\n` +
        `截止：${task.due_date || '未设置'}\n` +
        `状态：${task.done ? '✅ 已完成' : '⏳ 进行中'}\n\n` +
        `创建时间：${task.created_at ? task.created_at.slice(0,16) : '未知'}`
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