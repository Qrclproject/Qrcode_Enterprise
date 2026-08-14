import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useToast } from '../layout/Toast';
import { convertScientificNotation, normalizePhone } from '../../utils/formatters';

export default function UploadPanel({ onReset }) {
  const navigate = useNavigate();
  const showToast = useToast();

  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) throw new Error('Empty file');

        // Convert all numeric values to full strings, then normalize phone numbers
        const formattedData = json.map(row => {
          const newRow = {};
          Object.entries(row).forEach(([key, value]) => {
            if (typeof value === 'number') {
              newRow[key] = value.toLocaleString('fullwide', { useGrouping: false });
            } else {
              newRow[key] = value;
            }
          });

          // Normalize phone number column if it exists
          const phoneKey = Object.keys(newRow).find(k => k.toLowerCase().includes('phone'));
          if (phoneKey && newRow[phoneKey]) {
            newRow[phoneKey] = normalizePhone(newRow[phoneKey]);
          }

          return newRow;
        });

        // Navigate to spreadsheet editor with parsed and cleaned data
        navigate('/spreadsheet-editor', {
          state: { parsedData: formattedData, fileName: file.name },
        });
      } catch (err) {
        showToast('error', 'Parse Error', 'Could not parse file. Ensure it has headers and data rows.');
      }
    };
    reader.onerror = () => {
      showToast('error', 'File Error', 'Could not read file. Please try again.');
    };
    reader.readAsArrayBuffer(file);
  }, [navigate, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) parseFile(acceptedFiles[0]);
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  return (
    <div className="dashboard-panel p-4">
      <div className="panel-header">
        <div className="panel-badge">1</div> UPLOAD CONTACT LIST
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition bg-gray-50/50 flex-1 flex flex-col items-center justify-center min-h-[160px] ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <input {...getInputProps()} />
        <i className="fas fa-cloud-upload-alt text-4xl text-blue-300 mb-2"></i>
        <p className="text-gray-600 font-medium text-xs">Drag & drop your Excel/CSV file here, or click to browse.</p>
        <p className="text-gray-400 text-[10px] mt-2">You'll be able to edit the data before proceeding.</p>
      </div>
    </div>
  );
}