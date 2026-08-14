import { useState, useEffect, useCallback } from 'react';
import Button from '../components/common/Button';
import { useToast } from '../components/layout/Toast';
import { getMediaImages, deleteMediaImages } from '../services/mediaService';

export default function MediaLibraryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const showToast = useToast();

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMediaImages();
      setImages(res.data?.data || res.data || []);
    } catch (err) {
      showToast('error', 'Failed to load images', err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const toggleSelect = (publicId) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(publicId)) newSet.delete(publicId);
    else newSet.add(publicId);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map(img => img.public_id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      showToast('warning', 'No selection', 'Select at least one image to delete.');
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.size} image(s) from Cloudinary? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await deleteMediaImages(Array.from(selectedIds));
      showToast('success', 'Deleted', `${selectedIds.size} image(s) removed.`);
      setSelectedIds(new Set());
      await fetchImages();
    } catch (err) {
      showToast('error', 'Delete failed', err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <i className="fas fa-images"></i>
              </span>
              Media Library
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all generated QR codes and header images.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleSelectAll}>
              {selectedIds.size === images.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
            No images found.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {images.map(img => (
              <div
                key={img.public_id}
                className={`relative bg-white rounded-xl border p-2 shadow-sm hover:shadow-md transition cursor-pointer ${
                  selectedIds.has(img.public_id) ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'
                }`}
                onClick={() => toggleSelect(img.public_id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(img.public_id)}
                    readOnly
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                  />
                </div>
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={img.url}
                    alt={img.public_id}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 truncate font-mono">
                  {img.public_id}
                </p>
                <p className="text-[10px] text-gray-400">{img.folder}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}