// 和谁分：一排可点的名字片，点亮 = 参与分摊。checked 是选中的名字（大小写不敏感）
export default function PeoplePicker({ names, checked, onChange }) {
  const on = n => checked.some(c => c.toLowerCase() === n.toLowerCase());
  const toggle = n => onChange(on(n) ? checked.filter(c => c.toLowerCase() !== n.toLowerCase()) : checked.concat(n));
  if (!names.length) return <span className="text-sm text-slate-400">还没有成员名单</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map(n => (
        <button type="button" key={n} onClick={() => toggle(n)} aria-pressed={on(n)}
          className={'rounded-full pl-1 pr-3 py-1 text-sm font-medium inline-flex items-center gap-1.5 border transition ' + (on(n)
            ? 'bg-indigo-600 border-indigo-600 text-white shadow'
            : 'bg-white/60 border-slate-200 text-slate-400 hover:border-indigo-300')}>
          <span className="avatar w-5 h-5 text-[10px]">{Array.from(n)[0].toUpperCase()}</span>
          {n}{on(n) ? ' ✓' : ''}
        </button>
      ))}
    </div>
  );
}
