export default function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  const base = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200 focus:ring-orange-400',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-200 focus:ring-emerald-400',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm focus:ring-gray-300',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md shadow-red-200 focus:ring-red-400',
    ghost: 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-300',
  };

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {icon && <i className={`fas fa-${icon}`}></i>}
      {children}
    </button>
  );
}