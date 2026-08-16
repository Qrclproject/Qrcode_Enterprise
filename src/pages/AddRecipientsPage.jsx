import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadPanel from '../components/campaign/UploadPanel';
import MappingPanel from '../components/campaign/MappingPanel';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';
import { useToast } from '../components/layout/Toast';
import {
  getCampaignById,
  addRecipientsToCampaign,
  getAddRecipientsProgress,
} from '../services/campaignService';
import { getTemplates } from '../services/templateService';
import { getDesigns } from '../services/designService';
import { normalizePhone } from '../utils/formatters';

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

  // Fetch campaign and data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const campaignRes = await getCampaignById(campaignId);
        const campaignData = campaignRes.data || campaignRes;
        setCampaign(campaignData);

        if (campaignData.mapping) {
          setMapping(campaignData.mapping);
        }

        const templatesRes = await getTemplates();
        let apiTemplates = templatesRes.data?.templates || templatesRes.data || templatesRes || [];
        if (!Array.isArray(apiTemplates)) apiTemplates = [];
        const list = [];
        const defs = {};
        apiTemplates.forEach(t => {
          list.push({ id: t._id, name: t.name });
          defs[t._id] = {
            name: t.name,
            showQR: t.showQR ?? true,
            variants: t.variants || [],
            buttonType: t.buttonType || 'none',
            buttonText: t.buttonText || '',
            buttonValue: t.buttonValue || '',
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
    if (data.length > 0) {
      setColumns(Object.keys(data[0]));
    }
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
    if (columns.includes(newName)) {
      alert('A column with that name already exists.');
      return;
    }
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

  const handleSubmit = async () => {
    if (!parsedData || parsedData.length === 0) {
      showToast('warning', 'No data', 'Please upload a file.');
      return;
    }
    if (!mapping.phone) {
      showToast('warning', 'Missing phone column', 'Please select the phone column.');
      return;
    }

    const recipients = parsedData.map(row => ({
      ...row,
      phone: normalizePhone(row[mapping.phone] || ''),
    }));

    setIsSubmitting(true);
    try {
      await addRecipientsToCampaign(campaignId, recipients, { generateQr, sendNow });
      // Start polling progress
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-800">
            Add Recipients to {campaign?.name}
          </h1>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
        </div>

        <UploadPanel onFileParsed={handleFileParsed} />

        {parsedData && (
          <>
            {/* Editable sheet */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-700">Review & Edit Sheet</h2>
                <div className="flex gap-2">
                  <button onClick={addRow} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                    + Add Row
                  </button>
                  <button onClick={addColumn} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                    + Add Column
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      {columns.map(col => (
                        <th key={col} className="px-2 py-2 text-left group relative">
                          <input
                            type="text"
                            defaultValue={col}
                            onBlur={(e) => renameColumn(col, e.target.value)}
                            className="bg-transparent border-none outline-none font-semibold text-gray-600 w-24"
                          />
                          <button
                            onClick={() => deleteColumn(col)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1"
                            title="Delete column"
                          >
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
                            <input
                              type="text"
                              value={row[col] || ''}
                              onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <button
                            onClick={() => deleteRow(rowIdx)}
                            className="text-red-400 hover:text-red-600"
                            title="Delete row"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping */}
            <MappingPanel
              columns={columns}
              mapping={mapping}
              setMapping={setMapping}
              template={campaign.templateKey || ''}
              setTemplate={() => {}}
              templates={templateList}
              templateDefinitions={templateDefs}
              activeVariants={campaign.activeVariants || []}
              toggleVariant={() => {}}
              customMessage=""
              setCustomMessage={() => {}}
              qrDataFields={[]}
              textOverlayPlaceholders={[]}
              showQrFields={false}
            />

            {/* Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={generateQr}
                  onChange={(e) => setGenerateQr(e.target.checked)}
                />
                Generate QR codes for new recipients
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendNow}
                  onChange={(e) => setSendNow(e.target.checked)}
                />
                Send WhatsApp message to new recipients now
              </label>
            </div>

            {/* Progress Bar */}
            {isSubmitting && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <ProgressBar
                  value={progress.completed}
                  max={progress.total || 1}
                  label={progress.phase === 'qr' ? 'Generating QR codes...' : progress.phase === 'sending' ? 'Sending messages...' : 'Processing...'}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {progress.completed} of {progress.total} processed
                </p>
              </div>
            )}

            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Add Recipients'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}