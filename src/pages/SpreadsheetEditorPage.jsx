import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';   // 👈 import XLSX for download

export default function SpreadsheetEditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fileName, setFileName] = useState('');
  const [restoreState, setRestoreState] = useState(null);
  // Fill values per column
  const [fillValues, setFillValues] = useState({});

  useEffect(() => {
    const state = location.state;
    if (state && state.parsedData && state.fileName) {
      setFileName(state.fileName);
      const parsed = state.parsedData;
      setColumns(Object.keys(parsed[0] || {}));
      setData(parsed);
      if (state.restoreState) {
        setRestoreState(state.restoreState);
      }
    } else {
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  // ─── Cell change handler ──────────────────────────────────────
  const handleCellChange = (rowIndex, col, value) => {
    const updated = [...data];
    updated[rowIndex] = { ...updated[rowIndex], [col]: value };
    setData(updated);
  };

  // ─── Add row ──────────────────────────────────────────────────
  const addRow = () => {
    const newRow = {};
    columns.forEach((col) => (newRow[col] = ''));
    setData([...data, newRow]);
  };

  // ─── Delete row ───────────────────────────────────────────────
  const deleteRow = (index) => {
    if (data.length <= 1) return;
    const updated = data.filter((_, i) => i !== index);
    setData(updated);
  };

  // ─── Rename column ────────────────────────────────────────────
  const renameColumn = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    if (columns.includes(newName)) {
      alert('A column with that name already exists.');
      return;
    }
    const updated = data.map((row) => {
      const newRow = { ...row };
      newRow[newName] = newRow[oldName] || '';
      delete newRow[oldName];
      return newRow;
    });
    setColumns(columns.map((c) => (c === oldName ? newName : c)));
    setData(updated);
  };

  // ─── Add column ───────────────────────────────────────────────
  const addColumn = () => {
    const newCol = `Column_${columns.length + 1}`;
    const updated = data.map((row) => ({ ...row, [newCol]: '' }));
    setColumns([...columns, newCol]);
    setData(updated);
  };

  // ─── Delete column ────────────────────────────────────────────
  const deleteColumn = (col) => {
    if (columns.length <= 1) return;
    const updated = data.map((row) => {
      const newRow = { ...row };
      delete newRow[col];
      return newRow;
    });
    setColumns(columns.filter((c) => c !== col));
    setData(updated);
  };

  // ─── Fill a column with a value ────────────────────────────────
  const fillColumn = (col, value) => {
    if (!col || !value.trim()) return;
    const updated = data.map(row => ({ ...row, [col]: value.trim() }));
    setData(updated);
    setFillValues(prev => ({ ...prev, [col]: '' }));
  };

  // ─── Download current sheet as Excel ─────────────────────────
  const handleDownload = () => {
    if (!data.length) {
      alert('No data to download.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const saveFileName = fileName ? fileName.replace(/\.[^.]+$/, '') + '_edited.xlsx' : 'edited_sheet.xlsx';
    XLSX.writeFile(workbook, saveFileName);
  };

  // ─── Save and go to Campaign Builder ──────────────────────────
  const handleSave = () => {
    navigate('/', {
      state: {
        spreadsheetData: data,
        fileName,
        restoreState,
      }
    });
  };

  // ─── Cancel – go back without saving ─────────────────────────
  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-full mx-auto space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
              <i className="fas fa-edit text-orange-500"></i> Edit Spreadsheet
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {fileName} · {data.length} rows · {columns.length} columns
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={addRow}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              + Add Row
            </button>
            <button
              onClick={addColumn}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700"
            >
              + Add Column
            </button>
            <button
              onClick={handleDownload}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-700"
              title="Download current sheet to your device"
            >
              <i className="fas fa-download mr-1"></i> Download
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-50 border-b">
              {/* Column names */}
              <tr>
                <th className="px-3 py-2 w-8">#</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 group relative">
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
                <th className="px-3 py-2 w-8">Actions</th>
              </tr>

              {/* Auto‑fill inputs */}
              <tr className="bg-gray-50/80">
                <td className="px-3 py-1 text-gray-400 text-[10px] font-medium text-center">
                  <i className="fas fa-fill-drip"></i>
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={fillValues[col] || ''}
                        onChange={(e) => setFillValues({ ...fillValues, [col]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            fillColumn(col, fillValues[col] || '');
                          }
                        }}
                        placeholder="Fill all rows"
                        className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs focus:border-blue-400 outline-none"
                      />
                      <button
                        onClick={() => fillColumn(col, fillValues[col] || '')}
                        className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded hover:bg-blue-600"
                        title="Fill column with this value"
                      >
                        <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </td>
                ))}
                <td className="px-3 py-1"></td>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  <td className="px-3 py-1 text-gray-400">{rowIdx + 1}</td>
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-1">
                      <input
                        type="text"
                        value={row[col] || ''}
                        onChange={(e) => handleCellChange(rowIdx, col, e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1">
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

        {data.length === 0 && (
          <div className="text-center py-4 text-gray-400">
            No rows to display. Click <strong>Add Row</strong> to start.
          </div>
        )}
      </div>
    </div>
  );
}