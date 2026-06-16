// 库存看板页面

const DashboardPage = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const searchInput = document.getElementById('materialSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.refresh(), 300));
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.refresh());
        }

        const addMaterialBtn = document.getElementById('addMaterialBtn');
        if (addMaterialBtn) {
            addMaterialBtn.addEventListener('click', () => this.showAddMaterialModal());
        }
    },

    refresh() {
        this.updateStats();
        this.updateMaterialTable();
        this.updateWarningList();
        this.updateRecentAllocations();
    },

    // 更新统计卡片
    updateStats() {
        const stats = dataManager.getStats();

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setValue('totalMaterials', stats.totalMaterials);
        setValue('availableCount', stats.availableCount);
        setValue('warningCount', stats.warningCount);
        setValue('expiringCount', stats.expiringCount);
        setValue('allocatedCount', stats.activeAllocations);
        setValue('lockedCount', stats.lockedCount);
    },

    // 更新物资表格
    updateMaterialTable() {
        const tbody = document.getElementById('materialTableBody');
        if (!tbody) return;

        const search = document.getElementById('materialSearch')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';

        const materials = dataManager.getMaterials({ search, category });

        if (materials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; color: #bfbfbf; padding: 40px;">
                        暂无物资数据
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = materials.map(m => {
            const statusClass = getMaterialStatus(m);
            const statusText = statusClass === 'danger' ? '异常' : (statusClass === 'warning' ? '预警' : '正常');
            const today = new Date();
            const expireDate = new Date(m.expireDate);
            const daysLeft = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
            const expireText = daysLeft <= 0 ? '已过期' : `还剩${daysLeft}天`;

            const role = dataManager.getCurrentRole();
            const showActions = role === 'warehouse';

            return `
                <tr>
                    <td><strong>${m.name}</strong></td>
                    <td><span class="status-tag info">${m.category}</span></td>
                    <td>${m.spec}</td>
                    <td><code style="font-size: 11px;">${m.batchNo}</code></td>
                    <td>
                        <div>${m.expireDate}</div>
                        <div style="font-size: 11px; color: ${daysLeft <= 0 ? '#ff4d4f' : (daysLeft <= 30 ? '#faad14' : '#8c8c8c')};">
                            ${expireText}
                        </div>
                    </td>
                    <td>${m.positionCode}</td>
                    <td>${m.totalQty} ${m.unit}</td>
                    <td><span style="color: #52c41a;">${m.availableQty}</span> ${m.unit}</td>
                    <td><span style="color: #722ed1;">${m.lockedQty}</span> ${m.unit}</td>
                    <td>${getStatusTag(m.maintenanceStatus, 'maintenance')}</td>
                    <td>${getStatusTag(m.availableQty > 0 ? statusClass : 'danger')}</td>
                    <td>
                        ${showActions ? `
                            <span class="action-link" onclick="DashboardPage.viewMaterial('${m.id}')">详情</span>
                            <span class="action-link" onclick="DashboardPage.editMaterial('${m.id}')">编辑</span>
                        ` : `
                            <span class="action-link" onclick="DashboardPage.viewMaterial('${m.id}')">查看</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // 更新预警列表
    updateWarningList() {
        const list = document.getElementById('warningList');
        if (!list) return;

        const warnings = dataManager.getWarnings();

        if (warnings.length === 0) {
            list.innerHTML = `
                <div class="empty-tip">
                    <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                    一切正常，暂无预警
                </div>
            `;
            return;
        }

        const topWarnings = warnings.slice(0, 8);
        list.innerHTML = topWarnings.map(w => `
            <div class="warning-item ${w.type}">
                <div class="warning-title">${w.title}</div>
                <div class="warning-desc">${w.desc}</div>
            </div>
        `).join('');
    },

    // 更新近期调拨
    updateRecentAllocations() {
        const list = document.getElementById('recentAllocationList');
        if (!list) return;

        const allocations = dataManager.getAllocations().slice(0, 6);

        if (allocations.length === 0) {
            list.innerHTML = `
                <div class="empty-tip">暂无调拨记录</div>
            `;
            return;
        }

        list.innerHTML = allocations.map(a => {
            const totalQty = a.items.reduce((sum, item) => sum + item.qty, 0);
            const statusInfo = ALLOCATION_STATUS[a.status] || { label: a.status, class: 'info' };
            return `
                <div class="recent-item" onclick="AllocationPage.viewDetail('${a.id}')">
                    <div class="recent-title">
                        <span>${a.billNo}</span>
                        <span class="status-tag ${statusInfo.class}">${statusInfo.label}</span>
                    </div>
                    <div class="recent-info">
                        <span>${a.community}</span>
                        <span>${totalQty} 件物资</span>
                    </div>
                    <div class="recent-info" style="margin-top: 4px;">
                        <span style="font-size: 11px;">${formatDate(a.applyTime, 'MM-DD HH:mm')}</span>
                        <span style="font-size: 11px;">${a.applicant}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // 查看物资详情
    viewMaterial(id) {
        const material = dataManager.getMaterial(id);
        if (!material) return;

        const statusInfo = getMaterialStatus(material);
        const maintenanceInfo = MAINTENANCE_STATUS[material.maintenanceStatus];
        const today = new Date();
        const expireDate = new Date(material.expireDate);
        const daysLeft = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));

        const content = `
            <div class="detail-section">
                <h4>基本信息</h4>
                <div class="detail-row"><span class="label">物资名称</span><span class="value">${material.name}</span></div>
                <div class="detail-row"><span class="label">类别</span><span class="value">${material.category}</span></div>
                <div class="detail-row"><span class="label">规格</span><span class="value">${material.spec}</span></div>
                <div class="detail-row"><span class="label">单位</span><span class="value">${material.unit}</span></div>
            </div>
            <div class="detail-section">
                <h4>批次信息</h4>
                <div class="detail-row"><span class="label">批次号</span><span class="value"><code>${material.batchNo}</code></span></div>
                <div class="detail-row"><span class="label">有效期至</span><span class="value" style="color: ${daysLeft <= 0 ? '#ff4d4f' : (daysLeft <= 30 ? '#faad14' : 'inherit')};">${material.expireDate} (${daysLeft <= 0 ? '已过期' : `剩余${daysLeft}天`})</span></div>
                <div class="detail-row"><span class="label">存放仓位</span><span class="value">${material.positionCode}</span></div>
            </div>
            <div class="detail-section">
                <h4>库存情况</h4>
                <div class="detail-row"><span class="label">总数量</span><span class="value">${material.totalQty} ${material.unit}</span></div>
                <div class="detail-row"><span class="label">可调拨数量</span><span class="value" style="color: #52c41a;">${material.availableQty} ${material.unit}</span></div>
                <div class="detail-row"><span class="label">已锁定数量</span><span class="value" style="color: #722ed1;">${material.lockedQty} ${material.unit}</span></div>
                <div class="detail-row"><span class="label">预警阈值</span><span class="value">${material.warningThreshold} ${material.unit}</span></div>
            </div>
            <div class="detail-section">
                <h4>保养状态</h4>
                <div class="detail-row"><span class="label">当前状态</span><span class="value">${getStatusTag(material.maintenanceStatus, 'maintenance')}</span></div>
                <div class="detail-row"><span class="label">上次检查</span><span class="value">${material.lastCheckDate}</span></div>
            </div>
        `;

        Modal.show('物资详情', content, [
            { text: '关闭', action: 'close', class: '' }
        ]);
    },

    // 编辑物资
    editMaterial(id) {
        const material = dataManager.getMaterial(id);
        if (!material) return;

        const positions = dataManager.getPositions();

        const content = `
            <form id="editMaterialForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>物资名称</label>
                        <input type="text" name="name" value="${material.name}" required>
                    </div>
                    <div class="form-group">
                        <label>类别</label>
                        <select name="category" required>
                            <option value="医疗急救" ${material.category === '医疗急救' ? 'selected' : ''}>医疗急救</option>
                            <option value="防汛物资" ${material.category === '防汛物资' ? 'selected' : ''}>防汛物资</option>
                            <option value="消防器材" ${material.category === '消防器材' ? 'selected' : ''}>消防器材</option>
                            <option value="生活物资" ${material.category === '生活物资' ? 'selected' : ''}>生活物资</option>
                            <option value="通讯设备" ${material.category === '通讯设备' ? 'selected' : ''}>通讯设备</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>规格</label>
                        <input type="text" name="spec" value="${material.spec}" required>
                    </div>
                    <div class="form-group">
                        <label>单位</label>
                        <input type="text" name="unit" value="${material.unit}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>批次号</label>
                        <input type="text" name="batchNo" value="${material.batchNo}" required>
                    </div>
                    <div class="form-group">
                        <label>有效期至</label>
                        <input type="date" name="expireDate" value="${material.expireDate}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>存放仓位</label>
                        <select name="positionCode" required>
                            ${positions.map(p => `<option value="${p.code}" ${material.positionCode === p.code ? 'selected' : ''}>${p.code} - ${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>总数量</label>
                        <input type="number" name="totalQty" value="${material.totalQty}" min="0" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>预警阈值</label>
                        <input type="number" name="warningThreshold" value="${material.warningThreshold}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label>保养状态</label>
                        <select name="maintenanceStatus">
                            <option value="good" ${material.maintenanceStatus === 'good' ? 'selected' : ''}>良好</option>
                            <option value="normal" ${material.maintenanceStatus === 'normal' ? 'selected' : ''}>一般</option>
                            <option value="bad" ${material.maintenanceStatus === 'bad' ? 'selected' : ''}>需维修</option>
                        </select>
                    </div>
                </div>
            </form>
        `;

        Modal.show('编辑物资', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '保存', 
                action: 'save', 
                class: 'btn-primary',
                onClick: () => {
                    const form = document.getElementById('editMaterialForm');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    data.totalQty = parseInt(data.totalQty);
                    data.warningThreshold = parseInt(data.warningThreshold);

                    const updated = dataManager.updateMaterial(id, data);
                    if (updated) {
                        Toast.success('物资信息更新成功');
                        Modal.close();
                        if (window.app) window.app.refreshAll();
                    } else {
                        Toast.error('更新失败');
                    }
                }
            }
        ]);
    },

    // 新增物资
    showAddMaterialModal() {
        const positions = dataManager.getPositions();

        const content = `
            <form id="addMaterialForm">
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>物资名称</label>
                        <input type="text" name="name" placeholder="如：医用外科口罩" required>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>类别</label>
                        <select name="category" required>
                            <option value="">请选择</option>
                            <option value="医疗急救">医疗急救</option>
                            <option value="防汛物资">防汛物资</option>
                            <option value="消防器材">消防器材</option>
                            <option value="生活物资">生活物资</option>
                            <option value="通讯设备">通讯设备</option>
                            <option value="工具设备">工具设备</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>规格</label>
                        <input type="text" name="spec" placeholder="如：50只/盒" required>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>单位</label>
                        <input type="text" name="unit" placeholder="如：盒、个、件" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>批次号</label>
                        <input type="text" name="batchNo" placeholder="如：YL20250601" required>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>有效期至</label>
                        <input type="date" name="expireDate" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>存放仓位</label>
                        <select name="positionCode" required>
                            <option value="">请选择仓位</option>
                            ${positions.map(p => `<option value="${p.code}">${p.code} - ${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>入库数量</label>
                        <input type="number" name="totalQty" min="1" placeholder="0" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>预警阈值</label>
                        <input type="number" name="warningThreshold" min="0" value="10" placeholder="低于此数量预警">
                    </div>
                    <div class="form-group">
                        <label>保养状态</label>
                        <select name="maintenanceStatus">
                            <option value="good">良好</option>
                            <option value="normal">一般</option>
                            <option value="bad">需维修</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea name="remark" placeholder="可填写备注信息..."></textarea>
                </div>
            </form>
        `;

        Modal.show('录入新物资', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '入库', 
                action: 'save', 
                class: 'btn-primary',
                onClick: () => {
                    const form = document.getElementById('addMaterialForm');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    data.totalQty = parseInt(data.totalQty) || 0;
                    data.warningThreshold = parseInt(data.warningThreshold) || 10;
                    data.lastCheckDate = getToday();

                    const newMaterial = dataManager.addMaterial(data);
                    if (newMaterial) {
                        Toast.success('物资入库成功');
                        Modal.close();
                        if (window.app) window.app.refreshAll();
                    } else {
                        Toast.error('入库失败');
                    }
                }
            }
        ]);
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    DashboardPage.init();
});
