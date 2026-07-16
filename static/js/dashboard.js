// ========== 总览页面 + 日历 ==========

// 当前日历月份
let _calYear, _calMonth;

window.loadDashboard = async function(content) {
    const [statsData, projData, centersData, tasksData, findingsData, lettersData, packagesData, workItemsData, trainingData] = await Promise.all([
        api.getStats(), api.getProjects(), api.getCenters(), api.getTasks(), api.getFindings(), api.getEthicsLetters(), api.getEthicsSubmissionPackages(), api.getCenterWorkItems(), api.getTrainingPlans()
    ]);
    
    if (window.state) {
        window.state.projects = projData.projects || [];
        window.state.tasks = tasksData.tasks || [];
    }

    const centers = centersData.centers || [];
    const tasks = tasksData.tasks || [];
    const findings = findingsData.findings || [];
    const letters = lettersData.letters || [];
    const ethicsPackages = packagesData.packages || [];
    const workItems = workItemsData.items || [];
    const trainingPlans = trainingData.plans || [];
    const s = statsData.stats || {};
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const openTasks = tasks.filter(t => !t.done);
    const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < todayStr);
    const todayTasks = openTasks.filter(t => t.due_date === todayStr);
    const dueWeekTasks = openTasks.filter(t => t.due_date && t.due_date >= todayStr && t.due_date <= weekStr);
    const waitingCrcTasks = openTasks.filter(t => t.task_status === 'waiting_crc');
    const activeFindings = findings.filter(f => !['Resolved', 'Closed'].includes(f.status));
    const overdueFindings = activeFindings.filter(f => f.due_date && f.due_date < todayStr);
    const activeTrainingPlans = trainingPlans.filter(p => p.status !== '已完成');
    const overdueTrainingPlans = activeTrainingPlans.filter(p => p.status === '需跟进' || (p.due_date && p.due_date < todayStr));
    const dueWeekTrainingPlans = activeTrainingPlans.filter(p => p.due_date && p.due_date >= todayStr && p.due_date <= weekStr);
    const ethicsFollowups = ethicsPackages.filter(function(pkg) {
        return pkg.status !== '已完成' && (!window.getEthicsPackageNextStep || window.getEthicsPackageNextStep(pkg));
    }).sort(function(a, b) {
        return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31');
    });
    const workItemFollowups = workItems.filter(function(item) {
        return item.status !== '已完成' && (window.workItemTone ? window.workItemTone(item) === 'danger' || item.status === '等待外部反馈' : true);
    }).sort(function(a, b) { return (a.follow_up_date || a.due_date || '9999-12-31').localeCompare(b.follow_up_date || b.due_date || '9999-12-31'); });
    const riskCenters = centers
        .filter(c => (c.task_count || 0) > 0 || (c.open_finding_count || 0) > 0)
        .sort((a, b) => ((b.open_finding_count || 0) * 3 + (b.task_count || 0)) - ((a.open_finding_count || 0) * 3 + (a.task_count || 0)))
        .slice(0, 4);

    const uniqueTasks = Array.from(new Map(overdueTasks.concat(todayTasks).concat(dueWeekTasks).map(t => [t.id, t])).values()).slice(0, 6);
    const taskRows = uniqueTasks.length ? uniqueTasks.map(t => {
        const isOverdue = t.due_date && t.due_date < todayStr;
        const isToday = t.due_date === todayStr;
        return `<button class="wb-list-row" onclick="window.viewTask('${t.id}')">
            <span class="wb-row-main">
                <strong>${window.escHtml(t.title)}</strong>
                <small>${window.escHtml(t.project_name || '')}${t.center_name ? ' · ' + window.escHtml(t.center_name) : ''}</small>
            </span>
            <span class="wb-chip ${isOverdue ? 'danger' : isToday ? 'warning' : ''}">${t.due_date || '无日期'}</span>
        </button>`;
    }).join('') : '<div class="wb-empty">今天没有明确到期的待办。</div>';

    const findingRows = activeFindings.slice(0, 5).map(f => {
        const isOverdue = f.due_date && f.due_date < todayStr;
        return `<button class="wb-list-row" onclick="window.navigateTo('findings')">
            <span class="wb-row-main">
                <strong>${window.escHtml(f.finding_number || '未编号问题')}</strong>
                <small>${window.escHtml(f.center_name || f.project_name || '')}</small>
            </span>
            <span class="wb-chip ${isOverdue ? 'danger' : ''}">${window.escHtml(f.status || 'Open')}</span>
        </button>`;
    }).join('') || '<div class="wb-empty">暂无需要跟进的监查问题。</div>';

    const centerRows = riskCenters.map(c => `<button class="wb-list-row" onclick="window.openCenterDetail('${c.id}')">
        <span class="wb-row-main">
            <strong>${window.escHtml((c.code || '') + ' ' + (c.name || ''))}</strong>
            <small>${c.task_count || 0} 个待办 · ${c.open_finding_count || 0} 个Open问题</small>
        </span>
        <i class="fas fa-chevron-right"></i>
    </button>`).join('') || '<div class="wb-empty">暂无高风险中心。</div>';

    const letterRows = letters.slice(0, 4).map(l => `<button class="wb-list-row" onclick="window.viewEthicsLetter ? window.viewEthicsLetter('${l.id}') : window.navigateTo('ethics')">
        <span class="wb-row-main">
            <strong>${window.escHtml(l.project_name || '未选择项目')}</strong>
            <small>${window.escHtml(l.center_name || '')} · ${l.submission_date || '未设日期'}</small>
        </span>
        <span class="wb-chip">${(l.items || []).length}份</span>
    </button>`).join('') || '<div class="wb-empty">暂无递交信记录。</div>';

    const trainingRows = activeTrainingPlans
        .slice()
        .sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'))
        .slice(0, 5)
        .map(p => {
            const isRisk = p.status === '需跟进' || (p.due_date && p.due_date < todayStr);
            const isSoon = p.due_date && p.due_date >= todayStr && p.due_date <= weekStr;
            return `<button class="wb-list-row" onclick="window.navigateTo('training').then(function(){ window.viewTrainingPlan('${p.id}'); })">
                <span class="wb-row-main">
                    <strong>${window.escHtml(p.title || '未命名培训计划')}</strong>
                    <small>${window.escHtml(p.center_name || p.project_name || '')} · ${p.completed_count || 0}/${p.required_count || 0} 已完成</small>
                </span>
                <span class="wb-chip ${isRisk ? 'danger' : isSoon ? 'warning' : ''}">${window.escHtml(p.due_date || p.status || '进行中')}</span>
            </button>`;
        }).join('') || '<div class="wb-empty">暂无需要跟进的培训计划。</div>';

    const ethicsRows = ethicsFollowups.slice(0, 5).map(function(pkg) {
        var step = window.getEthicsPackageNextStep ? window.getEthicsPackageNextStep(pkg) : null;
        var isOverdue = pkg.due_date && pkg.due_date < todayStr;
        return `<button class="wb-list-row" onclick="window.openDashboardEthicsPackage('${pkg.id}')">
            <span class="wb-row-main">
                <strong>${window.escHtml(pkg.package_name || '未命名递交包')}</strong>
                <small>${window.escHtml(pkg.center_name || pkg.project_name || '')} · ${window.escHtml(step ? step.label : '待跟进')}</small>
            </span>
            <span class="wb-chip ${isOverdue ? 'danger' : ''}">${pkg.due_date || window.escHtml(pkg.status || '进行中')}</span>
        </button>`;
    }).join('') || '<div class="wb-empty">暂无需要跟进的伦理递交包。</div>';

    const workItemRows = workItemFollowups.slice(0, 5).map(function(item) {
        var tone = window.workItemTone ? window.workItemTone(item) : '';
        var next = window.getWorkItemNextStep ? window.getWorkItemNextStep(item) : item.next_action;
        return `<button class="wb-list-row" onclick="window.openDashboardWorkItem('${item.id}')"><span class="wb-row-main"><strong>${window.escHtml(item.title || '未命名中心事项')}</strong><small>${window.escHtml(item.center_name || item.project_name || '')} · ${window.escHtml(next || '补充下一步')}</small></span><span class="wb-chip ${tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : ''}">${item.follow_up_date || item.due_date || window.escHtml(item.status || '进行中')}</span></button>`;
    }).join('') || '<div class="wb-empty">暂无需要催办的中心事项。</div>';
    
    content.innerHTML = `
        <section class="workbench-shell">
            <div class="workbench-head">
                <div>
                    <h2>今日工作台</h2>
                    <p>${todayStr} · 先处理风险最高、最临近截止的事项</p>
                </div>
                <div class="workbench-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.showAddTask()"><i class="fas fa-plus"></i> 新建待办</button>
                    <button class="btn btn-outline btn-sm" onclick="window.navigateTo('findings').then(function(){ window.openNewFindingForm(); })"><i class="fas fa-search-plus"></i> 录入问题</button>
                    <button class="btn btn-outline btn-sm" onclick="window.navigateTo('ethics').then(function(){ window.openEthicsLetterForm(); })"><i class="fas fa-file-word"></i> 新建递交信</button>
                </div>
            </div>
            <div class="workbench-metrics">
                <button class="wb-metric ${overdueTasks.length ? 'danger' : ''}" onclick="window.openDashboardTasks('overdue')"><strong>${overdueTasks.length}</strong><span>逾期待办</span></button>
                <button class="wb-metric ${todayTasks.length ? 'warning' : ''}" onclick="window.openDashboardTasks('today')"><strong>${todayTasks.length}</strong><span>今日到期</span></button>
                <button class="wb-metric" onclick="window.openDashboardTasks('due_week')"><strong>${dueWeekTasks.length}</strong><span>本周到期</span></button>
                <button class="wb-metric ${waitingCrcTasks.length ? 'warning' : ''}" onclick="window.openDashboardTasks('waiting_crc')"><strong>${waitingCrcTasks.length}</strong><span>等CRC</span></button>
                <button class="wb-metric ${activeFindings.length ? 'danger' : ''}" onclick="window.navigateTo('findings')"><strong>${activeFindings.length}</strong><span>未关闭问题</span></button>
                <button class="wb-metric ${overdueFindings.length ? 'danger' : ''}" onclick="window.navigateTo('findings')"><strong>${overdueFindings.length}</strong><span>逾期问题</span></button>
                <button class="wb-metric ${overdueTrainingPlans.length ? 'danger' : ''}" onclick="window.navigateTo('training')"><strong>${overdueTrainingPlans.length}</strong><span>培训风险</span></button>
                <button class="wb-metric ${dueWeekTrainingPlans.length ? 'warning' : ''}" onclick="window.navigateTo('training')"><strong>${dueWeekTrainingPlans.length}</strong><span>培训本周到期</span></button>
                <button class="wb-metric ${ethicsFollowups.length ? 'warning' : ''}" onclick="window.navigateTo('ethics')"><strong>${ethicsFollowups.length}</strong><span>伦理待跟进</span></button>
                <button class="wb-metric ${workItemFollowups.length ? 'danger' : ''}" onclick="window.navigateTo('work-items')"><strong>${workItemFollowups.length}</strong><span>中心事项待跟进</span></button>
            </div>
            <div class="workbench-grid">
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-list-check"></i> 优先处理</div>
                    ${taskRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-magnifying-glass-chart"></i> 监查问题</div>
                    ${findingRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-hospital-user"></i> 关注中心</div>
                    ${centerRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-file-contract"></i> 近期递交信</div>
                    ${letterRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-scale-balanced"></i> 伦理闭环</div>
                    ${ethicsRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-list-check"></i> 中心事项催办</div>
                    ${workItemRows}
                </div>
                <div class="workbench-panel">
                    <div class="wb-panel-title"><i class="fas fa-graduation-cap"></i> 培训跟进</div>
                    ${trainingRows}
                </div>
            </div>
        </section>

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
        ${overdueTrainingPlans.length > 0 ? `<div class="alert-banner" style="background:#fff1f1;border-left:4px solid #e74c3c;"><i class="fas fa-graduation-cap" style="color:#e74c3c;"></i> 有 <strong>${overdueTrainingPlans.length}</strong> 个培训计划逾期或需跟进！</div>` : ''}

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

window.openDashboardTasks = function(filter) {
    window.navigateTo('tasks').then(function() {
        if (window.applyTaskFilter) window.applyTaskFilter(filter);
    });
};

window.openDashboardEthicsPackage = async function(id) {
    await window.navigateTo('ethics');
    if (window.viewEthicsPackage) window.viewEthicsPackage(id);
};
window.openDashboardWorkItem = async function(id) { await window.navigateTo('work-items'); if (window.viewWorkItem) window.viewWorkItem(id); };
window.renderCal = async function() {
    // 获取所有未完成任务
    const data = await api.getTasks();
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
    
    api.getTasks().then(function(data) {
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
