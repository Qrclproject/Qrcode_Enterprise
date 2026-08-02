import { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useToast } from '../layout/Toast';
import { createDesign, updateDesign } from '../../services/designService';
import QRCode from 'qrcode'; // npm install qrcode

export default function DesignEditor({ onClose, onDesignCreated, initialDesign }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialDesign?.imageUrl || null);
  const [position, setPosition] = useState({ x: 50, y: 50, width: 150, height: 150 });
  const [designName, setDesignName] = useState(initialDesign?.name || '');
  const [qrPadding, setQrPadding] = useState(initialDesign?.qrPadding || 15); // percentage (0-50)
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const initializedRef = useRef(false);
  const showToast = useToast();

  // ─── Convert natural dimensions to screen-displayed dimensions ───
  const convertToDisplayed = useCallback(() => {
    const img = imgRef.current;
    if (!img || !initialDesign?.qrPosition || initializedRef.current) return;
    
    const rect = img.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;

    if (displayedWidth === 0 || displayedHeight === 0 || img.naturalWidth === 0) return;

    const scaleX = displayedWidth / img.naturalWidth;
    const scaleY = displayedHeight / img.naturalHeight;

    setPosition({
      x: Math.round(initialDesign.qrPosition.x * scaleX),
      y: Math.round(initialDesign.qrPosition.y * scaleY),
      width: Math.round(initialDesign.qrPosition.width * scaleX),
      height: Math.round(initialDesign.qrPosition.height * scaleY),
    });
    initializedRef.current = true;
  }, [initialDesign]);

  // ─── Reset state when editing a different design ──────────────────
  useEffect(() => {
    initializedRef.current = false;
    setDesignName(initialDesign?.name || '');
    setImagePreview(initialDesign?.imageUrl || null);
    setQrPadding(initialDesign?.qrPadding || 15);
    
    if (initialDesign?.qrPosition) {
      setPosition(initialDesign.qrPosition);
    } else {
      setPosition({ x: 50, y: 50, width: 150, height: 150 });
    }
  }, [initialDesign]);

  // ─── Handle Image Load Event ──────────────────────────────────
  const handleImageLoad = (e) => {
    const img = e.target;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    requestAnimationFrame(convertToDisplayed);
  };

  // ─── Fallback for cached images ───────────────────────────────
  useEffect(() => {
    if (!imagePreview) return;
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      requestAnimationFrame(convertToDisplayed);
    }
  }, [imagePreview, convertToDisplayed]);

  // ─── File upload handler ──────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    initializedRef.current = false;
  };

  // ─── Generate a sample QR code for preview ────────────────────
  const generateSampleQR = useCallback(async () => {
    try {
      const qrDataUrl = await QRCode.toDataURL('Sample QR Code', {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      return qrDataUrl;
    } catch (err) {
      console.error('QR generation failed', err);
      return null;
    }
  }, []);

  // ─── Render live preview on canvas ─────────────────────────────
// ─── Render live preview on canvas ─────────────────────────────
useEffect(() => {
  const renderPreview = async () => {
    if (!showPreview || !imagePreview || !naturalSize.width) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Load design image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imagePreview;
    await new Promise((resolve) => { img.onload = resolve; });
    
    // Set canvas size to natural dimensions
    canvas.width = naturalSize.width;
    canvas.height = naturalSize.height;
    ctx.drawImage(img, 0, 0, naturalSize.width, naturalSize.height);
    
    // Get current displayed size of the image to compute scale
    const imgElement = imgRef.current;
    if (!imgElement) return;
    const rect = imgElement.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    if (displayedWidth === 0 || displayedHeight === 0) return;
    
    // Compute scale factors: displayed → natural
    const scaleX = displayedWidth / naturalSize.width;
    const scaleY = displayedHeight / naturalSize.height;
    
    // Convert position from displayed to natural coordinates
    const naturalPos = {
      x: position.x / scaleX,
      y: position.y / scaleY,
      width: position.width / scaleX,
      height: position.height / scaleY,
    };
    
    // Generate sample QR
    const qrDataUrl = await generateSampleQR();
    if (!qrDataUrl) return;
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });
    
    // Calculate target rectangle with padding (using natural coordinates)
    const paddingFraction = qrPadding / 100;
    const innerWidth = Math.round(naturalPos.width * (1 - paddingFraction * 2));
    const innerHeight = Math.round(naturalPos.height * (1 - paddingFraction * 2));
    const offsetX = Math.round((naturalPos.width - innerWidth) / 2);
    const offsetY = Math.round((naturalPos.height - innerHeight) / 2);
    
    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(naturalPos.x, naturalPos.y, naturalPos.width, naturalPos.height);
    
    // Draw QR centered with aspect ratio preserved
    const qrAspect = qrImg.width / qrImg.height;
    let drawW = innerWidth;
    let drawH = innerHeight;
    if (qrAspect > 1) {
      drawH = innerWidth / qrAspect;
    } else {
      drawW = innerHeight * qrAspect;
    }
    const qrX = naturalPos.x + offsetX + (innerWidth - drawW) / 2;
    const qrY = naturalPos.y + offsetY + (innerHeight - drawH) / 2;
    ctx.drawImage(qrImg, qrX, qrY, drawW, drawH);
    
    // Draw dashed border to indicate QR area
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(naturalPos.x, naturalPos.y, naturalPos.width, naturalPos.height);
  };
  renderPreview();
}, [showPreview, imagePreview, naturalSize, position, qrPadding, generateSampleQR]);
  // ─── Save logic ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!designName.trim()) {
      showToast('warning', 'Missing info', 'Please provide a design name.');
      return;
    }
    if (!initialDesign && !imageFile) {
      showToast('warning', 'Missing image', 'Please upload an image.');
      return;
    }
    setSaving(true);

    try {
      const img = imgRef.current;
      if (!img) throw new Error('Image not loaded');

      const rect = img.getBoundingClientRect();
      const scaleX = naturalSize.width / rect.width;
      const scaleY = naturalSize.height / rect.height;

      const naturalPosition = {
        x: Math.round(position.x * scaleX),
        y: Math.round(position.y * scaleY),
        width: Math.round(position.width * scaleX),
        height: Math.round(position.height * scaleY),
      };

      const data = {
        name: designName.trim(),
        qrPosition: naturalPosition,
        qrPadding: qrPadding, // store padding percentage
      };

      if (initialDesign) {
        const res = await updateDesign(initialDesign._id, data);
        showToast('success', 'Design updated', 'Your changes have been saved.');
        if (onDesignCreated) onDesignCreated(res.data?.data || res.data);
      } else {
        const formData = new FormData();
        formData.append('name', designName.trim());
        formData.append('image', imageFile);
        formData.append('qrPosition', JSON.stringify(naturalPosition));
        formData.append('qrPadding', String(qrPadding));
        const res = await createDesign(formData);
        showToast('success', 'Design saved', 'Your design is ready to use.');
        if (onDesignCreated) onDesignCreated(res.data?.data || res.data);
      }
      if (onClose) onClose();
    } catch (err) {
      showToast('error', 'Save failed', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-4xl mx-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        {initialDesign ? 'Edit Design' : 'Create Design'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ─── Left column: inputs and controls ──────────────────── */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Design Name</label>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
              placeholder="e.g., Gala Dinner Pass"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {initialDesign ? 'Replace Image (optional)' : 'Upload Event Pass Image'}
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full mt-1 text-sm" />
          </div>

          {/* ─── QR Padding Slider ────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-gray-500 flex justify-between">
              QR Padding <span className="text-gray-400">{qrPadding}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={qrPadding}
              onChange={(e) => setQrPadding(Number(e.target.value))}
              className="w-full mt-1"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>

          {/* ─── Preview Toggle ───────────────────────────────────── */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
          >
            {showPreview ? 'Hide Preview' : 'Show Live Preview'}
          </button>

          {/* ─── Position info ────────────────────────────────────── */}
          {imagePreview && (
            <div className="text-xs text-gray-500">
              QR position (on screen): X={position.x} Y={position.y} · Size={position.width}×{position.height}px
            </div>
          )}
        </div>

        {/* ─── Right column: design image with draggable QR ────── */}
        <div>
          {imagePreview ? (
            <div className="relative inline-block border rounded-lg overflow-hidden" style={{ maxHeight: '500px' }}>
              <img
                ref={imgRef}
                src={imagePreview}
                alt="template"
                className="max-w-full h-auto block"
                style={{ maxHeight: '500px' }}
                onLoad={handleImageLoad}
              />
              <Rnd
                size={{ width: position.width, height: position.height }}
                position={{ x: position.x, y: position.y }}
                onDragStop={(e, d) => setPosition((p) => ({ ...p, x: d.x, y: d.y }))}
                onResizeStop={(e, direction, ref, delta, pos) => {
                  setPosition({
                    x: pos.x,
                    y: pos.y,
                    width: parseInt(ref.style.width, 10),
                    height: parseInt(ref.style.height, 10),
                  });
                }}
                bounds="parent"
                style={{ zIndex: 10 }}
              >
                <div className="w-full h-full border-2 border-dashed border-orange-500 bg-white/50 flex items-center justify-center text-xs font-bold text-orange-600 select-none">
                  QR Code
                </div>
              </Rnd>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
              Upload an image to start designing
            </div>
          )}
        </div>
      </div>

      {/* ─── Live Preview Canvas ──────────────────────────────────── */}
      {showPreview && imagePreview && (
        <div className="mt-6 border rounded-lg p-4 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Live Preview (with padding)</h4>
          <div className="flex justify-center">
            <canvas
              ref={previewCanvasRef}
              style={{ maxWidth: '100%', maxHeight: '500px', border: '1px solid #ddd' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Shows how the QR code will appear with current padding.
          </p>
        </div>
      )}

      {/* ─── Action Buttons ───────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-3 border-t mt-6">
        <button
          onClick={onClose}
          className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-xs hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!imagePreview || saving}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Design'}
        </button>
      </div>
    </div>
  );
}