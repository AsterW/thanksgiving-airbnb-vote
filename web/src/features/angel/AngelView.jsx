import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useSession } from '../../session/SessionContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { CATEGORIES } from './categories.js';
import SwipeDeck from './SwipeDeck.jsx';
import WishGrid from './WishGrid.jsx';
import People from './People.jsx';
import RevealCard from './RevealCard.jsx';
import './angel.css';

// Secret Angel：每人选想要/不要的礼物类型；管理员（Aster）抽签后，
// 每个人只看得到自己要送给谁。不用等人齐：谁选好了谁进池，没选的人
// 这轮不参加；重抽按当前已填的人重新分配，不清任何人的愿望。
export default function AngelView({ active }) {
  const { name, token, users, openLogin } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [picks, setPicks] = useState({});
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('grid'); // 'deck'：刷卡片；'grid'：看/改选好的
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');

  const apply = useCallback(r => {
    if (!r.ok) { setMsg(r.error || '出错了'); return false; }
    setData(r); setMsg('');
    return true;
  }, []);
  const load = useCallback(async () => {
    try { apply(await api('/api/angel?name=' + encodeURIComponent(name) + '&token=' + encodeURIComponent(token))); } catch (e) {}
  }, [name, token, apply]);
  useEffect(() => { if (active) load(); }, [active, load, users.length]);

  // 服务器上的愿望载入表单；还没写过的人直接进刷卡片
  const mine = data?.mine;
  useEffect(() => {
    if (!data || dirty) return;
    setPicks(mine?.picks || {}); setNote(mine?.note || '');
    setMode(mine ? 'grid' : 'deck');
  }, [data, mine, dirty]);

  const post = async (path, body) => {
    try { return apply(await api(path, 'POST', { name, token, ...body })); } catch (e) { setMsg('网络有点问题，稍后再试'); return false; }
  };
  async function submit() {
    if (await post('/api/angel/prefs', { picks, note })) { setDirty(false); toast(mine ? '愿望更新好了 ✨' : '愿望交上去了，等抽签吧 😇'); }
  }
  async function draw() {
    if (data.drawn && !await confirm({ title: '重新抽签？', message: '已经抽过了。重新抽的话大家的结果都会变（愿望不会清掉，只是按现在已填的人重新分配），确定吗？', confirmText: '重新抽' })) return;
    if (await post('/api/angel/draw', {})) toast('🎲 抽好了！大家去拆信封吧');
  }
  const [transferTo, setTransferTo] = useState('');
  async function transferAdmin() {
    if (!transferTo) return;
    if (!await confirm({ title: '转交管理员？', message: '把管理员转给 ' + transferTo + '？转完之后就由 TA 来抽签和重新 Shuffle，你将不再是管理员。', confirmText: '转交' })) return;
    if (await post('/api/angel/admin', { target: transferTo })) { setTransferTo(''); toast('👑 管理员已转给 ' + transferTo); }
  }

  if (!name) return (
    <section className="glass-card rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3">😇</div>
      <p className="text-slate-600 mb-4">先登录，才知道你是谁的天使</p>
      <button onClick={() => openLogin()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-2">登录</button>
    </section>
  );
  if (!data) return <p className="text-slate-400 text-center py-10">加载中…</p>;

  const people = data.people.filter(p => !p.excluded);
  const waiting = people.filter(p => !p.submitted);
  const filled = people.filter(p => p.submitted);
  const loves = Object.values(picks).filter(v => v === 'love').length;
  return (
    <div className="space-y-5">
      {data.drawn && (data.master
        ? <RevealCard master={data.master} drawnAt={data.drawnAt} me={name} />
        : <section className="glass-card rounded-2xl p-5 text-sm text-slate-600">已经抽过签了，但这次没有你（你是抽签之后才加入的）。找 Aster 重新抽一下吧。</section>)}

      <section className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-bold text-lg">🎁 我的礼物愿望</h2>
            <p className="text-sm text-slate-500">{mine ? '已经交了，随时可以改' : '刷一刷：想要的往右滑，不要的往左滑'}</p>
          </div>
          {mode === 'grid' && <button onClick={() => setMode('deck')} className="text-sm border-2 border-slate-200 hover:border-indigo-400 rounded-full px-4 py-1.5">🔁 再刷一遍卡片</button>}
        </div>
        {mode === 'deck'
          ? <SwipeDeck cards={CATEGORIES} onPick={(id, v) => { setDirty(true); setPicks(p => { const n = { ...p }; if (v) n[id] = v; else delete n[id]; return n; }); }} onDone={() => setMode('grid')} />
          : (
            <>
              <WishGrid picks={picks} onChange={p => { setDirty(true); setPicks(p); }} />
              <textarea value={note} onChange={e => { setDirty(true); setNote(e.target.value); }} maxLength={200} rows={2}
                className="w-full border rounded-xl px-3 py-2 mt-4 text-sm" placeholder="还想说的：尺码、过敏、最近在迷什么…（可选）" />
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button onClick={submit} disabled={!loves} className="bg-gradient-to-r from-indigo-600 to-pink-500 disabled:opacity-40 text-white font-bold rounded-xl px-6 py-2 shadow">
                  {mine ? (dirty ? '保存修改' : '已保存 ✓') : '交愿望 😇'}
                </button>
                <span className="text-sm text-slate-500">{loves ? '💖 ' + loves + ' 样想要' : '至少选一样想要的 💖'}</span>
                <span className="text-sm text-rose-600">{msg}</span>
              </div>
            </>
          )}
      </section>

      <People people={data.people} isAdmin={data.isAdmin} onExclude={(target, excluded) => post('/api/angel/exclude', { target, excluded })} />

      {!data.isAdmin && (
        <p className="text-sm text-slate-500 px-1">👑 管理员是 <b className="text-slate-700">{data.adminName}</b> — 抽签和重新 Shuffle 由管理员操作，想换分配找 TA 点一下就行。</p>
      )}

      {data.isAdmin && (
        <section className="rounded-2xl shadow p-5 text-white bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600">
          <h2 className="font-bold text-lg mb-1">🔐 管理员：抽签</h2>
          <p className="text-sm text-indigo-100 mb-4">
            {filled.length < 2 ? '现在只有 ' + filled.length + ' 人选好了愿望，至少要 2 个人才能抽。'
              : data.drawn ? '已经抽过了，' + new Date(data.drawnAt).toLocaleString('zh-CN') + '。重新抽签按现在已填的人重新分配，谁的愿望都不会清掉' + (waiting.length ? '；还没选的：' + waiting.map(p => p.name).join('、') + '，选好后再重抽就能进来' : '') + '。结果连你也看不到别人的。'
              : waiting.length ? '已选好 ' + filled.length + '/' + people.length + ' 人，可以先抽！还没选的（' + waiting.map(p => p.name).join('、') + '）这轮不参加，选好后重抽就能进来；不参加的人也可以在上面点 ✕ 排除。'
              : '大家都选好了，可以抽了！每个人会被分到一个要偷偷送礼物的人，不会抽到自己，也不会两个人互送。'}
          </p>
          <button onClick={draw} disabled={filled.length < 2}
            className="bg-white text-indigo-700 font-black rounded-xl px-6 py-2 shadow-lg disabled:opacity-40">{data.drawn ? '🎲 重新 Shuffle（保留愿望）' : '🎲 开始抽签'}</button>
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-white/25">
            <span className="text-sm text-indigo-100">👑 你是管理员。可以把管理员转给：</span>
            <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
              className="rounded-lg px-2 py-1.5 text-sm text-slate-700 bg-white/95">
              <option value="">选择成员…</option>
              {people.filter(p => p.name !== name).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <button onClick={transferAdmin} disabled={!transferTo}
              className="bg-white/15 hover:bg-white/25 disabled:opacity-40 border border-white/50 text-white font-bold rounded-lg px-4 py-1.5 text-sm">转让管理员</button>
          </div>
        </section>
      )}
    </div>
  );
}
