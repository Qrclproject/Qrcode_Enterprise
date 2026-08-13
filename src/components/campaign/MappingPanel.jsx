// src/components/campaign/MappingPanel.jsx
import { useState } from 'react';

// ─── Helper: extract placeholder numbers from a string ──────────
const extractPlaceholders = (body) => {
  const matches = body.match(/{{(\d+)}}/g) || [];
  return matches.map(m => parseInt(m.match(/\d+/)[0], 10)).sort((a, b) => a - b);
};

export default function MappingPanel({
  columns,
  mapping,
  setMapping,
  template,
  setTemplate,
  templates,
  templateDefinitions,
  activeVariants,
  toggleVariant,
  customMessage,
  setCustomMessage,
  // ─── QR-specific props (only shown when QR is ON and design selected) ───
  qrDataFields = [],          // placeholder keys for QR data (e.g., ["1", "2"])
  textOverlayPlaceholders = [], // placeholder keys for text overlays (e.g., ["name", "event"])
  showQrFields = false,       // whether to show QR-specific sections
}) {
  const tplDef = templateDefinitions[template];

  // Get variant placeholders
  const activeVariant = tplDef?.variants?.find(v => v.active) || tplDef?.variants?.[0];
  const variantPlaceholders = activeVariant ? extractPlaceholders(activeVariant.body) : [];

  // Helper to render a dropdown for a placeholder key
  const renderPlaceholderDropdown = (key, labelPrefix) => {
    const label = labelPrefix || `Placeholder ${key}`;
    return (
      <div key={key}>
        <label className="text-[10px] font-semibold text-gray-400 uppercase">
          {label} → {"{{" + key + "}}"}
        </label>
        <select
          value={mapping.placeholders?.[key] || ''}
          onChange={(e) => {
            const newPlaceholders = { ...(mapping.placeholders || {}) };
            newPlaceholders[key] = e.target.value;
            setMapping({ ...mapping, placeholders: newPlaceholders });
          }}
          className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 mt-0.5"
        >
          <option value="">-- Select Column --</option>
          {columns.map(col => <option key={col} value={col}>[{col}]</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="dashboard-panel p-4">
      <div className="panel-header"><div className="panel-badge">2</div> COLUMN MAPPING</div>
      <div className="space-y-3 flex-1">
        
        {/* ─── Phone Number (always required) ─── */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Phone Number</label>
          <select
            value={mapping.phone || ''}
            onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 mt-0.5"
          >
            <option value="">-- Select Column --</option>
            {columns.map(col => <option key={col} value={col}>[{col}]</option>)}
          </select>
        </div>

        {/* ─── QR Image URL (optional, for header) ─── */}
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">QR Image URL → Header</label>
          <select
            value={mapping.qr || ''}
            onChange={(e) => setMapping({ ...mapping, qr: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 mt-0.5"
          >
            <option value="">-- Select Column --</option>
            {columns.map(col => <option key={col} value={col}>[{col}]</option>)}
          </select>
        </div>

        {/* ─── VARIANT PLACEHOLDERS ─── */}
        {variantPlaceholders.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase">Message Variant Placeholders</h4>
            {variantPlaceholders.map(num => renderPlaceholderDropdown(String(num)))}
          </div>
        )}

        {/* ─── QR DATA FIELDS (only when QR is ON and design selected) ─── */}
        {showQrFields && qrDataFields.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-[10px] font-semibold text-orange-600 uppercase">
              <i className="fas fa-qrcode mr-1"></i> QR Data Fields
            </h4>
            <p className="text-[9px] text-gray-400 mt-0.5">
              These fields will be encrypted inside the QR code.
            </p>
            {qrDataFields.map(key => renderPlaceholderDropdown(key, `QR Data ${key}`))}
          </div>
        )}

        {/* ─── TEXT OVERLAYS (only when QR is ON and design selected) ─── */}
        {showQrFields && textOverlayPlaceholders.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-[10px] font-semibold text-green-600 uppercase">
              <i className="fas fa-font mr-1"></i> Text Overlays
            </h4>
            <p className="text-[9px] text-gray-400 mt-0.5">
              These fields will be drawn on the pass image.
            </p>
            {textOverlayPlaceholders.map(key => renderPlaceholderDropdown(key, `Overlay ${key}`))}
          </div>
        )}

        {/* ─── Template Selector ─── */}
        <div className="pt-2 border-t">
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Template Category</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-2 mt-0.5 font-medium"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.whatsappTemplateName ? `(WhatsApp: ${t.whatsappTemplateName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ─── Variant Pills ─── */}
        {template !== 'tpl4' && (
          <div className="pt-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase">
              Active Variants <span className="text-gray-300">(random per recipient)</span>
            </label>
            <div className="flex flex-wrap gap-1 mt-1">
              {tplDef?.variants?.map((v, idx) => {
                const isActive = activeVariants[template]?.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleVariant(template, idx)}
                    className={`variant-pill px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      isActive ? 'active' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {v.label} {isActive ? '✓' : ''}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-400 mt-0.5">
              Each recipient randomly gets one of the <strong className="text-blue-600">blue</strong> variants.
            </p>
          </div>
        )}

        {/* ─── Custom Message (only for tpl4) ─── */}
        {template === 'tpl4' && (
          <div className="pt-1">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-xs resize-none h-16"
              placeholder="Type custom message... Use {{1}} {{2}} {{3}} for variables."
            />
            <div className="text-[10px] text-gray-400 text-right">{customMessage.length}/1024</div>
          </div>
        )}
      </div>
    </div>
  );
}