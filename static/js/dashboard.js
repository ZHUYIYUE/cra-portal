// ========== 总览页面 + 日历 ==========

// 当前日历月份
let _calYear, _calMonth;

window.loadDashboard = async function(content) {
    const [statsRes, projectsRes, centersRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/projects'), fetch('/api/centers')
    ]);
    const stats = await statsRes.json();
    const projData = await projectsRes.json();
    const centersData = await centersRes.json();
    
    if (window.state) {
        window.state.projects = projData.projects || [];
    }
    const centers = centersData.centers || [];
    
    const s = stats.stats || {};
    const centerProgress = s.center_progress || [];
    
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card stat-blue">
                <i class="fas fa-folder-open"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.total_projects || 0}</span>
                    <span class="stat-label">项目总数</span>
                </div>
            </div>
            <div class="stat-card stat-orange">
                <i class="fas fa-tasks"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.pending_tasks || 0}</span>
                    <span class="stat-label">待办事项</span>
                </div>
            </div>
            <div class="stat-card ${s.overdue_tasks > 0 ? 'stat-red' : 'stat-green'}">
                <i class="fas fa-exclamation-circle"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.overdue_tasks || 0}</span>
                    <span class="stat-label">逾期待办</span>
                </div>
            </div>
            <div class="stat-card stat-red">
                <i class="fas fa-search"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.open_findings || 0}</span>
                    <span class="stat-label">Open问题</span>
                </div>
            </div>
            <div class="stat-card stat-yellow">
                <i class="fas fa-clock"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.due_soon || 0}</span>
                    <span class="stat-label">本周到期</span>
                </div>
            </div>
            <div class="stat-card stat-purple">
                <i class="fas fa-hospital"></i>
                <div class="stat-info">
                    <span class="stat-num">${centers.length || 0}</span>
                    <span class="stat-label">中心总数</span>
                </div>
            </div>
        </div>

        ${s.overdue_tasks > 0 ? `<div class="alert-banner" style="background:#ffebee;border-left:4px solid #f44336;"><i class="fas fa-exclamation-triangle" style="color:#f44336;"></i> 有 <strong>${s.overdue_tasks}</strong> 个待办已逾期！</div>` : ''}
        ${s.due_soon > 0 ? `<div class="alert-banner" style="background:#fff8e1;border-left:4px solid #ff9800;"><i class="fas fa-clock" style="color:#ff9800;"></i> 有 <strong>${s.due_soon}</strong> 个任务将在7天内到期！</div>` : ''}

        <div class="card">
            <div class="card-header">
                <i class="fas fa-calendar-alt"></i> 任务日历
                <div class="cal-nav">
                    <button onclick="window.calPrev()" class="cal-nav-btn"><i class="fas fa-chevron-left"></i></button>
                    <span id="calTitle"></span>
                    <button onclick="window.calNext()" class="cal-nav-btn"><i class="fas fa-chevron-right"></i></button>
                    <button onclick="window.calToday()" class="cal-nav-btn" style="margin-left:8px;font-size:12px;">今天</button>
                </div>
            </div>
            <div id="calGrid" class="cal-grid"></div>
            <div id="calPopup" class="cal-popup" style="display:none;"></div>
        </div>

        <div class="card">
            <div class="card-header"><i class="fas fa-folder"></i> 项目列表</div>
            <div class="projects-grid">
                ${(window.state && window.state.projects.length === 0 ? '<p style="color:#999;grid-column:1/-1;">暂无项目，去"项目"页面创建一个吧</p>' :
                    (window.state ? window.state.projects : []).map(p => `
                        <div class="project-card" onclick="window.viewProject('${p.id}')">
                            <h3><i class="fas fa-folder"></i> ${window.escHtml(p.name)}</h3>
                            <p>编号: ${window.escHtml(p.code || '未设置')}</p>
                            <p>中心: ${p.center_count || 0} 个</p>
                            <p>待办: ${p.task_count || 0} 项</p>
                            <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${window.escHtml(p.stage)}</span>
                            ${p.dbl_date ? `<small style="color:#e74c3c;">DBL: ${window.escHtml(p.dbl_date)}</small>` : ''}
                        </div>
                    `).join('')
                )}
            </div>
        </div>
    `;
    
    // 初始化日历
    const now = new Date();
    _calYear = now.getFullYear();
    _calMonth = now.getMonth();
    window.renderCal();
};

window.renderCal = async function() {
    // 获取所有未完成任务
    const res = await fetch('/api/tasks');
    const data = await res.json();
    const tasks = (data.tasks || []).filter(t => !t.done && t.due_date);
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    // 按日期分组
    const byDate = {};
    tasks.forEach(t => {
        if (!byDate[t.due_date]) byDate[t.due_date] = [];
        byDate[t.due_date].push(t);
    });
    
    const title = document.getElementById('calTitle');
    if (title) title.textContent = `${_calYear}年${_calMonth+1}月`;
    
    const grid = document.getElementById('calGrid');
    if (!grid) return;
    
    const firstDay = new Date(_calYear, _calMonth, 1);
    const lastDay = new Date(_calYear, _calMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();
    
    // 周头
    const weekDays = ['日','一','二','三','四','五','六'];
    let html = '<div class="cal-row cal-header">' + weekDays.map(d => `<div class="cal-cell">${d}</div>`).join('') + '</div>';
    
    // 日期格
    let dayNum = 1;
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
        if (i % 7 === 0) html += '<div class="cal-row">';
        if (i < startDow || dayNum > daysInMonth) {
            html += '<div class="cal-cell cal-empty"></div>';
        } else {
            const dateStr = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
            const dayTasks = byDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isOverdue = dateStr < todayStr && dayTasks.length > 0;
            const cls = ['cal-cell', 'cal-day', isToday && 'cal-today', isOverdue && 'cal-overdue'].filter(Boolean).join(' ');
            html += `<div class="${cls}" onclick="window.showDayTasks('${dateStr}')">
                <span class="cal-daynum">${dayNum}</span>
                ${dayTasks.length > 0 ? `<span class="cal-badge${dayTasks.some(t=>t.priority==='high')?' cal-badge-high':''}">${dayTasks.length}</span>` : ''}
            </div>`;
            dayNum++;
        }
        if (i % 7 === 6) html += '</div>';
    }
    grid.innerHTML = html;
};

window.showDayTasks = function(dateStr) {
    const popup = document.getElementById('calPopup');
    if (!popup) return;
    
    // 关闭已打开的弹窗
    if (popup.style.display !== 'none' && popup.dataset.date === dateStr) {
        popup.style.display = 'none';
        return;
    }
    
    fetch('/api/tasks').then(r => r.json()).then(data => {
        const tasks = (data.tasks || []).filter(t => t.due_date === dateStr);
        popup.dataset.date = dateStr;
        
        if (tasks.length === 0) {
            popup.innerHTML = `<div class="cal-popup-title">${dateStr}</div><p style="color:#999;padding:10px;">该日无到期任务</p>`;
        } else {
            const doneCount = tasks.filter(t => t.done).length;
            popup.innerHTML = `<div class="cal-popup-title">${dateStr} <small>(${doneCount}/${tasks.length} 已完成)</small></div>` +
                tasks.map(t => {
                    const pClass = t.priority === 'high' ? 'cal-task-high' : t.priority === 'medium' ? 'cal-task-med' : 'cal-task-low';
                    const statusIcon = t.done ? '✅' : (dateStr < new Date().toISOString().slice(0,10) ? '🔴' : '⚪');
                    return `<div class="cal-task-item ${pClass}" onclick="window.viewTask('${t.id}')">
                        ${statusIcon} <span class="${t.done ? 'cal-task-done' : ''}">${window.escHtml(t.title)}</span>
                        <small>${t.center_name || ''}</small>
                    </div>`;
                }).join('');
        }
        popup.style.display = 'block';
    });
};

window.calPrev = function() {
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    window.renderCal();
};

window.calNext = function() {
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    window.renderCal();
};

window.calToday = function() {
    const now = new Date();
    _calYear = now.getFullYear();
    _calMonth = now.getMonth();
    window.renderCal();
};

window.viewTask = function(taskId) {
    // 跳转到任务页并高亮
    document.querySelector('[data-page="tasks"]').click();
    setTimeout(() => {
        const el = document.querySelector(`[data-task-id="${taskId}"]`);
        if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
    }, 500);
};
