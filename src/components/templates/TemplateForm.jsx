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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      name, 
      whatsappTemplateName, 
      category, 
      showQR,
      buttonType,
      buttonText,
      buttonValue,
    });
  };

  const buttonTypeLabel = {
    none: 'None',
    phone_number: '📞 Call Phone Number',
    url: '🔗 Visit URL',
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
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
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
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
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
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
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
            className="rounded"
          />
          <span className="text-xs text-gray-600">Include QR Code Header</span>
        </div>

        {/* ─── CTA Button Configuration ──────────────────────────── */}
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
            className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
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
                  className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
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
                  className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
                  placeholder={buttonType === 'phone_number' ? '+2348012345678' : 'https://example.com'}
                  required={buttonType !== 'none'}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onClick={onClose} className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-xs hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}