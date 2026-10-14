import L from 'leaflet';
import './map-tools.css';

// 地图的两个小工具，五个地图共用：
// 1) 手势协作：触屏上一根手指划过地图时不许地图抢滚动（页面照常滚），
//    两根手指才可以拖动/缩放地图；鼠标不受影响，照常拖。
//    做法：地图一律以 dragging 关闭的状态创建，本模块在容器上用捕获
//    阶段监听 touchstart —— 捕获比 Leaflet 自己在容器上的冒泡监听
//    先到，所以能在拖动开始前决定这次手势归谁。
// 2) 「⌂ 默认视角」按钮：点一下回到这张地图最初的取景（钉子全景）。
export function cooperativeGestures(map) {
  const el = map.getContainer();
  map.dragging.disable();
  let hint = null, hintTimer = 0;
  const showHint = () => {
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'map-gesture-hint';
      hint.textContent = '双指拖动地图';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(hint);
    }
    requestAnimationFrame(() => hint.classList.add('show'));
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 1500);
  };
  const hideHint = () => { if (hint) hint.classList.remove('show'); };
  el.addEventListener('touchstart', e => {
    if (e.touches.length >= 2) { map.dragging.enable(); hideHint(); }
    else { map.dragging.disable(); showHint(); }
  }, { capture: true, passive: true });
  el.addEventListener('touchend', e => { if (e.touches.length === 0) hideHint(); }, { capture: true, passive: true });
  el.addEventListener('touchcancel', hideHint, { capture: true, passive: true });
  // 鼠标没有「抢滚动」的问题：按下时把拖动打开，桌面端照常拖地图
  el.addEventListener('mousedown', () => map.dragging.enable(), { capture: true });
}

// 右上角的回默认视角按钮（Leaflet 控件）。home 是调用方给的取景函数。
export function addHomeButton(map, home) {
  const ctl = L.control({ position: 'topright' });
  ctl.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-home');
    div.innerHTML = '<button type="button" title="回到地图最初的取景">⌂ 默认视角</button>';
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    div.querySelector('button').addEventListener('click', () => home());
    return div;
  };
  ctl.addTo(map);
  return ctl;
}
