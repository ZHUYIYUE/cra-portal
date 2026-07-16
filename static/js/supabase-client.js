// ========== Supabase Client - 前端直连 Supabase REST API ==========
// 无需后端，所有数据操作通过 PostgREST API 直连数据库

const SB_URL = 'https://ospnktbwlbsdveawrkzd.supabase.co';
const SB_KEY = 'sb_publishable_KlAaxgwXGH5u4833Zdd1OQ_c_2gI6vD';
const SB_REST = `${SB_URL}/rest/v1`;

// ========== 底层辅助函数 ==========

function _headers(extra) {
    return Object.assign({
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
    }, extra || {});
}

function _genId() {
    return Array.from({length: 12}, function() { return Math.floor(Math.random() * 16).toString(16); }).join('');
}

async function _select(table, params) {
    var url = SB_REST + '/' + table;
    if (params) {
        var qs = Object.entries(params).map(function(e) { return e[0] + '=' + encodeURIComponent(e[1]); }).join('&');
        url += '?' + qs;
    }
    var res = await fetch(url, { headers: _headers() });
    if (!res.ok) throw new Error('Select ' + table + ' failed: ' + await res.text());
    return res.json();
}

async function _selectOne(table, id) {
    var data = await _select(table, { id: 'eq.' + id, limit: '1' });
    return data[0] || null;
}

async function _insert(table, data) {
    var res = await fetch(SB_REST + '/' + table, {
        method: 'POST',
        headers: _headers({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Insert ' + table + ' failed: ' + await res.text());
    var result = await res.json();
    return result[0] || { id: data.id };
}

async function _update(table, id, data) {
    var url = SB_REST + '/' + table + '?id=eq.' + encodeURIComponent(id);
    var res = await fetch(url, {
        method: 'PATCH',
        headers: _headers({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Update ' + table + ' failed: ' + await res.text());
    var result = await res.json();
    return result[0] || { success: true };
}

async function _delete(table, id) {
    var url = SB_REST + '/' + table + '?id=eq.' + encodeURIComponent(id);
    var res = await fetch(url, { method: 'DELETE', headers: _headers() });
    if (!res.ok) throw new Error('Delete ' + table + ' failed: ' + await res.text());
    return { success: true };
}

function _now() { return new Date().toISOString(); }

function _todayStr() { return new Date().toISOString().split('T')[0]; }

function _isMissingTaskPlanningColumn(err) {
    var msg = err && err.message ? err.message : String(err || '');
    return /estimated_minutes|started_at|schema cache|column/i.test(msg);
}

function _isMissingProjectDocumentsTable(err) {
    var msg = err && err.message ? err.message : String(err || '');
    return /project_documents|schema cache|relation .* does not exist|PGRST205|42P01/i.test(msg);
}

function _isMissingEthicsPackagesTable(err) {
    var msg = err && err.message ? err.message : String(err || '');
    return /ethics_submission_packages|ethics_submission_package_items|schema cache|relation .* does not exist|PGRST205|42P01/i.test(msg);
}

function _isMissingTrainingTables(err) {
    var msg = err && err.message ? err.message : String(err || '');
    return /training_plans|training_records|schema cache|relation .* does not exist|PGRST205|42P01/i.test(msg);
}

function _isMissingCenterWorkItemsTables(err) {
    var msg = err && err.message ? err.message : String(err || '');
    return /center_work_items|center_work_item_steps|center_work_item_activities|schema cache|relation .* does not exist|PGRST205|42P01/i.test(msg);
}

function _stripTaskPlanningFields(data) {
    var copy = Object.assign({}, data);
    delete copy.estimated_minutes;
    delete copy.started_at;
    return copy;
}

// ========== 全局 API 对象 ==========

window.api = {

    // ===== 中心工作事项 =====

    getCenterWorkItems: async function(filters) {
        var params = { order: 'updated_at.desc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        try {
            var results = await Promise.all([
                _select('center_work_items', params),
                _select('center_work_item_steps', { order: 'sort_order.asc' }),
                _select('center_work_item_activities', { order: 'created_at.desc' }),
                _select('projects', { select: 'id,name,code,stage' }),
                _select('centers', { select: 'id,name,code,project_id' })
            ]);
            var items = results[0], steps = results[1], activities = results[2], projects = results[3], centers = results[4];
            return { success: true, items: items.map(function(item) {
                var project = projects.find(function(p) { return p.id === item.project_id; });
                var center = centers.find(function(c) { return c.id === item.center_id; });
                var itemSteps = steps.filter(function(s) { return s.work_item_id === item.id; });
                var itemActivities = activities.filter(function(a) { return a.work_item_id === item.id; });
                return Object.assign({}, item, {
                    project_name: project ? project.name : '',
                    project_code: project ? project.code : '',
                    center_name: center ? ((center.code || '') + ' ' + (center.name || '')).trim() : '',
                    steps: itemSteps,
                    activities: itemActivities,
                    completed_steps: itemSteps.filter(function(s) { return s.done; }).length,
                    total_steps: itemSteps.length
                });
            }) };
        } catch (err) {
            if (!_isMissingCenterWorkItemsTables(err)) throw err;
            return { success: true, items: [], missingTable: true };
        }
    },

    getCenterWorkItem: async function(id) {
        try {
            var list = await this.getCenterWorkItems();
            var item = list.items.find(function(x) { return x.id === id; });
            return item ? { success: true, item: item } : { success: false, error: '中心工作事项不存在' };
        } catch (err) {
            if (!_isMissingCenterWorkItemsTables(err)) throw err;
            return { success: false, error: '中心工作事项表尚未创建，请先执行 supabase/center_work_items.sql' };
        }
    },

    createCenterWorkItem: async function(data) {
        var id = _genId();
        try {
            await _insert('center_work_items', {
                id: id, project_id: data.project_id || '', center_id: data.center_id || '',
                title: data.title || '', item_type: data.item_type || '其他', project_stage: data.project_stage || '',
                status: data.status || '进行中', priority: data.priority || 'medium', waiting_for: data.waiting_for || '',
                next_action: data.next_action || '', follow_up_date: data.follow_up_date || '', due_date: data.due_date || '',
                last_progress_at: data.last_progress_at || _todayStr(), notes: data.notes || '', completed_at: '',
                created_at: _now(), updated_at: _now()
            });
            for (var i = 0; i < (data.steps || []).length; i++) {
                var step = data.steps[i];
                if (!step.title) continue;
                await _insert('center_work_item_steps', {
                    id: _genId(), work_item_id: id, title: step.title, status: step.status || '待处理',
                    waiting_for: step.waiting_for || '', due_date: step.due_date || '', done: !!step.done,
                    sort_order: i, created_at: _now(), updated_at: _now()
                });
            }
            if (data.initial_activity) {
                await _insert('center_work_item_activities', { id: _genId(), work_item_id: id, action_type: '创建事项', content: data.initial_activity, action_date: _todayStr(), created_at: _now() });
            }
            return { success: true, id: id };
        } catch (err) {
            if (!_isMissingCenterWorkItemsTables(err)) throw err;
            return { success: false, error: '中心工作事项表尚未创建，请先执行 supabase/center_work_items.sql' };
        }
    },

    updateCenterWorkItem: async function(id, data) {
        try {
            var update = { updated_at: _now() };
            ['project_id', 'center_id', 'title', 'item_type', 'project_stage', 'status', 'priority', 'waiting_for', 'next_action', 'follow_up_date', 'due_date', 'last_progress_at', 'notes', 'completed_at'].forEach(function(f) { if (f in data) update[f] = data[f]; });
            await _update('center_work_items', id, update);
            if (data.steps) {
                var existing = await _select('center_work_item_steps', { work_item_id: 'eq.' + id });
                for (var i = 0; i < existing.length; i++) await _delete('center_work_item_steps', existing[i].id);
                for (var j = 0; j < data.steps.length; j++) {
                    var step = data.steps[j];
                    if (!step.title) continue;
                    await _insert('center_work_item_steps', { id: _genId(), work_item_id: id, title: step.title, status: step.status || '待处理', waiting_for: step.waiting_for || '', due_date: step.due_date || '', done: !!step.done, sort_order: j, created_at: _now(), updated_at: _now() });
                }
            }
            if (data.activity) {
                await _insert('center_work_item_activities', { id: _genId(), work_item_id: id, action_type: data.activity_type || '推进记录', content: data.activity, action_date: data.activity_date || _todayStr(), created_at: _now() });
            }
            return { success: true };
        } catch (err) {
            if (!_isMissingCenterWorkItemsTables(err)) throw err;
            return { success: false, error: '中心工作事项表尚未创建，请先执行 supabase/center_work_items.sql' };
        }
    },

    deleteCenterWorkItem: async function(id) {
        try { return await _delete('center_work_items', id); }
        catch (err) {
            if (!_isMissingCenterWorkItemsTables(err)) throw err;
            return { success: false, error: '中心工作事项表尚未创建，请先执行 supabase/center_work_items.sql' };
        }
    },

    // ===== 项目 =====

    getProjects: async function() {
        var [projects, centers, tasks] = await Promise.all([
            _select('projects', { order: 'created_at.asc' }),
            _select('centers', { select: 'id,project_id' }),
            _select('tasks', { select: 'id,project_id,done' })
        ]);
        var result = projects.map(function(p) {
            var pTasks = tasks.filter(function(t) { return t.project_id === p.id; });
            var pCenters = centers.filter(function(c) { return c.project_id === p.id; });
            return Object.assign({}, p, {
                center_count: pCenters.length,
                task_count: pTasks.length,
                done_count: pTasks.filter(function(t) { return t.done; }).length
            });
        });
        return { success: true, projects: result };
    },

    getProject: async function(id) {
        var p = await _selectOne('projects', id);
        if (!p) return { success: false, error: '项目不存在' };
        return Object.assign({ success: true }, p);
    },

    createProject: async function(data) {
        var id = _genId();
        await _insert('projects', {
            id: id, name: data.name || '', code: data.code || '',
            stage: data.stage || '', dbl_date: data.dbl_date || '',
            notes: data.notes || '',
            full_name: data.full_name || '', approval_number: data.approval_number || '',
            sponsor: data.sponsor || '', cro_name: data.cro_name || '',
            created_at: _now(), updated_at: _now()
        });
        return { success: true, id: id };
    },

    updateProject: async function(id, data) {
        var update = { updated_at: _now() };
        ['name', 'code', 'stage', 'dbl_date', 'notes', 'full_name', 'approval_number', 'sponsor', 'cro_name'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('projects', id, update);
        return { success: true };
    },

    deleteProject: async function(id) {
        return _delete('projects', id);
    },

    // ===== 项目文件库 =====

    getProjectDocuments: async function(projectId) {
        var params = { order: 'created_at.desc' };
        if (projectId) params.project_id = 'eq.' + projectId;
        try {
            var docs = await _select('project_documents', params);
            return { success: true, documents: docs };
        } catch (err) {
            if (!_isMissingProjectDocumentsTable(err)) throw err;
            return { success: true, documents: [], missingTable: true };
        }
    },

    getProjectDocument: async function(id) {
        try {
            var doc = await _selectOne('project_documents', id);
            if (!doc) return { success: false, error: '项目文件不存在' };
            return { success: true, document: doc };
        } catch (err) {
            if (!_isMissingProjectDocumentsTable(err)) throw err;
            return { success: false, error: '项目文件表尚未创建，请先执行 supabase/project_documents.sql' };
        }
    },

    createProjectDocument: async function(data) {
        var id = _genId();
        try {
            await _insert('project_documents', {
                id: id,
                project_id: data.project_id || '',
                doc_category: data.doc_category || '',
                doc_name: data.doc_name || '',
                version: data.version || '',
                version_date: data.version_date || '',
                effective_date: data.effective_date || '',
                received_date: data.received_date || '',
                requires_ethics_submission: !!data.requires_ethics_submission,
                requires_training: !!data.requires_training,
                training_scope: data.training_scope || '',
                training_due_days: data.training_due_days || null,
                notes: data.notes || '',
                created_at: _now(),
                updated_at: _now()
            });
            return { success: true, id: id };
        } catch (err) {
            if (!_isMissingProjectDocumentsTable(err)) throw err;
            return { success: false, error: '项目文件表尚未创建，请先执行 supabase/project_documents.sql' };
        }
    },

    updateProjectDocument: async function(id, data) {
        var update = { updated_at: _now() };
        ['project_id', 'doc_category', 'doc_name', 'version', 'version_date',
         'effective_date', 'received_date', 'requires_ethics_submission',
         'requires_training', 'training_scope', 'training_due_days', 'notes'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        if ('requires_ethics_submission' in update) update.requires_ethics_submission = !!update.requires_ethics_submission;
        if ('requires_training' in update) update.requires_training = !!update.requires_training;
        if ('training_due_days' in update && !update.training_due_days) update.training_due_days = null;
        try {
            await _update('project_documents', id, update);
            return { success: true };
        } catch (err) {
            if (!_isMissingProjectDocumentsTable(err)) throw err;
            return { success: false, error: '项目文件表尚未创建，请先执行 supabase/project_documents.sql' };
        }
    },

    deleteProjectDocument: async function(id) {
        try {
            return await _delete('project_documents', id);
        } catch (err) {
            if (!_isMissingProjectDocumentsTable(err)) throw err;
            return { success: false, error: '项目文件表尚未创建，请先执行 supabase/project_documents.sql' };
        }
    },

    // ===== 中心 =====

    getCenters: async function(projectId) {
        var params = { order: 'created_at.asc' };
        if (projectId) params.project_id = 'eq.' + projectId;
        var centers = await _select('centers', params);
        var [allTasks, allFindings] = await Promise.all([
            _select('tasks', { select: 'id,center_id,done' }),
            _select('findings', { select: 'id,center_id,status' })
        ]);
        var result = centers.map(function(c) {
            var cTasks = allTasks.filter(function(t) { return t.center_id === c.id; });
            var cFindings = allFindings.filter(function(f) { return f.center_id === c.id; });
            return Object.assign({}, c, {
                task_count: cTasks.length,
                finding_count: cFindings.length,
                open_finding_count: cFindings.filter(function(f) { return f.status === 'Open'; }).length
            });
        });
        return { success: true, centers: result };
    },

    getCenter: async function(id) {
        var c = await _selectOne('centers', id);
        if (!c) return { success: false, error: '中心不存在' };
        return { success: true, center: c };
    },

    createCenter: async function(data) {
        var id = _genId();
        await _insert('centers', {
            id: id, project_id: data.project_id || '', code: data.code || '',
            name: data.name || '', department: '', address: '',
            pi_name: '', pi_phone: '', pi_email: '',
            contact_crc: '', contact_crc_phone: '', contact_ethics: '',
            milestones: data.milestones || {}, notes: '',
            created_at: _now(), updated_at: _now()
        });
        return { success: true, id: id };
    },

    updateCenter: async function(id, data) {
        var update = { updated_at: _now() };
        ['code', 'name', 'department', 'address', 'pi_name', 'pi_phone',
         'pi_email', 'contact_crc', 'contact_crc_phone', 'contact_ethics',
         'milestones', 'notes'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('centers', id, update);
        return { success: true };
    },

    deleteCenter: async function(id) {
        return _delete('centers', id);
    },

    updateMilestone: async function(centerId, idx, data) {
        var c = await _selectOne('centers', centerId);
        if (!c) return { success: false, error: '中心不存在' };
        var ms = Array.isArray(c.milestones) ? c.milestones : [];
        if (ms[idx]) {
            ms[idx].done = data.done;
            if (data.done) {
                ms[idx].actual_date = _todayStr();
            } else {
                delete ms[idx].actual_date;
            }
        }
        await _update('centers', centerId, { milestones: ms, updated_at: _now() });
        return { success: true };
    },

    // ===== 待办事项 =====

    getTasks: async function(filters) {
        var params = { order: 'created_at.asc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        var tasks = await _select('tasks', params);
        var [centers, projects] = await Promise.all([
            _select('centers', { select: 'id,name,code' }),
            _select('projects', { select: 'id,name' })
        ]);
        var result = tasks.map(function(t) {
            var c = centers.find(function(x) { return x.id === t.center_id; });
            var p = projects.find(function(x) { return x.id === t.project_id; });
            var centerName = c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '';
            return Object.assign({}, t, {
                center_name: centerName,
                project_name: p ? p.name : ''
            });
        });
        return { success: true, tasks: result };
    },

    createTask: async function(data) {
        var id = data.id || _genId();
        var row = {
            id: id, title: data.title || '', project_id: data.project_id || '',
            center_id: data.center_id || '', priority: data.priority || 'medium',
            ability_type: data.ability_type || 'execution', due_date: data.due_date || '',
            done: data.done || false, task_status: data.task_status || 'pending',
            estimated_minutes: data.estimated_minutes || null,
            started_at: data.started_at || '',
            created_at: _now()
        };
        try {
            await _insert('tasks', row);
        } catch (err) {
            if (!_isMissingTaskPlanningColumn(err)) throw err;
            window._taskPlanningColumnsMissing = true;
            await _insert('tasks', _stripTaskPlanningFields(row));
        }
        return { success: true, id: id };
    },

    updateTask: async function(id, data) {
        var update = {};
        ['title', 'project_id', 'center_id', 'priority', 'ability_type',
         'due_date', 'done', 'task_status', 'estimated_minutes', 'started_at'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        try {
            await _update('tasks', id, update);
        } catch (err) {
            if (!_isMissingTaskPlanningColumn(err)) throw err;
            window._taskPlanningColumnsMissing = true;
            await _update('tasks', id, _stripTaskPlanningFields(update));
        }
        return { success: true };
    },

    deleteTask: async function(id) {
        return _delete('tasks', id);
    },

    // ===== 监查问题 =====

    getFindings: async function(filters) {
        var params = { order: 'created_at.asc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        var findings = await _select('findings', params);
        var [centers, projects] = await Promise.all([
            _select('centers', { select: 'id,name,code' }),
            _select('projects', { select: 'id,name' })
        ]);
        var result = findings.map(function(f) {
            var c = centers.find(function(x) { return x.id === f.center_id; });
            var p = projects.find(function(x) { return x.id === f.project_id; });
            return Object.assign({}, f, {
                center_name: c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '',
                project_name: p ? p.name : ''
            });
        });
        return { success: true, findings: result };
    },

    getFinding: async function(id) {
        var f = await _selectOne('findings', id);
        if (!f) return { success: false, error: '问题不存在' };
        return { success: true, finding: f };
    },

    createFinding: async function(data) {
        var id = _genId();
        await _insert('findings', {
            id: id, project_id: data.project_id || '', center_id: data.center_id || '',
            category: data.category || '', description: data.description || '',
            severity: data.severity || 'Minor', status: data.status || 'Open',
            found_date: data.found_date || '', due_date: data.due_date || '',
            corrective_action: data.corrective_action || '',
            finding_number: data.finding_number || '',
            created_at: _now(), updated_at: _now()
        });
        return { success: true, id: id };
    },

    updateFinding: async function(id, data) {
        var update = { updated_at: _now() };
        ['project_id', 'center_id', 'category', 'description', 'severity',
         'status', 'found_date', 'due_date', 'corrective_action', 'finding_number'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('findings', id, update);
        return { success: true };
    },

    deleteFinding: async function(id) {
        return _delete('findings', id);
    },

    getFindingsStats: async function() {
        var findings = await _select('findings');
        var today = _todayStr();
        var byStatus = {};
        findings.forEach(function(f) {
            byStatus[f.status] = (byStatus[f.status] || 0) + 1;
        });
        var overdue = findings.filter(function(f) {
            return f.due_date && f.due_date < today && !['Resolved', 'Closed'].includes(f.status);
        }).length;
        return {
            success: true,
            stats: { total: findings.length, by_status: byStatus, overdue: overdue }
        };
    },

    // ===== 研究人员 =====

    getStaff: async function(centerId) {
        var params = { order: 'created_at.asc' };
        if (centerId) params.center_id = 'eq.' + centerId;
        var staff = await _select('research_staff', params);
        return { success: true, staff: staff };
    },

    getStaffMember: async function(id) {
        var s = await _selectOne('research_staff', id);
        if (!s) return { success: false, error: '人员不存在' };
        return { success: true, staff: s };
    },

    createStaff: async function(data) {
        var id = _genId();
        await _insert('research_staff', {
            id: id, center_id: data.center_id || '', project_id: data.project_id || '',
            name: data.name || '', initials: data.initials || '', role: data.role || '',
            phone: data.phone || '', email: data.email || '',
            auth_date: data.auth_date || '',
            cv_collected: data.cv_collected || false, cv_date: data.cv_date || '',
            gcp_collected: data.gcp_collected || false, gcp_date: data.gcp_date || '',
            license_collected: data.license_collected || false, license_date: data.license_date || '',
            created_at: _now()
        });
        return { success: true, id: id };
    },

    updateStaff: async function(id, data) {
        var update = {};
        ['center_id', 'project_id', 'name', 'initials', 'role', 'phone', 'email',
         'auth_date', 'cv_collected', 'cv_date', 'gcp_collected', 'gcp_date',
         'license_collected', 'license_date'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('research_staff', id, update);
        return { success: true };
    },

    deleteStaff: async function(id) {
        return _delete('research_staff', id);
    },

    // ===== 培训管理 =====

    getTrainingPlans: async function(filters) {
        var params = { order: 'created_at.desc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        try {
            var plans = await _select('training_plans', params);
            var [projects, centers, records] = await Promise.all([
                _select('projects', { select: 'id,name,code' }),
                _select('centers', { select: 'id,name,code,project_id' }),
                _select('training_records', { order: 'created_at.asc' })
            ]);
            var result = plans.map(function(plan) {
                var p = projects.find(function(x) { return x.id === plan.project_id; });
                var c = centers.find(function(x) { return x.id === plan.center_id; });
                var planRecords = records.filter(function(r) { return r.training_plan_id === plan.id; });
                var required = planRecords.filter(function(r) { return r.required !== false; });
                var done = required.filter(function(r) { return r.status === '已完成' || r.status === '无需培训'; });
                return Object.assign({}, plan, {
                    project_name: p ? p.name : '',
                    project_code: p ? p.code : '',
                    center_name: c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '',
                    center_code: c ? c.code : '',
                    records: planRecords,
                    required_count: required.length,
                    completed_count: done.length,
                    completion_rate: required.length ? Math.round(done.length / required.length * 100) : 0
                });
            });
            return { success: true, plans: result };
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: true, plans: [], missingTable: true };
        }
    },

    getTrainingPlan: async function(id) {
        try {
            var plan = await _selectOne('training_plans', id);
            if (!plan) return { success: false, error: '培训计划不存在' };
            var [projects, centers, records] = await Promise.all([
                _select('projects', { select: 'id,name,code,full_name' }),
                _select('centers', { select: 'id,name,code,project_id' }),
                _select('training_records', { training_plan_id: 'eq.' + id, order: 'created_at.asc' })
            ]);
            var p = projects.find(function(x) { return x.id === plan.project_id; });
            var c = centers.find(function(x) { return x.id === plan.center_id; });
            return {
                success: true,
                plan: Object.assign({}, plan, {
                    project_name: p ? p.name : '',
                    project_code: p ? p.code : '',
                    project_full_name: p ? (p.full_name || p.name || '') : '',
                    center_name: c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '',
                    center_code: c ? c.code : '',
                    records: records
                })
            };
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: false, error: '培训管理表尚未创建，请先执行 supabase/training_management.sql' };
        }
    },

    createTrainingPlan: async function(data) {
        var id = _genId();
        try {
            await _insert('training_plans', {
                id: id,
                project_id: data.project_id || '',
                center_id: data.center_id || '',
                project_document_id: data.project_document_id || '',
                title: data.title || '',
                training_type: data.training_type || '其他',
                scope: data.scope || '',
                due_date: data.due_date || '',
                status: data.status || '进行中',
                doc_category_snapshot: data.doc_category_snapshot || '',
                doc_name_snapshot: data.doc_name_snapshot || '',
                version_snapshot: data.version_snapshot || '',
                version_date_snapshot: data.version_date_snapshot || '',
                notes: data.notes || '',
                created_at: _now(),
                updated_at: _now()
            });
            var staff = data.staff || [];
            for (var i = 0; i < staff.length; i++) {
                await _insert('training_records', {
                    id: _genId(),
                    training_plan_id: id,
                    project_id: data.project_id || '',
                    center_id: data.center_id || '',
                    staff_id: staff[i].id || '',
                    staff_name_snapshot: staff[i].name || '',
                    staff_role_snapshot: staff[i].role || '',
                    required: staff[i].required !== false,
                    status: staff[i].status || '未开始',
                    training_date: staff[i].training_date || '',
                    evidence_collected: !!staff[i].evidence_collected,
                    evidence_file_path: staff[i].evidence_file_path || '',
                    notes: staff[i].notes || '',
                    created_at: _now(),
                    updated_at: _now()
                });
            }
            return { success: true, id: id };
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: false, error: '培训管理表尚未创建，请先执行 supabase/training_management.sql' };
        }
    },

    updateTrainingPlan: async function(id, data) {
        try {
            var update = { updated_at: _now() };
            ['title', 'training_type', 'scope', 'due_date', 'status', 'notes'].forEach(function(f) {
                if (f in data) update[f] = data[f];
            });
            await _update('training_plans', id, update);
            return { success: true };
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: false, error: '培训管理表尚未创建，请先执行 supabase/training_management.sql' };
        }
    },

    updateTrainingRecord: async function(id, data) {
        try {
            var record = await _selectOne('training_records', id);
            if (!record) return { success: false, error: '培训记录不存在' };
            var update = { updated_at: _now() };
            ['status', 'training_date', 'evidence_collected', 'evidence_file_path', 'notes'].forEach(function(f) {
                if (f in data) update[f] = data[f];
            });
            if ('evidence_collected' in update) update.evidence_collected = !!update.evidence_collected;
            await _update('training_records', id, update);

            var records = await _select('training_records', { training_plan_id: 'eq.' + record.training_plan_id });
            var required = records.filter(function(r) { return r.required !== false; });
            var done = required.filter(function(r) {
                var status = r.id === id && update.status ? update.status : r.status;
                return status === '已完成' || status === '无需培训';
            });
            var needsFollowup = records.some(function(r) {
                var status = r.id === id && update.status ? update.status : r.status;
                return status === '需跟进';
            });
            var planStatus = required.length && done.length === required.length ? '已完成' : (needsFollowup ? '需跟进' : '进行中');
            await _update('training_plans', record.training_plan_id, { status: planStatus, updated_at: _now() });
            return { success: true, plan_status: planStatus };
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: false, error: '培训管理表尚未创建，请先执行 supabase/training_management.sql' };
        }
    },

    deleteTrainingPlan: async function(id) {
        try {
            var records = await _select('training_records', { training_plan_id: 'eq.' + id });
            for (var i = 0; i < records.length; i++) {
                await _delete('training_records', records[i].id);
            }
            return await _delete('training_plans', id);
        } catch (err) {
            if (!_isMissingTrainingTables(err)) throw err;
            return { success: false, error: '培训管理表尚未创建，请先执行 supabase/training_management.sql' };
        }
    },

    // ===== 伦理递交 =====

    getEthics: async function(centerId) {
        var params = { order: 'created_at.asc' };
        if (centerId) params.center_id = 'eq.' + centerId;
        var ethics = await _select('ethics_submissions', params);
        return { success: true, ethics: ethics };
    },

    getEthicsSubmission: async function(id) {
        var e = await _selectOne('ethics_submissions', id);
        if (!e) return { success: false, error: '记录不存在' };
        return { success: true, ethics: e };
    },

    createEthics: async function(data) {
        var id = _genId();
        await _insert('ethics_submissions', {
            id: id, center_id: data.center_id || '', project_id: data.project_id || '',
            doc_type: data.doc_type || '', doc_name: data.doc_name || '',
            version: data.version || '', version_date: data.version_date || '',
            pi_sign_date: data.pi_sign_date || '',
            submission_date: data.submission_date || '',
            review_method: data.review_method || '', review_date: data.review_date || '',
            approval_date: data.approval_date || '',
            status: data.status || 'pending', notes: '',
            created_at: _now(), updated_at: _now()
        });
        return { success: true, id: id };
    },

    updateEthics: async function(id, data) {
        var update = { updated_at: _now() };
        ['center_id', 'project_id', 'doc_type', 'doc_name', 'version', 'version_date',
         'pi_sign_date', 'submission_date', 'review_method', 'review_date',
         'approval_date', 'status', 'notes'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('ethics_submissions', id, update);
        return { success: true };
    },

    deleteEthics: async function(id) {
        return _delete('ethics_submissions', id);
    },

    // ===== 方案偏离 =====

    getPDs: async function(centerId) {
        var params = { order: 'created_at.asc' };
        if (centerId) params.center_id = 'eq.' + centerId;
        var pds = await _select('protocol_deviations', params);
        return { success: true, pds: pds };
    },

    getPD: async function(id) {
        var pd = await _selectOne('protocol_deviations', id);
        if (!pd) return { success: false, error: '记录不存在' };
        return { success: true, pd: pd };
    },

    createPD: async function(data) {
        var id = _genId();
        await _insert('protocol_deviations', {
            id: id, center_id: data.center_id || '', project_id: data.project_id || '',
            pd_number: data.pd_number || '', severity: data.severity || 'Minor',
            description: data.description || '', violated_clause: data.violated_clause || '',
            occurred_date: data.occurred_date || '', discovered_date: data.discovered_date || '',
            reported_sponsor_date: data.reported_sponsor_date || '',
            reported_ethics_date: data.reported_ethics_date || '',
            subject_ids: data.subject_ids || '',
            corrective_action: data.corrective_action || '',
            status: data.status || 'Open', notes: '',
            created_at: _now(), updated_at: _now()
        });
        return { success: true, id: id };
    },

    updatePD: async function(id, data) {
        var update = { updated_at: _now() };
        ['center_id', 'project_id', 'pd_number', 'severity', 'description',
         'violated_clause', 'occurred_date', 'discovered_date',
         'reported_sponsor_date', 'reported_ethics_date', 'subject_ids',
         'corrective_action', 'status', 'notes'].forEach(function(f) {
            if (f in data) update[f] = data[f];
        });
        await _update('protocol_deviations', id, update);
        return { success: true };
    },

    deletePD: async function(id) {
        return _delete('protocol_deviations', id);
    },

    // ===== 统计 =====

    getStats: async function() {
        var [projects, tasks, findings, centers] = await Promise.all([
            _select('projects', { select: 'id' }),
            _select('tasks'),
            _select('findings', { select: 'id,status' }),
            _select('centers', { select: 'id,name,code' })
        ]);
        var totalProjects = projects.length;
        var totalTasks = tasks.length;
        var doneTasks = tasks.filter(function(t) { return t.done; }).length;
        var pendingTasks = totalTasks - doneTasks;
        var today = _todayStr();
        var soonStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        var undone = tasks.filter(function(t) { return !t.done; });
        var overdue = undone.filter(function(t) { return t.due_date && t.due_date < today; }).length;
        var dueSoon = undone.filter(function(t) { return t.due_date && today <= t.due_date && t.due_date <= soonStr; }).length;
        var highPriority = undone.filter(function(t) { return t.priority === 'high'; }).length;
        var waitingCRC = tasks.filter(function(t) { return t.task_status === 'waiting_crc'; }).length;
        var totalFindings = findings.length;
        var openFindings = findings.filter(function(f) { return f.status === 'Open'; }).length;
        var activeProjects = 0;
        projects.forEach(function(p) {
            if (tasks.some(function(t) { return t.project_id === p.id && !t.done; })) activeProjects++;
        });
        var centerProgress = centers.map(function(c) {
            var cTasks = tasks.filter(function(t) { return t.center_id === c.id; });
            var cDone = cTasks.filter(function(t) { return t.done; }).length;
            var pct = cTasks.length > 0 ? Math.round(cDone / cTasks.length * 100) : 0;
            return { id: c.id, code: c.code || '', name: c.name, total: cTasks.length, done: cDone, pct: pct };
        });
        return {
            success: true,
            stats: {
                total_projects: totalProjects, active_projects: activeProjects,
                total_tasks: totalTasks, done_tasks: doneTasks, pending_tasks: pendingTasks,
                overdue_tasks: overdue, due_soon: dueSoon, high_priority: highPriority,
                waiting_crc_tasks: waitingCRC, total_findings: totalFindings,
                open_findings: openFindings, center_progress: centerProgress
            }
        };
    },

    // ===== 状态推荐 =====

    getStatus: async function() {
        var energy = localStorage.getItem('cra_energy') || 'medium';
        var calmness = localStorage.getItem('cra_calmness') || 'medium';
        return { success: true, energy: energy, calmness: calmness };
    },

    saveStatus: async function(data) {
        if (data.energy) localStorage.setItem('cra_energy', data.energy);
        if (data.calmness) localStorage.setItem('cra_calmness', data.calmness);
        return { success: true };
    },

    getRecommendations: async function() {
        var energy = localStorage.getItem('cra_energy') || 'medium';
        var calmness = localStorage.getItem('cra_calmness') || 'medium';
        // 推荐逻辑
        var recommendedTypes = [];
        var ranks = {};
        if (energy === 'high' && calmness === 'high') {
            recommendedTypes = ['deep_focus', 'communication', 'planning', 'execution', 'learning_review'];
            ranks = { deep_focus: 1, communication: 1, planning: 2, execution: 2, learning_review: 3 };
        } else if (energy === 'high' && calmness === 'medium') {
            recommendedTypes = ['deep_focus', 'communication', 'planning', 'execution'];
            ranks = { deep_focus: 1, communication: 2, planning: 2, execution: 3 };
        } else if (energy === 'high' && calmness === 'low') {
            recommendedTypes = ['communication', 'execution'];
            ranks = { communication: 1, execution: 2 };
        } else if (energy === 'medium' && calmness === 'high') {
            recommendedTypes = ['communication', 'planning', 'execution', 'learning_review'];
            ranks = { communication: 1, planning: 2, execution: 2, learning_review: 3 };
        } else if (energy === 'medium' && calmness === 'medium') {
            recommendedTypes = ['communication', 'planning', 'execution', 'learning_review'];
            ranks = { communication: 1, planning: 2, execution: 2, learning_review: 3 };
        } else if (energy === 'medium' && calmness === 'low') {
            recommendedTypes = ['execution', 'communication'];
            ranks = { execution: 1, communication: 2 };
        } else if (energy === 'low' && calmness === 'high') {
            recommendedTypes = ['planning', 'execution', 'learning_review'];
            ranks = { planning: 1, execution: 2, learning_review: 3 };
        } else if (energy === 'low' && calmness === 'medium') {
            recommendedTypes = ['execution', 'learning_review'];
            ranks = { execution: 1, learning_review: 2 };
        }
        // 获取任务
        var tasksData = await this.getTasks();
        var undone = (tasksData.tasks || []).filter(function(t) { return !t.done; });
        var recommended = undone.filter(function(t) {
            return recommendedTypes.includes(t.ability_type || 'execution');
        }).map(function(t) {
            return Object.assign({}, t, { recommend_rank: ranks[t.ability_type || 'execution'] || 3 });
        });
        var other = undone.filter(function(t) {
            return !recommendedTypes.includes(t.ability_type || 'execution');
        }).map(function(t) {
            return Object.assign({}, t, { recommend_rank: 3 });
        });
        // 排序：优先级 > 推荐等级 > 截止日期
        var prioOrder = { high: 0, medium: 1, low: 2 };
        var sortFn = function(a, b) {
            var pa = prioOrder[a.priority] || 1, pb = prioOrder[b.priority] || 1;
            if (pa !== pb) return pa - pb;
            if (a.recommend_rank !== b.recommend_rank) return a.recommend_rank - b.recommend_rank;
            return (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1;
        };
        recommended.sort(sortFn);
        other.sort(sortFn);
        return {
            success: true,
            recommended_tasks: recommended,
            other_tasks: other,
            recommended_types: recommendedTypes,
            recommend_ranks: ranks
        };
    },

    // ===== 启动任务 =====

    getStartupTasks: async function() {
        var tasks = await _select('startup_tasks', { order: 'created_at.asc' });
        return { success: true, tasks: tasks };
    },

    createStartupTask: async function(data) {
        var id = _genId();
        await _insert('startup_tasks', {
            id: id, name: data.name || '', description: data.description || '',
            done: false, created_at: _now()
        });
        return { success: true, id: id };
    },

    deleteStartupTask: async function(id) {
        return _delete('startup_tasks', id);
    },

    // ===== 启动任务日志 =====

    getStartupLogs: async function() {
        var logs = await _select('startup_logs', { order: 'executed_at.desc' });
        return { success: true, logs: logs };
    },

    createStartupLog: async function(data) {
        var id = _genId();
        await _insert('startup_logs', {
            id: id,
            startup_task_id: data.startup_task_id || '',
            startup_task_name: data.startup_task_name || '',
            target_task_id: data.target_task_id || '',
            target_task_name: data.target_task_name || '',
            calmness_before: data.calmness_before || 2,
            calmness_after: data.calmness_after || 2,
            duration_minutes: data.duration_minutes || 15,
            notes: data.notes || '',
            executed_at: _now()
        });
        return { success: true, id: id };
    },

    getStartupStats: async function() {
        var [logs, startupTasks] = await Promise.all([
            _select('startup_logs'),
            _select('startup_tasks')
        ]);
        var stats = startupTasks.map(function(st) {
            var stLogs = logs.filter(function(l) { return l.startup_task_id === st.id; });
            if (stLogs.length === 0) return null;
            var count = stLogs.length;
            var avgBefore = stLogs.reduce(function(s, l) { return s + (l.calmness_before || 0); }, 0) / count;
            var avgAfter = stLogs.reduce(function(s, l) { return s + (l.calmness_after || 0); }, 0) / count;
            var improved = stLogs.filter(function(l) { return l.calmness_after > l.calmness_before; }).length;
            var avgDuration = stLogs.reduce(function(s, l) { return s + (l.duration_minutes || 0); }, 0) / count;
            return {
                task_id: st.id, task_name: st.name, count: count,
                avg_calmness_before: avgBefore.toFixed(1),
                avg_calmness_after: avgAfter.toFixed(1),
                avg_improvement: (avgAfter - avgBefore).toFixed(1),
                improvement_rate: Math.round(improved / count * 100),
                avg_duration: Math.round(avgDuration)
            };
        }).filter(Boolean);
        return { success: true, stats: stats };
    },

    // ===== 中心伦理递交包 =====

    getEthicsSubmissionPackages: async function(filters) {
        var params = { order: 'created_at.desc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        try {
            var packages = await _select('ethics_submission_packages', params);
            var [projects, centers, items] = await Promise.all([
                _select('projects', { select: 'id,name,code' }),
                _select('centers', { select: 'id,name,code,project_id,ethics_committee_name,pi_name' }),
                _select('ethics_submission_package_items', { order: 'created_at.asc' })
            ]);
            var result = packages.map(function(pkg) {
                var p = projects.find(function(x) { return x.id === pkg.project_id; });
                var c = centers.find(function(x) { return x.id === pkg.center_id; });
                var pkgItems = items.filter(function(it) { return it.package_id === pkg.id; });
                return Object.assign({}, pkg, {
                    project_name: p ? p.name : '',
                    project_code: p ? p.code : '',
                    center_name: c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '',
                    center_code: c ? c.code : '',
                    ethics_committee: pkg.ethics_committee || (c ? (c.ethics_committee_name || '') : ''),
                    pi_name: c ? (c.pi_name || '') : '',
                    items: pkgItems
                });
            });
            return { success: true, packages: result };
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: true, packages: [], missingTable: true };
        }
    },

    getEthicsSubmissionPackage: async function(id) {
        try {
            var pkg = await _selectOne('ethics_submission_packages', id);
            if (!pkg) return { success: false, error: '递交包不存在' };
            var items = await _select('ethics_submission_package_items', { package_id: 'eq.' + id, order: 'created_at.asc' });
            return { success: true, package: Object.assign({}, pkg, { items: items }) };
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: false, error: '递交包表尚未创建，请先执行 supabase/ethics_submission_packages.sql' };
        }
    },

    createEthicsSubmissionPackage: async function(data) {
        var id = _genId();
        try {
            await _insert('ethics_submission_packages', {
                id: id,
                project_id: data.project_id || '',
                center_id: data.center_id || '',
                package_name: data.package_name || '',
                source_type: data.source_type || '项目文件更新',
                received_date: data.received_date || '',
                due_date: data.due_date || '',
                review_type: data.review_type || '待确认',
                status: data.status || '待准备',
                cta_to_pi_status: data.cta_to_pi_status || '未生成',
                pi_to_ec_status: data.pi_to_ec_status || '未生成',
                sent_to_center_date: data.sent_to_center_date || '',
                pi_signed_date: data.pi_signed_date || '',
                ec_submitted_date: data.ec_submitted_date || '',
                ec_received_date: data.ec_received_date || '',
                approval_received_date: data.approval_received_date || '',
                receipt_received_date: data.receipt_received_date || '',
                payment_required: !!data.payment_required,
                fee_status: data.fee_status || '不适用',
                ethics_committee: data.ethics_committee || '',
                notes: data.notes || '',
                created_at: _now(),
                updated_at: _now()
            });
            if (data.items && data.items.length) {
                for (var i = 0; i < data.items.length; i++) {
                    await _insert('ethics_submission_package_items', {
                        id: _genId(),
                        package_id: id,
                        project_document_id: data.items[i].project_document_id || '',
                        doc_category: data.items[i].doc_category || '',
                        doc_name: data.items[i].doc_name || '',
                        version: data.items[i].version || '',
                        version_date: data.items[i].version_date || '',
                        copies: data.items[i].copies || 1,
                        created_at: _now()
                    });
                }
            }
            return { success: true, id: id };
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: false, error: '递交包表尚未创建，请先执行 supabase/ethics_submission_packages.sql' };
        }
    },

    updateEthicsSubmissionPackage: async function(id, data) {
        try {
            await _update('ethics_submission_packages', id, {
                project_id: data.project_id || '',
                center_id: data.center_id || '',
                package_name: data.package_name || '',
                source_type: data.source_type || '项目文件更新',
                received_date: data.received_date || '',
                due_date: data.due_date || '',
                review_type: data.review_type || '待确认',
                status: data.status || '待准备',
                cta_to_pi_status: data.cta_to_pi_status || '未生成',
                pi_to_ec_status: data.pi_to_ec_status || '未生成',
                sent_to_center_date: data.sent_to_center_date || '',
                pi_signed_date: data.pi_signed_date || '',
                ec_submitted_date: data.ec_submitted_date || '',
                ec_received_date: data.ec_received_date || '',
                approval_received_date: data.approval_received_date || '',
                receipt_received_date: data.receipt_received_date || '',
                payment_required: !!data.payment_required,
                fee_status: data.fee_status || '不适用',
                ethics_committee: data.ethics_committee || '',
                notes: data.notes || '',
                updated_at: _now()
            });
            if (data.items) {
                var existing = await _select('ethics_submission_package_items', { package_id: 'eq.' + id });
                for (var i = 0; i < existing.length; i++) {
                    await _delete('ethics_submission_package_items', existing[i].id);
                }
                for (var j = 0; j < data.items.length; j++) {
                    await _insert('ethics_submission_package_items', {
                        id: _genId(),
                        package_id: id,
                        project_document_id: data.items[j].project_document_id || '',
                        doc_category: data.items[j].doc_category || '',
                        doc_name: data.items[j].doc_name || '',
                        version: data.items[j].version || '',
                        version_date: data.items[j].version_date || '',
                        copies: data.items[j].copies || 1,
                        created_at: _now()
                    });
                }
            }
            return { success: true };
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: false, error: '递交包表尚未创建，请先执行 supabase/ethics_submission_packages.sql' };
        }
    },

    deleteEthicsSubmissionPackage: async function(id) {
        try {
            var items = await _select('ethics_submission_package_items', { package_id: 'eq.' + id });
            for (var i = 0; i < items.length; i++) {
                await _delete('ethics_submission_package_items', items[i].id);
            }
            return await _delete('ethics_submission_packages', id);
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: false, error: '递交包表尚未创建，请先执行 supabase/ethics_submission_packages.sql' };
        }
    },

    createEthicsLettersFromPackage: async function(packageId) {
        try {
            var pkg = await _selectOne('ethics_submission_packages', packageId);
            if (!pkg) return { success: false, error: '递交包不存在' };
            var pkgItems = await _select('ethics_submission_package_items', { package_id: 'eq.' + packageId, order: 'created_at.asc' });
            if (!pkgItems.length) return { success: false, error: '递交包没有文件清单，无法生成递交信' };

            var marker = '递交包ID:' + packageId;
            var existingLetters = await _select('ethics_letters', {
                project_id: 'eq.' + (pkg.project_id || ''),
                center_id: 'eq.' + (pkg.center_id || '')
            });
            var existingByType = {};
            existingLetters.forEach(function(letter) {
                if ((letter.notes || '').indexOf(marker) >= 0) {
                    existingByType[letter.letter_type || 'CRA_to_PI'] = letter;
                }
            });

            var itemData = pkgItems.map(function(item) {
                return {
                    doc_type: item.doc_category || '',
                    doc_name: item.doc_name || '',
                    version: item.version || '',
                    version_date: item.version_date || '',
                    copies: item.copies || 1,
                    notes: ''
                };
            });
            var noteParts = [
                '由中心递交包自动生成：' + (pkg.package_name || ''),
                marker
            ];
            if (pkg.notes) noteParts.push(pkg.notes);
            var baseData = {
                project_id: pkg.project_id || '',
                center_id: pkg.center_id || '',
                submission_date: _todayStr(),
                submitter_name: '',
                submitter_phone: '',
                submit_method: '快递',
                tracking_number: '',
                ethics_committee: pkg.ethics_committee || '',
                notes: noteParts.join('\n'),
                items: itemData
            };
            var resultLetters = [];
            var types = ['CRA_to_PI', 'PI_to_Ethics'];
            for (var i = 0; i < types.length; i++) {
                var type = types[i];
                if (existingByType[type]) {
                    resultLetters.push({ type: type, id: existingByType[type].id, created: false });
                    continue;
                }
                var created = await this.createEthicsLetter(Object.assign({}, baseData, { letter_type: type }));
                resultLetters.push({ type: type, id: created.id, created: true });
            }

            var keepAdvancedStatus = function(value) {
                return value && value !== '未生成' ? value : '已生成';
            };
            await _update('ethics_submission_packages', packageId, {
                cta_to_pi_status: keepAdvancedStatus(pkg.cta_to_pi_status),
                pi_to_ec_status: keepAdvancedStatus(pkg.pi_to_ec_status),
                updated_at: _now()
            });

            return {
                success: true,
                package_id: packageId,
                package_name: pkg.package_name || '',
                letters: resultLetters,
                created_count: resultLetters.filter(function(x) { return x.created; }).length
            };
        } catch (err) {
            if (!_isMissingEthicsPackagesTable(err)) throw err;
            return { success: false, error: '递交包表尚未创建，请先执行 supabase/ethics_submission_packages.sql' };
        }
    },

    // ===== 伦理递交信批次 =====

    getEthicsLetters: async function(filters) {
        var params = { order: 'created_at.desc' };
        if (filters) {
            if (filters.project_id) params.project_id = 'eq.' + filters.project_id;
            if (filters.center_id) params.center_id = 'eq.' + filters.center_id;
        }
        var letters = await _select('ethics_letters', params);
        var [projects, centers, items] = await Promise.all([
            _select('projects', { select: 'id,name,code,full_name' }),
            _select('centers', { select: 'id,name,code,ethics_committee_name' }),
            _select('ethics_letter_items', { order: 'created_at.asc' })
        ]);
        var result = letters.map(function(l) {
            var p = projects.find(function(x) { return x.id === l.project_id; });
            var c = centers.find(function(x) { return x.id === l.center_id; });
            var lItems = items.filter(function(it) { return it.letter_id === l.id; });
            return Object.assign({}, l, {
                project_name: p ? p.name : '',
                project_code: p ? p.code : '',
                project_full_name: p ? (p.full_name || p.name || '') : '',
                center_name: c ? ((c.code || '') + ' ' + (c.name || '')).trim() : '',
                center_code: c ? c.code : '',
                ethics_committee: l.ethics_committee || (c ? (c.ethics_committee_name || '') : ''),
                items: lItems
            });
        });
        return { success: true, letters: result };
    },

    getEthicsLetter: async function(id) {
        var letter = await _selectOne('ethics_letters', id);
        if (!letter) return { success: false, error: '递交信不存在' };
        var [projects, centers, items] = await Promise.all([
            _select('projects', { select: 'id,name,code,full_name,approval_number,sponsor,cro_name' }),
            _select('centers', { select: 'id,name,code,pi_name,pi_phone,contact_ethics,ethics_committee_name' }),
            _select('ethics_letter_items', { letter_id: 'eq.' + id, order: 'created_at.asc' })
        ]);
        var p = projects.find(function(x) { return x.id === letter.project_id; });
        var c = centers.find(function(x) { return x.id === letter.center_id; });
        return {
            success: true,
            letter: Object.assign({}, letter, {
                project_name: p ? p.name : '',
                project_code: p ? p.code : '',
                project_full_name: p ? (p.full_name || p.name || '') : '',
                approval_number: p ? (p.approval_number || '') : '',
                sponsor: p ? (p.sponsor || '') : '',
                cro_name: p ? (p.cro_name || '') : '',
                center_name: c ? c.name : '',
                center_code: c ? c.code : '',
                pi_name: c ? (c.pi_name || '') : '',
                pi_phone: c ? (c.pi_phone || '') : '',
                contact_ethics: c ? (c.contact_ethics || '') : '',
                ethics_committee: letter.ethics_committee || (c ? (c.ethics_committee_name || '') : ''),
                items: items
            })
        };
    },

    createEthicsLetter: async function(data) {
        var id = _genId();
        await _insert('ethics_letters', {
            id: id,
            project_id: data.project_id || '',
            center_id: data.center_id || '',
            letter_type: data.letter_type || 'CRA_to_PI',
            submission_date: data.submission_date || '',
            submitter_name: data.submitter_name || '',
            submitter_phone: data.submitter_phone || '',
            submit_method: data.submit_method || '快递',
            tracking_number: data.tracking_number || '',
            ethics_committee: data.ethics_committee || '',
            notes: data.notes || '',
            created_at: _now(), updated_at: _now()
        });
        if (data.items && data.items.length) {
            for (var i = 0; i < data.items.length; i++) {
                var itemId = _genId();
                await _insert('ethics_letter_items', {
                    id: itemId, letter_id: id,
                    doc_type: data.items[i].doc_type || '',
                    doc_name: data.items[i].doc_name || '',
                    version: data.items[i].version || '',
                    version_date: data.items[i].version_date || '',
                    copies: data.items[i].copies || 1,
                    notes: data.items[i].notes || '',
                    created_at: _now()
                });
            }
        }
        return { success: true, id: id };
    },

    updateEthicsLetter: async function(id, data) {
        await _update('ethics_letters', id, {
            project_id: data.project_id, center_id: data.center_id,
            letter_type: data.letter_type || 'CRA_to_PI',
            submission_date: data.submission_date,
            submitter_name: data.submitter_name,
            submitter_phone: data.submitter_phone,
            submit_method: data.submit_method,
            tracking_number: data.tracking_number,
            ethics_committee: data.ethics_committee,
            notes: data.notes,
            updated_at: _now()
        });
        if (data.items) {
            var existing = await _select('ethics_letter_items', { letter_id: 'eq.' + id });
            for (var i = 0; i < existing.length; i++) {
                await _delete('ethics_letter_items', existing[i].id);
            }
            for (var j = 0; j < data.items.length; j++) {
                var itemId = _genId();
                await _insert('ethics_letter_items', {
                    id: itemId, letter_id: id,
                    doc_type: data.items[j].doc_type || '',
                    doc_name: data.items[j].doc_name || '',
                    version: data.items[j].version || '',
                    version_date: data.items[j].version_date || '',
                    copies: data.items[j].copies || 1,
                    notes: data.items[j].notes || '',
                    created_at: _now()
                });
            }
        }
        return { success: true };
    },

    deleteEthicsLetter: async function(id) {
        var items = await _select('ethics_letter_items', { letter_id: 'eq.' + id });
        for (var i = 0; i < items.length; i++) {
            await _delete('ethics_letter_items', items[i].id);
        }
        return _delete('ethics_letters', id);
    },

    // ===== 伦理模板管理 =====

    getEthicsTemplates: async function() {
        var templates = await _select('ethics_templates', { order: 'created_at.desc' });
        return { success: true, templates: templates };
    },

    uploadEthicsTemplate: async function(file, name, description, letterType) {
        var id = _genId();
        var filePath = 'ethics-letters/' + id + '/' + encodeURIComponent(file.name);
        var uploadUrl = SB_URL + '/storage/v1/object/templates/' + filePath;
        var res = await fetch(uploadUrl, {
            method: 'POST',
            headers: _headers({ 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
            body: file
        });
        if (!res.ok && res.status !== 409) throw new Error('Upload failed: ' + await res.text());
        var insertData = {
            id: id, name: name || file.name, file_path: filePath,
            description: description || '', is_default: false,
            created_at: _now()
        };
        if (letterType) insertData.letter_type = letterType;
        await _insert('ethics_templates', insertData);
        return { success: true, id: id };
    },

    deleteEthicsTemplate: async function(id) {
        var tmpl = await _selectOne('ethics_templates', id);
        if (tmpl) {
            var delUrl = SB_URL + '/storage/v1/object/templates/' + tmpl.file_path;
            await fetch(delUrl, { method: 'DELETE', headers: _headers() });
        }
        return _delete('ethics_templates', id);
    },

    setDefaultTemplate: async function(id) {
        var templates = await _select('ethics_templates');
        for (var i = 0; i < templates.length; i++) {
            await _update('ethics_templates', templates[i].id, { is_default: templates[i].id === id });
        }
        return { success: true };
    },

    downloadTemplate: async function(filePath) {
        var url = SB_URL + '/storage/v1/object/public/templates/' + filePath;
        var res = await fetch(url);
        if (!res.ok) throw new Error('下载模板失败: ' + res.status);
        return await res.arrayBuffer();
    },

    // ===== 导出 Excel =====

    exportExcel: async function(type) {
        var wb = XLSX.utils.book_new();
        if (type === 'tasks' || type === 'all') {
            var tasksData = await _select('tasks', { order: 'created_at.asc' });
            var wsData = [['ID', '标题', '项目ID', '中心ID', '优先级', '能力类型', '截止日期', '预计耗时(分钟)', '任务状态', '是否完成', '开始时间', '创建时间']];
            tasksData.forEach(function(t) {
                wsData.push([t.id, t.title, t.project_id, t.center_id, t.priority, t.ability_type, t.due_date, t.estimated_minutes || '', t.task_status || '', t.done ? '已完成' : '待办', t.started_at || '', t.created_at]);
            });
            var ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, '待办事项');
        }
        if (type === 'findings' || type === 'all') {
            var fData = await _select('findings', { order: 'created_at.asc' });
            var fWsData = [['ID', '项目', '中心', '分类', '描述', '严重程度', '状态', '发现日期', '截止日期', '纠正措施']];
            fData.forEach(function(f) {
                fWsData.push([f.id, f.project_id, f.center_id, f.category, f.description, f.severity, f.status, f.found_date, f.due_date, f.corrective_action]);
            });
            var fWs = XLSX.utils.aoa_to_sheet(fWsData);
            XLSX.utils.book_append_sheet(wb, fWs, '监查问题');
        }
        if (type === 'centers' || type === 'all') {
            var cData = await _select('centers', { order: 'created_at.asc' });
            var cWsData = [['ID', '项目ID', '编号', '名称', 'PI', 'PI电话', 'CRC', 'CRC电话', '地址', '备注']];
            cData.forEach(function(c) {
                cWsData.push([c.id, c.project_id, c.code, c.name, c.pi_name, c.pi_phone, c.contact_crc, c.contact_crc_phone, c.address, c.notes]);
            });
            var cWs = XLSX.utils.aoa_to_sheet(cWsData);
            XLSX.utils.book_append_sheet(wb, cWs, '中心信息');
        }
        if (type === 'projects' || type === 'all') {
            var pData = await _select('projects', { order: 'created_at.asc' });
            var pWsData = [['ID', '名称', '编号', '阶段', 'DBL日期', '备注', '创建时间']];
            pData.forEach(function(p) {
                pWsData.push([p.id, p.name, p.code, p.stage, p.dbl_date, p.notes, p.created_at]);
            });
            var pWs = XLSX.utils.aoa_to_sheet(pWsData);
            XLSX.utils.book_append_sheet(wb, pWs, '项目信息');
        }
        var filename = 'cra-portal-' + type + '-' + _todayStr() + '.xlsx';
        XLSX.writeFile(wb, filename);
    },

    // ===== 数据备份 =====

    backup: async function() {
        var tables = ['projects', 'centers', 'tasks', 'findings',
            'ethics_submissions', 'protocol_deviations', 'research_staff',
            'startup_tasks', 'startup_logs', 'training_plans', 'training_records'];
        var backup = { backup_time: _now(), data: {} };
        for (var i = 0; i < tables.length; i++) {
            try {
                backup.data[tables[i]] = await _select(tables[i]);
            } catch (e) {
                backup.data[tables[i]] = [];
            }
        }
        var json = JSON.stringify(backup, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cra-portal-backup-' + _todayStr() + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
};
