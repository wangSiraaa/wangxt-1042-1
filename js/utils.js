// 通用工具函数

// Toast 消息提示
const Toast = {
    _container: null,
    
    init() {
        this._container = document.getElementById('toastContainer');
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.className = 'toast-container';
            this._container.id = 'toastContainer';
            document.body.appendChild(this._container);
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this._container) this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        toast.innerHTML = `
            <span>${icons[type] || 'ℹ'}</span>
            <span>${message}</span>
        `;
        
        this._container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success(message, duration) {
        this.show(message, 'success', duration);
    },
    
    error(message, duration) {
        this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
        this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
        this.show(message, 'info', duration);
    }
};

// 模态框管理
const Modal = {
    _overlay: null,
    _container: null,
    
    init() {
        this._overlay = document.getElementById('modalOverlay');
        this._container = document.getElementById('modalContainer');
    },
    
    show(title, content, footerButtons = []) {
        if (!this._overlay) this.init();
        
        const footerHtml = footerButtons.length > 0 
            ? `<div class="modal-footer">${footerButtons.map(btn => 
                `<button class="btn ${btn.class || ''}" data-action="${btn.action}">${btn.text}</button>`
            ).join('')}</div>`
            : '';
        
        this._container.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" data-action="close">×</button>
            </div>
            <div class="modal-body">${content}</div>
            ${footerHtml}
        `;
        
        this._overlay.classList.add('active');
        
        // 绑定事件
        this._container.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
        
        this._container.querySelectorAll('.modal-footer .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const handler = footerButtons.find(b => b.action === action);
                if (handler && handler.onClick) {
                    handler.onClick();
                }
            });
        });
        
        // 点击遮罩关闭
        this._overlay.onclick = (e) => {
            if (e.target === this._overlay) {
                this.close();
            }
        };
    },
    
    close() {
        if (this._overlay) {
            this._overlay.classList.remove('active');
        }
    },
    
    getBody() {
        return this._container ? this._container.querySelector('.modal-body') : null;
    }
};

// 格式化数字
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// 格式化日期
function formatDate(dateStr, format = 'YYYY-MM-DD') {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

// 获取日期差（天）
function getDaysDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d1 - d2;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 获取今天日期字符串
function getToday() {
    return new Date().toISOString().split('T')[0];
}

// 生成随机ID
function generateId(prefix = '') {
    return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 深拷贝
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

// 获取状态标签HTML
function getStatusTag(status, type = 'allocation') {
    let statusInfo;
    if (type === 'allocation') {
        statusInfo = ALLOCATION_STATUS[status] || { label: status, class: 'info' };
    } else if (type === 'maintenance') {
        statusInfo = MAINTENANCE_STATUS[status] || { label: status, class: 'info' };
    }
    return `<span class="status-tag ${statusInfo.class}">${statusInfo.label}</span>`;
}

// 判断物资库存状态
function getMaterialStatus(material) {
    const today = new Date();
    const expireDate = new Date(material.expireDate);
    const daysUntilExpire = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpire <= 0 || material.totalQty === 0) {
        return 'danger';
    } else if (daysUntilExpire <= 30 || material.totalQty <= material.warningThreshold) {
        return 'warning';
    }
    return 'normal';
}

// 获取仓位状态
function getPositionStatus(positionDetail) {
    if (!positionDetail || positionDetail.materials.length === 0) {
        return 'normal';
    }
    
    const hasExpired = positionDetail.materials.some(m => new Date(m.expireDate) < new Date());
    const hasLowStock = positionDetail.materials.some(m => m.totalQty <= m.warningThreshold);
    const hasLocked = positionDetail.totalLocked > 0;
    
    if (hasExpired) {
        return 'danger';
    }
    if (hasLocked) {
        return 'locked';
    }
    if (hasLowStock) {
        return 'warning';
    }
    return 'normal';
}

// 计算容量百分比状态
function getCapacityClass(usageRate) {
    if (usageRate >= 80) return 'low';
    if (usageRate >= 50) return 'medium';
    return 'high';
}
