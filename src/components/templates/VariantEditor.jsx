import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteTemplateVariant } from '../../services/templateService';
import VariantBodyEditor from './VariantBodyEditor';

export default function VariantEditor({
  variants: initialVariants,
  onSave,
  onCancel,
  templateId,
  templateName,
  whatsappTemplateName,
  showToast,
}) {
  const [variants, setVariants] = useState(initialVariants || []);
  const navigate = useNavigate();

  useEffect(() => {
    setVariants(initialVariants || []);
  }, [initialVariants]);

  const handleLabelChange = (index, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], label: value };
    setVariants(updated);
  };

  const handleBodyChange = (index, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], body: value };
    setVariants(updated);
  };

  const toggleActive = (index) => {
    const updated = [...variants];
    const newActive = !updated[index].active;
    if (!newActive && updated.filter((v) => v.active).length <= 1) return;
    updated[index] = { ...updated[index], active: newActive };
    setVariants(updated);
  };

  const addVariant = () => {
    if (variants.length >= 5) return;
    const newVariant = {
      label: `Variant ${variants.length + 1}`,
      body: 'Hi {{1}}, your pass for {{2}} on {{3}} is ready.',
      active: true,
    };
    setVariants([...variants, newVariant]);
  };

  const removeVariant = async (index) => {
    if (variants.length <= 1) return;
    if (templateId) {
      try {
        await deleteTemplateVariant(templateId, index);
      } catch (err) {
        showToast('error', 'Failed to delete variant', err.response?.data?.message || err.message);
        return;
      }
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!variants.some((v) => v.body.trim().length > 0)) {
      showToast('warning', 'Add content', 'Please add content to at least one variant.');
      return;
    }
    onSave(variants);
  };

  return (
    <div className="space-y-4">
      {/* ─── Header: show both template names ─── */}
      <div className="border-b border-gray-200 pb-3 mb-2">
        <h2 className="text-lg font-bold text-gray-800">{templateName}</h2>
        {whatsappTemplateName && (
          <p className="text-xs text-gray-500 mt-0.5">
            WhatsApp template: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{whatsappTemplateName}</span>
          </p>
        )}
      </div>

      {/* Placeholder guidelines */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 shadow-sm">
        <p className="font-semibold">📌 Placeholder guidelines</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-orange-600">
          <li>
            Use <code className="bg-orange-100 px-1 rounded">{'{{1}}'}</code>,{' '}
            <code className="bg-orange-100 px-1 rounded">{'{{2}}'}</code>, … for dynamic content.
          </li>
          <li>The number of placeholders must match your Meta WhatsApp template.</li>
          <li>In the Campaign Builder, you will map columns to these numbers.</li>
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">📝 Message Variants</h3>
        <button
          onClick={addVariant}
          disabled={variants.length >= 5}
          className="text-orange-600 text-xs font-medium hover:underline disabled:opacity-40"
        >
          + Add Variant
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        Each recipient randomly receives one active variant.
      </p>

      {variants.map((v, idx) => (
        <div key={idx} className="bg-white rounded-lg border p-3 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActive(idx)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                  v.active
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-sm'
                    : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {v.active ? '●' : '○'} {v.label || `Variant ${idx + 1}`}
              </button>
              <span className="text-[9px] text-gray-400">Variant {idx + 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(`/templates/${templateId}/variants/${idx}`)}
                className="text-gray-400 hover:text-orange-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Edit in full editor"
              >
                <i className="fas fa-pencil-alt text-xs"></i>
              </button>
              <button
                onClick={() => removeVariant(idx)}
                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Delete this variant"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>

          {/* Variant label */}
          <div>
            <label className="text-[10px] text-gray-500 font-semibold mb-1 block">Label</label>
            <input
              type="text"
              value={v.label}
              onChange={(e) => handleLabelChange(idx, e.target.value)}
              placeholder="Label"
              className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
            />
          </div>

          {/* Message body container */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-gray-500 font-semibold">Message Body</label>
            </div>
            <VariantBodyEditor 
              value={v.body} 
              onChange={(value) => handleBodyChange(idx, value)} 
              showToolbar={false} 
            />
          </div>
        </div>
      ))}

      {/* Action Footer Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button 
          onClick={onCancel} 
          className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-xs hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200 transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}