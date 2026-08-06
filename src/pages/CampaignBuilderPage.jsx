import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UploadPanel from '../components/campaign/UploadPanel';
import MappingPanel from '../components/campaign/MappingPanel';
import PreviewPanel from '../components/campaign/PreviewPanel';
import SettingsPanel from '../components/campaign/SettingsPanel';
import BatchPreview from '../components/campaign/BatchPreview';
import FailedRecipients from '../components/campaign/FailedRecipients';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { useToast } from '../components/layout/Toast';
import {
  createCampaign,
  launchCampaign,
  generateCampaignQRs,
  getCampaignQRProgress,
  getCampaignById,
} from '../services/campaignService';
import { getTemplates } from '../services/templateService';
import { getDesigns } from '../services/designService';

// ─── Static fallback templates ──────────────────────────────────
const staticFallback = [
  {
    id: 'tpl1', name: 'Entry Pass Delivery', showQR: true,
    buttonType: 'none', buttonText: '', buttonValue: '',
    variants: [
      { label: 'Friendly', body: 'Hi {{1}} 👋\n\nYour QR code for {{2}} is ready!\n\nDate: {{3}}. Just show this at the door and you\'re in!\n\nSee you there!', active: true },
      { label: 'Formal', body: 'Dear {{1}},\n\nPlease find your official entry pass for {{2}} on {{3}}.\n\nPresent the QR code below at the entrance. We look forward to welcoming you.', active: true },
      { label: 'Short', body: '{{1}} – {{2}} ({{3}}).\n\nYour entry QR is attached. Please display at the gate.', active: true },
    ],
  },
  {
    id: 'tpl2', name: 'Event Day Reminder', showQR: true,
    buttonType: 'none', buttonText: '', buttonValue: '',
    variants: [
      { label: 'Enthusiastic', body: '🎉 It\'s almost time, {{1}}!\n\n{{2}} kicks off today at {{4}}.\n📍 Venue: {{5}}\n\nQR code attached – show it at the gate!', active: true },
      { label: 'Calm', body: 'Just a gentle reminder, {{1}} — {{2}} is today at {{4}}.\n\nWe\'re at {{5}}. Your QR pass is attached for easy entry.', active: true },
      { label: 'Urgent', body: '⚠️ {{1}} — {{2}} starts in a few hours ({{4}}).\n\nVenue: {{5}}. Your QR code is re‑attached for quick entry.', active: true },
    ],
  },
  {
    id: 'tpl3', name: 'Post-Event Thanks', showQR: false,
    buttonType: 'none', buttonText: '', buttonValue: '',
    variants: [
      { label: 'Warm', body: 'Thank you for joining us at {{2}}, {{1}}! 🎉\n\nWe loved having you. Please share your thoughts: {{6}}\n\nSee you at the next event!', active: true },
      { label: 'Professional', body: 'Dear {{1}},\n\nThank you for attending {{2}}. We value your feedback — please complete our short survey: {{6}}\n\nBest regards, EventPass Team', active: true },
      { label: 'Brief', body: 'Thanks for coming to {{2}}, {{1}}! 🙏\n\nFeedback: {{6}}', active: true },
    ],
  },
  {
    id: 'tpl4', name: 'Custom Message', showQR: true,
    buttonType: 'none', buttonText: '', buttonValue: '',
    variants: [{ label: 'Custom', body: '', active: true }],
  },
];

// ─── Sub‑component: Modal Design Preview with QR Overlay ────────
function ModalDesignPreview({ design, isSelected, onSelect }) {
  const [dims, setDims] = useState({
    w: design.naturalWidth || 0,
    h: design.naturalHeight || 0
  });

  const handleLoad = (e) => {
    if (!dims.w || !dims.h) {
      setDims({
        w: e.currentTarget.naturalWidth,
        h: e.currentTarget.naturalHeight
      });
    }
  };

  const { x, y, width, height } = design.qrPosition || {};
  const hasDims = dims.w > 0 && dims.h > 0 && width;

  const style = hasDims ? {
    left: `${(x / dims.w) * 100}%`,
    top: `${(y / dims.h) * 100}%`,
    width: `${(width / dims.w) * 100}%`,
    height: `${(height / dims.h) * 100}%`,
  } : { display: 'none' };

  return (
    <div
      onClick={() => onSelect(design._id)}
      className={`group relative flex flex-col justify-between border rounded-xl p-2 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 p-1">
        <div className="relative inline-flex max-w-full max-h-full items-center justify-center">
          <img 
            src={design.imageUrl} 
            alt={design.name} 
            className="max-w-full max-h-full object-contain select-none rounded-[4px]" 
            onLoad={handleLoad}
          />
          {hasDims && (
            <div
              className="absolute border border-dashed border-orange-500 bg-orange-100/40 pointer-events-none rounded-[2px] transition-all mix-blend-multiply"
              style={style}
            />
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className="absolute top-3 right-3 bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center shadow-md z-10">
          <i className="fas fa-check text-[8px]"></i>
        </div>
      )}
      
      <p className={`text-[11px] mt-2 text-center font-medium truncate px-1 ${
        isSelected ? 'text-orange-700 font-bold' : 'text-gray-700'
      }`}>
        {design.name}
      </p>
    </div>
  );
}

// ─── Main Campaign Builder Page ────────────────────────────────
export default function CampaignBuilderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ─── State ─────────────────────────────────────────────────────
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ phone: '', qr: '', placeholders: {} });
  const [template, setTemplate] = useState('');
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);
  const [previewVariantIndex, setPreviewVariantIndex] = useState(0);
  const [activeVariants, setActiveVariants] = useState({});
  const [batchSize, setBatchSize] = useState(10);
  const [waitValue, setWaitValue] = useState(5);
  const [waitUnit, setWaitUnit] = useState('minutes');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [failedRecipients, setFailedRecipients] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [templateList, setTemplateList] = useState([]);
  const [templateDefs, setTemplateDefs] = useState({});

  const [campaignId, setCampaignId] = useState(null);
  const [campaignName, setCampaignName] = useState(''); // 👈 store campaign name
  const [qrGenStatus, setQrGenStatus] = useState('pending');
  const [qrGenTotal, setQrGenTotal] = useState(0);
  const [qrGenProgress, setQrGenProgress] = useState(0);
  const pollingRef = useRef(null);

  // ─── Name modal state ──────────────────────────────────────────
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [pendingMapping, setPendingMapping] = useState(null);

  // ─── Prevent duplicate processing ─────────────────────────────
  const processedRef = useRef('');

  // ─── Design and QR control ────────────────────────────────────
  const [designs, setDesigns] = useState([]);
  const [designId, setDesignId] = useState('');
  const [generateQr, setGenerateQr] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);

  const showToast = useToast();

  // ─── Fetch templates from backend ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await getTemplates();
        let apiTemplates = res?.data?.templates || res?.data || res || [];
        if (!Array.isArray(apiTemplates)) apiTemplates = [];

        if (apiTemplates.length === 0) {
          setTemplateList(staticFallback.map(t => ({ id: t.id, name: t.name })));
          const defs = {};
          staticFallback.forEach(t => { defs[t.id] = t; });
          setTemplateDefs(defs);
          setActiveVariants(Object.fromEntries(staticFallback.map(t => [t.id, t.variants.map((v, i) => i)])));
          if (!template) setTemplate(staticFallback[0].id);
          return;
        }

        const list = [];
        const defs = {};
        const av = {};
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
          };
          const activeIndices = (t.variants || []).map((v, i) => (v.active !== false ? i : -1)).filter(i => i >= 0);
          av[t._id] = activeIndices.length > 0 ? activeIndices : [0];
        });

        setTemplateList(list);
        setTemplateDefs(defs);
        setActiveVariants(av);
        if (!template && list.length > 0) {
          setTemplate(list[0].id);
          setPreviewVariantIndex(av[list[0].id]?.[0] || 0);
        }
      } catch {
        setTemplateList(staticFallback.map(t => ({ id: t.id, name: t.name })));
        const defs = {};
        staticFallback.forEach(t => { defs[t.id] = t; });
        setTemplateDefs(defs);
        setActiveVariants(Object.fromEntries(staticFallback.map(t => [t.id, t.variants.map((v, i) => i)])));
        if (!template) setTemplate(staticFallback[0].id);
        showToast('warning', 'Using offline templates', 'Could not fetch templates from server.');
      }
    })();
  }, [showToast, template]);

  // ─── Fetch designs on mount ──────────────────────────────────
  useEffect(() => {
    getDesigns()
      .then((res) => setDesigns(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  // ─── Derived data ─────────────────────────────────────────────
  const total = parsedData?.length || 0;
  const currentRecipient = parsedData?.[previewRecipientIndex] || {};
  const mappedPhone = mapping.phone ? currentRecipient[mapping.phone] : '';
  const mappedQrUrl = mapping.qr ? currentRecipient[mapping.qr] : '';

  const tplDef = templateDefs[template] || { name: 'Unknown', showQR: true, variants: [] };
  const currentVariant = tplDef.variants?.[previewVariantIndex];

  // ─── Message preview with dynamic placeholders ────────────────
  const getMessageBody = () => {
    let body = '';
    if (template === 'tpl4' || tplDef.name === 'Custom Message') {
      body = customMessage || 'Hi {{1}}, here is your pass for {{2}} on {{3}}.';
    } else {
      body = currentVariant?.body || tplDef.variants?.[0]?.body || '';
    }

    body = body.replace(/{{(\d+)}}/g, (match, num) => {
      const columnName = mapping.placeholders?.[num];
      if (columnName) {
        const value = currentRecipient[columnName];
        return value !== undefined && value !== '' ? String(value) : match;
      }
      return match;
    });

    body = body.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    return body;
  };
  const messagePreview = getMessageBody().replace(/\n/g, '<br>');

  // ─── Auto‑mapping helper ──────────────────────────────────────
  const computeMapping = useCallback((cols) => {
    if (!cols || cols.length === 0) return { phone: '', qr: '', placeholders: {} };
    
    const exact = (preferred) => cols.find(c => c.trim().toLowerCase() === preferred.toLowerCase()) || '';
    const contains = (keywords) => cols.find(c => keywords.every(kw => c.toLowerCase().includes(kw))) || '';
    
    const phone = exact('phone number') || contains(['phone', 'number']) || contains(['phone']);
    const qr = exact('qr code image url') || contains(['qr', 'image']) || contains(['qr']);
    
    const placeholders = {};
    const nameCol = exact('attendee name') || exact('full name') || exact('name') || contains(['name']);
    const eventCol = exact('event name') || contains(['event', 'name']) || contains(['event']);
    const dateCol = exact('event date') || exact('date') || contains(['date']);
    const timeCol = contains(['time']);
    const venueCol = contains(['venue']);
    const senderCol = contains(['sender', 'from']);
    const dress1Col = contains(['dress', 'code', '1']);
    const dress2Col = contains(['dress', 'code', '2']);
    
    if (nameCol) placeholders['1'] = nameCol;
    if (eventCol) placeholders['2'] = eventCol;
    if (dateCol) placeholders['3'] = dateCol;
    if (timeCol) placeholders['4'] = timeCol;
    if (venueCol) placeholders['5'] = venueCol;
    if (senderCol) placeholders['8'] = senderCol;
    if (dress1Col) placeholders['6'] = dress1Col;
    if (dress2Col) placeholders['7'] = dress2Col;
    
    return { phone, qr, placeholders };
  }, []);

  // ─── QR polling helpers ───────────────────────────────────────
  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startQrPolling = (cid) => {
    clearPolling();
    const interval = setInterval(async () => {
      try {
        const res = await getCampaignQRProgress(cid);
        const data = res.data || res;
        setQrGenTotal(data.total || 0);
        setQrGenProgress(data.completed || 0);

        if (data.status === 'completed' || data.status === 'failed') {
          clearPolling();
          setQrGenStatus(data.status);
          if (data.status === 'completed') {
            showToast('success', 'QR codes ready', `${data.completed} QR codes generated.`);
            const updated = await getCampaignById(cid);
            const campaign = updated?.data || updated;
            if (campaign?.recipients) {
              const flat = campaign.recipients.map(r => {
                return { ...r, 'Phone Number': r.phone };
              });
              setParsedData(flat);
              if (flat.length > 0) {
                setColumns(Object.keys(flat[0]));
              }
            }
          } else {
            showToast('error', 'QR generation failed', 'Some QR codes could not be created.');
          }
        }
      } catch (err) {
        clearPolling();
        setQrGenStatus('failed');
        showToast('error', 'QR generation error', err.message);
      }
    }, 2000);
    pollingRef.current = interval;
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

  // ─── Process data from spreadsheet editor ─────────────────────
  const processSpreadsheetData = useCallback(async (data, mappingObj, name) => {
    if (!data || data.length === 0) return;
    if (generateQr && !designId) {
      showToast('warning', 'Design required', 'Please select a design or turn off QR generation.');
      return;
    }

    try {
      const recipients = data.map(row => {
        const rec = { ...row };
        rec.phone = row[mappingObj.phone] || '';
        return rec;
      });

      const campaignData = {
        name: name || 'Campaign ' + new Date().toLocaleDateString(),
        templateKey: template,
        templateId: template,
        recipients,
        batchSize: Number(batchSize),
        waitValue: Number(waitValue),
        waitUnit,
        activeVariants: activeVariants[template] || [0],
        variants: (templateDefs[template]?.variants || []).map(v => v.label),
        mapping: {
          phone: String(mappingObj.phone),
          qr: String(mappingObj.qr),
          ...mappingObj.placeholders,
        },
        designId: generateQr ? (designId || undefined) : undefined,
      };

      const res = await createCampaign(campaignData);
      const newId = res.data?._id || res.data?.id;
      if (!newId) throw new Error('Failed to create campaign');
      setCampaignId(newId);
      setCampaignName(name || '');

      if (generateQr && designId) {
        await generateCampaignQRs(newId);
        setQrGenStatus('processing');
        setQrGenTotal(recipients.length);
        setQrGenProgress(0);
        startQrPolling(newId);
      } else {
        showToast('success', 'Campaign created', 'You can now launch the campaign.');
      }
    } catch (err) {
      showToast('error', 'Campaign creation failed', err.message);
    }
  }, [template, batchSize, waitValue, waitUnit, activeVariants, templateDefs, designId, generateQr, showToast, startQrPolling]);

  // ─── Build restore state for navigation ──────────────────────
  const buildRestoreState = () => ({
    template,
    mapping,
    batchSize,
    waitValue,
    waitUnit,
    activeVariants,
    customMessage,
    designId,
    generateQr,
    previewVariantIndex,
    campaignName,
  });

  // ─── 1) Data loading effect: runs when spreadsheet data arrives ──
  useEffect(() => {
    if (!location.state?.spreadsheetData) return;

    const restoreState = location.state?.restoreState;
    const data = location.state.spreadsheetData;

    // If restoreState has mapping, use it directly – no auto‑mapping
    if (restoreState?.mapping) {
      setMapping(restoreState.mapping);
    } else {
      const cols = Object.keys(data[0] || {});
      setColumns(cols);
      const newMapping = computeMapping(cols);
      setMapping(newMapping);
    }

    // Set parsed data and columns
    setParsedData(data);
    if (restoreState?.template) setTemplate(restoreState.template);
    if (restoreState?.batchSize) setBatchSize(restoreState.batchSize);
    if (restoreState?.waitValue) setWaitValue(restoreState.waitValue);
    if (restoreState?.waitUnit) setWaitUnit(restoreState.waitUnit);
    if (restoreState?.activeVariants) setActiveVariants(restoreState.activeVariants);
    if (restoreState?.customMessage !== undefined) setCustomMessage(restoreState.customMessage);
    if (restoreState?.designId !== undefined) setDesignId(restoreState.designId);
    if (restoreState?.generateQr !== undefined) setGenerateQr(restoreState.generateQr);
    if (restoreState?.previewVariantIndex !== undefined) setPreviewVariantIndex(restoreState.previewVariantIndex);
    if (restoreState?.campaignName) setCampaignName(restoreState.campaignName);

    setPreviewRecipientIndex(0);
    const active = activeVariants[template] || [];
    if (!active.includes(previewVariantIndex)) {
      setPreviewVariantIndex(active[0] || 0);
    }

    window.history.replaceState({}, document.title);

    // If we already have a campaign name (from restore), process immediately
    if (restoreState?.campaignName) {
      const finalMapping = restoreState?.mapping || computeMapping(Object.keys(data[0] || {}));
      processSpreadsheetData(data, finalMapping, restoreState.campaignName);
    } else {
      // Otherwise, show the name modal
      setPendingData(data);
      setPendingMapping(restoreState?.mapping || computeMapping(Object.keys(data[0] || {})));
      setShowNameModal(true);
    }
  }, [location.state?.spreadsheetData, location.state?.restoreState]);

  // ─── 2) QR toggling effect: re‑runs campaign creation when QR state changes ──
  useEffect(() => {
    if (!parsedData || !mapping.phone) return;
    const key = parsedData.length + '_' + generateQr + '_' + designId + '_' + template;
    if (processedRef.current === key) return;
    processedRef.current = key;

    // Use existing campaign name or a default
    const name = campaignName || 'Campaign ' + new Date().toLocaleDateString();
    processSpreadsheetData(parsedData, mapping, name);
  }, [generateQr, designId, template, parsedData, mapping, processSpreadsheetData, campaignName]);

  // ─── Campaign name modal handlers ─────────────────────────────
  const handleNameSubmit = () => {
    if (!campaignName.trim()) {
      showToast('warning', 'Missing name', 'Please provide a campaign name.');
      return;
    }
    setShowNameModal(false);
    processSpreadsheetData(pendingData, pendingMapping, campaignName.trim());
    setPendingData(null);
    setPendingMapping(null);
  };

  const handleNameCancel = () => {
    setShowNameModal(false);
    setPendingData(null);
    setPendingMapping(null);
    // Reset the spreadsheet data so the user can re‑upload
    setParsedData(null);
    setColumns([]);
    showToast('info', 'Cancelled', 'Campaign creation cancelled.');
  };

  // ─── Load campaign from Sent History ───────────────────────────
  useEffect(() => {
    const c = location.state?.campaignToLoad;
    if (c) {
      loadCampaignFromHistory(c);
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.campaignToLoad]);

  const loadCampaignFromHistory = (campaign) => {
    const recipients = campaign.recipients || [];
    if (recipients.length === 0) recipients.push({ phone: '+1234567890', name: 'Sample', event: 'Sample Event', date: '2026-01-01', qrUrl: '' });
    const flat = recipients.map(r => ({ ...r }));
    setParsedData(flat);
    setColumns(flat.length > 0 ? Object.keys(flat[0]) : []);
    const mappingData = campaign.mapping || {};
    const phone = mappingData.phone || 'phone';
    const qr = mappingData.qr || 'qrUrl';
    const placeholders = {};
    Object.keys(mappingData).forEach(key => {
      if (key !== 'phone' && key !== 'qr') {
        placeholders[key] = mappingData[key];
      }
    });
    setMapping({ phone, qr, placeholders });
    setTemplate(campaign.templateKey || templateList[0]?.id || 'tpl1');
    setBatchSize(campaign.batchSize || 10);
    setWaitValue(campaign.waitValue || 5);
    setWaitUnit(campaign.waitUnit || 'minutes');
    setActiveVariants(prev => ({ ...prev, [campaign.templateKey]: campaign.activeVariants || [0] }));
    setPreviewRecipientIndex(0);
    setPreviewVariantIndex((campaign.activeVariants || [0])[0] || 0);
    setCampaignName(campaign.name || '');
    showToast('info', 'Campaign Loaded', `"${campaign.name}" is ready for editing.`);
  };

  // ─── Variant management ────────────────────────────────────────
  const toggleVariant = (tplKey, index) => {
    const active = [...(activeVariants[tplKey] || [])];
    const pos = active.indexOf(index);
    if (pos >= 0) {
      if (active.length <= 1) { showToast('warning', 'Cannot Disable', 'At least one variant must remain active.'); return; }
      active.splice(pos, 1);
    } else {
      active.push(index);
      active.sort((a, b) => a - b);
    }
    setActiveVariants(prev => ({ ...prev, [tplKey]: active }));
    if (!active.includes(previewVariantIndex) && tplKey === template) setPreviewVariantIndex(active[0]);
  };

  const cycleVariant = (direction) => {
    const active = activeVariants[template] || [];
    if (active.length === 0) return;
    const pos = active.indexOf(previewVariantIndex);
    let newPos = pos + direction;
    if (newPos < 0) newPos = active.length - 1;
    if (newPos >= active.length) newPos = 0;
    setPreviewVariantIndex(active[newPos]);
  };

  const prevRecipient = () => {
    if (total === 0) return;
    const newIdx = (previewRecipientIndex - 1 + total) % total;
    setPreviewRecipientIndex(newIdx);
    const active = activeVariants[template];
    if (active && active.length > 0 && template !== 'tpl4') {
      const hash = (newIdx * 7 + 3) % active.length;
      setPreviewVariantIndex(active[hash]);
    }
  };

  const nextRecipient = () => {
    if (total === 0) return;
    const newIdx = (previewRecipientIndex + 1) % total;
    setPreviewRecipientIndex(newIdx);
    const active = activeVariants[template];
    if (active && active.length > 0 && template !== 'tpl4') {
      const hash = (newIdx * 7 + 3) % active.length;
      setPreviewVariantIndex(active[hash]);
    }
  };

  const handleTemplateChange = (newTemplate) => {
    setTemplate(newTemplate);
    const active = activeVariants[newTemplate] || [0];
    setPreviewVariantIndex(active[0] || 0);
    setCustomMessage('');
  };

  // ─── Launch / test / retry ─────────────────────────────────────
  const handleLaunch = async () => {
    if (!parsedData || total === 0) return;
    const cid = campaignId;
    if (!cid) {
      showToast('error', 'No campaign', 'Please upload a file first.');
      return;
    }
    try {
      setIsRunning(true);
      setProgress(10);
      setStatus('Launching campaign...');
      const result = await launchCampaign(cid);
      setIsRunning(false);
      setProgress(100);
      const delivered = result.data?.delivered ?? 0;
      const failed = result.data?.failed ?? 0;
      showToast('success', 'Campaign Launched', `Sent: ${delivered} | Failed: ${failed}`);
    } catch (error) {
      setIsRunning(false);
      showToast('error', 'Launch Failed', error.response?.data?.message || error.message);
    }
  };

  const handleTestSend = (phone) => {
    if (!phone) {
      showToast('warning', 'Missing Number', 'Please enter a phone number.');
      return;
    }
    showToast('success', 'Test Sent', `Message dispatched to ${phone}.`);
  };

  const handleRetryAllFailed = () => {
    showToast('info', 'Retrying', 'Resending failed messages...');
    setFailedRecipients([]);
  };

  const handleRetrySingleFailed = (index) => {
    setFailedRecipients(prev => prev.filter((_, i) => i !== index));
    showToast('success', 'Retried', 'Message resent.');
  };

  // ─── Reset everything ─────────────────────────────────────────
  const handleReset = () => {
    clearPolling();
    setParsedData(null);
    setColumns([]);
    setMapping({ phone: '', qr: '', placeholders: {} });
    setPreviewRecipientIndex(0);
    const firstId = templateList[0]?.id || 'tpl1';
    setTemplate(firstId);
    setActiveVariants(prev => {
      const newAv = { ...prev };
      if (templateList.length > 0) templateList.forEach(t => { newAv[t.id] = [0]; });
      return newAv;
    });
    setBatchSize(10);
    setWaitValue(5);
    setWaitUnit('minutes');
    setScheduleTime('');
    setFailedRecipients([]);
    setCustomMessage('');
    setCampaignId(null);
    setCampaignName('');
    setQrGenStatus('pending');
    setQrGenTotal(0);
    setQrGenProgress(0);
    setDesignId('');
    setGenerateQr(false);
    processedRef.current = '';
    setShowNameModal(false);
    setPendingData(null);
    setPendingMapping(null);
  };

  // ─── Toggle QR generation ─────────────────────────────────────
  const handleToggleQR = (checked) => {
    setGenerateQr(checked);
    if (checked && !designId && designs.length > 0) {
      setShowDesignModal(true);
    } else if (!checked) {
      setDesignId('');
    }
  };

  // ─── Select design from modal ─────────────────────────────────
  const handleSelectDesign = (selectedId) => {
    setDesignId(selectedId);
    setShowDesignModal(false);
  };

  // ─── Wait for templates ────────────────────────────────────────
  if (Object.keys(templateDefs).length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 pb-20">
      
      <div className="mb-5 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <i className="fas fa-paper-plane text-orange-500"></i> Campaign Builder
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Upload · Edit · Map · Preview · Launch</p>
        </div>
        <div className="flex items-center gap-4">
          {total > 0 && (
            <>
              <button
                onClick={() => navigate('/spreadsheet-editor', {
                  state: {
                    parsedData,
                    fileName: 'current_sheet',
                    restoreState: buildRestoreState(),
                  }
                })}
                className="text-xs text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
              >
                <i className="fas fa-edit mr-1"></i> Edit Data
              </button>
              <button
                onClick={handleReset}
                className="text-xs text-red-600 hover:underline bg-transparent border-none cursor-pointer"
              >
                <i className="fas fa-trash-alt mr-1"></i> Remove Sheet
              </button>
            </>
          )}
          <div className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full font-bold border border-orange-100">
            {total} recipients
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4">
          <BatchPreview batchSize={batchSize} total={total} />
        </div>
      )}

      {failedRecipients.length > 0 && (
        <div className="mt-4">
          <FailedRecipients
            failedList={failedRecipients}
            onRetryAll={handleRetryAllFailed}
            onRetrySingle={handleRetrySingleFailed}
          />
        </div>
      )}

      {/* QR generation progress banners */}
      {qrGenStatus === 'processing' && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <i className="fas fa-qrcode text-blue-500 text-lg animate-pulse"></i>
          <div className="flex-1">
            <div className="flex justify-between text-xs font-medium text-blue-700 mb-1">
              <span>Generating QR codes…</span>
              <span>{qrGenProgress} of {qrGenTotal}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(qrGenProgress / (qrGenTotal || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      {qrGenStatus === 'completed' && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-xs font-medium">
          <i className="fas fa-check-circle"></i> All QR codes generated and hosted.
        </div>
      )}
      {qrGenStatus === 'failed' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs font-medium">
          <i className="fas fa-exclamation-circle"></i> QR generation failed. Please try again.
        </div>
      )}

      {/* ─── DESIGN SELECTION MODAL ─────────────────────────────── */}
      <Modal
        isOpen={showDesignModal}
        onClose={() => setShowDesignModal(false)}
        title="Choose a Pass Design"
        size="max-w-md"
      >
        <div className="flex flex-col h-full space-y-4 pt-1">
          {designs.length === 0 ? (
            <div className="text-center py-8 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
                <i className="fas fa-paint-brush text-sm"></i>
              </div>
              <p className="text-sm font-semibold text-gray-700">No designs found</p>
              <p className="text-xs text-gray-400 mt-1 mb-4 max-w-[240px]">
                Create a design layout first to apply your dynamic QR code overlays.
              </p>
              <button
                onClick={() => { navigate('/designs'); setShowDesignModal(false); }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Create a New Design
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 -mt-1">
                Select a template layout below to automatically project your campaign QR code mapping.
              </p>
              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                {designs.map((d) => (
                  <ModalDesignPreview
                    key={d._id}
                    design={d}
                    isSelected={designId === d._id}
                    onSelect={handleSelectDesign}
                  />
                ))}
              </div>
              <button
                onClick={() => { navigate('/designs'); setShowDesignModal(false); }}
                className="w-full py-2 border border-dashed border-gray-300 text-gray-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/20 rounded-lg text-xs font-medium transition-all"
              >
                <i className="fas fa-plus mr-1 text-[10px]"></i> Create New Design
              </button>
            </>
          )}
          <div className="flex justify-end pt-2 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDesignModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── CAMPAIGN NAME MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={showNameModal}
        onClose={handleNameCancel}
        title="Name Your Campaign"
        size="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Give your campaign a meaningful name so you can easily identify it later.
          </p>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g., Summer Gala 2026, Tech Conference Check-In"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit(); }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleNameCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleNameSubmit}>Create Campaign</Button>
          </div>
        </div>
      </Modal>

      {/* Main Builder panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <UploadPanel onReset={handleReset} />
        <MappingPanel
          columns={columns}
          mapping={mapping}
          setMapping={setMapping}
          template={template}
          setTemplate={handleTemplateChange}
          templates={templateList}
          templateDefinitions={templateDefs}
          activeVariants={activeVariants}
          toggleVariant={toggleVariant}
          customMessage={customMessage}
          setCustomMessage={setCustomMessage}
        />
        <PreviewPanel
          recipientData={{ name: currentRecipient[mapping.placeholders?.[1]] || '', phone: mappedPhone }}
          messageText={messagePreview}
          qrUrl={generateQr ? mappedQrUrl : ''}
          showQR={generateQr && tplDef.showQR !== false}
          currentIndex={previewRecipientIndex + 1}
          total={total}
          onPrev={prevRecipient}
          onNext={nextRecipient}
          variantLabel={currentVariant?.label}
          onCycleVariant={cycleVariant}
          buttonType={tplDef?.buttonType}
          buttonText={tplDef?.buttonText}
          buttonValue={tplDef?.buttonValue}
        />
        <SettingsPanel
          batchSize={batchSize}
          setBatchSize={setBatchSize}
          waitValue={waitValue}
          setWaitValue={setWaitValue}
          waitUnit={waitUnit}
          setWaitUnit={setWaitUnit}
          scheduleTime={scheduleTime}
          setScheduleTime={setScheduleTime}
          onLaunch={handleLaunch}
          onTestSend={handleTestSend}
          isRunning={isRunning}
          progress={progress}
          status={status}
          variantCount={(activeVariants[template] || []).length}
          generateQr={generateQr}
          onToggleQR={handleToggleQR}
          onOpenDesignModal={() => setShowDesignModal(true)}
          selectedDesignName={designs.find(d => d._id === designId)?.name || 'None'}
        />
      </div>
    </div>
  );
}