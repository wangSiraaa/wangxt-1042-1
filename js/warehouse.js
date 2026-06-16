// 仓位图页面

const WarehousePage = {
    selectedPosition: null,

    init() {
    },

    refresh() {
        this.renderWarehouseMap();
        if (this.selectedPosition) {
            this.renderPositionDetail(this.selectedPosition);
        }
    },

    // 渲染仓库仓位图
    renderWarehouseMap() {
        const mapEl = document.getElementById('warehouseMap');
        if (!mapEl) return;

        const positions = dataManager.getPositions();

        mapEl.innerHTML = positions.map(p => {
            const detail = dataManager.getPositionDetail(p.code);
            const statusClass = getPositionStatus(detail);
            const isSelected = this.selectedPosition === p.code;

            return `
                <div class="position-cell status-${statusClass} ${isSelected ? 'selected' : ''}" 
                     onclick="WarehousePage.selectPosition('${p.code}')"
                     title="${p.name}">
                    ${detail && detail.totalLocked > 0 ? '<span class="lock-icon">🔒</span>' : ''}
                    <div class="pos-code">${p.code}</div>
                    <div class="pos-name">${p.name}</div>
                    <div class="pos-capacity">
                        ${detail ? `${detail.totalUsed}/${p.capacity}` : '0/' + p.capacity}
                    </div>
                </div>
            `;
        }).join('');
    },

    // 选择仓位
    selectPosition(code) {
        this.selectedPosition = code;
        this.renderWarehouseMap();
        this.renderPositionDetail(code);
    },

    // 渲染仓位详情
    renderPositionDetail(code) {
        const detailEl = document.getElementById('positionDetail');
        if (!detailEl) return;

        const detail = dataManager.getPositionDetail(code);
        if (!detail) {
            detailEl.innerHTML = '<div class="empty-tip">仓位不存在</div>';
            return;
        }

        const usageRate = parseFloat(detail.usageRate);
        const capacityClass = getCapacityClass(usageRate);
        const statusClass = getPositionStatus(detail);

        const role = dataManager.getCurrentRole();

        detailEl.innerHTML = `
            <div class="detail-section">
                <h4>仓位信息</h4>
                <div class="detail-row">
                    <span class="label">仓位编号</span>
                    <span class="value"><strong>${detail.code}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="label">仓位名称</span>
                    <span class="value">${detail.name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">所属分类</span>
                    <span class="value">${detail.category}</span>
                </div>
            </div>

            <div class="detail-section">
                <h4>容量情况</h4>
                <div class="detail-row">
                    <span class="label">总容量</span>
                    <span class="value">${detail.capacity} 件</span>
                </div>
                <div class="detail-row">
                    <span class="label">已使用</span>
                    <span class="value">${detail.totalUsed} 件</span>
                </div>
                <div class="detail-row">
                    <span class="label">已锁定</span>
                    <span class="value" style="color: #722ed1;">${detail.totalLocked} 件</span>
                </div>
                <div class="detail-row">
                    <span class="label">可用容量</span>
                    <span class="value" style="color: #52c41a;">${detail.available} 件</span>
                </div>
                <div class="capacity-bar">
                    <div class="capacity-fill ${capacityClass}" style="width: ${Math.min(usageRate, 100)}%;"></div>
                </div>
                <div style="font-size: 11px; color: #8c8c8c; text-align: right; margin-top: 2px;">
                    使用率: ${usageRate}%
                </div>
            </div>

            <div class="detail-section">
                <h4>库存物资 (${detail.materials.length} 个批次)</h4>
                ${detail.materials.length === 0 ? `
                    <div class="empty-tip" style="padding: 20px;">暂无物资</div>
                ` : detail.materials.map(m => {
                    const matStatus = getMaterialStatus(m);
                    const today = new Date();
                    const expireDate = new Date(m.expireDate);
                    const daysLeft = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
                    
                    return `
                        <div class="material-batch-item" onclick="DashboardPage.viewMaterial('${m.id}')">
                            <div class="batch-head">
                                <span class="batch-name">${m.name}</span>
                                ${getStatusTag(matStatus)}
                            </div>
                            <div class="batch-info">
                                <span>批次: ${m.batchNo}</span>
                                <span>库存: ${m.totalQty}${m.unit}</span>
                            </div>
                            <div class="batch-info">
                                <span style="color: ${daysLeft <= 0 ? '#ff4d4f' : (daysLeft <= 30 ? '#faad14' : '#8c8c8c')};">
                                    效期: ${m.expireDate}
                                </span>
                                ${m.lockedQty > 0 ? `<span style="color: #722ed1;">锁定: ${m.lockedQty}</span>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${role === 'warehouse' ? `
                <div style="margin-top: 16px; display: flex; gap: 8px;">
                    <button class="btn btn-primary" onclick="WarehousePage.adjustPosition('${code}')">
                        📦 调整仓位
                    </button>
                    <button class="btn" onclick="WarehousePage.checkMaintenance('${code}')">
                        🔧 保养检查
                    </button>
                </div>
            ` : ''}
        `;
    },

    // 调整仓位（简单实现）
    adjustPosition(code) {
        Toast.info('仓位调整功能开发中...');
    },

    // 保养检查
    checkMaintenance(code) {
        const detail = dataManager.getPositionDetail(code);
        if (!detail || detail.materials.length === 0) {
            Toast.warning('该仓位暂无物资');
            return;
        }

        const content = `
            <p>对仓位 ${code} 的所有物资进行保养检查？</p>
            <p style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">
                检查后将更新"上次检查日期"为今天
            </p>
        `;

        Modal.show('保养检查', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '确认检查', 
                action: 'confirm', 
                class: 'btn-primary',
                onClick: () => {
                    const today = getToday();
                    detail.materials.forEach(m => {
                        dataManager.updateMaterial(m.id, { lastCheckDate: today });
                    });
                    Toast.success('保养检查完成');
                    Modal.close();
                    this.refresh();
                    if (window.app) window.app.refreshAll();
                }
            }
        ]);
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    WarehousePage.init();
});
