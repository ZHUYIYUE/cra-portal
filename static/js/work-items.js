// ========== 中心工作事项：完整工作闭环，而非孤立待办 ==========

window.WORK_ITEM_TYPES = ['协议启动', '伦理递交', '数据清理', '财务结算', '中心启动资料', '入组/预筛', '访视跟进', '文件管理', '培训', '其他'];
window.WORK_ITEM_STAGES = ['SSU', '启动', '入组', '随访', '数据清理', '关闭/结算', '其他'];
window.WORK_ITEM_STATUSES = ['进行中', '等待外部反馈', '受阻', '已完成'];
window.WORK_ITEM_WAITING_FOR = ['CRC', 'PI/研究者', 'PM', '项目组', '机构', '伦理委员会', 'DM', '其他'];

window.WORK_ITEM_TEMPLATES = {
    '': [],
    '尾款结算': ['向CRC索取机构实际发生的监查费和患者补贴明细', '核算尾款并整理结算资料', '发送PM审核', '根据审核意见完成结算'],
    '方案偏离递交伦理': ['寄送递交信及递交文件至中心', '等待PI签署递交信及方案偏离报告', '确认CRC递交伦理', '收集伦理签收及审查结果'],
    'SSU协议初稿': ['收集中心检查费及协议签署流程', '收集中心协议模板并确认条款审核路径', '撰写协议初稿', '发送PM/项目组审核', '发送机构审核', '协议定稿并启动签署'],
    '正常值范围配置': ['CRC收集检查项正常值范围', 'CRC整理正常值范围配置表', '研究者或检验科签字', '发送DM配置并确认完成'],
    '数据清理': ['CRC完成未录入表单及质疑答复', 'CRA完成剩余SDV', '确认全部质疑已解决', '确认数据录入与SDV完成'],
    '预筛选': ['CRC收集脱敏既往就诊信息', '发送项目组进行预筛审核', '确认项目组预筛结论', '中心安排知情同意与筛选']
};

window.workItemToday = function() { return new Date().toISOString().split('T')[0]; };
window.workItemTone = function(item) {
    var today = window.workItemToday();
    if (item.status === '已完成') return 'ok';
    if (item.status === '受阻') return 'danger';
    if ((item.due_date && item.due_date < today) || (item.follow_up_date && item.follow_up_date < today)) return 'danger';
    if (item.due_date && item.due_date <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]) return 'warning';
    return item.status === '等待外部反馈' ? 'waiting' : '';
};
window.getWorkItemNextStep = function(item) {
    var step = (item.steps || []).find(function(s) { return !s.done; });
    return step ? step.title : (item.next_action || '补充下一步动作');
};
window.getWorkItemRiskLabel = function(item) {
    var tone = window.workItemTone(item);
    if (tone === 'danger') return item.follow_up_date && item.follow_up_date < window.workItemToday() ? '催办已到期' : '临期/已逾期';
    if (tone === 'warning') return '本周关键节点';
    if (item.status === '等待外部反馈') return '等待 ' + (item.waiting_for || '外部反馈');
    return '正常推进';
};

window.loadWorkItems = async function(content) {
    var data = await api.getCenterWorkItems();
    var items = data.items || [];
    if (data.missingTable) {
        content.innerHTML = `<div class="card"><div class="work-items-empty warning"><i class="fas fa-database"></i><div><strong>中心工作事项尚未启用</strong><span>请先在 Supabase SQL Editor 执行 <code>supabase/center_work_items.sql</code>，即可建立事项、步骤和催办记录。</span></div></div></div>`;
        return;
    }
    var active = items.filter(function(x) { return x.status !== '已完成'; });
    var risk = active.filter(function(x) { return window.workItemTone(x) === 'danger'; });
    var waiting = active.filter(function(x) { return x.status === '等待外部反馈'; });
    var rows = items.length ? items.map(window.renderWorkItemCard).join('') : '<div class="work-items-empty"><i class="fas fa-list-check"></i><div><strong>还没有中心工作事项</strong><span>从协议、伦理、数据清理或尾款结算等一件完整工作开始记录。</span></div></div>';
    content.innerHTML = `
        <section class="work-items-shell">
            <div class="work-items-head"><div><h2><i class="fas fa-list-check"></i> 中心工作事项</h2><p>一件工作、一组步骤、一个明确的下一步与催办日期；当前未完成步骤会自动进入待办。</p></div><button class="btn btn-primary" onclick="window.openWorkItemForm()"><i class="fas fa-plus"></i> 新建中心事项</button></div>
            <div class="work-items-summary"><div><strong>${active.length}</strong><span>进行中</span></div><div class="danger"><strong>${risk.length}</strong><span>催办/逾期</span></div><div class="warning"><strong>${waiting.length}</strong><span>等待外部反馈</span></div></div>
            <div class="work-items-list">${rows}</div>
        </section>`;
};

window.renderWorkItemCard = function(item) {
    var tone = window.workItemTone(item);
    var progress = item.total_steps ? Math.round(item.completed_steps / item.total_steps * 100) : 0;
    return `<article class="work-item-card ${tone}" onclick="window.viewWorkItem('${item.id}')">
        <div class="work-item-card-top"><div><span class="work-item-type">${window.escHtml(item.item_type || '其他')}</span><h3>${window.escHtml(item.title || '未命名事项')}</h3><p>${window.escHtml(item.project_name || '')} · ${window.escHtml(item.center_name || '')} ${item.project_stage ? '· ' + window.escHtml(item.project_stage) : ''}</p></div><span class="work-item-status ${tone}">${window.escHtml(item.status || '进行中')}</span></div>
        <div class="work-item-next"><i class="fas fa-arrow-right"></i><span><strong>下一步：</strong>${window.escHtml(window.getWorkItemNextStep(item))}</span></div>
        <div class="work-item-meta"><span class="${tone === 'danger' ? 'danger-text' : ''}"><i class="fas fa-bell"></i> ${item.follow_up_date ? '催办 ' + item.follow_up_date : window.getWorkItemRiskLabel(item)}</span><span>${item.waiting_for ? '<i class="fas fa-hourglass-half"></i> 等 ' + window.escHtml(item.waiting_for) : '<i class="fas fa-list-ol"></i> ' + item.completed_steps + '/' + item.total_steps + ' 步骤'}</span><span>${item.due_date ? '<i class="far fa-calendar"></i> ' + item.due_date : ''}</span></div>
        ${item.total_steps ? `<div class="work-item-progress"><span style="width:${progress}%"></span></div>` : ''}
    </article>`;
};

window.openWorkItemForm = async function(editId, presetCenterId) {
    var edit = null;
    if (editId) { var res = await api.getCenterWorkItem(editId); if (!res.success) { alert(res.error || '加载失败'); return; } edit = res.item; }
    var projData = await api.getProjects();
    window._workItemSteps = edit ? (edit.steps || []).map(function(s) { return Object.assign({}, s); }) : [];
    var projectOptions = (projData.projects || []).map(function(p) { return `<option value="${p.id}" ${edit && edit.project_id === p.id ? 'selected' : ''}>${window.escHtml(p.name || p.code || '未命名项目')}</option>`; }).join('');
    window.openModal(`
        <div class="modal-header"><h3><i class="fas fa-list-check"></i> ${edit ? '编辑中心工作事项' : '新建中心工作事项'}</h3></div>
        <form id="workItemForm" class="work-item-form" onsubmit="return window.submitWorkItem(event, '${editId || ''}')">
            <div class="form-row"><div class="form-group"><label>项目 *</label><select id="wi_project" required onchange="window.onWorkItemProjectChange()"><option value="">请选择</option>${projectOptions}</select></div><div class="form-group"><label>中心 *</label><select id="wi_center" required><option value="">请先选择项目</option></select></div></div>
            <div class="form-row"><div class="form-group"><label>场景模板</label><select id="wi_template" onchange="window.applyWorkItemTemplate()"><option value="">不使用模板</option>${Object.keys(window.WORK_ITEM_TEMPLATES).filter(Boolean).map(function(x) { return '<option value="' + x + '">' + x + '</option>'; }).join('')}</select></div><div class="form-group"><label>事项类型 *</label><select id="wi_type">${window.WORK_ITEM_TYPES.map(function(x) { return '<option value="' + x + '" ' + (edit && edit.item_type === x ? 'selected' : '') + '>' + x + '</option>'; }).join('')}</select></div></div>
            <div class="form-group"><label>事项名称 *</label><input id="wi_title" required value="${edit ? window.escAttr(edit.title || '') : ''}" placeholder="例：某中心方案偏离递交伦理"></div>
            <div class="form-row"><div class="form-group"><label>项目阶段</label><select id="wi_stage">${window.WORK_ITEM_STAGES.map(function(x) { return '<option value="' + x + '" ' + (edit && edit.project_stage === x ? 'selected' : '') + '>' + x + '</option>'; }).join('')}</select></div><div class="form-group"><label>状态</label><select id="wi_status">${window.WORK_ITEM_STATUSES.map(function(x) { return '<option value="' + x + '" ' + ((edit ? edit.status : '进行中') === x ? 'selected' : '') + '>' + x + '</option>'; }).join('')}</select></div><div class="form-group"><label>优先级</label><select id="wi_priority">${[['high','高'],['medium','中'],['low','低']].map(function(x) { return '<option value="' + x[0] + '" ' + ((edit ? edit.priority : 'medium') === x[0] ? 'selected' : '') + '>' + x[1] + '</option>'; }).join('')}</select></div></div>
            <div class="form-row"><div class="form-group"><label>等待对象</label><select id="wi_waiting"><option value="">当前不等待</option>${window.WORK_ITEM_WAITING_FOR.map(function(x) { return '<option value="' + x + '" ' + (edit && edit.waiting_for === x ? 'selected' : '') + '>' + x + '</option>'; }).join('')}</select></div><div class="form-group"><label>下次催办日期</label><input type="date" id="wi_followup" value="${edit ? (edit.follow_up_date || '') : ''}"></div><div class="form-group"><label>最终节点</label><input type="date" id="wi_due" value="${edit ? (edit.due_date || '') : ''}"></div></div>
            <div class="form-group"><label>当前下一步 *</label><input id="wi_next_action" required value="${edit ? window.escAttr(edit.next_action || '') : ''}" placeholder="例：跟进CRC发送检查费明细"></div>
            <div class="work-item-steps"><div class="work-item-steps-head"><strong>推进步骤</strong><button type="button" class="btn btn-sm btn-outline" onclick="window.addWorkItemStep()"><i class="fas fa-plus"></i> 添加步骤</button></div><div id="wi_steps"></div></div>
            <div class="form-group"><label>${edit ? '本次推进记录' : '创建说明'}</label><textarea id="wi_activity" rows="2" placeholder="例：今日已向CRC发送催办信息，约定周五前反馈"></textarea></div>
            <div class="form-group"><label>备注</label><textarea id="wi_notes" rows="2">${edit ? window.escAttr(edit.notes || '') : ''}</textarea></div>
            <div class="form-actions"><button class="btn btn-success" type="submit"><i class="fas fa-save"></i> 保存事项</button><button class="btn" type="button" onclick="window.closeModal()">取消</button></div>
        </form>`);
    if (edit && edit.project_id) await window.onWorkItemProjectChange(edit.center_id);
    else if (presetCenterId) { var center = await api.getCenter(presetCenterId); if (center.success) { document.getElementById('wi_project').value = center.center.project_id; await window.onWorkItemProjectChange(presetCenterId); } }
    window.renderWorkItemSteps();
};

window.onWorkItemProjectChange = async function(selectedCenterId) {
    var projectId = document.getElementById('wi_project').value, sel = document.getElementById('wi_center');
    if (!projectId) { sel.innerHTML = '<option value="">请先选择项目</option>'; return; }
    var data = await api.getCenters(projectId);
    sel.innerHTML = '<option value="">请选择</option>' + (data.centers || []).map(function(c) { return `<option value="${c.id}" ${selectedCenterId === c.id ? 'selected' : ''}>${window.escHtml(((c.code || '') + ' ' + (c.name || '')).trim())}</option>`; }).join('');
};
window.applyWorkItemTemplate = function() {
    var name = document.getElementById('wi_template').value, steps = window.WORK_ITEM_TEMPLATES[name] || [];
    if (!name) return;
    document.getElementById('wi_title').value = name;
    var typeMap = { '尾款结算': '财务结算', '方案偏离递交伦理': '伦理递交', 'SSU协议初稿': '协议启动', '正常值范围配置': '中心启动资料', '数据清理': '数据清理', '预筛选': '入组/预筛' };
    document.getElementById('wi_type').value = typeMap[name] || '其他';
    window._workItemSteps = steps.map(function(title) { return { title: title, done: false, due_date: '', waiting_for: '' }; });
    document.getElementById('wi_next_action').value = steps[0] || '';
    window.renderWorkItemSteps();
};
window.renderWorkItemSteps = function() {
    var el = document.getElementById('wi_steps'); if (!el) return;
    el.innerHTML = (window._workItemSteps || []).map(function(step, index) { return `<div class="work-item-step-edit"><input type="checkbox" ${step.done ? 'checked' : ''} onchange="window._workItemSteps[${index}].done=this.checked"><input value="${window.escAttr(step.title || '')}" placeholder="步骤内容" oninput="window._workItemSteps[${index}].title=this.value"><input type="date" value="${step.due_date || ''}" onchange="window._workItemSteps[${index}].due_date=this.value"><button type="button" class="btn-icon" onclick="window._workItemSteps.splice(${index},1);window.renderWorkItemSteps()"><i class="fas fa-times"></i></button></div>`; }).join('') || '<div class="work-item-step-empty">可直接保存，或添加能帮助推进的子步骤。</div>';
};
window.addWorkItemStep = function() { window._workItemSteps.push({ title: '', done: false, due_date: '', waiting_for: '' }); window.renderWorkItemSteps(); };
window.collectWorkItemData = function() { return { project_id: document.getElementById('wi_project').value, center_id: document.getElementById('wi_center').value, title: document.getElementById('wi_title').value.trim(), item_type: document.getElementById('wi_type').value, project_stage: document.getElementById('wi_stage').value, status: document.getElementById('wi_status').value, priority: document.getElementById('wi_priority').value, waiting_for: document.getElementById('wi_waiting').value, follow_up_date: document.getElementById('wi_followup').value, due_date: document.getElementById('wi_due').value, next_action: document.getElementById('wi_next_action').value.trim(), notes: document.getElementById('wi_notes').value, last_progress_at: window.workItemToday(), steps: window._workItemSteps || [], activity: document.getElementById('wi_activity').value.trim(), initial_activity: document.getElementById('wi_activity').value.trim() }; };
window.submitWorkItem = async function(e, editId) { e.preventDefault(); var data = window.collectWorkItemData(); if (!data.project_id || !data.center_id || !data.title || !data.next_action) { alert('请填写项目、中心、事项名称和当前下一步。'); return false; } var res = editId ? await api.updateCenterWorkItem(editId, data) : await api.createCenterWorkItem(data); if (!res.success) { alert(res.error || '保存失败'); return false; } window.closeModal(); if (window.state.currentPage === 'center-detail') await window.refreshCacheAndTab(['work-items']); else await window.loadWorkItems(document.getElementById('pageContent')); if (res.taskSync && res.taskSync.missingLinkColumns) window.showToast('中心事项已保存；执行 SQL 后会自动同步当前步骤到待办。'); else window.showToast(editId ? '中心事项已更新，并已同步当前待办' : '中心事项已创建，并已同步当前待办'); return false; };

window.viewWorkItem = async function(id) { var res = await api.getCenterWorkItem(id); if (!res.success) { alert(res.error || '加载失败'); return; } var item = res.item; var steps = (item.steps || []).map(function(s) { return `<li class="${s.done ? 'done' : ''}"><i class="fas ${s.done ? 'fa-check-circle' : 'fa-circle'}"></i> ${window.escHtml(s.title)} ${s.due_date ? '<small>' + s.due_date + '</small>' : ''}</li>`; }).join('') || '<li>暂无步骤</li>'; var activities = (item.activities || []).map(function(a) { return `<li><strong>${a.action_date || '-'}</strong> · ${window.escHtml(a.content || a.action_type || '')}</li>`; }).join('') || '<li>暂无推进记录</li>'; window.openModal(`<h3><i class="fas fa-list-check"></i> ${window.escHtml(item.title)}</h3><div class="work-item-detail-meta"><span>${window.escHtml(item.project_name || '')}</span><span>${window.escHtml(item.center_name || '')}</span><span>${window.escHtml(item.status || '')}</span></div><div class="work-item-detail-next"><strong>当前下一步</strong><p>${window.escHtml(item.next_action || window.getWorkItemNextStep(item))}</p><small>${item.waiting_for ? '等待：' + window.escHtml(item.waiting_for) + ' · ' : ''}${item.follow_up_date ? '下次催办：' + item.follow_up_date : ''}</small></div><div class="work-item-detail-section"><strong>推进步骤</strong><ul>${steps}</ul></div><div class="work-item-detail-section"><strong>活动记录</strong><ul>${activities}</ul></div><div class="form-actions"><button class="btn btn-primary" onclick="window.closeModal();window.openWorkItemForm('${item.id}')"><i class="fas fa-edit"></i> 更新推进</button><button class="btn btn-text" onclick="window.deleteWorkItem('${item.id}')">删除</button><button class="btn" onclick="window.closeModal()">关闭</button></div>`); };
window.deleteWorkItem = async function(id) { if (!confirm('确定删除该中心工作事项及其步骤、记录？')) return; var res = await api.deleteCenterWorkItem(id); if (!res.success) { alert(res.error || '删除失败'); return; } window.closeModal(); if (window.state.currentPage === 'center-detail') await window.refreshCacheAndTab(['work-items']); else await window.loadWorkItems(document.getElementById('pageContent')); window.showToast('已删除'); };
