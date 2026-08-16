import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../components/layout/Toast';
import Button from '../components/common/Button';
import DesignEditor from '../components/designs/DesignEditor';
import { getDesigns, deleteDesign } from '../services/designService';

// ─── Small stat card component with gradient styles ────────────
function StatCard({ label, value, icon, color = 'gray' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-white shadow-blue-200',
    green: 'from-emerald-500 to-emerald-600 text-white shadow-emerald-200',
    orange: 'from-orange-500 to-orange-600 text-white shadow-orange-200',
    gray: 'from-gray-500 to-gray-600 text-white shadow-gray-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.gray} rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-shadow`}>
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <i className={`fas ${icon} text-lg text-white`}></i>
      </div>
      <div>
        <p className="text-xs text-white/80">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ---------- Sub‑component to display a saved design with QR overlay ----------
function DesignCard({ design, onEdit, onDelete, onPreview }) {
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

  const textOverlayCount = design.textOverlays?.length || 0;
  const qrDataFieldCount = design.qrDataFields?.length || 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-200 relative group flex flex-col">
      {/* Action buttons – always visible on mobile, hover on desktop */}
      <div className="absolute top-3 right-3 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPreview(design.imageUrl)}
          className="p-2 bg-white rounded-full shadow text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
          title="Preview full image"
        >
          <i className="fas fa-expand text-xs"></i>
        </button>
        <button
          onClick={() => onEdit(design)}
          className="p-2 bg-white rounded-full shadow text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
          title="Edit design"
        >
          <i className="fas fa-pencil-alt text-xs"></i>
        </button>
        <button
          onClick={() => onDelete(design._id)}
          className="p-2 bg-white rounded-full shadow text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete design"
        >
          <i className="fas fa-trash-alt text-xs"></i>
        </button>
      </div>

      {/* Image with QR overlay */}
      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-50 mb-3" style={{ lineHeight: 0 }}>
        <img
          src={design.imageUrl}
          alt={design.name}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
        />
        {hasDimensions && (
          <div
            className="absolute border-2 border-dashed border-orange-500 bg-orange-100/30 pointer-events-none rounded-sm"
            style={style}
            title={`QR position: (${x},${y}) ${width}×${height}px`}
          />
        )}
      </div>

      {/* Design info */}
      <h3 className="font-semibold text-sm text-gray-800 truncate group-hover:text-orange-700 transition-colors">
        {design.name}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
        <span className="bg-gray-100 px-2 py-0.5 rounded-full font-mono">
          QR: ({x},{y})
        </span>
        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
          <i className="fas fa-font mr-1"></i>{textOverlayCount} overlays
        </span>
        <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
          <i className="fas fa-qrcode mr-1"></i>{qrDataFieldCount} fields
        </span>
      </div>
    </div>
  );
}

// ---------- Main Designs page ----------
export default function DesignsPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [search, setSearch] = useState('');
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

  const filteredDesigns = useMemo(() => {
    if (!search.trim()) return designs;
    const s = search.toLowerCase();
    return designs.filter(d => d.name?.toLowerCase().includes(s));
  }, [designs, search]);

  const handleDesignCreated = (newDesign) => {
    if (selectedDesign) {
      setDesigns(prev => prev.map((d) => (d._id === newDesign._id ? newDesign : d)));
    } else {
      setDesigns(prev => [newDesign, ...prev]);
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

  const handlePreview = (imageUrl) => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg shadow-orange-200/50 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <span className="bg-white/20 text-white p-2 rounded-lg">
                <i className="fas fa-paint-brush"></i>
              </span>
              Designs
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Create and manage custom pass designs for QR code overlays.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search designs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-white/30 bg-white/90 rounded-xl px-4 py-2 text-xs w-56 focus:border-white focus:ring-2 focus:ring-white/30 outline-none transition placeholder-gray-400"
            />
            <Button icon="plus" onClick={() => setShowEditor(true)}>New Design</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Designs" value={designs.length} icon="fa-object-group" color="blue" />
          <StatCard label="Visible Designs" value={filteredDesigns.length} icon="fa-eye" color="green" />
          <StatCard label="Total Overlays" value={designs.reduce((sum, d) => sum + (d.textOverlays?.length || 0), 0)} icon="fa-font" color="orange" />
        </div>

        {/* Loading / Empty / Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white shadow-sm">
            <i className="fas fa-paint-brush text-4xl mb-3 text-gray-300"></i>
            <p className="text-lg font-medium text-gray-500">
              {search ? 'No designs match your search.' : 'No designs yet. Create one to use in your campaigns.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowEditor(true)}
            >
              <i className="fas fa-plus mr-1"></i> New Design
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDesigns.map((d) => (
              <DesignCard
                key={d._id}
                design={d}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full‑screen editor overlay */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-white to-gray-50 overflow-y-auto">
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