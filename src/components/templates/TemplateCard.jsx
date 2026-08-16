import { categoryColor, categoryIcon, categoryEmoji } from '../../utils/constants';

export default function TemplateCard({ template, onEdit, onClone, onDelete, selected, onSelect, onEditProperties }) {
  const variantCount = template.variants?.length || 1;
  const activeCount = template.variants?.filter(v => v.active).length || 1;
  const templateId = template._id || template.id;

  const buttonLabel = {
    phone_number: '📞 Call',
    url: '🔗 URL',
  }[template.buttonType] || null;

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 p-4 template-card flex flex-col shadow-sm hover:shadow-md">
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected || false}
            onChange={(e) => onSelect(templateId, e.target.checked)}
            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 cursor-pointer accent-orange-500"
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-3 ml-6">
        <div className={`w-10 h-10 rounded-full bg-${categoryColor(template.category)}-100 flex items-center justify-center`}>
          <i className={`fas fa-${categoryIcon(template.category)} text-${categoryColor(template.category)}-600`}></i>
        </div>
        <div className="flex gap-1">
          {/* ─── Edit Variants (pencil) ──────────────────────────── */}
          <button
            onClick={() => onEdit(templateId)}
            className="text-gray-400 hover:text-orange-600 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            title="Edit Variants"
          >
            <i className="fas fa-edit"></i>
          </button>
          {/* ─── Edit Properties (gear) ──────────────────────────── */}
          {onEditProperties && (
            <button
              onClick={() => onEditProperties(template)}
              className="text-gray-400 hover:text-orange-600 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
              title="Edit Template Properties"
            >
              <i className="fas fa-cog"></i>
            </button>
          )}
          <button onClick={() => onClone(templateId)} className="text-gray-400 hover:text-green-600 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200" title="Clone">
            <i className="fas fa-clone"></i>
          </button>
          <button onClick={() => onDelete(templateId)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200" title="Delete">
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>

      <h3 className="font-bold text-gray-800">{template.name}</h3>
      {template.whatsappTemplateName && (
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">WhatsApp: {template.whatsappTemplateName}</span>
        </p>
      )}

      {buttonLabel && (
        <span className="inline-block mt-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
          {buttonLabel}
        </span>
      )}

      <div className="flex flex-wrap gap-1 mt-1.5">
        {template.variants?.map(v => (
          <span
            key={v.label}
            className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              v.active ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'
            }`}
          >
            {v.label}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 mt-1">
        {activeCount}/{variantCount} active · Used {template.usageCount || 0}x
      </p>

      <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-gray-400 border-t">
        <span>{template.showQR ? '📸 QR image' : '💬 Text only'}</span>
        <span className="capitalize">{categoryEmoji(template.category)} {template.category}</span>
      </div>
    </div>
  );
}