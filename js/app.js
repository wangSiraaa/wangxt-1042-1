// 主应用逻辑

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.initNavigation();
        this.initRoleSwitcher();
        this.updateRoleUI();
        this.refreshAll();
        
        Toast.info('系统已就绪，您可以切换不同角色体验全流程');
    }

    // 初始化导航
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    }

    // 切换页面
    switchPage(page) {
        // 更新导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // 更新页面内容
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.remove('active');
        });
        const targetPage = document.getElementById('page-' + page);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        this.currentPage = page;

        // 刷新对应页面数据
        this.refreshPage(page);
    }

    // 刷新指定页面
    refreshPage(page) {
        switch (page) {
            case 'dashboard':
                if (typeof DashboardPage !== 'undefined') {
                    DashboardPage.refresh();
                }
                break;
            case 'warehouse':
                if (typeof WarehousePage !== 'undefined') {
                    WarehousePage.refresh();
                }
                break;
            case 'allocation':
                if (typeof AllocationPage !== 'undefined') {
                    AllocationPage.refresh();
                }
                break;
            case 'transport':
                if (typeof TransportPage !== 'undefined') {
                    TransportPage.refresh();
                }
                break;
            case 'return':
                if (typeof ReturnPage !== 'undefined') {
                    ReturnPage.refresh();
                }
                break;
        }
    }

    // 刷新所有页面数据
    refreshAll() {
        this.refreshPage('dashboard');
        this.refreshPage('allocation');
        this.refreshPage('transport');
        this.refreshPage('return');
        this.updateBadges();
    }

    // 更新角标
    updateBadges() {
        const allocations = dataManager.getAllocations();
        const pendingCount = allocations.filter(a => a.status === 'pending').length;
        const overdueCount = dataManager.getOverdueAllocations().length;

        const allocationBadge = document.getElementById('allocationBadge');
        if (allocationBadge) {
            allocationBadge.textContent = pendingCount;
            allocationBadge.style.display = pendingCount > 0 ? '' : 'none';
        }

        const overdueBadge = document.getElementById('overdueBadge');
        if (overdueBadge) {
            overdueBadge.textContent = overdueCount;
            overdueBadge.style.display = overdueCount > 0 ? '' : 'none';
        }
    }

    // 初始化角色切换
    initRoleSwitcher() {
        const selector = document.getElementById('roleSelector');
        if (selector) {
            selector.value = dataManager.getCurrentRole();
            selector.addEventListener('change', (e) => {
                this.switchRole(e.target.value);
            });
        }
    }

    // 切换角色
    switchRole(role) {
        dataManager.setCurrentRole(role);
        this.updateRoleUI();
        this.refreshAll();
        
        const roleInfo = ROLES[role];
        Toast.success(`已切换为${roleInfo.name}角色：${roleInfo.defaultUser}`);
    }

    // 根据角色更新UI
    updateRoleUI() {
        const role = dataManager.getCurrentRole();
        const userName = dataManager.getCurrentUser();
        
        // 更新用户名显示
        const userNameEl = document.getElementById('currentUserName');
        if (userNameEl) {
            userNameEl.textContent = userName;
        }

        // 更新角色选择器
        const roleSelector = document.getElementById('roleSelector');
        if (roleSelector) {
            roleSelector.value = role;
        }

        // 根据角色显示/隐藏功能按钮
        // 仓管：录入物资、审批、出库、入库
        const addMaterialBtn = document.getElementById('addMaterialBtn');
        if (addMaterialBtn) {
            addMaterialBtn.style.display = role === 'warehouse' ? 'inline-block' : 'none';
        }

        // 指挥员：发起调拨
        const newAllocationBtn = document.getElementById('newAllocationBtn');
        if (newAllocationBtn) {
            newAllocationBtn.style.display = role === 'commander' ? 'inline-block' : 'none';
        }

        // 仓管或指挥员：批量催还
        const urgeReturnBtn = document.getElementById('urgeReturnBtn');
        if (urgeReturnBtn) {
            urgeReturnBtn.style.display = (role === 'warehouse' || role === 'commander') ? 'inline-block' : 'none';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
