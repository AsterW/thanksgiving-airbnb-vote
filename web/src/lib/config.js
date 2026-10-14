// 两段行程，各自一份候选清单（后端按 trip 分开存）
export const TRIPS = {
  nov25: { date: '11月25–26', people: 9, nights: 1, checkIn: '2026-11-25', checkOut: '2026-11-26', areas: ['Denver 市区', 'Denver 周边'] },
  nov26: { date: '11月26–29', people: 14, nights: 3, checkIn: '2026-11-26', checkOut: '2026-11-29', areas: ['大沙丘区域', '落基山 · Estes Park'] },
};
export const DEFAULT_TRIP = 'nov25';

// 左侧导航的几个页面。tripScoped：页面内容按行程分（显示行程标签页和日期人数）
export const VIEWS = {
  hunt: { title: '🏠 AirBnb hunting · 一起选房', sub: '看中哪间就把 Airbnb 链接贴进来，票数最高的我们就订它',
    nav: 'AirBnb hunting', navSub: '一起选房 · 投票', icon: '🏠', tripScoped: true },
  split: { title: '💰 Split that bill · 分账', sub: '全员一本账 · 共同支出记在这里，自动算清谁该给谁多少钱',
    nav: 'Split that bill', navSub: '分账 · 谁该给谁', icon: '💰' },
  blackjack: { title: '🃏 Blackjack · 21 点', sub: '大家同一桌，轮流跟庄家玩 · 筹码只是好玩，不跟分账挂钩',
    nav: 'Blackjack', navSub: '21 点 · 大家同一桌', icon: '🃏' },
  angel: { title: '😇 Secret Angel · 神秘天使', sub: '刷卡片选你想要的礼物 · 大家选好后抽签，偷偷给分到的人准备惊喜',
    nav: 'Secret Angel', navSub: '选礼物 · 抽天使', icon: '😇' },
};
