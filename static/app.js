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
    
    var titles = { dashboard: '工作台', projects: '项目', tasks: '待办事项', recommend: '状态推荐', startup: '启动任务', findings: '监查问题', ethics: '伦理递交' };
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
        case 'recommend': await window.loadRecommend(content); break;
        case 'startup': await window.loadStartup(content); break;
        case 'findings': await window.loadFindings(content); break;
        case 'ethics': await window.loadEthics(content); break;
        case 'center-detail': await window.loadCenterDetail(content); break;
    }
};

// ========== 模态框操作 ==========

window.openModal = function(html) {
    var modalContent = document.getElementById('modalContent');
    var modalOverlay = document.getElementById('modalOverlay');
    if (modalContent) modalContent.innerHTML = html;
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
