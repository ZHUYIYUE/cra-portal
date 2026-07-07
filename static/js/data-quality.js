// ========== 数据质量巡检 ==========

window.loadDataQuality = async function(content) {
    var today = window.dqToday();
    var dueWeek = window.dqAddDays(today, 7);
    var staleDate = window.dqAddDays(today, -30);
    var data = await window.dqLoadData();
    var issues = window.dqBuildIssues(data, today, dueWeek, staleDate);
    window.dqCurrentIssues = issues;

    var grouped = window.dqGroupIssues(issues);
    var total = issues.length;
    var high = grouped.high.length;
    var medium = grouped.medium.length;
    var low = grouped.low.length;
    var dataDate = new Date().toLocaleString('zh-CN', { hour12: false });

    content.innerHTML = `
        <section class="dq-shell">
            <div class="dq-head">
                <div>
                    <h2><i class="fas fa-clipboard-check"></i> 数据质量检查</h2>
                    <p>自动扫描项目、中心、待办、监查问题和伦理资料的缺失项与逾期风险</p>
                </div>
                <div class="dq-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.loadPage('quality')"><i class="fas fa-sync-alt"></i> 重新检查</button>
                    <button class="btn btn-primary btn-sm" onclick="window.dqExportCsv()"><i class="fas fa-file-export"></i> 导出清单</button>
                </div>
            </div>

            <div class="dq-summary">
                <button class="dq-summary-card ${high ? 'danger' : 'ok'}" onclick="window.dqScrollTo('high')">
                    <strong>${high}</strong><span>高风险</span>
                </button>
                <button class="dq-summary-card ${medium ? 'warning' : 'ok'}" onclick="window.dqScrollTo('medium')">
                    <strong>${medium}</strong><span>中风险</span>
                </button>
                <button class="dq-summary-card ${low ? '' : 'ok'}" onclick="window.dqScrollTo('low')">
                    <strong>${low}</strong><span>低风险</span>
                </button>
                <div class="dq-summary-card info">
                    <strong>${total}</strong><span>待处理项</span>
                </div>
            </div>

            <div class="dq-note">
                <i class="fas fa-info-circle"></i>
                <span>检查时间：${window.escHtml(dataDate)}。巡检只提示风险，不自动修改数据；请结合源文件、EDC、伦理批件和中心沟通记录判断。</span>
            </div>

            ${window.dqRenderSection('high', '高风险：优先处理', grouped.high, 'danger')}
            ${window.dqRenderSection('medium', '中风险：近期补齐', grouped.medium, 'warning')}
            ${window.dqRenderSection('low', '低风险：完善台账', grouped.low, '')}
        </section>
    `;
};

window.dqLoadData = async function() {
    var results = await Promise.all([
        api.getProjects(),
        api.getCenters(),
        api.getTasks(),
        api.getFindings(),
        api.getEthics(),
        api.getEthicsLetters(),
        api.getPDs()
    ]);
    return {
        projects: results[0].projects || [],
        centers: results[1].centers || [],
        tasks: results[2].tasks || [],
        findings: results[3].findings || [],
        ethics: results[4].ethics || [],
        letters: results[5].letters || [],
        pds: results[6].pds || []
    };
};

window.dqBuildIssues = function(data, today, dueWeek, staleDate) {
    var issues = [];
    var projectById = window.dqIndex(data.projects);
    var centerById = window.dqIndex(data.centers);
    var ethicsByCenter = {};
    data.ethics.forEach(function(e) {
        if (!ethicsByCenter[e.center_id]) ethicsByCenter[e.center_id] = [];
        ethicsByCenter[e.center_id].push(e);
    });

    var add = function(issue) {
        issues.push(Object.assign({ id: issues.length, actionLabel: '查看' }, issue));
    };

    data.projects.forEach(function(p) {
        var projectName = window.dqProjectLabel(p);
        if (!window.dqHasValue(p.name)) {
            add({ severity: 'high', area: '项目', title: '项目缺少名称', target: p.id || '未命名项目', detail: '项目名称为空会影响全局搜索、导出和递交信生成。', action: { type: 'project', id: p.id } });
        }
        if (!window.dqHasValue(p.code)) {
            add({ severity: 'medium', area: '项目', title: '项目缺少方案编号', target: projectName, detail: '方案编号常用于递交信、中心沟通和监查问题定位。', action: { type: 'project', id: p.id } });
        }
        if (!window.dqHasValue(p.dbl_date) && ['进行中', '入组中', '随访中', '数据库锁定前'].includes(p.stage || '')) {
            add({ severity: 'medium', area: '项目', title: '进行中项目缺少 DBL 日期', target: projectName, detail: '缺少 DBL 日期会影响工作台风险判断和项目驾驶舱提醒。', action: { type: 'project', id: p.id } });
        }
        if (p.dbl_date && p.dbl_date < today && !['已完成', '关闭', '已归档'].includes(p.stage || '')) {
            add({ severity: 'high', area: '项目', title: 'DBL 日期已过但项目未关闭', target: projectName, detail: '请确认项目阶段是否需要更新，或 DBL 日期是否需要调整。', action: { type: 'project', id: p.id } });
        }
        if ((p.center_count || 0) === 0) {
            add({ severity: 'low', area: '项目', title: '项目尚未维护中心', target: projectName, detail: '如项目已启动，请补充研究中心，便于任务、问题和伦理资料关联。', action: { type: 'project', id: p.id } });
        }
    });

    data.centers.forEach(function(c) {
        var centerName = window.dqCenterLabel(c);
        var projectName = window.dqProjectLabel(projectById[c.project_id] || {});
        if (!window.dqHasValue(c.project_id) || !projectById[c.project_id]) {
            add({ severity: 'high', area: '中心', title: '中心未关联有效项目', target: centerName, detail: '中心缺少有效项目关联，会导致任务、问题和伦理资料难以归档。', action: { type: 'center', id: c.id } });
        }
        if (!window.dqHasValue(c.code)) {
            add({ severity: 'medium', area: '中心', title: '中心缺少编号', target: centerName, detail: '中心编号缺失会影响监查问题、递交信和导出清单识别。', action: { type: 'center', id: c.id } });
        }
        if (!window.dqHasValue(c.pi_name)) {
            add({ severity: 'high', area: '中心', title: '中心缺少 PI 姓名', target: centerName, detail: 'PI 是递交信、授权分工和中心沟通的关键字段。', action: { type: 'center', id: c.id } });
        }
        if (!window.dqHasValue(c.pi_phone) && !window.dqHasValue(c.pi_email)) {
            add({ severity: 'medium', area: '中心', title: '中心缺少 PI 联系方式', target: centerName, detail: '至少维护电话或邮箱，避免出差/递交时临时查找。', action: { type: 'center', id: c.id } });
        }
        if (!window.dqHasValue(c.contact_crc)) {
            add({ severity: 'medium', area: '中心', title: '中心缺少 CRC 联系人', target: centerName, detail: 'CRC 信息缺失会影响待办跟进和快速复制联系人。', action: { type: 'center', id: c.id } });
        }
        if (!window.dqHasValue(c.contact_ethics) && !(ethicsByCenter[c.id] || []).length) {
            add({ severity: 'medium', area: '中心', title: '中心缺少伦理联系人或伦理记录', target: centerName, detail: '请补充伦理联系方式，或至少维护一条伦理递交记录。项目：' + projectName, action: { type: 'center', id: c.id } });
        }
    });

    data.tasks.forEach(function(t) {
        if (t.done) return;
        var target = t.title || '未命名待办';
        if (!window.dqHasValue(t.title)) {
            add({ severity: 'medium', area: '待办', title: '待办缺少标题', target: target, detail: '标题为空会让工作台和搜索结果不可读。', action: { type: 'task', id: t.id } });
        }
        if (!window.dqHasValue(t.due_date)) {
            add({ severity: 'medium', area: '待办', title: '未完成待办缺少截止日期', target: target, detail: '没有截止日期就无法进入日历、逾期和本周到期提醒。', action: { type: 'task', id: t.id } });
        } else if (t.due_date < today) {
            add({ severity: 'high', area: '待办', title: '待办已逾期', target: target, detail: '截止日期：' + t.due_date + '。请更新状态、延期或关闭。', action: { type: 'task', id: t.id } });
        } else if (t.due_date <= dueWeek && (t.priority || '') === 'high') {
            add({ severity: 'medium', area: '待办', title: '高优先级待办 7 天内到期', target: target, detail: '截止日期：' + t.due_date + '。建议优先安排。', action: { type: 'task', id: t.id } });
        }
        if (!window.dqHasValue(t.project_id) && !window.dqHasValue(t.center_id)) {
            add({ severity: 'low', area: '待办', title: '待办未关联项目或中心', target: target, detail: '建议关联项目或中心，便于驾驶舱汇总。', action: { type: 'task', id: t.id } });
        }
    });

    data.findings.forEach(function(f) {
        var active = !window.dqIsClosedStatus(f.status, ['resolved', 'closed', '已解决', '已关闭']);
        var target = f.finding_number || f.description || '未编号问题';
        if (!window.dqHasValue(f.finding_number)) {
            add({ severity: 'medium', area: '监查问题', title: '监查问题缺少编号', target: target, detail: '问题编号缺失会影响沟通追踪和导出。', action: { type: 'finding', id: f.id } });
        }
        if (active && !window.dqHasValue(f.due_date)) {
            add({ severity: 'high', area: '监查问题', title: '未关闭问题缺少整改截止日', target: target, detail: 'Open/未关闭问题应维护 due date，便于逾期提醒。', action: { type: 'finding', id: f.id } });
        } else if (active && f.due_date < today) {
            add({ severity: 'high', area: '监查问题', title: '监查问题已逾期', target: target, detail: '整改截止日：' + f.due_date + '。请跟进关闭或更新计划。', action: { type: 'finding', id: f.id } });
        }
        if (active && !window.dqHasValue(f.corrective_action)) {
            add({ severity: 'medium', area: '监查问题', title: '未关闭问题缺少整改措施', target: target, detail: '建议补充 CAPA/整改动作，减少后续追问。', action: { type: 'finding', id: f.id } });
        }
        if (active && (f.severity || '').toLowerCase() === 'critical') {
            add({ severity: 'high', area: '监查问题', title: 'Critical 问题仍未关闭', target: target, detail: '请确认是否已有升级、整改和关闭计划。', action: { type: 'finding', id: f.id } });
        }
    });

    data.ethics.forEach(function(e) {
        var projectName = window.dqProjectLabel(projectById[e.project_id] || {});
        var centerName = window.dqCenterLabel(centerById[e.center_id] || {});
        var target = [projectName, centerName, e.doc_name].filter(Boolean).join(' · ') || '伦理记录';
        if (!window.dqHasValue(e.doc_name)) {
            add({ severity: 'medium', area: '伦理资料', title: '伦理记录缺少文件名称', target: target, detail: '文件名称缺失会影响递交清单和版本追踪。', action: { type: 'ethics' } });
        }
        if (!window.dqHasValue(e.version)) {
            add({ severity: 'medium', area: '伦理资料', title: '伦理文件缺少版本号', target: target, detail: '方案、ICF、招募材料等应维护版本号。', action: { type: 'ethics' } });
        }
        if (window.dqIsApprovedStatus(e.status) && !window.dqHasValue(e.approval_date)) {
            add({ severity: 'high', area: '伦理资料', title: '已批准伦理记录缺少批准日期', target: target, detail: '批准日期是启动和归档判断的关键字段。', action: { type: 'ethics' } });
        }
        if (!window.dqHasValue(e.center_id) || !centerById[e.center_id]) {
            add({ severity: 'medium', area: '伦理资料', title: '伦理记录未关联有效中心', target: target, detail: '请确认中心关联，避免资料散落。', action: { type: 'ethics' } });
        }
    });

    data.letters.forEach(function(l) {
        var target = [l.project_name, l.center_name, l.submission_date].filter(Boolean).join(' · ') || '递交信';
        if (!window.dqHasValue(l.project_id) || !window.dqHasValue(l.center_id)) {
            add({ severity: 'high', area: '递交信', title: '递交信缺少项目或中心', target: target, detail: '递交信必须能定位到项目和中心。', action: { type: 'ethics-letter', id: l.id } });
        }
        if (!window.dqHasValue(l.submission_date)) {
            add({ severity: 'medium', area: '递交信', title: '递交信缺少递交日期', target: target, detail: '递交日期缺失会影响时间线和归档。', action: { type: 'ethics-letter', id: l.id } });
        }
        if (!window.dqHasValue(l.submitter_name)) {
            add({ severity: 'low', area: '递交信', title: '递交信缺少递交人', target: target, detail: '建议补充递交人，便于后续追踪。', action: { type: 'ethics-letter', id: l.id } });
        }
        (l.items || []).forEach(function(it) {
            if (!window.dqHasValue(it.doc_name) || !window.dqHasValue(it.version)) {
                add({ severity: 'medium', area: '递交信', title: '递交信文件清单不完整', target: target, detail: '存在文件名称或版本号缺失的清单项，请生成 Word 前补齐。', action: { type: 'ethics-letter', id: l.id } });
            }
        });
    });

    data.pds.forEach(function(pd) {
        var active = !window.dqIsClosedStatus(pd.status, ['closed', '已关闭']);
        var target = pd.pd_number || pd.description || '方案偏离';
        if (!window.dqHasValue(pd.pd_number)) {
            add({ severity: 'medium', area: '方案偏离', title: '方案偏离缺少编号', target: target, detail: '建议补充编号，便于跟踪和伦理递交。', action: { type: 'pd', centerId: pd.center_id } });
        }
        if (active && !window.dqHasValue(pd.corrective_action)) {
            add({ severity: 'medium', area: '方案偏离', title: '未关闭方案偏离缺少整改措施', target: target, detail: '请补充整改/预防措施。', action: { type: 'pd', centerId: pd.center_id } });
        }
        if (active && (pd.severity || '').toLowerCase() === 'major' && !window.dqHasValue(pd.reported_ethics_date)) {
            add({ severity: 'high', area: '方案偏离', title: 'Major 方案偏离缺少伦理报告日期', target: target, detail: '请确认是否需要报告伦理，并维护报告日期或说明。', action: { type: 'pd', centerId: pd.center_id } });
        }
        if (pd.discovered_date && pd.discovered_date < staleDate && active) {
            add({ severity: 'medium', area: '方案偏离', title: '方案偏离超过30天未关闭', target: target, detail: '发现日期：' + pd.discovered_date + '。请确认关闭计划。', action: { type: 'pd', centerId: pd.center_id } });
        }
    });

    return issues.sort(function(a, b) {
        var order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity] || a.area.localeCompare(b.area, 'zh-CN');
    });
};

window.dqRenderSection = function(key, title, issues, tone) {
    var body = issues.length ? issues.map(function(issue) {
        return window.dqRenderIssue(issue);
    }).join('') : '<div class="dq-empty"><i class="fas fa-check-circle"></i> 暂无此类问题。</div>';
    return `
        <section class="dq-section" id="dq-${key}">
            <div class="dq-section-title ${tone}">
                <h3>${window.escHtml(title)}</h3>
                <span>${issues.length}项</span>
            </div>
            <div class="dq-list">${body}</div>
        </section>
    `;
};

window.dqRenderIssue = function(issue) {
    var icon = issue.severity === 'high' ? 'fa-triangle-exclamation' : issue.severity === 'medium' ? 'fa-circle-exclamation' : 'fa-circle-info';
    return `
        <article class="dq-item ${issue.severity}">
            <div class="dq-item-icon"><i class="fas ${icon}"></i></div>
            <div class="dq-item-main">
                <div class="dq-item-line">
                    <span class="dq-area">${window.escHtml(issue.area)}</span>
                    <strong>${window.escHtml(issue.title)}</strong>
                </div>
                <div class="dq-target">${window.escHtml(issue.target || '')}</div>
                <p>${window.escHtml(issue.detail || '')}</p>
            </div>
            <button class="btn btn-sm btn-outline" onclick="window.dqOpenIssue(${issue.id})">${window.escHtml(issue.actionLabel || '查看')}</button>
        </article>
    `;
};

window.dqOpenIssue = async function(id) {
    var issue = (window.dqCurrentIssues || []).find(function(item) { return item.id === id; });
    if (!issue || !issue.action) return;
    var action = issue.action;
    if (action.type === 'project') {
        await window.navigateTo('projects');
        if (action.id && window.viewProject) window.viewProject(action.id);
    } else if (action.type === 'center') {
        if (action.id && window.openCenterDetail) await window.openCenterDetail(action.id);
    } else if (action.type === 'task') {
        await window.navigateTo('tasks');
        if (action.id && window.viewTask) window.viewTask(action.id);
    } else if (action.type === 'finding') {
        await window.navigateTo('findings');
        if (action.id && window.highlightFinding) window.highlightFinding(action.id);
    } else if (action.type === 'ethics' || action.type === 'ethics-letter') {
        await window.navigateTo('ethics');
        if (action.type === 'ethics-letter' && action.id && window.viewEthicsLetter) window.viewEthicsLetter(action.id);
    } else if (action.type === 'pd') {
        if (action.centerId && window.openCenterDetail) {
            await window.openCenterDetail(action.centerId, '方案偏离');
        }
    }
};

window.dqExportCsv = function() {
    var issues = window.dqCurrentIssues || [];
    if (!issues.length) {
        window.showToast ? window.showToast('当前没有可导出的质量问题', 'info') : alert('当前没有可导出的质量问题');
        return;
    }
    var rows = [['风险等级', '模块', '问题', '对象', '说明']];
    issues.forEach(function(i) {
        rows.push([window.dqSeverityLabel(i.severity), i.area, i.title, i.target || '', i.detail || '']);
    });
    var csv = rows.map(function(row) {
        return row.map(function(cell) { return '"' + String(cell || '').replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cra-portal-data-quality-' + window.dqToday() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

window.dqGroupIssues = function(issues) {
    return {
        high: issues.filter(function(i) { return i.severity === 'high'; }),
        medium: issues.filter(function(i) { return i.severity === 'medium'; }),
        low: issues.filter(function(i) { return i.severity === 'low'; })
    };
};

window.dqIndex = function(items) {
    var map = {};
    (items || []).forEach(function(item) { map[item.id] = item; });
    return map;
};

window.dqHasValue = function(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
};

window.dqNormalizeStatus = function(status) {
    return String(status || '').trim().toLowerCase();
};

window.dqIsApprovedStatus = function(status) {
    return ['approved', 'approve', '批准', '已批准', '已获批'].includes(window.dqNormalizeStatus(status));
};

window.dqIsClosedStatus = function(status, closedStatuses) {
    return closedStatuses.includes(window.dqNormalizeStatus(status));
};

window.dqProjectLabel = function(project) {
    return [project.code, project.name].filter(window.dqHasValue).join(' ') || '未命名项目';
};

window.dqCenterLabel = function(center) {
    return [center.code, center.name].filter(window.dqHasValue).join(' ') || '未命名中心';
};

window.dqSeverityLabel = function(severity) {
    return severity === 'high' ? '高风险' : severity === 'medium' ? '中风险' : '低风险';
};

window.dqToday = function() {
    return new Date().toISOString().split('T')[0];
};

window.dqAddDays = function(dateStr, days) {
    var date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

window.dqScrollTo = function(key) {
    var el = document.getElementById('dq-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
