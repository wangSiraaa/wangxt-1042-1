// 归还记录页面

const ReturnPage = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const statusFilter = document.getElementById('returnStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.refresh());
        }

        const urgeBtn = document.getElementById('urgeReturnBtn');
        if (urgeBtn) {
            urgeBtn.addEventListener('click', () => this.bulkUrge());
        }
    },

    refresh() {
        this.renderTable();
    },

    renderTable() {
        const tbody = document.getElementById('returnTableBody');
        if (!tbody) return;

        const statusFilter = document.getElementById('returnStatusFilter')?.value || '';
        
        // 获取需要显示归还信息的调拨单（已签收、归还中、已完成的）
        let allocations = dataManager.getAllocations().filter(a => 
            ['received', 'returning', 'completed'].includes(a.status) ||
            (!['pending', 'rejected'].includes(a.status) && a.returnDeadline)
        );

        if (statusFilter) {
            if (statusFilter === 'overdue') {
                const today = new Date().toISOString().split('T')[0];
                allocations = allocations.filter(a => 
                    a.returnDeadline < today && a.status !== 'completed'
                );
            } else if (statusFilter === 'returned') {
                allocations = allocations.filter(a => a.status === 'completed');
            } else if (statusFilter === 'partial') {
                allocations = allocations.filter(a => {
                    return a.items.some(item => 
                        (item.returnedQty || 0) > 0 && 
                        (item.returnedQty || 0) < (item.qty || 0)
                    );
                });
            }
        }

        // 按应还日期排序，逾期的在前
        allocations.sort((a, b) => {
            const aOverdue = this.isOverdue(a);
            const bOverdue = this.isOverdue(b);
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            return new Date(a.returnDeadline) - new Date(b.returnDeadline);
        });

        if (allocations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #bfbfbf; padding: 40px;">
                        暂无归还记录
                    </td>
                </tr>
            `;
            return;
        }

        const role = dataManager.getCurrentRole();

        tbody.innerHTML = allocations.map(a => {
            const totalQty = a.items.reduce((sum, item) => sum + item.qty, 0);
            const totalReceived = a.items.reduce((sum, item) => sum + (item.receivedQty || item.qty), 0);
            const totalReturned = a.items.reduce((sum, item) => sum + (item.returnedQty || 0), 0);
            
            const isOverdue = this.isOverdue(a);
            const isPartial = totalReturned > 0 && totalReturned < totalReceived;
            
            let returnStatus = '';
            let returnClass = '';
            
            if (a.status === 'completed') {
                returnStatus = '已归还';
                returnClass = 'normal';
            } else if (a.status === 'returning') {
                returnStatus = '归还中';
                returnClass = 'info';
            } else if (isOverdue) {
                returnStatus = '已逾期';
                returnClass = 'danger';
            } else if (totalReturned > 0) {
                returnStatus = '部分归还';
                returnClass = 'warning';
            } else {
                returnStatus = '待归还';
                returnClass = 'warning';
            }

            let actions = '';
            if (role === 'warehouse' && a.status === 'returning') {
                actions += `<span class="action-link" onclick="AllocationPage.returnIn('${a.id}')">入库</span>`;
            }
            if (role === 'volunteer' && a.status === 'received' && a.volunteer === dataManager.getCurrentUser()) {
                actions += `<span class="action-link" onclick="AllocationPage.startReturn('${a.id}')">归还</span>`;
            }
            if ((role === 'warehouse' || role === 'commander') && isOverdue && a.status !== 'completed') {
                actions += `<span class="action-link danger" onclick="ReturnPage.urgeReturn('${a.id}')">催还</span>`;
            }
            actions += `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">详情</span>`;

            const today = new Date();
            const deadline = new Date(a.returnDeadline);
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            
            const daysText = a.status === 'completed' 
                ? '已完成' 
                : (isOverdue ? `逾期${Math.abs(daysLeft)}天` : `还剩${daysLeft}天`);

            return `
                <tr style="${isOverdue && a.status !== 'completed' ? 'background: #fff1f0;' : ''}">
                    <td><strong>${a.billNo}</strong></td>
                    <td>${a.community}</td>
                    <td>
                        <div>${a.returnDeadline}</div>
                        <div style="font-size: 11px; color: ${isOverdue && a.status !== 'completed' ? '#ff4d4f' : '#8c8c8c'};">
                            ${daysText}
                        </div>
                    </td>
                    <td>${totalReceived} 件</td>
                    <td>
                        <span style="color: ${totalReturned < totalReceived ? '#faad14' : '#52c41a'}">
                            ${totalReturned} 件
                        </span>
                    </td>
                    <td><span class="status-tag ${returnClass}">${returnStatus}</span></td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    },

    // 检查是否逾期
    isOverdue(allocation) {
        if (['completed', 'rejected'].includes(allocation.status)) return false;
        const today = new Date().toISOString().split('T')[0];
        return allocation.returnDeadline < today;
    },

    // 催还
    urgeReturn(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        Modal.show('催还提醒', `
            <p>确认向 <strong>${allocation.community}</strong> 发送催还提醒？</p>
            <p style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">
                调拨单号：${allocation.billNo}<br>
                应还日期：${allocation.returnDeadline}
            </p>
            <div class="form-group" style="margin-top: 16px;">
                <label>催还备注</label>
                <textarea id="urgeRemark" placeholder="请输入催还说明..."></textarea>
            </div>
        `, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '发送催还', 
                action: 'confirm', 
                class: 'btn-warning',
                onClick: () => {
                    Toast.success('催还提醒已发送');
                    Modal.close();
                }
            }
        ]);
    },

    // 批量催还
    bulkUrge() {
        const overdue = dataManager.getOverdueAllocations();
        if (overdue.length === 0) {
            Toast.info('暂无逾期未归还的物资');
            return;
        }

        Modal.show('批量催还', `
            <p>确认向以下 <strong>${overdue.length}</strong> 个社区发送批量催还提醒？</p>
            <div style="max-height: 200px; overflow-y: auto; margin-top: 12px; 
                        border: 1px solid #f0f0f0; border-radius: 4px; padding: 8px;">
                ${overdue.map(a => `
                    <div style="padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #f0f0f0;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>${a.community}</span>
                            <span style="color: #ff4d4f; font-size: 11px;">${a.billNo}</span>
                        </div>
                        <div style="font-size: 11px; color: #8c8c8c; margin-top: 2px;">
                            应还：${a.returnDeadline}
                        </div>
                    </div>
                `).join('')}
            </div>
        `, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '批量催还', 
                action: 'confirm', 
                class: 'btn-warning',
                onClick: () => {
                    Toast.success(`已向 ${overdue.length} 个社区发送催还提醒`);
                    Modal.close();
                }
            }
        ]);
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    ReturnPage.init();
});
