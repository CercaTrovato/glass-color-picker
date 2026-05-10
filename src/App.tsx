/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Trash2, Hexagon, Droplet, Check, Search, Copy, ZoomIn, ZoomOut } from 'lucide-react';

interface SavedColor {
  id: string;
  hex: string;
  rgb: number[];
  xPercent: number;
  yPercent: number;
}

interface PopoverState {
  colorId: string;
  baseHex: string;
  yPos: number;
  type: 'monochromatic' | 'matching';
  count: 3 | 5 | 7;
}

function hexToHsl(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function getRecommendedColors(baseHex: string, type: 'monochromatic' | 'matching', count: 3 | 5 | 7) {
   const [h, s, l] = hexToHsl(baseHex);
   const results: string[] = [];
   if (type === 'monochromatic') {
      const minL = 15;
      const maxL = 90;
      const step = count > 1 ? (maxL - minL) / (count - 1) : 0;
      for(let i=0; i<count; i++) {
         results.push(hslToHex(h, s, minL + i*step));
      }
   } else {
      const step = 360 / count;
      for(let i=0; i<count; i++) {
         results.push(hslToHex((h + i*step)%360, s, l));
      }
   }
   return results;
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}

const MAGNIFIER_SIZE = 160;
const MAX_SAVED_COLORS = 50;

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [canvasCtx, setCanvasCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const [savedColors, setSavedColors] = useState<SavedColor[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [hoverHex, setHoverHex] = useState<string | null>(null);
  const [hoverRgb, setHoverRgb] = useState<number[] | null>(null);

  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isMagnifierEnabled, setIsMagnifierEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(10);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        setZoomLevel(z => Math.min(z + 2, 40));
      } else if (e.key === 's' || e.key === 'S') {
        setZoomLevel(z => Math.max(z - 2, 2));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize canvas when image changes
  useEffect(() => {
    if (!imageSrc) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.crossOrigin = 'anonymous'; // prevent CORS canvas tainting if possible, though local objects are fine
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      setCanvasCtx(ctx);
      setNaturalSize({ w: img.width, h: img.height });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageSrc(URL.createObjectURL(file));
      // Reset state
      setSavedColors([]);
      setMousePos(null);
      setHoverHex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageSrc(URL.createObjectURL(file));
      setSavedColors([]);
      setMousePos(null);
      setHoverHex(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasCtx || !imgRef.current || !naturalSize) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setIsHovering(false);
      return;
    }

    setIsHovering(true);
    const xPercent = x / rect.width;
    const yPercent = y / rect.height;

    const pixelX = Math.floor(xPercent * naturalSize.w);
    const pixelY = Math.floor(yPercent * naturalSize.h);

    // Make sure we clamp coordinates in case of boundary issues
    const safeX = Math.max(0, Math.min(pixelX, naturalSize.w - 1));
    const safeY = Math.max(0, Math.min(pixelY, naturalSize.h - 1));

    try {
      const pixelData = canvasCtx.getImageData(safeX, safeY, 1, 1).data;
      const r = pixelData[0];
      const g = pixelData[1];
      const b = pixelData[2];

      setHoverHex(rgbToHex(r, g, b));
      setHoverRgb([r, g, b]);
      setMousePos({ xPercent, yPercent });
    } catch (err) {
      console.warn("Could not read pixel data");
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleImageClick = () => {
    setPopoverState(null);
    if (!isHovering || !mousePos || !hoverHex || !hoverRgb) return;
    if (savedColors.length >= MAX_SAVED_COLORS) return;

    // Check if duplicate position and color just to be safe
    if (savedColors.some((c) => c.hex === hoverHex && c.xPercent === mousePos.xPercent && c.yPercent === mousePos.yPercent)) {
      return;
    }

    const newColor: SavedColor = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      hex: hoverHex,
      rgb: hoverRgb,
      xPercent: mousePos.xPercent,
      yPercent: mousePos.yPercent,
    };

    setSavedColors((prev) => [newColor, ...prev]);
  };

  const deleteColor = (id: string) => {
    setSavedColors((prev) => prev.filter((c) => c.id !== id));
    if (activeSavedId === id) setActiveSavedId(null);
  };

  // Magnifier Rendering Logic
  const activeColor = savedColors.find((c) => c.id === activeSavedId);
  const isRecalling = !!activeColor;
  const showMagnifier = isRecalling || (isHovering && !activeSavedId && isMagnifierEnabled);

  const currentXPercent = isRecalling ? activeColor.xPercent : mousePos?.xPercent || 0;
  const currentYPercent = isRecalling ? activeColor.yPercent : mousePos?.yPercent || 0;
  const currentHex = isRecalling ? activeColor.hex : hoverHex || '#000000';

  const imgRect = imgRef.current?.getBoundingClientRect();
  const displayX = imgRect ? currentXPercent * imgRect.width : 0;
  const displayY = imgRect ? currentYPercent * imgRect.height : 0;
  const INNER_PADDING = 8; // inset-1 is 4px * 2 = 8px total padding usually, actually inset-1 means top 4, bottom 4, so 8px
  const INNER_SIZE = MAGNIFIER_SIZE - INNER_PADDING;

  return (
    <div
      className="flex w-full h-screen font-sans relative overflow-hidden bg-[#f2f2f7]"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {/* Ambient Animated Blobs */}
      <div className="blob-1" />
      <div className="blob-2" />
      <div className="blob-3" />

      {/* Sidebar */}
      <div 
        className="w-[300px] m-4 md:m-6 rounded-[32px] flex flex-col z-20 shrink-0 liquid-glass shadow-2xl shadow-black/5"
      >
        <div 
          className="p-6 border-b border-black/5 bg-white/20"
        >
          <h1 className="text-[18px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Palettes
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {savedColors.length} of {MAX_SAVED_COLORS} colors saved
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <AnimatePresence mode="popLayout">
            {savedColors.map((color) => {
              const isPopoverActive = popoverState?.colorId === color.id;
              const isActive = activeSavedId === color.id || isPopoverActive;
              return (
              <motion.div
                key={color.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                whileHover={{ scale: 1.02 }}
                onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   let y = rect.top + rect.height / 2;
                   y = Math.max(160, Math.min(window.innerHeight - 160, y));
                   setPopoverState(prev => prev?.colorId === color.id ? null : {
                       colorId: color.id,
                       baseHex: color.hex,
                       type: prev?.type || 'monochromatic',
                       count: prev?.count || 5,
                       yPos: y
                   });
                }}
                className={`flex items-center p-3 mb-2 rounded-[20px] transition-all cursor-pointer group relative z-10 ${isPopoverActive ? 'scale-[1.02]' : ''}`}
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.6)'}`,
                  boxShadow: isActive ? '0 8px 24px -8px rgba(0,122,255,0.4)' : '0 4px 15px -5px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={() => setActiveSavedId(color.id)}
                onMouseLeave={() => setActiveSavedId(null)}
              >
                <div
                  className="w-10 h-10 rounded-lg mr-3 shrink-0"
                  style={{
                    backgroundColor: color.hex,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="text-[14px] font-semibold"
                      style={{ fontFamily: "'Courier New', Courier, monospace", color: 'var(--text-primary)' }}
                    >
                      {color.hex}
                    </div>
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    RGB({color.rgb.join(', ')})
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(color.hex);
                      setCopiedHex(color.hex);
                      setTimeout(() => setCopiedHex(null), 1500);
                    }}
                    className="w-6 h-6 flex items-center justify-center transition-opacity"
                    title="Copy Hex"
                    style={{ opacity: 0.3, color: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
                  >
                    {copiedHex === color.hex ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteColor(color.id);
                    }}
                    className="w-6 h-6 flex items-center justify-center transition-opacity"
                    title="Delete Color"
                    style={{ opacity: 0.3, color: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>

          {savedColors.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.05)' }}>
                <Hexagon className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No colors saved</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Click on the image to pick colors.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended Colors Popover */}
      <AnimatePresence>
        {popoverState && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setPopoverState(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -20, y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, scale: 0.9, x: -10, y: '-50%' }}
              transition={{ type: 'spring', damping: 18, stiffness: 200 }}
              className="fixed z-40 rounded-[32px] p-5 shadow-[0_32px_64px_rgba(0,0,0,0.15)] liquid-glass"
              style={{
                left: 335,
                top: popoverState.yPos,
                width: 340,
              }}
            >
              {/* Pointing Triangle */}
              <div 
                 className="absolute top-1/2 -left-[11px] -translate-y-1/2 w-0 h-0"
                 style={{
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    borderRight: '12px solid rgba(255, 255, 255, 0.8)',
                    filter: 'drop-shadow(-2px 0px 2px rgba(0,0,0,0.05))'
                 }}
              ></div>

              <div className="flex flex-col gap-5 relative z-10">
                {/* Header Title */}
                <div className="text-center font-semibold text-[13px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Color Recommendations
                </div>

                {/* Segmented Control 1: Type */}
                <div className="flex rounded-full p-1 relative" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  {['monochromatic', 'matching'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPopoverState(s => s ? { ...s, type: t as any } : null)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-full relative z-10 transition-colors ${popoverState.type === t ? 'text-black' : 'text-slate-500 hover:text-black'}`}
                    >
                      {popoverState.type === t && (
                        <motion.div layoutId="typeHighlight" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" transition={{ type: 'spring', bounce: 0.3 }} />
                      )}
                      {t === 'monochromatic' ? 'Series' : 'Match'}
                    </button>
                  ))}
                </div>

                {/* Segmented Control 2: Count */}
                <div className="flex rounded-full p-1 relative w-3/4 mx-auto" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  {[3, 5, 7].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPopoverState(s => s ? { ...s, count: c as any } : null)}
                      className={`flex-1 py-1 text-xs font-bold rounded-full relative z-10 transition-colors ${popoverState.count === c ? 'text-black' : 'text-slate-500 hover:text-black'}`}
                    >
                      {popoverState.count === c && (
                        <motion.div layoutId="countHighlight" className="absolute inset-0 bg-white rounded-full shadow-sm -z-10" transition={{ type: 'spring', bounce: 0.3 }} />
                      )}
                      {c} Colors
                    </button>
                  ))}
                </div>

                {/* Colors Grid Output */}
                <div className="flex gap-2.5 justify-center flex-wrap pt-2">
                  <AnimatePresence mode="popLayout">
                    {getRecommendedColors(popoverState.baseHex, popoverState.type, popoverState.count).map((color, i) => (
                      <motion.div
                        key={color + i}
                        initial={{ opacity: 0, y: 15, scale: 0.6 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ delay: i * 0.05, type: 'spring', damping: 15, stiffness: 300 }}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          setCopiedHex(color);
                          setTimeout(() => setCopiedHex(null), 1500);
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-full relative overflow-hidden transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                          style={{ background: color, boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)' }}
                        >
                          {/* Inner reflection */}
                          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
                          
                          <AnimatePresence>
                            {copiedHex === color && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm text-white"
                              >
                                <Check className="w-4 h-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <span className="text-[10px] font-mono font-medium text-slate-500 group-hover:text-black transition-colors" style={{ letterSpacing: '-0.02em' }}>
                          {color}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div 
        className="flex-1 relative flex flex-col bg-transparent"
      >
        <header
          className="h-[64px] flex items-center px-6 gap-4 z-20 shrink-0 rounded-[28px] mx-6 mt-6 liquid-glass shadow-xl shadow-black/5"
        >
          <motion.label
            whileHover={{ opacity: 0.9 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer border-none"
            style={{ background: 'var(--accent-blue)', color: 'white' }}
          >
            Upload Image
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </motion.label>
          <button
            onClick={() => {
              setImageSrc(null);
              setSavedColors([]);
              setPopoverState(null);
            }}
            className="px-4 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-colors border-none"
            style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-primary)' }}
          >
            Clear All
          </button>
          
          <div className="flex bg-black/5 rounded-full p-1 mx-2">
             <button
               onClick={() => setIsMagnifierEnabled(!isMagnifierEnabled)}
               className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all text-[13px] font-medium ${isMagnifierEnabled ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] text-black' : 'text-slate-500 hover:text-black'}`}
             >
               <Search size={15} /> 
               Magnifier
             </button>
          </div>

          <div className="flex items-center gap-4 ml-auto">
             {hoverHex && imageSrc && (
                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-white/50 backdrop-blur-md shadow-sm">
                   <div className="w-4 h-4 rounded-full shadow-inner border border-black/10" style={{background: hoverHex}} />
                   <span className="font-mono text-sm font-semibold tracking-tight text-slate-700">{hoverHex}</span>
                   <button 
                     onClick={() => { 
                       navigator.clipboard.writeText(hoverHex);
                       setCopiedHex('header_' + hoverHex);
                       setTimeout(() => setCopiedHex(null), 1500);
                     }} 
                     className="p-1 hover:bg-black/5 rounded-md transition-colors text-slate-600"
                     title="Copy current color"
                   >
                     {copiedHex === 'header_' + hoverHex ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                   </button>
                </div>
             )}
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
               Press <strong>Click</strong> to pick color
             </div>
          </div>
        </header>

        <div 
          className="flex-1 relative overflow-hidden flex items-center justify-center m-6 mt-0 rounded-[32px] liquid-glass shadow-inner"
          style={{ background: 'rgba(0,0,0,0.02)' }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center">
              <h2 className="text-2xl font-bold text-white shadow-sm">
                Drop image here
              </h2>
            </div>
          )}

          {!imageSrc ? (
            <div className="text-white/50 text-center flex flex-col items-center">
               <UploadCloud className="w-12 h-12 mb-4 opacity-50" />
               <p className="text-lg">Drop your image here to start</p>
            </div>
          ) : (
            <div 
              className={`relative flex items-center justify-center w-full h-full z-10 ${showMagnifier ? 'cursor-none' : 'cursor-crosshair'}`}
              onWheel={(e) => {
                if (!isMagnifierEnabled) return;
                if (e.deltaY < 0) setZoomLevel(z => Math.min(z + 1, 40));
                else setZoomLevel(z => Math.max(z - 1, 2));
              }}
            >
              {/* The actual image */}
              <img
                ref={imgRef}
                src={imageSrc}
                className="pointer-events-none block object-contain"
                style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '4px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                alt="Workspace"
              />

              {/* Event Overlay for smooth tracking */}
              <div
                className="absolute inset-0 z-20"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleImageClick}
              >
                <AnimatePresence>
                  {showMagnifier && imgRect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      className="absolute pointer-events-none z-[100]"
                      style={{
                        width: MAGNIFIER_SIZE,
                        height: MAGNIFIER_SIZE,
                        left: displayX,
                        top: displayY,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                         className="w-full h-full rounded-full overflow-hidden relative liquid-glass border-[4px] border-white/60"
                         style={{
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 25px 50px -12px rgba(0,0,0,0.5)',
                         }}
                      >
                         {/* Inner magnified view */}
                         <div
                          className="absolute inset-[0px] rounded-full"
                          style={{
                            backgroundImage: `url(${imageSrc})`,
                            backgroundSize: `${imgRect.width * zoomLevel}px ${imgRect.height * zoomLevel}px`,
                            backgroundPosition: `${-(displayX * zoomLevel - MAGNIFIER_SIZE / 2)}px ${-(displayY * zoomLevel - MAGNIFIER_SIZE / 2)}px`,
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated', // Keep it sharp to clearly see pixels
                          }}
                         />
                         
                         {/* Precise Apple Reticle perfectly matching the pixel size */}
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                              style={{ width: `${zoomLevel}px`, height: `${zoomLevel}px`, border: '1px solid rgba(0,0,0,0.8)', boxShadow: '0 0 0 1px rgba(255,255,255,0.8)' }}>
                         </div>
                      </div>

                      {/* Hover Hex Tooltip */}
                      {isRecalling && (
                        <div
                          className="absolute flex items-center gap-2"
                          style={{
                            top: '-10px',
                            right: '-80px',
                            background: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            color: '#1d1d1f'
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              background: currentHex
                            }}
                          />
                          <div style={{ fontSize: '11px', fontWeight: 700 }}>
                            {currentHex}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
