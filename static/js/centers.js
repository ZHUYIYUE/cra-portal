// ========== 中心详情页 + Tab 渲染 + 所有表单 ==========

// Tab 定义
window.CENTER_TABS = ['概览', '研究人员', '伦理递交', '方案偏离', '关联数据'];

// 研究人员角色
window.STAFF_ROLES = ['PI', 'Sub-I', '研究护士', '药品管理员', 'CRC', '质控'];

// 伦理递交类型
window.ETHICS_TYPES = ['初始伦理', '修正案', '方案偏离', '备案类文件', 'SAE报告', '年度报告', '结题报告'];

// 审查方式
window.REVIEW_METHODS = ['会议审查', '快审', '备案'];

// 方案偏离严重程度
window.PD_SEVERITIES = ['Minor', 'Major'];

// 方案偏离状态
window.PD_STATUSES = ['Open', 'Closed'];

// ========== 加载中心详情 ==========

window.loadCenterDetail = async function(content) {
    const centerId = window.state ? window.state.currentCenterId : null;
    if (!centerId) {
        content.innerHTML = '<p style="color:#999;">未选择中心</p>';
        return;
    }
    const [centerData, staffData, ethicsData, pdsData, tasksData, findingsData] = await Promise.all([
        api.getCenter(centerId),
        api.getStaff(centerId),
        api.getEthics(centerId),
        api.getPDs(centerId),
        api.getTasks({center_id: centerId}),
        api.getFindings({center_id: centerId})
    ]);
    const center = centerData.center || {};
    const staff = staffData.staff || [];
    const ethics = ethicsData.ethics || [];
    const pds = pdsData.pds || [];
    const centerTasks = tasksData.tasks || [];
    const centerFindings = findingsData.findings || [];
    const today = new Date().toISOString().split('T')[0];

    // 缓存数据，避免切换 Tab 重复请求
    window._cdc = { center, staff, ethics, pds, centerTasks, centerFindings, today };

    if (window.state && !window.state.centerDetailTab) window.state.centerDetailTab = '概览';

    content.innerHTML = `
        <div class="center-detail-page">
            <div class="page-header" style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <button class="btn btn-text" onclick="window.navigateTo('dashboard')" style="padding:4px 8px;"><i class="fas fa-arrow-left"></i> 返回</button>
                <h2 style="margin:0;font-size:1.2em;"><i class="fas fa-hospital" style="color:#3498db;"></i> ${window.escHtml(center.code || '')} ${window.escHtml(center.name || '')}</h2>
            </div>
            <div class="tab-bar" style="display:flex;border-bottom:2px solid #e0e0e0;margin-bottom:16px;overflow-x:auto;">
                ${window.CENTER_TABS.map(tab => `
                    <button class="tab-btn ${window.state && window.state.centerDetailTab === tab ? 'active' : ''}" 
                            onclick="window.switchCenterTab('${tab}', this)"
                            style="padding:10px 18px;border:none;background:none;cursor:pointer;font-size:14px;border-bottom:3px solid transparent;white-space:nowrap;">
                        ${tab}
                    </button>
                `).join('')}
            </div>
            <div id="center-tab-content"></div>
        </div>
    `;

    window.renderCenterTabContent('概览', window._cdc);
};

window.switchCenterTab = function(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (window.state) {
        window.state.centerDetailTab = tab;
    }
    // 直接用缓存数据，无需重新请求
    window.renderCenterTabContent(tab, window._cdc || {});
};

// 切换 Tab 后从缓存重新渲染（不请求 API）
window.refreshTabFromCache = function(tab) {
    window.renderCenterTabContent(tab, window._cdc || {});
};

// 缓存刷新：只重新拉取单个模块数据，更新缓存后刷新当前 Tab
window.refreshCacheAndTab = async function(tabs) {
    const centerId = window.state ? window.state.currentCenterId : null;
    if (!centerId) return;
    const needs = [];
    if (tabs.includes('staff')) needs.push(api.getStaff(centerId).then(function(d) { window._cdc.staff = d.staff || []; }));
    if (tabs.includes('ethics')) needs.push(api.getEthics(centerId).then(function(d) { window._cdc.ethics = d.ethics || []; }));
    if (tabs.includes('pds')) needs.push(api.getPDs(centerId).then(function(d) { window._cdc.pds = d.pds || []; }));
    if (tabs.includes('tasks')) needs.push(api.getTasks({center_id: centerId}).then(function(d) { window._cdc.centerTasks = d.tasks || []; }));
    if (tabs.includes('findings')) needs.push(api.getFindings({center_id: centerId}).then(function(d) { window._cdc.centerFindings = d.findings || []; }));
    await Promise.all(needs);
    window.refreshTabFromCache(window.state ? window.state.centerDetailTab : '概览');
};

window.renderCenterTabContent = function(tab, data) {
    const { center, staff, ethics, pds, centerTasks, centerFindings, today } = data;
    const el = document.getElementById('center-tab-content');
    if (!el) return;
    if (tab === '概览') window.renderCenterTabOverview(el, center);
    else if (tab === '研究人员') window.renderCenterTabStaff(el, staff, center.id);
    else if (tab === '伦理递交') window.renderCenterTabEthics(el, ethics, center.id);
    else if (tab === '方案偏离') window.renderCenterTabPDs(el, pds, center.id);
    else if (tab === '关联数据') window.renderCenterTabLinks(el, centerTasks, centerFindings, center.id, today);
};

// ========== Tab 1: 概览 ==========

window.renderCenterTabOverview = function(el, c) {
    const infoItem = (icon, bg, label, value) => value ? `
        <div class="cd-info-card">
            <div class="cd-info-icon" style="background:${bg};">${icon}</div>
            <div class="cd-info-body">
                <div class="cd-info-label">${label}</div>
                <div class="cd-info-value">${window.escHtml(value)}</div>
            </div>
        </div>` : '';
    el.innerHTML = `
        <div class="cd-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div style="font-size:1.05em;font-weight:600;color:#2c3e50;"><i class="fas fa-hospital" style="color:#3498db;margin-right:6px;"></i>${window.escHtml(c.code||'')} ${window.escHtml(c.name||'')}</div>
                <button class="btn btn-sm btn-primary" onclick="window.editCenterInfo('${c.id}')" style="border-radius:20px;padding:5px 14px;font-size:0.85em;"><i class="fas fa-edit"></i> 编辑</button>
            </div>
            ${c.pi_name || c.pi_phone || c.pi_email ? `
                <div class="cd-section-title"><i class="fas fa-user-md"></i> 主要研究者</div>
                <div class="cd-grid-2">
                    ${infoItem('<i class="fas fa-user" style="color:#d46b08;"></i>', '#fff3e0', 'PI 姓名', c.pi_name)}
                    ${infoItem('<i class="fas fa-phone" style="color:#2980b9;"></i>', '#e8f4fd', 'PI 电话', c.pi_phone)}
                </div>
                ${infoItem('<i class="fas fa-envelope" style="color:#722ed1;"></i>', '#f9f0ff', 'PI 邮箱', c.pi_email)}
            ` : ''}
            ${c.contact_crc || c.contact_crc_phone ? `
                <div class="cd-section-title"><i class="fas fa-headset"></i> CRC 信息</div>
                <div class="cd-grid-2">
                    ${infoItem('<i class="fas fa-user-circle" style="color:#c62828;"></i>', '#fce4ec', 'CRC 姓名', c.contact_crc)}
                    ${infoItem('<i class="fas fa-phone-alt" style="color:#2e7d32;"></i>', '#e8f5e9', 'CRC 电话', c.contact_crc_phone)}
                </div>
            ` : ''}
            ${c.department ? `
                <div class="cd-section-title"><i class="fas fa-stethoscope"></i> 机构信息</div>
                ${infoItem('<i class="fas fa-building" style="color:#1565c0;"></i>', '#e3f2fd', '科室', c.department)}
            ` : ''}
            ${c.contact_ethics ? `
                <div class="cd-section-title"><i class="fas fa-balance-scale"></i> 伦理联系</div>
                <div class="cd-info-card" style="align-items:flex-start;">
                    <div class="cd-info-icon" style="background:#fff7e6;"><i class="fas fa-clipboard-list" style="color:#d46b08;"></i></div>
                    <div class="cd-info-body">
                        <div class="cd-info-label">联系方式</div>
                        <div class="cd-info-value" style="white-space:pre-line;line-height:1.6;">${window.escHtml(c.contact_ethics)}</div>
                    </div>
                </div>
            ` : ''}
            ${c.address ? `
                <div class="cd-section-title"><i class="fas fa-map-marker-alt"></i> 地址</div>
                ${infoItem('<i class="fas fa-map-pin" style="color:#e74c3c;"></i>', '#fff1f0', '医院地址', c.address)}
            ` : ''}
            ${!c.pi_name && !c.contact_crc && !c.department && !c.contact_ethics && !c.address ? `
                <div class="cd-empty">
                    <i class="fas fa-hospital"></i>
                    暂无基本信息<br><small style="font-size:0.85em;">点击右上角「编辑」添加</small>
                </div>
            ` : ''}
        </div>
    `;
};

// ========== Tab 2: 研究人员 ==========

window.renderCenterTabStaff = function(el, staffList, centerId) {
    const certIcon = (collected, date) => collected
        ? `<span class="cd-badge cd-badge-approved"><i class="fas fa-check-circle"></i> ${date || '已收'}</span>`
        : `<span class="cd-badge cd-badge-open"><i class="fas fa-times-circle"></i> 未收</span>`;
    el.innerHTML = `
        <div class="cd-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div><span style="font-size:1em;font-weight:600;color:#2c3e50;"><i class="fas fa-users" style="color:#3498db;margin-right:6px;"></i>研究人员</span>
                    <span style="background:#e8f4fd;color:#2980b9;padding:2px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;">${staffList.length} 人</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.openNewStaffForm('${centerId}')" style="border-radius:20px;padding:5px 14px;font-size:0.85em;"><i class="fas fa-plus"></i> 新增</button>
            </div>
            ${staffList.length === 0 ? `
                <div class="cd-empty">
                    <i class="fas fa-user-friends"></i>
                    暂无研究人员记录<br><small style="font-size:0.85em;">点击右上角「新增」添加</small>
                </div>` :
            `<div style="overflow-x:auto;border-radius:10px;border:1px solid #e8ecf0;">
                <table class="cd-table">
                    <thead><tr>
                        <th>姓名 / 缩写</th><th>角色</th><th>联系方式</th>
                        <th>授权日期</th><th>GCP</th><th>简历</th><th>执照</th><th></th>
                    </tr></thead>
                    <tbody>
                        ${staffList.map(s => `
                        <tr>
                            <td>
                                <div style="font-weight:600;color:#2c3e50;">${window.escHtml(s.name)}</div>
                                ${s.initials ? `<div style="font-size:0.8em;color:#8896a4;">(${window.escHtml(s.initials)})</div>` : ''}
                            </td>
                            <td><span class="role-badge ${window.escHtml(s.role)}">${window.escHtml(s.role)}</span></td>
                            <td>
                                ${s.phone ? `<div style="display:flex;align-items:center;gap:4px;font-size:0.85em;"><i class="fas fa-phone" style="color:#8896a4;"></i>${window.escHtml(s.phone)}</div>` : ''}
                                ${s.email ? `<div style="display:flex;align-items:center;gap:4px;font-size:0.8em;color:#8896a4;margin-top:2px;"><i class="fas fa-envelope" style="color:#8896a4;"></i>${window.escHtml(s.email)}</div>` : ''}
                            </td>
                            <td>${s.auth_date ? `<span style="color:#2c3e50;">${s.auth_date}</span>` : '<span style="color:#bcc4ce;">—</span>'}</td>
                            <td>${certIcon(s.gcp_collected, s.gcp_date)}</td>
                            <td>${certIcon(s.cv_collected, s.cv_date)}</td>
                            <td>${certIcon(s.license_collected, s.license_date)}</td>
                            <td>
                                <button class="btn btn-text btn-sm" onclick="window.editStaffMember('${s.id}')" title="编辑" style="padding:4px 6px;"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-text btn-sm" onclick="window.deleteStaffMember('${s.id}')" title="删除" style="padding:4px 6px;"><i class="fas fa-trash" style="color:#cf1322;"></i></button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>
    `;
};

// ========== Tab 3: 伦理递交 ==========

window.renderCenterTabEthics = function(el, ethicsList, centerId) {
    const typeColor = t => {
        const m = {'初始伦理':'#d46b08','修正案':'#722ed1','方案偏离':'#cf1322','备案类文件':'#1890ff','SAE报告':'#d46b08','年度报告':'#389e0d','结题报告':'#1d39c4'};
        return m[t] || '#5a6a7a';
    };
    const docTypeBadge = t => t ? `<span style="background:${typeColor(t)}22;color:${typeColor(t)};padding:2px 8px;border-radius:4px;font-size:0.82em;font-weight:600;">${window.escHtml(t)}</span>` : '-';
    const approvalBadge = d => d
        ? `<span class="cd-badge cd-badge-approved"><i class="fas fa-check"></i> ${d}</span>`
        : `<span class="cd-badge cd-badge-pending"><i class="fas fa-clock"></i> 待批</span>`;
    el.innerHTML = `
        <div class="cd-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div><span style="font-size:1em;font-weight:600;color:#2c3e50;"><i class="fas fa-file-alt" style="color:#3498db;margin-right:6px;"></i>伦理递交</span>
                    <span style="background:#e8f4fd;color:#2980b9;padding:2px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;">${ethicsList.length} 条</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.openNewEthicsForm('${centerId}')" style="border-radius:20px;padding:5px 14px;font-size:0.85em;"><i class="fas fa-plus"></i> 新增</button>
            </div>
            ${ethicsList.length === 0 ? `
                <div class="cd-empty">
                    <i class="fas fa-folder-open"></i>
                    暂无伦理递交记录<br><small style="font-size:0.85em;">点击右上角「新增」添加</small>
                </div>` :
            `<div style="overflow-x:auto;border-radius:10px;border:1px solid #e8ecf0;">
                <table class="cd-table">
                    <thead><tr>
                        <th>文件类型</th><th>文件名称</th><th>版本/日期</th><th>PI签收</th><th>递交/审查</th><th>批件</th><th></th>
                    </tr></thead>
                    <tbody>
                        ${ethicsList.map(e => `
                        <tr>
                            <td>${docTypeBadge(e.doc_type)}</td>
                            <td><div style="font-weight:500;color:#2c3e50;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${window.escHtml(e.doc_name||'')}">${window.escHtml(e.doc_name || '-')}</div></td>
                            <td>
                                <div style="font-size:0.88em;">${e.version || '<span style=color:#bcc4ce>—</span>'}</div>
                                ${e.version_date ? `<div style="font-size:0.78em;color:#8896a4;">${e.version_date}</div>` : ''}
                            </td>
                            <td>${e.pi_sign_date ? `<span style="font-size:0.85em;">${e.pi_sign_date}</span>` : '<span style="color:#bcc4ce;">—</span>'}</td>
                            <td>
                                <div style="font-size:0.85em;">${e.review_method || '<span style=color:#bcc4ce>—</span>'}</div>
                                ${e.submission_date ? `<div style="font-size:0.78em;color:#8896a4;">${e.submission_date}</div>` : ''}
                            </td>
                            <td>${approvalBadge(e.approval_date)}</td>
                            <td>
                                <button class="btn btn-text btn-sm" onclick="window.editEthicsSubmission('${e.id}')" title="编辑" style="padding:4px 6px;"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-text btn-sm" onclick="window.deleteEthicsSubmission('${e.id}')" title="删除" style="padding:4px 6px;"><i class="fas fa-trash" style="color:#cf1322;"></i></button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`}
        </div>
    `;
};

// ========== Tab 4: 方案偏离 ==========

window.renderCenterTabPDs = function(el, pdsList, centerId) {
    el.innerHTML = `
        <div class="cd-section">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div><span style="font-size:1em;font-weight:600;color:#2c3e50;"><i class="fas fa-exclamation-triangle" style="color:#f39c12;margin-right:6px;"></i>方案偏离</span>
                    <span style="background:#fff3e0;color:#d46b08;padding:2px 8px;border-radius:10px;font-size:0.8em;margin-left:6px;">${pdsList.length} 条</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.openNewPDForm('${centerId}')" style="border-radius:20px;padding:5px 14px;font-size:0.85em;"><i class="fas fa-plus"></i> 新增</button>
            </div>
            ${pdsList.length === 0 ? `
                <div class="cd-empty">
                    <i class="fas fa-shield-alt"></i>
                    无方案偏离记录<br><small style="font-size:0.85em;">良好依从性，继续保持 ✓</small>
                </div>` :
            pdsList.map(pd => `
                <div class="cd-pd-card">
                    <div class="cd-pd-header" style="background:${pd.severity==='Major'?'#fff7e6':'#f6ffed'};">
                        <span class="cd-badge ${pd.severity==='Major'?'cd-badge-major':'cd-badge-minor'}">${pd.severity}</span>
                        <strong style="font-size:0.95em;color:#2c3e50;">${window.escHtml(pd.pd_number)}</strong>
                        <span class="cd-badge ${pd.status==='Open'?'cd-badge-open':'cd-badge-closed'}" style="margin-left:auto;">${pd.status}</span>
                    </div>
                    <div class="cd-pd-body">
                        ${pd.description ? `<div class="cd-pd-desc"><i class="fas fa-quote-left" style="color:#bcc4ce;margin-right:4px;font-size:0.8em;"></i>${window.escHtml(pd.description)}</div>` : ''}
                        ${pd.violated_clause ? `<div style="font-size:0.82em;color:#8896a4;margin-bottom:10px;"><i class="fas fa-ban" style="color:#cf1322;margin-right:4px;"></i>违反方案：${window.escHtml(pd.violated_clause)}</div>` : ''}
                        <div class="cd-pd-meta">
                            ${pd.occurred_date ? `<div class="cd-pd-meta-item"><i class="fas fa-calendar-plus"></i>发生：${pd.occurred_date}</div>` : ''}
                            ${pd.discovered_date ? `<div class="cd-pd-meta-item"><i class="fas fa-search"></i>发现：${pd.discovered_date}</div>` : ''}
                            ${pd.reported_sponsor_date ? `<div class="cd-pd-meta-item"><i class="fas fa-building"></i>上报申办方：${pd.reported_sponsor_date}</div>` : ''}
                            ${pd.reported_ethics_date ? `<div class="cd-pd-meta-item"><i class="fas fa-balance-scale"></i>上报伦理：${pd.reported_ethics_date}</div>` : ''}
                        </div>
                        ${pd.subject_ids ? `<div style="margin-top:8px;font-size:0.82em;color:#5a6a7a;"><i class="fas fa-user-tag" style="color:#8896a4;margin-right:4px;"></i>涉及：${window.escHtml(pd.subject_ids)}</div>` : ''}
                        ${pd.corrective_action ? `<div class="cd-pd-action"><i class="fas fa-tools" style="color:#d46b08;margin-right:4px;"></i><strong>整改：</strong>${window.escHtml(pd.corrective_action)}</div>` : ''}
                    </div>
                    <div style="padding:8px 16px;border-top:1px solid #f2f4f7;display:flex;justify-content:flex-end;gap:6px;">
                        <button class="btn btn-text btn-sm" onclick="window.editProtocolDeviation('${pd.id}')" style="font-size:0.85em;"><i class="fas fa-edit"></i> 编辑</button>
                        <button class="btn btn-text btn-sm" onclick="window.deleteProtocolDeviation('${pd.id}')" style="font-size:0.85em;color:#cf1322;"><i class="fas fa-trash"></i> 删除</button>
                    </div>
                </div>`).join('')}
        </div>
    `;
};

// ========== Tab 5: 关联数据 ==========

window.renderCenterTabLinks = function(el, tasks, findings, centerId, today) {
    const sevColor = s => s==='Critical'?'#cf1322':s==='Major'?'#d46b08':'#389e0d';
    const prioColor = p => p==='high'?'#cf1322':p==='medium'?'#d46b08':'#389e0d';
    const openTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);
    el.innerHTML = `
        <div class="cd-section">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="cd-link-card">
                    <div class="cd-link-card-header" style="color:#2c3e50;">
                        <i class="fas fa-tasks" style="color:#3498db;"></i> 待办事项
                        <span style="margin-left:auto;font-size:0.8em;color:#8896a4;">${openTasks.length} 进行中</span>
                        <button class="btn btn-text btn-sm" onclick="window.navigateTo('tasks')" style="font-size:0.8em;padding:2px 8px;">全部 →</button>
                    </div>
                    ${tasks.length === 0 ? `
                        <div class="cd-empty" style="padding:20px 16px;"><i class="fas fa-check-circle" style="color:#389e0d;"></i>暂无待办</div>` :
                    tasks.slice(0, 8).map(t => `
                        <div class="cd-link-item">
                            <div class="cd-link-dot" style="background:${prioColor(t.priority)};"></div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.88em;${t.done?'text-decoration:line-through;color:#bcc4ce;':'color:#2c3e50;'}">${window.escHtml(t.title)}</div>
                                ${t.due_date ? `<div style="font-size:0.78em;color:#8896a4;margin-top:1px;">${t.due_date}</div>` : ''}
                            </div>
                            ${t.due_date && t.due_date < today && !t.done ? `<span class="cd-badge cd-badge-open" style="font-size:0.75em;padding:1px 5px;">逾期</span>` : ''}
                            ${t.done ? `<span class="cd-badge cd-badge-closed" style="font-size:0.75em;padding:1px 5px;"><i class="fas fa-check"></i></span>` : ''}
                        </div>`).join('')}
                </div>
                <div class="cd-link-card">
                    <div class="cd-link-card-header" style="color:#2c3e50;">
                        <i class="fas fa-search" style="color:#722ed1;"></i> 监查问题
                        <span style="margin-left:auto;font-size:0.8em;color:#8896a4;">${findings.filter(f=>f.status!=='Closed').length} Open</span>
                        <button class="btn btn-text btn-sm" onclick="window.navigateTo('findings')" style="font-size:0.8em;padding:2px 8px;">全部 →</button>
                    </div>
                    ${findings.length === 0 ? `
                        <div class="cd-empty" style="padding:20px 16px;"><i class="fas fa-shield-alt" style="color:#389e0d;"></i>暂无问题</div>` :
                    findings.slice(0, 8).map(f => `
                        <div class="cd-link-item">
                            <span class="cd-badge" style="background:${sevColor(f.severity)}22;color:${sevColor(f.severity)};font-size:0.75em;padding:2px 6px;flex-shrink:0;">${f.severity}</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.85em;color:#2c3e50;">${window.escHtml(f.finding_number)}</div>
                                <div style="font-size:0.78em;color:#8896a4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window.escHtml(f.description||'')}</div>
                            </div>
                            <span class="cd-badge ${f.status==='Closed'?'cd-badge-closed':'cd-badge-open'}" style="font-size:0.72em;flex-shrink:0;">${f.status}</span>
                        </div>`).join('')}
                </div>
            </div>
        </div>
    `;
};

// ========== 工具函数：toggleDate ==========

window.toggleDate = function(inputId, checked) {
    const input = document.getElementById(inputId);
    if (input) { input.disabled = !checked; if (!checked) input.value = ''; }
};

// ========== 中心详情弹窗 ==========

window.openCenterDetail = async function(centerId) {
    if (window.state) {
        window.state.currentCenterId = centerId;
        window.state.centerDetailTab = '概览';
    }
    if (window.loadPage) {
        await window.loadPage('center-detail');
    }
};

// ========== 表单函数 ==========

// ---- 人员表单 ----

window.openNewStaffForm = async function(centerId) {
    const roles = window.STAFF_ROLES.map(r => `<option value="${r}">${r}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-user-plus" style="color:#3498db;"></i> 新增研究人员</h3>
        <form id="staffForm" onsubmit="return window.submitStaffForm(event)" style="display:grid;gap:10px;max-width:600px;">
            <input type="hidden" id="s_center_id" value="${centerId}">
            <div class="form-row">
                <div class="form-group"><label>姓名 *</label><input type="text" id="s_name" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>缩写</label><input type="text" id="s_initials" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>角色 *</label>
                    <select id="s_role" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${roles}
                    </select>
                </div>
                <div class="form-group"><label>授权日期</label><input type="date" id="s_auth_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>电话</label><input type="text" id="s_phone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>邮箱</label><input type="email" id="s_email" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div style="font-weight:bold;margin-top:8px;">证书收集</div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_cv" onchange="window.toggleDate('s_cv_date', this.checked)"> 简历</label>
                <input type="date" id="s_cv_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;" disabled>
            </div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_gcp" onchange="window.toggleDate('s_gcp_date', this.checked)"> GCP证书</label>
                <input type="date" id="s_gcp_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;" disabled>
            </div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_license" onchange="window.toggleDate('s_license_date', this.checked)"> 执业资格证书</label>
                <input type="date" id="s_license_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;" disabled>
            </div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.submitStaffForm = async function(e, editId) {
    if (e) e.preventDefault();
    const payload = {
        center_id: document.getElementById('s_center_id').value,
        name: document.getElementById('s_name').value.trim(),
        initials: document.getElementById('s_initials').value.trim(),
        role: document.getElementById('s_role').value,
        phone: document.getElementById('s_phone').value.trim(),
        email: document.getElementById('s_email').value.trim(),
        auth_date: document.getElementById('s_auth_date').value,
        cv_collected: document.getElementById('s_cv').checked,
        cv_date: document.getElementById('s_cv_date').value,
        gcp_collected: document.getElementById('s_gcp').checked,
        gcp_date: document.getElementById('s_gcp_date').value,
        license_collected: document.getElementById('s_license').checked,
        license_date: document.getElementById('s_license_date').value,
    };
    const data = editId ? await api.updateStaff(editId, payload) : await api.createStaff(payload);
    if (data.success) { window.closeModal(); window.refreshCacheAndTab(['staff']); }
    else alert('保存失败');
};

window.editStaffMember = async function(staffId) {
    const data = await api.getStaffMember(staffId);
    if (!data.success) { alert('加载失败'); return; }
    const s = data.staff;
    const roles = window.STAFF_ROLES.map(r => `<option value="${r}" ${s.role === r ? 'selected' : ''}>${r}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-user-edit" style="color:#3498db;"></i> 编辑研究人员</h3>
        <form id="staffForm" onsubmit="return window.submitStaffForm(event, '${staffId}')" style="display:grid;gap:10px;max-width:600px;">
            <input type="hidden" id="s_center_id" value="${s.center_id}">
            <div class="form-row">
                <div class="form-group"><label>姓名 *</label><input type="text" id="s_name" required value="${window.escAttr(s.name || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>缩写</label><input type="text" id="s_initials" value="${window.escAttr(s.initials || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>角色 *</label>
                    <select id="s_role" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${roles}
                    </select>
                </div>
                <div class="form-group"><label>授权日期</label><input type="date" id="s_auth_date" value="${s.auth_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>电话</label><input type="text" id="s_phone" value="${window.escAttr(s.phone || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>邮箱</label><input type="email" id="s_email" value="${window.escAttr(s.email || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div style="font-weight:bold;margin-top:8px;">证书收集</div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_cv" ${s.cv_collected ? 'checked' : ''} onchange="window.toggleDate('s_cv_date', this.checked)"> 简历</label>
                <input type="date" id="s_cv_date" value="${s.cv_date || ''}" ${s.cv_collected ? '' : 'disabled'} style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_gcp" ${s.gcp_collected ? 'checked' : ''} onchange="window.toggleDate('s_gcp_date', this.checked)"> GCP证书</label>
                <input type="date" id="s_gcp_date" value="${s.gcp_date || ''}" ${s.gcp_collected ? '' : 'disabled'} style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div class="form-row">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="s_license" ${s.license_collected ? 'checked' : ''} onchange="window.toggleDate('s_license_date', this.checked)"> 执业资格证书</label>
                <input type="date" id="s_license_date" value="${s.license_date || ''}" ${s.license_collected ? '' : 'disabled'} style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
            </div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.deleteStaffMember = async function(staffId) {
    if (!confirm('确定删除该人员？')) return;
    await api.deleteStaff(staffId);
    window.refreshCacheAndTab(['staff']);
};

// ---- 伦理递交表单 ----

window.openNewEthicsForm = async function(centerId) {
    const types = window.ETHICS_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    const methods = window.REVIEW_METHODS.map(m => `<option value="${m}">${m}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-file-plus" style="color:#3498db;"></i> 新增伦理递交</h3>
        <form id="ethicsForm" onsubmit="return window.submitEthicsForm(event)" style="display:grid;gap:10px;max-width:700px;">
            <input type="hidden" id="e_center_id" value="${centerId}">
            <div class="form-row">
                <div class="form-group">
                    <label>文件类型 *</label>
                    <select id="e_doc_type" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${types}
                    </select>
                </div>
                <div class="form-group"><label>文件名称</label><input type="text" id="e_doc_name" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>版本号</label><input type="text" id="e_version" placeholder="如 V1.0" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>版本日期</label><input type="date" id="e_version_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>PI签收日期</label><input type="date" id="e_pi_sign_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>伦理递交日期</label><input type="date" id="e_submission_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>审查方式</label>
                    <select id="e_review_method" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${methods}
                    </select>
                </div>
                <div class="form-group"><label>审查日期</label><input type="date" id="e_review_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-group"><label>批件日期/备案日期</label><input type="date" id="e_approval_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.submitEthicsForm = async function(e, editId) {
    if (e) e.preventDefault();
    const payload = {
        center_id: document.getElementById('e_center_id').value,
        doc_type: document.getElementById('e_doc_type').value,
        doc_name: document.getElementById('e_doc_name').value.trim(),
        version: document.getElementById('e_version').value.trim(),
        version_date: document.getElementById('e_version_date').value,
        pi_sign_date: document.getElementById('e_pi_sign_date').value,
        submission_date: document.getElementById('e_submission_date').value,
        review_method: document.getElementById('e_review_method').value,
        review_date: document.getElementById('e_review_date').value,
        approval_date: document.getElementById('e_approval_date').value,
    };
    const data = editId ? await api.updateEthics(editId, payload) : await api.createEthics(payload);
    if (data.success) { window.closeModal(); window.refreshCacheAndTab(['ethics']); }
    else alert('保存失败');
};

window.editEthicsSubmission = async function(subId) {
    const data = await api.getEthicsSubmission(subId);
    if (!data.success) { alert('加载失败'); return; }
    const e = data.ethics;
    const types = window.ETHICS_TYPES.map(t => `<option value="${t}" ${e.doc_type === t ? 'selected' : ''}>${t}</option>`).join('');
    const methods = window.REVIEW_METHODS.map(m => `<option value="${m}" ${e.review_method === m ? 'selected' : ''}>${m}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-file-edit" style="color:#3498db;"></i> 编辑伦理递交</h3>
        <form id="ethicsForm" onsubmit="return window.submitEthicsForm(event, '${subId}')" style="display:grid;gap:10px;max-width:700px;">
            <input type="hidden" id="e_center_id" value="${e.center_id}">
            <div class="form-row">
                <div class="form-group">
                    <label>文件类型 *</label>
                    <select id="e_doc_type" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${types}
                    </select>
                </div>
                <div class="form-group"><label>文件名称</label><input type="text" id="e_doc_name" value="${window.escAttr(e.doc_name || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>版本号</label><input type="text" id="e_version" value="${window.escAttr(e.version || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>版本日期</label><input type="date" id="e_version_date" value="${e.version_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>PI签收日期</label><input type="date" id="e_pi_sign_date" value="${e.pi_sign_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>伦理递交日期</label><input type="date" id="e_submission_date" value="${e.submission_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>审查方式</label>
                    <select id="e_review_method" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${methods}
                    </select>
                </div>
                <div class="form-group"><label>审查日期</label><input type="date" id="e_review_date" value="${e.review_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-group"><label>批件日期/备案日期</label><input type="date" id="e_approval_date" value="${e.approval_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.deleteEthicsSubmission = async function(subId) {
    if (!confirm('确定删除该递交记录？')) return;
    await api.deleteEthics(subId);
    window.refreshCacheAndTab(['ethics']);
};

// ---- 方案偏离表单 ----

window.openNewPDForm = async function(centerId) {
    const severities = window.PD_SEVERITIES.map(s => `<option value="${s}">${s}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-exclamation-circle" style="color:#e74c3c;"></i> 新增方案偏离</h3>
        <form id="pdForm" onsubmit="return window.submitPDFormNew(event)" style="display:grid;gap:10px;max-width:700px;">
            <input type="hidden" id="pd_center_id" value="${centerId}">
            <div class="form-row">
                <div class="form-group">
                    <label>严重程度 *</label>
                    <select id="pd_severity" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${severities}
                    </select>
                </div>
            </div>
            <div class="form-group"><label>方案偏离描述 *</label><textarea id="pd_description" required rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;"></textarea></div>
            <div class="form-group"><label>违反方案哪条规定</label><textarea id="pd_violated_clause" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;"></textarea></div>
            <div class="form-row">
                <div class="form-group"><label>发生日期</label><input type="date" id="pd_occurred_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>发现日期</label><input type="date" id="pd_discovered_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>上报申办方日期</label><input type="date" id="pd_reported_sponsor_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>上报中心伦理日期</label><input type="date" id="pd_reported_ethics_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-group"><label>涉及人员/受试者编号</label><input type="text" id="pd_subject_ids" placeholder="如: PT-001, PT-003" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            <div class="form-group"><label>整改/预防措施</label><textarea id="pd_corrective_action" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;"></textarea></div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.submitPDFormNew = async function(e) {
    e.preventDefault();
    const payload = {
        center_id: document.getElementById('pd_center_id').value,
        severity: document.getElementById('pd_severity').value,
        description: document.getElementById('pd_description').value.trim(),
        violated_clause: document.getElementById('pd_violated_clause').value.trim(),
        occurred_date: document.getElementById('pd_occurred_date').value,
        discovered_date: document.getElementById('pd_discovered_date').value,
        reported_sponsor_date: document.getElementById('pd_reported_sponsor_date').value,
        reported_ethics_date: document.getElementById('pd_reported_ethics_date').value,
        subject_ids: document.getElementById('pd_subject_ids').value.trim(),
        corrective_action: document.getElementById('pd_corrective_action').value.trim(),
    };
    const data = await api.createPD(payload);
    if (data.success) { window.closeModal(); window.refreshCacheAndTab(['pds']); }
    else alert('保存失败');
};

window.editProtocolDeviation = async function(pdId) {
    const data = await api.getPD(pdId);
    if (!data.success) { alert('加载失败'); return; }
    const pd = data.pd;
    const severities = window.PD_SEVERITIES.map(s => `<option value="${s}" ${pd.severity === s ? 'selected' : ''}>${s}</option>`).join('');
    window.openModal(`
        <h3><i class="fas fa-exclamation-circle" style="color:#e74c3c;"></i> 编辑方案偏离 ${window.escHtml(pd.pd_number)}</h3>
        <form id="pdForm" onsubmit="return window.submitPDFormEdit(event, '${pdId}')" style="display:grid;gap:10px;max-width:700px;">
            <input type="hidden" id="pd_center_id" value="${pd.center_id}">
            <div class="form-row">
                <div class="form-group">
                    <label>严重程度 *</label>
                    <select id="pd_severity" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${severities}
                    </select>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <div style="padding:8px 0;">
                        ${window.PD_STATUSES.map(s => `<label style="margin-right:16px;cursor:pointer;"><input type="radio" name="pd_status" value="${s}" ${pd.status === s ? 'checked' : ''}> ${s}</label>`).join('')}
                    </div>
                </div>
            </div>
            <div class="form-group"><label>方案偏离描述 *</label><textarea id="pd_description" required rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${window.escAttr(pd.description || '')}</textarea></div>
            <div class="form-group"><label>违反方案哪条规定</label><textarea id="pd_violated_clause" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${window.escAttr(pd.violated_clause || '')}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>发生日期</label><input type="date" id="pd_occurred_date" value="${pd.occurred_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>发现日期</label><input type="date" id="pd_discovered_date" value="${pd.discovered_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>上报申办方日期</label><input type="date" id="pd_reported_sponsor_date" value="${pd.reported_sponsor_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>上报中心伦理日期</label><input type="date" id="pd_reported_ethics_date" value="${pd.reported_ethics_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-group"><label>涉及人员/受试者编号</label><input type="text" id="pd_subject_ids" value="${window.escAttr(pd.subject_ids || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            <div class="form-group"><label>整改/预防措施</label><textarea id="pd_corrective_action" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${window.escAttr(pd.corrective_action || '')}</textarea></div>
            <div style="text-align:right;margin-top:12px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
};

window.submitPDFormEdit = async function(e, pdId) {
    e.preventDefault();
    const statusRadio = document.querySelector('input[name="pd_status"]:checked');
    const payload = {
        center_id: document.getElementById('pd_center_id').value,
        severity: document.getElementById('pd_severity').value,
        description: document.getElementById('pd_description').value.trim(),
        violated_clause: document.getElementById('pd_violated_clause').value.trim(),
        occurred_date: document.getElementById('pd_occurred_date').value,
        discovered_date: document.getElementById('pd_discovered_date').value,
        reported_sponsor_date: document.getElementById('pd_reported_sponsor_date').value,
        reported_ethics_date: document.getElementById('pd_reported_ethics_date').value,
        subject_ids: document.getElementById('pd_subject_ids').value.trim(),
        corrective_action: document.getElementById('pd_corrective_action').value.trim(),
        status: statusRadio ? statusRadio.value : 'Open',
    };
    const data = await api.updatePD(pdId, payload);
    if (data.success) { window.closeModal(); window.refreshCacheAndTab(['pds']); }
    else alert('保存失败');
};

window.deleteProtocolDeviation = async function(pdId) {
    if (!confirm('确定删除该方案偏离记录？')) return;
    await api.deletePD(pdId);
    window.refreshCacheAndTab(['pds']);
};

// ========== 编辑中心信息 ==========

window.editCenterInfo = async function(centerId) {
    try {
        const data = await api.getCenter(centerId);
        if (!data.success) { alert('加载失败'); return; }
        const c = data.center;
        
        window.openModal(`
            <h3><i class="fas fa-edit" style="color:#3498db;"></i> 编辑中心信息</h3>
            <form id="centerInfoForm" onsubmit="return window.submitCenterInfo(event, '${centerId}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>PI姓名</label>
                        <input type="text" id="ci_pi_name" value="${window.escAttr(c.pi_name || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                    <div class="form-group">
                        <label>PI电话</label>
                        <input type="text" id="ci_pi_phone" value="${window.escAttr(c.pi_phone || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>PI邮箱</label>
                        <input type="text" id="ci_pi_email" value="${window.escAttr(c.pi_email || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                    <div class="form-group">
                        <label>科室</label>
                        <input type="text" id="ci_department" value="${window.escAttr(c.department || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>CRC姓名</label>
                        <input type="text" id="ci_crc" value="${window.escAttr(c.contact_crc || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                    <div class="form-group">
                        <label>CRC电话</label>
                        <input type="text" id="ci_crc_phone" value="${window.escAttr(c.contact_crc_phone || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    </div>
                </div>
                <div class="form-group">
                    <label>伦理联系方式</label>
                    <textarea id="ci_ethics" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${window.escAttr(c.contact_ethics || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>医院地址</label>
                    <textarea id="ci_address" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${window.escAttr(c.address || '')}</textarea>
                </div>
                <div style="text-align:right;margin-top:15px;">
                    <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        `);
    } catch (err) {
        alert('加载失败: ' + err.message);
    }
};

window.submitCenterInfo = async function(e, centerId) {
    e.preventDefault();
    const data = {
        pi_name: document.getElementById('ci_pi_name').value.trim(),
        pi_phone: document.getElementById('ci_pi_phone').value.trim(),
        pi_email: document.getElementById('ci_pi_email').value.trim(),
        department: document.getElementById('ci_department').value.trim(),
        contact_crc: document.getElementById('ci_crc').value.trim(),
        contact_crc_phone: document.getElementById('ci_crc_phone').value.trim(),
        contact_ethics: document.getElementById('ci_ethics').value.trim(),
        address: document.getElementById('ci_address').value.trim()
    };
    
    try {
        const result = await api.updateCenter(centerId, data);
        if (result.success) {
            window.closeModal();
            alert('✅ 保存成功');
        } else {
            alert('❌ 保存失败');
        }
    } catch (err) {
        alert('❌ 保存失败: ' + err.message);
    }
};
