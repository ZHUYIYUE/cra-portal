// ========== 待办页面 + 状态推荐 + 启动任务 + 新建/编辑待办 ==========

// ========== 待办事项页面 ==========

window.loadTasks = async function(content) {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    if (window.state) {
        window.state.tasks = data.tasks || [];
    }
    
    if (!window.state || window.state.projects.length === 0) {
        const projData = await (await fetch('/api/projects')).json();
        if (window.state) {
            window.state.projects = projData.projects || [];
        }
    }
    
    const total = window.state ? window.state.tasks.length : 0;
    const done = window.state ? window.state.tasks.filter(t => t.done).length : 0;
    const pending = total - done;
    const waiting_crc = window.state ? window.state.tasks.filter(t => t.task_status === 'waiting_crc' && !t.done).length : 0;
    
    // 按能力类型分组统计
    const abilityGroups = {};
    if (window.state) {
        window.state.tasks.filter(t => !t.done).forEach(t => {
            const at = t.ability_type || 'execution';
            if (!abilityGroups[at]) abilityGroups[at] = 0;
            abilityGroups[at]++;
        });
    }
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-tasks"></i> 待办事项
                <span style="margin-left:auto;color:#666;font-size:0.9em;">${done}/${total} 已完成</span>
                <button class="btn btn-primary" onclick="window.showAddTask()" style="margin-left:10px;">
                    <i class="fas fa-plus"></i> 新建待办
                </button>
            </div>
        </div>

        <!-- 能力分组概览 -->
        <div class="ability-overview">
            ${Object.keys(window.ABILITY_LABELS).map(at => `
                <div class="ability-card ability-${at}" onclick="window.filterByAbility('${at}')">
                    <span class="ability-icon">${window.ABILITY_ICONS[at]}</span>
                    <span class="ability-name">${window.ABILITY_LABELS[at]}</span>
                    <span class="ability-count">${abilityGroups[at] || 0}</span>
                </div>
            `).join('')}
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
            <button class="filter-btn active" onclick="window.filterTasks(this, 'all')">全部 (${total})</button>
            <button class="filter-btn" onclick="window.filterTasks(this, 'pending')">待完成 (${pending})</button>
            ${waiting_crc > 0 ? `<button class="filter-btn" onclick="window.filterTasks(this, 'waiting_crc')" style="color:#e67e22;font-weight:bold;">跟进CRC (${waiting_crc})</button>` : `<button class="filter-btn" onclick="window.filterTasks(this, 'waiting_crc')">跟进CRC (0)</button>`}
            <button class="filter-btn" onclick="window.filterTasks(this, 'done')">已完成 (${done})</button>
        </div>

        <div class="task-list" id="taskList">
            ${window.state && window.state.tasks.length === 0 ? '<p style="color:#999;padding:20px;">暂无待办事项</p>' :
                (window.state ? window.state.tasks : []).map(t => {
                    const proj = window.state.projects.find(p => p.id === t.project_id);
                    const taskStatus = t.task_status || 'pending';
                    const isWaitingCrc = taskStatus === 'waiting_crc' && !t.done;
                    return `
                        <div class="task-item ${t.done ? 'task-done' : ''}" data-task-id="${t.id}" data-done="${t.done}" data-status="${taskStatus}" data-ability="${t.ability_type || 'execution'}">
                            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="window.toggleTaskDone('${t.id}', ${!t.done})">
                            <div class="task-content" onclick="window.viewTaskDetail('${t.id}')">
                                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${window.escHtml(t.title)}</h4>
                                <p class="task-meta">
                                    ${proj ? `<i class="fas fa-folder"></i> ${window.escHtml(proj.name)} ·` : ''}
                                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${window.escHtml(t.center_name)} ·` : ''}
                                    ${isWaitingCrc ? `<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px;">跟进CRC</span>` : ''}
                                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${window.ABILITY_ICONS[t.ability_type || 'execution']} ${window.ABILITY_LABELS[t.ability_type || 'execution']}</span> ·
                                    ${t.due_date ? `<i class="far fa-calendar"></i> ${t.due_date}` : '无截止日期'}
                                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                                </p>
                            </div>
                            <button class="btn-icon" onclick="event.stopPropagation();window.showEditTask('${t.id}')" title="编辑"><i class="fas fa-edit" style="color:#3498db;"></i></button>
                            <button class="btn-icon" onclick="event.stopPropagation();window.deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
                        </div>
                    `;
                }).join('')
            }
        </div>
    `;
};

window.filterByAbility = function(abilityType) {
    document.querySelectorAll('#taskList .task-item').forEach(item => {
        if (item.dataset.ability === abilityType) item.style.display = '';
        else item.style.display = 'none';
    });
};

window.filterTasks = function(btn, filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('#taskList .task-item').forEach(item => {
        const done = item.dataset.done === 'true';
        const status = item.dataset.status || 'pending';
        if (filter === 'all') item.style.display = '';
        else if (filter === 'pending') item.style.display = (done || status === 'waiting_crc') ? 'none' : '';
        else if (filter === 'waiting_crc') item.style.display = status === 'waiting_crc' && !done ? '' : 'none';
        else if (filter === 'done') item.style.display = done ? '' : 'none';
    });
};

// ========== 状态推荐页面 ==========

window.loadRecommend = async function(content) {
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
                            <div class="status-opt ${currentEnergy === l ? 'active' : ''}" onclick="window.selectEnergy('${l}')">
                                <span class="status-emoji">${energyEmoji[l]}</span>
                                <span class="status-level">${energyLabel[l]}</span>
                                <small>${window.ENERGY_DESC[l]}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="status-dimension">
                    <h4><i class="fas fa-heart"></i> 内心平静度</h4>
                    <div class="status-options">
                        ${calmLevels.map(l => `
                            <div class="status-opt ${currentCalmness === l ? 'active' : ''}" onclick="window.selectCalmness('${l}')">
                                <span class="status-emoji">${calmEmoji[l]}</span>
                                <span class="status-level">${calmLabel[l]}</span>
                                <small>${window.CALM_DESC[l]}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <!-- 状态说明 -->
        <div class="card" style="background:#f8f9fa;border-left:4px solid #3498db;">
            <p style="margin:0;color:#2c3e50;font-size:0.95em;">
                ${window.STATUS_EXPLANATION[`${currentEnergy},${currentCalmness}`] || ''}
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
                        <span class="ability-icon-big">${window.ABILITY_ICONS[t]}</span>
                        <strong>${window.ABILITY_LABELS[t]}</strong>
                        ${stars ? `<span style="margin-left:4px;color:#f39c12;">${stars}</span>` : ''}
                        <small>${window.ABILITY_DESC[t]}</small>
                    </div>
                `}).join('')}
            </div>
            ${recommended.length > 0 ? `
                <div class="rec-task-list">
                    ${recommended.map(t => window.renderRecTask(t, true)).join('')}
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
                ${other.map(t => window.renderRecTask(t, false)).join('')}
            </div>
        </div>` : ''}
    `;
};

window.renderRecTask = function(t, recommended) {
    const abilityIcon = window.ABILITY_ICONS[t.ability_type || 'execution'];
    const abilityLabel = window.ABILITY_LABELS[t.ability_type || 'execution'];
    const priorityLabel = {high:'高',medium:'中',low:'低'}[t.priority] || t.priority;
    const priorityClass = `priority-${t.priority || 'medium'}`;
    const rank = t.recommend_rank;
    // rank 1=最推荐→3星, 2=次推荐→2星, 3=可做→1星
    const stars = rank ? '⭐'.repeat(4 - rank) : '';
    
    return `
        <div class="rec-task-item ${recommended ? 'rec-recommended' : 'rec-other'}">
            <div class="rec-task-ability">${stars} ${abilityIcon} ${abilityLabel}</div>
            <div class="rec-task-info">
                <strong>${window.escHtml(t.title)}</strong>
                <small>${t.center_name ? window.escHtml(t.center_name) + ' · ' : ''}${t.due_date || '无截止日期'} · <span class="task-priority ${priorityClass}">${priorityLabel}</span></small>
            </div>
        </div>
    `;
};

window.selectEnergy = async function(level) {
    await fetch('/api/status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({energy: level})
    });
    window.navigateTo('recommend');
};

window.selectCalmness = async function(level) {
    await fetch('/api/status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({calmness: level})
    });
    window.navigateTo('recommend');
};

// ========== 新建待办（全局） ==========

window.showAddTask = function() {
    window.renderTaskForm('', '新建待办事项');
};

window.showAddTaskForProject = function(projectId) {
    window.renderTaskForm(projectId, '新建待办事项');
};

window.renderTaskForm = function(projectId, title) {
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-plus-circle"></i> ${title}</h3></div>
        <form onsubmit="return window.submitCreateTask(event)">
            <div class="form-group">
                <label>任务标题 *</label>
                <input type="text" name="title" required placeholder="例：上传伦理批件到eTMF" autofocus>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>所属项目</label>
                    <select name="project_id" id="task-project-select" onchange="window.onTaskProjectChange(this.value)">
                        <option value="">不关联项目</option>
                        ${(window.state && window.state.projects || []).map(p => `<option value="${p.id}" ${p.id===projectId?'selected':''}>${window.escHtml(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>所属中心</label>
                    <select name="center_id" id="task-center-select" disabled>
                        <option value="">先选项目</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>能力分类</label>
                    <select name="ability_type">
                        ${Object.keys(window.ABILITY_LABELS).map(k => `<option value="${k}">${window.ABILITY_ICONS[k]} ${window.ABILITY_LABELS[k]} — ${window.ABILITY_DESC[k]}</option>`).join('')}
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
                <label>任务状态</label>
                <select name="task_status">
                    <option value="pending">🔵 待处理</option>
                    <option value="waiting_crc">🟠 跟进CRC</option>
                    <option value="done">✅ 已完成</option>
                </select>
            </div>
            <div class="form-group">
                <label>截止日期</label>
                <input type="date" name="due_date">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 创建</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
    // 如果已有项目选中，自动加载其中心
    if (projectId) {
        window.onTaskProjectChange(projectId);
    }
};

window.onTaskProjectChange = async function(projectId) {
    const select = document.getElementById('task-center-select');
    if (!select) return;
    if (!projectId) {
        select.innerHTML = '<option value="">先选项目</option>';
        select.disabled = true;
        return;
    }
    select.disabled = true;
    select.innerHTML = '<option value="">加载中...</option>';
    try {
        const res = await fetch(`/api/centers?project_id=${projectId}`);
        const data = await res.json();
        const centers = data.centers || [];
        if (centers.length === 0) {
            select.innerHTML = '<option value="">该项目暂无中心</option>';
        } else {
            select.innerHTML = '<option value="">不关联中心</option>' +
                centers.map(c => `<option value="${c.id}">${window.escHtml(c.code)} - ${window.escHtml(c.name)}</option>`).join('');
            select.disabled = false;
        }
    } catch (e) {
        select.innerHTML = '<option value="">加载失败</option>';
    }
};

window.submitCreateTask = async function(e) {
    e.preventDefault();
    const form = e.target;
    const taskStatus = form.task_status.value;
    const data = {
        title: form.title.value,
        project_id: form.project_id.value,
        center_id: form.center_id.value,
        ability_type: form.ability_type.value,
        priority: form.priority.value,
        due_date: form.due_date.value,
        task_status: taskStatus,
        done: taskStatus === 'done'
    };
    
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });
    const result = await res.json();
    
    if (result.success) {
        window.closeModal();
        alert('✅ 待办创建成功！');
        if (window.state && window.state.currentProject && data.project_id === window.state.currentProject.id) {
            window.viewProject(window.state.currentProject.id);
        } else {
            window.navigateTo('tasks');
        }
    } else {
        alert('❌ 创建失败');
    }
};

// ========== 切换任务完成状态 ==========

window.toggleTaskDone = async function(taskId, newDone) {
    const res = await fetch(`/api/task/${taskId}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({done: newDone, task_status: newDone ? 'done' : 'pending'})
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
};

// ========== 删除任务 ==========

window.deleteTaskById = async function(taskId) {
    if (!confirm('确定删除此待办？')) return;
    const res = await fetch(`/api/task/${taskId}`, {method: 'DELETE'});
    const result = await res.json();
    if (result.success) {
        await window.loadTasks();
    } else {
        alert('❌ 删除失败: ' + (result.error || '未知错误'));
    }
};

// ========== 编辑任务 ==========

window.showEditTask = async function(taskId) {
    const task = window.state ? window.state.tasks.find(t => t.id === taskId) : null;
    if (!task) { alert('未找到该任务'); return; }
    
    const projectOptions = `<option value="">不关联项目</option>` +
        (window.state && window.state.projects || []).map(p => `<option value="${p.id}" ${p.id === task.project_id ? 'selected' : ''}>${window.escHtml(p.name)}</option>`).join('');
    
    const abilityOptions = Object.keys(window.ABILITY_LABELS).map(k => 
        `<option value="${k}" ${k === (task.ability_type || 'execution') ? 'selected' : ''}>${window.ABILITY_ICONS[k]} ${window.ABILITY_LABELS[k]}</option>`
    ).join('');
    
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-edit"></i> 编辑待办</h3></div>
        <form onsubmit="return window.submitUpdateTask(event, '${task.id}')">
            <div class="form-group">
                <label>任务标题 *</label>
                <input type="text" name="title" id="edit-task-title" value="${window.escAttr(task.title || '')}" required autofocus>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>所属项目</label>
                    <select name="project_id" id="edit-task-project" onchange="window.onTaskProjectChangeForEdit(this.value, '${task.center_id || ''}')">
                        ${projectOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>所属中心</label>
                    <select name="center_id" id="edit-task-center-select">
                        <option value="">加载中...</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>能力分类</label>
                    <select name="ability_type">
                        ${abilityOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select name="priority">
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>🔴 高</option>
                        <option value="medium" ${(task.priority || 'medium') === 'medium' ? 'selected' : ''}>🟡 中</option>
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>🟢 低</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>任务状态</label>
                <select name="task_status" id="edit-task-status">
                    <option value="pending" ${(task.task_status || 'pending') === 'pending' ? 'selected' : ''}>🔵 待处理</option>
                    <option value="waiting_crc" ${task.task_status === 'waiting_crc' ? 'selected' : ''}>🟠 跟进CRC</option>
                    <option value="done" ${task.task_status === 'done' ? 'selected' : ''}>✅ 已完成</option>
                </select>
            </div>
            <div class="form-group">
                <label>截止日期</label>
                <input type="date" name="due_date" id="edit-task-due-date" value="${task.due_date || ''}">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 保存修改</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
    
    // 如果已有项目，加载中心列表
    if (task.project_id) {
        await window.loadCentersForEdit(task.project_id, task.center_id);
    }
};

// 加载中心列表（编辑用）
window.loadCentersForEdit = async function(projectId, selectedCenterId) {
    const select = document.getElementById('edit-task-center-select');
    if (!select) return;
    
    if (!projectId) {
        select.innerHTML = '<option value="">不关联中心</option>';
        return;
    }
    
    try {
        const res = await fetch(`/api/centers?project_id=${projectId}`);
        const data = await res.json();
        const centers = data.centers || [];
        
        select.innerHTML = '<option value="">不关联中心</option>' +
            centers.map(c => `<option value="${c.id}" ${c.id === selectedCenterId ? 'selected' : ''}>${window.escHtml(c.name)}</option>`).join('');
    } catch(e) {
        select.innerHTML = '<option value="">加载失败</option>';
    }
};

// 项目切换时重新加载中心（编辑用）
window.onTaskProjectChangeForEdit = async function(projectId, currentCenterId) {
    await window.loadCentersForEdit(projectId, currentCenterId);
};

// 提交更新
window.submitUpdateTask = async function(e, taskId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const taskStatus = formData.get('task_status');
    
    const payload = {
        title: formData.get('title'),
        project_id: formData.get('project_id') || null,
        center_id: formData.get('center_id') || null,
        ability_type: formData.get('ability_type'),
        priority: formData.get('priority'),
        due_date: formData.get('due_date') || null,
        task_status: taskStatus,
        done: taskStatus === 'done'
    };
    
    try {
        const res = await fetch(`/api/task/${taskId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            window.closeModal();
            window.showToast('✅ 已保存');
            // 重新加载当前页面任务列表
            if (window.state && window.state.currentPage === 'tasks') {
                const content = document.getElementById('content');
                if (content) await window.loadTasks(content);
            } else if (window.state && window.state.currentProject) {
                await window.loadProjectTasks(window.state.currentProject.id);
            }
        } else {
            alert('❌ 保存失败: ' + (result.error || '未知错误'));
        }
    } catch(e) {
        alert('❌ 保存失败: ' + e.message);
    }
    
    return false;
};

// ========== 查看任务详情 ==========

window.viewTaskDetail = function(taskId) {
    const task = window.state ? window.state.tasks.find(t => t.id === taskId) : null;
    if (!task) return;
    
    const proj = window.state && window.state.projects ? window.state.projects.find(p => p.id === task.project_id) : null;
    const atLabel = window.ABILITY_LABELS[task.ability_type || 'execution'];
    const atIcon = window.ABILITY_ICONS[task.ability_type || 'execution'];
    alert(
        `📋 ${task.title}\n\n` +
        `项目：${proj ? proj.name : '未关联'}\n` +
        `能力：${atIcon} ${atLabel}\n` +
        `优先级：${{high:'高',medium:'中',low:'低'}[task.priority]||task.priority}\n` +
        `截止：${task.due_date || '未设置'}\n` +
        `状态：${task.done ? '✅ 已完成' : '⏳ 进行中'}\n\n` +
        `创建时间：${task.created_at ? task.created_at.slice(0,16) : '未知'}`
    );
};

// ========== 启动任务页面 ==========

window.loadStartup = async function(content) {
    const [tasksRes, logsRes, statsRes, allTasksRes] = await Promise.all([
        fetch('/api/startup-tasks'),
        fetch('/api/startup-logs'),
        fetch('/api/startup-stats'),
        fetch('/api/tasks')
    ]);
    const tasksData = await tasksRes.json();
    const logsData = await logsRes.json();
    const statsData = await statsRes.json();
    const allTasksData = await allTasksRes.json();
    
    const startupTasks = tasksData.tasks || [];
    const logs = logsData.logs || [];
    const stats = statsData.stats || [];
    const targetTasks = (allTasksData.tasks || []).filter(t => !t.done);
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-rocket"></i> 启动任务库
                <button class="btn btn-primary" style="float:right;" onclick="window.showAddStartupTaskModal()">
                    <i class="fas fa-plus"></i> 添加启动任务
                </button>
            </div>
            <p style="color:#666;margin-bottom:16px;">
                启动任务用于在面临困难/抗拒任务时，快速获得胜任感和掌控感，消除杏仁核的恐惧反应。
            </p>
            <div class="startup-tasks-list">
                ${startupTasks.length === 0 ? 
                    '<p style="color:#999;">还没有启动任务，点击右上角添加一个吧</p>' :
                    startupTasks.map(t => `
                        <div class="startup-task-item">
                            <div class="startup-task-info">
                                <strong>${window.escHtml(t.name)}</strong>
                                ${t.description ? `<br><small style="color:#666;">${window.escHtml(t.description)}</small>` : ''}
                            </div>
                            <div class="startup-task-actions">
                                <button class="btn btn-small" onclick='window.executeStartupTask("${t.id}", "${window.escAttr(t.name)}")'>
                                    <i class="fas fa-play"></i> 执行
                                </button>
                                <button class="btn btn-small btn-danger" onclick="window.deleteStartupTask('${t.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>

        <div class="card">
            <div class="card-header"><i class="fas fa-history"></i> 执行日志</div>
            ${logs.length === 0 ? 
                '<p style="color:#999;">还没有执行记录</p>' :
                `<div class="logs-list">
                    ${logs.slice(0, 10).map(log => `
                        <div class="log-item">
                            <div class="log-main">
                                <strong>${window.escHtml(log.startup_task_name)}</strong>
                                ${log.target_task_name ? `<span style="color:#666;">→ ${window.escHtml(log.target_task_name)}</span>` : ''}
                                <br>
                                <small>
                                    平静度: ${'😌'.repeat(log.calmness_before)} → ${'😌'.repeat(log.calmness_after)} 
                                    (${log.calmness_after > log.calmness_before ? '✅ +' : log.calmness_after < log.calmness_before ? '⚠️ ' : '➖ '}${log.calmness_after - log.calmness_before})
                                    &nbsp;|&nbsp; 耗时: ${log.duration_minutes}分钟
                                </small>
                            </div>
                            <div class="log-time">
                                <small>${window.formatDate(log.executed_at)}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>

        ${stats.length > 0 ? `
            <div class="card">
                <div class="card-header"><i class="fas fa-chart-line"></i> 效果分析</div>
                <div class="stats-table-wrapper">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>启动任务</th>
                                <th>执行次数</th>
                                <th>平均平静度变化</th>
                                <th>改善率</th>
                                <th>平均耗时</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.map(s => `
                                <tr>
                                    <td>${window.escHtml(s.task_name)}</td>
                                    <td>${s.count}次</td>
                                    <td>${s.avg_calmness_before} → ${s.avg_calmness_after} (${s.avg_improvement > 0 ? '+' : ''}${s.avg_improvement})</td>
                                    <td>${s.improvement_rate}%</td>
                                    <td>${s.avg_duration}分钟</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
    `;
};

window.showAddStartupTaskModal = function() {
    window.openModal(`
        <h3><i class="fas fa-plus"></i> 添加启动任务</h3>
        <div class="form-group">
            <label>任务名称 *</label>
            <input type="text" id="startupTaskName" placeholder="例如：整理CRA Portal待办">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="startupTaskDesc" placeholder="简短描述这个启动任务的作用"></textarea>
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="window.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="window.saveStartupTask()">保存</button>
        </div>
    `);
};

window.saveStartupTask = async function() {
    const name = document.getElementById('startupTaskName').value.trim();
    const description = document.getElementById('startupTaskDesc').value.trim();
    
    if (!name) {
        alert('请输入任务名称');
        return;
    }
    
    try {
        const res = await fetch('/api/startup-tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, description})
        });
        const data = await res.json();
        if (data.success) {
            window.closeModal();
            window.navigateTo('startup');
        } else {
            alert('保存失败');
        }
    } catch (e) {
        alert('保存失败');
    }
};

window.deleteStartupTask = async function(taskId) {
    if (!confirm('确定删除这个启动任务吗？')) return;
    
    try {
        const res = await fetch(`/api/startup-tasks/${taskId}`, {method: 'DELETE'});
        const data = await res.json();
        if (data.success) {
            window.navigateTo('startup');
        }
    } catch (e) {
        alert('删除失败');
    }
};

window.executeStartupTask = async function(taskId, taskName) {
    // 获取当前待办任务列表用于选择目标任务
    const res = await fetch('/api/tasks');
    const data = await res.json();
    const pendingTasks = (data.tasks || []).filter(t => !t.done);
    
    window.openModal(`
        <h3><i class="fas fa-play"></i> 执行启动任务：${window.escHtml(taskName)}</h3>
        <p style="color:#666;margin-bottom:16px;">执行完成后，记录你的感受和耗时</p>
        
        <div class="form-group">
            <label>关联目标任务（可选）</label>
            <select id="targetTaskSelect">
                <option value="">无</option>
                ${pendingTasks.map(t => `<option value="${t.id}" data-name="${window.escHtml(t.title)}">${window.escHtml(t.title)}</option>`).join('')}
            </select>
        </div>
        
        <div class="form-group">
            <label>执行前平静度（1=很烦躁，2=有点烦，3=平静）</label>
            <select id="calmnessBefore">
                <option value="1">1 - 很烦躁</option>
                <option value="2" selected>2 - 有点烦</option>
                <option value="3">3 - 平静</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>执行后平静度</label>
            <select id="calmnessAfter">
                <option value="1">1 - 很烦躁</option>
                <option value="2" selected>2 - 有点烦</option>
                <option value="3">3 - 平静</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>耗时（分钟）</label>
            <input type="number" id="durationMinutes" value="15" min="1">
        </div>
        
        <div class="form-group">
            <label>备注（可选）</label>
            <textarea id="logNotes" placeholder="记录一下执行过程中的感受"></textarea>
        </div>
        
        <div class="modal-actions">
            <button class="btn" onclick="window.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="window.saveStartupLog('${taskId}', '${window.escHtml(taskName)}')">保存记录</button>
        </div>
    `);
};

window.saveStartupLog = async function(startupTaskId, startupTaskName) {
    const targetSelect = document.getElementById('targetTaskSelect');
    const targetTaskId = targetSelect.value;
    const targetTaskName = targetSelect.options[targetSelect.selectedIndex].dataset.name || '';
    
    const calmnessBefore = parseInt(document.getElementById('calmnessBefore').value);
    const calmnessAfter = parseInt(document.getElementById('calmnessAfter').value);
    const durationMinutes = parseInt(document.getElementById('durationMinutes').value) || 15;
    const notes = document.getElementById('logNotes').value.trim();
    
    try {
        const res = await fetch('/api/startup-logs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                startup_task_id: startupTaskId,
                startup_task_name: startupTaskName,
                target_task_id: targetTaskId,
                target_task_name: targetTaskName,
                calmness_before: calmnessBefore,
                calmness_after: calmnessAfter,
                duration_minutes: durationMinutes,
                notes
            })
        });
        const data = await res.json();
        if (data.success) {
            window.closeModal();
            window.navigateTo('startup');
        } else {
            alert('保存失败');
        }
    } catch (e) {
        alert('保存失败');
    }
};
