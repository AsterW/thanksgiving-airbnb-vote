// 分摊给谁：一排勾选框。checked 是勾上的名字（大小写不敏感）
export default function PeoplePicker({ names, checked, onChange }) {
  const on = n => checked.some(c => c.toLowerCase() === n.toLowerCase());
  const toggle = n => onChange(on(n) ? checked.filter(c => c.toLowerCase() !== n.toLowerCase()) : checked.concat(n));
  if (!names.length) return <span className="text-sm text-slate-400">先加成员</span>;
  return names.map(n => (
    <label key={n} className="inline-flex items-center gap-1 mr-3 mb-1 text-sm">
      <input type="checkbox" checked={on(n)} onChange={() => toggle(n)} /> {n}
    </label>
  ));
}
