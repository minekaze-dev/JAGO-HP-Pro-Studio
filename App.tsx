
import React, { useState, useRef, useEffect } from 'react';
import { 
  MOOD_OPTIONS, 
  RATIO_OPTIONS, 
  POSITION_OPTIONS, 
  TITLE_SIZE_OPTIONS, 
  MOCKUP_DEVICE_OPTIONS, 
  Icons, 
  FONT_OPTIONS, 
  STICKER_OPTIONS,
  SHAPE_OPTIONS 
} from './constants';
import { PosterConfig, GeneratedBatch, CustomToolMode, CustomLayer, CaptionToolsResult } from './types';
import { generatePosterBatch, editImageTask, generateMarketingCaptions } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'custom'>('generator');
  const [config, setConfig] = useState<PosterConfig>({
    title: "",
    tagline: "",
    marketing: "",
    manualPrompt: "",
    mood: 'modern',
    ratio: '9:16',
    logoPosition: 'top-center',
    titleSize: 'h2',
    mockupType: 'smartphone',
    mockupScreenshot: undefined,
    noMockup: false,
    backgroundOnly: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Caption Tools State
  const [showCaptionTools, setShowCaptionTools] = useState(false);
  const [ageRange, setAgeRange] = useState("18-35");
  const [websiteLink, setWebsiteLink] = useState("www.jagohp.site");
  const [platformTarget, setPlatformTarget] = useState("Instagram");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionResults, setCaptionResults] = useState<CaptionToolsResult | null>(null);

  // Custom Tools State
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<CustomToolMode>('remove-bg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [removeBgMode, setRemoveBgMode] = useState<'transparent' | 'color'>('transparent');
  const [removeBgColor, setRemoveBgColor] = useState('#000000');
  
  // Interactive Layers State
  const [layers, setLayers] = useState<CustomLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // AI Eraser Brush State
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Global Active Props
  const [activeFont, setActiveFont] = useState('Orbitron');
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [activeSize, setActiveSize] = useState(150);
  const [activeOpacity, setActiveOpacity] = useState(100);
  const [selectedSticker, setSelectedSticker] = useState(STICKER_OPTIONS[0].emoji);
  const [selectedShape, setSelectedShape] = useState(SHAPE_OPTIONS[0].id);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateCaptions = async () => {
    setIsGeneratingCaptions(true);
    setCaptionResults(null);
    try {
      const res = await generateMarketingCaptions(ageRange, websiteLink, platformTarget);
      setCaptionResults(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const handleStartCustomEdit = (imageUrl: string) => {
    setCustomImage(imageUrl);
    setLayers([]);
    setSelectedLayerId(null);
    clearMask();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = imageUrl;
    setView('custom');
  };

  const handleResetCanvas = () => {
    if (confirm("Reset canvas and clear all layers?")) {
      setLayers([]);
      setSelectedLayerId(null);
      setCustomImage(null);
      imageRef.current = null;
      clearMask();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const clearMask = () => {
    const mCtx = maskCanvasRef.current?.getContext('2d');
    if (mCtx && maskCanvasRef.current) {
      mCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };

  const handleUpdateLayer = (updates: Partial<CustomLayer>) => {
    if (!selectedLayerId) return;
    setLayers(prev => prev.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l));
  };

  const handleDeleteLayer = () => {
    if (!selectedLayerId) return;
    setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: any) => {
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scaleFactor = canvas.width / 1000;

    if (toolMode === 'ai-eraser') {
      setIsDrawingMask(true);
      drawOnMask(x, y);
      return;
    }

    const clickedLayer = [...layers].reverse().find(layer => {
      let w = 0, h = 0;
      if (layer.type === 'text') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily || 'Orbitron'}"`;
          w = ctx.measureText(layer.content).width;
          h = layer.fontSize * scaleFactor;
        }
      } else if (layer.type === 'sticker' || layer.type === 'logo') {
        w = (layer.fontSize * (layer.type === 'logo' ? 1.5 : 1)) * scaleFactor;
        h = layer.fontSize * scaleFactor;
      } else if (layer.type === 'shape') {
        w = (layer.width || 200) * scaleFactor;
        h = (layer.height || 200) * scaleFactor;
      }
      const pad = 15 * scaleFactor;
      return x >= layer.x - w/2 - pad && x <= layer.x + w/2 + pad && y >= layer.y - h/2 - pad && y <= layer.y + h/2 + pad;
    });

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id);
      setIsDraggingLayer(true);
      dragOffset.current = { x: x - clickedLayer.x, y: y - clickedLayer.y };
      setActiveColor(clickedLayer.color);
      if (clickedLayer.fontFamily) setActiveFont(clickedLayer.fontFamily);
      setActiveSize(clickedLayer.fontSize);
      setActiveOpacity(clickedLayer.opacity);
    } else {
      setSelectedLayerId(null);
      const id = Math.random().toString(36).substr(2, 9);
      if (toolMode === 'add-text') {
        setLayers([...layers, { id, type: 'text', content: 'BRAND MESSAGE', x, y, fontSize: activeSize, color: activeColor, fontFamily: activeFont, opacity: activeOpacity, bgActive: true, bgColor: '#000000', bgOpacity: 85 }]);
        setSelectedLayerId(id);
      } else if (toolMode === 'add-sticker') {
        setLayers([...layers, { id, type: 'sticker', content: selectedSticker, x, y, fontSize: activeSize, color: activeColor, opacity: activeOpacity }]);
        setSelectedLayerId(id);
      } else if (toolMode === 'add-shape') {
        setLayers([...layers, { id, type: 'shape', content: selectedShape, x, y, fontSize: activeSize, color: activeColor, opacity: activeOpacity, width: 250, height: 100 }]);
        setSelectedLayerId(id);
      } else if (toolMode === 'add-logo') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (ev: any) => {
          const file = ev.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
              setLayers([...layers, { id, type: 'logo', content: 'logo', imageData: re.target?.result as string, x, y, fontSize: 300, color: '#fff', opacity: 100 }]);
              setSelectedLayerId(id);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
    }
  };

  const handleMouseMove = (e: any) => {
    const { x, y } = getCoordinates(e);
    if (toolMode === 'ai-eraser' && isDrawingMask) {
      drawOnMask(x, y);
      return;
    }
    if (!isDraggingLayer || !selectedLayerId) return;
    handleUpdateLayer({ x: x - dragOffset.current.x, y: y - dragOffset.current.y });
  };

  const handleMouseUp = () => {
    setIsDraggingLayer(false);
    setIsDrawingMask(false);
  };

  const drawOnMask = (x: number, y: number) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    renderCanvas();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'text' | 'mockup' | 'custom') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'icon') setConfig(prev => ({ ...prev, logoIconBase64: base64 }));
        else if (type === 'text') setConfig(prev => ({ ...prev, logoTextBase64: base64 }));
        else if (type === 'mockup') setConfig(prev => ({ ...prev, mockupScreenshot: base64 }));
        else if (type === 'custom') handleStartCustomEdit(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await generatePosterBatch(config);
      setBatch({ results, timestamp: Date.now() });
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCustomAction = async () => {
    if (!customImage) return;
    
    // For AI processing tools (Eraser, Remove BG)
    if (toolMode === 'remove-bg' || toolMode === 'ai-eraser') {
      setIsProcessing(true);
      try {
        let maskData: string | undefined;
        if (toolMode === 'ai-eraser' && maskCanvasRef.current) {
          maskData = maskCanvasRef.current.toDataURL('image/png');
        }
        
        const res = await editImageTask(
          customImage, 
          toolMode === 'ai-eraser' ? 'remove-text' : 'remove-bg',
          toolMode === 'remove-bg' && removeBgMode === 'color' ? removeBgColor : undefined,
          maskData
        );
        
        // Continuous Edit: The result becomes the new base image
        setCustomImage(res);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          imageRef.current = img;
          clearMask();
          renderCanvas();
        };
        img.src = res;
      } catch (err: any) { 
        alert(err.message); 
      } finally { 
        setIsProcessing(false); 
      }
    }
  };

  const renderCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !customImage || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    if (maskCanvasRef.current.width !== imageRef.current.width) {
      maskCanvasRef.current.width = imageRef.current.width;
      maskCanvasRef.current.height = imageRef.current.height;
    }

    canvas.width = imageRef.current.width;
    canvas.height = imageRef.current.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);
    const scaleFactor = canvas.width / 1000;

    for (const layer of layers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      let w = 0, h = 0;
      if (layer.type === 'text') {
        ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily || 'Orbitron'}"`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(layer.content);
        w = metrics.width; h = layer.fontSize * scaleFactor;
        if (layer.bgActive) {
          ctx.save();
          ctx.fillStyle = layer.bgColor || '#000000';
          ctx.globalAlpha = (layer.bgOpacity || 85) / 100;
          const px = 25 * scaleFactor;
          const py = 15 * scaleFactor;
          ctx.fillRect(layer.x - w/2 - px, layer.y - h/2 - py, w + px*2, h + py*2);
          ctx.restore();
        }
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.content, layer.x, layer.y);
      } else if (layer.type === 'sticker') {
        ctx.font = `${layer.fontSize * scaleFactor}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(layer.content, layer.x, layer.y);
        w = layer.fontSize * scaleFactor; h = layer.fontSize * scaleFactor;
      } else if (layer.type === 'shape') {
        ctx.fillStyle = layer.color;
        w = (layer.width || 250) * scaleFactor;
        h = (layer.height || 100) * scaleFactor;
        if (layer.content === 'rect') ctx.fillRect(layer.x - w/2, layer.y - h/2, w, h);
        else if (layer.content === 'circle') { ctx.beginPath(); ctx.ellipse(layer.x, layer.y, w/2, h/2, 0, 0, Math.PI*2); ctx.fill(); }
        else if (layer.content === 'triangle') {
          ctx.beginPath(); ctx.moveTo(layer.x, layer.y - h/2); ctx.lineTo(layer.x + w/2, layer.y + h/2); ctx.lineTo(layer.x - w/2, layer.y + h/2); ctx.closePath(); ctx.fill();
        }
      } else if (layer.type === 'logo' && layer.imageData) {
        const logoImg = new Image(); logoImg.src = layer.imageData;
        const size = layer.fontSize * scaleFactor;
        const aspect = logoImg.width ? logoImg.width / logoImg.height : 1.5;
        w = size * aspect; h = size;
        ctx.drawImage(logoImg, layer.x - w/2, layer.y - h/2, w, h);
      }
      ctx.restore();
      if (layer.id === selectedLayerId) {
        ctx.save(); ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3 * scaleFactor; ctx.setLineDash([8, 4]);
        const pad = 12 * scaleFactor; ctx.strokeRect(layer.x - w/2 - pad, layer.y - h/2 - pad, w + pad*2, h + pad*2);
        ctx.restore();
      }
    }

    if (toolMode === 'ai-eraser' && maskCanvasRef.current) {
      ctx.drawImage(maskCanvasRef.current, 0, 0);
    }
  };

  useEffect(() => { renderCanvas(); }, [layers, selectedLayerId, customImage, view, toolMode, brushSize]);

  const downloadFinal = () => {
    if (!canvasRef.current) return;
    const oldId = selectedLayerId;
    setSelectedLayerId(null); 
    setTimeout(() => {
      if (canvasRef.current) {
        const data = canvasRef.current.toDataURL('image/png');
        downloadImage(data, 'jagohp-studio-final');
        setSelectedLayerId(oldId);
      }
    }, 100);
  };

  const downloadImage = (url: string, name?: string) => {
    const link = document.createElement('a'); link.href = url;
    link.download = `${name || 'jagohp'}-${Date.now()}.png`; link.click();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 1500);
    });
  };

  const ChevronIcon = () => (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  );

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex flex-col min-h-screen lg:h-screen bg-[#020202] text-slate-200 overflow-x-hidden font-inter">
      <header className="flex-none py-3 px-4 sm:py-4 sm:px-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-black/80 z-50 backdrop-blur-3xl gap-4 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto">
          <img src="https://imgur.com/bYSeLQD.jpg" alt="Logo" className="w-8 h-8 sm:w-14 sm:h-14 object-cover rounded-lg shadow-lg border border-white/10" />
          <div className="flex flex-col">
            <span className="text-base sm:text-2xl font-black tracking-widest text-white uppercase italic font-orbitron leading-none">JAGOHP</span>
            <span className="text-[7px] sm:text-[9px] font-bold text-[#ffcc00] tracking-[0.3em] uppercase mt-0.5 sm:mt-1">CONTENT STUDIO</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setShowCaptionTools(true)} className="flex-1 sm:flex-none px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl border border-[#ffcc00]/20 bg-[#ffcc00]/5 text-[#ffcc00] text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#ffcc00]/10 transition-all whitespace-nowrap">
            <Icons.Type /> <span className="hidden xs:inline">CAPTION TOOLS</span><span className="xs:hidden">CAPTIONS</span>
          </button>
          <button onClick={() => setView(view === 'generator' ? 'custom' : 'generator')} className={`flex-1 sm:flex-none px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl border transition-all text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${view === 'custom' ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
            <Icons.Tool /> <span>{view === 'custom' ? 'EXIT EDITOR' : 'EDITOR TOOLS'}</span>
          </button>
        </div>
      </header>

      {view === 'generator' ? (
        <main className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 custom-scrollbar">
          {/* LEFT PANEL: Messaging & Branding Assets */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#080808] p-5 lg:p-8 space-y-8 overflow-y-auto custom-scrollbar order-1">
            
            <div className="space-y-6">
               <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em]">MESSAGING</h2>
               <div className="space-y-4">
                 <input type="text" name="title" value={config.title} onChange={handleInputChange} placeholder="MAIN HEADLINE" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 font-bold text-white uppercase outline-none focus:border-[#ffcc00]/50" />
                 <input type="text" name="tagline" value={config.tagline} onChange={handleInputChange} placeholder="SUBHEADING" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:border-[#ffcc00]/50" />
                 <textarea name="marketing" value={config.marketing} onChange={handleInputChange} rows={3} placeholder="SOCIAL CONTEXT (IG: @username, promosi, dll)" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 resize-none outline-none focus:border-[#ffcc00]/50" />
               </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-6">
              <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em] flex items-center gap-2">BRANDING ASSETS</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col items-center justify-center h-16 border rounded-xl cursor-pointer text-[9px] font-black transition-all ${config.logoIconBase64 ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/5 hover:border-[#ffcc00]/40'}`}>
                   <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} className="hidden" />
                   <span>ICON LOGO</span>
                   {config.logoIconBase64 && <span className="mt-1 text-[8px] opacity-70">UPLOADED ✓</span>}
                </label>
                <label className={`flex flex-col items-center justify-center h-16 border rounded-xl cursor-pointer text-[9px] font-black transition-all ${config.logoTextBase64 ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/5 hover:border-[#ffcc00]/40'}`}>
                   <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'text')} className="hidden" />
                   <span>TEXT LOGO</span>
                   {config.logoTextBase64 && <span className="mt-1 text-[8px] opacity-70">UPLOADED ✓</span>}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LOGO POSITION</h3>
                  <div className="relative">
                    <select value={config.logoPosition} onChange={(e) => handleSelectChange('logoPosition', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase appearance-none outline-none focus:border-[#ffcc00]/50">
                      {POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <ChevronIcon />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">TITLE STYLE</h3>
                  <div className="relative">
                    <select value={config.titleSize} onChange={(e) => handleSelectChange('titleSize', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase appearance-none outline-none focus:border-[#ffcc00]/50">
                      {TITLE_SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <ChevronIcon />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CANVAS RATIO</h3>
                <div className="relative">
                  <select value={config.ratio} onChange={(e) => handleSelectChange('ratio', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[10px] font-black uppercase appearance-none outline-none focus:border-[#ffcc00]/50">
                    {RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronIcon />
                </div>
              </div>
            </div>
          </div>

          <div id="render-output-stage" className="lg:col-span-6 bg-[#030303] overflow-y-auto custom-scrollbar p-5 lg:p-10 relative min-h-[400px] order-3 lg:order-2 flex flex-col items-center">
            {!batch && !isLoading && (
              <div className="h-full w-full flex flex-col items-center justify-center opacity-20 gap-4">
                <Icons.Image />
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-center">AWAITING OUTPUT</p>
              </div>
            )}
            {isLoading && (
              <div className="h-full w-full flex flex-col items-center justify-center gap-8">
                <Icons.Loader />
                <p className="text-[10px] font-black uppercase tracking-[0.8em] animate-pulse text-[#ffcc00]">NEURAL ENGINE PROCESSING...</p>
              </div>
            )}
            {batch && !isLoading && (
              <div className="w-full space-y-10 animate-in fade-in duration-700">
                <h2 className="text-sm font-black tracking-[0.3em] text-white uppercase italic text-center border-b border-white/10 pb-4">GENERATED BATCH</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {batch.results.map((result, idx) => (
                    <div key={idx} className="group relative rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl">
                      <img src={result.imageUrl} className="w-full h-auto" alt={`Variant ${idx}`} />
                      <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 gap-4 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                         <button onClick={() => downloadImage(result.imageUrl, `jago-variant-${idx+1}`)} className="w-full max-w-[160px] bg-white text-black py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl">DOWNLOAD</button>
                         <button onClick={() => handleStartCustomEdit(result.imageUrl)} className="w-full max-w-[160px] bg-[#ffcc00] text-black py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl">REFINE TOOLS</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 lg:border-l border-white/5 bg-[#080808] p-5 lg:p-8 space-y-8 flex flex-col overflow-y-auto custom-scrollbar order-2 lg:order-3">
            <div className="space-y-6">
              <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em] flex items-center gap-2">STYLE & VIBE</h2>
              <div className="relative">
                <select value={config.mood} onChange={(e) => handleSelectChange('mood', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl pl-4 pr-10 py-4 text-[11px] font-black uppercase outline-none appearance-none focus:border-[#ffcc00]/50">
                  {MOOD_OPTIONS.map(mood => <option key={mood.value} value={mood.value}>{mood.label}</option>)}
                </select>
                <ChevronIcon />
              </div>

              {/* MANUAL PROMPT SECTION REPLACED TOGGLES */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em] flex items-center gap-2">MANUAL ENHANCEMENT</h2>
                <textarea 
                  name="manualPrompt" 
                  value={config.manualPrompt} 
                  onChange={handleInputChange} 
                  rows={4} 
                  placeholder="Add custom effects or floating elements (e.g. 'Blue neon particles', 'Cyberpunk floating cubes', 'Dramatic lens flare')..." 
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 resize-none outline-none focus:border-[#ffcc00]/50" 
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em]">MOCKUP TEMPLATE</h2>
                <div className="relative">
                  <select value={config.mockupType} onChange={(e) => handleSelectChange('mockupType', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase appearance-none focus:border-[#ffcc00]/50">
                    {MOCKUP_DEVICE_OPTIONS.map(device => <option key={device.value} value={device.value}>{device.label}</option>)}
                  </select>
                  <ChevronIcon />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SCREEN CONTENT</h3>
                  <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${config.mockupScreenshot ? 'border-[#ffcc00]/50 bg-[#ffcc00]/5' : 'bg-[#111] border-white/5 hover:border-white/10'}`}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mockup')} className="hidden" />
                      {config.mockupScreenshot ? (
                        <div className="relative h-full w-full p-2">
                          <img src={config.mockupScreenshot} className="h-full w-full object-cover rounded-lg opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/80 px-3 py-1 rounded text-[8px] font-black">REPLACE</span></div>
                        </div>
                      ) : (
                        <Icons.Image />
                      )}
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6">
               <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-[0.4em] text-[12px] shadow-2xl hover:bg-[#ffcc00]/10 transition-all flex items-center justify-center gap-3">
                 RUN ENGINE
               </button>
            </div>
          </div>
        </main>
      ) : (
        /* EDITOR VIEW */
        <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto custom-scrollbar bg-[#020202]">
          <div className="order-1 lg:order-2 lg:col-span-6 bg-[#030303] flex items-center justify-center p-4 sm:p-10 relative min-h-[45vh] lg:min-h-0 overflow-hidden">
            <div className="relative border border-white/10 shadow-2xl max-w-full">
              <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} className="max-h-[55vh] lg:max-h-[75vh] max-w-full block mx-auto cursor-crosshair rounded-sm" />
              {isProcessing && <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center gap-6 backdrop-blur-md"><Icons.Loader /><p className="text-[10px] font-black uppercase tracking-[0.8em] text-[#ffcc00] animate-pulse">AI IS PROCESSING...</p></div>}
            </div>
          </div>

          <div className="order-2 lg:order-1 lg:col-span-3 border-y lg:border-y-0 lg:border-r border-white/5 bg-[#080808] p-4 sm:p-6 lg:p-8 flex flex-col gap-4">
            <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em] flex items-center gap-2 px-2"><Icons.Tool /> TOOLS</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-1 gap-2 lg:gap-3">
              {[
                {id: 'remove-bg', icon: <Icons.Layout />, label: 'Remove BG'},
                {id: 'ai-eraser', icon: <Icons.Sparkles />, label: 'AI Eraser'},
                {id: 'add-text', icon: <Icons.Type />, label: 'Add Text'},
                {id: 'add-sticker', icon: <Icons.Smile />, label: 'Stickers'},
                {id: 'add-shape', icon: <Icons.Palette />, label: 'Shapes'},
                {id: 'add-logo', icon: <Icons.Image />, label: 'Image Layer'},
              ].map(tool => (
                <button key={tool.id} onClick={() => { setToolMode(tool.id as CustomToolMode); setSelectedLayerId(null); if (tool.id !== 'ai-eraser') clearMask(); }} 
                  className={`p-2 lg:p-4 rounded-xl border text-[8px] lg:text-[10px] font-black uppercase transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 ${toolMode === tool.id ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/5 text-slate-500 hover:text-white'}`}>
                  <div className="flex-none">{tool.icon}</div>
                  <span className="tracking-tight lg:tracking-widest text-center lg:text-left leading-none">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* PRE-SELECTION GRIDS FOR STICKERS & SHAPES */}
            {toolMode === 'add-sticker' && (
              <div className="pt-4 space-y-3 animate-in fade-in duration-300">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Sticker</h3>
                <div className="grid grid-cols-4 gap-2">
                  {STICKER_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setSelectedSticker(opt.emoji)} className={`p-2 text-lg rounded-lg border transition-all ${selectedSticker === opt.emoji ? 'bg-[#ffcc00] border-[#ffcc00]' : 'bg-[#111] border-white/5'}`}>{opt.emoji}</button>
                  ))}
                </div>
              </div>
            )}

            {toolMode === 'add-shape' && (
              <div className="pt-4 space-y-3 animate-in fade-in duration-300">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Shape</h3>
                <div className="grid grid-cols-3 gap-2">
                  {SHAPE_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => setSelectedShape(opt.id)} className={`py-3 text-[10px] font-black rounded-lg border transition-all flex items-center justify-center uppercase ${selectedShape === opt.id ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/5 text-slate-500'}`}>{opt.label.split('/')[0]}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="order-3 lg:col-span-3 lg:border-l border-white/5 bg-[#080808] p-5 lg:p-8 flex flex-col overflow-y-visible lg:overflow-y-auto">
            <div className="flex-1 space-y-6">
              <h2 className="text-[10px] font-black text-[#ffcc00] uppercase tracking-[0.3em] flex items-center gap-2"><Icons.Palette /> PROPERTIES</h2>
              
              {toolMode === 'ai-eraser' && (
                <div className="space-y-4 animate-in fade-in duration-300 bg-white/5 p-4 rounded-xl border border-white/5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[#ffcc00] flex justify-between">Brush Size <span>{brushSize}px</span></label>
                  <input type="range" min="10" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full h-1 bg-white/5 accent-red-500 rounded-full appearance-none cursor-pointer" />
                  <button onClick={clearMask} className="w-full py-2 bg-white/5 border border-white/10 text-[8px] font-black uppercase rounded-lg hover:bg-red-500/10 transition-all">Reset Brush</button>
                </div>
              )}

              {toolMode === 'remove-bg' && (
                <div className="space-y-4 animate-in fade-in duration-300 bg-white/5 p-4 rounded-xl border border-white/5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-[#ffcc00]">Background Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setRemoveBgMode('transparent')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${removeBgMode === 'transparent' ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/10'}`}>Transparent</button>
                    <button onClick={() => setRemoveBgMode('color')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${removeBgMode === 'color' ? 'bg-[#ffcc00] border-[#ffcc00] text-black' : 'bg-[#111] border-white/10'}`}>Solid Color</button>
                  </div>
                  {removeBgMode === 'color' && (
                    <div className="flex items-center gap-3 p-2 bg-black/40 rounded-lg">
                      <input type="color" value={removeBgColor} onChange={(e) => setRemoveBgColor(e.target.value)} className="w-8 h-8 bg-transparent cursor-pointer rounded" />
                      <span className="text-[10px] font-black text-white uppercase">{removeBgColor}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedLayer && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                  {selectedLayer.type === 'text' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-slate-500">TEXT CONTENT</label>
                        <input type="text" value={selectedLayer.content} onChange={(e) => handleUpdateLayer({ content: e.target.value })} className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#ffcc00]" />
                      </div>
                      
                      {/* HIGHLIGHT / BACKGROUND FEATURE */}
                      <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black uppercase text-[#ffcc00]">Text Highlight</label>
                          <button 
                            onClick={() => handleUpdateLayer({ bgActive: !selectedLayer.bgActive })}
                            className={`w-10 h-5 rounded-full relative transition-all ${selectedLayer.bgActive ? 'bg-[#ffcc00]' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${selectedLayer.bgActive ? 'left-6' : 'left-1'}`}></div>
                          </button>
                        </div>
                        {selectedLayer.bgActive && (
                          <div className="space-y-4 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">Color</span>
                              <input type="color" value={selectedLayer.bgColor || '#000000'} onChange={(e) => handleUpdateLayer({ bgColor: e.target.value })} className="w-8 h-8 bg-transparent cursor-pointer" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase"><span>Opacity</span><span>{selectedLayer.bgOpacity}%</span></div>
                              <input type="range" min="0" max="100" value={selectedLayer.bgOpacity || 85} onChange={(e) => handleUpdateLayer({ bgOpacity: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 accent-[#ffcc00] appearance-none rounded-full cursor-pointer" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-500">Base Scale</label>
                    <input type="range" min="10" max="800" value={selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ fontSize: parseInt(e.target.value) })} className="flex-1 h-1 bg-white/5 accent-[#ffcc00] rounded-full appearance-none cursor-pointer" />
                  </div>

                  {selectedLayer.type === 'shape' && (
                    <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase"><span>Width</span><span>{selectedLayer.width}px</span></div>
                        <input type="range" min="10" max="1000" value={selectedLayer.width || 250} onChange={(e) => handleUpdateLayer({ width: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 accent-[#ffcc00] appearance-none rounded-full cursor-pointer" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase"><span>Height</span><span>{selectedLayer.height}px</span></div>
                        <input type="range" min="10" max="1000" value={selectedLayer.height || 100} onChange={(e) => handleUpdateLayer({ height: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 accent-[#ffcc00] appearance-none rounded-full cursor-pointer" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-500">Transparency</label>
                    <input type="range" min="0" max="100" value={selectedLayer.opacity} onChange={(e) => handleUpdateLayer({ opacity: parseInt(e.target.value) })} className="flex-1 h-1 bg-white/5 accent-[#ffcc00] rounded-full appearance-none cursor-pointer" />
                  </div>

                  {(selectedLayer.type === 'text' || selectedLayer.type === 'shape') && (
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-slate-500">Layer Color</label>
                      <div className="flex items-center gap-3 p-2 bg-[#111] rounded-lg border border-white/5">
                        <input type="color" value={selectedLayer.color} onChange={(e) => handleUpdateLayer({ color: e.target.value })} className="w-8 h-8 bg-transparent border-none cursor-pointer" />
                        <span className="text-[10px] font-mono text-slate-300 uppercase">{selectedLayer.color}</span>
                      </div>
                    </div>
                  )}

                  <button onClick={handleDeleteLayer} className="w-full py-3 bg-red-600/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase rounded-xl hover:bg-red-600/20 transition-all">Delete Layer</button>
                </div>
              )}
            </div>

            {/* RESET CANVAS AND UPLOAD IMAGE ACTION BUTTONS */}
            <div className="space-y-3 pt-6 lg:pt-8 mt-6 border-t border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleResetCanvas} 
                  className="bg-red-600/10 border border-red-500/20 text-red-500 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-red-600/20 transition-all flex items-center justify-center gap-2"
                >
                  Reset Canvas
                </button>
                <label className="bg-[#ffcc00]/10 border border-[#ffcc00]/20 text-[#ffcc00] py-3 rounded-xl font-black text-[9px] uppercase hover:bg-[#ffcc00]/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'custom')} className="hidden" />
                  Upload Image
                </label>
              </div>

              {(toolMode === 'remove-bg' || toolMode === 'ai-eraser') && (
                <button onClick={startCustomAction} className="w-full bg-[#ffcc00] text-black py-4 rounded-xl font-black text-[11px] uppercase shadow-xl hover:bg-[#ffcc00] transition-all flex items-center justify-center gap-2">
                  <Icons.Sparkles /> APPLY AI ACTION
                </button>
              )}
              <button onClick={downloadFinal} className="w-full bg-white text-black py-4 rounded-xl font-black text-[11px] uppercase shadow-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                <Icons.Download /> DOWNLOAD DESIGN
              </button>
            </div>
          </div>
        </main>
      )}

      {showCaptionTools && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowCaptionTools(false)}></div>
          <div className="relative w-full max-w-4xl bg-[#080808] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-10 border-b border-white/5 flex items-center justify-between bg-black/40">
              <h3 className="text-sm sm:text-2xl font-black text-white uppercase tracking-widest italic font-orbitron">CAPTION ANALYTICS</h3>
              <button onClick={() => setShowCaptionTools(false)} className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/5">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-8">
              {/* Configuration Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#ffcc00] uppercase tracking-widest">Platform</label>
                  <div className="relative">
                    <select value={platformTarget} onChange={(e) => setPlatformTarget(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none appearance-none cursor-pointer focus:border-[#ffcc00]/50">
                      <option value="Instagram">Instagram</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                    <ChevronIcon />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#ffcc00] uppercase tracking-widest">Target Age</label>
                  <input type="text" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. 18-35" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#ffcc00]/50" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#ffcc00] uppercase tracking-widest">Website URL</label>
                  <input type="text" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} placeholder="www.jagohp.site" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#ffcc00]/50" />
                </div>
              </div>

              <button 
                onClick={handleGenerateCaptions} 
                disabled={isGeneratingCaptions} 
                className="w-full bg-white text-black py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isGeneratingCaptions ? (
                  <><Icons.Loader /> ANALYZING...</>
                ) : (
                  'GENERATE MARKETING COPY'
                )}
              </button>

              {/* Results Display */}
              {captionResults && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-[#ffcc00] uppercase tracking-[0.3em] border-l-4 border-[#ffcc00] pl-3">Short Captions & Hooks</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {captionResults.shortCaptions.map((cap, i) => (
                        <div key={i} className="group bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/10 transition-all">
                          <p className="text-sm text-slate-300 italic flex-1">"{cap}"</p>
                          <button onClick={() => copyToClipboard(cap, `short-${i}`)} className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copyStatus === `short-${i}` ? 'bg-green-600 text-white' : 'bg-[#ffcc00] text-black hover:bg-[#ffcc00]'}`}>
                            {copyStatus === `short-${i}` ? 'DONE ✓' : 'COPY'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-[#ffcc00] uppercase tracking-[0.3em] border-l-4 border-[#ffcc00] pl-3">Viral Hashtags</h4>
                    <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-wrap gap-2">
                      {captionResults.hashtags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-[#ffcc00]/20 text-[#ffcc00] rounded-lg text-[10px] font-black uppercase border border-[#ffcc00]/10">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="flex-none py-2 text-center bg-black border-t border-white/5">
        <span className="text-[7px] sm:text-[9px] font-black text-slate-800 uppercase tracking-[0.4em] italic">JAGO-HP STUDIO v3.3.0 | PRO ENGINE v2.5</span>
      </footer>
    </div>
  );
};

export default App;
