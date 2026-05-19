// CRA Portal 前端逻辑

// 全局状态
const state = {
    currentPage: 'dashboard',
    projects: [],
    currentProject: null
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // 绑定侧边栏导航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateTo(page);
        });
    });
    
    // 绑定菜单切换（移动端）
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('show');
    });
    
    // 加载初始页面
    navigateTo('dashboard');
}

// 页面导航
async function navigateTo(page) {
    state.currentPage = page;
    
    // 更新侧边栏激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // 更新页面标题
    const titles = {
        dashboard: '总览',
        projects: '项目',
        tasks: '待办事项',
        files: '文件管理'
    };
    document.getElementById('pageTitle').textContent = titles[page];
    
    // 加载页面内容
    showLoading();
    try {
        await loadPage(page);
    } catch (error) {
        console.error('加载页面失败:', error);
        showError('加载失败，请刷新重试');
    } finally {
        hideLoading();
    }
}

// 加载页面内容
async function loadPage(page) {
    const content = document.getElementById('pageContent');
    
    switch(page) {
        case 'dashboard':
            await loadDashboard(content);
            break;
        case 'projects':
            await loadProjects(content);
            break;
        case 'tasks':
            await loadTasks(content);
            break;
        case 'files':
            await loadFiles(content);
            break;
    }
}

// 总览页面
async function loadDashboard(content) {
    const response = await fetch('/api/projects');
    const data = await response.json();
    
    if (!data.success) {
        content.innerHTML = '<div class="card"><p>加载失败</p></div>';
        return;
    }
    
    state.projects = data.projects;
    
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-tachometer-alt"></i> 工作台总览
            </div>
            <p>欢迎使用CRA Portal！当前有 <strong>${data.projects.length}</strong> 个活跃项目。</p>
        </div>
        
        <div class="projects-grid">
    `;
    
    for (const project of data.projects) {
        const detailResponse = await fetch(`/api/project/${project.id}`);
        const detail = await detailResponse.json();
        
        html += `
            <div class="project-card" onclick="viewProject('${project.id}')">
                <h3><i class="fas fa-folder"></i> ${project.name}</h3>
                ${detail.success ? `
                    <p>项目编号: ${detail.project_id || '未设置'}</p>
                    <p>中心数量: ${detail.centers ? detail.centers.length : 0}</p>
                ` : ''}
                <span class="status status-active">进行中</span>
            </div>
        `;
    }
    
    html += '</div>';
    content.innerHTML = html;
}

// 项目列表页面
async function loadProjects(content) {
    const response = await fetch('/api/projects');
    const data = await response.json();
    
    if (!data.success) {
        content.innerHTML = '<div class="card"><p>加载失败</p></div>';
        return;
    }
    
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-folder-open"></i> 项目管理
            </div>
            <button class="btn btn-primary" onclick="showCreateProject()">
                <i class="fas fa-plus"></i> 新建项目
            </button>
        </div>
        
        <div class="projects-grid">
    `;
    
    for (const project of data.projects) {
        const detailResponse = await fetch(`/api/project/${project.id}`);
        const detail = await detailResponse.json();
        
        html += `
            <div class="project-card" onclick="viewProject('${project.id}')">
                <h3><i class="fas fa-folder"></i> ${detail.success ? detail.project_name || project.name : project.name}</h3>
                ${detail.success ? `
                    <p>编号: ${detail.project_id || '未设置'}</p>
                    <p>中心: ${detail.centers ? detail.centers.length : 0} 个</p>
                ` : ''}
                <span class="status status-active">进行中</span>
            </div>
        `;
    }
    
    html += '</div>';
    content.innerHTML = html;
}

// 查看项目详情
async function viewProject(projectId) {
    const response = await fetch(`/api/project/${projectId}`);
    const data = await response.json();
    
    if (!data.success) {
        alert('加载项目详情失败');
        return;
    }
    
    state.currentProject = projectId;
    
    const content = document.getElementById('pageContent');
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-folder"></i> ${data.project_name || projectId}
                <button class="btn btn-primary" style="margin-left: auto;" onclick="editProject('${projectId}')">
                    <i class="fas fa-edit"></i> 编辑
                </button>
            </div>
            <p><strong>项目编号:</strong> ${data.project_id || '未设置'}</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <i class="fas fa-hospital"></i> 研究中心
            </div>
            <div class="center-list">
    `;
    
    if (data.centers && data.centers.length > 0) {
        data.centers.forEach(center => {
            html += `
                <div class="center-item">
                    <h4>${center.id} 中心</h4>
                    <p>状态: ${center.status}</p>
                </div>
            `;
        });
    } else {
        html += '<p>暂无中心信息</p>';
    }
    
    html += `
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <i class="fas fa-file-alt"></i> 项目文档
            </div>
            <div id="projectFiles">
                <p>加载中...</p>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    
    // 加载项目文件
    loadProjectFiles(projectId);
}

// 编辑项目
function editProject(projectId) {
    fetch(`/api/project/${projectId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert('加载失败');
                return;
            }
            
            const content = document.getElementById('pageContent');
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-edit"></i> 编辑项目
                    </div>
                    <textarea id="editor" style="width: 100%; height: 500px; font-family: monospace; padding: 10px;">${data.raw_content}</textarea>
                    <div style="margin-top: 15px;">
                        <button class="btn btn-success" onclick="saveProject('${projectId}')">
                            <i class="fas fa-save"></i> 保存
                        </button>
                        <button class="btn" onclick="viewProject('${projectId}')" style="margin-left: 10px;">
                            取消
                        </button>
                    </div>
                </div>
            `;
        });
}

// 保存项目
async function saveProject(projectId) {
    const content = document.getElementById('editor').value;
    
    const response = await fetch(`/api/project/${projectId}/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: content })
    });
    
    const data = await response.json();
    
    if (data.success) {
        alert('保存成功！');
        viewProject(projectId);
    } else {
        alert('保存失败: ' + data.error);
    }
}

// 加载项目文件
async function loadProjectFiles(projectId) {
    const response = await fetch(`/api/files/${projectId}`);
    const data = await response.json();
    
    if (!data.success) {
        document.getElementById('projectFiles').innerHTML = '<p>加载失败</p>';
        return;
    }
    
    let html = '<ul style="list-style: none; padding: 0;">';
    data.files.forEach(file => {
        html += `
            <li style="padding: 10px; border-bottom: 1px solid #eee;">
                <i class="fas fa-file"></i>
                <a href="/api/files/${projectId}/${file.path}" target="_blank">${file.name}</a>
                <span style="color: #999; font-size: 0.9em; margin-left: 10px;">
                    ${(file.size / 1024).toFixed(2)} KB
                </span>
            </li>
        `;
    });
    html += '</ul>';
    
    const container = document.getElementById('projectFiles');
    if (container) {
        container.innerHTML = html;
    }
}

// 待办事项页面
async function loadTasks(content) {
    const response = await fetch('/api/tasks');
    const data = await response.json();
    
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-tasks"></i> 待办事项
            </div>
            <button class="btn btn-primary" onclick="showAddTask()">
                <i class="fas fa-plus"></i> 新建待办
            </button>
        </div>
        
        <div class="task-list">
    `;
    
    if (data.success && data.tasks && data.tasks.length > 0) {
        data.tasks.forEach(task => {
            html += `
                <div class="task-item">
                    <input type="checkbox" class="task-checkbox">
                    <div class="task-content">
                        <h4>${task.title || '未命名任务'}</h4>
                        <p class="task-meta">${task.project || ''} · ${task.due || '无截止日期'}</p>
                    </div>
                    <span class="task-priority priority-${task.priority || 'medium'}">${task.priority || '中'}</span>
                </div>
            `;
        });
    } else {
        html += '<p>暂无待办事项</p>';
    }
    
    html += '</div>';
    content.innerHTML = html;
}

// 文件管理页面
async function loadFiles(content) {
    const response = await fetch('/api/projects');
    const data = await response.json();
    
    let html = `
        <div class="card">
            <div class="card-header">
                <i class="fas fa-file-alt"></i> 文件管理
            </div>
        </div>
    `;
    
    if (data.success && data.projects) {
        for (const project of data.projects) {
            html += `
                <div class="card">
                    <h3><i class="fas fa-folder"></i> ${project.name}</h3>
                    <div id="files-${project.id}">加载中...</div>
                </div>
            `;
        }
    }
    
    content.innerHTML = html;
    
    // 加载每个项目的文件
    if (data.success && data.projects) {
        for (const project of data.projects) {
            loadProjectFiles(project.id);
        }
    }
}

// 显示加载动画
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

function showError(message) {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="card">
            <p style="color: red;"><i class="fas fa-exclamation-circle"></i> ${message}</p>
        </div>
    `;
}

// 占位函数（后续实现）
function showCreateProject() {
    alert('功能开发中...');
}

function showAddTask() {
    alert('功能开发中...');
}
