import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Button from '../components/common/Button';
import { useToast } from '../components/layout/Toast';
import api from '../services/api'; // for WhatsApp check endpoint

// ─── Small stat card component ──────────────────────────────────
function StatCard({ label, value, color = 'gray', icon }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorClasses[color] || colorClasses.gray}`}>
      {icon && <i className={`fas ${icon} text-lg`}></i>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ExcelTestPage() {
  const showToast = useToast();

  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [phoneColumn, setPhoneColumn] = useState('');

  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false);
  const [duplicateSummary, setDuplicateSummary] = useState({});
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(false);

  const [whatsappCheckDone, setWhatsappCheckDone] = useState(false);
  const [whatsappSummary, setWhatsappSummary] = useState({});
  const [invalidNumbers, setInvalidNumbers] = useState([]);
  const [invalidRemoved, setInvalidRemoved] = useState(false);

  const [loadingCheck, setLoadingCheck] = useState(false);
  const [outputData, setOutputData] = useState(null);

  // ─── NEW: State for sheet visibility ─────────────────────────
  const [showSheet, setShowSheet] = useState(false);

  // ─── Upload & Parse File ─────────────────────────────────────
  const handleFileUpload = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) throw new Error('Empty file');
        setParsedData(json);
        setColumns(Object.keys(json[0]));
        setFileName(file.name);
        setOutputData(json);
        // Reset all test states
        setPhoneColumn('');
        setDuplicateCheckDone(false);
        setDuplicatesRemoved(false);
        setWhatsappCheckDone(false);
        setInvalidNumbers([]);
        setInvalidRemoved(false);
        setShowSheet(true); // automatically show sheet after upload
        showToast('success', 'File loaded', `Loaded ${json.length} rows.`);
      } catch (err) {
        showToast('error', 'Parse Error', err.message || 'Could not parse file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [showToast]);

  // ─── Duplicate Check ─────────────────────────────────────────
  const runDuplicateCheck = () => {
    if (!parsedData || !phoneColumn) {
      showToast('warning', 'Missing', 'Please select the phone column first.');
      return;
    }
    const seen = new Set();
    const duplicateRows = [];
    parsedData.forEach(row => {
      const phone = String(row[phoneColumn] || '').trim();
      if (seen.has(phone)) {
        duplicateRows.push(row);
      } else {
        seen.add(phone);
      }
    });
    const duplicateCount = duplicateRows.length;
    const uniqueCount = parsedData.length - duplicateCount;
    setDuplicateSummary({
      totalRows: parsedData.length,
      duplicateCount,
      uniqueCount,
    });
    setDuplicateCheckDone(true);
    setDuplicatesRemoved(false);
    showToast('success', 'Duplicate check complete', `Found ${duplicateCount} duplicate rows.`);
  };

  const removeDuplicates = () => {
    if (!parsedData || !phoneColumn) return;
    const seen = new Set();
    const uniqueData = parsedData.filter(row => {
      const phone = String(row[phoneColumn] || '').trim();
      if (seen.has(phone)) return false;
      seen.add(phone);
      return true;
    });
    setOutputData(uniqueData);
    setDuplicatesRemoved(true);
    showToast('success', 'Duplicates removed', `Kept ${uniqueData.length} unique rows.`);
  };

  // ─── WhatsApp Check ──────────────────────────────────────────
  const runWhatsappCheck = async () => {
    if (!parsedData || !phoneColumn) {
      showToast('warning', 'Missing', 'Please select the phone column first.');
      return;
    }
    const phones = parsedData.map(row => String(row[phoneColumn] || '').trim()).filter(p => p !== '');
    if (phones.length === 0) {
      showToast('warning', 'No numbers', 'No phone numbers found in selected column.');
      return;
    }
    setLoadingCheck(true);
    try {
      const res = await api.post('/whatsapp/check-numbers', { phones });
      const results = res.data?.results || res.results || [];
      const invalid = results.filter(r => r.status !== 'valid');
      const validCount = results.length - invalid.length;
      setInvalidNumbers(invalid.map(r => r.input));
      setWhatsappSummary({
        totalChecked: results.length,
        validCount,
        invalidCount: invalid.length,
        invalidNumbers: invalid.map(r => r.input),
      });
      setWhatsappCheckDone(true);
      setInvalidRemoved(false);
      showToast('success', 'WhatsApp check complete', `Valid: ${validCount}, Invalid: ${invalid.length}`);
    } catch (err) {
      showToast('error', 'Check failed', err.message || 'Could not check numbers');
    } finally {
      setLoadingCheck(false);
    }
  };

  const removeInvalidNumbers = () => {
    if (!parsedData || !phoneColumn || invalidNumbers.length === 0) return;
    const filtered = parsedData.filter(row => {
      const phone = String(row[phoneColumn] || '').trim();
      return !invalidNumbers.includes(phone);
    });
    setOutputData(filtered);
    setInvalidRemoved(true);
    showToast('success', 'Invalid numbers removed', `Kept ${filtered.length} rows.`);
  };

  // ─── Save to Excel ───────────────────────────────────────────
  const saveExcel = () => {
    if (!outputData || outputData.length === 0) {
      showToast('warning', 'No data', 'Nothing to save.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(outputData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const saveFileName = fileName ? fileName.replace(/\.[^.]+$/, '') + '_cleaned.xlsx' : 'cleaned.xlsx';
    XLSX.writeFile(workbook, saveFileName);
    showToast('success', 'Saved', `${saveFileName} downloaded.`);
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
            <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
              <i className="fas fa-table"></i>
            </span>
            Excel Sheet Test
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload your contact list, run duplicate and WhatsApp validity checks, clean the data, and download the final file.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
            <h2 className="font-bold text-gray-700">Upload File</h2>
          </div>

          <label className="block">
            <span className="sr-only">Choose file</span>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 hover:bg-orange-50/30 transition cursor-pointer">
              <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
              <p className="text-sm text-gray-600">
                Drag & drop or <span className="text-orange-600 font-medium">browse</span> to upload an Excel/CSV file
              </p>
              <p className="text-xs text-gray-400 mt-1">Supported: .xlsx, .xls, .csv</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
          </label>

          {parsedData && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="File" value={fileName} icon="fa-file-excel" color="green" />
              <StatCard label="Rows" value={parsedData.length} icon="fa-list-ol" color="blue" />
              <StatCard label="Columns" value={columns.length} icon="fa-columns" color="orange" />
              <StatCard label="Current Output" value={outputData?.length || 0} icon="fa-database" color="gray" />
            </div>
          )}
        </div>

        {parsedData && (
          <>
            {/* Phone Column Selection */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
                <h2 className="font-bold text-gray-700">Select Phone Column</h2>
              </div>
              <select
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              >
                <option value="">-- Select Column --</option>
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              {!phoneColumn && (
                <p className="text-xs text-gray-400 mt-2">
                  Choose the column that contains phone numbers to run checks.
                </p>
              )}
            </div>

            {/* Data Preview (Sheet) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <i className="fas fa-eye"></i>
                  </div>
                  <h2 className="font-bold text-gray-700">Sheet Preview</h2>
                </div>
                <button
                  onClick={() => setShowSheet(!showSheet)}
                  className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                >
                  {showSheet ? 'Hide Sheet' : 'Show Sheet'}
                </button>
              </div>

              {showSheet && outputData && outputData.length > 0 ? (
                <div className="overflow-auto max-h-96 border border-gray-200 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {outputData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {columns.map((col) => (
                            <td key={col} className="px-4 py-2 whitespace-nowrap text-gray-700">
                              {row[col] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data to display.</p>
              )}
            </div>

            {/* Checks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Duplicate Check */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">3</div>
                  <h2 className="font-bold text-gray-700">Duplicate Check</h2>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Find rows with identical phone numbers and optionally remove duplicates.
                </p>

                <Button
                  variant="outline"
                  onClick={runDuplicateCheck}
                  disabled={!phoneColumn}
                  className="w-full mb-4"
                >
                  <i className="fas fa-copy mr-1"></i> Run Duplicate Check
                </Button>

                {duplicateCheckDone && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total rows</span>
                      <strong>{duplicateSummary.totalRows}</strong>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Duplicate rows</span>
                      <strong>{duplicateSummary.duplicateCount}</strong>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Unique rows</span>
                      <strong>{duplicateSummary.uniqueCount}</strong>
                    </div>

                    {duplicatesRemoved ? (
                      <div className="flex items-center gap-2 text-green-700 pt-2">
                        <i className="fas fa-check-circle"></i>
                        <span>Duplicates removed successfully</span>
                      </div>
                    ) : (
                      duplicateSummary.duplicateCount > 0 && (
                        <Button variant="danger" onClick={removeDuplicates} className="mt-2 w-full">
                          Remove Duplicates
                        </Button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* WhatsApp Check */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">4</div>
                  <h2 className="font-bold text-gray-700">WhatsApp Validity Check</h2>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  Verify which phone numbers are present on WhatsApp and remove invalid ones.
                </p>

                <Button
                  variant="outline"
                  onClick={runWhatsappCheck}
                  disabled={!phoneColumn || loadingCheck}
                  className="w-full mb-4"
                >
                  {loadingCheck ? (
                    <><i className="fas fa-spinner fa-spin mr-1"></i> Checking...</>
                  ) : (
                    <><i className="fas fa-check-circle mr-1"></i> Check WhatsApp</>
                  )}
                </Button>

                {whatsappCheckDone && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total checked</span>
                      <strong>{whatsappSummary.totalChecked}</strong>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Valid (on WhatsApp)</span>
                      <strong>{whatsappSummary.validCount}</strong>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Invalid (NOT on WhatsApp)</span>
                      <strong>{whatsappSummary.invalidCount}</strong>
                    </div>

                    {whatsappSummary.invalidCount > 0 && !invalidRemoved && (
                      <Button variant="danger" onClick={removeInvalidNumbers} className="mt-2 w-full">
                        Remove Invalid Numbers
                      </Button>
                    )}

                    {invalidRemoved && (
                      <div className="flex items-center gap-2 text-green-700 pt-2">
                        <i className="fas fa-check-circle"></i>
                        <span>Invalid numbers removed</span>
                      </div>
                    )}

                    {whatsappSummary.invalidCount > 0 && (
                      <div className="mt-3 max-h-32 overflow-y-auto bg-white rounded-lg border border-red-100 p-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Invalid numbers:</p>
                        <ul className="list-disc list-inside text-xs text-red-600">
                          {whatsappSummary.invalidNumbers.map((num, idx) => <li key={idx}>{num}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">5</div>
                <h2 className="font-bold text-gray-700">Save Cleaned Excel</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Current data rows: <strong className="text-gray-700">{outputData?.length || 0}</strong>
                </p>
                <Button
                  variant="primary"
                  onClick={saveExcel}
                  disabled={!outputData || outputData.length === 0}
                  className="w-full sm:w-auto"
                >
                  <i className="fas fa-download mr-1"></i> Save Excel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}