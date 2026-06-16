// 调拨单页面

const AllocationPage = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const newBtn = document.getElementById('newAllocationBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showNewAllocationModal());
        }

        const statusFilter = document.getElementById('allocationStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.refresh());
        }

        const searchInput = document.getElementById('allocationSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => this.refresh(), 300));
        }
    },

    refresh() {
        this.renderTable();
    },

    // 渲染表格
    renderTable() {
        const tbody = document.getElementById('allocationTableBody');
        if (!tbody) return;

        const status = document.getElementById('allocationStatusFilter')?.value || '';
        const search = document.getElementById('allocationSearch')?.value || '';

        const allocations = dataManager.getAllocations({ status, search });

        if (allocations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #bfbfbf; padding: 40px;">
                        暂无调拨单数据
                    </td>
                </tr>
            `;
            return;
        }

        const role = dataManager.getCurrentRole();

        tbody.innerHTML = allocations.map(a => {
            const totalQty = a.items.reduce((sum, item) => sum + item.qty, 0);
            const statusInfo = ALLOCATION_STATUS[a.status] || { label: a.status, class: 'info' };
            
            let actions = '';
            
            if (role === 'commander' && a.status === 'pending') {
                // 指挥员可以审批
                actions = `
                    <span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">查看</span>
                `;
            } else if (role === 'warehouse') {
                // 仓管有更多操作权限
                if (a.status === 'pending') {
                    actions += `<span class="action-link" onclick="AllocationPage.approve('${a.id}')">审批</span>`;
                }
                if (a.status === 'approved') {
                    actions += `<span class="action-link" onclick="AllocationPage.picking('${a.id}')">出库</span>`;
                }
                if (a.status === 'returning') {
                    actions += `<span class="action-link" onclick="AllocationPage.returnIn('${a.id}')">入库</span>`;
                }
                actions += `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">详情</span>`;
            } else if (role === 'volunteer') {
                // 志愿者
                if (a.status === 'approved' && !a.volunteer) {
                    actions += `<span class="action-link" onclick="AllocationPage.acceptTask('${a.id}')">领取任务</span>`;
                }
                if (a.status === 'transporting' && a.volunteer === dataManager.getCurrentUser()) {
                    actions += `<span class="action-link" onclick="AllocationPage.deliver('${a.id}')">送达签收</span>`;
                }
                if (a.status === 'received' && a.volunteer === dataManager.getCurrentUser()) {
                    actions += `<span class="action-link" onclick="AllocationPage.startReturn('${a.id}')">发起归还</span>`;
                }
                actions += `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">详情</span>`;
            } else if (role === 'receiver') {
                // 社区接收人
                if (a.status === 'transporting') {
                    actions += `<span class="action-link" onclick="AllocationPage.confirmReceive('${a.id}')">签收</span>`;
                }
                actions += `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">详情</span>`;
            } else {
                actions = `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">查看</span>`;
            }

            return `
                <tr>
                    <td><strong>${a.billNo}</strong></td>
                    <td>${formatDate(a.applyTime, 'MM-DD HH:mm')}</td>
                    <td>${a.community}</td>
                    <td>${totalQty} 件</td>
                    <td>${a.applicant}</td>
                    <td>${getStatusTag(a.status, 'allocation')}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    },

    // 发起新调拨
    showNewAllocationModal() {
        const materials = dataManager.getMaterials().filter(m => m.availableQty > 0);
        
        const content = `
            <form id="newAllocationForm">
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>目标社区</label>
                        <select name="community" required>
                            <option value="">请选择社区</option>
                            ${COMMUNITIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>紧急程度</label>
                        <select name="urgentLevel">
                            <option value="low">一般</option>
                            <option value="medium" selected>较急</option>
                            <option value="high">紧急</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><span class="required">*</span>用途</label>
                        <input type="text" name="purpose" placeholder="如：防汛应急演练" required>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>预计归还日期</label>
                        <input type="date" name="returnDeadline" value="${getDateStr(7)}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label><span class="required">*</span>选择物资</label>
                    <div class="material-select-list" id="materialSelectList">
                        ${materials.map(m => `
                            <div class="material-select-item" data-id="${m.id}">
                                <div class="mat-info">
                                    <div class="mat-name">${m.name}</div>
                                    <div class="mat-desc">
                                        ${m.spec} | 批次: ${m.batchNo} | 可调拨: ${m.availableQty}${m.unit} | 仓位: ${m.positionCode}
                                    </div>
                                </div>
                                <div class="mat-qty">
                                    <input type="number" name="qty_${m.id}" min="0" max="${m.availableQty}" value="0" 
                                           onchange="AllocationPage.calcTotal()">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>备注说明</label>
                    <textarea name="remark" placeholder="请填写调拨备注..."></textarea>
                </div>
                <div id="validationResult" style="display: none;"></div>
            </form>
        `;

        Modal.show('发起物资调拨', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '校验并提交', 
                action: 'submit', 
                class: 'btn-primary',
                onClick: () => this.submitAllocation()
            }
        ]);
    },

    // 计算总数量（简单实现）
    calcTotal() {
    },

    // 提交调拨申请
    submitAllocation() {
        const form = document.getElementById('newAllocationForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // 收集选中的物资
        const items = [];
        const materialItems = document.querySelectorAll('.material-select-item');
        materialItems.forEach(item => {
            const id = item.dataset.id;
            const qtyInput = item.querySelector('input[type="number"]');
            const qty = parseInt(qtyInput.value) || 0;
            if (qty > 0) {
                const material = dataManager.getMaterial(id);
                if (material) {
                    items.push({
                        materialId: id,
                        materialName: material.name,
                        spec: material.spec,
                        qty: qty
                    });
                }
            }
        });

        if (items.length === 0) {
            Toast.error('请至少选择一项物资');
            return;
        }

        if (!data.community) {
            Toast.error('请选择目标社区');
            return;
        }

        // 执行规则校验
        const validation = dataManager.validateAllocation(items, data.community);

        if (validation.errors.length > 0) {
            const errorHtml = `
                <div style="background: #fff1f0; border: 1px solid #ffa39e; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <div style="color: #ff4d4f; font-weight: 500; margin-bottom: 8px;">❌ 校验不通过，无法调拨：</div>
                    <ul style="margin: 0; padding-left: 20px; color: #ff4d4f; font-size: 13px;">
                        ${validation.errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            `;
            const resultEl = document.getElementById('validationResult');
            if (resultEl) {
                resultEl.innerHTML = errorHtml;
                resultEl.style.display = 'block';
            }
            return;
        }

        // 有警告时二次确认
        if (validation.warnings.length > 0) {
            const warningHtml = `
                <div style="background: #fffbe6; border: 1px solid #ffe58f; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    <div style="color: #d48806; font-weight: 500; margin-bottom: 8px;">⚠️ 温馨提示：</div>
                    <ul style="margin: 0; padding-left: 20px; color: #d48806; font-size: 13px;">
                        ${validation.warnings.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                    <p style="margin-top: 10px; font-size: 13px;">是否确认提交调拨申请？</p>
                </div>
            `;
            
            Modal.show('确认提交', warningHtml, [
                { text: '取消', action: 'close', class: '' },
                { 
                    text: '确认提交', 
                    action: 'confirm', 
                    class: 'btn-primary',
                    onClick: () => {
                        this.doCreateAllocation(data, items);
                    }
                }
            ]);
        } else {
            this.doCreateAllocation(data, items);
        }
    },

    // 执行创建
    doCreateAllocation(formData, items) {
        const allocation = dataManager.createAllocation({
            community: formData.community,
            urgentLevel: formData.urgentLevel,
            purpose: formData.purpose,
            returnDeadline: formData.returnDeadline,
            remark: formData.remark,
            applicant: dataManager.getCurrentUser(),
            items: items
        });

        if (allocation) {
            Toast.success('调拨申请提交成功，等待审批');
            Modal.close();
            if (window.app) window.app.refreshAll();
        } else {
            Toast.error('提交失败');
        }
    },

    // 审批
    approve(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const totalQty = allocation.items.reduce((sum, item) => sum + item.qty, 0);
        
        const content = `
            <div class="detail-section">
                <div class="detail-row">
                    <span class="label">调拨单号</span>
                    <span class="value"><strong>${allocation.billNo}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="label">申请社区</span>
                    <span class="value">${allocation.community}</span>
                </div>
                <div class="detail-row">
                    <span class="label">申请时间</span>
                    <span class="value">${allocation.applyTime}</span>
                </div>
                <div class="detail-row">
                    <span class="label">物资总数</span>
                    <span class="value">${totalQty} 件</span>
                </div>
                <div class="detail-row">
                    <span class="label">用途</span>
                    <span class="value">${allocation.purpose}</span>
                </div>
                <div class="detail-row">
                    <span class="label">预计归还</span>
                    <span class="value">${allocation.returnDeadline}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4>物资明细</h4>
                ${allocation.items.map(item => `
                    <div class="material-batch-item">
                        <div class="batch-head">
                            <span class="batch-name">${item.materialName}</span>
                            <span>${item.qty} ${item.spec ? '' : '件'}</span>
                        </div>
                        <div class="batch-info">
                            ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="form-group">
                <label>审批意见</label>
                <textarea id="approveRemark" placeholder="请输入审批意见..."></textarea>
            </div>
        `;

        Modal.show('调拨审批', content, [
            { text: '驳回', action: 'reject', class: 'btn-danger', onClick: () => this.doReject(id) },
            { text: '取消', action: 'close', class: '' },
            { text: '通过', action: 'approve', class: 'btn-primary', onClick: () => this.doApprove(id) }
        ]);
    },

    doApprove(id) {
        const remark = document.getElementById('approveRemark')?.value || '审批通过';
        const result = dataManager.updateAllocationStatus(id, 'approved', remark);
        if (result) {
            Toast.success('审批通过，已锁定库存');
            Modal.close();
            if (window.app) window.app.refreshAll();
        }
    },

    doReject(id) {
        const remark = document.getElementById('approveRemark')?.value || '审批驳回';
        const result = dataManager.updateAllocationStatus(id, 'rejected', remark);
        if (result) {
            Toast.warning('已驳回调拨申请');
            Modal.close();
            if (window.app) window.app.refreshAll();
        }
    },

    // 出库
    picking(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const content = `
            <p>确认对调拨单 <strong>${allocation.billNo}</strong> 执行出库操作？</p>
            <p style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">
                出库后将扣减实际库存，物资进入转运流程
            </p>
            <div class="detail-section" style="margin-top: 16px;">
                <h4>出库物资明细</h4>
                ${allocation.items.map(item => `
                    <div class="material-batch-item">
                        <div class="batch-head">
                            <span class="batch-name">${item.materialName}</span>
                            <span>${item.qty} 件</span>
                        </div>
                        <div class="batch-info">
                            ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="form-group">
                <label>出库备注</label>
                <textarea id="pickingRemark" placeholder="请输入出库备注..."></textarea>
            </div>
        `;

        Modal.show('物资出库', content, [
            { text: '取消', action: 'close', class: '' },
            { text: '确认出库', action: 'confirm', class: 'btn-primary', onClick: () => this.doPicking(id) }
        ]);
    },

    doPicking(id) {
        const remark = document.getElementById('pickingRemark')?.value || '出库完成';
        const result = dataManager.updateAllocationStatus(id, 'picking', remark);
        if (result) {
            // 自动变为转运中
            setTimeout(() => {
                dataManager.updateAllocationStatus(id, 'transporting', '物资已发出，转运中');
                Toast.success('出库完成，物资已发出');
                Modal.close();
                if (window.app) window.app.refreshAll();
            }, 300);
        }
    },

    // 入库（归还）
    returnIn(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const content = `
            <p>确认调拨单 <strong>${allocation.billNo}</strong> 的物资归还入库？</p>
            <div class="detail-section" style="margin-top: 16px;">
                <h4>归还物资明细</h4>
                ${allocation.items.map(item => `
                    <div class="material-batch-item">
                        <div class="batch-head">
                            <span class="batch-name">${item.materialName}</span>
                            <span>${item.returnedQty || item.receivedQty || item.qty} / ${item.qty} 件</span>
                        </div>
                        <div class="batch-info">
                            ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>数量差异</label>
                    <input type="number" id="returnDiffQty" value="${allocation.qtyDiff?.qty || 0}" placeholder="正数为多，负数为少">
                </div>
                <div class="form-group">
                    <label>破损数量</label>
                    <input type="number" id="returnDamageQty" value="${allocation.damage?.qty || 0}" placeholder="破损数量">
                </div>
            </div>
            <div class="form-group">
                <label>入库备注</label>
                <textarea id="returnRemark" placeholder="请输入入库备注..."></textarea>
            </div>
        `;

        Modal.show('归还入库', content, [
            { text: '取消', action: 'close', class: '' },
            { text: '确认入库', action: 'confirm', class: 'btn-success', onClick: () => this.doReturnIn(id) }
        ]);
    },

    doReturnIn(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const diffQty = parseInt(document.getElementById('returnDiffQty')?.value) || 0;
        const damageQty = parseInt(document.getElementById('returnDamageQty')?.value) || 0;
        const remark = document.getElementById('returnRemark')?.value || '';

        // 更新归还数量
        const items = allocation.items.map(item => {
            const returned = item.receivedQty || item.qty;
            return {
                materialId: item.materialId,
                returnedQty: Math.max(0, returned - damageQty - Math.abs(diffQty))
            };
        });

        dataManager.updateReturn(id, { 
            items, 
            remark: remark || '归还入库完成' 
        });

        const result = dataManager.updateAllocationStatus(id, 'completed', remark || '归还入库完成');
        if (result) {
            Toast.success('归还入库完成');
            Modal.close();
            if (window.app) window.app.refreshAll();
        }
    },

    // 查看详情
    viewDetail(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const totalQty = allocation.items.reduce((sum, item) => sum + item.qty, 0);
        const statusInfo = ALLOCATION_STATUS[allocation.status] || { label: allocation.status, class: 'info' };

        const content = `
            <div class="detail-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0;">${allocation.billNo}</h4>
                    ${getStatusTag(allocation.status, 'allocation')}
                </div>
                <div class="detail-row">
                    <span class="label">申请社区</span>
                    <span class="value">${allocation.community}</span>
                </div>
                <div class="detail-row">
                    <span class="label">申请人</span>
                    <span class="value">${allocation.applicant}</span>
                </div>
                <div class="detail-row">
                    <span class="label">申请时间</span>
                    <span class="value">${allocation.applyTime}</span>
                </div>
                <div class="detail-row">
                    <span class="label">紧急程度</span>
                    <span class="value">${allocation.urgentLevel === 'high' ? '🔴 紧急' : allocation.urgentLevel === 'medium' ? '🟡 较急' : '🟢 一般'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">用途</span>
                    <span class="value">${allocation.purpose}</span>
                </div>
                <div class="detail-row">
                    <span class="label">应还日期</span>
                    <span class="value">${allocation.returnDeadline}</span>
                </div>
                ${allocation.volunteer ? `
                <div class="detail-row">
                    <span class="label">负责志愿者</span>
                    <span class="value">${allocation.volunteer}</span>
                </div>
                ` : ''}
                ${allocation.receiver ? `
                <div class="detail-row">
                    <span class="label">社区接收人</span>
                    <span class="value">${allocation.receiver}</span>
                </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h4>物资清单 (${totalQty} 件)</h4>
                ${allocation.items.map(item => `
                    <div class="material-batch-item">
                        <div class="batch-head">
                            <span class="batch-name">${item.materialName}</span>
                            <span>${item.qty} 件</span>
                        </div>
                        <div class="batch-info">
                            ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                            <span>已出库: ${item.pickedQty || 0}</span>
                            <span>已签收: ${item.receivedQty || 0}</span>
                            <span>已归还: ${item.returnedQty || 0}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${allocation.damage?.qty > 0 || allocation.qtyDiff?.qty ? `
            <div class="detail-section">
                <h4>异常记录</h4>
                ${allocation.qtyDiff?.qty ? `
                    <div class="detail-row">
                        <span class="label">数量差异</span>
                        <span class="value" style="color: ${allocation.qtyDiff.qty > 0 ? '#52c41a' : '#ff4d4f'}">
                            ${allocation.qtyDiff.qty > 0 ? '+' : ''}${allocation.qtyDiff.qty} 件
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="label">差异说明</span>
                        <span class="value" style="font-size: 12px;">${allocation.qtyDiff.remark || '-'}</span>
                    </div>
                ` : ''}
                ${allocation.damage?.qty ? `
                    <div class="detail-row">
                        <span class="label">破损数量</span>
                        <span class="value" style="color: #ff4d4f;">${allocation.damage.qty} 件</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">破损说明</span>
                        <span class="value" style="font-size: 12px;">${allocation.damage.remark || '-'}</span>
                    </div>
                ` : ''}
            </div>
            ` : ''}

            ${allocation.signPhotos && allocation.signPhotos.length > 0 ? `
            <div class="detail-section">
                <h4>签收凭证</h4>
                <div class="photo-list">
                    ${allocation.signPhotos.map(() => `
                        <div class="photo-placeholder" style="background: #f0f5ff; border-color: #91d5ff; color: #1890ff;">
                            📷<br>签收照片
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <h4>流转记录</h4>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${allocation.timeline.map(t => `
                        <div style="padding-left: 16px; border-left: 2px solid #e8e8e8; position: relative;">
                            <div style="position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #1890ff;"></div>
                            <div style="font-size: 12px; color: #8c8c8c;">${t.time}</div>
                            <div style="font-size: 13px; margin-top: 2px;">
                                <strong>${ALLOCATION_STATUS[t.status]?.label || t.status}</strong> - ${t.operator}
                            </div>
                            ${t.remark ? `<div style="font-size: 12px; color: #8c8c8c; margin-top: 2px;">${t.remark}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            ${allocation.remark ? `
            <div class="detail-section">
                <h4>备注</h4>
                <p style="font-size: 13px; color: #595959;">${allocation.remark}</p>
            </div>
            ` : ''}
        `;

        Modal.show('调拨单详情', content, [
            { text: '关闭', action: 'close', class: '' }
        ]);
    },

    // 志愿者领取任务
    acceptTask(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        Modal.show('领取任务', `
            <p>确认领取调拨单 <strong>${allocation.billNo}</strong> 的转运任务？</p>
            <p style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">
                目的地：${allocation.community}
            </p>
        `, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '确认领取', 
                action: 'confirm', 
                class: 'btn-primary',
                onClick: () => {
                    dataManager.setVolunteer(id, dataManager.getCurrentUser());
                    Toast.success('任务领取成功');
                    Modal.close();
                    this.refresh();
                }
            }
        ]);
    },

    // 志愿者送达
    deliver(id) {
        Toast.info('请联系社区接收人进行签收');
    },

    // 发起归还
    startReturn(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const content = `
            <p>确认发起归还调拨单 <strong>${allocation.billNo}</strong>？</p>
            <div class="form-group">
                <label>归还说明</label>
                <textarea id="returnStartRemark" placeholder="请输入归还说明..."></textarea>
            </div>
        `;

        Modal.show('发起归还', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '确认归还', 
                action: 'confirm', 
                class: 'btn-primary',
                onClick: () => {
                    const remark = document.getElementById('returnStartRemark')?.value || '发起归还';
                    dataManager.updateAllocationStatus(id, 'returning', remark);
                    Toast.success('已发起归还，等待仓管入库');
                    Modal.close();
                    if (window.app) window.app.refreshAll();
                }
            }
        ]);
    },

    // 社区签收
    confirmReceive(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const content = `
            <p>确认签收调拨单 <strong>${allocation.billNo}</strong> 的物资？</p>
            <div class="detail-section" style="margin-top: 16px;">
                <h4>物资清单</h4>
                ${allocation.items.map(item => `
                    <div class="material-batch-item">
                        <div class="batch-head">
                            <span class="batch-name">${item.materialName}</span>
                            <span>应收: ${item.pickedQty || item.qty} 件</span>
                        </div>
                        <div class="batch-info">
                            <span>实收: <input type="number" value="${item.pickedQty || item.qty}" min="0" 
                                     style="width: 60px; padding: 2px 4px; border: 1px solid #d9d9d9; border-radius: 3px;"
                                     class="receive-qty" data-id="${item.materialId}"> 件</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>数量差异</label>
                    <input type="number" id="receiveDiffQty" value="0" placeholder="正数为多，负数为少">
                </div>
                <div class="form-group">
                    <label>破损数量</label>
                    <input type="number" id="receiveDamageQty" value="0" placeholder="破损数量">
                </div>
            </div>
            <div class="form-group">
                <label>差异/破损说明</label>
                <textarea id="receiveRemark" placeholder="请说明原因..."></textarea>
            </div>
            <div class="form-group">
                <label>签收照片</label>
                <div class="photo-list">
                    <div class="photo-placeholder" onclick="AllocationPage.addSignPhoto()">+ 添加照片</div>
                </div>
            </div>
        `;

        Modal.show('物资签收', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '确认签收', 
                action: 'confirm', 
                class: 'btn-success',
                onClick: () => this.doReceive(id)
            }
        ]);
    },

    // 添加签收照片（占位）
    addSignPhoto() {
        Toast.info('照片上传功能（占位）- 实际应用中调用相机或相册');
    },

    doReceive(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const diffQty = parseInt(document.getElementById('receiveDiffQty')?.value) || 0;
        const damageQty = parseInt(document.getElementById('receiveDamageQty')?.value) || 0;
        const remark = document.getElementById('receiveRemark')?.value || '';

        // 计算实收数量
        const items = allocation.items.map(item => {
            const received = item.pickedQty || item.qty;
            return {
                materialId: item.materialId,
                receivedQty: received
            };
        });

        dataManager.updateReceipt(id, {
            items,
            qtyDiff: { qty: diffQty, remark: remark },
            damage: { qty: damageQty, remark: remark },
            signPhotos: ['sign_' + Date.now()]
        });

        dataManager.setReceiver(id, dataManager.getCurrentUser());
        const result = dataManager.updateAllocationStatus(id, 'received', remark || '已签收');
        
        if (result) {
            Toast.success('签收成功');
            Modal.close();
            if (window.app) window.app.refreshAll();
        }
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    AllocationPage.init();
});
