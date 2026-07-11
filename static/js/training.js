// ========== 培训管理 ==========

window.TRAINING_TYPES = ['方案培训', '知情培训', '药品手册培训', '实验室手册培训', '安全性培训', '其他'];
window.TRAINING_PLAN_STATUSES = ['草稿', '进行中', '已完成', '需跟进'];
window.TRAINING_RECORD_STATUSES = ['未开始', '已完成', '无需培训', '需跟进'];

window.loadTraining = async function(content) {
    var data = await api.getTrainingPlans();
    var plans = data.plans || [];
    content.innerHTML = `
        <div class="training-page-head">
            <div>
                <h2><i class="fas fa-graduation-cap"></i> 培训管理</h2>
                <p>从项目文件创建中心培训计划，并按授权研究人员追踪完成情况。</p>
            </div>
            <button class="btn btn-primary" onclick="window.openTrainingPlanForm()">
                <i class="fas fa-plus"></i> 新建培训计划
            </button>
        </div>
        ${data.missingTable ? window.renderTrainingMissingTableCard() : window.renderTrainingPlans(plans)}
    `;
};

window.renderTrainingMissingTableCard = function() {
    return `
        <div class="card">
            <div class="training-empty warning">
                <i class="fas fa-database"></i>
                <div>
                    <strong>培训管理表尚未启用</strong>
                    <span>请先在 Supabase SQL Editor 执行 <code>supabase/training_management.sql</code>，再创建培训计划。</span>
                </div>
            </div>
        </div>
    `;
};

window.getTrainingPlanTone = function(plan) {
    var today = new Date().toISOString().split('T')[0];
    if (plan.status === '已完成') return 'ok';
    if (plan.status === '需跟进') return 'danger';
    if (plan.due_date && plan.due_date < today) return 'danger';
    if (plan.due_date) {
        var days = Math.ceil((new Date(plan.due_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
        if (days <= 7) return 'warning';
    }
    return '';
};

window.renderTrainingPlans = function(plans) {
    var stats = plans.reduce(function(acc, plan) {
        if (plan.status === '已完成') acc.done++;
        else acc.open++;
        if (window.getTrainingPlanTone(plan) === 'danger') acc.risk++;
        acc.required += plan.required_count || 0;
        acc.completed += plan.completed_count || 0;
        return acc;
    }, { open: 0, done: 0, risk: 0, required: 0, completed: 0 });
    var completionRate = stats.required ? Math.round(stats.completed / stats.required * 100) : 0;
    var rows = plans.length ? plans.map(function(plan) {
        var tone = window.getTrainingPlanTone(plan);
        var docText = [plan.doc_name_snapshot, plan.version_snapshot].filter(Boolean).join(' ');
        return `
            <tr>
                <td>
                    <div class="training-plan-title">${window.escHtml(plan.title || '未命名培训计划')}</div>
                    <small>${window.escHtml(plan.training_type || '-')} · ${window.escHtml(plan.scope || '-')}</small>
                </td>
                <td>
                    <div>${window.escHtml(plan.project_name || '-')}</div>
                    <small>${window.escHtml(plan.center_name || '-')}</small>
                </td>
                <td>
                    <div>${window.escHtml(docText || '-')}</div>
                    <small>${plan.version_date_snapshot || ''}</small>
                </td>
                <td><span class="training-status ${tone}">${window.escHtml(plan.status || '进行中')}</span></td>
                <td>${plan.due_date || '-'}</td>
                <td>
                    <div class="training-progress">
                        <span>${plan.completed_count || 0}/${plan.required_count || 0}</span>
                        <div><i style="width:${plan.completion_rate || 0}%"></i></div>
                    </div>
                </td>
                <td class="training-actions">
                    <button class="btn btn-text btn-sm" onclick="window.viewTrainingPlan('${plan.id}')" title="查看/更新"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-text btn-sm" onclick="window.deleteTrainingPlan('${plan.id}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                </td>
            </tr>
        `;
    }).join('') : `
        <tr>
            <td colspan="7" class="training-empty-cell">暂无培训计划。项目文件标记“需培训”后，可在这里按中心生成培训计划。</td>
        </tr>
    `;
    return `
        <div class="training-summary">
            <div><strong>${stats.open}</strong><span>进行中</span></div>
            <div class="${stats.risk ? 'danger' : ''}"><strong>${stats.risk}</strong><span>逾期/需跟进</span></div>
            <div><strong>${stats.done}</strong><span>已完成计划</span></div>
            <div><strong>${completionRate}%</strong><span>人员完成率</span></div>
        </div>
        <div class="card training-card">
            <div class="card-header">
                <i class="fas fa-list-check"></i> 培训计划
                <button class="btn btn-primary btn-sm" onclick="window.openTrainingPlanForm()" style="margin-left:auto;">
                    <i class="fas fa-plus"></i> 新建
                </button>
            </div>
            <div class="training-table-wrap">
                <table class="training-table">
                    <thead>
                        <tr>
                            <th>培训计划</th>
                            <th>项目/中心</th>
                            <th>关联文件</th>
                            <th>状态</th>
                            <th>截止</th>
                            <th>完成</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
};

window.openTrainingPlanForm = async function() {
    var projData = await api.getProjects();
    var projects = projData.projects || [];
    window._trainingDocuments = [];
    window._trainingCenters = [];
    window._trainingStaff = [];
    var projectOptions = projects.map(function(p) {
        return '<option value="' + p.id + '">' + window.escHtml(p.name || p.code || '未命名项目') + '</option>';
    }).join('');
    var today = new Date().toISOString().split('T')[0];
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-graduation-cap"></i> 新建培训计划</h3></div>
        <form id="trainingPlanForm" class="training-form" onsubmit="return window.submitTrainingPlan(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>项目 *</label>
                    <select id="tp_project" required onchange="window.onTrainingProjectChange()">
                        <option value="">请选择</option>${projectOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>中心 *</label>
                    <select id="tp_center" required onchange="window.onTrainingCenterChange()">
                        <option value="">请选择</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>关联项目文件 *</label>
                    <select id="tp_document" required onchange="window.onTrainingDocumentChange()">
                        <option value="">请先选择项目</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>培训类型</label>
                    <select id="tp_training_type">
                        ${window.TRAINING_TYPES.map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>培训标题 *</label>
                <input type="text" id="tp_title" required placeholder="例：方案 V3.0 授权研究人员培训">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>培训范围</label>
                    <input type="text" id="tp_scope" placeholder="例：全体授权人员">
                </div>
                <div class="form-group">
                    <label>完成截止日期</label>
                    <input type="date" id="tp_due_date" value="${today}">
                </div>
                <div class="form-group">
                    <label>计划状态</label>
                    <select id="tp_status">
                        ${window.TRAINING_PLAN_STATUSES.map(function(s) { return '<option value="' + s + '"' + (s === '进行中' ? ' selected' : '') + '>' + s + '</option>'; }).join('')}
                    </select>
                </div>
            </div>
            <div class="training-staff-picker">
                <div class="training-section-title">
                    <strong>培训对象</strong>
                    <span>选择中心后加载授权研究人员</span>
                </div>
                <div id="trainingStaffList" class="training-staff-list">请先选择中心</div>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea id="tp_notes" rows="3" placeholder="培训要求、资料位置、特殊说明等"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> 保存培训计划</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
    var modal = document.getElementById('modalContent');
    if (modal) modal.classList.add('training-modal');
};

window.onTrainingProjectChange = async function() {
    var projectId = document.getElementById('tp_project').value;
    var centerSel = document.getElementById('tp_center');
    var docSel = document.getElementById('tp_document');
    document.getElementById('trainingStaffList').innerHTML = '请先选择中心';
    if (!projectId) {
        centerSel.innerHTML = '<option value="">请选择</option>';
        docSel.innerHTML = '<option value="">请先选择项目</option>';
        return;
    }
    var [centerData, docData] = await Promise.all([
        api.getCenters(projectId),
        api.getProjectDocuments(projectId)
    ]);
    window._trainingCenters = centerData.centers || [];
    window._trainingDocuments = docData.documents || [];
    centerSel.innerHTML = '<option value="">请选择</option>' + window._trainingCenters.map(function(c) {
        var label = ((c.code || '') + ' ' + (c.name || '')).trim();
        return '<option value="' + c.id + '">' + window.escHtml(label) + '</option>';
    }).join('');
    var docs = window._trainingDocuments.slice().sort(function(a, b) {
        if (!!b.requires_training !== !!a.requires_training) return b.requires_training ? 1 : -1;
        return (b.received_date || b.version_date || '') > (a.received_date || a.version_date || '') ? 1 : -1;
    });
    docSel.innerHTML = '<option value="">请选择</option>' + docs.map(function(doc) {
        var label = [doc.doc_name || '未命名文件', doc.version || '', doc.requires_training ? '需培训' : '未标记培训'].filter(Boolean).join(' · ');
        return '<option value="' + doc.id + '">' + window.escHtml(label) + '</option>';
    }).join('');
};

window.inferTrainingType = function(doc) {
    var text = ((doc.doc_category || '') + ' ' + (doc.doc_name || '')).toLowerCase();
    if (text.indexOf('方案') >= 0 || text.indexOf('protocol') >= 0) return '方案培训';
    if (text.indexOf('知情') >= 0 || text.indexOf('icf') >= 0) return '知情培训';
    if (text.indexOf('药') >= 0 || text.indexOf('ip') >= 0) return '药品手册培训';
    if (text.indexOf('实验室') >= 0 || text.indexOf('lab') >= 0) return '实验室手册培训';
    if (text.indexOf('安全') >= 0 || text.indexOf('safety') >= 0) return '安全性培训';
    return '其他';
};

window.onTrainingDocumentChange = function() {
    var docId = document.getElementById('tp_document').value;
    var doc = (window._trainingDocuments || []).find(function(x) { return x.id === docId; });
    if (!doc) return;
    var type = window.inferTrainingType(doc);
    var title = [doc.doc_name || '项目文件', doc.version || '', '培训'].filter(Boolean).join(' ');
    document.getElementById('tp_title').value = title;
    document.getElementById('tp_training_type').value = type;
    document.getElementById('tp_scope').value = doc.training_scope || '全体授权人员';
    if (doc.training_due_days) {
        var base = doc.received_date || new Date().toISOString().split('T')[0];
        var due = new Date(base + 'T00:00:00');
        due.setDate(due.getDate() + parseInt(doc.training_due_days, 10));
        document.getElementById('tp_due_date').value = due.toISOString().split('T')[0];
    }
};

window.onTrainingCenterChange = async function() {
    var centerId = document.getElementById('tp_center').value;
    var box = document.getElementById('trainingStaffList');
    if (!centerId) {
        box.innerHTML = '请先选择中心';
        return;
    }
    var staffData = await api.getStaff(centerId);
    window._trainingStaff = staffData.staff || [];
    window.renderTrainingStaffPicker(window._trainingStaff);
};

window.renderTrainingStaffPicker = function(staff) {
    var box = document.getElementById('trainingStaffList');
    if (!box) return;
    if (!staff.length) {
        box.innerHTML = '<div class="training-empty">该中心暂无研究人员。请先到中心详情的“研究人员”页维护授权人员。</div>';
        return;
    }
    box.innerHTML = staff.map(function(s) {
        return `
            <label class="training-staff-option">
                <input type="checkbox" class="training-staff-check" data-staff-id="${s.id}" checked>
                <span>
                    <strong>${window.escHtml(s.name || '未命名')}</strong>
                    <small>${window.escHtml(s.role || '未填写角色')} ${s.auth_date ? ' · 授权 ' + s.auth_date : ''}</small>
                </span>
            </label>
        `;
    }).join('');
};

window.collectTrainingPlanData = function() {
    var docId = document.getElementById('tp_document').value;
    var doc = (window._trainingDocuments || []).find(function(x) { return x.id === docId; }) || {};
    var selectedStaff = Array.from(document.querySelectorAll('.training-staff-check:checked')).map(function(chk) {
        var staff = (window._trainingStaff || []).find(function(s) { return s.id === chk.dataset.staffId; }) || {};
        return {
            id: staff.id || '',
            name: staff.name || '',
            role: staff.role || '',
            required: true,
            status: '未开始'
        };
    });
    return {
        project_id: document.getElementById('tp_project').value,
        center_id: document.getElementById('tp_center').value,
        project_document_id: docId,
        title: document.getElementById('tp_title').value.trim(),
        training_type: document.getElementById('tp_training_type').value,
        scope: document.getElementById('tp_scope').value.trim(),
        due_date: document.getElementById('tp_due_date').value,
        status: document.getElementById('tp_status').value,
        doc_category_snapshot: doc.doc_category || '',
        doc_name_snapshot: doc.doc_name || '',
        version_snapshot: doc.version || '',
        version_date_snapshot: doc.version_date || '',
        notes: document.getElementById('tp_notes').value,
        staff: selectedStaff
    };
};

window.submitTrainingPlan = async function(e) {
    e.preventDefault();
    var data = window.collectTrainingPlanData();
    if (!data.project_id || !data.center_id || !data.project_document_id || !data.title) {
        alert('请至少选择项目、中心、关联项目文件，并填写培训标题。');
        return false;
    }
    if (!data.staff.length) {
        alert('请至少选择一名培训对象。');
        return false;
    }
    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; }
    var res = await api.createTrainingPlan(data);
    if (!res.success) {
        alert('保存失败：' + (res.error || '未知错误'));
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> 保存培训计划'; }
        return false;
    }
    window.closeModal();
    await window.loadTraining(document.getElementById('pageContent'));
    window.showToast('培训计划已创建');
    return false;
};

window.viewTrainingPlan = async function(id) {
    var res = await api.getTrainingPlan(id);
    if (!res.success) { alert(res.error || '培训计划加载失败'); return; }
    var plan = res.plan;
    var rows = (plan.records || []).map(function(r, idx) {
        return `
            <tr id="trainingRecord_${r.id}">
                <td>${idx + 1}</td>
                <td>
                    <strong>${window.escHtml(r.staff_name_snapshot || '-')}</strong>
                    <small>${window.escHtml(r.staff_role_snapshot || '')}</small>
                </td>
                <td>
                    <select class="tr-status">
                        ${window.TRAINING_RECORD_STATUSES.map(function(s) {
                            return '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + s + '</option>';
                        }).join('')}
                    </select>
                </td>
                <td><input type="date" class="tr-date" value="${r.training_date || ''}"></td>
                <td><label class="training-evidence-check"><input type="checkbox" class="tr-evidence" ${r.evidence_collected ? 'checked' : ''}> 已收集</label></td>
                <td><input type="text" class="tr-notes" value="${window.escAttr(r.notes || '')}" placeholder="备注"></td>
                <td><button class="btn btn-sm btn-primary" onclick="window.saveTrainingRecord('${r.id}')"><i class="fas fa-save"></i></button></td>
            </tr>
        `;
    }).join('');
    var docText = [plan.doc_name_snapshot, plan.version_snapshot, plan.version_date_snapshot].filter(Boolean).join(' · ');
    window.openModal(`
        <h3><i class="fas fa-graduation-cap"></i> 培训计划详情</h3>
        <div class="training-plan-detail">
            <div class="el-preview-grid">
                <div><span>培训计划</span><strong>${window.escHtml(plan.title || '-')}</strong></div>
                <div><span>状态</span><strong>${window.escHtml(plan.status || '-')}</strong></div>
                <div><span>项目</span><strong>${window.escHtml(plan.project_name || '-')}</strong></div>
                <div><span>中心</span><strong>${window.escHtml(plan.center_name || '-')}</strong></div>
                <div><span>关联文件</span><strong>${window.escHtml(docText || '-')}</strong></div>
                <div><span>截止日期</span><strong>${plan.due_date || '-'}</strong></div>
                <div><span>培训类型</span><strong>${window.escHtml(plan.training_type || '-')}</strong></div>
                <div><span>培训范围</span><strong>${window.escHtml(plan.scope || '-')}</strong></div>
            </div>
            ${plan.notes ? '<div class="training-notes"><strong>备注：</strong>' + window.escHtml(plan.notes) + '</div>' : ''}
            <div class="training-table-wrap">
                <table class="training-table training-record-table">
                    <thead><tr><th>#</th><th>人员</th><th>状态</th><th>培训日期</th><th>证据</th><th>备注</th><th></th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="7">暂无培训对象</td></tr>'}</tbody>
                </table>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="window.generateTrainingRecordWord('${plan.id}')"><i class="fas fa-file-word"></i> 生成培训记录</button>
                <button class="btn" onclick="window.closeModal()">关闭</button>
            </div>
        </div>
    `);
};

window.saveTrainingRecord = async function(recordId) {
    var row = document.getElementById('trainingRecord_' + recordId);
    if (!row) return;
    var data = {
        status: row.querySelector('.tr-status').value,
        training_date: row.querySelector('.tr-date').value,
        evidence_collected: row.querySelector('.tr-evidence').checked,
        notes: row.querySelector('.tr-notes').value
    };
    var res = await api.updateTrainingRecord(recordId, data);
    if (!res.success) {
        alert('保存失败：' + (res.error || '未知错误'));
        return;
    }
    window.showToast('培训记录已更新');
    await window.loadTraining(document.getElementById('pageContent'));
};

window.formatTrainingDateCN = function(dateStr) {
    if (!dateStr) return '';
    var parts = String(dateStr).split('-');
    if (parts.length !== 3) return dateStr;
    return parseInt(parts[0], 10) + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
};

window.safeTrainingFileName = function(name) {
    return (name || '培训记录').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
};

window.downloadTrainingWordHtml = function(html, fileName) {
    var blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    if (typeof saveAs === 'function') {
        saveAs(blob, fileName);
        return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

window.generateTrainingRecordWord = async function(planId) {
    window.showLoading();
    try {
        var res = await api.getTrainingPlan(planId);
        if (!res.success) {
            alert(res.error || '培训计划加载失败');
            return;
        }
        var plan = res.plan;
        var records = plan.records || [];
        if (!records.length) {
            alert('该培训计划暂无培训对象，无法生成培训记录。');
            return;
        }
        var required = records.filter(function(r) { return r.required !== false; });
        var completed = required.filter(function(r) { return r.status === '已完成' || r.status === '无需培训'; });
        var today = new Date();
        var todayStr = today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日';
        var docText = [plan.doc_name_snapshot, plan.version_snapshot, plan.version_date_snapshot].filter(Boolean).join(' / ');
        var rowHtml = records.map(function(r, idx) {
            var trainingDate = window.formatTrainingDateCN(r.training_date || '');
            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${window.escHtml(r.staff_name_snapshot || '')}</td>
                    <td>${window.escHtml(r.staff_role_snapshot || '')}</td>
                    <td>${window.escHtml(r.status || '未开始')}</td>
                    <td>${window.escHtml(trainingDate)}</td>
                    <td>${r.evidence_collected ? '是' : '否'}</td>
                    <td>${window.escHtml(r.notes || '')}</td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }).join('');
        var html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${window.escHtml(plan.title || '培训记录')}</title>
<style>
    @page { margin: 1.8cm; }
    body { font-family: "SimSun", "Microsoft YaHei", Arial, sans-serif; color: #111; font-size: 11pt; }
    h1 { text-align: center; font-size: 18pt; margin: 0 0 18px; }
    h2 { font-size: 13pt; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 6px 7px; vertical-align: middle; word-break: break-word; }
    th { background: #f2f2f2; font-weight: bold; text-align: center; }
    .meta td:first-child { width: 18%; background: #f7f7f7; font-weight: bold; text-align: center; }
    .meta td:nth-child(2) { width: 32%; }
    .meta td:nth-child(3) { width: 18%; background: #f7f7f7; font-weight: bold; text-align: center; }
    .meta td:nth-child(4) { width: 32%; }
    .trainees th:nth-child(1), .trainees td:nth-child(1) { width: 5%; text-align: center; }
    .trainees th:nth-child(2), .trainees td:nth-child(2) { width: 12%; }
    .trainees th:nth-child(3), .trainees td:nth-child(3) { width: 13%; }
    .trainees th:nth-child(4), .trainees td:nth-child(4) { width: 10%; text-align: center; }
    .trainees th:nth-child(5), .trainees td:nth-child(5) { width: 12%; text-align: center; }
    .trainees th:nth-child(6), .trainees td:nth-child(6) { width: 9%; text-align: center; }
    .trainees th:nth-child(8), .trainees td:nth-child(8) { width: 12%; height: 30px; }
    .trainees th:nth-child(9), .trainees td:nth-child(9) { width: 12%; }
    .sign { margin-top: 28px; display: table; width: 100%; }
    .sign div { display: table-cell; width: 50%; padding-top: 12px; }
    .muted { color: #555; line-height: 1.6; }
</style>
</head>
<body>
    <h1>培训记录/签到表</h1>
    <table class="meta">
        <tr>
            <td>培训标题</td>
            <td colspan="3">${window.escHtml(plan.title || '')}</td>
        </tr>
        <tr>
            <td>项目名称</td>
            <td>${window.escHtml(plan.project_full_name || plan.project_name || '')}</td>
            <td>项目编号</td>
            <td>${window.escHtml(plan.project_code || '')}</td>
        </tr>
        <tr>
            <td>中心</td>
            <td>${window.escHtml(plan.center_name || '')}</td>
            <td>培训类型</td>
            <td>${window.escHtml(plan.training_type || '')}</td>
        </tr>
        <tr>
            <td>关联文件</td>
            <td colspan="3">${window.escHtml(docText || '')}</td>
        </tr>
        <tr>
            <td>培训范围</td>
            <td>${window.escHtml(plan.scope || '')}</td>
            <td>完成截止日期</td>
            <td>${window.escHtml(window.formatTrainingDateCN(plan.due_date || ''))}</td>
        </tr>
        <tr>
            <td>计划状态</td>
            <td>${window.escHtml(plan.status || '')}</td>
            <td>完成人数</td>
            <td>${completed.length} / ${required.length}</td>
        </tr>
    </table>

    <h2>培训内容</h2>
    <p class="muted">本次培训围绕上述项目文件及相关执行要求开展。培训对象应理解文件版本、适用范围、关键变更及其在本中心执行中的要求。</p>

    <h2>培训对象及完成情况</h2>
    <table class="trainees">
        <thead>
            <tr>
                <th>#</th>
                <th>姓名</th>
                <th>角色/职责</th>
                <th>状态</th>
                <th>培训日期</th>
                <th>证据收集</th>
                <th>备注</th>
                <th>签名</th>
                <th>签署日期</th>
            </tr>
        </thead>
        <tbody>${rowHtml}</tbody>
    </table>

    <div class="sign">
        <div>培训人/CRA签名：____________________</div>
        <div>日期：____________________</div>
    </div>
    <div class="sign">
        <div>PI确认：____________________</div>
        <div>日期：____________________</div>
    </div>
    <p class="muted">生成日期：${todayStr}</p>
</body>
</html>`;
        var fileName = window.safeTrainingFileName('培训记录_' + (plan.project_name || '') + '_' + (plan.center_name || '') + '_' + (plan.title || '') + '.doc');
        window.downloadTrainingWordHtml(html, fileName);
        window.showToast('培训记录 Word 已生成');
    } catch (err) {
        alert('生成培训记录失败：' + err.message);
    } finally {
        window.hideLoading();
    }
};

window.deleteTrainingPlan = async function(id) {
    if (!confirm('确定删除该培训计划？对应人员培训记录也会删除。')) return;
    var res = await api.deleteTrainingPlan(id);
    if (!res.success) {
        alert('删除失败：' + (res.error || '未知错误'));
        return;
    }
    await window.loadTraining(document.getElementById('pageContent'));
    window.showToast('培训计划已删除');
};
