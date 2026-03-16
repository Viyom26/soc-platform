type Props = {
  title: string;
  value: string | number;
  change?: string;
};

export default function KpiCard({
  title,
  value,
  change,
}: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <h2 className="text-2xl font-bold">{value}</h2>
        {change && (
          <span className="text-sm text-green-600">{change}</span>
        )}
      </div>
    </div>
  );
}