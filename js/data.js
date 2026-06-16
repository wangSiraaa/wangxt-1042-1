// 应急物资仓位管理系统 - 数据模型与模拟数据

const STORAGE_KEY = 'emergency_warehouse_data';

// 角色定义
const ROLES = {
    warehouse: { name: '仓管', icon: '📦', defaultUser: '仓管-张伟' },
    commander: { name: '指挥员', icon: '🎖️', defaultUser: '指挥员-李强' },
    volunteer: { name: '志愿者', icon: '🙋', defaultUser: '志愿者-王芳' },
    receiver: { name: '社区接收人', icon: '🏘️', defaultUser: '社区-刘主任' }
};

// 调拨单类型：演练单 / 真实灾情单
const BILL_TYPE = {
    drill: { label: '演练单', icon: '🎯', class: 'info', desc: '演练物资，不占用真实库存' },
    real: { label: '真实单', icon: '🚨', class: 'danger', desc: '真实灾情，占用实际库存' }
};

// 调拨单状态定义
const ALLOCATION_STATUS = {
    pending: { label: '待审批', class: 'warning' },
    approved: { label: '待领用', class: 'info' },
    picking: { label: '出库中', class: 'purple' },
    transporting: { label: '转运中', class: 'cyan' },
    received: { label: '已签收', class: 'normal' },
    returning: { label: '归还中', class: 'orange' },
    inspecting: { label: '检测中', class: 'inspecting' },
    completed: { label: '已完成', class: 'normal' },
    rejected: { label: '已驳回', class: 'danger' }
};

// 归还检测状态
const INSPECTION_STATUS = {
    none: { label: '无需检测', class: 'normal' },
    pending: { label: '待检测', class: 'warning', desc: '已归还，等待仓管检测后方可再调拨' },
    inspecting: { label: '检测中', class: 'inspecting', desc: '仓管正在检测功能/性能' },
    passed: { label: '检测通过', class: 'normal', desc: '检测合格，已恢复可调拨' },
    failed: { label: '检测不通过', class: 'danger', desc: '检测不合格，需维修或报废' },
    skipped: { label: '免检入库', class: 'info', desc: '物资无需检测，直接入库' }
};

// 需要归还检测的物资类别（发电机、通讯设备等精密设备）
const INSPECTION_REQUIRED_MATERIALS = ['发电机', '柴油发电机', '汽油发电机', '抽水机', '水泵', '对讲机', '手持扩音器', '应急照明', '排涝泵'];

// 保养状态
const MAINTENANCE_STATUS = {
    good: { label: '良好', class: 'normal' },
    normal: { label: '一般', class: 'warning' },
    bad: { label: '需维修', class: 'danger' }
};

// 社区列表
const COMMUNITIES = [
    '东风社区', '红星社区', '朝阳社区', '和平社区', '新华社区'
];

// 默认仓位布局 (3行6列 = 18个仓位)
const DEFAULT_POSITIONS = [
    { code: 'A-01', name: '医疗急救区', category: '医疗急救', capacity: 200, row: 0, col: 0 },
    { code: 'A-02', name: '医疗急救区', category: '医疗急救', capacity: 200, row: 0, col: 1 },
    { code: 'A-03', name: '防汛物资区', category: '防汛物资', capacity: 150, row: 0, col: 2 },
    { code: 'A-04', name: '防汛物资区', category: '防汛物资', capacity: 150, row: 0, col: 3 },
    { code: 'A-05', name: '消防器材区', category: '消防器材', capacity: 100, row: 0, col: 4 },
    { code: 'A-06', name: '消防器材区', category: '消防器材', capacity: 100, row: 0, col: 5 },
    { code: 'B-01', name: '生活物资区', category: '生活物资', capacity: 300, row: 1, col: 0 },
    { code: 'B-02', name: '生活物资区', category: '生活物资', capacity: 300, row: 1, col: 1 },
    { code: 'B-03', name: '生活物资区', category: '生活物资', capacity: 300, row: 1, col: 2 },
    { code: 'B-04', name: '通讯设备区', category: '通讯设备', capacity: 80, row: 1, col: 3 },
    { code: 'B-05', name: '通讯设备区', category: '通讯设备', capacity: 80, row: 1, col: 4 },
    { code: 'B-06', name: '工具设备区', category: '工具设备', capacity: 120, row: 1, col: 5 },
    { code: 'C-01', name: '备用仓位', category: '备用', capacity: 200, row: 2, col: 0 },
    { code: 'C-02', name: '备用仓位', category: '备用', capacity: 200, row: 2, col: 1 },
    { code: 'C-03', name: '备用仓位', category: '备用', capacity: 200, row: 2, col: 2 },
    { code: 'C-04', name: '危险品区', category: '危险品', capacity: 50, row: 2, col: 3 },
    { code: 'C-05', name: '危险品区', category: '危险品', capacity: 50, row: 2, col: 4 },
    { code: 'C-06', name: '出入库暂存区', category: '暂存', capacity: 100, row: 2, col: 5 }
];

// 生成日期字符串（从今天偏移天数）
function getDateStr(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

function getDateTimeStr(daysOffset = 0, hoursOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 默认物资批次数据
const DEFAULT_MATERIALS = [
    {
        id: 'mat_001',
        name: '医用外科口罩',
        category: '医疗急救',
        spec: '50只/盒',
        unit: '盒',
        batchNo: 'YL20250601',
        expireDate: getDateStr(180),
        positionCode: 'A-01',
        totalQty: 120,
        availableQty: 120,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-3),
        warningThreshold: 30
    },
    {
        id: 'mat_002',
        name: 'N95防护口罩',
        category: '医疗急救',
        spec: '25只/盒',
        unit: '盒',
        batchNo: 'YL20250515',
        expireDate: getDateStr(90),
        positionCode: 'A-01',
        totalQty: 80,
        availableQty: 80,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-5),
        warningThreshold: 20
    },
    {
        id: 'mat_003',
        name: '医用防护服',
        category: '医疗急救',
        spec: '连体式',
        unit: '套',
        batchNo: 'YL20241201',
        expireDate: getDateStr(-15),
        positionCode: 'A-02',
        totalQty: 50,
        availableQty: 0,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'normal',
        lastCheckDate: getDateStr(-30),
        warningThreshold: 20
    },
    {
        id: 'mat_004',
        name: '医用防护服',
        category: '医疗急救',
        spec: '连体式',
        unit: '套',
        batchNo: 'YL20250301',
        expireDate: getDateStr(120),
        positionCode: 'A-02',
        totalQty: 100,
        availableQty: 100,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-10),
        warningThreshold: 20
    },
    {
        id: 'mat_005',
        name: '急救箱',
        category: '医疗急救',
        spec: '标准配置',
        unit: '个',
        batchNo: 'YL20250101',
        expireDate: getDateStr(365),
        positionCode: 'A-02',
        totalQty: 25,
        availableQty: 25,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-1),
        warningThreshold: 10
    },
    {
        id: 'mat_006',
        name: '防洪沙袋',
        category: '防汛物资',
        spec: '50kg/袋',
        unit: '袋',
        batchNo: 'FX20250201',
        expireDate: getDateStr(730),
        positionCode: 'A-03',
        totalQty: 200,
        availableQty: 200,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-15),
        warningThreshold: 50
    },
    {
        id: 'mat_007',
        name: '防汛救生衣',
        category: '防汛物资',
        spec: '成人型',
        unit: '件',
        batchNo: 'FX20240801',
        expireDate: getDateStr(200),
        positionCode: 'A-04',
        totalQty: 60,
        availableQty: 60,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'normal',
        lastCheckDate: getDateStr(-20),
        warningThreshold: 20
    },
    {
        id: 'mat_008',
        name: '应急手电',
        category: '防汛物资',
        spec: 'LED充电式',
        unit: '个',
        batchNo: 'FX20250401',
        expireDate: getDateStr(500),
        positionCode: 'A-04',
        totalQty: 80,
        availableQty: 80,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-7),
        warningThreshold: 20
    },
    {
        id: 'mat_009',
        name: '干粉灭火器',
        category: '消防器材',
        spec: '4kg',
        unit: '具',
        batchNo: 'XF20240101',
        expireDate: getDateStr(60),
        positionCode: 'A-05',
        totalQty: 30,
        availableQty: 30,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'normal',
        lastCheckDate: getDateStr(-45),
        warningThreshold: 10
    },
    {
        id: 'mat_010',
        name: '消防水带',
        category: '消防器材',
        spec: '65mm*20m',
        unit: '盘',
        batchNo: 'XF20250301',
        expireDate: getDateStr(600),
        positionCode: 'A-05',
        totalQty: 20,
        availableQty: 20,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-10),
        warningThreshold: 5
    },
    {
        id: 'mat_011',
        name: '消防斧',
        category: '消防器材',
        spec: '标准型',
        unit: '把',
        batchNo: 'XF20240601',
        expireDate: getDateStr(900),
        positionCode: 'A-06',
        totalQty: 10,
        availableQty: 10,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-30),
        warningThreshold: 3
    },
    {
        id: 'mat_012',
        name: '应急饮用水',
        category: '生活物资',
        spec: '550ml*24瓶',
        unit: '箱',
        batchNo: 'SH20250501',
        expireDate: getDateStr(45),
        positionCode: 'B-01',
        totalQty: 150,
        availableQty: 150,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-2),
        warningThreshold: 40
    },
    {
        id: 'mat_013',
        name: '压缩饼干',
        category: '生活物资',
        spec: '500g/包',
        unit: '包',
        batchNo: 'SH20250401',
        expireDate: getDateStr(180),
        positionCode: 'B-01',
        totalQty: 200,
        availableQty: 200,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-5),
        warningThreshold: 50
    },
    {
        id: 'mat_014',
        name: '应急毛毯',
        category: '生活物资',
        spec: '1.5m*2m',
        unit: '条',
        batchNo: 'SH20241101',
        expireDate: getDateStr(365),
        positionCode: 'B-02',
        totalQty: 100,
        availableQty: 100,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-15),
        warningThreshold: 30
    },
    {
        id: 'mat_015',
        name: '折叠床',
        category: '生活物资',
        spec: '单人折叠',
        unit: '张',
        batchNo: 'SH20250101',
        expireDate: getDateStr(1000),
        positionCode: 'B-03',
        totalQty: 40,
        availableQty: 40,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-10),
        warningThreshold: 10
    },
    {
        id: 'mat_016',
        name: '对讲机',
        category: '通讯设备',
        spec: '专业数字型',
        unit: '台',
        batchNo: 'TX20250301',
        expireDate: getDateStr(730),
        positionCode: 'B-04',
        totalQty: 20,
        availableQty: 20,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: true,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-3),
        warningThreshold: 5
    },
    {
        id: 'mat_017',
        name: '手持扩音器',
        category: '通讯设备',
        spec: '20W大功率',
        unit: '个',
        batchNo: 'TX20240901',
        expireDate: getDateStr(200),
        positionCode: 'B-05',
        totalQty: 15,
        availableQty: 15,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: true,
        maintenanceStatus: 'normal',
        lastCheckDate: getDateStr(-20),
        warningThreshold: 5
    },
    {
        id: 'mat_018',
        name: '警戒带',
        category: '工具设备',
        spec: '100m/卷',
        unit: '卷',
        batchNo: 'GJ20250201',
        expireDate: getDateStr(500),
        positionCode: 'B-06',
        totalQty: 50,
        availableQty: 50,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: false,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-10),
        warningThreshold: 10
    },
    {
        id: 'mat_019',
        name: '柴油发电机',
        category: '工具设备',
        spec: '5KW静音型',
        unit: '台',
        batchNo: 'FD20241201',
        expireDate: getDateStr(1825),
        positionCode: 'C-03',
        totalQty: 6,
        availableQty: 6,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: true,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-5),
        warningThreshold: 2
    },
    {
        id: 'mat_020',
        name: '汽油发电机',
        category: '工具设备',
        spec: '3KW便携型',
        unit: '台',
        batchNo: 'FD20250301',
        expireDate: getDateStr(1460),
        positionCode: 'C-03',
        totalQty: 8,
        availableQty: 8,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: true,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-2),
        warningThreshold: 2
    },
    {
        id: 'mat_021',
        name: '移动排水泵',
        category: '防汛物资',
        spec: '100m³/h',
        unit: '台',
        batchNo: 'FX20250101',
        expireDate: getDateStr(1095),
        positionCode: 'A-03',
        totalQty: 4,
        availableQty: 4,
        lockedQty: 0,
        drillLockedQty: 0,
        inspectingQty: 0,
        needInspection: true,
        maintenanceStatus: 'good',
        lastCheckDate: getDateStr(-8),
        warningThreshold: 1
    }
];

// 默认调拨单数据
const DEFAULT_ALLOCATIONS = [
    {
        id: 'all_001',
        billNo: 'DJ20250610001',
        billType: 'drill',
        convertedFromDrill: false,
        applyTime: getDateTimeStr(-2, -4),
        community: '东风社区',
        applicant: '指挥员-李强',
        status: 'transporting',
        urgentLevel: 'high',
        returnDeadline: getDateStr(3),
        purpose: '防汛应急演练',
        remark: '防汛演练专用，演练后切真实单请联系指挥员',
        volunteer: '志愿者-王芳',
        receiver: '社区-张主任',
        items: [
            { materialId: 'mat_006', materialName: '防洪沙袋', spec: '50kg/袋', qty: 50, pickedQty: 50, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_007', materialName: '防汛救生衣', spec: '成人型', qty: 20, pickedQty: 20, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_008', materialName: '应急手电', spec: 'LED充电式', qty: 20, pickedQty: 20, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-2, -4), operator: '指挥员-李强', remark: '发起防汛演练调拨申请（演练单）' },
            { status: 'approved', time: getDateTimeStr(-2, -3), operator: '仓管-张伟', remark: '审批通过，演练预占库存（不扣真实库存）' },
            { status: 'picking', time: getDateTimeStr(-2, -2), operator: '仓管-张伟', remark: '演练出库完成' },
            { status: 'transporting', time: getDateTimeStr(-2, -1), operator: '志愿者-王芳', remark: '演练物资转运中' }
        ],
        damage: { qty: 0, remark: '' },
        qtyDiff: { qty: 0, remark: '' },
        signPhotos: [],
        inspections: []
    },
    {
        id: 'all_002',
        billNo: 'DJ20250612002',
        billType: 'drill',
        convertedFromDrill: false,
        applyTime: getDateTimeStr(-1, -6),
        community: '红星社区',
        applicant: '指挥员-李强',
        status: 'pending',
        urgentLevel: 'medium',
        returnDeadline: getDateStr(5),
        purpose: '消防应急培训',
        remark: '用于社区消防演练，培训后归还',
        volunteer: '',
        receiver: '',
        items: [
            { materialId: 'mat_009', materialName: '干粉灭火器', spec: '4kg', qty: 10, pickedQty: 0, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_010', materialName: '消防水带', spec: '65mm*20m', qty: 5, pickedQty: 0, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_011', materialName: '消防斧', spec: '标准型', qty: 3, pickedQty: 0, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-1, -6), operator: '指挥员-李强', remark: '发起消防演练调拨（演练单）' }
        ],
        damage: { qty: 0, remark: '' },
        qtyDiff: { qty: 0, remark: '' },
        signPhotos: [],
        inspections: []
    },
    {
        id: 'all_003',
        billNo: 'DJ20250608003',
        billType: 'drill',
        convertedFromDrill: false,
        applyTime: getDateTimeStr(-8, -2),
        community: '朝阳社区',
        applicant: '指挥员-李强',
        status: 'inspecting',
        urgentLevel: 'low',
        returnDeadline: getDateStr(-2),
        purpose: '应急物资盘点检查',
        remark: '社区安全检查使用，对讲机需检测再入库',
        volunteer: '志愿者-李明',
        receiver: '社区-王主任',
        items: [
            { materialId: 'mat_001', materialName: '医用外科口罩', spec: '50只/盒', qty: 20, pickedQty: 20, receivedQty: 20, returnedQty: 18, inspectionStatus: 'skipped' },
            { materialId: 'mat_016', materialName: '对讲机', spec: '专业数字型', qty: 5, pickedQty: 5, receivedQty: 5, returnedQty: 5, inspectionStatus: 'pending' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-8, -2), operator: '指挥员-李强', remark: '发起盘点检查调拨（演练单）' },
            { status: 'approved', time: getDateTimeStr(-8, -1), operator: '仓管-张伟', remark: '审批通过' },
            { status: 'picking', time: getDateTimeStr(-8, 0), operator: '仓管-张伟', remark: '出库完成' },
            { status: 'transporting', time: getDateTimeStr(-8, 1), operator: '志愿者-李明', remark: '转运中' },
            { status: 'received', time: getDateTimeStr(-8, 3), operator: '社区-王主任', remark: '已签收，数量无误' },
            { status: 'returning', time: getDateTimeStr(-3, 0), operator: '志愿者-李明', remark: '归还中' },
            { status: 'inspecting', time: getDateTimeStr(-2, 2), operator: '仓管-张伟', remark: '归还入库，对讲机需检测（待检测）' }
        ],
        damage: { qty: 0, remark: '' },
        qtyDiff: { qty: -2, remark: '口罩损耗2盒' },
        signPhotos: ['sign_001', 'sign_002'],
        inspections: [
            { materialId: 'mat_016', time: getDateTimeStr(-2, 2), operator: '仓管-张伟', status: 'pending', qty: 5, remark: '归还入库，等待功能检测' }
        ]
    },
    {
        id: 'all_004',
        billNo: 'DJ20250605004',
        billType: 'real',
        convertedFromDrill: false,
        applyTime: getDateTimeStr(-12, 0),
        community: '和平社区',
        applicant: '指挥员-李强',
        status: 'received',
        urgentLevel: 'high',
        returnDeadline: getDateStr(-5),
        purpose: '暴雨应急响应',
        remark: '紧急调拨，真实暴雨防汛',
        volunteer: '志愿者-赵刚',
        receiver: '社区-陈主任',
        items: [
            { materialId: 'mat_006', materialName: '防洪沙袋', spec: '50kg/袋', qty: 100, pickedQty: 100, receivedQty: 98, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_007', materialName: '防汛救生衣', spec: '成人型', qty: 30, pickedQty: 30, receivedQty: 30, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_012', materialName: '应急饮用水', spec: '550ml*24瓶', qty: 30, pickedQty: 30, receivedQty: 30, returnedQty: 0, inspectionStatus: 'none' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-12, 0), operator: '指挥员-李强', remark: '紧急调拨申请（真实灾情）' },
            { status: 'approved', time: getDateTimeStr(-12, 0.5), operator: '仓管-张伟', remark: '紧急审批通过，已锁定真实库存' },
            { status: 'picking', time: getDateTimeStr(-12, 1), operator: '仓管-张伟', remark: '快速出库' },
            { status: 'transporting', time: getDateTimeStr(-12, 1.5), operator: '志愿者-赵刚', remark: '紧急运送中' },
            { status: 'received', time: getDateTimeStr(-12, 3), operator: '社区-陈主任', remark: '已签收，沙袋少2袋' }
        ],
        damage: { qty: 2, remark: '运输途中沙袋破损2袋' },
        qtyDiff: { qty: -2, remark: '实收98袋，破损2袋' },
        signPhotos: ['sign_003'],
        inspections: []
    },
    {
        id: 'all_005',
        billNo: 'DJ20250601005',
        billType: 'drill',
        convertedFromDrill: true,
        originalDrillBillNo: 'DJ20250601005',
        applyTime: getDateTimeStr(-15, 2),
        community: '新华社区',
        applicant: '指挥员-李强',
        status: 'completed',
        urgentLevel: 'medium',
        returnDeadline: getDateStr(-8),
        purpose: '【演练转正】综合应急演练升级真实事件',
        remark: '原演练单号 DJ20250601005，指挥员在演练中发现真实汛情，升级为真实单',
        volunteer: '志愿者-王芳',
        receiver: '社区-刘主任',
        items: [
            { materialId: 'mat_005', materialName: '急救箱', spec: '标准配置', qty: 5, pickedQty: 5, receivedQty: 5, returnedQty: 5, inspectionStatus: 'none' },
            { materialId: 'mat_017', materialName: '手持扩音器', spec: '20W大功率', qty: 3, pickedQty: 3, receivedQty: 3, returnedQty: 3, inspectionStatus: 'passed' },
            { materialId: 'mat_018', materialName: '警戒带', spec: '100m/卷', qty: 10, pickedQty: 10, receivedQty: 10, returnedQty: 10, inspectionStatus: 'skipped' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-15, 2), operator: '指挥员-李强', remark: '发起调拨（演练单）' },
            { status: 'approved', time: getDateTimeStr(-15, 3), operator: '仓管-张伟', remark: '审批通过，演练预占' },
            { status: 'picking', time: getDateTimeStr(-15, 4), operator: '仓管-张伟', remark: '出库完成' },
            { status: 'transporting', time: getDateTimeStr(-15, 5), operator: '志愿者-王芳', remark: '转运' },
            { status: 'received', time: getDateTimeStr(-15, 7), operator: '社区-刘主任', remark: '签收' },
            { status: '__convert__', time: getDateTimeStr(-14, 10), operator: '指挥员-李强', remark: '【演练转真实】发现真实汛情，升级为真实灾情单，预占物资转入真实库存扣减' },
            { status: 'returning', time: getDateTimeStr(-10, 0), operator: '志愿者-王芳', remark: '归还' },
            { status: 'inspecting', time: getDateTimeStr(-10, 1), operator: '仓管-张伟', remark: '扩音器需检测' },
            { status: 'completed', time: getDateTimeStr(-10, 2), operator: '仓管-张伟', remark: '入库完成，扩音器检测通过' }
        ],
        damage: { qty: 0, remark: '' },
        qtyDiff: { qty: 0, remark: '' },
        signPhotos: ['sign_004', 'sign_005'],
        inspections: [
            { materialId: 'mat_017', time: getDateTimeStr(-10, 1.5), operator: '仓管-张伟', status: 'passed', qty: 3, remark: '扩音器音量、电池功能正常，检测通过' }
        ]
    },
    {
        id: 'all_006',
        billNo: 'DJ20250614006',
        billType: 'drill',
        convertedFromDrill: false,
        applyTime: getDateTimeStr(-1, 2),
        community: '新华社区',
        applicant: '指挥员-李强',
        status: 'approved',
        urgentLevel: 'medium',
        returnDeadline: getDateStr(2),
        purpose: '防汛演练-发电机操作训练',
        remark: '演练发电机启动、排水泵操作，归还后必须检测',
        volunteer: '',
        receiver: '',
        items: [
            { materialId: 'mat_019', materialName: '柴油发电机', spec: '5KW静音型', qty: 2, pickedQty: 0, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' },
            { materialId: 'mat_021', materialName: '移动排水泵', spec: '100m³/h', qty: 2, pickedQty: 0, receivedQty: 0, returnedQty: 0, inspectionStatus: 'none' }
        ],
        timeline: [
            { status: 'pending', time: getDateTimeStr(-1, 2), operator: '指挥员-李强', remark: '发起发电机操作演练（演练单）' },
            { status: 'approved', time: getDateTimeStr(-1, 3), operator: '仓管-张伟', remark: '审批通过，演练预占（发电机需归还检测）' }
        ],
        damage: { qty: 0, remark: '' },
        qtyDiff: { qty: 0, remark: '' },
        signPhotos: [],
        inspections: []
    }
];

// 数据管理类
class DataManager {
    constructor() {
        this.data = null;
        this.init();
    }

    init() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch (e) {
                this.resetData();
            }
        } else {
            this.resetData();
        }
    }

    resetData() {
        this.data = {
            materials: JSON.parse(JSON.stringify(DEFAULT_MATERIALS)),
            positions: JSON.parse(JSON.stringify(DEFAULT_POSITIONS)),
            allocations: JSON.parse(JSON.stringify(DEFAULT_ALLOCATIONS)),
            currentRole: 'warehouse',
            currentUser: '仓管-张伟'
        };
        // 应用已审批演练单的演练预占
        this._applyDrillPreLockForDemo();
        this.save();
    }

    // 为示例数据初始化演练预占（不影响真实库存）
    _applyDrillPreLockForDemo() {
        const drillApproved = this.data.allocations.filter(a => 
            a.billType === 'drill' && a.status === 'approved' && !a.convertedFromDrill
        );
        drillApproved.forEach(a => {
            a.items.forEach(item => {
                const material = this.data.materials.find(m => m.id === item.materialId);
                if (material && material.availableQty >= item.qty) {
                    material.availableQty -= item.qty;
                    material.drillLockedQty += item.qty;
                }
            });
        });

        // 已出库的演练单也做演练预占（不扣真实库存，但从可用中扣除显示）
        const drillActive = this.data.allocations.filter(a => 
            a.billType === 'drill' && 
            ['picking', 'transporting', 'received'].includes(a.status) && 
            !a.convertedFromDrill
        );
        drillActive.forEach(a => {
            a.items.forEach(item => {
                const material = this.data.materials.find(m => m.id === item.materialId);
                if (material) {
                    const drillPick = item.pickedQty || 0;
                    if (material.availableQty >= drillPick) {
                        material.availableQty -= drillPick;
                        material.drillLockedQty += drillPick;
                    }
                }
            });
        });

        // 检测中的物资
        const inspectingBills = this.data.allocations.filter(a => a.status === 'inspecting');
        inspectingBills.forEach(a => {
            a.items.forEach(item => {
                const material = this.data.materials.find(m => m.id === item.materialId);
                if (material && item.inspectionStatus === 'pending') {
                    const qty = item.returnedQty || item.receivedQty || 0;
                    material.inspectingQty += qty;
                    material.availableQty -= qty;
                }
            });
        });
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    // 获取物资列表
    getMaterials(filters = {}) {
        let result = [...this.data.materials];
        if (filters.search) {
            const keyword = filters.search.toLowerCase();
            result = result.filter(m => 
                m.name.toLowerCase().includes(keyword) || 
                m.batchNo.toLowerCase().includes(keyword)
            );
        }
        if (filters.category) {
            result = result.filter(m => m.category === filters.category);
        }
        return result;
    }

    // 获取单个物资
    getMaterial(id) {
        return this.data.materials.find(m => m.id === id);
    }

    // 新增物资批次
    addMaterial(material) {
        const newMat = {
            id: 'mat_' + Date.now(),
            drillLockedQty: 0,
            inspectingQty: 0,
            needInspection: material.needInspection || INSPECTION_REQUIRED_MATERIALS.some(kw => material.name && material.name.includes(kw)),
            ...material,
            lockedQty: 0,
            availableQty: material.totalQty
        };
        this.data.materials.push(newMat);
        this.save();
        return newMat;
    }

    // 更新物资
    updateMaterial(id, updates) {
        const idx = this.data.materials.findIndex(m => m.id === id);
        if (idx !== -1) {
            this.data.materials[idx] = { ...this.data.materials[idx], ...updates };
            this.save();
            return this.data.materials[idx];
        }
        return null;
    }

    // 获取仓位列表
    getPositions() {
        return this.data.positions;
    }

    // 获取仓位详情（包含物资）
    getPositionDetail(code) {
        const position = this.data.positions.find(p => p.code === code);
        if (!position) return null;
        const materials = this.data.materials.filter(m => m.positionCode === code);
        const totalUsed = materials.reduce((sum, m) => sum + m.totalQty, 0);
        const totalLocked = materials.reduce((sum, m) => sum + m.lockedQty, 0);
        const totalDrillLocked = materials.reduce((sum, m) => sum + m.drillLockedQty, 0);
        const totalInspecting = materials.reduce((sum, m) => sum + m.inspectingQty, 0);
        return {
            ...position,
            materials,
            totalUsed,
            totalLocked,
            totalDrillLocked,
            totalInspecting,
            totalAvailableQty: materials.reduce((sum, m) => sum + m.availableQty, 0),
            available: position.capacity - totalUsed,
            usageRate: position.capacity > 0 ? (totalUsed / position.capacity * 100).toFixed(1) : 0
        };
    }

    // 获取调拨单列表
    getAllocations(filters = {}) {
        let result = [...this.data.allocations];
        
        if (filters.status) {
            result = result.filter(a => a.status === filters.status);
        }
        if (filters.billType) {
            result = result.filter(a => a.billType === filters.billType);
        }
        if (filters.search) {
            const keyword = filters.search.toLowerCase();
            result = result.filter(a => 
                a.billNo.toLowerCase().includes(keyword) ||
                a.community.includes(keyword)
            );
        }
        if (filters.returnStatus) {
            const today = new Date().toISOString().split('T')[0];
            if (filters.returnStatus === 'overdue') {
                result = result.filter(a => 
                    a.returnDeadline < today && 
                    !['completed', 'rejected', 'inspecting'].includes(a.status)
                );
            } else if (filters.returnStatus === 'returned') {
                result = result.filter(a => a.status === 'completed');
            } else if (filters.returnStatus === 'partial') {
                result = result.filter(a => {
                    return a.items.some(item => 
                        item.returnedQty > 0 && item.returnedQty < item.qty
                    );
                });
            } else if (filters.returnStatus === 'inspecting') {
                result = result.filter(a => a.status === 'inspecting');
            }
        }
        
        result.sort((a, b) => new Date(b.applyTime) - new Date(a.applyTime));
        return result;
    }

    // 获取单个调拨单
    getAllocation(id) {
        return this.data.allocations.find(a => a.id === id);
    }

    // 创建调拨单（申请）
    createAllocation(allocationData) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const seq = String(this.data.allocations.filter(a => a.billNo.includes(dateStr)).length + 1).padStart(3, '0');
        const billType = allocationData.billType || 'real';
        
        const newAllocation = {
            id: 'all_' + Date.now(),
            billNo: 'DJ' + dateStr + seq,
            billType: billType,
            convertedFromDrill: false,
            applyTime: now.toISOString().replace('T', ' ').substring(0, 19),
            status: 'pending',
            volunteer: '',
            receiver: '',
            ...allocationData,
            items: allocationData.items.map(item => {
                const material = this.getMaterial(item.materialId);
                return {
                    ...item,
                    pickedQty: item.pickedQty || 0,
                    receivedQty: item.receivedQty || 0,
                    returnedQty: item.returnedQty || 0,
                    inspectionStatus: item.inspectionStatus || (material && material.needInspection ? 'none' : 'none')
                };
            }),
            timeline: allocationData.timeline || [{
                status: 'pending',
                time: now.toISOString().replace('T', ' ').substring(0, 19),
                operator: this.data.currentUser,
                remark: billType === 'drill' ? '发起调拨申请（演练单，不占用真实库存）' : '发起调拨申请'
            }],
            damage: allocationData.damage || { qty: 0, remark: '' },
            qtyDiff: allocationData.qtyDiff || { qty: 0, remark: '' },
            signPhotos: allocationData.signPhotos || [],
            inspections: []
        };
        
        this.data.allocations.push(newAllocation);
        this.save();
        return newAllocation;
    }

    // 更新调拨单状态
    updateAllocationStatus(id, status, remark = '') {
        const allocation = this.getAllocation(id);
        if (!allocation) return null;
        
        const oldStatus = allocation.status;
        allocation.status = status;
        allocation.timeline.push({
            status,
            time: new Date().toISOString().replace('T', ' ').substring(0, 19),
            operator: this.data.currentUser,
            remark
        });
        
        if (status === 'approved') {
            this._lockInventory(id);
        } else if (status === 'rejected') {
            this._unlockInventory(id);
        } else if (status === 'picking') {
            this._decreaseInventory(id);
        } else if (status === 'inspecting') {
            this._startInspectionInventory(id);
        } else if (status === 'completed') {
            if (oldStatus === 'inspecting') {
                this._completeInspectionInventory(id);
            } else {
                this._returnInventory(id);
            }
        }
        
        this.save();
        return allocation;
    }

    // 锁定库存（双轨：演练单走drillLockedQty，真实单走lockedQty）
    _lockInventory(allocationId) {
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
    }

    // 释放锁定库存
    _unlockInventory(allocationId) {
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
    }

    // 出库扣减库存（演练单只扣演练预占，真实单扣物理库存）
    _decreaseInventory(allocationId) {
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
    }

    // 归还恢复库存（真实单恢复physical，演练单恢复available；需检测的物资进入pending）
    _returnInventory(allocationId) {
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
    }

    // 进入检测中：从available扣出，放入inspectingQty（只处理需检测物资）
    _startInspectionInventory(allocationId) {
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
    }

    // 检测完成：从inspectingQty移出，恢复或报废（根据检测结果）
    _completeInspectionInventory(allocationId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return;
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material || !material.needInspection) return;
            
            const insp = (allocation.inspections || []).filter(i => i.materialId === item.materialId).sort((a, b) => new Date(b.time) - new Date(a.time))[0];
            if (insp && insp.status === 'passed') {
                const qty = insp.qty || item.returnedQty;
                material.inspectingQty -= Math.min(material.inspectingQty, qty);
                material.availableQty += qty;
                item.inspectionStatus = 'passed';
            } else if (insp && insp.status === 'failed') {
                const qty = insp.qty || item.returnedQty;
                material.inspectingQty -= Math.min(material.inspectingQty, qty);
                material.totalQty -= qty;
                item.inspectionStatus = 'failed';
            }
        });
    }

    // 将演练单升级为真实灾情单（原子操作：迁移预占物资+打标记+写timeline）
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
        
        allocation.items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (!material) return;
            
            const drillLocked = Math.min(item.qty, material.drillLockedQty);
            const activeQty = item.pickedQty || drillLocked;
            
            // 1) 从演练预占中扣出
            if (drillLocked > 0) {
                material.drillLockedQty -= drillLocked;
            }
            
            // 2) 根据状态转真实锁定/扣减
            if (allocation.status === 'approved' || allocation.status === 'pending') {
                material.lockedQty += drillLocked;
            } else if (['picking', 'transporting', 'received', 'returning', 'inspecting'].includes(allocation.status)) {
                // 已出库的演练单：扣除物理库存 + 扣 inspectingQty 标记（如果在检测中）
                const pickQty = item.pickedQty || drillLocked;
                material.totalQty -= pickQty;
                const returnedQty = item.returnedQty || 0;
                if (returnedQty > 0 && material.needInspection) {
                    material.totalQty += returnedQty;
                }
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
        return { success: true, allocation };
    }

    // 启动检测（仓管点击开始检测）
    startInspection(allocationId, materialId) {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return { success: false, message: '单据不存在' };
        const item = allocation.items.find(i => i.materialId === materialId);
        if (!item) return { success: false, message: '物资不存在' };
        if (item.inspectionStatus !== 'pending') {
            return { success: false, message: '该物资非待检测状态' };
        }
        
        const material = this.getMaterial(materialId);
        if (material) {
            item.inspectionStatus = 'inspecting';
            allocation.inspections = allocation.inspections || [];
            allocation.inspections.push({
                materialId,
                time: new Date().toISOString().replace('T', ' ').substring(0, 19),
                operator: this.data.currentUser,
                status: 'inspecting',
                qty: item.returnedQty,
                remark: '仓管开始检测'
            });
        }
        
        this.save();
        return { success: true };
    }

    // 提交检测结果（passed/failed）
    resolveInspection(allocationId, materialId, result, remark = '') {
        const allocation = this.getAllocation(allocationId);
        if (!allocation) return { success: false, message: '单据不存在' };
        const item = allocation.items.find(i => i.materialId === materialId);
        if (!item) return { success: false, message: '物资不存在' };
        if (!['pending', 'inspecting'].includes(item.inspectionStatus)) {
            return { success: false, message: '该物资不处于可检测状态' };
        }
        if (!['passed', 'failed'].includes(result)) {
            return { success: false, message: '检测结果无效' };
        }
        
        const material = this.getMaterial(materialId);
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const qty = item.returnedQty;
        
        if (material) {
            if (material.inspectingQty >= qty) {
                material.inspectingQty -= qty;
            }
            if (result === 'passed') {
                material.availableQty += qty;
                item.inspectionStatus = 'passed';
            } else {
                material.totalQty -= qty;
                item.inspectionStatus = 'failed';
            }
        }
        
        allocation.inspections = allocation.inspections || [];
        allocation.inspections.push({
            materialId,
            time: now,
            operator: this.data.currentUser,
            status: result,
            qty: qty,
            remark: remark || (result === 'passed' ? '检测通过' : '检测不通过，需维修/报废')
        });
        
        const allDone = allocation.items.every(i => {
            const m = this.getMaterial(i.materialId);
            if (!m || !m.needInspection) return true;
            return ['passed', 'failed', 'skipped', 'none'].includes(i.inspectionStatus);
        });
        if (allDone && allocation.status === 'inspecting') {
            allocation.status = 'completed';
            allocation.timeline.push({
                status: 'completed',
                time: now,
                operator: this.data.currentUser,
                remark: '所有物资检测完成，单据归档'
            });
        }
        
        this.save();
        return { success: true, allDone };
    }

    // 获取待处理的检测列表（仓管视角）
    getPendingInspections() {
        const result = [];
        this.data.allocations.forEach(a => {
            if (a.status !== 'inspecting' && !(a.status === 'completed' && a.items.some(i => i.inspectionStatus === 'pending'))) return;
            a.items.forEach(item => {
                const material = this.getMaterial(item.materialId);
                if (!material) return;
                if (['pending', 'inspecting'].includes(item.inspectionStatus)) {
                    result.push({
                        allocationId: a.id,
                        billNo: a.billNo,
                        community: a.community,
                        materialId: item.materialId,
                        materialName: item.materialName,
                        spec: item.spec,
                        qty: item.returnedQty,
                        inspectionStatus: item.inspectionStatus,
                        lastInsp: (a.inspections || []).filter(i => i.materialId === item.materialId).sort((x, y) => new Date(y.time) - new Date(x.time))[0]
                    });
                }
            });
        });
        return result;
    }

    // 校验调拨规则（billType=drill 演练单不触发真实库存不足的硬校验）
    validateAllocation(items, community, billType = 'real') {
        const errors = [];
        const warnings = [];
        const isDrill = billType === 'drill';
        
        items.forEach(item => {
            const material = this.getMaterial(item.materialId);
            if (material) {
                const today = new Date();
                const expireDate = new Date(material.expireDate);
                if (expireDate < today) {
                    errors.push(`${material.name} (批次: ${material.batchNo}) 已过期，不能调拨`);
                } else if ((expireDate - today) / (1000 * 60 * 60 * 24) <= 30) {
                    warnings.push(`${material.name} 将在30天内过期，请谨慎使用`);
                }
                
                if (item.qty > material.availableQty) {
                    const msg = `${material.name} 可调拨数量不足（可调拨: ${material.availableQty}${material.unit}，申请: ${item.qty}${material.unit}）`;
                    if (isDrill) {
                        warnings.push('[演练] ' + msg + '，请确认演练现场实际物资');
                    } else {
                        errors.push(msg);
                    }
                }
                
                if (isDrill && material.needInspection) {
                    warnings.push(`${material.name} 为精密设备，演练归还后需先检测方可再调拨`);
                }
            }
        });
        
        const unreturned = this.getAllocations().filter(a => 
            a.community === community && 
            !['completed', 'rejected'].includes(a.status) &&
            a.id !== 'new'
        );
        
        if (unreturned.length > 0) {
            const unreturnedMaterials = new Set();
            unreturned.forEach(a => {
                a.items.forEach(item => {
                    if (item.qty > item.returnedQty) {
                        unreturnedMaterials.add(item.materialId);
                    }
                });
            });
            
            items.forEach(item => {
                if (unreturnedMaterials.has(item.materialId)) {
                    warnings.push(`${community} 有同类物资未归还，请确认是否继续`);
                }
            });
        }
        
        return { errors, warnings, valid: errors.length === 0 };
    }

    // 获取统计数据
    getStats() {
        const materials = this.data.materials;
        const allocations = this.data.allocations;
        const today = new Date();
        
        const materialNames = new Set(materials.map(m => m.name));
        const availableBatches = materials.filter(m => m.availableQty > 0);
        const warningCount = materials.filter(m => m.totalQty <= m.warningThreshold).length;
        const expiringCount = materials.filter(m => {
            const expireDate = new Date(m.expireDate);
            return (expireDate - today) / (1000 * 60 * 60 * 24) <= 30;
        }).length;
        const activeAllocations = allocations.filter(a => !['completed', 'rejected'].includes(a.status)).length;
        const lockedCount = materials.reduce((sum, m) => sum + m.lockedQty, 0);
        const drillLockedCount = materials.reduce((sum, m) => sum + m.drillLockedQty, 0);
        const inspectingCount = materials.reduce((sum, m) => sum + m.inspectingQty, 0);
        
        return {
            totalMaterials: materialNames.size,
            availableCount: availableBatches.length,
            warningCount,
            expiringCount,
            activeAllocations,
            lockedCount,
            drillLockedCount,
            inspectingCount,
            realActiveCount: allocations.filter(a => a.billType === 'real' && !['completed', 'rejected'].includes(a.status)).length,
            drillActiveCount: allocations.filter(a => a.billType === 'drill' && !['completed', 'rejected'].includes(a.status)).length
        };
    }

    // 获取预警列表
    getWarnings() {
        const warnings = [];
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        this.data.materials
            .filter(m => m.totalQty <= m.warningThreshold)
            .forEach(m => {
                warnings.push({
                    type: m.totalQty === 0 ? 'danger' : 'warning',
                    title: `${m.name} 库存不足`,
                    desc: `当前库存: ${m.totalQty}${m.unit}，预警阈值: ${m.warningThreshold}${m.unit}，仓位: ${m.positionCode}`
                });
            });
        
        this.data.materials
            .filter(m => new Date(m.expireDate) <= today)
            .forEach(m => {
                warnings.push({
                    type: 'danger',
                    title: `${m.name} 已过期`,
                    desc: `批次: ${m.batchNo}，过期日期: ${m.expireDate}，仓位: ${m.positionCode}`
                });
            });
        
        this.data.materials
            .filter(m => {
                const diff = (new Date(m.expireDate) - today) / (1000 * 60 * 60 * 24);
                return diff > 0 && diff <= 30;
            })
            .forEach(m => {
                const days = Math.ceil((new Date(m.expireDate) - today) / (1000 * 60 * 60 * 24));
                warnings.push({
                    type: 'warning',
                    title: `${m.name} 即将过期`,
                    desc: `批次: ${m.batchNo}，还剩 ${days} 天过期，仓位: ${m.positionCode}`
                });
            });
        
        this.data.allocations
            .filter(a => a.returnDeadline < dateStr && !['completed', 'rejected'].includes(a.status))
            .forEach(a => {
                warnings.push({
                    type: 'danger',
                    title: `${a.billNo} 已逾期`,
                    desc: `${a.community} 应还日期: ${a.returnDeadline}，当前状态: ${ALLOCATION_STATUS[a.status]?.label || a.status}，单据类型: ${BILL_TYPE[a.billType]?.label || a.billType}`
                });
            });
        
        this.data.materials
            .filter(m => m.maintenanceStatus === 'bad')
            .forEach(m => {
                warnings.push({
                    type: 'warning',
                    title: `${m.name} 需维修保养`,
                    desc: `批次: ${m.batchNo}，保养状态: 需维修，仓位: ${m.positionCode}`
                });
            });
        
        this.data.allocations.forEach(a => {
            if (a.status !== 'inspecting') return;
            (a.inspections || []).forEach(insp => {
                if (insp.status !== 'pending' && insp.status !== 'inspecting') return;
                const diffHours = (today - new Date(insp.time.replace(' ', 'T'))) / (1000 * 60 * 60);
                if (diffHours >= 24) {
                    const mat = this.getMaterial(insp.materialId);
                    warnings.push({
                        type: 'warning',
                        title: `${mat ? mat.name : '物资'} 检测超时未处理`,
                        desc: `调拨单 ${a.billNo}，单据：${a.billNo}，入库时间：${insp.time}，状态：${INSPECTION_STATUS[insp.status]?.label || insp.status}，已超过 ${Math.floor(diffHours)} 小时`
                    });
                }
            });
        });
        
        return warnings.sort((a, b) => {
            const order = { danger: 0, warning: 1, info: 2 };
            return order[a.type] - order[b.type];
        });
    }

    // 获取逾期未归还的调拨单
    getOverdueAllocations() {
        const today = new Date().toISOString().split('T')[0];
        return this.data.allocations.filter(a => 
            a.returnDeadline < today && 
            !['completed', 'rejected'].includes(a.status)
        );
    }

    // 设置当前角色
    setCurrentRole(role) {
        this.data.currentRole = role;
        this.data.currentUser = ROLES[role]?.defaultUser || '未知用户';
        this.save();
    }

    getCurrentRole() {
        return this.data.currentRole;
    }

    getCurrentUser() {
        return this.data.currentUser;
    }

    // 获取我的任务（志愿者视角）
    getMyTasks() {
        const user = this.data.currentUser;
        return this.data.allocations.filter(a => 
            a.volunteer === user && 
            !['completed', 'rejected', 'pending'].includes(a.status)
        );
    }

    // 设置志愿者
    setVolunteer(allocationId, volunteer) {
        const allocation = this.getAllocation(allocationId);
        if (allocation) {
            allocation.volunteer = volunteer;
            this.save();
        }
        return allocation;
    }

    // 设置接收人
    setReceiver(allocationId, receiver) {
        const allocation = this.getAllocation(allocationId);
        if (allocation) {
            allocation.receiver = receiver;
            this.save();
        }
        return allocation;
    }

    // 更新签收信息
    updateReceipt(allocationId, data) {
        const allocation = this.getAllocation(allocationId);
        if (allocation) {
            if (data.qtyDiff) allocation.qtyDiff = data.qtyDiff;
            if (data.damage) allocation.damage = data.damage;
            if (data.signPhotos) allocation.signPhotos = data.signPhotos;
            if (data.items) {
                data.items.forEach(item => {
                    const existing = allocation.items.find(i => i.materialId === item.materialId);
                    if (existing && item.receivedQty !== undefined) {
                        existing.receivedQty = item.receivedQty;
                    }
                });
            }
            this.save();
        }
        return allocation;
    }

    // 更新归还信息
    updateReturn(allocationId, data) {
        const allocation = this.getAllocation(allocationId);
        if (allocation) {
            if (data.items) {
                data.items.forEach(item => {
                    const existing = allocation.items.find(i => i.materialId === item.materialId);
                    if (existing && item.returnedQty !== undefined) {
                        existing.returnedQty = item.returnedQty;
                    }
                });
            }
            if (data.remark) {
                allocation.timeline[allocation.timeline.length - 1].remark = data.remark;
            }
            this.save();
        }
        return allocation;
    }
}

// 全局数据管理器实例
const dataManager = new DataManager();
