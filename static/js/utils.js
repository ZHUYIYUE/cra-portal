// ========== 工具函数和常量 ==========

// 能力分类定义
window.ABILITY_LABELS = {
    deep_focus: '深度专注',
    communication: '沟通协调',
    planning: '规划整理',
    execution: '执行归档',
    learning_review: '学习回顾'
};

window.ABILITY_ICONS = {
    deep_focus: '🧠',
    communication: '💬',
    planning: '📋',
    execution: '⚙️',
    learning_review: '📖'
};

window.ABILITY_DESC = {
    deep_focus: '写监查报告、审TMF、写合同初稿、做决策',
    communication: '和PI电话、和CRC确认进度、回复邮件、伦理沟通',
    planning: 'PPT制作、整理思路、规划里程碑、列清单',
    execution: '整理eTMF、打印归档、填表、文件质控回复',
    learning_review: '复盘监查经验、阅读方案更新、总结问题'
};

window.ENERGY_DESC = {
    high: '精力充沛，脑子清醒',
    medium: '一般状态，能坐住',
    low: '很累/犯困'
};

window.CALM_DESC = {
    high: '内心平静',
    medium: '有点事但不影响',
    low: '焦虑/烦躁'
};

// 状态组合说明：解释为什么推荐这些任务类型
window.STATUS_EXPLANATION = {
    'high,high':   '⚡🧘 状态很好，什么都能做。挑最优先的任务开干！',
    'high,medium': '⚡🌊 精力充沛，什么都能做。优先处理紧急或有截止日期的任务。',
    'high,low':    '⚡🔥 精力好但有点烦。先做沟通和执行类，避免需要深度思考的工作，等平静些再处理复杂问题。',
    'medium,high': '🔋🧘 状态不错，什么都能做。适合开会、写邮件、处理文件。',
    'medium,medium': '🔋🌊 普通状态，什么都能做。正常推进就好，别挑。',
    'medium,low':   '🔋🔥 有点烦躁，先做执行和沟通类。复杂方案和规划等心情好点再做。',
    'low,high':    '🪫🧘 身体累了但心态还行。适合规划、归档、学习回顾，不做需要快速反应的沟通。',
    'low,medium':  '🪫🌊 累了但还行。做执行、归档、学习类，不强求深度工作。',
    'low,low':      '🪫🔥 状态差。强行工作效率更低，建议休息30分钟再回来。'
};

// ========== 工具函数 ==========

window.escHtml = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

window.escAttr = function(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

window.formatDate = function(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

window.showLoading = function() { 
    const el = document.getElementById('loading');
    if (el) el.classList.add('show'); 
};

window.hideLoading = function() { 
    const el = document.getElementById('loading');
    if (el) el.classList.remove('show'); 
};

window.showError = function(msg) {
    const el = document.getElementById('pageContent');
    if (el) {
        el.innerHTML = `<div class="card"><p style="color:red;"><i class="fas fa-exclamation-circle"></i> ${msg}</p></div>`;
    }
};

window.showToast = function(msg) {
    let el = document.getElementById('toast');
    if (!el) {
        const t = document.createElement('div');
        t.id = 'toast';
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:6px;z-index:9999;opacity:0;transition:opacity 0.3s';
        document.body.appendChild(t);
        el = t;
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
};

window.closeSidebar = function() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebarOverlay');
    if (sb) sb.classList.remove('show');
    if (ov) ov.classList.remove('show');
};

// ========== 中心地图相关工具函数 ==========

// 城市坐标映射
window._cityCoords = {
    '杭州': [30.2741, 120.1551],
    '惠州': [23.1117, 114.4168],
    '宁波': [29.8683, 121.5440],
    '福州': [26.0745, 119.2965],
    '南昌': [28.6829, 115.8582],
    '扬州': [32.3932, 119.4127],
    '韶关': [24.8104, 113.5975],
    '丽水': [28.4676, 119.9228],
    '苏州': [31.2990, 120.5853],
    '深圳': [22.5431, 114.0579],
    '广州': [23.1291, 113.2644],
    '南京': [32.0603, 118.7969],
    '上海': [31.2304, 121.4737],
};

// 根据中心名称解析城市
window._getCenterCity = function(name) {
    // 直接匹配
    for (const city of Object.keys(window._cityCoords)) {
        if (name.includes(city)) return city;
    }
    // 特殊映射：医院名不含城市名
    if (name.includes('浙大') || name.includes('浙二') || name.includes('浙江大学')) return '杭州';
    if (name.includes('苏北')) return '扬州';
    if (name.includes('粤北')) return '韶关';
    return null;
};
