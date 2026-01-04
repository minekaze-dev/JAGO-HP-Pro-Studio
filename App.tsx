import React, { useState, useRef, useEffect } from 'react';
import { 
  MOOD_OPTIONS, 
  RATIO_OPTIONS, 
  POSITION_OPTIONS, 
  TITLE_SIZE_OPTIONS, 
  MOCKUP_DEVICE_OPTIONS, 
  Icons, 
  FONT_OPTIONS, 
  STICKER_OPTIONS 
} from './constants';
import { PosterConfig, GeneratedBatch, CustomToolMode, CustomLayer } from './types';
import { generatePosterBatch, editImageTask } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'custom'>('generator');
  const [config, setConfig] = useState<PosterConfig>({
    title: "",
    tagline: "",
    marketing: "",
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

  // Custom Tools State
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customResult, setCustomResult] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<CustomToolMode>('remove-bg');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Interactive Layers State
  const [layers, setLayers] = useState<CustomLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Property States for new objects
  const [activeFont, setActiveFont] = useState('Orbitron');
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [activeSize, setActiveSize] = useState(150);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setConfig(prev => ({ ...prev, [name]: val }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleStartCustomEdit = (imageUrl: string) => {
    setCustomImage(imageUrl);
    setCustomResult(null);
    setLayers([]);
    setSelectedLayerId(null);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = imageUrl;
    setView('custom');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'text' | 'mockup' | 'custom' | 'custom-layer-logo') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'icon') setConfig(prev => ({ ...prev, logoIconBase64: base64 }));
        else if (type === 'text') setConfig(prev => ({ ...prev, logoTextBase64: base64 }));
        else if (type === 'mockup') setConfig(prev => ({ ...prev, mockupScreenshot: base64 }));
        else if (type === 'custom') {
          handleStartCustomEdit(base64);
        } else if (type === 'custom-layer-logo') {
          const newLayer: CustomLayer = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'logo',
            content: 'custom',
            imageData: base64,
            x: 500,
            y: 500,
            fontSize: 200,
            width: 200,
            height: 200,
            color: '#fff',
            opacity: 100
          };
          setLayers([...layers, newLayer]);
          setSelectedLayerId(newLayer.id);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (isRevision: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await generatePosterBatch(config, isRevision);
      setBatch({ results, timestamp: Date.now() });
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          document.getElementById('render-output-stage')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during batch generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const startCustomAction = async () => {
    if (!customImage) return;
    if (toolMode === 'add-text' || toolMode === 'add-sticker' || toolMode === 'add-shape' || toolMode === 'add-logo') {
      if (canvasRef.current) {
        setSelectedLayerId(null);
        setTimeout(() => {
          if (canvasRef.current) {
            setCustomResult(canvasRef.current.toDataURL('image/png'));
          }
        }, 50);
      }
      return;
    }
    setIsProcessing(true);
    try {
      let imageDataToSend = customImage;
      if (toolMode === 'ai-eraser' && canvasRef.current) {
        imageDataToSend = canvasRef.current.toDataURL('image/png');
      }
      const task = toolMode === 'ai-eraser' ? 'remove-text' : 'remove-bg';
      const res = await editImageTask(imageDataToSend, task as any);
      setCustomResult(res);
      setLayers([]);
      setSelectedLayerId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAndContinue = () => {
    if (!customResult) return;
    handleStartCustomEdit(customResult);
  };

  const renderCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !customImage || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageRef.current.width;
    canvas.height = imageRef.current.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);

    const scaleFactor = canvas.width / 1000;

    for (const layer of layers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;

      if (layer.type === 'text') {
        ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = layer.color;
        ctx.fillText(layer.content, layer.x, layer.y);
      } 
      else if (layer.type === 'sticker') {
        ctx.font = `${layer.fontSize * scaleFactor}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(layer.content, layer.x, layer.y);
      }
      else if (layer.type === 'shape') {
        ctx.fillStyle = layer.color;
        const w = (layer.width || layer.fontSize) * scaleFactor;
        const h = (layer.height || layer.fontSize) * scaleFactor;
        
        if (layer.content === 'rect') {
          ctx.fillRect(layer.x - w / 2, layer.y - h / 2, w, h);
        } else if (layer.content === 'circle') {
          ctx.beginPath();
          ctx.ellipse(layer.x, layer.y, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (layer.content === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(layer.x, layer.y - h / 2);
          ctx.lineTo(layer.x + w / 2, layer.y + h / 2);
          ctx.lineTo(layer.x - w / 2, layer.y + h / 2);
          ctx.closePath();
          ctx.fill();
        }
      }
      else if (layer.type === 'logo' && layer.imageData) {
        const w = (layer.width || layer.fontSize) * scaleFactor;
        const h = (layer.height || layer.fontSize) * scaleFactor;
        const logoImg = new Image();
        logoImg.src = layer.imageData;
        if (logoImg.complete) {
            ctx.drawImage(logoImg, layer.x - w / 2, layer.y - h / 2, w, h);
        } else {
            await new Promise(resolve => {
                logoImg.onload = () => {
                    ctx.drawImage(logoImg, layer.x - w / 2, layer.y - h / 2, w, h);
                    resolve(null);
                };
            });
        }
      }
      ctx.restore();

      if (layer.id === selectedLayerId && !customResult) {
        let sizeW = 0, sizeH = 0;
        if (layer.type === 'text') {
          const ctx = canvasRef.current.getContext('2d')!;
          ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
          sizeW = ctx.measureText(layer.content).width / 2 + 15 * scaleFactor;
          sizeH = layer.fontSize * scaleFactor * 0.6;
        } else if (layer.type === 'sticker') {
          sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = sizeW;
        } else {
          sizeW = ((layer.width || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = ((layer.height || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
        }
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4 * scaleFactor;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(layer.x - sizeW, layer.y - sizeH, sizeW * 2, sizeH * 2);
        ctx.setLineDash([]);
        const handleRadius = 25 * scaleFactor;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(layer.x + sizeW, layer.y - sizeH, handleRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${15 * scaleFactor}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('X', layer.x + sizeW, layer.y - sizeH);
      }
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [layers, selectedLayerId, customImage, customResult, view]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !customImage || customResult) return;
    const { x, y } = getCanvasCoords(e);
    const scaleFactor = canvasRef.current.width / 1000;

    if (selectedLayerId) {
      const layer = layers.find(l => l.id === selectedLayerId);
      if (layer) {
        let sizeW = 0, sizeH = 0;
        if (layer.type === 'text') {
          const ctx = canvasRef.current.getContext('2d')!;
          ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
          sizeW = ctx.measureText(layer.content).width / 2 + 15 * scaleFactor;
          sizeH = layer.fontSize * scaleFactor * 0.6;
        } else if (layer.type === 'sticker') {
          sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = sizeW;
        } else {
          sizeW = ((layer.width || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = ((layer.height || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
        }
        if (Math.sqrt((x - (layer.x + sizeW)) ** 2 + (y - (layer.y - sizeH)) ** 2) < 40 * scaleFactor) {
          setLayers(layers.filter(l => l.id !== selectedLayerId));
          setSelectedLayerId(null);
          return;
        }
      }
    }

    const clickedLayer = [...layers].reverse().find(layer => {
      let sizeW = 0, sizeH = 0;
      if (layer.type === 'text') {
          const ctx = canvasRef.current!.getContext('2d')!;
          ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
          sizeW = ctx.measureText(layer.content).width / 2 + 15 * scaleFactor;
          sizeH = layer.fontSize * scaleFactor * 0.6;
      } else if (layer.type === 'sticker') {
        sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
        sizeH = sizeW;
      } else {
        sizeW = ((layer.width || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
        sizeH = ((layer.height || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
      }
      return x > layer.x - sizeW && x < layer.x + sizeW && y > layer.y - sizeH && y < layer.y + sizeH;
    });

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id);
      setIsDraggingLayer(true);
      dragOffset.current = { x: x - clickedLayer.x, y: y - clickedLayer.y };
      return;
    }

    if (toolMode === 'add-text') {
      const newLayer: CustomLayer = { id: Math.random().toString(36).substr(2, 9), type: 'text', content: "TEXT", x, y, fontSize: activeSize, fontFamily: activeFont, color: activeColor, opacity: 100 };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    } else if (toolMode === 'add-sticker') {
      const newLayer: CustomLayer = { id: Math.random().toString(36).substr(2, 9), type: 'sticker', content: STICKER_OPTIONS[1].emoji, x, y, fontSize: activeSize, color: '#000', opacity: 100 };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    } else if (toolMode === 'add-shape') {
      const newLayer: CustomLayer = { id: Math.random().toString(36).substr(2, 9), type: 'shape', content: 'rect', x, y, fontSize: activeSize, width: activeSize, height: activeSize, color: activeColor, opacity: 100 };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    } else if (toolMode === 'add-logo') {
      logoInputRef.current?.click();
    } else {
      setSelectedLayerId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingLayer || !selectedLayerId || customResult) return;
    const { x, y } = getCanvasCoords(e);
    setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, x: x - dragOffset.current.x, y: y - dragOffset.current.y } : l));
  };

  const handleMouseUp = () => setIsDraggingLayer(false);

  const handleUpdateLayer = (updates: Partial<CustomLayer>) => {
    if (!selectedLayerId) return;
    setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l));
  };

  const downloadImage = (url: string, name?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'jagohp'}-${Date.now()}.png`;
    link.click();
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const ColorControl = ({ label, currentColor, onColorChange }: { label: string, currentColor: string, onColorChange: (color: string) => void }) => (
    <div className="space-y-2">
      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={currentColor} onChange={(e) => onColorChange(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent appearance-none" />
        <input type="text" value={currentColor.toUpperCase()} onChange={(e) => onColorChange(e.target.value)} className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none uppercase font-black" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-slate-200 overflow-hidden font-inter">
      <header className="flex-none py-4 px-6 sm:px-8 border-b border-white/5 flex items-center justify-between bg-black/80 z-50 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/CSG8wWS.jpg" alt="Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-lg shadow-lg border border-white/10" />
          <div className="flex flex-col">
            <span className="text-lg sm:text-2xl font-black tracking-widest text-white uppercase italic font-orbitron leading-none">JAGO-HP</span>
            <span className="text-[8px] sm:text-[9px] font-bold text-blue-500 tracking-[0.3em] uppercase mt-1">CONTENT STUDIO</span>
          </div>
        </div>
        <button 
          onClick={() => setView(view === 'generator' ? 'custom' : 'generator')} 
          className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl border transition-all text-[8px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap flex-nowrap ${view === 'custom' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
        >
          <Icons.Tool /> <span>{view === 'custom' ? 'EXIT' : 'EDITOR TOOLS'}</span>
        </button>
      </header>

      {view === 'generator' ? (
        <main className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 custom-scrollbar">
          {/* ART DIRECTION SIDEBAR */}
          <div className="lg:col-span-3 order-1 lg:order-1 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#080808] p-6 lg:p-8 space-y-8">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><Icons.Layout /> ART DIRECTION</h2>
            <div className="space-y-4">
              <input type="text" name="title" value={config.title} onChange={handleInputChange} placeholder="HEADLINE" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3.5 font-bold text-white uppercase" />
              <input type="text" name="tagline" value={config.tagline} onChange={handleInputChange} placeholder="TAGLINE" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-300" />
              <textarea name="marketing" value={config.marketing} onChange={handleInputChange} rows={2} placeholder="SOCIALS" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 resize-none" />
              
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Branding Assets</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer text-[8px] font-black ${config.logoIconBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5'}`}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} className="hidden" />
                      {config.logoIconBase64 ? 'ICON OK' : 'ICON'}
                    </label>
                    <label className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer text-[8px] font-black ${config.logoTextBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5'}`}>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'text')} className="hidden" />
                      {config.logoTextBase64 ? 'TEXT OK' : 'TEXT'}
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Logo Position</label>
                    <select value={config.logoPosition} onChange={(e) => handleSelectChange('logoPosition', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold uppercase">{POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Title Style</label>
                    <select value={config.titleSize} onChange={(e) => handleSelectChange('titleSize', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold uppercase">{TITLE_SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Canvas Ratio</label>
                  <select value={config.ratio} onChange={(e) => handleSelectChange('ratio', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-3 py-3 text-[10px] font-bold uppercase">{RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
                </div>
              </div>
            </div>
          </div>

          {/* VISUAL AESTHETIC & GENERATION BUTTON */}
          <div className="lg:col-span-3 order-2 lg:order-3 border-b lg:border-b-0 lg:border-l border-white/5 bg-[#080808] p-6 lg:p-8 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><Icons.Sparkles /> AESTHETIC</h2>
              
              <div>
                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Visual Mood</label>
                <select value={config.mood} onChange={(e) => handleSelectChange('mood', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[11px] font-black uppercase tracking-widest outline-none">{MOOD_OPTIONS.map(mood => <option key={mood.value} value={mood.value}>{mood.label}</option>)}</select>
              </div>

              <div className="space-y-3">
                <div onClick={() => setConfig({...config, noMockup: !config.noMockup})} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.noMockup} readOnly className="w-4 h-4 accent-blue-600" />
                  <span className="text-[9px] font-black uppercase text-slate-300">Text Only</span>
                </div>
                <div onClick={() => setConfig({...config, backgroundOnly: !config.backgroundOnly})} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
                  <input type="checkbox" checked={config.backgroundOnly} readOnly className="w-4 h-4 accent-blue-600" />
                  <span className="text-[9px] font-black uppercase text-slate-300">Background Plate</span>
                </div>
              </div>
              {!config.noMockup && !config.backgroundOnly && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-600 uppercase mb-2 tracking-widest">Mockup Device</label>
                    <select value={config.mockupType} onChange={(e) => handleSelectChange('mockupType', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase">{MOCKUP_DEVICE_OPTIONS.map(device => <option key={device.value} value={device.value}>{device.label}</option>)}</select>
                  </div>
                  <label className={`flex items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer ${config.mockupScreenshot ? 'border-blue-500/30' : 'bg-[#111] border-white/5'}`}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mockup')} className="hidden" />
                    {config.mockupScreenshot ? <img src={config.mockupScreenshot} className="w-full h-full object-cover opacity-50" /> : <Icons.Image />}
                  </label>
                </div>
              )}
            </div>
            <button onClick={() => handleGenerate(false)} disabled={isLoading} className="w-full bg-white text-black font-black py-6 rounded-2xl uppercase tracking-[0.4em] text-[12px] mt-6 shadow-2xl hover:bg-slate-200 transition-all">{isLoading ? 'RENDERING...' : 'Create Content'}</button>
          </div>

          {/* OUTPUT RESULTS AREA */}
          <div id="render-output-stage" className="lg:col-span-6 order-3 lg:order-2 bg-[#030303] overflow-y-auto custom-scrollbar p-6 lg:p-10 relative min-h-[500px]">
            {!batch && !isLoading && <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4"><Icons.Image /><p className="text-[12px] font-black uppercase tracking-[0.5em]">Awaiting Output</p></div>}
            {isLoading && <div className="h-full flex flex-col items-center justify-center gap-10"><Icons.Loader /><p className="text-[10px] font-black uppercase tracking-[0.8em] animate-pulse">Running Neural Engine...</p></div>}
            {batch && !isLoading && (
              <div className="space-y-8 pb-20 animate-in fade-in duration-700">
                <h2 className="text-lg font-black tracking-widest text-white uppercase italic border-b border-white/5 pb-4">RENDER RESULT</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {batch.results.map((result, idx) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden border border-white/5 bg-black cursor-zoom-in" onClick={() => setEnlargedImage(result.imageUrl)}>
                      <img src={result.imageUrl} className="w-full h-auto" alt={`Variant ${idx}`} />
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3">
                         <button onClick={(e) => { e.stopPropagation(); downloadImage(result.imageUrl, `poster-${idx+1}`); }} className="w-full bg-white text-black py-2 rounded-lg font-black text-[10px] uppercase">Save</button>
                         <button onClick={(e) => { e.stopPropagation(); handleStartCustomEdit(result.imageUrl); }} className="w-full bg-blue-600 text-white py-2 rounded-lg font-black text-[10px] uppercase">Editor Tools</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* EDITOR TOOLS VIEW */
        <main className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 custom-scrollbar bg-[#020202]">
          
          {/* 1. POSTER CANVAS AREA - ALWAYS TOP ON MOBILE */}
          <div className="lg:col-span-6 order-1 lg:order-2 bg-[#030303] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative">
            {!customImage ? (
              <div className="py-20 text-center opacity-20">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Stage Empty</p>
              </div>
            ) : (
              <div className="relative border border-white/10 shadow-2xl max-w-full">
                {customResult ? (
                   <img src={customResult} className="max-h-[75vh] w-auto block mx-auto" alt="Result" />
                ) : (
                   <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp} className="max-h-[75vh] max-w-full block mx-auto object-contain cursor-crosshair" />
                )}
                {isProcessing && (
                   <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                     <Icons.Loader />
                     <p className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-500">Processing AI...</p>
                   </div>
                )}
              </div>
            )}
          </div>

          {/* 2. EDITOR FUNCTION SELECTION - BELOW CANVAS ON MOBILE */}
          <div className="lg:col-span-3 order-2 lg:order-1 border-y lg:border-y-0 lg:border-r border-white/5 bg-[#080808] p-6 lg:p-8">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Icons.Tool /> EDITOR TOOLS</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 uppercase mb-3 tracking-widest">Select Function</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'remove-bg', label: 'BG Remover' },
                    { id: 'ai-eraser', label: 'Object Eraser' },
                    { id: 'add-text', label: 'Add Text' },
                    { id: 'add-sticker', label: 'Stickers' },
                    { id: 'add-shape', label: 'Shapes' },
                    { id: 'add-logo', label: 'Logo' }
                  ].map(item => (
                    <button key={item.id} onClick={() => { setToolMode(item.id as CustomToolMode); setSelectedLayerId(null); }} className={`p-4 rounded-xl border text-[10px] font-black uppercase text-left transition-all ${toolMode === item.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'custom-layer-logo')} />
              
              <div className="pt-6 border-t border-white/5">
                <label className="w-full block py-5 bg-[#111] border border-white/5 rounded-xl text-center text-[10px] font-black uppercase cursor-pointer hover:bg-white/10 transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'custom')} className="hidden" />
                  Upload Image
                </label>
              </div>
            </div>
          </div>

          {/* 3. PROPERTIES & ACTIONS - BOTTOM ON MOBILE */}
          <div className="lg:col-span-3 order-3 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#080808] p-6 lg:p-8 flex flex-col justify-between">
            <div className="space-y-8 pb-10">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><Icons.Palette /> PROPERTIES</h2>
              
              {selectedLayer ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {selectedLayer.type === 'text' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">Text Content</label>
                        <input type="text" value={selectedLayer.content} onChange={(e) => handleUpdateLayer({ content: e.target.value })} className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-4 text-sm text-white focus:border-blue-500 transition-colors outline-none" />
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mt-4">Font Family</label>
                        <select value={selectedLayer.fontFamily} onChange={(e) => handleUpdateLayer({ fontFamily: e.target.value })} className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-3 text-[10px] font-bold uppercase">{FONT_OPTIONS.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}</select>
                      </div>
                      <ColorControl label="Text Color" currentColor={selectedLayer.color} onColorChange={(color) => handleUpdateLayer({ color })} />
                    </div>
                  )}

                  {selectedLayer.type === 'sticker' && (
                    <div className="space-y-4">
                      <label className="text-[9px] font-bold text-slate-600 uppercase">Sticker Picker</label>
                      <div className="grid grid-cols-4 gap-2">
                        {STICKER_OPTIONS.map(s => (
                          <button key={s.id} onClick={() => handleUpdateLayer({ content: s.emoji })} className={`p-4 text-2xl rounded-lg border transition-all ${selectedLayer.content === s.emoji ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>{s.emoji}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLayer.type === 'shape' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-600 uppercase">Shape Type</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['rect', 'circle', 'triangle'].map(type => (
                            <button key={type} onClick={() => handleUpdateLayer({ content: type })} className={`p-3 rounded-lg border text-[8px] font-black uppercase transition-all ${selectedLayer.content === type ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}>{type}</button>
                          ))}
                        </div>
                      </div>
                      <ColorControl label="Fill Color" currentColor={selectedLayer.color} onColorChange={(color) => handleUpdateLayer({ color })} />
                    </div>
                  )}

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    {selectedLayer.type === 'text' || selectedLayer.type === 'sticker' ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><label className="text-[9px] font-bold text-slate-600 uppercase">Size</label><span className="text-[10px] font-black text-blue-500">{selectedLayer.fontSize}px</span></div>
                        <input type="range" min="10" max="800" value={selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ fontSize: parseInt(e.target.value) })} className="w-full h-1 bg-white/5 accent-blue-600 rounded-full appearance-none cursor-pointer" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center"><label className="text-[9px] font-bold text-slate-600 uppercase">Width</label><span className="text-[10px] font-black text-blue-500">{selectedLayer.width}px</span></div>
                          <input type="range" min="10" max="1200" value={selectedLayer.width} onChange={(e) => handleUpdateLayer({ width: parseInt(e.target.value) })} className="w-full h-1 bg-white/5 accent-blue-600 rounded-full appearance-none cursor-pointer" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center"><label className="text-[9px] font-bold text-slate-600 uppercase">Height</label><span className="text-[10px] font-black text-blue-500">{selectedLayer.height}px</span></div>
                          <input type="range" min="10" max="1200" value={selectedLayer.height} onChange={(e) => handleUpdateLayer({ height: parseInt(e.target.value) })} className="w-full h-1 bg-white/5 accent-blue-600 rounded-full appearance-none cursor-pointer" />
                        </div>
                      </>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><label className="text-[9px] font-bold text-slate-600 uppercase">Transparency</label><span className="text-[10px] font-black text-blue-500">{selectedLayer.opacity}%</span></div>
                      <input type="range" min="0" max="100" value={selectedLayer.opacity} onChange={(e) => handleUpdateLayer({ opacity: parseInt(e.target.value) })} className="w-full h-1 bg-white/5 accent-blue-600 rounded-full appearance-none cursor-pointer" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-6 border border-white/5 rounded-2xl bg-white/[0.02] text-center">
                  <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Select a layer on the canvas to refine its style.</p>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-4 pb-10 lg:pb-0">
              {customResult ? (
                <div className="space-y-3">
                  <button onClick={() => downloadImage(customResult, 'edited')} className="w-full bg-white text-black py-5 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-slate-200 transition-colors">Save To Storage</button>
                  <button onClick={handleApplyAndContinue} className="w-full bg-blue-600/10 border border-blue-500/30 text-blue-400 py-5 rounded-2xl font-black text-[11px] uppercase hover:bg-blue-600/20 transition-all">Merge & Continue</button>
                  <button onClick={() => setCustomResult(null)} className="w-full py-3 text-slate-500 font-black text-[10px] uppercase hover:text-slate-300">Discard Changes</button>
                </div>
              ) : (
                <button onClick={startCustomAction} disabled={!customImage} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 disabled:opacity-20 transition-all active:scale-95">
                   {toolMode.includes('add') ? 'COMMIT LAYER' : 'PROCESS AI TASK'}
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {enlargedImage && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-20" onClick={() => setEnlargedImage(null)}><img src={enlargedImage} className="max-w-full max-h-full rounded-xl border border-white/10 shadow-2xl cursor-zoom-out" alt="Enlarged" /></div>}

      <footer className="flex-none py-3 text-center bg-black border-t border-white/5">
        <span className="text-[8px] sm:text-[9px] font-black text-slate-800 uppercase tracking-[0.6em] italic">JAGO-HP PRODUCTION PIPELINE v2.6.1</span>
      </footer>
    </div>
  );
};

export default App;