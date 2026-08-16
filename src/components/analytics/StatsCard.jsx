export default function StatsCard({ icon, color, label, value, subtitle }) {
  const colorMap = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200',
    emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${colorMap[color] || 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-gray-200'}`}>
          <i className={`fas fa-${icon}`}></i>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
      {subtitle && <p className="text-[10px] text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}