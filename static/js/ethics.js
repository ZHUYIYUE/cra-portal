// ========== 伦理递交管理 ==========

window.ETHICS_DOC_TYPES = ['初始伦理', '修正案', '方案偏离报告', 'SAE报告', '年度报告', '结题报告', '备案类文件', '其他'];
window.ETHICS_SUBMIT_METHODS = ['快递', '专人递交', '电子邮件', '在线系统'];

// 可用占位符列表
window.ETHICS_PLACEHOLDERS = [
    { tag: '{project_name}', desc: '项目名称' },
    { tag: '{project_code}', desc: '项目编号' },
    { tag: '{center_name}', desc: '中心名称' },
    { tag: '{center_code}', desc: '中心编号' },
    { tag: '{pi_name}', desc: 'PI姓名' },
    { tag: '{pi_phone}', desc: 'PI电话' },
    { tag: '{submission_date}', desc: '递交日期' },
    { tag: '{submitter_name}', desc: '递交人姓名' },
    { tag: '{submitter_phone}', desc: '递交人电话' },
    { tag: '{submit_method}', desc: '递交方式' },
    { tag: '{tracking_number}', desc: '快递单号' },
    { tag: '{ethics_committee}', desc: '伦理委员会' },
    { tag: '{sponsor}', desc: '申办方' },
    { tag: '{cro_name}', desc: 'CRO名称' },
    { tag: '{today_date}', desc: '今天日期' },
    { tag: '{doc_count}', desc: '文件数量' },
    { tag: '{notes}', desc: '备注' },
    { tag: '{#docs}{doc_type}{/docs}', desc: '文件类型（循环）' },
    { tag: '{#docs}{doc_name}{/docs}', desc: '文件名称（循环）' },
    { tag: '{#docs}{version}{/docs}', desc: '版本号（循环）' },
    { tag: '{#docs}{version_date}{/docs}', desc: '版本日期（循环）' },
    { tag: '{#docs}{copies}{/docs}', desc: '份数（循环）' },
    { tag: '{#docs}{doc_notes}{/docs}', desc: '文件备注（循环）' }
];

// ========== 伦理递交页面 ==========

window.loadEthics = async function(content) {
    var [lettersData, templatesData] = await Promise.all([
        api.getEthicsLetters(), api.getEthicsTemplates()
    ]);
    var letters = lettersData.letters || [];
    var templates = templatesData.templates || [];
    var defaultTmpl = templates.find(function(t) { return t.is_default; }) || templates[0];

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
                当前模板: ${defaultTmpl ? window.escHtml(defaultTmpl.name) : '<span style="color:#e74c3c;">未设置</span>'}
            </div>
        </div>

        ${templates.length === 0 ? `
            <div class="alert-banner" style="background:#fff3e0;border-left:4px solid #ff9800;">
                <i class="fas fa-info-circle" style="color:#ff9800;"></i>
                尚未上传递交信模板，请先点击「模板管理」上传公司模板（.docx格式）。
            </div>
        ` : ''}

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
                                <th style="padding:10px 8px;text-align:left;">项目</th>
                                <th style="padding:10px 8px;text-align:left;">中心</th>
                                <th style="padding:10px 8px;text-align:left;">递交日期</th>
                                <th style="padding:10px 8px;text-align:left;">文件数</th>
                                <th style="padding:10px 8px;text-align:left;">递交人</th>
                                <th style="padding:10px 8px;text-align:left;">快递单号</th>
                                <th style="padding:10px 8px;text-align:center;">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${letters.map(function(l) {
                                return `
                                <tr style="border-bottom:1px solid #eee;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background=''">
                                    <td style="padding:10px 8px;">${window.escHtml(l.project_name || '-')}</td>
                                    <td style="padding:10px 8px;">${window.escHtml(l.center_name || '-')}</td>
                                    <td style="padding:10px 8px;">${l.submission_date || '-'}</td>
                                    <td style="padding:10px 8px;">${(l.items || []).length} 份</td>
                                    <td style="padding:10px 8px;">${window.escHtml(l.submitter_name || '-')}</td>
                                    <td style="padding:10px 8px;font-size:12px;">${window.escHtml(l.tracking_number || '-')}</td>
                                    <td style="padding:10px 8px;text-align:center;white-space:nowrap;">
                                        <button class="btn btn-text btn-sm" onclick="window.generateEthicsWord('${l.id}')" title="生成Word" style="padding:4px 8px;">
                                            <i class="fas fa-file-word" style="color:#2980b9;"></i>
                                        </button>
                                        <button class="btn btn-text btn-sm" onclick="window.viewEthicsLetter('${l.id}')" title="查看" style="padding:4px 8px;">
                                            <i class="fas fa-eye"></i>
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

    var [projData, centerData] = await Promise.all([api.getProjects(), api.getCenters()]);
    var projects = projData.projects || [];
    var centers = centerData.centers || [];

    var projOpts = projects.map(function(p) {
        return '<option value="' + p.id + '"' + (editData && editData.project_id === p.id ? ' selected' : '') + '>' + window.escHtml(p.name) + '</option>';
    }).join('');

    var today = new Date().toISOString().split('T')[0];

    window.openModal(`
        <h3><i class="fas fa-file-plus" style="color:#3498db;"></i> ${editId ? '编辑递交信' : '新建递交信'}</h3>
        <form id="ethicsLetterForm" onsubmit="return window.submitEthicsLetter(event, '${editId || ''}')" style="display:grid;gap:12px;max-width:800px;">
            <div class="form-row">
                <div class="form-group">
                    <label>项目 *</label>
                    <select id="el_project" required onchange="window.onEthicsProjectChange()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>${projOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>中心 *</label>
                    <select id="el_center" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        <option value="">请选择</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>递交日期 *</label><input type="date" id="el_submission_date" required value="${editData ? editData.submission_date : today}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>伦理委员会</label><input type="text" id="el_ethics_committee" value="${editData ? window.escAttr(editData.ethics_committee || '') : ''}" placeholder="如需指定" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>递交人</label><input type="text" id="el_submitter_name" value="${editData ? window.escAttr(editData.submitter_name || '') : ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
                <div class="form-group"><label>递交人电话</label><input type="text" id="el_submitter_phone" value="${editData ? window.escAttr(editData.submitter_phone || '') : ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>递交方式</label>
                    <select id="el_submit_method" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;">
                        ${window.ETHICS_SUBMIT_METHODS.map(function(m) {
                            return '<option value="' + m + '"' + (editData && editData.submit_method === m ? ' selected' : '') + '>' + m + '</option>';
                        }).join('')}
                    </select>
                </div>
                <div class="form-group"><label>快递单号</label><input type="text" id="el_tracking_number" value="${editData ? window.escAttr(editData.tracking_number || '') : ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;"></div>
            </div>
            <div class="form-group"><label>备注</label><textarea id="el_notes" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;">${editData ? window.escAttr(editData.notes || '') : ''}</textarea></div>

            <div style="border-top:1px solid #eee;padding-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <strong>递交文件清单</strong>
                    <button type="button" class="btn btn-sm btn-outline" onclick="window.addEthicsDocRow()">
                        <i class="fas fa-plus"></i> 添加文件
                    </button>
                </div>
                <div id="ethicsDocList" style="display:grid;gap:8px;"></div>
            </div>

            <div style="text-align:right;margin-top:8px;">
                <button type="button" class="btn btn-text" onclick="window.closeModal()">取消</button>
                <button type="submit" class="btn btn-primary">保存</button>
            </div>
        </form>
    `);

    // 如果编辑，预加载中心和文件
    if (editData) {
        window._ethicsEditItems = editData.items || [];
        window.onEthicsProjectChange(editData.center_id);
    } else {
        window._ethicsEditItems = null;
        window.addEthicsDocRow();
    }
};

window.onEthicsProjectChange = async function(selectedCenterId) {
    var projId = document.getElementById('el_project').value;
    if (!projId) return;
    var centerData = await api.getCenters(projId);
    var centers = centerData.centers || [];
    var sel = document.getElementById('el_center');
    sel.innerHTML = '<option value="">请选择</option>' + centers.map(function(c) {
        var label = ((c.code || '') + ' ' + (c.name || '')).trim();
        var isSel = selectedCenterId && c.id === selectedCenterId;
        return '<option value="' + c.id + '"' + (isSel ? ' selected' : '') + '>' + window.escHtml(label) + '</option>';
    }).join('');
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
    div.style.cssText = 'display:grid;grid-template-columns:1fr 2fr 80px 100px 60px 30px;gap:6px;align-items:center;';
    div.innerHTML = `
        <select class="ed-doc-type" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
            <option value="">类型</option>${typeOpts}
        </select>
        <input type="text" class="ed-doc-name" placeholder="文件名称" value="${window.escAttr(d.doc_name || '')}" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
        <input type="text" class="ed-version" placeholder="版本" value="${window.escAttr(d.version || '')}" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
        <input type="date" class="ed-version-date" value="${d.version_date || ''}" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;">
        <input type="number" class="ed-copies" placeholder="份" value="${d.copies || 1}" min="1" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;text-align:center;">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" style="border:none;background:none;color:#e74c3c;cursor:pointer;font-size:16px;padding:4px;">×</button>
    `;
    container.appendChild(div);

    // 设置选中类型
    if (d.doc_type) {
        div.querySelector('.ed-doc-type').value = d.doc_type;
    }
};

window.submitEthicsLetter = async function(e, editId) {
    e.preventDefault();
    var data = {
        project_id: document.getElementById('el_project').value,
        center_id: document.getElementById('el_center').value,
        submission_date: document.getElementById('el_submission_date').value,
        submitter_name: document.getElementById('el_submitter_name').value.trim(),
        submitter_phone: document.getElementById('el_submitter_phone').value.trim(),
        submit_method: document.getElementById('el_submit_method').value,
        tracking_number: document.getElementById('el_tracking_number').value.trim(),
        ethics_committee: document.getElementById('el_ethics_committee').value.trim(),
        notes: document.getElementById('el_notes').value.trim(),
        items: []
    };

    // 收集文件清单
    var rows = document.querySelectorAll('#ethicsDocList > div');
    rows.forEach(function(row) {
        var docType = row.querySelector('.ed-doc-type').value;
        var docName = row.querySelector('.ed-doc-name').value.trim();
        if (docType || docName) {
            data.items.push({
                doc_type: docType,
                doc_name: docName,
                version: row.querySelector('.ed-version').value.trim(),
                version_date: row.querySelector('.ed-version-date').value,
                copies: parseInt(row.querySelector('.ed-copies').value) || 1,
                notes: ''
            });
        }
    });

    if (data.items.length === 0) {
        alert('请至少添加一个递交文件');
        return;
    }

    try {
        var res = editId ? await api.updateEthicsLetter(editId, data) : await api.createEthicsLetter(data);
        if (res.success) {
            window.closeModal();
            await window.loadEthics(document.getElementById('pageContent'));
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
        // 获取递交信数据
        var letterRes = await api.getEthicsLetter(letterId);
        if (!letterRes.success) { alert('获取递交信数据失败'); return; }
        var l = letterRes.letter;

        // 获取模板
        var tmplRes = await api.getEthicsTemplates();
        var templates = tmplRes.templates || [];
        var tmpl = templates.find(function(t) { return t.is_default; }) || templates[0];
        if (!tmpl) {
            alert('请先上传递交信模板！点击「模板管理」上传公司模板。');
            return;
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

        var docData = {
            project_name: l.project_name || '',
            project_code: l.project_code || '',
            center_name: l.center_name || '',
            center_code: l.center_code || '',
            pi_name: l.pi_name || '',
            pi_phone: l.pi_phone || '',
            submission_date: subDate,
            submitter_name: l.submitter_name || '',
            submitter_phone: l.submitter_phone || '',
            submit_method: l.submit_method || '',
            tracking_number: l.tracking_number || '',
            ethics_committee: l.ethics_committee || l.contact_ethics || '',
            sponsor: l.sponsor || '',
            cro_name: l.cro_name || '',
            today_date: todayStr,
            doc_count: (l.items || []).length,
            notes: l.notes || '',
            docs: (l.items || []).map(function(it) {
                var vd = it.version_date || '';
                if (vd) {
                    var vp = vd.split('-');
                    if (vp.length === 3) vd = parseInt(vp[0]) + '年' + parseInt(vp[1]) + '月' + parseInt(vp[2]) + '日';
                }
                return {
                    doc_type: it.doc_type || '',
                    doc_name: it.doc_name || '',
                    version: it.version || '',
                    version_date: vd,
                    copies: it.copies || 1,
                    doc_notes: it.notes || ''
                };
            })
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
        var fileName = '递交信_' + (l.project_name || '') + '_' + (l.center_name || '') + '_' + (l.submission_date || '') + '.docx';
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
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;">
            <div>
                <div style="font-weight:600;">${window.escHtml(t.name)} ${t.is_default ? '<span style="background:#27ae60;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;">默认</span>' : ''}</div>
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
                        例如：将项目名称处改为 <code style="background:#e8e8e8;padding:1px 4px;border-radius:3px;">{project_name}</code></li>
                    <li>递交文件清单用循环：<code style="background:#e8e8e8;padding:1px 4px;border-radius:3px;">{#docs}...{/docs}</code></li>
                    <li>保存为 .docx 格式后上传</li>
                    <li>点击下方「占位符说明」查看所有可用占位符</li>
                </ol>
            </div>

            <div style="border:2px dashed #bbb;border-radius:8px;padding:20px;text-align:center;margin-bottom:16px;">
                <i class="fas fa-cloud-upload-alt" style="font-size:32px;color:#bbb;"></i>
                <p style="margin:8px 0;color:#666;">选择 .docx 模板文件上传</p>
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
    if (!name) { alert('请输入模板名称'); return; }

    try {
        window.showLoading();
        await api.uploadEthicsTemplate(file, name, desc);
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
                <code style="font-size:12px;">{#docs}{doc_type} | {doc_name} | {version} | {version_date} | {copies}份{/docs}</code>
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
