import L from 'leaflet';

// 地图底图（Esri 免费瓦片，无需 key）：统一从这里加，五个地图不要各写各的。
// 以前是原生 OpenStreetMap 瓦片，颜色杂、信息吵，还得靠 CSS 滤镜去饱和；
// 换成浅灰 / 卫星之后滤镜就退役了。
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const GRAY_ATTR = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
export const SAT_ATTR = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

// 浅灰极简（Light Gray Canvas）：底图本身几乎没标注，必须再叠一层 Reference
// 才有路名和地名。钉子和航线在这种底图上最跳，适合找房/餐厅/航班
export function addLightGray(m, opts = {}) {
  const { attribution = GRAY_ATTR, ...rest } = opts;
  L.tileLayer(ESRI + '/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, maxNativeZoom: 17, detectRetina: true, attribution, ...rest }).addTo(m);
  L.tileLayer(ESRI + '/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, maxNativeZoom: 17, detectRetina: true, ...rest }).addTo(m);
}

// 卫星图（World Imagery）：影像上叠道路 + 地名两个标注层，
// 在山里能直接看出地形、停车场和 trailhead，适合活动地图和选地点
export function addSatellite(m, opts = {}) {
  const { attribution = SAT_ATTR, ...rest } = opts;
  L.tileLayer(ESRI + '/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, detectRetina: true, attribution, ...rest }).addTo(m);
  L.tileLayer(ESRI + '/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, detectRetina: true, ...rest }).addTo(m);
  L.tileLayer(ESRI + '/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 18, detectRetina: true, ...rest }).addTo(m);
}
