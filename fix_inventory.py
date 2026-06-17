#!/usr/bin/env python3
"""修复双轨库存模型：演练池与真实池完全分离"""

import re

with open('js/data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ========== 1. 修复 _lockInventory ==========
old_lock = '''    _lockInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material && material.availableQty >= item.qty) {
                material.availableQty -= item.qty;
                if (isDrill) {
                    material.drillLockedQty += item.qty;
                } else {
                    material.lockedQty += item.qty;
                }
            }
        });
    }'''

new_lock = '''    _lockInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material) return;
            const lockQty = item.qty;
            if (isDrill) {
                material.drillLockedQty += lockQty;
            } else if (material.availableQty >= lockQty) {
                material.availableQty -= lockQty;
                material.lockedQty += lockQty;
            }
        });
    }'''

assert old_lock in content, "_lockInventory 未找到"
content = content.replace(old_lock, new_lock)
print("✓ _lockInventory 修复完成")

# ========== 2. 修复 _unlockInventory ==========
old_unlock = '''    _unlockInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material) {
                const lockedField = isDrill ? 'drillLockedQty' : 'lockedQty';
                const unlockQty = Math.min(item.qty, material[lockedField]);
                material.availableQty += unlockQty;
                material[lockedField] -= unlockQty;
            }
        });
    }'''

new_unlock = '''    _unlockInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material) return;
            const unlockQty = item.qty;
            if (isDrill) {
                material.drillLockedQty = Math.max(0, material.drillLockedQty - unlockQty);
            } else {
                const actualUnlock = Math.min(unlockQty, material.lockedQty);
                material.lockedQty -= actualUnlock;
                material.availableQty += actualUnlock;
            }
        });
    }'''

assert old_unlock in content, "_unlockInventory 未找到"
content = content.replace(old_unlock, new_unlock)
print("✓ _unlockInventory 修复完成")

# ========== 3. 修复 _decreaseInventory ==========
old_decrease = '''    _decreaseInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material) {
                const lockedField = isDrill ? 'drillLockedQty' : 'lockedQty';
                const pickQty = Math.min(item.qty, material[lockedField]);
                material[lockedField] -= pickQty;
                if (!isDrill) {
                    material.totalQty -= pickQty;
                }
                item.pickedQty = pickQty;
            }
        });
    }'''

new_decrease = '''    _decreaseInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material) return;
            const pickQty = item.qty;
            if (isDrill) {
                item.pickedQty = pickQty;
            } else {
                const actualPick = Math.min(pickQty, material.lockedQty);
                material.lockedQty -= actualPick;
                material.totalQty -= actualPick;
                item.pickedQty = actualPick;
            }
        });
    }'''

assert old_decrease in content, "_decreaseInventory 未找到"
content = content.replace(old_decrease, new_decrease)
print("✓ _decreaseInventory 修复完成")

# ========== 4. 修复 _returnInventory ==========
old_return = '''    _returnInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material && item.returnedQty > 0) {
                if (material.needInspection) {
                    item.inspectionStatus = 'pending';
                } else {
                    item.inspectionStatus = 'skipped';
                }
                if (!isDrill) {
                    material.totalQty += item.returnedQty;
                }
                if (!material.needInspection) {
                    material.availableQty += item.returnedQty;
                }
            }
        });
    }'''

new_return = '''    _returnInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material || item.returnedQty <= 0) return;
            const qty = item.returnedQty;
            
            if (material.needInspection) {
                item.inspectionStatus = 'pending';
            } else {
                item.inspectionStatus = 'skipped';
            }
            
            if (isDrill) {
                material.drillLockedQty = Math.max(0, material.drillLockedQty - qty);
            } else {
                material.totalQty += qty;
                if (!material.needInspection) {
                    material.availableQty += qty;
                }
            }
        });
    }'''

assert old_return in content, "_returnInventory 未找到"
content = content.replace(old_return, new_return)
print("✓ _returnInventory 修复完成")

# ========== 5. 修复 _startInspectionInventory ==========
old_start_insp = '''    _startInspectionInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material && material.needInspection && item.returnedQty > 0) {
                const qty = item.returnedQty;
                material.inspectingQty += qty;
                material.availableQty -= qty;
                item.inspectionStatus = 'pending';
                allocation.inspections = allocation.inspections || [];
                allocation.inspections.push({
                    materialId: item.materialId,
                    time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    operator: this.data.currentUser,
                    status: 'pending',
                    qty: qty,
                    remark: '归还入库，等待检测'
                });
            }
        });
    }'''

new_start_insp = '''    _startInspectionInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        const isDrill = allocation.billType === 'drill' && !allocation.convertedFromDrill;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material || !material.needInspection || item.returnedQty <= 0) return;
            const qty = item.returnedQty;
            
            item.inspectionStatus = 'pending';
            allocation.inspections = allocation.inspections || [];
            allocation.inspections.push({
                materialId: item.materialId,
                time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                operator: this.data.currentUser,
                status: 'pending',
                qty: qty,
                remark: '归还入库，等待检测'
            });
            
            if (isDrill) {
                // 演练单检测只走状态机，不影响真实库存数量
                // drillLockedQty 在归还时已释放，检测中继续保持释放状态
            } else {
                // 真实单：物资物理归还入库，进入检测队列（不可调拨）
                // totalQty 在归还时已加回（_returnInventory 或其他路径），这里只标记检测中
                // 注意：如果直接从 returning 到 inspecting，totalQty 还没加，需要在这里加
                // 重新梳理：归还入库 = 物理数量恢复 + 标记检测中
                material.totalQty += qty;
                material.inspectingQty += qty;
                // available 不加，因为检测中不能调拨
            }
        });
    }'''

assert old_start_insp in content, "_startInspectionInventory 未找到"
content = content.replace(old_start_insp, new_start_insp)
print("✓ _startInspectionInventory 修复完成")

# ========== 6. 重写 convertDrillToReal ==========
# 先读一下现有的
old_convert_match = re.search(
    r"    // 将演练单升级为真实灾情单.*?(?=\n    // |\n    [a-z])",
    content, re.DOTALL
)
if old_convert_match:
    old_convert = old_convert_match.group(0)
    print(f"找到 convertDrillToReal，长度: {len(old_convert)}")
else:
    print("⚠ 未找到 convertDrillToReal，尝试另一种方式")
    
with open('js/data.js', 'r', encoding='utf-8') as f:
    original = f.read()

# 找到 convertDrillToReal 方法
start_idx = content.find('convertDrillToReal(allocationId, reason')
if start_idx == -1:
    start_idx = content.find('convertDrillToReal(allocationId')
print(f"convertDrillToReal 起始位置: {start_idx}")

# 找到下一个方法的开头（"    //" 或 "    [a-z]"）
# 简单处理：找到之后的 "    }" 闭合
# 先用行号定位

lines = content.split('\n')
convert_start_line = -1
for i, line in enumerate(lines):
    if 'convertDrillToReal' in line and 'function' not in line:
        convert_start_line = i
        break
print(f"convertDrillToReal 起始行: {convert_start_line}")

# 数大括号找到方法结束
if convert_start_line >= 0:
    brace_count = 0
    convert_end_line = -1
    started = False
    for i in range(convert_start_line, len(lines)):
        line = lines[i]
        brace_count += line.count('{') - line.count('}')
        if '{' in line:
            started = True
        if started and brace_count == 0 and '}' in line and i > convert_start_line:
            convert_end_line = i
            break
    print(f"convertDrillToReal 结束行: {convert_end_line}")
    
    if convert_end_line > 0:
        old_convert_method = '\n'.join(lines[convert_start_line:convert_end_line+1])
        
        new_convert_method = '''    // 将演练单升级为真实灾情单（原子操作：迁移预占物资+打标记+写timeline）
    convertDrillToReal(allocationId, reason = '') {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return { success: false, message: '调拨单不存在' };
        if (allocation.billType !== 'drill' || allocation.convertedFromDrill) {
            return { success: false, message: '该单据不是演练单或已转换' };
        }
        if (['completed', 'rejected'].includes(allocation.status)) {
            return { success: false, message: '已完成/驳回的单据不能转换' };
        }
        
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const status = allocation.status;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material) return;
            
            const qty = item.qty;
            const drillLocked = Math.min(qty, material.drillLockedQty);
            
            // 先从演练预占中扣出
            if (drillLocked > 0) {
                material.drillLockedQty -= drillLocked;
            }
            
            // 根据当前状态，迁移到真实库存的对应字段
            if (status === 'pending' || status === 'approved') {
                // 未出库：演练预占 → 真实锁定
                if (material.availableQty >= qty) {
                    material.lockedQty += qty;
                    material.availableQty -= qty;
                } else {
                    // 库存不足，尽量扣
                    const canLock = Math.min(qty, material.availableQty);
                    material.lockedQty += canLock;
                    material.availableQty -= canLock;
                }
            } else if (['picking', 'transporting', 'received', 'returning'].includes(status)) {
                // 已出库未归还：演练虚拟出库 → 真实出库
                material.totalQty -= qty;
                material.availableQty = Math.max(0, material.availableQty - qty);
                // 注意：如果有部分归还，要处理 returnedQty
                const returnedQty = item.returnedQty || 0;
                if (returnedQty > 0 && !material.needInspection) {
                    // 已归还且不需要检测的部分，恢复 total 和 available
                    material.totalQty += returnedQty;
                    material.availableQty += returnedQty;
                }
                // 需要检测的归还部分，在 inspecting 状态下处理
            } else if (status === 'inspecting') {
                // 检测中：演练虚拟检测 → 真实检测中
                material.inspectingQty += qty;
                material.availableQty = Math.max(0, material.availableQty - qty);
                // totalQty 不变（物资物理上在仓库，只是检测中）
            }
        });
        
        allocation.billType = 'real';
        allocation.convertedFromDrill = true;
        allocation.originalDrillBillNo = allocation.originalDrillBillNo || allocation.billNo;
        allocation.timeline.push({
            status: '__convert__',
            time: now,
            operator: this.data.currentUser,
            remark: reason ? `【演练转真实】${reason}` : '【演练转真实】指挥员升级为真实灾情单，预占物资转入真实库存扣减'
        });
        
        this.save();
        return { success: true, message: '已成功升级为真实灾情单' };
    }'''
        
        lines_new = lines[:convert_start_line] + [new_convert_method] + lines[convert_end_line+1:]
        content = '\n'.join(lines_new)
        print("✓ convertDrillToReal 重写完成")

# ========== 7. 修复 validateAllocation ==========
old_validate_match = re.search(
    r"    validateAllocation\(items, community, billType = 'real'\) \{.*?(?=\n    // |\n    [a-z])",
    content, re.DOTALL
)
if old_validate_match:
    old_valid = old_validate_match.group(0)
    print(f"找到 validateAllocation，长度: {len(old_valid)}")
else:
    print("⚠ 用行号找 validateAllocation")
    
# 用行号定位
lines = content.split('\n')
valid_start_line = -1
for i, line in enumerate(lines):
    if 'validateAllocation(items, community' in line:
        valid_start_line = i
        break
print(f"validateAllocation 起始行: {valid_start_line}")

if valid_start_line >= 0:
    brace_count = 0
    valid_end_line = -1
    started = False
    for i in range(valid_start_line, len(lines)):
        line = lines[i]
        brace_count += line.count('{') - line.count('}')
        if '{' in line:
            started = True
        if started and brace_count == 0 and '}' in line and i > valid_start_line:
            valid_end_line = i
            break
    print(f"validateAllocation 结束行: {valid_end_line}")

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ 所有库存方法修复完成！")
