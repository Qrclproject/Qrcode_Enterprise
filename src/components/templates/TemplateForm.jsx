import { useState } from 'react';
import Modal from '../common/Modal';

export default function TemplateForm({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [whatsappTemplateName, setWhatsappTemplateName] = useState(initialData?.whatsappTemplateName || '');
  const [category, setCategory] = useState(initialData?.category || 'delivery');
  const [showQR, setShowQR] = useState(initialData?.showQR ?? true);
  const [buttonType, setButtonType] = useState(initialData?.buttonType || 'none');
  const [buttonText, setButtonText] = useState(initialData?.buttonText || '');
  const [buttonValue, setButtonValue] = useState(initialData?.buttonValue || '');
  const [quickReplies, setQuickReplies] = useState(initialData?.quickReplies || []);

  const addQuickReply = () => {
    setQuickReplies([...quickReplies, '']);
  };

  const updateQuickReply = (index, value) => {
    const updated = [...quickReplies];
    updated[index] = value;
    setQuickReplies(updated);
  };

  const removeQuickReply = (index) => {
    const updated = quickReplies.filter((_, i) => i !== index);
    setQuickReplies(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedQuickReplies = quickReplies.map(q => q.trim()).filter(Boolean);
    onSave({
      name,
      whatsappTemplateName,
      category,
      showQR,
      buttonType,
      buttonText,
      buttonValue,
      quickReplies: cleanedQuickReplies,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Template' : 'Create Template'} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500">Template Name (Internal)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
            required
            placeholder="e.g., Invitation Message"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">WhatsApp Template Name</label>
          <input
            type="text"
            value={whatsappTemplateName}
            onChange={(e) => setWhatsappTemplateName(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
            required
            placeholder="Exact name from Meta Business Suite"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            This must match the template name you created in your WhatsApp Business account.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow bg-white"
          >
            <option value="delivery">🎫 Delivery</option>
            <option value="reminder">⏰ Reminder</option>
            <option value="thanks">💌 Thanks</option>
            <option value="custom">📋 Custom</option>
            <option value="marketing">📢 Marketing</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showQR}
            onChange={(e) => setShowQR(e.target.checked)}
            className="rounded accent-orange-500 w-4 h-4"
          />
          <span className="text-xs text-gray-600">Include QR Code Header</span>
        </div>

        {/* CTA Button Configuration */}
        <div className="border-t pt-4">
          <label className="text-xs font-semibold text-gray-500">Call‑to‑Action Button</label>
          <select
            value={buttonType}
            onChange={(e) => {
              setButtonType(e.target.value);
              if (e.target.value === 'none') {
                setButtonText('');
                setButtonValue('');
              }
            }}
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow bg-white"
          >
            <option value="none">None</option>
            <option value="phone_number">📞 Call Phone Number</option>
            <option value="url">🔗 Visit URL</option>
          </select>

          {buttonType !== 'none' && (
            <>
              <div className="mt-2">
                <label className="text-[10px] font-semibold text-gray-500">Button Text</label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
                  placeholder={buttonType === 'phone_number' ? 'Call Now' : 'Learn More'}
                  required={buttonType !== 'none'}
                  maxLength={40}
                />
              </div>
              <div className="mt-2">
                <label className="text-[10px] font-semibold text-gray-500">
                  {buttonType === 'phone_number' ? 'Phone Number' : 'URL'}
                </label>
                <input
                  type={buttonType === 'phone_number' ? 'tel' : 'url'}
                  value={buttonValue}
                  onChange={(e) => setButtonValue(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
                  placeholder={buttonType === 'phone_number' ? '+2348012345678' : 'https://example.com'}
                  required={buttonType !== 'none'}
                />
              </div>
            </>
          )}
        </div>

        {/* Quick Reply Buttons */}
        <div className="border-t pt-4">
          <label className="text-xs font-semibold text-gray-500">Quick Reply Buttons</label>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Add up to 3 buttons. These must be defined in the WhatsApp template.
          </p>
          {quickReplies.map((qr, idx) => (
            <div key={idx} className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={qr}
                onChange={(e) => updateQuickReply(idx, e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-shadow"
                placeholder={`Button ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => removeQuickReply(idx)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
          {quickReplies.length < 3 && (
            <button
              type="button"
              onClick={addQuickReply}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              <i className="fas fa-plus mr-1"></i> Add Button
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-xs hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200 transition-all"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}