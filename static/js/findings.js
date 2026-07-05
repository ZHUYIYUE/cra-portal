// ========== 监查问题页面 ==========

window.loadFindings = async function(content) {
    const [findingsData, projData, centersData, statsData] = await Promise.all([
        api.getFindings(), api.getProjects(), api.getCenters(), api.getFindingsStats()
    ]);
    const findings = findingsData.findings || [];
    const projects = projData.projects || [];
    const centers = centersData.centers || [];
    const stats = statsData.stats || {};

    const categories = ['必备文件', '试验流程', '中心流程', '知情同意', '随机化/盲法', '数据记录', '药物管理', '其他'];
    const severities = ['Minor', 'Major', 'Critical'];
    const statuses = ['Open', 'In Progress', 'Waiting CRC', 'Resolved', 'Closed'];
    const severityColors = { Minor: '#4CAF50', Major: '#FF9800', Critical: '#f44336' };

    content.innerHTML = `
        <div class="findings-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div class="findings-stats" style="display:flex;gap:16px;flex-wrap:wrap;">
                <span class="stat-badge" style="background:#f5f5f5;padding:6px 12px;border-radius:8px;font-size:13px;">
                    全部 <strong>${stats.total || 0}</strong>
                </span>
                <span class="stat-badge" style="background:#fff3e0;color:#e65100;padding:6px 12px;border-radius:8px;font-size:13px;">
                    Open <strong>${stats.by_status?.Open || 0}</strong>
                </span>
                <span class="stat-badge" style="background:#e3f2fd;color:#1565c0;padding:6px 12px;border-radius:8px;font-size:13px;">
                    进行中 <strong>${stats.by_status?.['In Progress'] || 0}</strong>
                </span>
                <span class="stat-badge" style="background:#ffe0b2;color:#bf360c;padding:6px 12px;border-radius:8px;font-size:13px;">
                    跟进CRC <strong>${stats.by_status?.['Waiting CRC'] || 0}</strong>
                </span>
                <span class="stat-badge" style="background:#e8f5e9;color:#2e7d32;padding:6px 12px;border-radius:8px;font-size:13px;">
                    已解决 <strong>${(stats.by_status?.Resolved || 0) + (stats.by_status?.Closed || 0)}</strong>
                </span>
                ${(stats.overdue || 0) > 0 ? `<span class="stat-badge" style="background:#ffebee;color:#c62828;padding:6px 12px;border-radius:8px;font-size:13px;">逾期 <strong>${stats.overdue}</strong></span>` : ''}
            </div>
            <button class="btn btn-primary" onclick="window.openNewFindingForm()">
                <i class="fas fa-plus"></i> 录入问题
            </button>
        </div>

        <div class="findings-filter" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <select id="filterProject" onchange="window.onFilterProjectChange();window.renderFindingsList()" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                <option value="">全部项目</option>
                ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <select id="filterCenter" onchange="window.renderFindingsList()" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                <option value="">全部中心</option>
                ${centers.map(c => `<option value="${c.id}" data-project="${c.project_id}">${c.code} ${c.name}</option>`).join('')}
            </select>
            <select id="filterStatus" onchange="window.renderFindingsList()" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                <option value="">全部状态</option>
                ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <select id="filterSeverity" onchange="window.renderFindingsList()" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                <option value="">全部级别</option>
                ${severities.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <select id="filterCategory" onchange="window.renderFindingsList()" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
                <option value="">全部分类</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>

        <div id="findingsList"></div>
    `;

    window._allFindings = findings;
    window._projects = projects;
    window._centers = centers;
    window.renderFindingsList();
};

window.onFilterProjectChange = function() {
    const projectId = document.getElementById('filterProject')?.value || '';
    const centerSelect = document.getElementById('filterCenter');
    if (!centerSelect) return;
    const options = centerSelect.querySelectorAll('option');
    options.forEach(opt => {
        if (opt.value === '') return;
        const pid = opt.getAttribute('data-project');
        opt.style.display = (!projectId || pid === projectId) ? '' : 'none';
    });
    if (centerSelect.value && centerSelect.querySelector(`option[value="${centerSelect.value}"]`).style.display === 'none') {
        centerSelect.value = '';
    }
};

window.renderFindingsList = function() {
    const container = document.getElementById('findingsList');
    if (!container || !window._allFindings) return;

    const projectId = document.getElementById('filterProject')?.value || '';
    const centerId = document.getElementById('filterCenter')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const severity = document.getElementById('filterSeverity')?.value || '';
    const category = document.getElementById('filterCategory')?.value || '';

    let filtered = window._allFindings.filter(f => {
        if (projectId && f.project_id !== projectId) return false;
        if (centerId && f.center_id !== centerId) return false;
        if (status && f.status !== status) return false;
        if (severity && f.severity !== severity) return false;
        if (category && f.category !== category) return false;
        return true;
    });

    if (!filtered.length) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">暂无监查问题</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const severityColors = { Minor: '#4CAF50', Major: '#FF9800', Critical: '#f44336' };
    const statusColors = { Open: '#e53935', 'In Progress': '#1976D2', 'Waiting CRC': '#e67e22', Resolved: '#388E3C', Closed: '#757575' };
    const statusLabels = { Open: 'Open', 'In Progress': '进行中', 'Waiting CRC': '跟进CRC', Resolved: '已解决', Closed: 'Closed' };

    container.innerHTML = filtered.map(f => {
        const isOverdue = f.due_date && f.due_date < today && !['Resolved', 'Closed'].includes(f.status);
        return `
        <div class="finding-card" data-finding-id="${f.id}" style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:14px 16px;margin-bottom:10px;${isOverdue ? 'border-left:4px solid #f44336;' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    <span style="font-weight:700;color:#333;font-size:14px;">${window.escHtml(f.finding_number || '')}</span>
                    <span style="background:${severityColors[f.severity] || '#999'};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${f.severity || 'Minor'}</span>
                    <span style="background:${statusColors[f.status] || '#999'};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${statusLabels[f.status] || f.status || 'Open'}</span>
                    <span style="background:#f5f5f5;color:#555;padding:2px 8px;border-radius:4px;font-size:11px;">${window.escHtml(f.category || '')}</span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button class="btn btn-text btn-sm" onclick="window.openEditFindingForm('${f.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-text btn-sm" onclick="window.deleteFinding('${f.id}')" title="删除" style="color:#e53935;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <p style="color:#333;font-size:14px;margin:0 0 8px;line-height:1.5;">${window.escHtml(f.description || '')}</p>
            ${f.corrective_action ? `<p style="color:#666;font-size:12px;margin:0 0 8px;padding-left:10px;border-left:2px solid #4CAF50;">整改：${window.escHtml(f.corrective_action)}</p>` : ''}
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#888;">
                <span>📁 ${window.escHtml(f.project_name || f.project_id || '—')}</span>
                <span>🏥 ${window.escHtml(f.center_name || '—')}</span>
                <span>📅 发现：${f.found_date || '—'}</span>
                ${f.due_date ? `<span style="${isOverdue ? 'color:#f44336;font-weight:600;' : ''}">⏰ 截止：${f.due_date}${isOverdue ? ' ⚠️逾期' : ''}</span>` : ''}
            </div>
        </div>`;
    }).join('');
};

window.openNewFindingForm = function(preset) {
    const projects = window._projects || [];
    const centers = window._centers || [];
    const categories = ['必备文件', '试验流程', '中心流程', '知情同意', '随机化/盲法', '数据记录', '药物管理', '其他'];
    const severities = ['Minor', 'Major', 'Critical'];
    const statuses = ['Open', 'In Progress', 'Waiting CRC', 'Resolved', 'Closed'];
    const today = new Date().toISOString().split('T')[0];
    preset = preset || {};

    window.openModal(`
        <h3><i class="fas fa-search" style="color:#1976D2;"></i> 录入监查问题</h3>
        <form id="findingForm" onsubmit="return window.submitFindingForm(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>问题编号（自动生成）</label>
                    <input type="text" id="f_number" placeholder="留空自动编号，如 F001" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
                <div class="form-group">
                    <label>所属项目 *</label>
                    <select id="f_project" required onchange="window.onFindingProjectChange()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        <option value="">请选择项目</option>
                        ${projects.map(p => `<option value="${p.id}" ${preset.project_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>所属中心</label>
                    <select id="f_center" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        <option value="">请选择中心（可选）</option>
                        ${centers.map(c => `<option value="${c.id}" data-project="${c.project_id}" ${preset.center_id === c.id ? 'selected' : ''}>${c.code} ${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>分类</label>
                    <select id="f_category" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>问题描述 *</label>
                <textarea id="f_description" required rows="3" placeholder="详细描述发现的问题..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>严重程度</label>
                    <select id="f_severity" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${severities.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="f_status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>发现日期</label>
                    <input type="date" id="f_found_date" value="${today}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
                <div class="form-group">
                    <label>整改截止日期</label>
                    <input type="date" id="f_due_date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
            </div>
            <div class="form-group">
                <label>整改措施</label>
                <textarea id="f_corrective_action" rows="2" placeholder="计划采取的整改措施..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;"></textarea>
            </div>
            <div style="text-align:right;margin-top:16px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()" style="margin-right:8px;">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
    if (preset.project_id) setTimeout(window.onFindingProjectChange, 0);
};

window.openEditFindingForm = function(id) {
    const f = (window._allFindings || []).find(x => x.id === id);
    if (!f) return;
    const projects = window._projects || [];
    const centers = window._centers || [];
    const categories = ['必备文件', '试验流程', '中心流程', '知情同意', '随机化/盲法', '数据记录', '药物管理', '其他'];
    const severities = ['Minor', 'Major', 'Critical'];
    const statuses = ['Open', 'In Progress', 'Waiting CRC', 'Resolved', 'Closed'];

    window.openModal(`
        <h3><i class="fas fa-edit" style="color:#1976D2;"></i> 编辑监查问题</h3>
        <form id="findingForm" onsubmit="return window.submitFindingForm(event, '${id}')">
            <div class="form-row">
                <div class="form-group">
                    <label>问题编号</label>
                    <input type="text" id="f_number" value="${window.escAttr(f.finding_number || '')}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
                <div class="form-group">
                    <label>所属项目 *</label>
                    <select id="f_project" required onchange="window.onFindingProjectChange()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        <option value="">请选择项目</option>
                        ${projects.map(p => `<option value="${p.id}" ${p.id === f.project_id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>所属中心</label>
                    <select id="f_center" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        <option value="">请选择中心</option>
                        ${centers.map(c => `<option value="${c.id}" data-project="${c.project_id}" ${c.id === f.center_id ? 'selected' : ''}>${c.code} ${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>分类</label>
                    <select id="f_category" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${categories.map(c => `<option value="${c}" ${c === f.category ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>问题描述 *</label>
                <textarea id="f_description" required rows="3" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;">${window.escAttr(f.description || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>严重程度</label>
                    <select id="f_severity" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${severities.map(s => `<option value="${s}" ${s === f.severity ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="f_status" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                        ${statuses.map(s => `<option value="${s}" ${s === f.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>发现日期</label>
                    <input type="date" id="f_found_date" value="${f.found_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
                <div class="form-group">
                    <label>整改截止日期</label>
                    <input type="date" id="f_due_date" value="${f.due_date || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
                </div>
            </div>
            <div class="form-group">
                <label>整改措施</label>
                <textarea id="f_corrective_action" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:14px;resize:vertical;">${window.escAttr(f.corrective_action || '')}</textarea>
            </div>
            <div style="text-align:right;margin-top:16px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()" style="margin-right:8px;">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);
    // 编辑表单打开后触发一次联动，隐藏不相关的中心
    setTimeout(window.onFindingProjectChange, 0);
};

window.onFindingProjectChange = function() {
    const projectId = document.getElementById('f_project')?.value || '';
    const centerSelect = document.getElementById('f_center');
    if (!centerSelect) return;
    const options = centerSelect.querySelectorAll('option');
    let hasVisible = false;
    options.forEach(opt => {
        if (opt.value === '') {
            opt.textContent = projectId ? '请选择中心（可选）' : '请先选择项目';
            return;
        }
        const pid = opt.getAttribute('data-project');
        const visible = !projectId || pid === projectId;
        opt.style.display = visible ? '' : 'none';
        if (visible) hasVisible = true;
    });
    if (centerSelect.value && centerSelect.querySelector(`option[value="${centerSelect.value}"]`)?.style.display === 'none') {
        centerSelect.value = '';
    }
    if (!hasVisible && projectId) {
        const emptyOpt = centerSelect.querySelector('option[value=""]');
        if (emptyOpt) emptyOpt.textContent = '该项目暂无中心';
    }
};

window.submitFindingForm = async function(e, editId) {
    e.preventDefault();
    const payload = {
        finding_number: document.getElementById('f_number').value.trim(),
        project_id: document.getElementById('f_project').value,
        center_id: document.getElementById('f_center').value,
        description: document.getElementById('f_description').value.trim(),
        category: document.getElementById('f_category').value,
        severity: document.getElementById('f_severity').value,
        status: document.getElementById('f_status').value,
        found_date: document.getElementById('f_found_date').value,
        due_date: document.getElementById('f_due_date').value,
        corrective_action: document.getElementById('f_corrective_action').value.trim()
    };
    if (!payload.project_id || !payload.description) {
        alert('请填写必填项'); return;
    }
    try {
        let data;
        if (editId) {
            data = await api.updateFinding(editId, payload);
        } else {
            data = await api.createFinding(payload);
        }
        if (data.success) {
            window.closeModal();
            window.navigateTo('findings');
        } else {
            alert('保存失败: ' + (data.error || ''));
        }
    } catch (err) {
        alert('保存失败');
    }
};

window.deleteFinding = async function(id) {
    if (!confirm('确定删除这条问题记录？')) return;
    try {
        const data = await api.deleteFinding(id);
        if (data.success) window.navigateTo('findings');
    } catch (e) {
        alert('删除失败');
    }
};
