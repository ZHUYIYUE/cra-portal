// CRA Portal 前端逻辑 - v2026-06-19 (模块化重构版)

// ========== 全局错误捕获（帮助定位白屏问题）==========
window.onerror = function(msg, src, line, col, err) {
    console.error('JS错误:', msg, '\n行:', line, '\n来源:', src);
    var el = document.getElementById('pageContent');
    if (el && !el.innerHTML.trim()) {
        el.innerHTML = '<div style="padding:20px;color:#e74c3c;"><p>⚠️ 页面加载出错</p><pre style="font-size:12px;overflow:auto;">' + String(msg) + ' (行' + line + ')</pre></div>';
    }
};

// ========== 全局状态 ==========
window.state = {
    currentPage: 'dashboard',
    projects: [],
    tasks: [],
    currentProject: null,
    currentCenterId: null,
    centerDetailTab: '概览'
};

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', function() {
    window.initApp();
});

window.initApp = function() {
    // 自动加载总览页
    window.navigateTo('dashboard');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            window.navigateTo(this.dataset.page);
        });
    });
    
    var menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            var sb = document.getElementById('sidebar');
            var ov = document.getElementById('sidebarOverlay');
            if (sb) sb.classList.toggle('show');
            if (ov) ov.classList.toggle('show', sb && sb.classList.contains('show'));
        });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) window.closeSidebar();
        });
    });

    window.initGlobalSearch();

    var modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === this) window.closeModal();
        });
    }
};

// ========== 页面导航 ==========

window.navigateTo = async function(page) {
    window.state.currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    var titles = { dashboard: '工作台', projects: '项目', tasks: '待办事项', 'work-items': '中心工作事项', recommend: '状态推荐', startup: '启动任务', findings: '监查问题', ethics: '伦理递交', training: '培训管理', quality: '数据质量' };
    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[page] || '工作台';
    
    window.showLoading();
    try {
        await window.loadPage(page);
    } catch (error) {
        console.error('加载失败:', error);
        window.showError('加载失败，请刷新重试');
    } finally {
        window.hideLoading();
    }
};

window.loadPage = async function(page) {
    var content = document.getElementById('pageContent');
    if (!content) return;
    switch(page) {
        case 'dashboard': await window.loadDashboard(content); break;
        case 'projects': await window.loadProjects(content); break;
        case 'tasks': await window.loadTasks(content); break;
        case 'work-items': await window.loadWorkItems(content); break;
        case 'recommend': await window.loadRecommend(content); break;
        case 'startup': await window.loadStartup(content); break;
        case 'findings': await window.loadFindings(content); break;
        case 'ethics': await window.loadEthics(content); break;
        case 'training': await window.loadTraining(content); break;
        case 'quality': await window.loadDataQuality(content); break;
        case 'center-detail': await window.loadCenterDetail(content); break;
    }
};


// ========== 全局搜索 ==========

window.initGlobalSearch = function() {
    var input = document.getElementById('globalSearchInput');
    var clearBtn = document.getElementById('globalSearchClear');
    var box = document.getElementById('globalSearchResults');
    if (!input || !box) return;

    var timer = null;
    input.addEventListener('input', function() {
        clearTimeout(timer);
        timer = setTimeout(function() { window.runGlobalSearch(input.value); }, 160);
    });
    input.addEventListener('focus', function() {
        if (input.value.trim()) window.runGlobalSearch(input.value);
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') window.closeGlobalSearch();
        if (e.key === 'Enter' && window._globalSearchResults && window._globalSearchResults.length) {
            e.preventDefault();
            window.openGlobalSearchResult(0);
        }
    });
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            input.value = '';
            window.closeGlobalSearch();
            input.focus();
        });
    }
    document.addEventListener('click', function(e) {
        var wrap = document.getElementById('globalSearch');
        if (wrap && !wrap.contains(e.target)) window.closeGlobalSearch();
    });
};

window.closeGlobalSearch = function() {
    var box = document.getElementById('globalSearchResults');
    if (box) {
        box.classList.remove('show');
        box.innerHTML = '';
    }
};

window.loadGlobalSearchIndex = async function(force) {
    if (!force && window._globalSearchIndex) return window._globalSearchIndex;
    var [projData, centerData, taskData, findingData, letterData, workItemData, trainingData] = await Promise.all([
        api.getProjects(), api.getCenters(), api.getTasks(), api.getFindings(), api.getEthicsLetters(), api.getCenterWorkItems(), api.getTrainingPlans()
    ]);
    var entries = [];
    var add = function(entry) {
        entry.searchText = [entry.title, entry.meta, entry.extra].filter(Boolean).join(' ').toLowerCase();
        entries.push(entry);
    };

    (projData.projects || []).forEach(function(p) {
        add({ type: 'project', icon: 'fa-folder-open', label: '项目', id: p.id,
            title: p.name || '未命名项目', meta: [p.code, p.stage, p.full_name].filter(Boolean).join(' · '), extra: p.notes || '' });
    });
    (centerData.centers || []).forEach(function(c) {
        add({ type: 'center', icon: 'fa-hospital', label: '中心', id: c.id,
            title: ((c.code || '') + ' ' + (c.name || '')).trim() || '未命名中心',
            meta: [c.pi_name ? 'PI ' + c.pi_name : '', c.contact_crc ? 'CRC ' + c.contact_crc : '', c.department || ''].filter(Boolean).join(' · '),
            extra: [c.pi_phone, c.pi_email, c.contact_crc_phone, c.contact_ethics, c.address].filter(Boolean).join(' ') });
    });
    (taskData.tasks || []).forEach(function(t) {
        add({ type: 'task', icon: 'fa-tasks', label: '待办', id: t.id,
            title: t.title || '未命名待办',
            meta: [t.project_name, t.center_name, t.due_date ? '截止 ' + t.due_date : '', t.task_status === 'waiting_crc' ? '跟进CRC' : ''].filter(Boolean).join(' · '),
            extra: [t.priority, t.ability_type].filter(Boolean).join(' ') });
    });
    (findingData.findings || []).forEach(function(f) {
        add({ type: 'finding', icon: 'fa-search', label: '问题', id: f.id,
            title: f.finding_number || '未编号问题',
            meta: [f.status || 'Open', f.severity, f.center_name || f.project_name, f.due_date ? '截止 ' + f.due_date : ''].filter(Boolean).join(' · '),
            extra: [f.description, f.corrective_action, f.category].filter(Boolean).join(' ') });
    });
    (letterData.letters || []).forEach(function(l) {
        add({ type: 'ethics', icon: 'fa-file-contract', label: '递交信', id: l.id,
            title: l.project_name || '未选择项目',
            meta: [l.center_name, l.submission_date, (l.items || []).length + '份文件'].filter(Boolean).join(' · '),
            extra: [l.submitter_name, l.ethics_committee].filter(Boolean).join(' ') });
    });
    (workItemData.items || []).forEach(function(item) {
        add({ type: 'work-item', icon: 'fa-list-check', label: '中心事项', id: item.id,
            title: item.title || '未命名中心事项',
            meta: [item.project_name, item.center_name, item.status, item.follow_up_date ? '催办 ' + item.follow_up_date : ''].filter(Boolean).join(' · '),
            extra: [item.item_type, item.next_action, item.waiting_for, item.notes].filter(Boolean).join(' ') });
    });
    (trainingData.plans || []).forEach(function(p) {
        add({ type: 'training', icon: 'fa-graduation-cap', label: '培训', id: p.id,
            title: p.title || '未命名培训计划',
            meta: [p.project_name, p.center_name, p.due_date ? '截止 ' + p.due_date : '', p.status || ''].filter(Boolean).join(' · '),
            extra: [p.doc_name_snapshot, p.version_snapshot, p.training_type, p.scope].filter(Boolean).join(' ') });
    });

    window._globalSearchIndex = entries;
    return entries;
};

window.runGlobalSearch = async function(query) {
    var box = document.getElementById('globalSearchResults');
    if (!box) return;
    var q = (query || '').trim().toLowerCase();
    if (!q) {
        window.closeGlobalSearch();
        return;
    }
    box.classList.add('show');
    box.innerHTML = '<div class="global-search-state"><i class="fas fa-spinner fa-spin"></i> 搜索中...</div>';
    try {
        var index = await window.loadGlobalSearchIndex(false);
        var parts = q.split(/\s+/).filter(Boolean);
        var results = index.map(function(item) {
            var score = 0;
            if (item.title.toLowerCase().includes(q)) score += 8;
            if (item.title.toLowerCase().startsWith(q)) score += 6;
            if (item.searchText.includes(q)) score += 4;
            parts.forEach(function(part) { if (item.searchText.includes(part)) score += 2; });
            return Object.assign({}, item, { score: score });
        }).filter(function(item) { return item.score > 0; })
          .sort(function(a, b) { return b.score - a.score || a.title.localeCompare(b.title, 'zh-CN'); })
          .slice(0, 8);
        window._globalSearchResults = results;
        window.renderGlobalSearchResults(results, q);
    } catch (err) {
        console.error('global search failed:', err);
        box.innerHTML = '<div class="global-search-state danger">搜索失败，请稍后重试</div>';
    }
};

window.renderGlobalSearchResults = function(results) {
    var box = document.getElementById('globalSearchResults');
    if (!box) return;
    if (!results.length) {
        box.innerHTML = '<div class="global-search-state">没有找到匹配结果</div>';
        return;
    }
    box.innerHTML = results.map(function(item, idx) {
        return '<button class="global-search-item" onclick="window.openGlobalSearchResult(' + idx + ')">' +
            '<span class="global-search-kind"><i class="fas ' + item.icon + '"></i>' + item.label + '</span>' +
            '<span class="global-search-main"><strong>' + window.escHtml(item.title) + '</strong>' +
            '<small>' + window.escHtml(item.meta || '') + '</small></span>' +
            '<i class="fas fa-arrow-right global-search-arrow"></i>' +
            '</button>';
    }).join('');
};

window.openGlobalSearchResult = async function(index) {
    var item = window._globalSearchResults && window._globalSearchResults[index];
    if (!item) return;
    window.closeGlobalSearch();
    var input = document.getElementById('globalSearchInput');
    if (input) input.blur();

    if (item.type === 'project') {
        await window.navigateTo('projects');
        await window.viewProject(item.id);
    } else if (item.type === 'center') {
        await window.openCenterDetail(item.id);
    } else if (item.type === 'task') {
        window.viewTask(item.id);
    } else if (item.type === 'finding') {
        await window.navigateTo('findings');
        window.highlightFinding(item.id);
    } else if (item.type === 'ethics') {
        await window.navigateTo('ethics');
        if (window.viewEthicsLetter) window.viewEthicsLetter(item.id);
    } else if (item.type === 'training') {
        await window.navigateTo('training');
        if (window.viewTrainingPlan) window.viewTrainingPlan(item.id);
    } else if (item.type === 'work-item') {
        await window.navigateTo('work-items');
        if (window.viewWorkItem) window.viewWorkItem(item.id);
    }
};

window.highlightFinding = function(id) {
    setTimeout(function() {
        var el = document.querySelector('[data-finding-id="' + id + '"]');
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('search-highlight');
        setTimeout(function() { el.classList.remove('search-highlight'); }, 1800);
    }, 350);
};
// ========== 模态框操作 ==========

window.openModal = function(html) {
    var modalContent = document.getElementById('modalContent');
    var modalOverlay = document.getElementById('modalOverlay');
    if (modalContent) {
        modalContent.className = 'modal';
        modalContent.innerHTML = html;
    }
    if (modalOverlay) modalOverlay.classList.add('show');
};

window.closeModal = function() {
    var modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.classList.remove('show');
};

// ========== 启动任务相关（保留在 app.js 因为被多个模块调用）==========

window.showAddStartupTaskModal = function() {
    window.openModal(`
        <h3><i class="fas fa-plus"></i> 添加启动任务</h3>
        <div class="form-group">
            <label>任务名称 *</label>
            <input type="text" id="startupTaskName" placeholder="例如：整理CRA Portal待办">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="startupTaskDesc" placeholder="简短描述这个启动任务的作用"></textarea>
        </div>
        <div class="modal-actions">
            <button class="btn" onclick="window.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="window.saveStartupTask()">保存</button>
        </div>
    `);
};

// ========== 导出 Excel ==========

window.showExportMenu = function() {
    var menuHtml = `
    <div class="modal-overlay" onclick="window.closeExportModal(event)" style="display:flex;justify-content:center;align-items:center;">
      <div class="modal" style="width:320px;padding:24px;">
        <h3 style="margin:0 0 16px;font-size:18px;">导出 Excel</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn" onclick="window.exportExcel('tasks')" style="width:100%;">
            📋 待办事项
          </button>
          <button class="btn" onclick="window.exportExcel('findings')" style="width:100%;">
            🔍 监查问题
          </button>
          <button class="btn" onclick="window.exportExcel('centers')" style="width:100%;">
            🏥 中心信息
          </button>
          <button class="btn" onclick="window.exportExcel('projects')" style="width:100%;">
            📊 项目信息
          </button>
          <button class="btn btn-primary" onclick="window.exportExcel('all')" style="width:100%;">
            📦 全部数据
          </button>
        </div>
        <button class="btn btn-outline" onclick="window.closeExportModal()" style="width:100%;margin-top:12px;">取消</button>
      </div>
    </div>`;
    var div = document.createElement('div');
    div.id = 'exportModal';
    div.innerHTML = menuHtml;
    document.body.appendChild(div);
};

window.closeExportModal = function(e) {
    if (e && e.target !== e.currentTarget) return;
    var modal = document.getElementById('exportModal');
    if (modal) modal.remove();
};

window.exportExcel = async function(type) {
    window.closeExportModal();
    try {
        await api.exportExcel(type);
    } catch (err) {
        alert('导出失败: ' + err.message);
    }
};

// ========== 数据备份 ==========

window.backupData = async function() {
    if (!confirm('确定导出数据备份？备份文件将自动下载。')) return;
    try {
        await api.backup();
        alert('备份成功！文件已下载。');
    } catch (err) {
        alert('备份失败: ' + err.message);
    }
};
