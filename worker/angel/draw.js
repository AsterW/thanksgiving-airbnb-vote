// Secret Angel pairing: shuffle everyone into one random circle and give each
// person a gift to the next one. A single cycle means nobody draws themselves
// and no two people simply swap. rand() returns [0, 1).
export function drawCycle(keys, rand) {
  if (keys.length < 2) return null;
  const order = keys.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  const pairs = {};
  order.forEach((angel, i) => { pairs[angel] = order[(i + 1) % order.length]; });
  return pairs; // angel key -> the person they give a gift to
}
