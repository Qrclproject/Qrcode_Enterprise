export default function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      {label && <span className="text-xs text-gray-600">{label}</span>}
      <div className="relative inline-block w-10 h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only"
        />
        {/* Track */}
        <div
          className={`block w-10 h-5 rounded-full transition-colors duration-300 ${
            checked
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-inner'
              : 'bg-gray-300 group-hover:bg-gray-400'
          }`}
        ></div>
        {/* Thumb */}
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        ></div>
      </div>
    </label>
  );
}