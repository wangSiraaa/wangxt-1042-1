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

        const billTypeFilter = document.getElementById('allocationBillTypeFilter');
        if (billTypeFilter) {
            billTypeFilter.addEventListener('change', () => this.refresh());
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
        const billType = document.getElementById('allocationBillTypeFilter')?.value || '';
        const search = document.getElementById('allocationSearch')?.value || '';

        const allocations = dataManager.getAllocations({ status, billType, search });

        if (allocations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: #bfbfbf; padding: 40px;">
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
            const isDrillNotConverted = a.billType === 'drill' && !a.convertedFromDrill;
            
            let actions = '';

            // 指挥员：演练单→转真实（除了已完成/驳回）
            if (role === 'commander' && isDrillNotConverted && !['completed', 'rejected'].includes(a.status)) {
                actions += `<span class="action-link" onclick="AllocationPage.askConvertDrill('${a.id}')" style="color: #d46b08; font-weight: 600;">转真实</span>`;
            }
            
            if (role === 'commander' && a.status === 'pending') {
                actions = `
                    ${actions}
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
                if (a.status === 'inspecting') {
                    actions += `<span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')" style="color: #d48806;">检测中</span>`;
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
                actions = `
                    ${actions}
                    <span class="action-link" onclick="AllocationPage.viewDetail('${a.id}')">查看</span>
                `;
            }

            return `
                <tr>
                    <td><strong>${a.billNo}</strong></td>
                    <td>${getBillTypeTag(a)}</td>
                    <td>${formatDate(a.applyTime, 'MM-DD HH:mm')}</td>
                    <td>${a.community}</td>
                    <td>${totalQty} 件</td>
                    <td>${a.applicant}</td>
                    <td>${getStatusTag(a.status, 'allocation')}</td>
                    <td>${a.inspectionStatus ? getInspectionTag(a.inspectionStatus) : '-'}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    },

    // 发起新调拨
    showNewAllocationModal() {
        const materials = dataManager.getMaterials().filter(m => m.availableQty + (m.drillLockedQty || 0) > 0);
        
        const content = `
            <form id="newAllocationForm">
                <div class="form-group">
                    <label><span class="required">*</span>单据类型</label>
                    <div class="bill-type-radio">
                        <label class="bill-type-card real">
                            <input type="radio" name="billType" value="real" checked>
                            <div class="bill-type-head">
                                <span class="bill-type-icon">🚨</span>
                                <span class="bill-type-name">真实灾情单</span>
                            </div>
                            <div class="bill-type-desc">正式调拨，锁定并扣减真实库存</div>
                        </label>
                        <label class="bill-type-card drill">
                            <input type="radio" name="billType" value="drill">
                            <div class="bill-type-head">
                                <span class="bill-type-icon">🎯</span>
                                <span class="bill-type-name">防汛演练单</span>
                            </div>
                            <div class="bill-type-desc">仅演练预占，不扣真实库存，随时可转真实</div>
                        </label>
                    </div>
                </div>
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
                        <input type="text" name="purpose" placeholder="如：防汛应急演练 / 社区防汛排涝" required>
                    </div>
                    <div class="form-group">
                        <label><span class="required">*</span>预计归还日期</label>
                        <input type="date" name="returnDeadline" value="${getDateStr(7)}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label><span class="required">*</span>选择物资</label>
                    <div style="font-size: 12px; color: #8c8c8c; margin-bottom: 8px;">
                        💡 演练单库存不足可继续提交，现场核实物资即可
                    </div>
                    <div class="material-select-list" id="materialSelectList">
                        ${materials.map(m => {
                            const drillHint = m.needInspection ? ` <span style="color:#d48806;">（归还需检测）</span>` : '';
                            return `
                            <div class="material-select-item" data-id="${m.id}">
                                <div class="mat-info">
                                    <div class="mat-name">${m.name}${drillHint}</div>
                                    <div class="mat-desc">
                                        ${m.spec} | 批次: ${m.batchNo} | 可调拨: ${m.availableQty}${m.unit} | 演练预占: ${m.drillLockedQty || 0}${m.unit} | 仓位: ${m.positionCode}
                                    </div>
                                </div>
                                <div class="mat-qty">
                                    <input type="number" name="qty_${m.id}" min="0" 
                                           max="${m.availableQty + (m.drillLockedQty || 0) + 999}" value="0"
                                           onchange="AllocationPage.calcTotal()">
                                </div>
                            </div>
                        `}).join('')}
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
        const billType = data.billType || 'real';

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

        // 执行规则校验（按单据类型分支）
        const validation = dataManager.validateAllocation(items, data.community, billType);

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
            const typeHint = billType === 'drill' 
                ? `<div style="color:#1890ff; font-size: 13px; margin-bottom: 8px;">📋 当前为 <strong>防汛演练单</strong>，以下为演练预占警告：</div>`
                : '';
            const warningHtml = `
                <div style="background: #fffbe6; border: 1px solid #ffe58f; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                    ${typeHint}
                    <div style="color: #d48806; font-weight: 500; margin-bottom: 8px;">⚠️ 温馨提示：</div>
                    <ul style="margin: 0; padding-left: 20px; color: #d48806; font-size: 13px;">
                        ${validation.warnings.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                    <p style="margin-top: 10px; font-size: 13px;">是否确认提交${billType === 'drill' ? '演练' : ''}调拨申请？</p>
                </div>
            `;
            
            Modal.show('确认提交', warningHtml, [
                { text: '取消', action: 'close', class: '' },
                { 
                    text: '确认提交', 
                    action: 'confirm', 
                    class: 'btn-primary',
                    onClick: () => {
                        this.doCreateAllocation(data, items, billType);
                    }
                }
            ]);
        } else {
            this.doCreateAllocation(data, items, billType);
        }
    },

    // 执行创建
    doCreateAllocation(formData, items, billType = 'real') {
        const allocation = dataManager.createAllocation({
            community: formData.community,
            urgentLevel: formData.urgentLevel,
            purpose: formData.purpose,
            returnDeadline: formData.returnDeadline,
            remark: formData.remark,
            applicant: dataManager.getCurrentUser(),
            items: items,
            billType: billType
        });

        if (allocation) {
            const billName = billType === 'drill' ? '演练调拨' : '调拨';
            Toast.success(`${billName}申请提交成功，等待审批`);
            Modal.close();
            if (window.app) window.app.refreshAll();
        } else {
            Toast.error('提交失败');
        }
    },

    // 演练单→转真实（二次确认）
    askConvertDrill(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;
        if (allocation.convertedFromDrill) {
            Toast.warning('该单据已升级为真实事件单');
            return;
        }

        const totalQty = allocation.items.reduce((s, i) => s + i.qty, 0);
        const content = `
            <div style="margin-bottom: 16px;">
                <p>指挥员将把演练单升级为<strong style="color:#ff4d4f;">真实灾情单</strong>，以下数据无缝迁移：</p>
                <div class="convert-info-block" style="margin: 16px 0;">
                    <div class="convert-row"><span>📄 单据信息</span><span>${allocation.billNo}（${allocation.community}）</span></div>
                    <div class="convert-row"><span>📦 预占物资</span><span>${totalQty} 件 / ${allocation.items.length} 种</span></div>
                    <div class="convert-row"><span>🙋 负责志愿者</span><span>${allocation.volunteer || '未分配'}</span></div>
                    <div class="convert-row"><span>🏘️ 社区签收</span><span>${allocation.receiver || '未签收'}${allocation.status === 'received' ? '（已签收）' : ''}</span></div>
                    <div class="convert-row"><span>⏰ 当前状态</span><span>${ALLOCATION_STATUS[allocation.status]?.label || allocation.status}</span></div>
                </div>
                <p style="font-size: 13px; color: #d4380d;">
                    ⚠️ 升级后将<strong>扣减真实库存</strong>，请确保灾情属实、物资到位。此操作不可撤销！
                </p>
            </div>
            <div class="form-group">
                <label><span class="required">*</span>升级原因</label>
                <textarea id="convertReason" placeholder="请说明升级原因，例如：演练中接到真实汛情通报，转为真实事件"></textarea>
            </div>
        `;

        Modal.show('演练单升级为真实事件单', content, [
            { text: '取消', action: 'close', class: '' },
            { 
                text: '🎯 确认升级', 
                action: 'confirm', 
                class: 'btn-convert',
                onClick: () => this.doConvertDrill(id)
            }
        ]);
    },

    doConvertDrill(id) {
        const reason = document.getElementById('convertReason')?.value?.trim();
        if (!reason) {
            Toast.error('请填写升级原因');
            return;
        }
        const result = dataManager.convertDrillToReal(id, reason);
        if (result.success) {
            Toast.success(`已升级为真实事件单：${result.allocation.billNo}`);
            Modal.close();
            this.refresh();
            if (window.app) window.app.refreshAll();
        } else {
            Toast.error(result.message || '升级失败');
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

    // 入库（归还）—— 精密设备先进待检测，其余直接完成
    returnIn(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        // 计算需要检测的物资
        const inspectingItems = (allocation.inspections || []).filter(i => ['pending', 'inspecting'].includes(i.status));
        const needInspectionCount = allocation.items.filter(it => {
            const m = dataManager.getMaterial(it.materialId);
            return m && m.needInspection;
        }).length;
        const hasNeedInspection = needInspectionCount > 0;

        const itemsHtml = allocation.items.map(item => {
            const m = dataManager.getMaterial(item.materialId);
            const needTip = m && m.needInspection ? ' <span style="color:#d48806; font-size:12px;">（归还需检测）</span>' : '';
            const qty = item.returnedQty || item.receivedQty || item.qty;
            return `
                <div class="material-batch-item">
                    <div class="batch-head">
                        <span class="batch-name">${item.materialName}${needTip}</span>
                        <span>${qty} / ${item.qty} 件</span>
                    </div>
                    <div class="batch-info">
                        ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                        ${m && m.needInspection ? `<span style="color:#d48806;">归还后先进入检测环节</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        const hintHtml = hasNeedInspection ? `
            <div style="background:#fffbe6;border:1px solid #ffe58f;padding:10px;border-radius:6px;margin-bottom:12px;font-size:13px;color:#d48806;">
                ⚠️ 本单包含 ${needInspectionCount} 种精密设备（发电机/水泵等），归还后将自动进入<strong>检测中</strong>状态，检测合格后方可再调拨。
            </div>
        ` : '';

        const content = `
            ${hintHtml}
            <p>确认调拨单 <strong>${allocation.billNo}</strong> ${getBillTypeTag(allocation)} 的物资归还入库？</p>
            <div class="detail-section" style="margin-top: 16px;">
                <h4>归还物资明细</h4>
                ${itemsHtml}
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
                <textarea id="returnRemark" placeholder="请输入入库备注，检测物资可注明外观情况..."></textarea>
            </div>
        `;

        const confirmText = hasNeedInspection ? '确认入库·进入检测' : '确认入库';
        Modal.show('归还入库', content, [
            { text: '取消', action: 'close', class: '' },
            { text: confirmText, action: 'confirm', class: 'btn-success', onClick: () => this.doReturnIn(id) }
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

        // 判断：是否有需要检测的物资？
        const hasNeedInspection = allocation.items.some(it => {
            const m = dataManager.getMaterial(it.materialId);
            return m && m.needInspection;
        });

        const finalStatus = hasNeedInspection ? 'inspecting' : 'completed';
        const finalRemark = hasNeedInspection
            ? (remark || '归还入库，进入待检测环节')
            : (remark || '归还入库完成');

        const result = dataManager.updateAllocationStatus(id, finalStatus, finalRemark);
        if (result) {
            if (hasNeedInspection) {
                Toast.warning('已入库·精密设备进入待检测环节，请尽快安排检测');
            } else {
                Toast.success('归还入库完成');
            }
            Modal.close();
            if (window.app) window.app.refreshAll();
        }
    },

    // 仓管启动检测
    doStartInspection(allocationId, materialId) {
        const result = dataManager.startInspection(allocationId, materialId);
        if (result) {
            Toast.success('检测已开始');
            this.refresh();
            this.viewDetail(allocationId);
        } else {
            Toast.error('启动检测失败');
        }
    },

    // 仓管提交检测结果
    doResolveInspection(allocationId, materialId) {
        const resultSelect = document.getElementById(`inspectResult_${materialId}`);
        const remarkInput = document.getElementById(`inspectRemark_${materialId}`);
        if (!resultSelect) return;
        const result = resultSelect.value;
        const remark = remarkInput?.value || '';
        if (!result) {
            Toast.error('请选择检测结果');
            return;
        }
        const ret = dataManager.resolveInspection(allocationId, materialId, result, remark);
        if (ret && ret.success) {
            Toast.success(ret.message || '检测结果已提交');
            this.refresh();
            this.viewDetail(allocationId);
        } else {
            Toast.error((ret && ret.message) || '提交失败');
        }
    },

    // 查看详情
    viewDetail(id) {
        const allocation = dataManager.getAllocation(id);
        if (!allocation) return;

        const role = dataManager.getCurrentRole();
        const totalQty = allocation.items.reduce((sum, item) => sum + item.qty, 0);
        const isDrillNotConverted = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        const statusInfo = ALLOCATION_STATUS[allocation.status] || { label: allocation.status, class: 'info' };

        // ---- 转换信息区块 ----
        let convertBlock = '';
        if (allocation.convertedFromDrill) {
            const convertNode = (allocation.timeline || []).find(t => t.status === '__convert__');
            convertBlock = `
                <div class="convert-info-block" style="margin-bottom: 16px;">
                    <div style="font-weight:600;margin-bottom:8px;">🎯→🚨 演练单升级为真实事件单</div>
                    <div class="convert-row">
                        <span>升级时间</span>
                        <span>${convertNode?.time || '-'}</span>
                    </div>
                    <div class="convert-row">
                        <span>操作人</span>
                        <span>${convertNode?.operator || '-'}</span>
                    </div>
                    <div class="convert-row">
                        <span>升级原因</span>
                        <span style="font-size:12px;line-height:1.5;">${convertNode?.remark || '-'}</span>
                    </div>
                    <div class="convert-row">
                        <span>迁移内容</span>
                        <span style="font-size:12px;">物资预占、志愿者分配、社区签收状态全部保留</span>
                    </div>
                </div>
            `;
        }

        // ---- 物资清单（含检测状态列）----
        const itemsBlock = allocation.items.map(item => {
            const m = dataManager.getMaterial(item.materialId);
            const needTip = m && m.needInspection ? ' <span style="color:#d48806;font-size:11px;">归还需检测</span>' : '';
            // 找到对应检测记录
            const insp = (allocation.inspections || []).find(i => i.materialId === item.materialId);
            let inspTag = '-';
            let inspRemark = '';
            if (insp) {
                inspTag = getInspectionTag(insp.status);
                if (insp.resultRemark) inspRemark = `<div style="font-size:11px;color:#8c8c8c;">${insp.resultRemark}</div>`;
            }
            return `
                <div class="material-batch-item">
                    <div class="batch-head">
                        <span class="batch-name">${item.materialName}${needTip}</span>
                        <span>${item.qty} 件</span>
                    </div>
                    <div class="batch-info">
                        ${item.spec ? `<span>规格: ${item.spec}</span>` : ''}
                        <span>已出库: ${item.pickedQty || 0}</span>
                        <span>已签收: ${item.receivedQty || 0}</span>
                        <span>已归还: ${item.returnedQty || 0}</span>
                        ${insp ? `<span style="color:#d48806;">检测: ${INSPECTION_STATUS[insp.status]?.label || insp.status}</span>` : ''}
                    </div>
                    ${inspTag !== '-' ? `<div style="padding:6px 0 0;">${inspTag}${inspRemark}</div>` : ''}
                </div>
            `;
        }).join('');

        // ---- 检测处理区块（仓管可见）----
        let inspectionBlock = '';
        const pendingList = (allocation.inspections || []).filter(i => ['pending', 'inspecting'].includes(i.status));
        const doneList = (allocation.inspections || []).filter(i => ['passed', 'failed', 'skipped'].includes(i.status));
        if ((pendingList.length > 0 || doneList.length > 0)) {
            const pendingRows = pendingList.map(i => {
                const m = dataManager.getMaterial(i.materialId);
                const isWarehouse = role === 'warehouse';
                let actionBtn = '';
                if (isWarehouse && i.status === 'pending') {
                    actionBtn = `<button class="btn btn-sm btn-primary" style="margin-left:8px;" 
                        onclick="AllocationPage.doStartInspection('${allocation.id}', '${i.materialId}')">开始检测</button>`;
                }
                let resolveBlock = '';
                if (isWarehouse && i.status === 'inspecting') {
                    resolveBlock = `
                        <div style="margin-top:8px;padding:8px;background:#fafafa;border-radius:4px;">
                            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                                <select id="inspectResult_${i.materialId}" style="padding:4px 8px;border:1px solid #d9d9d9;border-radius:4px;">
                                    <option value="">选择检测结果</option>
                                    <option value="passed">✅ 检测通过（可调拨）</option>
                                    <option value="failed">❌ 检测不通过（需维修/报废）</option>
                                    <option value="skipped">⏭️ 免检</option>
                                </select>
                                <input type="text" id="inspectRemark_${i.materialId}" placeholder="检测说明（如：正常/需换机油）"
                                    style="padding:4px 8px;border:1px solid #d9d9d9;border-radius:4px;flex:1;min-width:150px;">
                                <button class="btn btn-sm btn-success" 
                                    onclick="AllocationPage.doResolveInspection('${allocation.id}', '${i.materialId}')">提交结果</button>
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="inspection-row">
                        <div class="inspection-mat">
                            <strong>${m?.name || i.materialName}</strong>
                            <span style="color:#8c8c8c;font-size:12px;">${i.qty} 件</span>
                            ${actionBtn}
                        </div>
                        <div class="inspection-status">${getInspectionTag(i.status)}</div>
                        ${i.time ? `<div style="font-size:11px;color:#8c8c8c;grid-column:1/-1;">检测时间: ${i.time}</div>` : ''}
                        ${resolveBlock}
                    </div>
                `;
            }).join('');

            const doneRows = doneList.map(i => {
                const m = dataManager.getMaterial(i.materialId);
                return `
                    <div class="inspection-row" style="opacity:0.8;">
                        <div class="inspection-mat">
                            <span>${m?.name || i.materialName}</span>
                            <span style="color:#8c8c8c;font-size:12px;">${i.qty} 件</span>
                        </div>
                        <div class="inspection-status">${getInspectionTag(i.status)}</div>
                        <div style="font-size:11px;color:#8c8c8c;grid-column:1/-1;">
                            ${i.time} · ${i.resultRemark || '无备注'}
                        </div>
                    </div>
                `;
            }).join('');

            inspectionBlock = `
                <div class="inspection-block">
                    <div style="font-weight:600;margin-bottom:12px;">🔧 归还检测状态 <span style="font-weight:400;font-size:12px;color:#8c8c8c;">（${pendingList.length} 待处理 / ${doneList.length} 已完成）</span></div>
                    ${pendingRows ? `<div class="inspection-list">${pendingRows}</div>` : ''}
                    ${doneRows ? `<div style="margin-top:12px;padding-top:8px;border-top:1px dashed #e8e8e8;"><div style="font-size:12px;color:#8c8c8c;margin-bottom:6px;">已完成检测</div><div class="inspection-list">${doneRows}</div></div>` : ''}
                    ${pendingList.length === 0 && allocation.status === 'inspecting' ? `
                        <div style="padding:8px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:4px;font-size:12px;color:#389e0d;">
                            ✅ 所有物资检测完成，单据即将归档
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // ---- 流转记录（含__convert__特殊样式）----
        const timelineBlock = allocation.timeline.map(t => {
            const isConvert = t.status === '__convert__';
            const label = isConvert ? '🎯→🚨 演练升级真实' : (ALLOCATION_STATUS[t.status]?.label || t.status);
            const color = isConvert ? '#d46b08' : '#1890ff';
            const bg = isConvert ? '#fff7e6' : '#e6f7ff';
            return `
                <div style="padding-left: 16px; border-left: 2px solid ${isConvert ? '#ffd591' : '#e8e8e8'}; position: relative;">
                    <div style="position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div>
                    <div style="font-size: 12px; color: #8c8c8c;">${t.time}</div>
                    <div style="font-size: 13px; margin-top: 2px;">
                        <strong style="color:${color};background:${bg};padding:2px 6px;border-radius:3px;">${label}</strong> - ${t.operator}
                    </div>
                    ${t.remark ? `<div style="font-size: 12px; color: #8c8c8c; margin-top: 2px; line-height:1.5;">${t.remark}</div>` : ''}
                </div>
            `;
        }).join('');

        const topRightBtns = `
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                ${getBillTypeTag(allocation)}
                ${getStatusTag(allocation.status, 'allocation')}
                ${allocation.inspectionStatus ? getInspectionTag(allocation.inspectionStatus) : ''}
            </div>
        `;

        // 底部操作按钮
        const footerBtns = [{ text: '关闭', action: 'close', class: '' }];
        if (role === 'commander' && isDrillNotConverted && !['completed', 'rejected'].includes(allocation.status)) {
            footerBtns.unshift({
                text: '🎯→🚨 升级为真实',
                action: 'convert',
                class: 'btn-convert',
                onClick: () => { Modal.close(); this.askConvertDrill(id); }
            });
        }

        const content = `
            ${convertBlock}

            <div class="detail-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h4 style="margin: 0;">${allocation.billNo}</h4>
                    ${topRightBtns}
                </div>
                <div class="detail-row">
                    <span class="label">单据类型</span>
                    <span class="value">${getBillTypeTag(allocation)}</span>
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
                ${itemsBlock}
            </div>

            ${inspectionBlock}

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
                    ${timelineBlock}
                </div>
            </div>

            ${allocation.remark ? `
            <div class="detail-section">
                <h4>备注</h4>
                <p style="font-size: 13px; color: #595959;">${allocation.remark}</p>
            </div>
            ` : ''}
        `;

        Modal.show('调拨单详情', content, footerBtns);
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
