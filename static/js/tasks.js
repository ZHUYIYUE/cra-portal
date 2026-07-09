// ========== 待办页面 + 状态推荐 + 启动任务 + 新建/编辑待办 ==========

// ========== 待办事项页面 ==========

window.TASK_STATUS_META = {
    pending: { label: '待处理', icon: 'fa-circle', cls: 'pending' },
    active: { label: '执行中', icon: 'fa-play-circle', cls: 'active' },
    waiting_crc: { label: '跟进CRC', icon: 'fa-comment-dots', cls: 'waiting' },
    done: { label: '已完成', icon: 'fa-check-circle', cls: 'done' }
};

window.TASK_QUADRANTS = {
    do_now: { title: '重要且紧急', hint: '高优先级 + 2天内/已逾期', icon: 'fa-fire', cls: 'danger' },
    schedule: { title: '重要不紧急', hint: '高优先级 + 仍有缓冲', icon: 'fa-calendar-check', cls: 'primary' },
    quick: { title: '紧急不重要', hint: '中低优先级 + 2天内', icon: 'fa-bolt', cls: 'warning' },
    later: { title: '不紧急不重要', hint: '中低优先级 + 可排后', icon: 'fa-layer-group', cls: 'muted' }
};

window.getTaskToday = function() {
    return new Date().toISOString().split('T')[0];
};

window.addTaskDays = function(days) {
    return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
};

window.getTaskStatusMeta = function(task) {
    var status = task.done ? 'done' : (task.task_status || 'pending');
    return window.TASK_STATUS_META[status] || window.TASK_STATUS_META.pending;
};

window.getTaskEstimatedMinutes = function(task) {
    var n = parseInt(task.estimated_minutes, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

window.formatTaskEstimate = function(task) {
    var minutes = window.getTaskEstimatedMinutes(task);
    if (!minutes) return '未估时';
    if (minutes < 60) return minutes + '分钟';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return h + '小时' + (m ? m + '分钟' : '');
};

window.taskIsUrgent = function(task) {
    if (!task.due_date) return false;
    return task.due_date <= window.addTaskDays(2);
};

window.getTaskQuadrant = function(task) {
    var important = (task.priority || 'medium') === 'high';
    var urgent = window.taskIsUrgent(task);
    if (important && urgent) return 'do_now';
    if (important && !urgent) return 'schedule';
    if (!important && urgent) return 'quick';
    return 'later';
};

window.taskInDateRange = function(task, range) {
    if (!range || range.mode === 'all') return true;
    if (!task.due_date) return false;
    if (range.start && task.due_date < range.start) return false;
    if (range.end && task.due_date > range.end) return false;
    return true;
};

window.getTaskRange = function() {
    if (!window._taskRange) {
        var today = window.getTaskToday();
        window._taskRange = { mode: 'today', start: today, end: today };
    }
    return window._taskRange;
};

window.getTaskRangeLabel = function(range) {
    if (!range || range.mode === 'all') return '全部未完成';
    if (range.start === range.end) return range.start;
    return (range.start || '不限') + ' 至 ' + (range.end || '不限');
};

window.renderTaskItem = function(t) {
    var proj = window.state && window.state.projects ? window.state.projects.find(function(p) { return p.id === t.project_id; }) : null;
    var taskStatus = t.done ? 'done' : (t.task_status || 'pending');
    var statusMeta = window.getTaskStatusMeta(t);
    var isActive = taskStatus === 'active' && !t.done;
    var startedText = t.started_at ? window.formatDate(t.started_at).slice(0, 16) : '';
    return `
        <div class="task-item ${t.done ? 'task-done' : ''} ${isActive ? 'task-active' : ''}" id="task-${t.id}" data-task-id="${t.id}" data-done="${t.done}" data-status="${taskStatus}" data-ability="${t.ability_type || 'execution'}" data-due="${t.due_date || ''}" data-priority="${t.priority || 'medium'}">
            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="window.toggleTaskDone('${t.id}', ${!t.done})">
            <div class="task-content" onclick="window.viewTaskDetail('${t.id}')">
                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${window.escHtml(t.title)}</h4>
                <p class="task-meta">
                    ${proj ? `<i class="fas fa-folder"></i> ${window.escHtml(proj.name)} ·` : ''}
                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${window.escHtml(t.center_name)} ·` : ''}
                    <span class="task-status-chip task-status-${statusMeta.cls}"><i class="fas ${statusMeta.icon}"></i> ${statusMeta.label}</span>
                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${window.ABILITY_ICONS[t.ability_type || 'execution']} ${window.ABILITY_LABELS[t.ability_type || 'execution']}</span>
                    ${t.due_date ? `<span><i class="far fa-calendar"></i> ${t.due_date}</span>` : '<span>无截止日期</span>'}
                    <span><i class="far fa-hourglass"></i> ${window.formatTaskEstimate(t)}</span>
                    ${startedText ? `<span><i class="fas fa-play"></i> ${startedText}</span>` : ''}
                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                </p>
            </div>
            ${!t.done ? `<button class="btn btn-sm ${isActive ? 'btn-outline' : 'btn-primary'} task-start-btn" onclick="event.stopPropagation();window.toggleTaskActive('${t.id}', ${!isActive})" title="${isActive ? '暂停执行' : '开始执行'}"><i class="fas ${isActive ? 'fa-pause' : 'fa-play'}"></i> ${isActive ? '暂停' : '开始'}</button>` : ''}
            <button class="btn-icon" onclick="event.stopPropagation();window.showEditTask('${t.id}')" title="编辑"><i class="fas fa-edit" style="color:#3498db;"></i></button>
            <button class="btn-icon" onclick="event.stopPropagation();window.deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
        </div>
    `;
};

window.getTaskPlanningCandidates = function() {
    var range = window.getTaskRange();
    var tasks = window.state ? (window.state.tasks || []) : [];
    return tasks.filter(function(t) {
        return !t.done && window.taskInDateRange(t, range);
    });
};

window.renderTaskQuadrants = function() {
    var el = document.getElementById('taskQuadrants');
    if (!el) return;
    var candidates = window.getTaskPlanningCandidates();
    var groups = { do_now: [], schedule: [], quick: [], later: [] };
    candidates.forEach(function(t) { groups[window.getTaskQuadrant(t)].push(t); });
    var order = { high: 0, medium: 1, low: 2 };
    Object.keys(groups).forEach(function(key) {
        groups[key].sort(function(a, b) {
            var ad = a.due_date || '9999-12-31';
            var bd = b.due_date || '9999-12-31';
            if (ad !== bd) return ad < bd ? -1 : 1;
            return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
        });
    });
    el.innerHTML = Object.keys(window.TASK_QUADRANTS).map(function(key) {
        var q = window.TASK_QUADRANTS[key];
        var totalMinutes = groups[key].reduce(function(sum, t) { return sum + window.getTaskEstimatedMinutes(t); }, 0);
        return `
            <section class="task-quadrant tq-${q.cls}">
                <header>
                    <div><i class="fas ${q.icon}"></i> <strong>${q.title}</strong><small>${q.hint}</small></div>
                    <span>${groups[key].length}项 · ${totalMinutes ? window.formatTaskEstimate({ estimated_minutes: totalMinutes }) : '未估时'}</span>
                </header>
                <div class="tq-list">
                    ${groups[key].length ? groups[key].slice(0, 6).map(function(t) {
                        return `<button type="button" onclick="window.viewTaskDetail('${t.id}')"><span>${window.escHtml(t.title)}</span><small>${t.due_date || '无截止'} · ${window.formatTaskEstimate(t)}</small></button>`;
                    }).join('') : '<p>暂无</p>'}
                </div>
            </section>
        `;
    }).join('');
};

window.refreshTaskPlanning = function() {
    var range = window.getTaskRange();
    var statusFilter = window._taskStatusFilter || 'all';
    var todayStr = window.getTaskToday();
    var weekStr = window.addTaskDays(7);
    document.querySelectorAll('#taskList .task-item').forEach(function(item) {
        var done = item.dataset.done === 'true';
        var status = item.dataset.status || 'pending';
        var due = item.dataset.due || '';
        var inStatus = true;
        if (statusFilter === 'pending') inStatus = !done && status !== 'waiting_crc' && status !== 'active';
        else if (statusFilter === 'active') inStatus = !done && status === 'active';
        else if (statusFilter === 'overdue') inStatus = !done && due && due < todayStr;
        else if (statusFilter === 'today') inStatus = !done && due === todayStr;
        else if (statusFilter === 'due_week') inStatus = !done && due && due >= todayStr && due <= weekStr;
        else if (statusFilter === 'waiting_crc') inStatus = status === 'waiting_crc' && !done;
        else if (statusFilter === 'done') inStatus = done;
        var inRange = range.mode === 'all' || !due ? range.mode === 'all' : (!range.start || due >= range.start) && (!range.end || due <= range.end);
        item.style.display = inStatus && inRange ? '' : 'none';
    });
    var summary = document.getElementById('taskRangeSummary');
    if (summary) {
        var tasks = window.getTaskPlanningCandidates();
        var minutes = tasks.reduce(function(sum, t) { return sum + window.getTaskEstimatedMinutes(t); }, 0);
        summary.textContent = window.getTaskRangeLabel(range) + '：' + tasks.length + '项未完成' + (minutes ? '，预计 ' + window.formatTaskEstimate({ estimated_minutes: minutes }) : '');
    }
    window.renderTaskQuadrants();
};

window.setTaskRangePreset = function(mode) {
    var today = window.getTaskToday();
    if (mode === 'today') window._taskRange = { mode: 'today', start: today, end: today };
    else if (mode === 'week') window._taskRange = { mode: 'week', start: today, end: window.addTaskDays(7) };
    else window._taskRange = { mode: 'all', start: '', end: '' };
    var start = document.getElementById('taskRangeStart');
    var end = document.getElementById('taskRangeEnd');
    if (start) start.value = window._taskRange.start || '';
    if (end) end.value = window._taskRange.end || '';
    document.querySelectorAll('.task-range-preset').forEach(function(b) { b.classList.toggle('active', b.dataset.range === mode); });
    window.refreshTaskPlanning();
};

window.applyTaskCustomRange = function() {
    var start = document.getElementById('taskRangeStart');
    var end = document.getElementById('taskRangeEnd');
    window._taskRange = { mode: 'custom', start: start ? start.value : '', end: end ? end.value : '' };
    document.querySelectorAll('.task-range-preset').forEach(function(b) { b.classList.remove('active'); });
    window.refreshTaskPlanning();
};

window.loadTasks = async function(content) {
    content = content || document.getElementById('pageContent');
    if (!content) return;

    const data = await api.getTasks();
    if (window.state) {
        window.state.tasks = data.tasks || [];
    }

    if (!window.state || window.state.projects.length === 0) {
        const projData = await api.getProjects();
        if (window.state) {
            window.state.projects = projData.projects || [];
        }
    }
    
    const tasks = window.state ? window.state.tasks : [];
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done && !['active', 'waiting_crc'].includes(t.task_status || 'pending')).length;
    const overdue = tasks.filter(t => !t.done && t.due_date && t.due_date < todayStr).length;
    const dueToday = tasks.filter(t => !t.done && t.due_date === todayStr).length;
    const dueWeek = tasks.filter(t => !t.done && t.due_date && t.due_date >= todayStr && t.due_date <= weekStr).length;
    const waiting_crc = tasks.filter(t => t.task_status === 'waiting_crc' && !t.done).length;
    const active = tasks.filter(t => t.task_status === 'active' && !t.done).length;
    const openEstimate = tasks.filter(t => !t.done).reduce((sum, t) => sum + window.getTaskEstimatedMinutes(t), 0);
    const range = window.getTaskRange();
    
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
            <button class="filter-btn active" data-filter="all" onclick="window.filterTasks(this, 'all')">全部 (${total})</button>
            <button class="filter-btn" data-filter="pending" onclick="window.filterTasks(this, 'pending')">待完成 (${pending})</button>
            <button class="filter-btn" data-filter="active" onclick="window.filterTasks(this, 'active')">执行中 (${active})</button>
            <button class="filter-btn" data-filter="overdue" onclick="window.filterTasks(this, 'overdue')">逾期 (${overdue})</button>
            <button class="filter-btn" data-filter="today" onclick="window.filterTasks(this, 'today')">今日 (${dueToday})</button>
            <button class="filter-btn" data-filter="due_week" onclick="window.filterTasks(this, 'due_week')">本周 (${dueWeek})</button>
            ${waiting_crc > 0 ? `<button class="filter-btn" data-filter="waiting_crc" onclick="window.filterTasks(this, 'waiting_crc')" style="color:#e67e22;font-weight:bold;">跟进CRC (${waiting_crc})</button>` : `<button class="filter-btn" data-filter="waiting_crc" onclick="window.filterTasks(this, 'waiting_crc')">跟进CRC (0)</button>`}
            <button class="filter-btn" data-filter="done" onclick="window.filterTasks(this, 'done')">已完成 (${done})</button>
        </div>

        <div class="task-planning-panel">
            <div class="task-range-tools">
                <div>
                    <strong><i class="fas fa-chart-pie"></i> 任务四象限</strong>
                    <span id="taskRangeSummary">${window.getTaskRangeLabel(range)}：${window.getTaskPlanningCandidates().length}项未完成${openEstimate ? '，全部未完成预计 ' + window.formatTaskEstimate({ estimated_minutes: openEstimate }) : ''}</span>
                </div>
                <div class="task-range-actions">
                    <button type="button" class="task-range-preset ${range.mode === 'today' ? 'active' : ''}" data-range="today" onclick="window.setTaskRangePreset('today')">今日</button>
                    <button type="button" class="task-range-preset ${range.mode === 'week' ? 'active' : ''}" data-range="week" onclick="window.setTaskRangePreset('week')">7天</button>
                    <button type="button" class="task-range-preset ${range.mode === 'all' ? 'active' : ''}" data-range="all" onclick="window.setTaskRangePreset('all')">全部</button>
                    <input type="date" id="taskRangeStart" value="${range.start || ''}" onchange="window.applyTaskCustomRange()">
                    <span>至</span>
                    <input type="date" id="taskRangeEnd" value="${range.end || ''}" onchange="window.applyTaskCustomRange()">
                </div>
            </div>
            <div id="taskQuadrants" class="task-quadrants"></div>
        </div>

        <div class="task-list" id="taskList">
            ${window.state && window.state.tasks.length === 0 ? '<p style="color:#999;padding:20px;">暂无待办事项</p>' :
                (window.state ? window.state.tasks : []).map(t => window.renderTaskItem(t)).join('')
            }
        </div>
    `;
    window.refreshTaskPlanning();
};

window.filterByAbility = function(abilityType) {
    window._taskStatusFilter = 'all';
    document.querySelectorAll('#taskList .task-item').forEach(item => {
        if (item.dataset.ability === abilityType) item.style.display = '';
        else item.style.display = 'none';
    });
    window.renderTaskQuadrants();
};

window.filterTasks = function(btn, filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window._taskStatusFilter = filter;
    window.refreshTaskPlanning();
};

window.applyTaskFilter = function(filter) {
    const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (btn) window.filterTasks(btn, filter);
};

// ========== 状态推荐页面 ==========
window.loadRecommend = async function(content) {
    const [statusData, recData] = await Promise.all([
        api.getStatus(), api.getRecommendations()
    ]);
    
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
    await api.saveStatus({energy: level});
    window.navigateTo('recommend');
};

window.selectCalmness = async function(level) {
    await api.saveStatus({calmness: level});
    window.navigateTo('recommend');
};

// ========== 新建待办（全局） ==========

window.showAddTask = function() {
    window.renderTaskForm('', '新建待办事项');
};


window.showAddTaskForCenter = async function(centerId) {
    const data = await api.getCenter(centerId);
    if (!data.success || !data.center) {
        alert('未找到中心信息');
        return;
    }
    if (!window.state || !window.state.projects || window.state.projects.length === 0) {
        const projData = await api.getProjects();
        if (window.state) window.state.projects = projData.projects || [];
    }
    window.renderTaskForm(data.center.project_id || '', '新建中心待办', centerId);
};
window.showAddTaskForProject = function(projectId) {
    window.renderTaskForm(projectId, '新建待办事项');
};

window.renderTaskForm = function(projectId, title, selectedCenterId) {
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
                    <option value="active">▶️ 执行中</option>
                    <option value="waiting_crc">🟠 跟进CRC</option>
                    <option value="done">✅ 已完成</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>截止日期</label>
                    <input type="date" name="due_date">
                </div>
                <div class="form-group">
                    <label>预计耗时（分钟）</label>
                    <input type="number" name="estimated_minutes" min="5" step="5" placeholder="例：30">
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 创建</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
    // 如果已有项目选中，自动加载其中心
    if (projectId) {
        window.onTaskProjectChange(projectId, selectedCenterId);
    }
};

window.onTaskProjectChange = async function(projectId, selectedCenterId) {
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
        const data = await api.getCenters(projectId);
        const centers = data.centers || [];
        if (centers.length === 0) {
            select.innerHTML = '<option value="">该项目暂无中心</option>';
        } else {
            select.innerHTML = '<option value="">不关联中心</option>' +
                centers.map(c => `<option value="${c.id}" ${selectedCenterId && c.id === selectedCenterId ? 'selected' : ''}>${window.escHtml(c.code)} - ${window.escHtml(c.name)}</option>`).join('');
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
        estimated_minutes: parseInt(form.estimated_minutes.value, 10) || null,
        task_status: taskStatus,
        done: taskStatus === 'done',
        started_at: taskStatus === 'active' ? new Date().toISOString() : ''
    };
    
    const result = await api.createTask(data);
    
    if (result.success) {
        window.closeModal();
        alert(window._taskPlanningColumnsMissing ? '✅ 待办创建成功！\n\n提示：数据库尚未执行任务规划字段迁移，预计耗时/开始时间暂时不会保存。' : '✅ 待办创建成功！');
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
    const result = await api.updateTask(taskId, {done: newDone, task_status: newDone ? 'done' : 'pending'});
    
    if (result.success) {
        const el = document.getElementById(`task-${taskId}`) || document.querySelector(`[data-task-id="${taskId}"]`);
        if (el) {
            el.classList.toggle('task-done', newDone);
            el.dataset.done = newDone;
            el.dataset.status = newDone ? 'done' : 'pending';
            const checkbox = el.querySelector('.task-checkbox');
            if (checkbox) checkbox.checked = newDone;
            const h4 = el.querySelector('h4');
            if (h4) {
                h4.style.textDecoration = newDone ? 'line-through' : '';
                h4.style.color = newDone ? '#999' : '';
            }
        }
        const content = document.getElementById('pageContent');
        if (window.state && window.state.currentPage === 'tasks' && content) {
            await window.loadTasks(content);
        } else if (window.state && window.state.currentProject) {
            await window.loadProjectTasks(window.state.currentProject.id);
        }
    }
};

window.toggleTaskActive = async function(taskId, activate) {
    const payload = activate
        ? { done: false, task_status: 'active', started_at: new Date().toISOString() }
        : { done: false, task_status: 'pending' };
    try {
        const result = await api.updateTask(taskId, payload);
        if (!result.success) {
            alert('❌ 操作失败: ' + (result.error || '未知错误'));
            return;
        }
        if (window._taskPlanningColumnsMissing && activate) {
            window.showToast('已设为执行中；开始时间需执行数据库迁移后才能保存');
        }
        const content = document.getElementById('pageContent');
        if (window.state && window.state.currentPage === 'tasks' && content) {
            await window.loadTasks(content);
        } else if (window.state && window.state.currentProject) {
            await window.loadProjectTasks(window.state.currentProject.id);
        }
    } catch (e) {
        alert('❌ 操作失败: ' + e.message);
    }
};

// ========== 删除任务 ==========

window.deleteTaskById = async function(taskId) {
    if (!confirm('确定删除此待办？')) return;
    const result = await api.deleteTask(taskId);
    if (result.success) {
        const content = document.getElementById('pageContent');
        if (window.state && window.state.currentPage === 'tasks' && content) {
            await window.loadTasks(content);
        } else if (window.state && window.state.currentProject) {
            await window.loadProjectTasks(window.state.currentProject.id);
        }
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
                    <option value="active" ${task.task_status === 'active' ? 'selected' : ''}>▶️ 执行中</option>
                    <option value="waiting_crc" ${task.task_status === 'waiting_crc' ? 'selected' : ''}>🟠 跟进CRC</option>
                    <option value="done" ${task.task_status === 'done' ? 'selected' : ''}>✅ 已完成</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>截止日期</label>
                    <input type="date" name="due_date" id="edit-task-due-date" value="${task.due_date || ''}">
                </div>
                <div class="form-group">
                    <label>预计耗时（分钟）</label>
                    <input type="number" name="estimated_minutes" min="5" step="5" value="${task.estimated_minutes || ''}" placeholder="例：30">
                </div>
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
        const data = await api.getCenters(projectId);
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
        estimated_minutes: parseInt(formData.get('estimated_minutes'), 10) || null,
        task_status: taskStatus,
        done: taskStatus === 'done'
    };
    if (taskStatus === 'active') {
        payload.started_at = new Date().toISOString();
    }
    
    try {
        const result = await api.updateTask(taskId, payload);
        
        if (result.success) {
            window.closeModal();
            window.showToast(window._taskPlanningColumnsMissing ? '✅ 已保存；预计耗时/开始时间需执行数据库迁移后才能保存' : '✅ 已保存');
            // 重新加载当前页面任务列表
            if (window.state && window.state.currentPage === 'tasks') {
                const content = document.getElementById('pageContent');
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
    const statusMeta = window.getTaskStatusMeta(task);
    alert(
        `📋 ${task.title}\n\n` +
        `项目：${proj ? proj.name : '未关联'}\n` +
        `能力：${atIcon} ${atLabel}\n` +
        `优先级：${{high:'高',medium:'中',low:'低'}[task.priority]||task.priority}\n` +
        `截止：${task.due_date || '未设置'}\n` +
        `预计耗时：${window.formatTaskEstimate(task)}\n` +
        `状态：${statusMeta.label}\n` +
        `${task.started_at ? '开始时间：' + window.formatDate(task.started_at).slice(0,16) + '\n' : ''}\n` +
        `创建时间：${task.created_at ? task.created_at.slice(0,16) : '未知'}`
    );
};

// ========== 启动任务页面 ==========

window.loadStartup = async function(content) {
    const [tasksData, logsData, statsData, allTasksData] = await Promise.all([
        api.getStartupTasks(),
        api.getStartupLogs(),
        api.getStartupStats(),
        api.getTasks()
    ]);
    
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
        const data = await api.createStartupTask({name, description});
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
        const data = await api.deleteStartupTask(taskId);
        if (data.success) {
            window.navigateTo('startup');
        }
    } catch (e) {
        alert('删除失败');
    }
};

window.executeStartupTask = async function(taskId, taskName) {
    // 获取当前待办任务列表用于选择目标任务
    const data = await api.getTasks();
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
        const data = await api.createStartupLog({
            startup_task_id: startupTaskId,
            startup_task_name: startupTaskName,
            target_task_id: targetTaskId,
            target_task_name: targetTaskName,
            calmness_before: calmnessBefore,
            calmness_after: calmnessAfter,
            duration_minutes: durationMinutes,
            notes
        });
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
