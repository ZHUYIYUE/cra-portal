// ========== 项目页面 + 项目详情 + 中心列表 + 新建/编辑项目 ==========

window.PROJECT_DOCUMENT_CATEGORIES = ['方案', '知情同意书', '药品管理手册', '中心实验室手册', '安全性文件', '其他'];
window.PROJECT_DOCUMENT_TRAINING_SCOPES = ['全体授权人员', 'PI/Sub-I', '药品相关人员', '实验室相关人员', '自定义'];

window.loadProjects = async function(content) {
    content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-folder-open"></i> 项目管理</div></div><p style="color:#999;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> 加载中...</p>`;
    
    try {
        const data = await api.getProjects();
        if (window.state) {
            window.state.projects = data.projects || [];
        }
        
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <i class="fas fa-folder-open"></i> 项目管理
                    <button class="btn btn-primary" onclick="window.showCreateProject()" style="margin-left:auto;">
                        <i class="fas fa-plus"></i> 新建项目
                    </button>
                </div>
            </div>
            <div class="projects-grid" id="projectsGrid"></div>
        `;

        const projects = window.state ? window.state.projects : [];
        if (projects.length === 0) {
            document.getElementById('projectsGrid').innerHTML = '<p style="color:#999;grid-column:1/-1;">暂无项目，点击上方按钮创建</p>';
        } else {
            document.getElementById('projectsGrid').innerHTML = projects.map(p => `
            <div class="project-card" onclick="window.viewProject('${p.id}')" style="background:white;border-radius:10px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h3 style="color:#2c3e50;margin-bottom:10px;font-size:1.1em;"><i class="fas fa-folder"></i> ${(p.name && p.name.trim()) ? window.escHtml(p.name) : '未命名项目'}</h3>
                    <button class="btn-icon" onclick="event.stopPropagation();window.confirmDeleteProject('${p.id}','${window.escHtml(p.name || '未命名')}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                </div>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">编号: ${window.escHtml(p.code || '未设置')}</p>
                <p style="color:#666;font-size:0.9em;margin:4px 0;">中心: ${p.center_count || 0} 个 | 待办: ${p.task_count || 0} 项</p>
                <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${window.escHtml(p.stage || '未知阶段')}</span>
                ${p.dbl_date ? `<br><small style="color:#e74c3c;">⚠️ DBL: ${window.escHtml(p.dbl_date)}</small>` : ''}
            </div>
        `).join('');
        }
    } catch (err) {
        console.error('loadProjects error:', err);
        content.innerHTML = `<div class="card"><div class="card-header"><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> 项目加载失败</div><p style="padding:20px;color:#e74c3c;">${err.message}</p><button class="btn btn-primary" onclick="window.loadProjects(content)">重试</button></div>`;
    }
};

window.viewProject = async function(projectId) {
    const [projectData, tasksData, centersData, findingsData, docsData, workItemsData, ethicsPackagesData, trainingData] = await Promise.all([
        api.getProject(projectId),
        api.getTasks({project_id: projectId}),
        api.getCenters(projectId),
        api.getFindings({project_id: projectId}),
        api.getProjectDocuments(projectId),
        api.getCenterWorkItems({project_id: projectId}),
        api.getEthicsSubmissionPackages({project_id: projectId}),
        api.getTrainingPlans({project_id: projectId})
    ]);
    if (!projectData.success) { alert('加载失败'); return; }

    const p = projectData;
    const tasks = tasksData.tasks || [];
    const centers = centersData.centers || [];
    const findings = findingsData.findings || [];
    const projectDocuments = docsData.documents || [];
    const riskSources = { tasks: tasks, findings: findings, workItems: workItemsData.items || [], ethicsPackages: ethicsPackagesData.packages || [], trainingPlans: trainingData.plans || [] };
    if (window.state) {
        window.state.currentProject = p;
    }

    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="project-detail-page">
            <div class="card project-title-card">
                <div class="card-header">
                    <button class="btn btn-text" onclick="window.navigateTo('projects')"><i class="fas fa-arrow-left"></i> 返回</button>
                    <span style="flex:1;text-align:center;font-size:1.2em;"><i class="fas fa-folder"></i> ${window.escHtml(p.name)}</span>
                    <button class="btn btn-primary" onclick="window.showEditProject('${projectId}')"><i class="fas fa-edit"></i> 编辑</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><label>项目编号</label><span>${window.escHtml(p.code || '未设置')}</span></div>
                    <div class="detail-item"><label>当前阶段</label><span>${window.escHtml(p.stage || '未设置')}</span></div>
                    <div class="detail-item"><label>中心数量</label><span>${centers.length} 家</span></div>
                    <div class="detail-item"><label>DBL日期</label><span style="${p.dbl_date ? 'color:#e74c3c;font-weight:bold;' : ''}">${p.dbl_date || '未设置'}</span></div>
                </div>
                ${p.notes ? `<div class="project-note"><strong>备注：</strong>${window.escHtml(p.notes).replace(/\n/g,'<br>')}</div>` : ''}
            </div>

            ${window.renderProjectCockpit(projectId, p, centers, tasks, findings, riskSources)}

            <div class="card project-documents-card" id="projectDocumentsCard">
                <div class="card-header">
                    <i class="fas fa-file-medical-alt"></i> 项目文件
                    <button class="btn btn-primary btn-sm" onclick="window.openProjectDocumentForm('${projectId}')" style="margin-left:auto;">
                        <i class="fas fa-plus"></i> 新增文件
                    </button>
                </div>
                <div id="projectDocuments"></div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-hospital"></i> 中心列表 (${centers.length} 家)
                    <button class="btn btn-primary btn-sm" onclick="window.showAddCenterModal('${projectId}')" style="margin-left:auto;">
                        <i class="fas fa-plus"></i> 添加中心
                    </button>
                </div>
                <div id="projectCenters"></div>
            </div>

            <div class="card">
                <div class="card-header">
                    <i class="fas fa-tasks"></i> 待办事项
                    <button class="btn btn-primary btn-sm" onclick="window.showAddTaskForProject('${projectId}')" style="margin-left:auto;">
                        <i class="fas fa-plus"></i> 新建
                    </button>
                </div>
                <div id="projectTasks"></div>
            </div>
        </div>
    `;

    const centersEl = document.getElementById('projectCenters');
    if (centersEl) centersEl.dataset.projectId = projectId;
    window.renderProjectDocuments(projectId, projectDocuments, docsData.missingTable);
    window.renderCenters(centers, projectId);
    window.renderProjectTasks(tasks);
};

window.renderProjectDocuments = function(projectId, documents, missingTable) {
    const el = document.getElementById('projectDocuments');
    if (!el) return;
    if (missingTable) {
        el.innerHTML = `
            <div class="project-doc-empty warning">
                <i class="fas fa-database"></i>
                <div>
                    <strong>项目文件库尚未启用</strong>
                    <span>请先在 Supabase SQL Editor 执行 <code>supabase/project_documents.sql</code>，再新增项目文件。</span>
                </div>
            </div>
        `;
        return;
    }
    if (!documents || documents.length === 0) {
        el.innerHTML = `
            <div class="project-doc-empty">
                <i class="fas fa-folder-open"></i>
                <div>
                    <strong>暂无项目文件</strong>
                    <span>项目组发布新版方案、知情、药品手册或中心实验室手册后，可先登记在这里。</span>
                </div>
            </div>
        `;
        return;
    }

    const sortDate = function(d) { return d.received_date || d.version_date || d.created_at || ''; };
    const sorted = documents.slice().sort(function(a, b) { return sortDate(a) < sortDate(b) ? 1 : -1; });
    el.innerHTML = `
        <div class="project-doc-table-wrap">
            <table class="project-doc-table">
                <thead>
                    <tr>
                        <th>文件</th>
                        <th>版本</th>
                        <th>接收日期</th>
                        <th>后续动作</th>
                        <th>备注</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(function(doc) {
                        const needsEthics = !!doc.requires_ethics_submission;
                        const needsTraining = !!doc.requires_training;
                        const trainingMeta = needsTraining
                            ? [doc.training_scope, doc.training_due_days ? doc.training_due_days + '天内' : ''].filter(Boolean).join(' · ')
                            : '';
                        return `
                            <tr>
                                <td>
                                    <div class="project-doc-name">${window.escHtml(doc.doc_name || '未命名文件')}</div>
                                    <div class="project-doc-sub">${window.escHtml(doc.doc_category || '未分类')}</div>
                                </td>
                                <td>
                                    <div>${window.escHtml(doc.version || '-')}</div>
                                    <small>${doc.version_date || ''}</small>
                                </td>
                                <td>${doc.received_date || '-'}</td>
                                <td>
                                    <div class="project-doc-tags">
                                        ${needsEthics ? '<span class="project-doc-tag ethics">需递交伦理</span>' : '<span class="project-doc-tag muted">无需伦理</span>'}
                                        ${needsTraining ? '<span class="project-doc-tag training">需培训</span>' : ''}
                                    </div>
                                    ${trainingMeta ? '<small class="project-doc-training">' + window.escHtml(trainingMeta) + '</small>' : ''}
                                </td>
                                <td><span class="project-doc-notes">${window.escHtml(doc.notes || '-')}</span></td>
                                <td class="project-doc-actions">
                                    <button class="btn btn-text btn-sm" onclick="window.openProjectDocumentForm('${projectId}', '${doc.id}')" title="编辑"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-text btn-sm" onclick="window.deleteProjectDocument('${projectId}', '${doc.id}')" title="删除"><i class="fas fa-trash" style="color:#e74c3c;"></i></button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
};

window.loadProjectDocuments = async function(projectId) {
    const data = await api.getProjectDocuments(projectId);
    window.renderProjectDocuments(projectId, data.documents || [], data.missingTable);
};

window.openProjectDocumentForm = async function(projectId, docId) {
    let doc = null;
    if (docId) {
        const res = await api.getProjectDocument(docId);
        if (!res.success) { alert(res.error || '项目文件加载失败'); return; }
        doc = res.document;
    }
    const categoryOptions = window.PROJECT_DOCUMENT_CATEGORIES.map(function(c) {
        return '<option value="' + c + '"' + (doc && doc.doc_category === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    const scopeOptions = window.PROJECT_DOCUMENT_TRAINING_SCOPES.map(function(s) {
        return '<option value="' + s + '"' + (doc && doc.training_scope === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-file-medical-alt"></i> ${docId ? '编辑项目文件' : '新增项目文件'}</h3></div>
        <form id="projectDocumentForm" onsubmit="return window.submitProjectDocumentForm(event, '${projectId}', '${docId || ''}')" class="project-doc-form">
            <div class="form-row">
                <div class="form-group">
                    <label>文件类型 *</label>
                    <select name="doc_category" required>${categoryOptions}</select>
                </div>
                <div class="form-group">
                    <label>接收日期</label>
                    <input type="date" name="received_date" value="${doc ? window.escAttr(doc.received_date || '') : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>文件名称 *</label>
                <input type="text" name="doc_name" required value="${doc ? window.escAttr(doc.doc_name || '') : ''}" placeholder="例：药品管理手册">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>版本号</label>
                    <input type="text" name="version" value="${doc ? window.escAttr(doc.version || '') : ''}" placeholder="例：V2.0">
                </div>
                <div class="form-group">
                    <label>版本日期</label>
                    <input type="date" name="version_date" value="${doc ? window.escAttr(doc.version_date || '') : ''}">
                </div>
                <div class="form-group">
                    <label>生效日期</label>
                    <input type="date" name="effective_date" value="${doc ? window.escAttr(doc.effective_date || '') : ''}">
                </div>
            </div>
            <div class="project-doc-checks">
                <label><input type="checkbox" name="requires_ethics_submission" ${doc && doc.requires_ethics_submission ? 'checked' : ''}> 需要递交伦理</label>
                <label><input type="checkbox" name="requires_training" ${doc && doc.requires_training ? 'checked' : ''} onchange="window.toggleProjectDocumentTrainingFields(this.checked)"> 需要授权研究人员培训</label>
            </div>
            <div id="projectDocTrainingFields" class="project-doc-training-fields" style="${doc && doc.requires_training ? '' : 'display:none;'}">
                <div class="form-row">
                    <div class="form-group">
                        <label>培训范围</label>
                        <select name="training_scope">${scopeOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>建议完成天数</label>
                        <input type="number" name="training_due_days" min="1" step="1" value="${doc && doc.training_due_days ? window.escAttr(doc.training_due_days) : ''}" placeholder="例：7">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3" placeholder="递交要求、培训注意事项等">${doc ? window.escAttr(doc.notes || '') : ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> 保存</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
};

window.toggleProjectDocumentTrainingFields = function(checked) {
    const el = document.getElementById('projectDocTrainingFields');
    if (el) el.style.display = checked ? '' : 'none';
};

window.submitProjectDocumentForm = async function(e, projectId, docId) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; }
    const requiresTraining = !!form.requires_training.checked;
    const data = {
        project_id: projectId,
        doc_category: form.doc_category.value,
        doc_name: form.doc_name.value.trim(),
        version: form.version.value.trim(),
        version_date: form.version_date.value,
        effective_date: form.effective_date.value,
        received_date: form.received_date.value,
        requires_ethics_submission: !!form.requires_ethics_submission.checked,
        requires_training: requiresTraining,
        training_scope: requiresTraining ? form.training_scope.value : '',
        training_due_days: requiresTraining ? (parseInt(form.training_due_days.value, 10) || null) : null,
        notes: form.notes.value
    };
    try {
        const res = docId ? await api.updateProjectDocument(docId, data) : await api.createProjectDocument(data);
        if (!res.success) {
            alert('保存失败：' + (res.error || '未知错误'));
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存'; }
            return false;
        }
        window.closeModal();
        window.showToast(docId ? '项目文件已更新' : '项目文件已新增');
        await window.loadProjectDocuments(projectId);
    } catch (err) {
        alert('保存失败：' + err.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存'; }
    }
    return false;
};

window.deleteProjectDocument = async function(projectId, docId) {
    if (!confirm('确定删除该项目文件？后续递交包和培训计划会引用项目文件，正式使用后建议谨慎删除。')) return;
    const res = await api.deleteProjectDocument(docId);
    if (!res.success) {
        alert('删除失败：' + (res.error || '未知错误'));
        return;
    }
    window.showToast('项目文件已删除');
    await window.loadProjectDocuments(projectId);
};

window.renderProjectCockpit = function(projectId, p, centers, tasks, findings, riskSources) {
    const today = new Date().toISOString().split('T')[0];
    const openTasks = tasks.filter(t => !t.done);
    const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today);
    const activeFindings = findings.filter(f => !['Resolved', 'Closed'].includes(f.status));
    const overdueFindings = activeFindings.filter(f => f.due_date && f.due_date < today);
    const criticalFindings = activeFindings.filter(f => f.severity === 'Critical');
    const centerMilestones = centers.reduce((acc, c) => {
        const ms = Array.isArray(c.milestones) ? c.milestones : [];
        acc.total += ms.length;
        acc.done += ms.filter(m => m.done).length;
        acc.overdue += ms.filter(m => !m.done && m.date && m.date < today).length;
        return acc;
    }, { total: 0, done: 0, overdue: 0 });
    const milestonePct = centerMilestones.total ? Math.round(centerMilestones.done / centerMilestones.total * 100) : 0;

    let dblLabel = '未设置';
    let dblTone = 'warning';
    if (p.dbl_date) {
        const days = Math.ceil((new Date(p.dbl_date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
        dblLabel = days < 0 ? '已过期' : `${days}天`;
        dblTone = days < 0 || days <= 14 ? 'danger' : days <= 45 ? 'warning' : '';
    }

    const riskTone = overdueTasks.length || overdueFindings.length || criticalFindings.length || dblTone === 'danger'
        ? 'danger'
        : (openTasks.length || activeFindings.length || centerMilestones.overdue || dblTone === 'warning' ? 'warning' : 'ok');
    const statusText = riskTone === 'danger' ? '项目需要优先处理' : riskTone === 'warning' ? '项目有事项待跟进' : '项目运行平稳';
    const metric = (num, label, tone) => `<div class="pc-metric ${tone || ''}"><strong>${num}</strong><span>${label}</span></div>`;

    const riskCenters = centers.map(c => {
        const ms = Array.isArray(c.milestones) ? c.milestones : [];
        const done = ms.filter(m => m.done).length;
        const pct = ms.length ? Math.round(done / ms.length * 100) : 0;
        const overdueMs = ms.filter(m => !m.done && m.date && m.date < today).length;
        const risk = window.getCenterRiskSummary
            ? window.getCenterRiskSummary(c.id, riskSources || { tasks: tasks, findings: findings }, today)
            : { score: (c.open_finding_count || 0) * 4 + (c.task_count || 0), level: 'medium', label: '需关注', reasons: [] };
        if (overdueMs) { risk.score += overdueMs * 3; risk.reasons.push(overdueMs + '个逾期里程碑'); }
        if (risk.score >= 5) { risk.level = 'high'; risk.label = '高风险'; }
        else if (risk.score >= 2) { risk.level = 'medium'; risk.label = '中风险'; }
        else { risk.level = 'low'; risk.label = '低风险'; }
        return { center: c, pct: pct, overdueMs: overdueMs, risk: risk };
    }).filter(item => item.risk.score > 0).sort((a, b) => b.risk.score - a.risk.score).slice(0, 4);

    const suggestions = [];
    if (!centers.length) suggestions.push(['fa-hospital', '先添加中心，项目看板才有可跟踪对象']);
    if (!p.dbl_date) suggestions.push(['fa-calendar-plus', '补充 DBL 日期，便于自动判断项目时间风险']);
    if (overdueTasks.length) suggestions.push(['fa-clock', `优先处理 ${overdueTasks.length} 项逾期待办`]);
    if (overdueFindings.length) suggestions.push(['fa-search', `跟进 ${overdueFindings.length} 个逾期监查问题`]);
    if (criticalFindings.length) suggestions.push(['fa-exclamation-circle', `确认 ${criticalFindings.length} 个 Critical 问题的整改路径`]);
    if (centerMilestones.overdue) suggestions.push(['fa-flag-checkered', `检查 ${centerMilestones.overdue} 个逾期中心里程碑`]);
    if (!suggestions.length) suggestions.push(['fa-check-circle', '暂无明显风险，可以继续按计划推进']);

    return `
        <section class="project-cockpit">
            <div class="pc-head">
                <div>
                    <div class="pc-eyebrow">项目驾驶舱</div>
                    <h3><i class="fas fa-chart-line"></i> ${window.escHtml(p.code || p.name || '项目')}</h3>
                </div>
                <div class="pc-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.showAddTaskForProject('${projectId}')"><i class="fas fa-plus"></i> 新建待办</button>
                    <button class="btn btn-sm btn-outline" onclick="window.openProjectFindingForm('${projectId}')"><i class="fas fa-search-plus"></i> 录入问题</button>
                    <button class="btn btn-sm btn-outline" onclick="window.focusProjectDocuments()"><i class="fas fa-file-medical-alt"></i> 项目文件</button>
                    <button class="btn btn-sm btn-outline" onclick="window.showAddCenterModal('${projectId}')"><i class="fas fa-hospital"></i> 添加中心</button>
                    <button class="btn btn-sm btn-outline" onclick="window.focusProjectFindings('${projectId}')"><i class="fas fa-filter"></i> 查看问题</button>
                </div>
            </div>
            <div class="pc-status ${riskTone}">
                <div>
                    <strong>${statusText}</strong>
                    <span>${centers.length} 家中心 · ${openTasks.length} 项进行中待办 · ${activeFindings.length} 个未关闭问题 · 里程碑 ${milestonePct}%</span>
                </div>
                <div class="pc-progress"><span style="width:${milestonePct}%"></span></div>
            </div>
            <div class="pc-metrics">
                ${metric(openTasks.length, '进行中待办', openTasks.length ? 'warning' : '')}
                ${metric(overdueTasks.length, '逾期待办', overdueTasks.length ? 'danger' : '')}
                ${metric(activeFindings.length, '未关闭问题', activeFindings.length ? 'danger' : '')}
                ${metric(overdueFindings.length, '逾期问题', overdueFindings.length ? 'danger' : '')}
                ${metric(criticalFindings.length, 'Critical问题', criticalFindings.length ? 'danger' : '')}
                ${metric(dblLabel, '距离DBL', dblTone)}
            </div>
            <div class="pc-grid">
                <div class="pc-panel">
                    <div class="pc-panel-title"><i class="fas fa-hospital-user"></i> 重点中心</div>
                    ${riskCenters.length ? riskCenters.map(item => `
                        <button class="pc-risk-row" onclick="window.openCenterDetail('${item.center.id}')">
                            <span><strong>${window.escHtml(item.center.code || '')} ${window.escHtml(item.center.name || '')}</strong><small>${window.escHtml(item.risk.reasons.slice(0, 2).join(' · '))}${item.overdueMs ? ' · ' + item.overdueMs + '个逾期里程碑' : ''}</small></span>
                            <em class="pc-risk-level ${item.risk.level}">${item.risk.label}</em>
                        </button>
                    `).join('') : '<div class="pc-empty">暂无高风险中心</div>'}
                </div>
                <div class="pc-panel">
                    <div class="pc-panel-title"><i class="fas fa-list-check"></i> 下一步建议</div>
                    <div class="pc-suggestions">
                        ${suggestions.slice(0, 5).map(s => `<div class="pc-suggestion"><i class="fas ${s[0]}"></i><span>${s[1]}</span></div>`).join('')}
                    </div>
                </div>
            </div>
        </section>
    `;
};

window.focusProjectDocuments = function() {
    const el = document.getElementById('projectDocumentsCard');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('project-documents-card-focus');
    setTimeout(function() { el.classList.remove('project-documents-card-focus'); }, 1600);
};

window.openProjectFindingForm = async function(projectId) {
    await window.navigateTo('findings');
    window.openNewFindingForm({ project_id: projectId });
};

window.focusProjectFindings = async function(projectId) {
    await window.navigateTo('findings');
    const filter = document.getElementById('filterProject');
    if (filter) {
        filter.value = projectId;
        window.onFilterProjectChange();
        window.renderFindingsList();
    }
};
window.loadProjectCenters = async function(projectId) {
    try {
        const data = await api.getCenters(projectId);
        if (data.success) {
            const el = document.getElementById('projectCenters');
            if (el) el.dataset.projectId = projectId;
            window.renderCenters(data.centers, projectId);
        }
    } catch (err) {
        console.error('加载中心失败:', err);
    }
};

window.renderCenters = function(centers, projectId) {
    const el = document.getElementById('projectCenters');
    if (!el) return;
    
    if (!centers || centers.length === 0) {
        el.innerHTML = '<p style="color:#999;padding:10px;">暂无中心信息</p>';
        return;
    }
    
    el.innerHTML = centers.map(c => {
        const ms = Array.isArray(c.milestones) ? c.milestones : [];
        const done = ms.filter(m => m.done).length;
        const total = ms.length;
        const pct = total > 0 ? Math.round(done / total * 100) : 0;
        
        // 状态色条 — 100%绿 ≥50%橙 有Open问题红 其他蓝
        const hasOpenIssue = (c.open_finding_count || 0) > 0;
        const borderColor = pct === 100 ? '#27ae60' : hasOpenIssue ? '#e74c3c' : pct >= 50 ? '#f39c12' : '#3498db';
        
        // 任务/问题状态
        const taskCount = c.task_count || 0;
        const openFindings = c.open_finding_count || 0;
        const findingCount = c.finding_count || 0;
        
        // PI 信息
        const piName = c.pi_name || c.pi || '';
        const dept = c.department || '';
        
        return `
        <div class="center-card" style="border-left:4px solid ${borderColor};">
            <div class="center-card-header" onclick="window.toggleCenterDetail('${c.id}')">
                <div class="center-card-title">
                    <strong class="center-link" onclick="event.stopPropagation();window.openCenterDetail('${c.id}')">${window.escHtml(c.code)} ${window.escHtml(c.name)}</strong>
                    ${piName || dept ? `<span class="center-meta">${piName ? '<i class="fas fa-user-md"></i> '+window.escHtml(piName) : ''}${piName && dept ? ' · ' : ''}${dept ? window.escHtml(dept) : ''}</span>` : ''}
                </div>
                <div class="center-card-right">
                    ${total > 0 ? `<span class="center-pct ${pct === 100 ? 'pct-green' : pct >= 50 ? 'pct-orange' : 'pct-blue'}">${pct}%</span>` : '<span class="center-pct pct-gray">—</span>'}
                    <i class="fas fa-chevron-down" id="icon-${c.id}" style="color:#ccc;font-size:0.8em;transition:transform .2s;"></i>
                </div>
            </div>
            
            <div class="center-card-stats">
                <div class="cstat ${taskCount > 0 ? 'cstat-warn' : ''}">
                    <span class="cstat-icon">📋</span>
                    <span class="cstat-num">${taskCount}</span>
                    <span class="cstat-label">待办</span>
                </div>
                <div class="cstat ${openFindings > 0 ? 'cstat-danger' : ''}">
                    <span class="cstat-icon">⚠️</span>
                    <span class="cstat-num">${openFindings}</span>
                    <span class="cstat-label">问题</span>
                </div>
                <div class="cstat">
                    <span class="cstat-icon">✅</span>
                    <span class="cstat-num">${done}</span>
                    <span class="cstat-label">/${total} 里程碑</span>
                </div>
            </div>
            
            <div id="detail-${c.id}" class="center-card-detail">
                ${total > 0 ? `
                <div class="milestone-list">
                    ${ms.map((m, i) => {
                        const isOverdue = !m.done && m.date && new Date(m.date) < new Date();
                        const dateStr = m.date ? m.date.slice(5) : '';
                        return `
                        <div class="milestone-item ${m.done ? 'ms-done' : isOverdue ? 'ms-overdue' : ''}" >
                            <input type="checkbox" ${m.done ? 'checked' : ''} 
                                onclick="event.stopPropagation(); window.toggleMilestone('${c.id}', ${i}, this.checked)" />
                            <span class="ms-name">${window.escHtml(m.name)}</span>
                            <span class="ms-date ${isOverdue ? 'ms-date-overdue' : ''}">${dateStr}${isOverdue ? ' ⚠️' : ''}${m.done && m.actual_date ? ' ✅'+m.actual_date.slice(5) : ''}</span>
                        </div>`;
                    }).join('')}
                </div>` : '<div class="ms-empty"><i class="fas fa-inbox"></i> 暂无里程碑</div>'}
            </div>
        </div>`;
    }).join('');
};

window.toggleCenterDetail = function(centerId) {
    const el = document.getElementById('detail-' + centerId);
    const icon = document.getElementById('icon-' + centerId);
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (icon) icon.className = 'fas fa-chevron-up';
    } else {
        el.style.display = 'none';
        if (icon) icon.className = 'fas fa-chevron-down';
    }
};

window.toggleMilestone = async function(centerId, idx, done) {
    try {
        const data = await api.updateMilestone(centerId, idx, {done: done});
        if (data.success) {
            const currentProjectId = document.getElementById('projectCenters')?.dataset?.projectId;
            if (currentProjectId) window.loadProjectCenters(currentProjectId);
        }
    } catch(e) {
        console.error('更新里程碑失败:', e);
    }
};

window.showAddCenterModal = function(projectId) {
    const code = prompt('中心编号（如：01）:');
    if (!code) return;
    const name = prompt('中心名称:');
    if (!name) return;
    
    api.createCenter({project_id: projectId, code: code, name: name}).then(function(data) {
        if (data.success) {
            window.showToast('中心添加成功');
            window.loadProjectCenters(projectId);
        }
    });
};

window.deleteCenter = async function(centerId, projectId) {
    if (!confirm('确定删除该中心？')) return;
    try {
        const data = await api.deleteCenter(centerId);
        if (data.success) {
            window.showToast('已删除');
            window.loadProjectCenters(projectId);
        }
    } catch (err) {
        console.error(err);
    }
};

// ========== 新建项目 ==========

window.showCreateProject = function() {
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-plus-circle"></i> 新建项目</h3></div>
        <form onsubmit="return window.submitCreateProject(event)">
            <div class="form-group">
                <label>项目名称 *</label>
                <input type="text" name="name" required placeholder="例：JMKX003142-H201" autofocus>
            </div>
            <div class="form-group">
                <label>项目全称</label>
                <textarea name="full_name" rows="2" placeholder="例：一项评价注射用JMKX003142治疗心力衰竭引起的体液潴留有效性和安全性的多中心、随机、双盲、安慰剂对照的Ⅱ期临床试验" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>项目编号/简称</label>
                    <input type="text" name="code" placeholder="例：3142iv">
                </div>
                <div class="form-group">
                    <label>临床试验通知书编号</label>
                    <input type="text" name="approval_number" placeholder="例：2024LP00163">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>申办方</label>
                    <input type="text" name="sponsor" placeholder="例：浙江杭煜制药有限公司">
                </div>
                <div class="form-group">
                    <label>CRO名称</label>
                    <input type="text" name="cro_name" placeholder="例：上海济煜医药科技股份有限公司">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>负责中心数</label>
                    <input type="number" name="center_count" value="5" min="0">
                </div>
                <div class="form-group">
                    <label>当前阶段</label>
                    <select name="stage">
                        <option value="进行中">进行中</option>
                        <option value="SSU阶段">SSU阶段</option>
                        <option value="关中心准备">关中心准备</option>
                        <option value="已结束">已结束</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>DBL日期（数据库锁定）</label>
                <input type="date" name="dbl_date">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3" placeholder="关键节点、注意事项等..."></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> 创建</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
};

window.submitCreateProject = async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        full_name: form.full_name.value,
        code: form.code.value,
        approval_number: form.approval_number.value,
        sponsor: form.sponsor.value,
        cro_name: form.cro_name.value,
        stage: form.stage.value,
        dbl_date: form.dbl_date.value,
        notes: form.notes.value
    };
    
    const result = await api.createProject(data);
    
    if (result.success) {
        window.closeModal();
        alert('✅ 项目创建成功！');
        window.navigateTo('projects');
    } else {
        alert('❌ 创建失败：' + (result.error || '未知错误'));
    }
};

// ========== 编辑项目 ==========

window.showEditProject = function(projectId) {
    const p = window.state && window.state.currentProject;
    if (!p || p.id !== projectId) {
        api.getProject(projectId).then(function(d) {
            if (window.state) {
                window.state.currentProject = d;
            }
            window.renderEditForm(d);
        });
        return;
    }
    window.renderEditForm(p);
};

window.renderEditForm = function(p) {
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-edit"></i> 编辑项目</h3></div>
        <form onsubmit="return window.submitEditProject(event, '${p.id}')">
            <div class="form-group">
                <label>项目名称 *</label>
                <input type="text" name="name" required value="${window.escAttr(p.name)}">
            </div>
            <div class="form-group">
                <label>项目全称</label>
                <textarea name="full_name" rows="2" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;font-family:inherit;">${window.escAttr(p.full_name || '')}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>项目编号/简称</label>
                    <input type="text" name="code" value="${window.escAttr(p.code || '')}">
                </div>
                <div class="form-group">
                    <label>临床试验通知书编号</label>
                    <input type="text" name="approval_number" value="${window.escAttr(p.approval_number || '')}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>申办方</label>
                    <input type="text" name="sponsor" value="${window.escAttr(p.sponsor || '')}">
                </div>
                <div class="form-group">
                    <label>CRO名称</label>
                    <input type="text" name="cro_name" value="${window.escAttr(p.cro_name || '')}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>负责中心数</label>
                    <input type="number" name="center_count" value="${p.center_count || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>当前阶段</label>
                    <select name="stage">
                        <option value="进行中" ${p.stage==='进行中'?'selected':''}>进行中</option>
                        <option value="SSU阶段" ${p.stage==='SSU阶段'?'selected':''}>SSU阶段</option>
                        <option value="关中心准备" ${p.stage==='关中心准备'?'selected':''}>关中心准备</option>
                        <option value="已结束" ${p.stage==='已结束'?'selected':''}>已结束</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>DBL日期</label>
                <input type="date" name="dbl_date" value="${window.escAttr(p.dbl_date || '')}">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea name="notes" rows="3">${window.escAttr(p.notes || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-success"><i class="fas fa-save"></i> 保存</button>
                <button type="button" class="btn" onclick="window.closeModal()">取消</button>
            </div>
        </form>
    `);
};

window.submitEditProject = async function(e, projectId) {
    e.preventDefault();
    const form = e.target;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...'; }

    const data = {
        name: form.name.value,
        full_name: form.full_name ? form.full_name.value : '',
        code: form.code.value,
        approval_number: form.approval_number.value,
        sponsor: form.sponsor.value,
        cro_name: form.cro_name ? form.cro_name.value : '',
        stage: form.stage.value,
        dbl_date: form.dbl_date.value,
        notes: form.notes.value
    };

    try {
        const result = await api.updateProject(projectId, data);

        if (result.success) {
            window.closeModal();
            alert('✅ 保存成功！');
            window.viewProject(projectId);
        } else {
            alert('❌ 保存失败：' + (result.error || '未知错误'));
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存'; }
        }
    } catch(err) {
        console.error('[submitEditProject] error:', err);
        alert('❌ 保存出错：' + err.message);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存'; }
    }
};

// ========== 删除项目确认 ==========

window.confirmDeleteProject = function(id, name) {
    if (confirm(`确定要删除项目「${name}」吗？\n关联的待办事项也会被删除，此操作不可恢复。`)) {
        api.deleteProject(id).then(function(result) {
            if (result.success) {
                alert('✅ 已删除');
                window.navigateTo('projects');
            } else {
                alert('❌ 删除失败');
            }
        });
    }
};

// ========== 加载项目任务 ==========

window.loadProjectTasks = async function(projectId) {
    const container = document.getElementById('projectTasks');
    if (!container) return;

    const data = await api.getTasks({project_id: projectId});
    window.renderProjectTasks(data.tasks || []);
};

window.renderProjectTasks = function(tasks) {
    const container = document.getElementById('projectTasks');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p style="color:#999;">暂无待办事项</p>';
        return;
    }

    const sorted = tasks.slice().sort((a, b) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        const ad = a.due_date || '9999-12-31';
        const bd = b.due_date || '9999-12-31';
        if (ad !== bd) return ad < bd ? -1 : 1;
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
    });

    container.innerHTML = sorted.map(t => {
        const taskStatus = t.task_status || 'pending';
        const isWaitingCrc = taskStatus === 'waiting_crc' && !t.done;
        return `
        <div class="task-item ${t.done ? 'task-done' : ''}" id="task-${t.id}" data-status="${taskStatus}">
            <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''} onchange="window.toggleTaskDone('${t.id}', ${!t.done})">
            <div class="task-content" onclick="window.viewTaskDetail('${t.id}')">
                <h4 style="${t.done ? 'text-decoration:line-through;color:#999;' : ''}">${window.escHtml(t.title)}</h4>
                <p class="task-meta">
                    ${isWaitingCrc ? `<span style="background:#e67e22;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px;">跟进CRC</span>` : ''}
                    ${t.center_name ? `<i class="fas fa-hospital"></i> ${window.escHtml(t.center_name)} ·` : ''}
                    <span class="ability-tag ability-${t.ability_type || 'execution'}">${window.ABILITY_ICONS[t.ability_type || 'execution']} ${window.ABILITY_LABELS[t.ability_type || 'execution']}</span> ·
                    ${t.due_date ? `<i class="far fa-calendar"></i> ${t.due_date}` : ''}
                    ${t.priority ? `<span class="task-priority priority-${t.priority}">${{high:'高',medium:'中',low:'低'}[t.priority]||t.priority}</span>` : ''}
                </p>
            </div>
            <button class="btn-icon" onclick="event.stopPropagation();window.showEditTask('${t.id}')" title="编辑"><i class="fas fa-edit" style="color:#3498db;"></i></button>
            <button class="btn-icon" onclick="event.stopPropagation();window.deleteTaskById('${t.id}')" title="删除"><i class="fas fa-trash-alt" style="color:#ccc;"></i></button>
        </div>
    `}).join('');
};
