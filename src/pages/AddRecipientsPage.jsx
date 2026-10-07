import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadPanel from '../components/campaign/UploadPanel';
import MappingPanel from '../components/campaign/MappingPanel';
import PreviewPanel from '../components/campaign/PreviewPanel';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ProgressBar from '../components/common/ProgressBar';
import { useToast } from '../components/layout/Toast';
import {
  getCampaignById, addRecipientsToCampaign, getAddRecipientsProgress,
} from '../services/campaignService';
import { getTemplates } from '../services/templateService';
import { getDesigns } from '../services/designService';

console.log('[AddRecipientsPage v5] preview-before-submit enabled');

export default function AddRecipientsPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [campaign, setCampaign] = useState(null);
  const [templateList, setTemplateList] = useState([]);
  const [templateDefs, setTemplateDefs] = useState({});
  const [designs, setDesigns] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ phone: '', qr: '', placeholders: {} });
  const [generateQr, setGenerateQr] = useState(false);
  const [sendNow, setSendNow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, completed: 0, status: 'pending', phase: 'none' });
  const pollingRef = useRef(null);

  // ─── Preview state ────────────────────────────────────────
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVariantPos, setPreviewVariantPos] = useState(0);
  const [previewIncludeHeader, setPreviewIncludeHeader] = useState(true);

  // ─── Payload viewer ───────────────────────────────────────
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const campaignRes = await getCampaignById(campaignId);
        const campaignData = campaignRes.data || campaignRes;
        setCampaign(campaignData);
        if (campaignData.mapping) setMapping(campaignData.mapping);

        const templatesRes = await getTemplates();
        let apiTemplates = templatesRes.data?.templates || templatesRes.data || templatesRes || [];
        if (!Array.isArray(apiTemplates)) apiTemplates = [];
        const list = [], defs = {};
        apiTemplates.forEach(t => {
          list.push({ id: t._id, name: t.name });
          defs[t._id] = {
            name: t.name,
            showQR: t.showQR ?? true,
            variants: (t.variants || []).length > 0
              ? t.variants.map(v => ({ label: v.label, body: v.body, active: v.active !== false }))
              : [{ label: 'Default', body: 'Hi {{1}}, your pass for {{2}} on {{3}} is ready.', active: true }],
            buttonType: t.buttonType || 'none',
            buttonText: t.buttonText || '',
            buttonValue: t.buttonValue || '',
            quickReplies: t.quickReplies || [],
          };
        });
        setTemplateList(list);
        setTemplateDefs(defs);

        const designsRes = await getDesigns();
        setDesigns(designsRes.data?.data || designsRes.data || []);
      } catch (err) {
        showToast('error', 'Failed to load campaign', err.message);
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [campaignId, navigate, showToast]);

  const handleFileParsed = useCallback((data) => {
    setParsedData(data);
    if (data.length > 0) setColumns(Object.keys(data[0]));
  }, []);

  const handleCellChange = (rowIndex, col, value) => {
    const updated = [...parsedData];
    updated[rowIndex] = { ...updated[rowIndex], [col]: value };
    setParsedData(updated);
  };

  const addRow = () => {
    const newRow = {};
    columns.forEach(col => { newRow[col] = ''; });
    setParsedData(prev => [...prev, newRow]);
  };

  const deleteRow = (index) => {
    if (parsedData.length <= 1) return;
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  const renameColumn = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    if (columns.includes(newName)) { alert('A column with that name already exists.'); return; }
    const updatedData = parsedData.map(row => {
      const newRow = { ...row };
      newRow[newName] = newRow[oldName] || '';
      delete newRow[oldName];
      return newRow;
    });
    setColumns(prev => prev.map(c => (c === oldName ? newName : c)));
    setParsedData(updatedData);
  };

  const addColumn = () => {
    const newCol = `Column_${columns.length + 1}`;
    setParsedData(prev => prev.map(row => ({ ...row, [newCol]: '' })));
    setColumns(prev => [...prev, newCol]);
  };

  const deleteColumn = (col) => {
    if (columns.length <= 1) return;
    setParsedData(prev => prev.map(row => {
      const newRow = { ...row };
      delete newRow[col];
      return newRow;
    }));
    setColumns(prev => prev.filter(c => c !== col));
  };

  // ─────────────────────────────────────────────────────────
  //   Template + mapping resolution for preview
  // ─────────────────────────────────────────────────────────

  // Which template is this campaign using? Try templateKey first, then templateId.
  const activeTemplateKey = campaign?.templateKey || campaign?.templateId || '';
  const activeTemplateDef = templateDefs[activeTemplateKey] || null;

  // Merge campaign.mapping (stored) with local mapping state, local wins.
  const resolveColumnForPlaceholder = useCallback((num) => {
    const m = mapping || {};
    // Local mapping might be { phone, qr, placeholders: {...} } OR flat { phone, qr, '1': '...' }
    if (m.placeholders && m.placeholders[num] !== undefined) return m.placeholders[num];
    if (m[num] !== undefined) return m[num];
    // Fall back to campaign's stored mapping
    const cm = campaign?.mapping || {};
    if (cm[num] !== undefined) return cm[num];
    return null;
  }, [mapping, campaign]);

  // Which variant indices can be previewed (active ones if defined, else all)
  const previewableVariantIndices = useMemo(() => {
    const all = activeTemplateDef?.variants || [];
    if (all.length === 0) return [];
    const active = campaign?.activeVariants || [];
    if (active.length === 0) return all.map((_, i) => i);
    const valid = active.filter(i => Number.isInteger(i) && i >= 0 && i < all.length);
    return valid.length > 0 ? valid : all.map((_, i) => i);
  }, [activeTemplateDef, campaign]);

  const previewVariantIdx = previewableVariantIndices[previewVariantPos] ?? 0;
  const previewVariantLabel =
    activeTemplateDef?.variants?.[previewVariantIdx]?.label || `V${previewVariantIdx + 1}`;

  // Build the plain-text body for a given row + variant, resolving {{n}} placeholders
  const buildMessageBodyForRow = useCallback((row, variantIdx = 0) => {
    if (!activeTemplateDef) return '';
    const variant = activeTemplateDef.variants?.[variantIdx] || activeTemplateDef.variants?.[0];
    let body = variant?.body || '';

    // Resolve {{1}}, {{2}}, ... using the merged mapping
    body = body.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      const col = resolveColumnForPlaceholder(num);
      if (col && row && row[col] !== undefined && row[col] !== null) {
        return String(row[col]);
      }
      return match; // leave as-is so you can spot an unmapped placeholder
    });

    return body;
  }, [activeTemplateDef, resolveColumnForPlaceholder]);

  // HTML version for PreviewPanel
  const buildHtmlMessageForRow = useCallback((row, variantIdx = 0) => {
    let body = buildMessageBodyForRow(row, variantIdx);
    body = body.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    body = body.replace(/\n/g, '<br>');
    return body;
  }, [buildMessageBodyForRow]);

  // Plain text version with header image prefix (matches what WhatsApp will show)
  const buildRawMessageForRow = useCallback((row, variantIdx = 0) => {
    const body = buildMessageBodyForRow(row, variantIdx);
    const imageUrl = (previewIncludeHeader && campaign?.includeHeaderImage && campaign?.headerImageUrl) || '';
    return imageUrl ? `${imageUrl}\n\n${body}` : body;
  }, [buildMessageBodyForRow, previewIncludeHeader, campaign]);

  // ─── Preview modal controls ───────────────────────────────
  const openPreviewForRow = (row) => {
    if (!parsedData || parsedData.length === 0) return;
    const idx = parsedData.indexOf(row);
    if (idx < 0) return;
    setPreviewIndex(idx);
    const active = campaign?.activeVariants || [];
    const startPos = active.length > 0
      ? Math.max(0, previewableVariantIndices.indexOf(active[0]))
      : 0;
    setPreviewVariantPos(startPos >= 0 ? startPos : 0);
    setPreviewIncludeHeader(!!campaign?.includeHeaderImage);
    setShowPreviewModal(true);
  };

  const previewPrevRecipient = () => {
    if (!parsedData || parsedData.length === 0) return;
    setPreviewIndex(i => (i - 1 + parsedData.length) % parsedData.length);
  };
  const previewNextRecipient = () => {
    if (!parsedData || parsedData.length === 0) return;
    setPreviewIndex(i => (i + 1) % parsedData.length);
  };
  const previewCycleVariant = (direction) => {
    if (previewableVariantIndices.length === 0) return;
    setPreviewVariantPos(pos => {
      const next = pos + direction;
      if (next < 0) return previewableVariantIndices.length - 1;
      if (next >= previewableVariantIndices.length) return 0;
      return next;
    });
  };

  // ─── What will be sent to the backend ─────────────────────
  const builtRecipients = useMemo(() => {
    if (!parsedData || !mapping.phone) return [];
    return parsedData.map(row => ({
      ...row,
      phone: row[mapping.phone] || '',
    }));
  }, [parsedData, mapping]);

  const payloadPreview = useMemo(() => ({
    recipients: builtRecipients.slice(0, 3), // first 3 for display
    options: { generateQr, sendNow },
    recipientCount: builtRecipients.length,
    note: builtRecipients.length > 3
      ? `...and ${builtRecipients.length - 3} more recipients`
      : undefined,
  }), [builtRecipients, generateQr, sendNow]);

  const handleSubmit = async () => {
    if (!parsedData || parsedData.length === 0) { showToast('warning', 'No data', 'Please upload a file.'); return; }
    if (!mapping.phone) { showToast('warning', 'Missing phone column', 'Please select the phone column.'); return; }

    const recipients = parsedData.map(row => ({
      ...row,
      phone: row[mapping.phone] || '',
    }));

    console.log('[AddRecipientsPage v5] sending raw phone:', recipients[0]?.phone);

    setIsSubmitting(true);
    try {
      await addRecipientsToCampaign(campaignId, recipients, { generateQr, sendNow });
      startPolling();
    } catch (err) {
      showToast('error', 'Failed to add recipients', err.message);
      setIsSubmitting(false);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getAddRecipientsProgress(campaignId);
        const data = res.data || res;
        setProgress(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsSubmitting(false);
          if (data.status === 'completed') {
            showToast('success', 'Completed', 'New recipients processed successfully.');
            navigate(`/campaigns/${campaignId}`);
          } else {
            showToast('error', 'Failed', 'Processing failed.');
          }
        }
      } catch (err) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsSubmitting(false);
        showToast('error', 'Error', err.message);
      }
    }, 2000);
  };

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i></div>;
  }

  const previewRecipient = parsedData?.[previewIndex] || null;

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-800">Add Recipients to {campaign?.name}</h1>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <i className="fas fa-phone mr-1"></i>
          <strong>Phone format:</strong>{' '}
          {campaign?.autoAddCountryCode ? (
            <>auto-add country code <code className="bg-white px-1 rounded">+{campaign?.defaultCountryCode || '234'}</code></>
          ) : (
            <>numbers will be stored exactly as submitted (no country code added)</>
          )}
          . Change this in the original campaign's settings if needed.
        </div>

        <UploadPanel onFileParsed={handleFileParsed} />

        {parsedData && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-700">Review & Edit Sheet</h2>
                <div className="flex gap-2">
                  <button onClick={addRow} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">+ Add Row</button>
                  <button onClick={addColumn} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">+ Add Column</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      {columns.map(col => (
                        <th key={col} className="px-2 py-2 text-left group relative">
                          <input type="text" defaultValue={col} onBlur={(e) => renameColumn(col, e.target.value)}
                            className="bg-transparent border-none outline-none font-semibold text-gray-600 w-24" />
                          <button onClick={() => deleteColumn(col)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1" title="Delete column">
                            <i className="fas fa-times text-[10px]"></i>
                          </button>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedData.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-50">
                        <td className="px-2 py-1 text-gray-400">{rowIdx + 1}</td>
                        {columns.map(col => (
                          <td key={col} className="px-2 py-1">
                            <input type="text" value={row[col] || ''} onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            {/* 👇 NEW: Preview button per row */}
                            <button
                              onClick={() => openPreviewForRow(row)}
                              className="text-indigo-500 hover:text-indigo-700"
                              title="Preview message for this recipient"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button onClick={() => deleteRow(rowIdx)} className="text-red-400 hover:text-red-600" title="Delete row">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <MappingPanel
              columns={columns} mapping={mapping} setMapping={setMapping}
              template={campaign.templateKey || ''} setTemplate={() => {}}
              templates={templateList} templateDefinitions={templateDefs}
              activeVariants={campaign.activeVariants || []} toggleVariant={() => {}}
              customMessage="" setCustomMessage={() => {}}
              qrDataFields={[]} textOverlayPlaceholders={[]} showQrFields={false}
            />

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={generateQr} onChange={(e) => setGenerateQr(e.target.checked)} />
                Generate QR codes for new recipients
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} />
                Send WhatsApp message to new recipients now
              </label>
            </div>

            {/* 👇 NEW: Preview bar — shown before submit */}
            {activeTemplateDef && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600">
                    <i className="fas fa-eye"></i>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">See what will be sent</p>
                    <p className="text-xs text-indigo-600">
                      Preview the WhatsApp message for any recipient before adding them.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openPreviewForRow(parsedData[0])}
                  className="text-xs bg-white text-indigo-700 border border-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-50 font-semibold transition"
                >
                  <i className="fas fa-play mr-1"></i> Open Preview
                </button>
              </div>
            )}

            {/* 👇 NEW: Payload viewer (collapsible) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowPayload(!showPayload)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-code text-gray-400"></i>
                  Payload preview ({builtRecipients.length} recipient{builtRecipients.length === 1 ? '' : 's'})
                </span>
                <i className={`fas fa-chevron-${showPayload ? 'up' : 'down'} text-xs text-gray-400`}></i>
              </button>
              {showPayload && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                      POST /campaigns/{campaignId}/recipients
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(payloadPreview, null, 2));
                        showToast('success', 'Copied', 'Payload copied to clipboard.');
                      }}
                      className="text-[10px] text-gray-500 hover:text-gray-700"
                    >
                      <i className="fas fa-copy mr-1"></i> Copy
                    </button>
                  </div>
                  <pre className="text-[11px] text-gray-700 font-mono bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64">
{JSON.stringify(payloadPreview, null, 2)}
                  </pre>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Only the first 3 recipients shown. The full payload contains all {builtRecipients.length}.
                  </p>
                </div>
              )}
            </div>

            {isSubmitting && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <ProgressBar value={progress.completed} max={progress.total || 1}
                  label={progress.phase === 'qr' ? 'Generating QR codes...' : progress.phase === 'sending' ? 'Sending messages...' : 'Processing...'} />
                <p className="text-xs text-gray-500 mt-2 text-center">{progress.completed} of {progress.total} processed</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => openPreviewForRow(parsedData[0])}
                disabled={!activeTemplateDef || !mapping.phone}
                className="border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title={
                  !activeTemplateDef ? 'No template loaded for this campaign'
                  : !mapping.phone ? 'Select a phone column first'
                  : 'Preview the message before submitting'
                }
              >
                <i className="fas fa-eye mr-1"></i> Preview
              </button>
              <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Add Recipients'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 👇 NEW: Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Message Preview"
        size="max-w-md"
      >
        {activeTemplateDef && previewRecipient ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 -mt-1">
              What <span className="font-semibold text-gray-700">{previewRecipient[mapping.placeholders?.['1'] || mapping['1']] || previewRecipient[mapping.phone] || `row ${previewIndex + 1}`}</span> will receive.
              Use the arrows to flip through rows and variants.
            </div>

            <PreviewPanel
              recipientData={{
                name: previewRecipient[mapping.placeholders?.['1'] || mapping['1']] || '',
                phone: previewRecipient[mapping.phone] || '',
              }}
              messageText={buildHtmlMessageForRow(previewRecipient, previewVariantIdx)}
              qrUrl={''}
              showQR={false}
              currentIndex={previewIndex + 1}
              total={parsedData.length}
              onPrev={previewPrevRecipient}
              onNext={previewNextRecipient}
              variantLabel={previewVariantLabel}
              onCycleVariant={previewCycleVariant}
              buttonType={activeTemplateDef.buttonType || 'none'}
              buttonText={activeTemplateDef.buttonText || ''}
              buttonValue={activeTemplateDef.buttonValue || ''}
              headerImageUrl={
                previewIncludeHeader && campaign?.includeHeaderImage
                  ? (campaign?.headerImageUrl || '')
                  : ''
              }
              includeHeaderImage={previewIncludeHeader}
              setIncludeHeaderImage={setPreviewIncludeHeader}
              quickReplies={activeTemplateDef.quickReplies || []}
            />

            {/* Raw-text preview — exactly what WhatsApp will receive */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <summary className="text-xs font-semibold text-gray-600 cursor-pointer">
                Show raw message text (as WhatsApp will receive)
              </summary>
              <pre className="mt-2 text-[11px] text-gray-700 font-mono bg-white border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap">
{buildRawMessageForRow(previewRecipient, previewVariantIdx)}
              </pre>
            </details>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-500">
            {!activeTemplateDef
              ? 'Template not loaded for this campaign.'
              : 'No recipients available to preview.'}
          </div>
        )}
      </Modal>
    </div>
  );
}
