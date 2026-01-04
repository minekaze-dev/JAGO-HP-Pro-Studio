
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
  const [brushSize, setBrushSize] = useState(30);
  const [activeFont, setActiveFont] = useState('Orbitron');
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [activeSize, setActiveSize] = useState(80);
  const [activeSticker, setActiveSticker] = useState(STICKER_OPTIONS[0]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
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
            x: 500, // Center initial position
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
        
        const metrics = ctx.measureText(layer.content);
        const textWidth = metrics.width;
        const textHeight = layer.fontSize * scaleFactor;

        if (layer.bgActive) {
          ctx.save();
          ctx.globalAlpha = (layer.bgOpacity || 80) / 100;
          ctx.fillStyle = layer.bgColor || '#000000';
          const paddingX = 20 * scaleFactor;
          const paddingY = 10 * scaleFactor;
          ctx.fillRect(
            layer.x - textWidth / 2 - paddingX, 
            layer.y - textHeight / 2 - paddingY, 
            textWidth + paddingX * 2, 
            textHeight + paddingY * 2
          );
          ctx.restore();
        }

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
        } else {
          ctx.beginPath();
          ctx.ellipse(layer.x, layer.y, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      else if (layer.type === 'logo' && layer.imageData) {
        const w = (layer.width || layer.fontSize) * scaleFactor;
        const h = (layer.height || layer.fontSize) * scaleFactor;
        const logoImg = new Image();
        logoImg.src = layer.imageData;
        // Since this is async, but we want immediate draw for responsiveness:
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
        let sizeW = 0;
        let sizeH = 0;

        if (layer.type === 'text') {
          ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
          const metrics = ctx.measureText(layer.content);
          sizeW = metrics.width / 2 + 15 * scaleFactor;
          sizeH = layer.fontSize * scaleFactor * 0.6;
        } else if (layer.type === 'sticker') {
          sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = sizeW;
        } else if (layer.type === 'shape' || layer.type === 'logo') {
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
        ctx.beginPath();
        ctx.arc(layer.x + sizeW, layer.y - sizeH, handleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        const barWidth = handleRadius * 1.2;
        const barHeight = 4 * scaleFactor;
        ctx.fillRect(layer.x + sizeW - barWidth/2, layer.y - sizeH - barHeight/2, barWidth, barHeight);
      }
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [layers, selectedLayerId, customImage, customResult, view]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as React.TouchEvent).touches[0].clientX;
      clientY = (e as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !customImage || customResult) return;
    const { x, y } = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const scaleFactor = canvas.width / 1000;

    if (selectedLayerId) {
      const layer = layers.find(l => l.id === selectedLayerId);
      if (layer) {
        let sizeW = 0;
        let sizeH = 0;
        if (layer.type === 'text') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
            sizeW = ctx.measureText(layer.content).width / 2 + 15 * scaleFactor;
            sizeH = layer.fontSize * scaleFactor * 0.6;
          }
        } else if (layer.type === 'sticker') {
          sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = sizeW;
        } else if (layer.type === 'shape' || layer.type === 'logo') {
          sizeW = ((layer.width || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
          sizeH = ((layer.height || layer.fontSize) * scaleFactor) / 2 + 10 * scaleFactor;
        }

        const handleX = layer.x + sizeW;
        const handleY = layer.y - sizeH;
        const dist = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
        if (dist < 40 * scaleFactor) {
          setLayers(layers.filter(l => l.id !== selectedLayerId));
          setSelectedLayerId(null);
          return;
        }
      }
    }

    const clickedLayer = [...layers].reverse().find(layer => {
      let sizeW = 0;
      let sizeH = 0;
      if (layer.type === 'text') {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.font = `bold ${layer.fontSize * scaleFactor}px "${layer.fontFamily}"`;
            sizeW = ctx.measureText(layer.content).width / 2 + 15 * scaleFactor;
            sizeH = layer.fontSize * scaleFactor * 0.6;
          }
      } else if (layer.type === 'sticker') {
        sizeW = (layer.fontSize * scaleFactor) / 2 + 10 * scaleFactor;
        sizeH = sizeW;
      } else if (layer.type === 'shape' || layer.type === 'logo') {
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
      const newLayer: CustomLayer = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        content: "NEW TEXT",
        x,
        y,
        fontSize: activeSize,
        fontFamily: activeFont,
        color: activeColor,
        opacity: 100,
        bgActive: false,
        bgColor: '#000000',
        bgOpacity: 80
      };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    } else if (toolMode === 'add-sticker') {
      const newLayer: CustomLayer = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'sticker',
        content: activeSticker.emoji,
        x,
        y,
        fontSize: 100,
        color: '#000',
        opacity: 100
      };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
    } else if (toolMode === 'add-shape') {
      const newLayer: CustomLayer = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'shape',
        content: 'rect',
        x,
        y,
        fontSize: 150,
        width: 150,
        height: 150,
        color: activeColor,
        opacity: 100
      };
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
    
    setLayers(layers.map(l => 
      l.id === selectedLayerId 
        ? { ...l, x: x - dragOffset.current.x, y: y - dragOffset.current.y } 
        : l
    ));
  };

  const handleMouseUp = () => {
    setIsDraggingLayer(false);
  };

  const handleUpdateLayer = (updates: Partial<CustomLayer>) => {
    if (!selectedLayerId) return;
    setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, ...updates } : l));
  };

  const downloadImage = (url: string, name?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'jagohp-design'}-${Date.now()}.png`;
    link.click();
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Color Section Helper Component
  const ColorControl = ({ label, currentColor, onColorChange }: { label: string, currentColor: string, onColorChange: (color: string) => void }) => (
    <div className="space-y-2">
      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative group">
          <input 
            type="color" 
            value={currentColor} 
            onChange={(e) => onColorChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-white/10"
          />
        </div>
        <div className="flex-1 flex items-center bg-[#111] border border-white/10 rounded-lg px-3 py-2.5">
          <span className="text-slate-500 font-bold mr-1 text-[10px]">HEX</span>
          <input 
            type="text" 
            value={currentColor.toUpperCase()} 
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('#') && val.length <= 7) onColorChange(val);
              else if (!val.startsWith('#') && val.length <= 6) onColorChange('#' + val);
            }}
            className="bg-transparent text-white font-black text-[10px] outline-none w-full tracking-widest"
          />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mt-2">
        {['#ffffff', '#000000', '#3b82f6', '#ef4444', '#eab308', '#22c55e', '#a855f7', '#ff00ff', '#00ffff', '#333333'].map(c => (
          <button 
            key={c} 
            onClick={() => onColorChange(c)} 
            className={`w-full aspect-square rounded-md border border-white/5 transition-transform ${currentColor.toLowerCase() === c ? 'scale-110 ring-1 ring-blue-500' : 'hover:scale-105 opacity-80'}`} 
            style={{backgroundColor: c}} 
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-slate-200 overflow-hidden font-inter">
      <header className="flex-none py-4 px-8 border-b border-white/5 flex items-center justify-between bg-black/80 z-50 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/CSG8wWS.jpg" alt="JAGO-HP Logo" className="w-14 h-14 object-cover rounded-lg shadow-lg border border-white/10" />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-widest text-white uppercase italic font-orbitron">JAGO-HP</span>
              <span className="h-5 w-[1px] bg-slate-800 hidden sm:block"></span>
              <span className="text-[10px] font-bold text-blue-500 hidden sm:block tracking-[0.3em]">CONTENT STUDIO</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-0.5 leading-none">High-Fidelity Product Visualization</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView(view === 'generator' ? 'custom' : 'generator')}
            className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${view === 'custom' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
          >
            <Icons.Tool /> {view === 'custom' ? 'Back to Studio' : 'Custom Tools'}
            {view === 'generator' && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-[7px] font-black scale-90 group-hover:scale-100 transition-transform">Beta</span>
            )}
          </button>
        </div>
      </header>

      {view === 'generator' ? (
        <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-3 border-r border-white/5 bg-[#080808] overflow-y-auto p-6 lg:p-8 custom-scrollbar space-y-8">
            <div>
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Icons.Layout /> ART DIRECTION</h2>
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Headline (Optional)</label>
                  <input type="text" name="title" value={config.title} onChange={handleInputChange} placeholder="e.g. Vanguard X" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500/50 transition-all font-bold text-white text-base placeholder:text-slate-900 uppercase" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Tagline</label>
                  <input type="text" name="tagline" value={config.tagline} onChange={handleInputChange} placeholder="e.g. The Future is Now." className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-xs text-slate-300" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Social Media</label>
                  <textarea name="marketing" value={config.marketing} onChange={handleInputChange} rows={2} placeholder="e.g. @jagohp" className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-xs text-slate-400 resize-none font-medium" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Logo Pos</label>
                <select value={config.logoPosition} onChange={(e) => handleSelectChange('logoPosition', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none uppercase">{POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Size</label>
                <select value={config.titleSize} onChange={(e) => handleSelectChange('titleSize', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none uppercase">{TITLE_SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Branding Assets</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoIconBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} className="hidden" />
                    {config.logoIconBase64 ? 'ICON OK' : 'UPLOAD ICON'}
                  </label>
                  <label className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoTextBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'text')} className="hidden" />
                    {config.logoTextBase64 ? 'TEXT OK' : 'UPLOAD TEXT'}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Canvas Ratio</label>
                <select value={config.ratio} onChange={(e) => handleSelectChange('ratio', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none uppercase">{RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#030303] overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
            {!batch && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-40">
                <Icons.Image />
                <div className="text-center space-y-3">
                   <h3 className="text-[14px] font-black uppercase tracking-[0.6em] text-slate-500">Stage Idle</h3>
                   <p className="text-[10px] text-slate-700 max-w-[320px] mx-auto leading-relaxed font-bold uppercase tracking-widest text-center">Configure your product and select a mood to start rendering.</p>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center gap-12">
                 <Icons.Loader />
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.6em] animate-pulse">Rendering Assets...</p>
              </div>
            )}
            {batch && !isLoading && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-6">
                   <h2 className="text-lg font-black tracking-widest text-white uppercase">Render Result</h2>
                   <button onClick={() => setBatch(null)} className="text-[10px] font-black text-slate-700 hover:text-white uppercase tracking-widest border border-white/5 px-4 py-2 rounded-full">Clear Stage</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {batch.results.map((result, idx) => (
                    <div key={idx} className="group relative">
                      <div onClick={() => setEnlargedImage(result.imageUrl)} className="relative bg-black rounded-xl overflow-hidden border border-white/5 cursor-zoom-in">
                        <img src={result.imageUrl} className="w-full h-auto block" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                           <button onClick={(e) => { e.stopPropagation(); downloadImage(result.imageUrl, `variant-${idx+1}`); }} className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Icons.Download /> Download</button>
                           <button onClick={(e) => { e.stopPropagation(); handleStartCustomEdit(result.imageUrl); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">Edit in Custom Tools</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 border-l border-white/5 bg-[#080808] p-6 lg:p-8 space-y-8 flex flex-col">
            <div className="flex-1 space-y-8">
              <div>
                <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Icons.Sparkles /> VISUAL AESTHETIC</h2>
                <select value={config.mood} onChange={(e) => handleSelectChange('mood', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[11px] font-black uppercase tracking-widest outline-none">{MOOD_OPTIONS.map(mood => <option key={mood.value} value={mood.value}>{mood.label}</option>)}</select>
              </div>
              <div>
                <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Icons.Layout /> DEVICE TYPE</h2>
                <select value={config.mockupType} onChange={(e) => handleSelectChange('mockupType', e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[11px] font-black uppercase tracking-widest outline-none">{MOCKUP_DEVICE_OPTIONS.map(device => <option key={device.value} value={device.value}>{device.label}</option>)}</select>
              </div>
              <div>
                <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Icons.Image /> SCREEN CONTENT</h2>
                <label className={`flex flex-col items-center justify-center h-32 border rounded-xl cursor-pointer transition-all relative overflow-hidden ${config.mockupScreenshot ? 'border-blue-500/30' : 'bg-[#111] border-white/5'}`}>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mockup')} className="hidden" />
                  {config.mockupScreenshot ? <img src={config.mockupScreenshot} className="w-full h-full object-cover opacity-50" /> : <Icons.Image />}
                </label>
              </div>
            </div>
            <button onClick={() => handleGenerate(false)} disabled={isLoading} className="w-full bg-white text-black font-black py-6 rounded-2xl uppercase tracking-[0.4em] text-[12px] hover:bg-slate-200 transition-colors">{isLoading ? 'Processing...' : 'Render Batch'}</button>
          </div>
        </main>
      ) : (
        /* CUSTOM TOOLS VIEW */
        <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT SIDEBAR - MODES */}
          <div className="lg:col-span-3 border-r border-white/5 bg-[#080808] p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Icons.Tool /> SELECT TOOL</h2>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {[
                { id: 'remove-bg', icon: <Icons.Palette />, label: 'Background removal' },
                { id: 'ai-eraser', icon: <Icons.Tool />, label: 'AI Object Eraser' },
                { id: 'add-text', icon: <Icons.Type />, label: 'Add Typography' },
                { id: 'add-sticker', icon: <Icons.Smile />, label: 'Stickers & Icons' },
                { id: 'add-shape', icon: <Icons.Layout />, label: 'Dynamic Shapes' },
                { id: 'add-logo', icon: <Icons.Image />, label: 'Upload Own Logo' }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => { setToolMode(item.id as CustomToolMode); setSelectedLayerId(null); }} 
                  className={`p-4 rounded-xl border text-left transition-all ${toolMode === item.id ? 'bg-blue-600/10 border-blue-500/50 text-white shadow-[inset_0_0_15px_rgba(37,99,235,0.1)]' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </p>
                </button>
              ))}
            </div>
            
            <input 
              type="file" 
              ref={logoInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleFileChange(e, 'custom-layer-logo')} 
            />

            <div className="pt-8 mt-8 border-t border-white/5">
              <label className="w-full block py-4 bg-slate-900 border border-white/10 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors">
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'custom')} className="hidden" />
                Upload New Base
              </label>
            </div>
          </div>

          {/* CENTER CANVAS AREA */}
          <div className="lg:col-span-6 bg-[#030303] overflow-hidden flex flex-col items-center justify-center p-6 relative">
            {!customImage ? (
              <div className="text-center opacity-30 flex flex-col items-center gap-4">
                <Icons.Image />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Stage Empty</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center relative">
                <div className="relative border-2 border-dashed border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-lg overflow-hidden max-h-full">
                  {customResult ? (
                    <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center relative">
                      <img src={customResult} className="max-h-[70vh] block" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity gap-8 p-12">
                        <div className="text-center space-y-3">
                           <p className="text-[14px] font-black text-white uppercase tracking-[0.4em]">Design Finalized</p>
                           <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Commit to flatten or Discard to retry</p>
                        </div>
                        <div className="flex flex-col gap-4 w-full max-w-[240px]">
                           <button onClick={handleApplyAndContinue} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[11px] uppercase shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all border border-blue-400/30">Commit Design</button>
                           <button onClick={() => downloadImage(customResult, 'custom-design')} className="w-full bg-white text-black py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all">
                              <Icons.Download /> Download
                           </button>
                           <button onClick={() => setCustomResult(null)} className="w-full bg-white/10 backdrop-blur text-white/70 py-4 rounded-xl font-black text-[11px] uppercase border border-white/10 hover:bg-white/20 transition-all">Discard Layer</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                       <canvas 
                         ref={canvasRef}
                         onMouseDown={handleMouseDown}
                         onMouseMove={handleMouseMove}
                         onMouseUp={handleMouseUp}
                         onTouchStart={handleMouseDown}
                         onTouchMove={handleMouseMove}
                         onTouchEnd={handleMouseUp}
                         className={`max-h-[75vh] block object-contain transition-all ${toolMode === 'ai-eraser' ? 'cursor-crosshair' : 'cursor-cell'}`}
                       />
                       <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                         <div className="bg-blue-600/90 text-white px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                            {toolMode === 'add-text' ? 'CLICK TO ADD TEXT / DRAG TO MOVE' : toolMode === 'add-sticker' ? 'CLICK TO PLACE STICKER / DRAG TO MOVE' : toolMode === 'add-shape' ? 'CLICK TO ADD SHAPE' : toolMode === 'ai-eraser' ? 'CLICK TO ERASE' : toolMode === 'add-logo' ? 'UPLOAD LOGO TO PLACE' : 'EDITING MODE'}
                         </div>
                       </div>
                    </div>
                  )}
                </div>
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center gap-6 backdrop-blur-md">
                    <Icons.Loader /><p className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-500 animate-pulse">Running Neural Rendering Engine...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR - STYLE FEATURES */}
          <div className="lg:col-span-3 border-l border-white/5 bg-[#080808] p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col">
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-2"><Icons.Palette /> STYLE & PROPERTIES</h2>
            
            <div className="flex-1 space-y-8">
              {!selectedLayerId && !customResult && (toolMode === 'add-text' || toolMode === 'add-sticker' || toolMode === 'add-shape' || toolMode === 'add-logo') && (
                <div className="p-6 border border-white/5 rounded-2xl bg-white/[0.02] text-center space-y-3 opacity-60">
                   <Icons.Type />
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Select an element on the canvas to edit its style or drag to move.</p>
                </div>
              )}

              {/* Text Style Controls */}
              {selectedLayer && selectedLayer.type === 'text' && !customResult && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Canvas Input</label>
                    <input 
                      type="text" 
                      value={selectedLayer.content} 
                      onChange={(e) => handleUpdateLayer({ content: e.target.value })} 
                      className="w-full bg-[#111] border border-blue-500/30 rounded-lg px-3 py-3 text-xs text-white uppercase outline-none focus:border-blue-500" 
                      placeholder="Type text..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Font Family</label>
                    <select 
                      value={selectedLayer.fontFamily} 
                      onChange={(e) => handleUpdateLayer({ fontFamily: e.target.value })} 
                      className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-[10px] font-bold outline-none"
                    >
                      {FONT_OPTIONS.map(font => <option key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.label}</option>)}
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 space-y-6">
                    <ColorControl 
                      label="Text Color" 
                      currentColor={selectedLayer.color} 
                      onColorChange={(color) => handleUpdateLayer({ color })} 
                    />

                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Text Background</label>
                      <button 
                        onClick={() => handleUpdateLayer({ bgActive: !selectedLayer.bgActive })}
                        className={`w-10 h-5 rounded-full relative transition-colors ${selectedLayer.bgActive ? 'bg-blue-600' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${selectedLayer.bgActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {selectedLayer.bgActive && (
                      <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5 animate-in fade-in duration-200">
                        <ColorControl 
                          label="BG Color" 
                          currentColor={selectedLayer.bgColor || '#000000'} 
                          onColorChange={(bgColor) => handleUpdateLayer({ bgColor })} 
                        />
                        <div className="space-y-2 pt-2 border-t border-white/5">
                           <div className="flex justify-between">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BG Opacity</label>
                            <span className="text-[8px] font-black text-blue-500">{selectedLayer.bgOpacity}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={selectedLayer.bgOpacity || 80} onChange={(e) => handleUpdateLayer({ bgOpacity: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Size & Opacity</label>
                     </div>
                     <div className="space-y-4">
                       <div className="space-y-1">
                          <span className="text-[8px] text-slate-500 font-bold">FONT SIZE: {selectedLayer.fontSize}PX</span>
                          <input type="range" min="20" max="400" value={selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ fontSize: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                       </div>
                       <div className="space-y-1">
                          <span className="text-[8px] text-slate-500 font-bold">TEXT OPACITY: {selectedLayer.opacity}%</span>
                          <input type="range" min="0" max="100" value={selectedLayer.opacity} onChange={(e) => handleUpdateLayer({ opacity: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                       </div>
                     </div>
                  </div>
                </div>
              )}

              {/* Shape/Logo Style Controls */}
              {selectedLayer && (selectedLayer.type === 'shape' || selectedLayer.type === 'logo') && !customResult && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {selectedLayer.type === 'shape' && (
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Shape Type</label>
                      <div className="flex gap-2">
                         <button onClick={() => handleUpdateLayer({ content: 'rect' })} className={`flex-1 py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedLayer.content === 'rect' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Rectangle</button>
                         <button onClick={() => handleUpdateLayer({ content: 'circle' })} className={`flex-1 py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${selectedLayer.content === 'circle' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>Ellipse</button>
                      </div>
                    </div>
                  )}

                  {selectedLayer.type === 'shape' && (
                    <ColorControl 
                      label="Shape Color" 
                      currentColor={selectedLayer.color} 
                      onColorChange={(color) => handleUpdateLayer({ color })} 
                    />
                  )}

                  <div className="space-y-4">
                     <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Dimensions</label>
                     <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                       <div className="space-y-1">
                          <div className="flex justify-between">
                             <span className="text-[8px] text-slate-500 font-bold">WIDTH</span>
                             <span className="text-[8px] font-black text-blue-500">{selectedLayer.width || selectedLayer.fontSize}PX</span>
                          </div>
                          <input type="range" min="10" max="1000" value={selectedLayer.width || selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ width: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                       </div>
                       <div className="space-y-1">
                          <div className="flex justify-between">
                             <span className="text-[8px] text-slate-500 font-bold">HEIGHT</span>
                             <span className="text-[8px] font-black text-blue-500">{selectedLayer.height || selectedLayer.fontSize}PX</span>
                          </div>
                          <input type="range" min="10" max="1000" value={selectedLayer.height || selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ height: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                       </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Appearance</label>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[8px] text-slate-500 font-bold">OPACITY</span>
                          <span className="text-[8px] font-black text-blue-500">{selectedLayer.opacity}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={selectedLayer.opacity} onChange={(e) => handleUpdateLayer({ opacity: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                     </div>
                  </div>
                </div>
              )}

              {selectedLayer && selectedLayer.type === 'sticker' && !customResult && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sticker Scale</label>
                      <span className="text-[9px] font-black text-blue-500">{selectedLayer.fontSize}px</span>
                     </div>
                     <input type="range" min="40" max="400" value={selectedLayer.fontSize} onChange={(e) => handleUpdateLayer({ fontSize: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {STICKER_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => handleUpdateLayer({ content: s.emoji })} className={`p-4 rounded-xl border ${selectedLayer.content === s.emoji ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/5'}`}>
                        <span className="text-2xl">{s.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {toolMode === 'ai-eraser' && !customResult && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                      <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Precision Brush</label>
                      <span className="text-[9px] font-black text-blue-500">{brushSize}px</span>
                     </div>
                     <input type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">Mark unwanted elements. AI reconstruction will trigger after you commit.</p>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-12">
              {(layers.length > 0 || toolMode === 'remove-bg') && !customResult && (
                <button 
                   onClick={startCustomAction} 
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3"
                >
                   <Icons.Sparkles /> {toolMode === 'remove-bg' ? 'Remove Background' : 'Finalize Design'}
                </button>
              )}

              {customResult && (
                <div className="space-y-4 animate-in fade-in duration-500">
                   <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Export Actions</h3>
                   <button 
                      onClick={() => downloadImage(customResult, 'final-result')} 
                      className="w-full bg-white text-black py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-3 hover:bg-slate-200"
                   >
                      <Icons.Download /> Download Final
                   </button>
                   <button 
                      onClick={handleApplyAndContinue} 
                      className="w-full bg-blue-600/10 border border-blue-500/30 text-blue-400 py-6 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600/20 transition-all"
                   >
                      Continue Editing
                   </button>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} className="max-w-full max-h-[90vh] rounded-xl border border-white/10 shadow-2xl" />
        </div>
      )}

      <footer className="flex-none py-3 text-center bg-black border-t border-white/5">
        <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">JAGO-HP PRODUCTION INFRASTRUCTURE v2.5</span>
      </footer>
    </div>
  );
};

export default App;
