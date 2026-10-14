// Pure ledger math for Split that bill: no storage, easy to test.
// Money is handled in integer cents to avoid float drift. Each expense is
// split equally among splitAmong; leftover cents go one each to the first
// participants (in listed order) so shares always sum to the exact total.
export function computeBalances(expenses) {
  const bal = {};
  for (const e of expenses || []) {
    const cents = Math.round(Number(e.amountCents) || 0);
    const among = (e.splitAmong || []).filter(Boolean);
    if (!cents || !among.length || !e.paidBy) continue;
    bal[e.paidBy] = (bal[e.paidBy] || 0) + cents;
    const base = Math.floor(cents / among.length);
    let rem = cents - base * among.length;
    for (const name of among) {
      const share = base + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      bal[name] = (bal[name] || 0) - share;
    }
  }
  return bal;
}

// Greedy settle-up: biggest debtor pays biggest creditor first, which
// keeps the number of transfers at or below (people - 1).
export function computeSettlements(balances) {
  const debtors = Object.entries(balances || {}).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balances || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const out = [];
  let di = 0, ci = 0;
  let dLeft = debtors.length ? -debtors[0][1] : 0;
  let cLeft = creditors.length ? creditors[0][1] : 0;
  while (di < debtors.length && ci < creditors.length) {
    const amt = Math.min(dLeft, cLeft);
    if (amt > 0) out.push({ from: debtors[di][0], to: creditors[ci][0], amountCents: amt });
    dLeft -= amt; cLeft -= amt;
    if (dLeft === 0) { di++; if (di < debtors.length) dLeft = -debtors[di][1]; }
    if (cLeft === 0) { ci++; if (ci < creditors.length) cLeft = creditors[ci][1]; }
  }
  return out;
}

export function splitView(split) {
  const balances = computeBalances(split.expenses);
  return { expenses: split.expenses, balances, settlements: computeSettlements(balances) };
}
