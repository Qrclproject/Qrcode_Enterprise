import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/layout/Toast';
import Button from '../components/common/Button';
import DesignEditor from '../components/designs/DesignEditor';
import { getDesigns, deleteDesign } from '../services/designService';

// ---------- Sub‑component to display a saved design with QR overlay ----------
function DesignCard({ design, onEdit, onDelete }) {
  const [naturalDimensions, setNaturalDimensions] = useState({
    width: design.naturalWidth || 0,
    height: design.naturalHeight || 0
  });

  const handleImageLoad = (e) => {
    if (!naturalDimensions.width || !naturalDimensions.height) {
      setNaturalDimensions({
        width: e.currentTarget.naturalWidth,
        height: e.currentTarget.naturalHeight
      });
    }
  };

  const { x, y, width, height } = design.qrPosition;
  const hasDimensions = naturalDimensions.width > 0 && naturalDimensions.height > 0;
  const style = hasDimensions ? {
    left: `${(x / naturalDimensions.width) * 100}%`,
    top: `${(y / naturalDimensions.height) * 100}%`,
    width: `${(width / naturalDimensions.width) * 100}%`,
    height: `${(height / naturalDimensions.height) * 100}%`,
  } : { display: 'none' };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200 relative group">
      {/* Edit & Delete buttons – visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => onEdit(design)}
          className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-blue-600"
          title="Edit design"
        >
          <i className="fas fa-pencil-alt text-xs"></i>
        </button>
        <button
          onClick={() => onDelete(design._id)}
          className="p-1.5 bg-white rounded-full shadow text-gray-500 hover:text-red-600"
          title="Delete design"
        >
          <i className="fas fa-trash-alt text-xs"></i>
        </button>
      </div>

      <div className="relative w-full rounded-lg overflow-hidden bg-gray-50" style={{ lineHeight: 0 }}>
        <img
          src={design.imageUrl}
          alt={design.name}
          className="w-full h-auto block select-none"
          onLoad={handleImageLoad}
        />
        {hasDimensions && (
          <div
            className="absolute border-2 border-dashed border-orange-500 bg-orange-100/30 pointer-events-none rounded shadow-sm"
            style={style}
            title={`QR position: (${x},${y}) ${width}×${height}px`}
          />
        )}
      </div>
      <h3 className="font-semibold text-sm text-gray-800 mt-2.5 truncate">{design.name}</h3>
      <p className="text-[10px] text-gray-400 mt-1 font-mono">QR: ({x},{y}) {width}×{height}px</p>
    </div>
  );
}

// ---------- Main Designs page ----------
export default function DesignsPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);   // for editing
  const showToast = useToast();

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDesigns();
      setDesigns(res.data?.data || res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load designs', err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDesigns(); }, [fetchDesigns]);

  const handleDesignCreated = (newDesign) => {
    if (selectedDesign) {
      // Update existing design in list
      setDesigns((prev) => prev.map((d) => (d._id === newDesign._id ? newDesign : d)));
    } else {
      // Add new design to list
      setDesigns((prev) => [newDesign, ...prev]);
    }
    setSelectedDesign(null);
  };

  const handleEdit = (design) => {
    setSelectedDesign(design);
    setShowEditor(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this design? This action cannot be undone.')) return;
    try {
      await deleteDesign(id);
      showToast('success', 'Design deleted');
      fetchDesigns();
    } catch (err) {
      showToast('error', 'Delete failed', err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            <i className="fas fa-paint-brush text-orange-500"></i> Designs
          </h1>
          <Button icon="plus" onClick={() => setShowEditor(true)}>New Design</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
            No designs yet. Create one to use in your campaigns.
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {designs.map((d) => (
              <div key={d._id} className="break-inside-avoid">
                <DesignCard
                  design={d}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Full‑screen editor overlay (replaces Modal) ─── */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <DesignEditor
            onClose={() => {
              setShowEditor(false);
              setSelectedDesign(null);
            }}
            onDesignCreated={handleDesignCreated}
            initialDesign={selectedDesign}
          />
        </div>
      )}
    </div>
  );
}