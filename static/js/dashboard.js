// ========== 总览页面 + 地图初始化 ==========

// 中心地图实例（全局，避免重复创建）
let _centerMap = null;

window.loadDashboard = async function(content) {
    const [statsRes, projectsRes, centersRes] = await Promise.all([
        fetch('/api/stats'), fetch('/api/projects'), fetch('/api/centers')
    ]);
    const stats = await statsRes.json();
    const projData = await projectsRes.json();
    const centersData = await centersRes.json();
    
    if (window.state) {
        window.state.projects = projData.projects || [];
    }
    const centers = centersData.centers || [];
    
    const s = stats.stats || {};
    const centerProgress = s.center_progress || [];
    
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card stat-blue">
                <i class="fas fa-folder-open"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.total_projects || 0}</span>
                    <span class="stat-label">项目总数</span>
                </div>
            </div>
            <div class="stat-card stat-orange">
                <i class="fas fa-tasks"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.pending_tasks || 0}</span>
                    <span class="stat-label">待办事项</span>
                </div>
            </div>
            <div class="stat-card ${s.overdue_tasks > 0 ? 'stat-red' : 'stat-green'}">
                <i class="fas fa-exclamation-circle"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.overdue_tasks || 0}</span>
                    <span class="stat-label">逾期待办</span>
                </div>
            </div>
            <div class="stat-card stat-red">
                <i class="fas fa-search"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.open_findings || 0}</span>
                    <span class="stat-label">Open问题</span>
                </div>
            </div>
            <div class="stat-card stat-yellow">
                <i class="fas fa-clock"></i>
                <div class="stat-info">
                    <span class="stat-num">${s.due_soon || 0}</span>
                    <span class="stat-label">本周到期</span>
                </div>
            </div>
            <div class="stat-card stat-purple">
                <i class="fas fa-hospital"></i>
                <div class="stat-info">
                    <span class="stat-num">${centers.length || 0}</span>
                    <span class="stat-label">中心总数</span>
                </div>
            </div>
        </div>

        ${s.overdue_tasks > 0 ? `<div class="alert-banner" style="background:#ffebee;border-left:4px solid #f44336;"><i class="fas fa-exclamation-triangle" style="color:#f44336;"></i> 有 <strong>${s.overdue_tasks}</strong> 个待办已逾期！</div>` : ''}
        ${s.due_soon > 0 ? `<div class="alert-banner" style="background:#fff8e1;border-left:4px solid #ff9800;"><i class="fas fa-clock" style="color:#ff9800;"></i> 有 <strong>${s.due_soon}</strong> 个任务将在7天内到期！</div>` : ''}

        ${centers.length > 0 ? `
        <div class="card">
            <div class="card-header"><i class="fas fa-map-marked-alt"></i> 中心分布</div>
            <div id="centerMap" class="map-container"></div>
        </div>` : ''}

        <div class="card">
            <div class="card-header"><i class="fas fa-folder"></i> 项目列表</div>
            <div class="projects-grid">
                ${(window.state && window.state.projects.length === 0 ? '<p style="color:#999;grid-column:1/-1;">暂无项目，去"项目"页面创建一个吧</p>' :
                    (window.state ? window.state.projects : []).map(p => `
                        <div class="project-card" onclick="window.viewProject('${p.id}')">
                            <h3><i class="fas fa-folder"></i> ${window.escHtml(p.name)}</h3>
                            <p>编号: ${window.escHtml(p.code || '未设置')}</p>
                            <p>中心: ${p.center_count || 0} 个</p>
                            <p>待办: ${p.task_count || 0} 项</p>
                            <span class="status status-${p.stage === '进行中' ? 'active' : 'planning'}">${window.escHtml(p.stage)}</span>
                            ${p.dbl_date ? `<small style="color:#e74c3c;">DBL: ${window.escHtml(p.dbl_date)}</small>` : ''}
                        </div>
                    `).join('')
                )}
            </div>
        </div>
    `;
    
    // 初始化中心地图（失败不影响页面其他内容）
    if (centers.length > 0) {
        try { window.initCenterMap(centers); } catch(e) {
            console.warn('地图初始化失败:', e);
            const mapEl = document.getElementById('centerMap');
            if (mapEl) mapEl.innerHTML = '<p style="color:#999;padding:20px;text-align:center;">⚠️ 地图加载失败</p>';
        }
    }
};

window.initCenterMap = function(centers) {
    const el = document.getElementById('centerMap');
    if (!el) return;
    
    // 安全检查：Leaflet 是否加载
    if (typeof L === 'undefined') {
        el.innerHTML = '<p style="color:#999;padding:20px;text-align:center;">⚠️ 地图组件加载中，请稍候刷新</p>';
        return;
    }
    
    // 清理旧地图
    if (_centerMap) {
        _centerMap.remove();
        _centerMap = null;
    }
    
    // 收集有坐标的中心
    const points = [];
    centers.forEach(c => {
        const city = window._getCenterCity(c.name || '');
        if (city && window._cityCoords[city]) {
            const ms = Array.isArray(c.milestones) ? c.milestones : [];
            const done = ms.filter(m => m.done).length;
            const total = ms.length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            points.push({
                id: c.id,
                code: c.code,
                name: c.name,
                city,
                lat: window._cityCoords[city][0],
                lng: window._cityCoords[city][1],
                pct,
                done, total,
                tasks: c.task_count || 0,
                openFindings: c.open_finding_count || 0,
                projectId: c.project_id || ''
            });
        }
    });
    
    if (points.length === 0) {
        el.innerHTML = '<p style="color:#999;padding:20px;text-align:center;">⚠️ 暂无已定位的中心</p>';
        return;
    }
    
    // 计算中心点
    const avgLat = points.reduce((s,p) => s+p.lat, 0) / points.length;
    const avgLng = points.reduce((s,p) => s+p.lng, 0) / points.length;
    
    _centerMap = L.map('centerMap').setView([avgLat, avgLng], 7);
    
    // 高德底图（国内速度快）
    L.tileLayer('https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        attribution: '&copy; AutoNavi',
        maxZoom: 18,
        minZoom: 4
    }).addTo(_centerMap);
    
    // 给每个中心加标记
    points.forEach(p => {
        const color = p.projectId && p.projectId.includes('3142') ? '#3498db' : '#e67e22';
        const radius = Math.max(8, 8 + Math.min(p.tasks + p.openFindings, 5));
        
        const marker = L.circleMarker([p.lat, p.lng], {
            radius,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85
        }).addTo(_centerMap);
        
        marker.bindPopup(`
            <div style="min-width:200px;">
                <div style="font-weight:600;font-size:15px;color:#2c3e50;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:6px;">
                    ${window.escHtml(p.city)} ${window.escHtml(p.name)}
                </div>
                <table style="font-size:13px;width:100%;">
                    <tr><td style="color:#888;padding:2px 6px 2px 0;">进度</td><td style="font-weight:500;"><span style="color:${p.pct === 100 ? '#27ae60' : p.pct >= 50 ? '#f39c12' : '#3498db'};">${p.pct}%</span> (${p.done}/${p.total})</td></tr>
                    <tr><td style="color:#888;padding:2px 6px 2px 0;">待办</td><td style="font-weight:500;">${p.tasks > 0 ? '<span style="color:#e67e22;">'+p.tasks+'</span>' : p.tasks}</td></tr>
                    ${p.openFindings > 0 ? `<tr><td style="color:#888;padding:2px 6px 2px 0;">问题</td><td style="font-weight:500;color:#e74c3c;">${p.openFindings}</td></tr>` : ''}
                </table>
                <button onclick="window.openCenterDetail('${p.id}')" style="margin-top:6px;padding:4px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">查看详情 →</button>
            </div>
        `);
    });
    
    // 适应所有标记
    const bounds = points.map(p => [p.lat, p.lng]);
    if (bounds.length > 1) {
        _centerMap.fitBounds(bounds, {padding: [40, 40]});
    }
};
