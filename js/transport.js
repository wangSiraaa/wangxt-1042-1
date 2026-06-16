// 转运轨迹页面

const TransportPage = {
    init() {
    },

    refresh() {
        this.renderTimeline();
        this.updateMyTaskCount();
    },

    updateMyTaskCount() {
        const countEl = document.getElementById('myTaskCount');
        if (!countEl) return;
        
        const role = dataManager.getCurrentRole();
        let count = 0;
        
        if (role === 'volunteer') {
            count = dataManager.getMyTasks().length;
        } else if (role === 'receiver') {
            // 社区接收人查看待签收的
            const allocations = dataManager.getAllocations();
            count = allocations.filter(a => 
                a.status === 'transporting' || a.status === 'picking'
            ).length;
        } else {
            // 其他角色查看所有进行中的
            const allocations = dataManager.getAllocations();
            count = allocations.filter(a => 
                !['completed', 'rejected', 'pending'].includes(a.status)
            ).length;
        }
        
        countEl.textContent = count;
    },

    // 渲染时间线
    renderTimeline() {
        const container = document.getElementById('transportTimeline');
        if (!container) return;

        const role = dataManager.getCurrentRole();
        let allocations = [];

        if (role === 'volunteer') {
            // 志愿者看自己的任务 + 可领取的
            const myTasks = dataManager.getMyTasks();
            const available = dataManager.getAllocations().filter(a => 
                a.status === 'approved' && !a.volunteer
            );
            allocations = [...myTasks, ...available];
        } else if (role === 'receiver') {
            // 社区接收人看本社区的
            allocations = dataManager.getAllocations().filter(a => 
                !['pending', 'rejected', 'completed'].includes(a.status)
            );
        } else {
            // 其他角色看所有进行中的
            allocations = dataManager.getAllocations().filter(a => 
                !['completed', 'rejected'].includes(a.status)
            );
        }

        // 按时间排序
        allocations.sort((a, b) => new Date(b.applyTime) - new Date(a.applyTime));

        if (allocations.length === 0) {
            container.innerHTML = `
                <div class="empty-tip" style="padding: 60px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <div>暂无转运任务</div>
                    ${role === 'volunteer' ? '<div style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">等待新的调拨任务分配</div>' : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = allocations.map(a => {
            const steps = this.getStepStatus(a.status);
            const totalQty = a.items.reduce((sum, item) => sum + item.qty, 0);
            const isMine = a.volunteer === dataManager.getCurrentUser();
            const isInspecting = a.status === 'inspecting';
            
            let actions = '';
            
            if (role === 'volunteer') {
                if (a.status === 'approved' && !a.volunteer) {
                    actions = `<button class="btn btn-primary btn-sm" onclick="AllocationPage.acceptTask('${a.id}')">领取任务</button>`;
                } else if (a.status === 'transporting' && isMine) {
                    actions = `<button class="btn btn-success btn-sm" onclick="AllocationPage.confirmReceive('${a.id}')">送达签收</button>`;
                } else if (a.status === 'received' && isMine) {
                    actions = `<button class="btn btn-primary btn-sm" onclick="AllocationPage.startReturn('${a.id}')">发起归还</button>`;
                }
            } else if (role === 'receiver') {
                if (a.status === 'transporting') {
                    actions = `<button class="btn btn-success btn-sm" onclick="AllocationPage.confirmReceive('${a.id}')">确认签收</button>`;
                }
            } else if (role === 'warehouse' && isInspecting) {
                actions = `<button class="btn btn-warning btn-sm" onclick="AllocationPage.viewDetail('${a.id}')">检测处理</button>`;
            }
            
            actions += `<button class="btn btn-sm" onclick="AllocationPage.viewDetail('${a.id}')">查看详情</button>`;

            return `
                <div class="timeline-card" style="${isInspecting ? 'border-left:4px solid #d48806;' : (a.billType === 'drill' && !a.convertedFromDrill ? 'border-left:4px solid #1890ff;' : '')}">
                    <div class="timeline-header">
                        <div class="timeline-title" style="display:flex;align-items:center;gap:8px;">
                            <strong>${a.billNo}</strong>
                            ${getBillTypeTag(a)}
                            ${isMine ? '<span class="status-tag info" style="margin-left:0;">我的任务</span>' : ''}
                            ${isInspecting ? '<span class="status-tag inspecting" style="margin-left:0;">归还检测中</span>' : ''}
                        </div>
                        <div class="timeline-actions">
                            ${actions}
                        </div>
                    </div>

                    <div class="timeline-steps">
                        ${steps.map((step, index) => `
                            <div class="timeline-step">
                                <div class="step-dot ${step.class}">
                                    ${step.icon}
                                </div>
                                <div class="step-label ${step.class}">${step.label}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="timeline-info">
                        <div class="info-item">
                            <div class="info-label">目标社区</div>
                            <div class="info-value">${a.community}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">物资数量</div>
                            <div class="info-value">${totalQty} 件</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">志愿者</div>
                            <div class="info-value">${a.volunteer || '待分配'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">应还日期</div>
                            <div class="info-value" style="color: ${this.isOverdue(a) ? '#ff4d4f' : 'inherit'}">
                                ${a.returnDeadline}
                                ${this.isOverdue(a) ? ' (已逾期)' : ''}
                            </div>
                        </div>
                    </div>

                    ${a.remark ? `
                        <div style="margin-top: 12px; padding: 10px; background: #f5f7fa; border-radius: 4px; font-size: 12px; color: #595959;">
                            <strong>备注：</strong>${a.remark}
                        </div>
                    ` : ''}

                    ${a.items.length > 0 ? `
                        <div style="margin-top: 12px;">
                            <div style="font-size: 12px; color: #8c8c8c; margin-bottom: 6px;">物资清单：</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${a.items.slice(0, 4).map(item => `
                                    <span style="padding: 2px 8px; background: #f0f5ff; border-radius: 10px; font-size: 11px; color: #1890ff;">
                                        ${item.materialName} × ${item.qty}
                                    </span>
                                `).join('')}
                                ${a.items.length > 4 ? `
                                    <span style="padding: 2px 8px; font-size: 11px; color: #8c8c8c;">
                                        等 ${a.items.length} 项
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // 获取步骤状态
    getStepStatus(currentStatus) {
        const allSteps = [
            { key: 'pending', label: '待审批', icon: '📋' },
            { key: 'approved', label: '待领用', icon: '✅' },
            { key: 'picking', label: '出库中', icon: '📦' },
            { key: 'transporting', label: '转运中', icon: '🚚' },
            { key: 'received', label: '已签收', icon: '🏠' },
            { key: 'returning', label: currentStatus === 'inspecting' ? '检测中' : '归还中', icon: currentStatus === 'inspecting' ? '🔧' : '↩️' },
            { key: 'completed', label: '已完成', icon: '🎉' }
        ];

        const statusOrder = ['pending', 'approved', 'picking', 'transporting', 'received', 'returning', 'inspecting', 'completed'];
        const currentIdx = statusOrder.indexOf(currentStatus);
        const returningIdx = statusOrder.indexOf('returning');

        return allSteps.map((step, idx) => {
            let stepClass = '';
            const stepKey = step.key === 'completed' ? 'completed' : step.key;
            const stepOrderIdx = statusOrder.indexOf(stepKey);
            
            if (stepKey === currentStatus || (step.key === 'returning' && currentStatus === 'inspecting')) {
                stepClass = 'active';
            } else if (stepOrderIdx < currentIdx || currentStatus === 'completed' || 
                       currentStatus === 'returning' || currentStatus === 'inspecting' && stepOrderIdx <= returningIdx) {
                stepClass = 'done';
            }
            
            return {
                ...step,
                class: stepClass
            };
        });
    },

    // 检查是否逾期
    isOverdue(allocation) {
        if (['completed', 'rejected'].includes(allocation.status)) return false;
        const today = new Date().toISOString().split('T')[0];
        return allocation.returnDeadline < today;
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    TransportPage.init();
});
