// 礼物分类（id 存到后端，改文案不影响已保存的选择；新增分类加在后面即可）
export const CATEGORIES = [
  { id: 'snacks', emoji: '🍫', name: '零食甜品', hint: '巧克力、饼干、各地特产', from: '#f97316', to: '#facc15' },
  { id: 'coffee_tea', emoji: '☕', name: '咖啡 / 茶', hint: '咖啡豆、挂耳、好茶叶', from: '#92400e', to: '#d97706' },
  { id: 'drinks', emoji: '🍷', name: '酒和饮品', hint: '红酒、精酿、气泡水', from: '#9f1239', to: '#e11d48' },
  { id: 'books', emoji: '📚', name: '书', hint: '小说、漫画、杂志', from: '#1d4ed8', to: '#60a5fa' },
  { id: 'games', emoji: '🎲', name: '桌游 / 游戏', hint: '卡牌、桌游、Switch 小游戏', from: '#7c3aed', to: '#c084fc' },
  { id: 'gadgets', emoji: '🎧', name: '数码小物', hint: '充电宝、耳机、小配件', from: '#0f172a', to: '#475569' },
  { id: 'beauty', emoji: '🧴', name: '护肤 / 美妆', hint: '护手霜、唇膏、面膜', from: '#db2777', to: '#f9a8d4' },
  { id: 'cozy', emoji: '🧦', name: '暖暖的家居', hint: '袜子、毛毯、拖鞋', from: '#b45309', to: '#fcd34d' },
  { id: 'candles', emoji: '🕯️', name: '香薰蜡烛', hint: '蜡烛、香薰、扩香', from: '#a16207', to: '#fde68a' },
  { id: 'plush', emoji: '🧸', name: '可爱玩偶', hint: '毛绒玩具、盲盒、手办', from: '#e11d48', to: '#fda4af' },
  { id: 'plants', emoji: '🪴', name: '植物', hint: '多肉、小盆栽、干花', from: '#15803d', to: '#86efac' },
  { id: 'outdoor', emoji: '🏕️', name: '户外运动', hint: '水壶、手套、露营小物', from: '#065f46', to: '#34d399' },
  { id: 'kitchen', emoji: '🍳', name: '厨房好物', hint: '杯子、餐具、调料', from: '#b91c1c', to: '#fb923c' },
  { id: 'stationery', emoji: '✏️', name: '文具手账', hint: '本子、笔、贴纸', from: '#0369a1', to: '#7dd3fc' },
  { id: 'diy', emoji: '🎨', name: '手作 DIY', hint: '拼图、手工包、乐高', from: '#c026d3', to: '#f0abfc' },
  { id: 'experience', emoji: '🎟️', name: '体验券', hint: '电影票、按摩、一顿饭', from: '#4338ca', to: '#a5b4fc' },
  { id: 'gag', emoji: '🤪', name: '整蛊搞笑', hint: '越离谱越好', from: '#65a30d', to: '#d9f99d' },
  { id: 'surprise', emoji: '🎁', name: '随便，惊喜就好', hint: '相信你的品味', from: '#6d28d9', to: '#ec4899' },
];
export const byId = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
