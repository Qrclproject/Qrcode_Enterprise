import { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useToast } from '../layout/Toast';
import { createDesign, updateDesign } from '../../services/designService';
import QRCode from 'qrcode';

// ─── Shape drawing (centered, used for single large elements) ──
const drawCenteredShape = (ctx, cx, cy, size, shape, color) => {
  ctx.fillStyle = color;
  const half = size / 2;
  const s = size;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rounded': {
      const r = size * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - half + r, cy - half);
      ctx.lineTo(cx + half - r, cy - half);
      ctx.quadraticCurveTo(cx + half, cy - half, cx + half, cy - half + r);
      ctx.lineTo(cx + half, cy + half - r);
      ctx.quadraticCurveTo(cx + half, cy + half, cx + half - r, cy + half);
      ctx.lineTo(cx - half + r, cy + half);
      ctx.quadraticCurveTo(cx - half, cy + half, cx - half, cy + half - r);
      ctx.lineTo(cx - half, cy - half + r);
      ctx.quadraticCurveTo(cx - half, cy - half, cx - half + r, cy - half);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star': {
      const spikes = 5;
      const outerRadius = half;
      const innerRadius = half * 0.45;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / spikes;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        let bx = cx + Math.cos(rot) * outerRadius;
        let by = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(bx, by);
        rot += step;
        bx = cx + Math.cos(rot) * innerRadius;
        by = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(bx, by);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(cx, cy - half + 2);
      ctx.lineTo(cx + half - 2, cy + half - 2);
      ctx.lineTo(cx - half + 2, cy + half - 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'square':
    default:
      ctx.fillRect(cx - half, cy - half, size, size);
  }
};

// ─── Draw a single QR module (used only for data modules) ────
const drawModuleShape = (ctx, x, y, size, shape, color) => {
  ctx.fillStyle = color;
  const half = size / 2;
  const s = size;

  switch (shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(x + half, y + half, half, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rounded': {
      const r = size * 0.25;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + s - r, y);
      ctx.quadraticCurveTo(x + s, y, x + s, y + r);
      ctx.lineTo(x + s, y + s - r);
      ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
      ctx.lineTo(x + r, y + s);
      ctx.quadraticCurveTo(x, y + s, x, y + s - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x + half, y);
      ctx.lineTo(x + s, y + half);
      ctx.lineTo(x + half, y + s);
      ctx.lineTo(x, y + half);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star': {
      const spikes = 5;
      const outerRadius = half;
      const innerRadius = half * 0.45;
      let rot = Math.PI / 2 * 3;
      const step = Math.PI / spikes;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        let bx = x + half + Math.cos(rot) * outerRadius;
        let by = y + half + Math.sin(rot) * outerRadius;
        ctx.lineTo(bx, by);
        rot += step;
        bx = x + half + Math.cos(rot) * innerRadius;
        by = y + half + Math.sin(rot) * innerRadius;
        ctx.lineTo(bx, by);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x + half, y + 2);
      ctx.lineTo(x + s - 2, y + s - 2);
      ctx.lineTo(x + 2, y + s - 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'square':
    default:
      ctx.fillRect(x, y, size, size);
  }
};

// ─── Check if module belongs to any finder pattern (7×7 corners) ──
const getFinderPart = (row, col, size) => {
  const isTopLeft = row < 7 && col < 7;
  const isTopRight = row < 7 && col >= size - 7;
  const isBottomLeft = row >= size - 7 && col < 7;

  if (!isTopLeft && !isTopRight && !isBottomLeft) return null;

  const inInner = (r, c, cornerR, cornerC) =>
    r >= cornerR + 2 && r <= cornerR + 4 && c >= cornerC + 2 && c <= cornerC + 4;

  if (isTopLeft && inInner(row, col, 0, 0)) return 'inner';
  if (isTopRight && inInner(row, col, 0, size - 7)) return 'inner';
  if (isBottomLeft && inInner(row, col, size - 7, 0)) return 'inner';

  return 'outer';
};

// ─── Custom QR renderer ──────────────────────────────────────────
const renderStyledQR = async (text, options) => {
  const {
    lightColor,
    finderOuterColor,
    finderOuterShape,
    finderInnerColor,
    finderInnerShape,
    dataColor,
    dataShape,
  } = options;

  const qrData = await QRCode.create(text, { errorCorrectionLevel: 'M' });
  const modules = qrData.modules;
  const moduleCount = modules.size;

  const canvasSize = 200;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = canvasSize;
  offCanvas.height = canvasSize;
  const ctx = offCanvas.getContext('2d');

  // Background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const moduleSize = canvasSize / moduleCount;

  const drawFinder = (cornerRow, cornerCol) => {
    const x = cornerCol * moduleSize;
    const y = cornerRow * moduleSize;
    const outerSize = 7 * moduleSize;
    const holeSize = 5 * moduleSize;
    const dotSize = 3 * moduleSize;

    const cx = x + outerSize / 2;
    const cy = y + outerSize / 2;

    ctx.save();
    drawCenteredShape(ctx, cx, cy, outerSize, finderOuterShape, finderOuterColor);
    ctx.globalCompositeOperation = 'destination-out';
    drawCenteredShape(ctx, cx, cy, holeSize, finderOuterShape, '#000');
    ctx.restore();
    drawCenteredShape(ctx, cx, cy, dotSize, finderInnerShape, finderInnerColor);
  };

  drawFinder(0, 0);
  drawFinder(0, moduleCount - 7);
  drawFinder(moduleCount - 7, 0);

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.get(row, col)) {
        const part = getFinderPart(row, col, moduleCount);
        if (part === null) {
          const x = col * moduleSize;
          const y = row * moduleSize;
          drawModuleShape(ctx, x, y, moduleSize, dataShape, dataColor);
        }
      }
    }
  }

  return offCanvas.toDataURL();
};

// ─── Text overlay drawing with word wrap ──────────────────────
const drawTextOnCanvas = (ctx, text, style, x, y, width, height) => {
  const fontSize = style.fontSize || 16;
  const color = style.color || '#000000';
  const fontFamily = style.fontFamily || 'Arial';
  const fontWeight = style.bold ? 'bold ' : '';
  const fontStyle = style.italic ? 'italic ' : '';
  ctx.font = fontStyle + fontWeight + fontSize + 'px ' + fontFamily;
  ctx.fillStyle = color;
  ctx.textAlign = style.alignment || 'left';
  ctx.textBaseline = 'top';

  let displayText = text;
  const transform = style.textTransform || 'none';
  if (transform === 'uppercase') displayText = text.toUpperCase();
  else if (transform === 'lowercase') displayText = text.toLowerCase();
  else if (transform === 'capitalize') {
    displayText = text.replace(/\b\w/g, char => char.toUpperCase());
  }

  // ─── Word wrapping using canvas measureText ───────────────
  const words = displayText.split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = width;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If the word itself is longer than maxWidth, break it char by char
      if (ctx.measureText(word).width > maxWidth) {
        let brokenLine = '';
        for (const char of word) {
          const testCharLine = brokenLine + char;
          if (ctx.measureText(testCharLine).width <= maxWidth) {
            brokenLine = testCharLine;
          } else {
            if (brokenLine) lines.push(brokenLine);
            brokenLine = char;
          }
        }
        currentLine = brokenLine;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = (style.lineHeight || 1.4) * fontSize;
  lines.forEach((line, i) => {
    const ty = y + i * lineHeight;
    if (ty + lineHeight > y + height) return; // stop if overflowing vertically
    let tx = x;
    if (style.alignment === 'center') tx = x + width / 2;
    else if (style.alignment === 'right') tx = x + width;
    ctx.fillText(line, tx, ty);

    if (style.underline) {
      const metrics = ctx.measureText(line);
      let underlineStart = tx;
      if (style.alignment === 'center') underlineStart = tx - metrics.width / 2;
      else if (style.alignment === 'right') underlineStart = tx - metrics.width;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(underlineStart, ty + fontSize * 1.1);
      ctx.lineTo(underlineStart + metrics.width, ty + fontSize * 1.1);
      ctx.stroke();
    }
  });
};

// ─── Smart Guides Helpers ──────────────────────────────────
const SNAP_THRESHOLD = 5;
const GUIDE_COLOR_CENTER = '#2196F3';
const GUIDE_COLOR_EDGE = '#FF5722';

const calculateSnapAndGuides = (movingRect, imageSize, otherRects, activeType) => {
  const guides = [];
  let snappedX = movingRect.x;
  let snappedY = movingRect.y;

  const addGuide = (axis, position, type) => {
    if (!guides.some(g => g.axis === axis && Math.abs(g.position - position) < 0.5)) {
      guides.push({ axis, position, type });
    }
  };

  const imageLeft = 0, imageRight = imageSize.width, imageCenterX = imageSize.width / 2;
  const imageTop = 0, imageBottom = imageSize.height, imageCenterY = imageSize.height / 2;

  const otherRectsFiltered = otherRects.filter(r => r.id !== activeType);
  const allGuidesX = new Set();
  const allGuidesY = new Set();

  allGuidesX.add(imageLeft); allGuidesX.add(imageCenterX); allGuidesX.add(imageRight);
  allGuidesY.add(imageTop); allGuidesY.add(imageCenterY); allGuidesY.add(imageBottom);

  otherRectsFiltered.forEach(r => {
    allGuidesX.add(r.x);
    allGuidesX.add(r.x + r.width / 2);
    allGuidesX.add(r.x + r.width);
    allGuidesY.add(r.y);
    allGuidesY.add(r.y + r.height / 2);
    allGuidesY.add(r.y + r.height);
  });

  const movX = [movingRect.x, movingRect.x + movingRect.width / 2, movingRect.x + movingRect.width];
  const movY = [movingRect.y, movingRect.y + movingRect.height / 2, movingRect.y + movingRect.height];

  for (const guideX of allGuidesX) {
    for (let i = 0; i < movX.length; i++) {
      if (Math.abs(movX[i] - guideX) < SNAP_THRESHOLD) {
        const offset = guideX - movX[i];
        snappedX = movingRect.x + offset;
        const type = i === 1 ? 'center' : 'edge';
        addGuide('x', guideX, type);
        break;
      }
    }
    if (guides.some(g => g.axis === 'x')) break;
  }

  for (const guideY of allGuidesY) {
    for (let i = 0; i < movY.length; i++) {
      if (Math.abs(movY[i] - guideY) < SNAP_THRESHOLD) {
        const offset = guideY - movY[i];
        snappedY = movingRect.y + offset;
        const type = i === 1 ? 'center' : 'edge';
        addGuide('y', guideY, type);
        break;
      }
    }
    if (guides.some(g => g.axis === 'y')) break;
  }

  return { snappedX, snappedY, guides };
};

export default function DesignEditor({ onClose, onDesignCreated, initialDesign }) {
  // ─── State ─────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialDesign?.imageUrl || null);
  const [designName, setDesignName] = useState(initialDesign?.name || '');
  const [qrPosition, setQrPosition] = useState(initialDesign?.qrPosition || { x: 50, y: 50, width: 150, height: 150 });
  const [qrPadding, setQrPadding] = useState(initialDesign?.qrPadding || 15);

  const getInitialQrConfig = () => {
    const defaults = {
      lightColor: '#ffffff',
      finderOuterColor: '#000000',
      finderOuterShape: 'square',
      finderInnerColor: '#000000',
      finderInnerShape: 'square',
      dataColor: '#000000',
      dataShape: 'square',
    };
    if (!initialDesign?.qrConfig) return defaults;

    const old = initialDesign.qrConfig;
    return {
      lightColor: old.lightColor || old.colorLight || '#ffffff',
      finderOuterColor: old.finderOuterColor || old.colorDark || '#000000',
      finderOuterShape: old.finderOuterShape || old.finderShape || old.shape || 'square',
      finderInnerColor: old.finderInnerColor || old.colorDark || '#000000',
      finderInnerShape: old.finderInnerShape || old.finderShape || old.shape || 'square',
      dataColor: old.dataColor || old.colorDark || '#000000',
      dataShape: old.dataShape || old.shape || 'square',
    };
  };
  const [qrConfig, setQrConfig] = useState(getInitialQrConfig);

  const [textOverlays, setTextOverlays] = useState(initialDesign?.textOverlays || []);
  const [qrDataFields, setQrDataFields] = useState(initialDesign?.qrDataFields || []);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState(null);
  const [previewData] = useState({
    name: 'John Doe',
    phone: '+1234567890',
    event: 'Sample Event',
    date: '2026-01-01',
    time: '10:00 AM',
    venue: 'Sample Venue',
  });

  const [previewTextOverrides, setPreviewTextOverrides] = useState({});

  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [fullscreenPreviewUrl, setFullscreenPreviewUrl] = useState('');

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const designAreaRef = useRef(null);
  const prevImgDisplaySizeRef = useRef({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const initializedRef = useRef(false);
  const showToast = useToast();

  const [guides, setGuides] = useState([]);
  const [dragActive, setDragActive] = useState(null);

  // ─── Scale positions when the image's displayed size changes ──
  const scalePositionsOnImageResize = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const newWidth = rect.width;
    const newHeight = rect.height;
    const { width: oldWidth, height: oldHeight } = prevImgDisplaySizeRef.current;
    if (oldWidth === 0 || oldHeight === 0 || (newWidth === oldWidth && newHeight === oldHeight)) {
      prevImgDisplaySizeRef.current = { width: newWidth, height: newHeight };
      return;
    }
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    setQrPosition(prev => ({
      x: Math.round(prev.x * scaleX),
      y: Math.round(prev.y * scaleY),
      width: Math.round(prev.width * scaleX),
      height: Math.round(prev.height * scaleY),
    }));

    setTextOverlays(prev => prev.map(ov => ({
      ...ov,
      position: {
        x: Math.round(ov.position.x * scaleX),
        y: Math.round(ov.position.y * scaleY),
        width: Math.round(ov.position.width * scaleX),
        height: Math.round(ov.position.height * scaleY),
      },
    })));

    prevImgDisplaySizeRef.current = { width: newWidth, height: newHeight };
  }, []);

  // Observe design area container (fires when layout changes, fullscreen toggle, window resize)
  useEffect(() => {
    const container = designAreaRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scalePositionsOnImageResize();
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [scalePositionsOnImageResize]);

  // Also update when image loads or its src changes
  useEffect(() => {
    if (imagePreview) {
      const img = imgRef.current;
      if (img && img.complete) {
        scalePositionsOnImageResize();
      }
    }
  }, [imagePreview, scalePositionsOnImageResize]);

  // Convert natural to displayed
  const convertToDisplayed = useCallback(() => {
    const img = imgRef.current;
    if (!img || !initialDesign?.qrPosition || initializedRef.current) return;
    const rect = img.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    if (displayedWidth === 0 || displayedHeight === 0 || img.naturalWidth === 0) return;
    const scaleX = displayedWidth / img.naturalWidth;
    const scaleY = displayedHeight / img.naturalHeight;
    const pos = initialDesign.qrPosition;
    setQrPosition({
      x: Math.round(pos.x * scaleX),
      y: Math.round(pos.y * scaleY),
      width: Math.round(pos.width * scaleX),
      height: Math.round(pos.height * scaleY),
    });
    if (initialDesign.textOverlays) {
      const overlays = initialDesign.textOverlays.map(ov => ({
        ...ov,
        position: {
          x: Math.round(ov.position.x * scaleX),
          y: Math.round(ov.position.y * scaleY),
          width: Math.round(ov.position.width * scaleX),
          height: Math.round(ov.position.height * scaleY),
        },
      }));
      setTextOverlays(overlays);
    }
    initializedRef.current = true;
    prevImgDisplaySizeRef.current = { width: displayedWidth, height: displayedHeight };
  }, [initialDesign]);

  useEffect(() => {
    initializedRef.current = false;
    setDesignName(initialDesign?.name || '');
    setImagePreview(initialDesign?.imageUrl || null);
    setQrPadding(initialDesign?.qrPadding || 15);
    setQrConfig(getInitialQrConfig());
    setTextOverlays(initialDesign?.textOverlays || []);
    setQrDataFields(initialDesign?.qrDataFields || []);
    setPreviewTextOverrides({});
    if (initialDesign?.qrPosition) {
      setQrPosition(initialDesign.qrPosition);
    } else {
      setQrPosition({ x: 50, y: 50, width: 150, height: 150 });
    }
  }, [initialDesign]);

  const handleImageLoad = (e) => {
    const img = e.target;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    requestAnimationFrame(convertToDisplayed);
  };

  useEffect(() => {
    if (!imagePreview) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      requestAnimationFrame(convertToDisplayed);
    }
  }, [imagePreview, convertToDisplayed]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    initializedRef.current = false;
  };

  const handleQrConfigChange = (key, value) => {
    setQrConfig(prev => ({ ...prev, [key]: value }));
  };

  const addTextOverlay = () => {
    const newOverlay = {
      placeholder: '1',
      position: { x: 50, y: 50, width: 200, height: 40 },
      style: {
        fontSize: 16,
        color: '#000000',
        bold: false,
        italic: false,
        underline: false,
        alignment: 'left',
        fontFamily: 'Arial',
        textTransform: 'none',
        lineHeight: 1.4,
      },
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setSelectedOverlayIndex(textOverlays.length);
  };

  const updateOverlay = (index, field, value) => {
    const updated = [...textOverlays];
    if (field === 'position') {
      updated[index].position = { ...updated[index].position, ...value };
    } else if (field === 'style') {
      updated[index].style = { ...updated[index].style, ...value };
    } else {
      updated[index][field] = value;
    }
    setTextOverlays(updated);
  };

  const deleteOverlay = (index) => {
    if (textOverlays.length <= 1) return;
    setTextOverlays(textOverlays.filter((_, i) => i !== index));
    if (selectedOverlayIndex === index) setSelectedOverlayIndex(null);
    setPreviewTextOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[index];
      return newOverrides;
    });
  };

  const addQrDataField = () => {
    const input = document.getElementById('qrDataFieldInput');
    const val = input.value.trim();
    if (val && !qrDataFields.includes(val)) {
      setQrDataFields([...qrDataFields, val]);
      input.value = '';
    }
  };

  const removeQrDataField = (field) => {
    setQrDataFields(qrDataFields.filter(f => f !== field));
  };

  const handleQrDrag = (e, d) => {
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect) return;
    const movingRect = { x: d.x, y: d.y, width: qrPosition.width, height: qrPosition.height };
    const otherRects = textOverlays.map((ov, idx) => ({
      id: `text-${idx}`,
      x: ov.position.x,
      y: ov.position.y,
      width: ov.position.width,
      height: ov.position.height,
    }));
    const { snappedX, snappedY, guides: newGuides } = calculateSnapAndGuides(
      movingRect,
      { width: imgRect.width, height: imgRect.height },
      otherRects,
      'qr'
    );
    setQrPosition(prev => ({ ...prev, x: snappedX, y: snappedY }));
    setGuides(newGuides);
  };

  const handleTextDrag = (index, e, d) => {
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect) return;
    const movingRect = {
      x: d.x,
      y: d.y,
      width: textOverlays[index].position.width,
      height: textOverlays[index].position.height,
    };
    const otherRects = [
      { id: 'qr', x: qrPosition.x, y: qrPosition.y, width: qrPosition.width, height: qrPosition.height },
      ...textOverlays.filter((_, i) => i !== index).map((ov, i) => ({
        id: `text-${i}`,
        x: ov.position.x,
        y: ov.position.y,
        width: ov.position.width,
        height: ov.position.height,
      })),
    ];
    const { snappedX, snappedY, guides: newGuides } = calculateSnapAndGuides(
      movingRect,
      { width: imgRect.width, height: imgRect.height },
      otherRects,
      `text-${index}`
    );
    const updated = [...textOverlays];
    updated[index].position = { ...updated[index].position, x: snappedX, y: snappedY };
    setTextOverlays(updated);
    setGuides(newGuides);
  };

  const handleDragStart = (type) => {
    setDragActive(type);
  };

  const handleDragStop = () => {
    setDragActive(null);
    setGuides([]);
  };

  // ─── Live preview ────────────────────────────────────────
  useEffect(() => {
    const renderPreview = async () => {
      if (!showPreview || !imagePreview || !naturalSize.width) return;
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imagePreview;
      await new Promise(resolve => { img.onload = resolve; });
      canvas.width = naturalSize.width;
      canvas.height = naturalSize.height;
      ctx.drawImage(img, 0, 0, naturalSize.width, naturalSize.height);

      const imgElement = imgRef.current;
      if (!imgElement) return;
      const rect = imgElement.getBoundingClientRect();
      const dispW = rect.width;
      const dispH = rect.height;
      if (dispW === 0 || dispH === 0) return;
      const scaleX = dispW / naturalSize.width;
      const scaleY = dispH / naturalSize.height;

      const qrNatural = {
        x: qrPosition.x / scaleX,
        y: qrPosition.y / scaleY,
        width: qrPosition.width / scaleX,
        height: qrPosition.height / scaleY,
      };

      const qrDataUrl = await renderStyledQR('Sample QR Code', qrConfig);
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.src = qrDataUrl;
        await new Promise(resolve => { qrImg.onload = resolve; });

        ctx.fillStyle = qrConfig.lightColor;
        ctx.fillRect(qrNatural.x, qrNatural.y, qrNatural.width, qrNatural.height);

        const paddingFrac = qrPadding / 100;
        const innerW = Math.round(qrNatural.width * (1 - paddingFrac * 2));
        const innerH = Math.round(qrNatural.height * (1 - paddingFrac * 2));
        const offX = Math.round((qrNatural.width - innerW) / 2);
        const offY = Math.round((qrNatural.height - innerH) / 2);

        ctx.drawImage(qrImg, qrNatural.x + offX, qrNatural.y + offY, innerW, innerH);

        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(qrNatural.x, qrNatural.y, qrNatural.width, qrNatural.height);
      }

      for (const [idx, overlay] of textOverlays.entries()) {
        const pos = overlay.position;
        const naturalPos = {
          x: pos.x / scaleX,
          y: pos.y / scaleY,
          width: pos.width / scaleX,
          height: pos.height / scaleY,
        };

        let text = '';
        if (previewTextOverrides[idx] && previewTextOverrides[idx].trim() !== '') {
          text = previewTextOverrides[idx];
        } else {
          const placeholder = overlay.placeholder || '';
          if (placeholder === '1') text = previewData.name;
          else if (placeholder === '2') text = previewData.event;
          else if (placeholder === '3') text = previewData.date;
          else if (placeholder === '4') text = previewData.time;
          else if (placeholder === '5') text = previewData.venue;
          else if (placeholder === 'phone') text = previewData.phone;
          else text = `{{${placeholder}}}`;
        }

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(naturalPos.x, naturalPos.y, naturalPos.width, naturalPos.height);

        const style = overlay.style || {};
        drawTextOnCanvas(ctx, text, style, naturalPos.x, naturalPos.y, naturalPos.width, naturalPos.height);

        ctx.strokeStyle = '#00aa00';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(naturalPos.x, naturalPos.y, naturalPos.width, naturalPos.height);
      }
    };
    renderPreview();
  }, [
    showPreview,
    imagePreview,
    naturalSize,
    qrPosition,
    qrPadding,
    qrConfig,
    textOverlays,
    previewData,
    previewTextOverrides,
  ]);

  // ─── Save ─────────────────────────────────────────────
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

      const naturalQrPos = {
        x: Math.round(qrPosition.x * scaleX),
        y: Math.round(qrPosition.y * scaleY),
        width: Math.round(qrPosition.width * scaleX),
        height: Math.round(qrPosition.height * scaleY),
      };

      const naturalTextOverlays = textOverlays.map(ov => ({
        placeholder: ov.placeholder,
        position: {
          x: Math.round(ov.position.x * scaleX),
          y: Math.round(ov.position.y * scaleY),
          width: Math.round(ov.position.width * scaleX),
          height: Math.round(ov.position.height * scaleY),
        },
        style: ov.style,
      }));

      const data = {
        name: designName.trim(),
        qrPosition: naturalQrPos,
        qrPadding: qrPadding,
        qrConfig: qrConfig,
        textOverlays: naturalTextOverlays,
        qrDataFields: qrDataFields,
      };

      if (initialDesign) {
        const res = await updateDesign(initialDesign._id, data);
        showToast('success', 'Design updated', 'Your changes have been saved.');
        if (onDesignCreated) onDesignCreated(res.data?.data || res.data);
      } else {
        const formData = new FormData();
        formData.append('name', designName.trim());
        formData.append('image', imageFile);
        formData.append('qrPosition', JSON.stringify(naturalQrPos));
        formData.append('qrPadding', String(qrPadding));
        formData.append('qrConfig', JSON.stringify(qrConfig));
        formData.append('textOverlays', JSON.stringify(naturalTextOverlays));
        formData.append('qrDataFields', JSON.stringify(qrDataFields));
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

  const openFullscreenPreview = () => {
    const canvas = previewCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setFullscreenPreviewUrl(dataUrl);
      setFullscreenPreview(true);
    }
  };

  const closeFullscreenPreview = () => setFullscreenPreview(false);

  const shapeOptions = [
    { value: 'square', label: 'Square' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'circle', label: 'Circle' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'star', label: 'Star' },
    { value: 'triangle', label: 'Triangle' },
  ];

  const fontOptions = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Comic Sans MS', label: 'Comic Sans MS' },
  ];

  const textTransformOptions = [
    { value: 'none', label: 'None' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'lowercase', label: 'lowercase' },
    { value: 'capitalize', label: 'Capitalize' },
  ];

  return (
    <div className={`bg-white rounded-2xl p-6 max-w-7xl mx-auto h-screen flex flex-col ${isEditorFullscreen ? 'max-w-full p-2' : ''}`}>
      {/* Header with fullscreen toggle and controls button */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <h3 className="text-lg font-bold text-gray-800">
          {initialDesign ? 'Edit Design' : 'Create Design'}
        </h3>
        <button
          onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
          className="ml-auto text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1"
        >
          <i className={`fas ${isEditorFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
          {isEditorFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
        </button>
        {isEditorFullscreen && (
          <button
            onClick={() => setShowControlsOverlay(!showControlsOverlay)}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <i className="fas fa-sliders-h"></i>
            {showControlsOverlay ? 'Hide Controls' : 'Show Controls'}
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Controls overlay in fullscreen mode */}
        {isEditorFullscreen && showControlsOverlay && (
          <div className="absolute top-0 left-0 z-30 w-80 h-full overflow-y-auto bg-white border-r border-gray-200 shadow-lg p-4">
            <ControlsPanel
              designName={designName}
              setDesignName={setDesignName}
              imagePreview={imagePreview}
              handleFileChange={handleFileChange}
              initialDesign={initialDesign}
              qrConfig={qrConfig}
              handleQrConfigChange={handleQrConfigChange}
              shapeOptions={shapeOptions}
              qrPadding={qrPadding}
              setQrPadding={setQrPadding}
              qrDataFields={qrDataFields}
              addQrDataField={addQrDataField}
              removeQrDataField={removeQrDataField}
              textOverlays={textOverlays}
              addTextOverlay={addTextOverlay}
              deleteOverlay={deleteOverlay}
              selectedOverlayIndex={selectedOverlayIndex}
              setSelectedOverlayIndex={setSelectedOverlayIndex}
              updateOverlay={updateOverlay}
              previewTextOverrides={previewTextOverrides}
              setPreviewTextOverrides={setPreviewTextOverrides}
              fontOptions={fontOptions}
              textTransformOptions={textTransformOptions}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
            />
          </div>
        )}

        {/* Left Controls – visible only in normal mode */}
        {!isEditorFullscreen && (
          <div className="w-80 shrink-0 overflow-y-auto space-y-4 pr-2">
            <ControlsPanel
              designName={designName}
              setDesignName={setDesignName}
              imagePreview={imagePreview}
              handleFileChange={handleFileChange}
              initialDesign={initialDesign}
              qrConfig={qrConfig}
              handleQrConfigChange={handleQrConfigChange}
              shapeOptions={shapeOptions}
              qrPadding={qrPadding}
              setQrPadding={setQrPadding}
              qrDataFields={qrDataFields}
              addQrDataField={addQrDataField}
              removeQrDataField={removeQrDataField}
              textOverlays={textOverlays}
              addTextOverlay={addTextOverlay}
              deleteOverlay={deleteOverlay}
              selectedOverlayIndex={selectedOverlayIndex}
              setSelectedOverlayIndex={setSelectedOverlayIndex}
              updateOverlay={updateOverlay}
              previewTextOverrides={previewTextOverrides}
              setPreviewTextOverrides={setPreviewTextOverrides}
              fontOptions={fontOptions}
              textTransformOptions={textTransformOptions}
              showPreview={showPreview}
              setShowPreview={setShowPreview}
            />
          </div>
        )}

        {/* Right Column: Design Area + Preview */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
  <div
    ref={designAreaRef}
className="flex-1 border rounded-lg overflow-auto flex items-start justify-center bg-gray-50 relative min-h-0"
  >
    {imagePreview ? (
    <div className="relative inline-block">
        <img
          ref={imgRef}
          src={imagePreview}
          alt="template"
          className="max-h-full max-w-full object-contain block"
          style={{ maxHeight: '100%' }}
          onLoad={handleImageLoad}
        />
        {/* Smart Guides Overlay */}
        {guides.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            {guides.map((g, idx) => (
              <div
                key={idx}
                className="absolute"
                style={{
                  [g.axis === 'x' ? 'left' : 'top']: g.position + 'px',
                  width: g.axis === 'x' ? '1px' : '100%',
                  height: g.axis === 'y' ? '1px' : '100%',
                  backgroundColor: g.type === 'center' ? GUIDE_COLOR_CENTER : GUIDE_COLOR_EDGE,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}
        <Rnd
          size={{ width: qrPosition.width, height: qrPosition.height }}
          position={{ x: qrPosition.x, y: qrPosition.y }}
          onDragStart={() => handleDragStart('qr')}
          onDrag={(e, d) => handleQrDrag(e, d)}
          onDragStop={() => handleDragStop()}
          onResizeStop={(e, direction, ref, delta, pos) => {
            setQrPosition({
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
            QR
          </div>
        </Rnd>
        {textOverlays.map((ov, idx) => (
          <Rnd
            key={idx}
            size={{ width: ov.position.width, height: ov.position.height }}
            position={{ x: ov.position.x, y: ov.position.y }}
            onDragStart={() => handleDragStart(`text-${idx}`)}
            onDrag={(e, d) => handleTextDrag(idx, e, d)}
            onDragStop={() => handleDragStop()}
            onResizeStop={(e, direction, ref, delta, pos) => {
              const updated = [...textOverlays];
              updated[idx].position = {
                x: pos.x,
                y: pos.y,
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
              };
              setTextOverlays(updated);
            }}
            bounds="parent"
            style={{ zIndex: 5 }}
          >
            <div className="w-full h-full border-2 border-dashed border-green-500 bg-white/30 flex items-center justify-center text-[8px] text-green-600 select-none">
              T{idx+1}
            </div>
          </Rnd>
        ))}
      </div>
    ) : (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
        Upload an image to start designing
      </div>
    )}

    {/* ─── Floating Live Preview (bottom‑right inside design area) ─── */}
    {showPreview && !isEditorFullscreen && (
      <div
        className="absolute bottom-2 right-2 w-44 md:w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-40 cursor-zoom-in overflow-hidden"
        onClick={openFullscreenPreview}
      >
        <div className="p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-500">Live Preview</span>
            <i className="fas fa-expand text-xs text-gray-400 hover:text-gray-600"></i>
          </div>
          <div className="flex justify-center items-center bg-gray-50 rounded-md">
            <canvas
              ref={previewCanvasRef}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '200px',
                objectFit: 'contain',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      </div>
    )}
  </div>
</div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-3 border-t mt-4 shrink-0">
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

      {/* Fullscreen Preview Modal */}
      {fullscreenPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeFullscreenPreview}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeFullscreenPreview}
              className="absolute top-2 right-2 text-white bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-700 z-10"
            >
              <i className="fas fa-times"></i>
            </button>
            <img
              src={fullscreenPreviewUrl}
              alt="Fullscreen preview"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ControlsPanel sub‑component (extracted to avoid duplication) ──
function ControlsPanel({
  designName, setDesignName,
  imagePreview, handleFileChange, initialDesign,
  qrConfig, handleQrConfigChange, shapeOptions,
  qrPadding, setQrPadding,
  qrDataFields, addQrDataField, removeQrDataField,
  textOverlays, addTextOverlay, deleteOverlay,
  selectedOverlayIndex, setSelectedOverlayIndex,
  updateOverlay,
  previewTextOverrides, setPreviewTextOverrides,
  fontOptions, textTransformOptions,
  showPreview, setShowPreview,
}) {
  return (
    <>
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

      {/* QR Styling */}
      <div className="border-t pt-3 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">QR Code Styling</h4>
        <div>
          <label className="text-xs text-gray-500">Background Color</label>
          <input
            type="color"
            value={qrConfig.lightColor}
            onChange={(e) => handleQrConfigChange('lightColor', e.target.value)}
            className="w-full h-8 p-0 border border-gray-200 rounded"
          />
        </div>
        <div className="bg-gray-50 p-2 rounded border">
          <p className="text-xs font-semibold text-gray-600 mb-1">Finder Outer Frame</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Color</label>
              <input
                type="color"
                value={qrConfig.finderOuterColor}
                onChange={(e) => handleQrConfigChange('finderOuterColor', e.target.value)}
                className="w-full h-6 p-0 border border-gray-200 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Shape</label>
              <select
                value={qrConfig.finderOuterShape}
                onChange={(e) => handleQrConfigChange('finderOuterShape', e.target.value)}
                className="w-full border border-gray-200 rounded p-1 text-xs"
              >
                {shapeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded border">
          <p className="text-xs font-semibold text-gray-600 mb-1">Finder Inner Dot</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Color</label>
              <input
                type="color"
                value={qrConfig.finderInnerColor}
                onChange={(e) => handleQrConfigChange('finderInnerColor', e.target.value)}
                className="w-full h-6 p-0 border border-gray-200 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Shape</label>
              <select
                value={qrConfig.finderInnerShape}
                onChange={(e) => handleQrConfigChange('finderInnerShape', e.target.value)}
                className="w-full border border-gray-200 rounded p-1 text-xs"
              >
                {shapeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-2 rounded border">
          <p className="text-xs font-semibold text-gray-600 mb-1">Data Modules</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Color</label>
              <input
                type="color"
                value={qrConfig.dataColor}
                onChange={(e) => handleQrConfigChange('dataColor', e.target.value)}
                className="w-full h-6 p-0 border border-gray-200 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-500">Shape</label>
              <select
                value={qrConfig.dataShape}
                onChange={(e) => handleQrConfigChange('dataShape', e.target.value)}
                className="w-full border border-gray-200 rounded p-1 text-xs"
              >
                {shapeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* QR Padding */}
      <div>
        <label className="text-xs font-semibold text-gray-500 flex justify-between">
          QR Padding <span>{qrPadding}%</span>
        </label>
        <input
          type="range"
          min="0" max="50"
          value={qrPadding}
          onChange={(e) => setQrPadding(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* QR Data Content */}
      <div className="border-t pt-3">
        <h4 className="text-sm font-semibold text-gray-700">QR Data Content</h4>
        <p className="text-[10px] text-gray-500">
          Add placeholder numbers (e.g., <code className="bg-gray-200 px-1 rounded">1</code>, <code className="bg-gray-200 px-1 rounded">2</code>, <code className="bg-gray-200 px-1 rounded">name</code>) to include in the QR code data.
          These will be encrypted inside the QR code.
        </p>
        <div className="flex gap-1 mt-1">
          <input
            type="text"
            placeholder="e.g., 1"
            id="qrDataFieldInput"
            className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQrDataField(); } }}
          />
          <button
            onClick={addQrDataField}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {qrDataFields.map(f => (
            <span key={f} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
              {f}
              <button
                onClick={() => removeQrDataField(f)}
                className="text-blue-500 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          {qrDataFields.length === 0 && (
            <span className="text-xs text-gray-400">No custom fields added</span>
          )}
        </div>
      </div>

      {/* Text Overlays */}
      <div className="border-t pt-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold text-gray-700">Text Overlays</h4>
          <button
            onClick={addTextOverlay}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            + Add
          </button>
        </div>
        <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
          {textOverlays.map((ov, idx) => (
            <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Overlay {idx+1}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedOverlayIndex(idx === selectedOverlayIndex ? null : idx)}
                    className="text-xs text-blue-500"
                  >
                    {selectedOverlayIndex === idx ? 'Hide' : 'Edit'}
                  </button>
                  <button onClick={() => deleteOverlay(idx)} className="text-xs text-red-500">×</button>
                </div>
              </div>
              {selectedOverlayIndex === idx && (
                <div className="mt-2 space-y-1 text-xs">
                  <div>
                    <label className="text-gray-500">Placeholder</label>
                    <input
                      type="text"
                      value={ov.placeholder}
                      onChange={(e) => updateOverlay(idx, 'placeholder', e.target.value)}
                      className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs"
                      placeholder="e.g., 1, phone, name"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">Preview Text (optional)</label>
                    <input
                      type="text"
                      value={previewTextOverrides[idx] || ''}
                      onChange={(e) => setPreviewTextOverrides(prev => ({ ...prev, [idx]: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs"
                      placeholder="Type sample text to test wrapping"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="text-gray-500">Font</label>
                      <select
                        value={ov.style.fontFamily || 'Arial'}
                        onChange={(e) => updateOverlay(idx, 'style', { fontFamily: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1 text-xs"
                      >
                        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500">Size</label>
                      <input
                        type="number"
                        value={ov.style.fontSize}
                        onChange={(e) => updateOverlay(idx, 'style', { fontSize: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs"
                        min="8" max="120"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="text-gray-500">Color</label>
                      <input
                        type="color"
                        value={ov.style.color || '#000000'}
                        onChange={(e) => updateOverlay(idx, 'style', { color: e.target.value })}
                        className="w-full h-6 p-0 border border-gray-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">Alignment</label>
                      <select
                        value={ov.style.alignment || 'left'}
                        onChange={(e) => updateOverlay(idx, 'style', { alignment: e.target.value })}
                        className="w-full border border-gray-200 rounded p-1 text-xs"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ov.style.bold || false}
                        onChange={(e) => updateOverlay(idx, 'style', { bold: e.target.checked })}
                      /> Bold
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ov.style.italic || false}
                        onChange={(e) => updateOverlay(idx, 'style', { italic: e.target.checked })}
                      /> Italic
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={ov.style.underline || false}
                        onChange={(e) => updateOverlay(idx, 'style', { underline: e.target.checked })}
                      /> Underline
                    </label>
                  </div>
                  <div>
                    <label className="text-gray-500">Text Transform</label>
                    <select
                      value={ov.style.textTransform || 'none'}
                      onChange={(e) => updateOverlay(idx, 'style', { textTransform: e.target.value })}
                      className="w-full border border-gray-200 rounded p-1 text-xs"
                    >
                      {textTransformOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Drag the green box on the image to position/resize.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowPreview(!showPreview)}
        className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition w-full"
      >
        {showPreview ? 'Hide Preview' : 'Show Preview'}
      </button>
    </>
  );
}