// ========== 伦理递交管理（双模板：CRA致PI / PI致伦理） ==========

window.ETHICS_DOC_TYPES = ['初始伦理', '修正案', '方案偏离报告', 'SAE报告', '年度报告', '结题报告', '备案类文件', '其他'];
window.ETHICS_SUBMIT_METHODS = ['快递', '专人递交', '电子邮件', '在线系统'];
window.ETHICS_LETTER_TYPES = {
    'CRA_to_PI': 'CRA致PI递交信',
    'PI_to_Ethics': 'PI致伦理递交信'
};

// 可用占位符列表
window.ETHICS_PLACEHOLDERS = [
    { tag: '{project_full_name}', desc: '项目全称（如：一项评价...的临床试验）' },
    { tag: '{project_name}', desc: '项目简称' },
    { tag: '{project_code}', desc: '方案编号' },
    { tag: '{approval_number}', desc: '临床试验通知书编号/批件编号' },
    { tag: '{sponsor}', desc: '申办方' },
    { tag: '{cro_name}', desc: 'CRO名称' },
    { tag: '{center_name}', desc: '中心名称（医院名称）' },
    { tag: '{center_code}', desc: '中心编号' },
    { tag: '{pi_name}', desc: 'PI姓名' },
    { tag: '{pi_phone}', desc: 'PI电话' },
    { tag: '{ethics_committee}', desc: '伦理委员会名称' },
    { tag: '{submission_date}', desc: '递交日期' },
    { tag: '{submitter_name}', desc: '递交人姓名' },
    { tag: '{submitter_phone}', desc: '递交人电话' },
    { tag: '{submit_method}', desc: '递交方式' },
    { tag: '{tracking_number}', desc: '快递单号' },
    { tag: '{today_date}', desc: '今天日期' },
    { tag: '{notes}', desc: '备注' },
    { tag: '{#docs}{index}{/docs}', desc: '文件序号（循环，仅CRA致PI）' },
    { tag: '{#docs}{doc_name}{/docs}', desc: '文件名称（循环）' },
    { tag: '{#docs}{version}{/docs}', desc: '版本号（循环，有则显示）' },
    { tag: '{#docs}{version_date}{/docs}', desc: '版本日期（循环，有则显示）' },
    { tag: '{#docs}{copies}{/docs}', desc: '份数（循环）' }
];

// ========== 生成体验辅助函数 ==========

window.getEthicsTemplateStatusHtml = function(templates) {
    var requiredTypes = ['CRA_to_PI', 'PI_to_Ethics'];
    var cards = requiredTypes.map(function(type) {
        var list = (templates || []).filter(function(t) { return (t.letter_type || 'CRA_to_PI') === type; });
        var ok = list.length > 0;
        var defaultTmpl = list.find(function(t) { return t.is_default; }) || list[0];
        var color = ok ? '#27ae60' : '#e67e22';
        var bg = ok ? '#eefaf2' : '#fff7e8';
        var icon = ok ? 'fa-check-circle' : 'fa-exclamation-circle';
        var title = window.ETHICS_LETTER_TYPES[type] || type;
        return '<div style="flex:1;min-width:220px;background:' + bg + ';border:1px solid ' + color + '33;border-left:4px solid ' + color + ';border-radius:8px;padding:10px 12px;">' +
            '<div style="font-weight:600;color:#2c3e50;"><i class="fas ' + icon + '" style="color:' + color + ';"></i> ' + title + '</div>' +
            '<div style="font-size:12px;color:#666;margin-top:4px;">' +
            (ok ? ('模板：' + window.escHtml(defaultTmpl.name || '未命名模板') + (defaultTmpl.is_default ? '（默认）' : '')) : '还没有可用模板，生成前需要先上传') +
            '</div></div>';
    }).join('');
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">' + cards + '</div>';
};

window.getEthicsGenerationWarnings = function(letter) {
    var warnings = [];
    var type = letter.letter_type || 'CRA_to_PI';
    if (!letter.project_full_name) warnings.push('项目全称为空，Word 中 {project_full_name} 会留空');
    if (!letter.project_code) warnings.push('方案编号为空，Word 中 {project_code} 会留空');
    if (!letter.approval_number) warnings.push('通知书/批件编号为空，Word 中 {approval_number} 会留空');
    if (!letter.sponsor) warnings.push('申办方为空，Word 中 {sponsor} 会留空');
    if (!letter.center_name) warnings.push('中心名称为空，Word 中 {center_name} 会留空');
    if (type === 'CRA_to_PI' && !letter.pi_name) warnings.push('PI 姓名为空，CRA 致 PI 递交信可能不完整');
    if (type === 'PI_to_Ethics' && !letter.ethics_committee) warnings.push('伦理委员会名称为空，PI 致伦理递交信可能不完整');
    if (!letter.items || letter.items.length === 0) warnings.push('递交文件清单为空');
    (letter.items || []).forEach(function(item, idx) {
        if (!item.doc_name) warnings.push('第 ' + (idx + 1) + ' 个文件缺少文件名称');
    });
    return warnings;
};

window.safeEthicsFileName = function(name) {
    return (name || '递交信').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
};

window.getEthicsLetterDraft = function() {
    var getVal = function(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };
    var hasValue = function(value) {
        return value !== undefined && value !== null && String(value).trim() !== '';
    };
    var projectId = getVal('el_project');
    var centerId = getVal('el_center');
    var project = window._ethicsCurrentProject || (window._ethicsProjects || []).find(function(p) { return p.id === projectId; }) || {};
    var center = window._ethicsCurrentCenter || (window._ethicsCenters || []).find(function(c) { return c.id === centerId; }) || {};
    var items = [];
    document.querySelectorAll('#ethicsDocList > div').forEach(function(row) {
        var docType = row.querySelector('.ed-doc-type').value;
        var docName = row.querySelector('.ed-doc-name').value.trim();
        var version = row.querySelector('.ed-version').value.trim();
        var versionDate = row.querySelector('.ed-version-date').value;
        var copies = parseInt(row.querySelector('.ed-copies').value) || 1;
        if (docType || docName || version || versionDate) {
            items.push({
                doc_type: docType,
                doc_name: docName,
                version: version,
                version_date: versionDate,
                copies: copies,
                notes: ''
            });
        }
    });
    return {
        letter_type: getVal('el_letter_type') || 'CRA_to_PI',
        project_id: projectId,
        center_id: centerId,
        project_name: project.name || '',
        project_code: project.code || '',
        project_full_name: project.full_name || project.name || '',
        approval_number: project.approval_number || '',
        sponsor: project.sponsor || '',
        cro_name: project.cro_name || '',
        center_name: [center.code, center.name].filter(hasValue).join(' '),
        center_code: center.code || '',
        pi_name: center.pi_name || '',
        pi_phone: center.pi_phone || '',
        contact_ethics: center.contact_ethics || '',
        ethics_committee: getVal('el_ethics_committee') || center.ethics_committee_name || '',
        submission_date: getVal('el_submission_date'),
        submitter_name: getVal('el_submitter_name'),
        submitter_phone: getVal('el_submitter_phone'),
        submit_method: getVal('el_submit_method'),
        tracking_number: getVal('el_tracking_number'),
        notes: getVal('el_notes'),
        items: items
    };
};

window.getEthicsLetterCompleteness = function(draft) {
    var errors = [];
    var warnings = [];
    var templates = window._ethicsLetterTemplates || [];
    var hasTypeTemplate = templates.some(function(t) { return (t.letter_type || 'CRA_to_PI') === draft.letter_type; });
    if (!draft.project_id) errors.push('请选择项目');
    if (!draft.center_id) errors.push('请选择中心');
    if (!draft.submission_date) errors.push('请填写递交日期');
    if (!draft.items.length) errors.push('请至少添加一个递交文件');
    if (draft.letter_type === 'PI_to_Ethics' && !draft.ethics_committee) errors.push('PI致伦理递交信需要填写伦理委员会名称');
    draft.items.forEach(function(item, idx) {
        if (!item.doc_name) errors.push('第 ' + (idx + 1) + ' 个文件缺少文件名称');
        if (!item.version) warnings.push('第 ' + (idx + 1) + ' 个文件缺少版本号');
    });
    if (!hasTypeTemplate) warnings.push('当前递交信类型还没有可用模板');
    if (!draft.project_full_name) warnings.push('项目全称为空，Word 中 {project_full_name} 会留空');
    if (!draft.project_code) warnings.push('方案编号为空，Word 中 {project_code} 会留空');
    if (!draft.approval_number) warnings.push('通知书/批件编号为空，Word 中 {approval_number} 会留空');
    if (!draft.sponsor) warnings.push('申办方为空，Word 中 {sponsor} 会留空');
    if (!draft.center_name) warnings.push('中心名称为空，Word 中 {center_name} 会留空');
    if (draft.letter_type === 'CRA_to_PI' && !draft.pi_name) warnings.push('PI 姓名为空，CRA 致 PI 递交信可能不完整');
    return { errors: errors, warnings: warnings };
};

window.renderEthicsLetterPreview = function() {
    var target = document.getElementById('ethicsLetterPreview');
    if (!target) return;
    var draft = window.getEthicsLetterDraft();
    var check = window.getEthicsLetterCompleteness(draft);
    var typeLabel = window.ETHICS_LETTER_TYPES[draft.letter_type] || draft.letter_type;
    var docsHtml = draft.items.length ? draft.items.map(function(item, idx) {
        return '<tr><td>' + (idx + 1) + '</td><td>' + window.escHtml(item.doc_type || '-') + '</td><td>' + window.escHtml(item.doc_name || '-') + '</td><td>' + window.escHtml(item.version || '-') + '</td><td>' + (item.version_date || '-') + '</td><td>' + (item.copies || 1) + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="el-empty-cell">尚未添加文件</td></tr>';
    var list = function(items, tone) {
        if (!items.length) return '';
        return '<div class="el-check ' + tone + '"><strong>' + (tone === 'danger' ? '必须补齐' : '建议确认') + '</strong><ul>' + items.map(function(text) { return '<li>' + window.escHtml(text) + '</li>'; }).join('') + '</ul></div>';
    };
    target.innerHTML = `
        <div class="el-preview-grid">
            <div><span>递交信类型</span><strong>${window.escHtml(typeLabel)}</strong></div>
            <div><span>项目</span><strong>${window.escHtml(draft.project_name || '-')}</strong></div>
            <div><span>中心</span><strong>${window.escHtml(draft.center_name || '-')}</strong></div>
            <div><span>递交日期</span><strong>${draft.submission_date || '-'}</strong></div>
            <div><span>递交人</span><strong>${window.escHtml(draft.submitter_name || '-')}</strong></div>
            <div><span>递交方式</span><strong>${window.escHtml(draft.submit_method || '-')}</strong></div>
            <div><span>伦理委员会</span><strong>${window.escHtml(draft.ethics_committee || '-')}</strong></div>
            <div><span>文件数量</span><strong>${draft.items.length} 份</strong></div>
        </div>
        ${list(check.errors, 'danger')}
        ${list(check.warnings, 'warning')}
        <div class="el-preview-docs">
            <table>
                <thead><tr><th>#</th><th>类型</th><th>文件名称</th><th>版本</th><th>版本日期</th><th>份数</th></tr></thead>
                <tbody>${docsHtml}</tbody>
            </table>
        </div>
    `;
};

window.refreshEthicsLetterPreview = function() {
    setTimeout(window.renderEthicsLetterPreview, 0);
};

window.switchEthicsLetterStep = function(step) {
    var current = Math.max(1, Math.min(3, step));
    document.querySelectorAll('.el-step').forEach(function(el) {
        el.classList.toggle('active', parseInt(el.dataset.step) === current);
    });
    document.querySelectorAll('.el-step-pane').forEach(function(el) {
        el.classList.toggle('active', parseInt(el.dataset.step) === current);
    });
    var prev = document.getElementById('elPrevBtn');
    var next = document.getElementById('elNextBtn');
    var save = document.getElementById('elSaveBtn');
    var generate = document.getElementById('elGenerateBtn');
    if (prev) prev.style.display = current === 1 ? 'none' : '';
    if (next) next.style.display = current === 3 ? 'none' : '';
    if (save) save.style.display = current === 3 ? '' : 'none';
    if (generate) generate.style.display = current === 3 ? '' : 'none';
    window._ethicsLetterStep = current;
    window.renderEthicsLetterPreview();
};

window.nextEthicsLetterStep = function() {
    var step = window._ethicsLetterStep || 1;
    var draft = window.getEthicsLetterDraft();
    if (step === 1) {
        var missing = [];
        if (!draft.project_id) missing.push('请选择项目');
        if (!draft.center_id) missing.push('请选择中心');
        if (!draft.submission_date) missing.push('请填写递交日期');
        if (draft.letter_type === 'PI_to_Ethics' && !draft.ethics_committee) missing.push('PI致伦理递交信需要填写伦理委员会名称');
        if (missing.length) { alert(missing.join('\n')); return; }
    }
    if (step === 2 && !draft.items.length) {
        alert('请至少添加一个递交文件');
        return;
    }
    window.switchEthicsLetterStep(step + 1);
};

window.prevEthicsLetterStep = function() {
    window.switchEthicsLetterStep((window._ethicsLetterStep || 1) - 1);
};
// ========== 伦理递交页面 ==========

window.loadEthics = async function(content) {
    var [lettersData, templatesData] = await Promise.all([
        api.getEthicsLetters(), api.getEthicsTemplates()
    ]);
    var letters = lettersData.letters || [];
    var templates = templatesData.templates || [];
    var templateStatusHtml = window.getEthicsTemplateStatusHtml(templates);

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="window.openEthicsLetterForm()">
                    <i class="fas fa-plus"></i> 新建递交信
                </button>
                <button class="btn btn-outline" onclick="window.openTemplateManager()">
                    <i class="fas fa-file-word"></i> 模板管理
                </button>
                <button class="btn btn-outline" onclick="window.showPlaceholderHelp()">
                    <i class="fas fa-question-circle"></i> 占位符说明
                </button>
            </div>
            <div style="font-size:13px;color:#666;">
                已有模板: ${templates.length} 个
            </div>
        </div>

        ${templateStatusHtml}

        <div class="card">
            <div class="card-header"><i class="fas fa-file-alt"></i> 递交信记录 (${letters.length})</div>
            ${letters.length === 0 ? `
                <div style="padding:40px;text-align:center;color:#999;">
                    <i class="fas fa-inbox" style="font-size:48px;color:#ddd;margin-bottom:12px;"></i>
                    <p>暂无递交信记录</p>
                    <small>点击「新建递交信」开始创建</small>
                </div>
            ` : `
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <thead>
                            <tr style="background:#f5f7fa;border-bottom:2px solid #e0e0e0;">
                                <th style="padding:10px 8px;text-align:left;">类型</th>
                                <th style="padding:10px 8px;text-align:left;">项目</th>
                                <th style="padding:10px 8px;text-align:left;">中心</th>
                                <th style="padding:10px 8px;text-align:left;">递交日期</th>
                                <th style="padding:10px 8px;text-align:left;">文件数</th>
                                <th style="padding:10px 8px;text-align:left;">递交人</th>
                                <th style="padding:10px 8px;text-align:center;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${letters.map(function(l) {
                                var typeLabel = window.ETHICS_LETTER_TYPES[l.letter_type] || 'CRA致PI';
                                var typeColor = l.letter_type === 'PI_to_Ethics' ? '#9b59b6' : '#3498db';
                                return `
                                <tr style="border-bottom:1px solid #eee;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
                                    <td style="padding:10px 8px;"><span style="background:${typeColor};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${typeLabel}</span></td>
                                    <td style="padding:10px 8px;">${window.escHtml(l.project_name || '-')}</td>
                                    <td style="padding:10px 8px;">${window.escHtml(l.center_name || '-')}</td>
                                    <td style="padding:10px 8px;">${l.submission_date || '-'}</td>
                                    <td style="padding:10px 8px;">${(l.items || []).length} 份</td>
                                    <td style="padding:10px 8px;">${window.escHtml(l.submitter_name || '-')}</td>
                                    <td style="padding:10px 8px;text-align:center;white-space:nowrap;">
                                        <button class="btn btn-text btn-sm" onclick="window.generateEthicsWord('${l.id}')" title="生成Word" style="padding:4px 8px;color:#2980b9;">
                                            <i class="fas fa-file-word"></i> 生成
                                        </button>
                                        <button class="btn btn-text btn-sm" onclick="window.viewEthicsLetter('${l.id}')" title="查看" style="padding:4px 8px;">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-text btn-sm" onclick="window.openEthicsLetterForm('${l.id}')" title="编辑" style="padding:4px 8px;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-text btn-sm" onclick="window.deleteEthicsLetter('${l.id}')" title="删除" style="padding:4px 8px;">
                                            <i class="fas fa-trash" style="color:#e74c3c;"></i>
                                        </button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
};

// ========== 新建/编辑递交信表单 ==========

window.openEthicsLetterForm = async function(editId) {
    var editData = null;
    if (editId) {
        var res = await api.getEthicsLetter(editId);
        if (res.success) editData = res.letter;
    }

    var [projData, centerData, tmplData] = await Promise.all([api.getProjects(), api.getCenters(), api.getEthicsTemplates()]);
    var projects = projData.projects || [];
    var centers = centerData.centers || [];
    var templates = tmplData.templates || [];
    window._ethicsProjects = projects;
    window._ethicsCenters = centers;
    window._ethicsLetterTemplates = templates;
    window._ethicsCurrentProject = null;
    window._ethicsCurrentCenter = null;

    var projOpts = projects.map(function(p) {
        return '<option value="' + p.id + '"' + (editData && editData.project_id === p.id ? ' selected' : '') + '>' + window.escHtml(p.name) + '</option>';
    }).join('');

    var today = new Date().toISOString().split('T')[0];
    var currentLetterType = editData ? (editData.letter_type || 'CRA_to_PI') : 'CRA_to_PI';

    window.openModal(`
        <h3><i class="fas fa-file-plus" style="color:#3498db;"></i> ${editId ? '编辑递交信' : '新建递交信'}</h3>
        <form id="ethicsLetterForm" class="ethics-letter-form" onsubmit="return window.submitEthicsLetter(event, '${editId || ''}')" oninput="window.refreshEthicsLetterPreview()" onchange="window.refreshEthicsLetterPreview()">
            <div class="el-steps">
                <button type="button" class="el-step active" data-step="1" onclick="window.switchEthicsLetterStep(1)"><span>1</span>基本信息</button>
                <button type="button" class="el-step" data-step="2" onclick="window.switchEthicsLetterStep(2)"><span>2</span>文件清单</button>
                <button type="button" class="el-step" data-step="3" onclick="window.switchEthicsLetterStep(3)"><span>3</span>生成预览</button>
            </div>

            <div class="el-step-pane active" data-step="1">
                <div class="form-row">
                    <div class="form-group">
                        <label>递交信类型 *</label>
                        <select id="el_letter_type" required onchange="window.onLetterTypeChange();window.refreshEthicsLetterPreview();">
                            <option value="CRA_to_PI" ${currentLetterType === 'CRA_to_PI' ? 'selected' : ''}>CRA致PI递交信</option>
                            <option value="PI_to_Ethics" ${currentLetterType === 'PI_to_Ethics' ? 'selected' : ''}>PI致伦理递交信</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>项目 *</label>
                        <select id="el_project" required onchange="window.onEthicsProjectChange()">
                            <option value="">请选择</option>${projOpts}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>中心 *</label>
                        <select id="el_center" required onchange="window.onEthicsCenterChange(true)">
                            <option value="">请选择</option>
                        </select>
                    </div>
                    <div class="form-group"><label>递交日期 *</label><input type="date" id="el_submission_date" required value="${editData ? editData.submission_date : today}"></div>
                </div>

                <div id="projectInfoPreview" class="el-project-preview" style="display:none;">
                    <div id="projectInfoContent"></div>
                </div>

                <div class="form-row">
                    <div class="form-group"><label>递交人</label><input type="text" id="el_submitter_name" value="${editData ? window.escAttr(editData.submitter_name || '') : ''}"></div>
                    <div class="form-group"><label>递交人电话</label><input type="text" id="el_submitter_phone" value="${editData ? window.escAttr(editData.submitter_phone || '') : ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>递交方式</label>
                        <select id="el_submit_method">
                            ${window.ETHICS_SUBMIT_METHODS.map(function(m) {
                                return '<option value="' + m + '"' + (editData && editData.submit_method === m ? ' selected' : '') + '>' + m + '</option>';
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>快递单号</label><input type="text" id="el_tracking_number" value="${editData ? window.escAttr(editData.tracking_number || '') : ''}"></div>
                </div>
                <div class="form-group">
                    <label>伦理委员会名称</label>
                    <input type="text" id="el_ethics_committee" value="${editData ? window.escAttr(editData.ethics_committee || '') : ''}" placeholder="如：广州医科大学附属第二医院临床试验伦理委员会">
                    <small style="color:#999;">PI致伦理递交信必填，选择中心后可自动填充</small>
                </div>
                <div class="form-group"><label>备注</label><textarea id="el_notes" rows="2">${editData ? window.escAttr(editData.notes || '') : ''}</textarea></div>
            </div>

            <div class="el-step-pane" data-step="2">
                <div class="el-pane-head">
                    <div>
                        <strong>递交文件清单</strong>
                        <span>维护文件名称、版本、版本日期和份数</span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" onclick="window.addEthicsDocRow();window.refreshEthicsLetterPreview();">
                        <i class="fas fa-plus"></i> 添加文件
                    </button>
                </div>
                <div id="ethicsDocList" class="ethics-doc-list"></div>
            </div>

            <div class="el-step-pane" data-step="3">
                <div class="el-pane-head">
                    <div>
                        <strong>生成预览</strong>
                        <span>保存前确认信息完整性和 Word 输出内容</span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" onclick="window.showPlaceholderHelp()">
                        <i class="fas fa-question-circle"></i> 占位符
                    </button>
                </div>
                <div id="ethicsLetterPreview"></div>
            </div>

            <div class="el-form-actions">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="button" id="elPrevBtn" class="btn btn-outline" onclick="window.prevEthicsLetterStep()" style="display:none;"><i class="fas fa-arrow-left"></i> 上一步</button>
                <button type="button" id="elNextBtn" class="btn btn-primary" onclick="window.nextEthicsLetterStep()">下一步 <i class="fas fa-arrow-right"></i></button>
                <button type="submit" id="elSaveBtn" class="btn btn-outline" data-action="save" onclick="window._ethicsSubmitAction='save'" style="display:none;">保存</button>
                <button type="submit" id="elGenerateBtn" class="btn btn-primary" data-action="generate" onclick="window._ethicsSubmitAction='generate'" style="display:none;"><i class="fas fa-file-word"></i> 保存并生成Word</button>
            </div>
        </form>
    `);
    var modal = document.getElementById('modalContent');
    if (modal) modal.classList.add('ethics-letter-modal');

    if (editData) {
        await window.onEthicsProjectChange(editData.center_id);
        var editItems = editData.items || [];
        if (editItems.length) {
            editItems.forEach(function(item) { window.addEthicsDocRow(item); });
        } else {
            window.addEthicsDocRow();
        }
    } else {
        window.addEthicsDocRow();
    }
    window.switchEthicsLetterStep(1);
    window.refreshEthicsLetterPreview();
};

// 选择项目后显示项目信息预览
window.onEthicsProjectChange = async function(selectedCenterId) {
    var projId = document.getElementById('el_project').value;
    window._ethicsCurrentProject = null;
    window._ethicsCurrentCenter = null;
    if (!projId) {
        var emptySel = document.getElementById('el_center');
        if (emptySel) emptySel.innerHTML = '<option value="">请选择</option>';
        window.refreshEthicsLetterPreview();
        return;
    }

    var centerData = await api.getCenters(projId);
    var centers = centerData.centers || [];
    window._ethicsCenters = centers;
    var sel = document.getElementById('el_center');
    sel.innerHTML = '<option value="">请选择</option>' + centers.map(function(c) {
        var label = ((c.code || '') + ' ' + (c.name || '')).trim();
        var isSel = selectedCenterId && c.id === selectedCenterId;
        return '<option value="' + c.id + '"' + (isSel ? ' selected' : '') + '>' + window.escHtml(label) + '</option>';
    }).join('');

    // 显示项目信息预览
    var projData = await api.getProject(projId);
    if (projData.success) {
        var p = projData;
        window._ethicsCurrentProject = p;
        var preview = document.getElementById('projectInfoPreview');
        var content = document.getElementById('projectInfoContent');
        if (p.full_name || p.approval_number || p.sponsor || p.cro_name) {
            preview.style.display = 'block';
            content.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                    ${p.full_name ? '<div><strong>项目全称:</strong> ' + window.escHtml(p.full_name) + '</div>' : ''}
                    ${p.code ? '<div><strong>方案号:</strong> ' + window.escHtml(p.code) + '</div>' : ''}
                    ${p.sponsor ? '<div><strong>申办方:</strong> ' + window.escHtml(p.sponsor) + '</div>' : ''}
                    ${p.cro_name ? '<div><strong>CRO:</strong> ' + window.escHtml(p.cro_name) + '</div>' : ''}
                    ${p.approval_number ? '<div><strong>通知书编号:</strong> ' + window.escHtml(p.approval_number) + '</div>' : ''}
                </div>
                ${(!p.full_name || !p.approval_number || !p.sponsor) ? '<div style="color:#e74c3c;margin-top:4px;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> 部分项目信息缺失，请到「项目」页面完善</div>' : ''}
            `;
        } else {
            preview.style.display = 'none';
        }
    }
    if (selectedCenterId) await window.onEthicsCenterChange(false);
    window.refreshEthicsLetterPreview();
};

// 选择中心后自动填充伦理委员会名称
window.onEthicsCenterChange = async function(forceFillEthics) {
    var centerId = document.getElementById('el_center').value;
    window._ethicsCurrentCenter = null;
    if (!centerId) {
        window.refreshEthicsLetterPreview();
        return;
    }
    var centerData = await api.getCenter(centerId);
    if (centerData.success && centerData.center) {
        var c = centerData.center;
        window._ethicsCurrentCenter = c;
        var ethicsInput = document.getElementById('el_ethics_committee');
        if (c.ethics_committee_name && ethicsInput && (forceFillEthics || !ethicsInput.value.trim())) {
            ethicsInput.value = c.ethics_committee_name;
        }
    }
    window.refreshEthicsLetterPreview();
};

window.onLetterTypeChange = function() {
    window.refreshEthicsLetterPreview();
};

window._ethicsDocRowId = 0;

window.addEthicsDocRow = function(data) {
    window._ethicsDocRowId++;
    var rowId = 'ethicsDocRow_' + window._ethicsDocRowId;
    var d = data || {};
    var typeOpts = window.ETHICS_DOC_TYPES.map(function(t) {
        return '<option value="' + t + '"' + (d.doc_type === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');

    var container = document.getElementById('ethicsDocList');
    var div = document.createElement('div');
    div.id = rowId;
    div.className = 'ethics-doc-row';
    div.innerHTML = `
        <select class="ed-doc-type" onchange="window.refreshEthicsLetterPreview()">
            <option value="">类型</option>${typeOpts}
        </select>
        <input type="text" class="ed-doc-name" placeholder="文件名称（如：临床试验方案）" value="${window.escAttr(d.doc_name || '')}">
        <input type="text" class="ed-version" placeholder="版本号" value="${window.escAttr(d.version || '')}">
        <input type="date" class="ed-version-date" value="${d.version_date || ''}">
        <input type="number" class="ed-copies" placeholder="份" value="${d.copies || 1}" min="1">
        <button type="button" class="ed-remove" onclick="document.getElementById('${rowId}').remove();window.refreshEthicsLetterPreview();" title="删除文件"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);

    if (d.doc_type) {
        div.querySelector('.ed-doc-type').value = d.doc_type;
    }
    window.refreshEthicsLetterPreview();
};

window.submitEthicsLetter = async function(e, editId) {
    e.preventDefault();
    var data = window.getEthicsLetterDraft();
    var check = window.getEthicsLetterCompleteness(data);

    if (check.errors.length > 0) {
        alert('请先补齐以下信息：\n\n- ' + check.errors.join('\n- '));
        window.switchEthicsLetterStep(check.errors.some(function(text) { return text.indexOf('文件') >= 0; }) ? 2 : 1);
        return;
    }

    try {
        var action = window._ethicsSubmitAction || (e.submitter && e.submitter.dataset ? e.submitter.dataset.action : 'save') || 'save';
        var res = editId ? await api.updateEthicsLetter(editId, data) : await api.createEthicsLetter(data);
        if (res.success) {
            var savedId = editId || res.id;
            window._ethicsSubmitAction = 'save';
            window.closeModal();
            await window.loadEthics(document.getElementById('pageContent'));
            if (action === 'generate' && savedId) {
                await window.generateEthicsWord(savedId);
            } else {
                window.showToast('递交信已保存');
            }
        } else {
            alert('保存失败');
        }
    } catch (err) {
        alert('保存失败: ' + err.message);
    }
};

// ========== 查看递交信详情 ==========

window.viewEthicsLetter = async function(id) {
    var res = await api.getEthicsLetter(id);
    if (!res.success) { alert('加载失败'); return; }
    var l = res.letter;
    var typeLabel = window.ETHICS_LETTER_TYPES[l.letter_type] || 'CRA致PI';

    var itemsHtml = (l.items || []).map(function(it, i) {
        return '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:8px;">' + (i + 1) + '</td>' +
            '<td style="padding:8px;">' + window.escHtml(it.doc_type || '') + '</td>' +
            '<td style="padding:8px;">' + window.escHtml(it.doc_name || '') + '</td>' +
            '<td style="padding:8px;">' + window.escHtml(it.version || '') + '</td>' +
            '<td style="padding:8px;">' + (it.version_date || '') + '</td>' +
            '<td style="padding:8px;text-align:center;">' + (it.copies || 1) + '</td>' +
            '</tr>';
    }).join('');

    window.openModal(`
        <h3><i class="fas fa-file-alt" style="color:#3498db;"></i> 递交信详情</h3>
        <div style="max-width:700px;display:grid;gap:10px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;">
                <div><strong>类型:</strong> ${typeLabel}</div>
                <div><strong>项目:</strong> ${window.escHtml(l.project_name || '-')}</div>
                <div><strong>中心:</strong> ${window.escHtml(l.center_name || '-')}</div>
                <div><strong>递交日期:</strong> ${l.submission_date || '-'}</div>
                <div><strong>递交人:</strong> ${window.escHtml(l.submitter_name || '-')}</div>
                <div><strong>递交方式:</strong> ${window.escHtml(l.submit_method || '-')}</div>
                <div><strong>快递单号:</strong> ${window.escHtml(l.tracking_number || '-')}</div>
                <div><strong>伦理委员会:</strong> ${window.escHtml(l.ethics_committee || '-')}</div>
                <div><strong>文件数量:</strong> ${(l.items || []).length} 份</div>
            </div>
            ${l.notes ? '<div style="background:#f9f9f9;padding:8px;border-radius:6px;font-size:13px;"><strong>备注:</strong> ' + window.escHtml(l.notes) + '</div>' : ''}
            <div style="overflow-x:auto;margin-top:8px;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="background:#f5f7fa;border-bottom:2px solid #e0e0e0;">
                        <th style="padding:8px;text-align:left;">#</th>
                        <th style="padding:8px;text-align:left;">类型</th>
                        <th style="padding:8px;text-align:left;">文件名称</th>
                        <th style="padding:8px;text-align:left;">版本</th>
                        <th style="padding:8px;text-align:left;">日期</th>
                        <th style="padding:8px;text-align:center;">份数</th>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button class="btn btn-primary" onclick="window.closeModal(); window.generateEthicsWord('${l.id}')">
                    <i class="fas fa-file-word"></i> 生成Word
                </button>
                <button class="btn btn-outline" onclick="window.closeModal(); window.openEthicsLetterForm('${l.id}')">
                    <i class="fas fa-edit"></i> 编辑
                </button>
                <button class="btn btn-text" onclick="window.closeModal()">关闭</button>
            </div>
        </div>
    `);
};

// ========== 删除递交信 ==========

window.deleteEthicsLetter = async function(id) {
    if (!confirm('确定删除该递交信记录？此操作不可撤销。')) return;
    try {
        await api.deleteEthicsLetter(id);
        await window.loadEthics(document.getElementById('pageContent'));
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
};

// ========== 生成 Word 递交信 ==========

window.generateEthicsWord = async function(letterId) {
    window.showLoading();
    try {
        var letterRes = await api.getEthicsLetter(letterId);
        if (!letterRes.success) { alert('获取递交信数据失败'); return; }
        var l = letterRes.letter;

        // 根据信件类型选择模板
        var letterType = l.letter_type || 'CRA_to_PI';
        var tmplRes = await api.getEthicsTemplates();
        var templates = tmplRes.templates || [];
        var typeTemplates = templates.filter(function(t) { return (t.letter_type || 'CRA_to_PI') === letterType; });
        var tmpl = typeTemplates.find(function(t) { return t.is_default; }) ||
                   typeTemplates[0] ||
                   templates.find(function(t) { return t.is_default; }) ||
                   templates[0];
        if (!tmpl) {
            alert('请先上传递交信模板！点击「模板管理」上传公司模板。');
            return;
        }

        var warnings = window.getEthicsGenerationWarnings(l);
        if (warnings.length > 0) {
            var ok = confirm('生成前发现以下信息可能不完整：\n\n- ' + warnings.join('\n- ') + '\n\n仍要继续生成 Word 吗？');
            if (!ok) return;
        }

        // 下载模板文件
        var templateBuffer = await api.downloadTemplate(tmpl.file_path);

        // 准备填充数据
        var today = new Date();
        var todayStr = today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日';
        var subDate = l.submission_date || '';
        if (subDate) {
            var parts = subDate.split('-');
            if (parts.length === 3) {
                subDate = parseInt(parts[0]) + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
            }
        }

        // 准备文件清单数据
        var docsData = (l.items || []).map(function(it, i) {
            var vd = it.version_date || '';
            if (vd) {
                var vp = vd.split('-');
                if (vp.length === 3) vd = parseInt(vp[0]) + '年' + parseInt(vp[1]) + '月' + parseInt(vp[2]) + '日';
            }
            return {
                index: i + 1,
                doc_type: it.doc_type || '',
                doc_name: it.doc_name || '',
                version: it.version || '',
                version_date: vd,
                copies: it.copies || 1,
                doc_notes: it.notes || ''
            };
        });

        var docData = {
            project_name: l.project_name || '',
            project_full_name: l.project_full_name || l.project_name || '',
            project_code: l.project_code || '',
            approval_number: l.approval_number || '',
            sponsor: l.sponsor || '',
            cro_name: l.cro_name || '',
            center_name: l.center_name || '',
            center_code: l.center_code || '',
            pi_name: l.pi_name || '',
            pi_phone: l.pi_phone || '',
            ethics_committee: l.ethics_committee || l.contact_ethics || '',
            submission_date: subDate,
            submitter_name: l.submitter_name || '',
            submitter_phone: l.submitter_phone || '',
            submit_method: l.submit_method || '',
            tracking_number: l.tracking_number || '',
            today_date: todayStr,
            doc_count: (l.items || []).length,
            notes: l.notes || '',
            docs: docsData
        };

        // 使用 docxtemplater 填充模板
        var zip = new PizZip(templateBuffer);
        var doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });
        doc.render(docData);
        var generated = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        // 下载文件
        var typePrefix = letterType === 'PI_to_Ethics' ? 'PI致伦理' : 'CRA致PI';
        var fileName = window.safeEthicsFileName(typePrefix + '递交信_' + (l.project_name || '') + '_' + (l.center_name || '') + '_' + (l.submission_date || '') + '.docx');
        saveAs(generated, fileName);
    } catch (err) {
        console.error('生成Word失败:', err);
        alert('生成Word失败: ' + err.message + '\n\n请检查模板中的占位符是否正确，参考「占位符说明」。');
    } finally {
        window.hideLoading();
    }
};

// ========== 模板管理 ==========

window.openTemplateManager = async function() {
    var res = await api.getEthicsTemplates();
    var templates = res.templates || [];

    var listHtml = templates.length === 0 ? `
        <div style="padding:30px;text-align:center;color:#999;">
            <i class="fas fa-file-word" style="font-size:40px;color:#ddd;margin-bottom:10px;"></i>
            <p>尚未上传模板</p>
        </div>
    ` : templates.map(function(t) {
        var typeLabel = window.ETHICS_LETTER_TYPES[t.letter_type] || '通用';
        var typeColor = t.letter_type === 'PI_to_Ethics' ? '#9b59b6' : '#3498db';
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;">
            <div>
                <div style="font-weight:600;">${window.escHtml(t.name)} <span style="background:${typeColor};color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;">${typeLabel}</span> ${t.is_default ? '<span style="background:#27ae60;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;">默认</span>' : ''}</div>
                <div style="font-size:12px;color:#999;">${t.description || ''} | ${t.created_at ? t.created_at.substring(0, 10) : ''}</div>
            </div>
            <div style="display:flex;gap:4px;">
                ${!t.is_default ? '<button class="btn btn-sm btn-outline" onclick="window.setDefaultTmpl(\'' + t.id + '\')">设为默认</button>' : ''}
                <button class="btn btn-sm btn-text" onclick="window.deleteTmpl('${t.id}')" style="color:#e74c3c;"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');

    window.openModal(`
        <h3><i class="fas fa-file-word" style="color:#2980b9;"></i> 递交信模板管理</h3>
        <div style="max-width:600px;">
            <div style="background:#f0f7ff;border:1px solid #bee5eb;border-radius:8px;padding:12px;margin-bottom:16px;">
                <strong style="color:#2c3e50;"><i class="fas fa-info-circle"></i> 如何制作模板：</strong>
                <ol style="margin:8px 0 0 20px;padding:0;font-size:13px;color:#555;line-height:1.8;">
                    <li>打开公司的空白递交信 Word 文件</li>
                    <li>将需要自动填充的内容替换为占位符<br>
                        例如：将项目名称处改为 <code style="background:#e8e8e8;padding:1px 4px;border-radius:3px;">{project_full_name}</code></li>
                    <li>递交文件清单用循环：<code style="background:#e8e8e8;padding:1px 4px;border-radius:3px;">{#docs}...{/docs}</code></li>
                    <li>版本信息用条件块：<code style="background:#e8e8e8;padding:1px 4px;border-radius:3px;">{#version}（版本号：{version}，版本日期：{version_date}）{/version}</code></li>
                    <li>保存为 .docx 格式后上传</li>
                    <li>点击「占位符说明」查看所有可用占位符</li>
                </ol>
            </div>

            <div style="border:2px dashed #bbb;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
                <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:#bbb;"></i>
                <p style="margin:8px 0;color:#666;">选择 .docx 模板文件上传</p>
                <div style="margin-bottom:8px;">
                    <label style="font-size:13px;">模板类型：</label>
                    <select id="tmplLetterType" style="padding:4px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
                        <option value="CRA_to_PI">CRA致PI递交信</option>
                        <option value="PI_to_Ethics">PI致伦理递交信</option>
                    </select>
                </div>
                <input type="file" id="tmplFile" accept=".docx" style="display:none;" onchange="window.onTmplFileSelect()">
                <button class="btn btn-primary" onclick="document.getElementById('tmplFile').click()">
                    <i class="fas fa-upload"></i> 选择文件
                </button>
                <div id="tmplUploadArea" style="display:none;margin-top:10px;">
                    <input type="text" id="tmplName" placeholder="模板名称（如：初始伦理递交信模板）" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;">
                    <input type="text" id="tmplDesc" placeholder="描述（可选）" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px;">
                    <button class="btn btn-primary" onclick="window.uploadTmpl()" style="width:100%;">上传</button>
                </div>
            </div>

            <div id="tmplList">${listHtml}</div>

            <div style="text-align:right;margin-top:12px;">
                <button class="btn btn-text" onclick="window.closeModal()">关闭</button>
            </div>
        </div>
    `);
};

window.onTmplFileSelect = function() {
    var file = document.getElementById('tmplFile').files[0];
    if (file) {
        document.getElementById('tmplUploadArea').style.display = 'block';
        document.getElementById('tmplName').value = file.name.replace(/\.docx$/i, '');
    }
};

window.uploadTmpl = async function() {
    var file = document.getElementById('tmplFile').files[0];
    if (!file) { alert('请选择文件'); return; }
    var name = document.getElementById('tmplName').value.trim();
    var desc = document.getElementById('tmplDesc').value.trim();
    var letterType = document.getElementById('tmplLetterType').value;
    if (!name) { alert('请输入模板名称'); return; }

    try {
        window.showLoading();
        var res = await api.uploadEthicsTemplate(file, name, desc, letterType);
        window.hideLoading();
        alert('上传成功！');
        window.closeModal();
        await window.loadEthics(document.getElementById('pageContent'));
    } catch (err) {
        window.hideLoading();
        alert('上传失败: ' + err.message);
    }
};

window.setDefaultTmpl = async function(id) {
    try {
        await api.setDefaultTemplate(id);
        await window.openTemplateManager();
    } catch (err) {
        alert('设置失败: ' + err.message);
    }
};

window.deleteTmpl = async function(id) {
    if (!confirm('确定删除该模板？')) return;
    try {
        await api.deleteEthicsTemplate(id);
        await window.openTemplateManager();
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
};

// ========== 占位符说明 ==========

window.showPlaceholderHelp = function() {
    var rows = window.ETHICS_PLACEHOLDERS.map(function(p) {
        return '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:8px;"><code style="background:#e8e8e8;padding:2px 6px;border-radius:3px;font-size:13px;">' + p.tag + '</code></td>' +
            '<td style="padding:8px;">' + p.desc + '</td>' +
            '</tr>';
    }).join('');

    window.openModal(`
        <h3><i class="fas fa-question-circle" style="color:#f39c12;"></i> 模板占位符说明</h3>
        <div style="max-width:600px;">
            <p style="color:#666;font-size:14px;">在 Word 模板中，将需要自动填充的位置替换为以下占位符。生成时系统会自动替换为实际内容。</p>

            <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:10px;margin:10px 0;font-size:13px;">
                <strong>递交文件清单（循环）：</strong><br>
                在模板中用 <code>{#docs}</code> 和 <code>{/docs}</code> 包裹重复内容，例如：<br>
                <code style="font-size:12px;">{#docs}{index}、{doc_name}{#version}（版本号：{version}，版本日期：{version_date}）{/version}{/docs}</code>
            </div>

            <div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:10px;margin:10px 0;font-size:13px;">
                <strong>条件显示（版本信息）：</strong><br>
                用 <code>{#version}...{/version}</code> 包裹版本信息，仅当填写了版本号时才显示。
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead><tr style="background:#f5f7fa;border-bottom:2px solid #e0e0e0;">
                    <th style="padding:8px;text-align:left;">占位符</th>
                    <th style="padding:8px;text-align:left;">说明</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>

            <div style="text-align:right;margin-top:12px;">
                <button class="btn btn-text" onclick="window.closeModal()">关闭</button>
            </div>
        </div>
    `);
};
