import { useState } from 'react';
import { api } from '../../lib/api.js';

// 加成员 = 加进全员共用的用户列表，之后登录时直接选名字
export default function Members({ names, onAdded }) {
  const [v, setV] = useState('');
  async function add() {
    if (!v.trim()) return;
    const r = await api('/api/member', 'POST', { name: v.trim() });
    if (r.ok) { setV(''); onAdded(r); } else alert('添加失败：' + (r.error || ''));
  }
  return (
    <div className="mb-5">
      <div className="text-sm font-medium mb-2">成员</div>
      <div className="mb-2">
        {names.length ? names.map(n => <span key={n} className="chip">{n}</span>)
          : <span className="text-sm text-slate-400">还没有成员，先加上大家的名字（投过票的人会自动出现）</span>}
      </div>
      <div className="flex gap-2">
        <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          className="border rounded-lg px-3 py-2 flex-1" placeholder="新成员的名字" maxLength={20} />
        <button onClick={add} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-bold">加成员</button>
      </div>
    </div>
  );
}
