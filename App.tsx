
import React, { useState, useRef, useEffect } from 'react';
import { MOOD_OPTIONS, RATIO_OPTIONS, POSITION_OPTIONS, TITLE_SIZE_OPTIONS, MOCKUP_DEVICE_OPTIONS, Icons } from './constants';
import { PosterConfig, GeneratedBatch } from './types';
import { generatePosterBatch, editImageTask } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'fixing'>('generator');
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

  const [fixingImage, setFixingImage] = useState<string | null>(null);
  const [fixingResult, setFixingResult] = useState<string | null>(null);
  const [fixingMode, setFixingMode] = useState<'remove-bg' | 'remove-text' | 'add-text'>('remove-bg');
  const [isFixing, setIsFixing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(25);

  const [aiTextPrompt, setAiTextPrompt] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'text' | 'mockup' | 'fixing') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'icon') setConfig(prev => ({ ...prev, logoIconBase64: base64 }));
        else if (type === 'text') setConfig(prev => ({ ...prev, logoTextBase64: base64 }));
        else if (type === 'mockup') setConfig(prev => ({ ...prev, mockupScreenshot: base64 }));
        else if (type === 'fixing') {
          setFixingImage(base64);
          setFixingResult(null);
          const img = new Image();
          img.onload = () => { imageRef.current = img; renderCanvas(); };
          img.src = base64;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (isRevision: boolean = false) => {
    if (!config.title) {
      setError("Please provide a product headline.");
      return;
    }
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

  const startFixingTask = async () => {
    if (!fixingImage) return;
    setIsFixing(true);
    try {
      let imageDataToSent = fixingImage;
      if (fixingMode === 'remove-text' && canvasRef.current) {
        imageDataToSent = canvasRef.current.toDataURL('image/png');
      }
      const res = await editImageTask(
        imageDataToSent, 
        fixingMode === 'add-text' ? 'add-text-manual' : (fixingMode as any),
        fixingMode === 'add-text' ? aiTextPrompt : undefined
      );
      setFixingResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handlePolishDesign = async () => {
    if (!fixingResult) return;
    setIsFixing(true);
    try {
      const res = await editImageTask(fixingResult, 'polish-design');
      setFixingResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleApplyAndContinue = () => {
    if (!fixingResult) return;
    const newBase = fixingResult;
    setFixingImage(newBase);
    setFixingResult(null);
    setAiTextPrompt("");
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = newBase;
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !fixingImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = (img: HTMLImageElement) => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    if (imageRef.current && imageRef.current.src === fixingImage) {
      draw(imageRef.current);
    } else {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        draw(img);
      };
      img.src = fixingImage;
    }
  };

  const resetFixingCanvas = () => {
    renderCanvas();
  };

  useEffect(() => {
    if (view === 'fixing' && fixingImage) {
      renderCanvas();
    }
  }, [view, fixingImage, fixingMode]);

  const handleCanvasInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !fixingImage) return;
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
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    if (fixingMode === 'remove-text' && isDrawing) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Pure blue for precision
        ctx.beginPath();
        ctx.arc(x, y, brushSize * scaleX, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const downloadImage = (url: string, name?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'jagohp-design'}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-slate-200 overflow-hidden font-inter">
      <header className="flex-none py-4 px-8 border-b border-white/5 flex items-center justify-between bg-black/80 z-50 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <img src="https://imgur.com/CSG8wWS.jpg" alt="JAGO-HP Logo" className="w-14 h-14 object-cover rounded-lg shadow-lg border border-white/10" />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-widest text-white uppercase italic font-orbitron">JAGO-HP</span>
              <span className="h-5 w-[1px] bg-slate-800 hidden sm:block"></span>
              <span className="text-[10px] font-bold text-blue-500 hidden sm:block tracking-[0.3em]">PRO STUDIO</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-0.5 leading-none">High-Fidelity Product Visualization</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setView(view === 'generator' ? 'fixing' : 'generator')}
            className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${view === 'fixing' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
          >
            <Icons.Tool /> {view === 'fixing' ? 'Back to Studio' : 'Fixing Tools'}
            {view === 'generator' && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[7px] font-black scale-90 group-hover:scale-100 transition-transform">BETA</span>
            )}
          </button>
        </div>
      </header>

      {view === 'generator' ? (
        <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT PANEL */}
          <div className="lg:col-span-3 border-r border-white/5 bg-[#080808] overflow-y-auto p-6 lg:p-8 custom-scrollbar space-y-8">
            <div>
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Icons.Layout /> ART DIRECTION</h2>
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Headline</label>
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
                <select value={config.logoPosition} onChange={(e) => handleSelectChange('logoPosition', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none">{POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Headline Size</label>
                <select value={config.titleSize} onChange={(e) => handleSelectChange('titleSize', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none">{TITLE_SIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Branding Assets</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} className="hidden" id="logo-icon-file" />
                    <label htmlFor="logo-icon-file" className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoIconBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>{config.logoIconBase64 ? 'ICON OK' : 'UPLOAD ICON'}</label>
                  </div>
                  <div>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'text')} className="hidden" id="logo-text-file" />
                    <label htmlFor="logo-text-file" className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoTextBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>{config.logoTextBase64 ? 'TEXT OK' : 'UPLOAD TEXT'}</label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Canvas Ratio</label>
                <select value={config.ratio} onChange={(e) => handleSelectChange('ratio', e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold outline-none">{RATIO_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#030303] overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
            {!batch && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-40">
                <Icons.Image />
                <div className="text-center space-y-3">
                   <h3 className="text-[14px] font-black uppercase tracking-[0.6em] text-slate-500">Stage Idle</h3>
                   <p className="text-[10px] text-slate-700 max-w-[320px] mx-auto leading-relaxed font-bold uppercase tracking-widest text-center">Configure your product on the left and select a mood on the right to start.</p>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="h-full flex flex-col items-center justify-center gap-12">
                 <Icons.Loader />
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.6em]">Rendering Assets...</p>
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
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                           <button onClick={(e) => { e.stopPropagation(); downloadImage(result.imageUrl, `variant-${idx+1}`); }} className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Icons.Download /> Download</button>
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
                <div className="group relative">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'mockup')} className="hidden" id="mockup-file-single" />
                  <label htmlFor="mockup-file-single" className={`flex flex-col items-center justify-center h-32 border rounded-xl cursor-pointer transition-all relative overflow-hidden ${config.mockupScreenshot ? 'border-blue-500/30' : 'bg-[#111] border-white/5'}`}>{config.mockupScreenshot ? <img src={config.mockupScreenshot} className="w-full h-full object-cover opacity-50" /> : <Icons.Image />}</label>
                </div>
              </div>
            </div>
            <button onClick={() => handleGenerate(false)} disabled={isLoading} className="w-full bg-white text-black font-black py-6 rounded-2xl uppercase tracking-[0.4em] text-[12px]">{isLoading ? 'Processing...' : 'Render Batch'}</button>
          </div>
        </main>
      ) : (
        /* FIXING TOOLS VIEW */
        <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-3 border-r border-white/5 bg-[#080808] p-6 lg:p-8 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><Icons.Tool /> SELECT TOOL</h2>
              <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-[7px] font-black tracking-widest uppercase border border-blue-500/30">Beta Tester Access</span>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-8">
              <button onClick={() => { setFixingMode('remove-bg'); setFixingResult(null); }} className={`p-4 rounded-xl border text-left transition-all ${fixingMode === 'remove-bg' ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}><p className="text-[10px] font-black uppercase tracking-widest">Remove Background</p></button>
              <button onClick={() => { setFixingMode('remove-text'); setFixingResult(null); }} className={`p-4 rounded-xl border text-left transition-all ${fixingMode === 'remove-text' ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}><p className="text-[10px] font-black uppercase tracking-widest">Erase Selection</p></button>
              <button onClick={() => { setFixingMode('add-text'); setFixingResult(null); }} className={`p-4 rounded-xl border text-left transition-all ${fixingMode === 'add-text' ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400'}`}><p className="text-[10px] font-black uppercase tracking-widest">AI Text Insertion</p></button>
            </div>

            {fixingMode === 'remove-text' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selection Brush</h3>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                    <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Brush Size</label>
                    <span className="text-[9px] font-black text-blue-500">{brushSize}px</span>
                   </div>
                   <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <p className="text-[8px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">Precision Hint: Use a smaller brush for finer text removal. The AI will only erase content under the blue highlight.</p>
              </div>
            )}

            {fixingMode === 'add-text' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Custom Text</h3>
                </div>
                <textarea value={aiTextPrompt} onChange={(e) => setAiTextPrompt(e.target.value)} placeholder="e.g., Add 'LIMITED EDITION' in bold silver font at bottom left..." className="w-full h-32 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-xs text-white uppercase outline-none focus:border-blue-500/50 resize-none" />
              </div>
            )}

            <div className="pt-8 mt-8 border-t border-white/5">
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'fixing')} className="hidden" id="fixing-upload" />
              <label htmlFor="fixing-upload" className="w-full block py-4 bg-slate-900 border border-white/10 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer">Change Base Image</label>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#030303] overflow-hidden flex items-center justify-center p-6 relative">
            {!fixingImage ? (
              <div className="text-center opacity-30"><Icons.Image /><p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">Upload a poster to start</p></div>
            ) : (
              <div className="w-full h-full flex items-center justify-center relative overflow-auto custom-scrollbar">
                {fixingResult ? (
                  <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6 flex flex-col items-center">
                    <img src={fixingResult} className="max-h-[70vh] rounded-2xl border border-white/10 shadow-2xl" />
                    <div className="flex flex-col gap-4 w-full px-8 max-w-2xl">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => downloadImage(fixingResult, 'jago-pro-edited')} className="bg-white text-black px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-transform hover:scale-105">
                                <Icons.Download /> Download
                            </button>
                            <button onClick={handlePolishDesign} disabled={isFixing} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                                <Icons.Sparkles /> Fixing Desain
                            </button>
                        </div>
                        <button onClick={handleApplyAndContinue} className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02]">
                            <Icons.Tool /> Apply & Brush Again
                        </button>
                    </div>
                    <button onClick={() => setFixingResult(null)} className="text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors">Discard Result</button>
                  </div>
                ) : (
                  <div className="relative group flex flex-col items-center">
                    <div className="relative overflow-hidden rounded-2xl border border-white/5 shadow-2xl bg-[#0a0a0a]">
                       <canvas 
                         ref={canvasRef}
                         onMouseDown={(e) => { setIsDrawing(true); handleCanvasInteraction(e); }}
                         onMouseUp={() => setIsDrawing(false)}
                         onMouseMove={handleCanvasInteraction}
                         onTouchStart={(e) => { setIsDrawing(true); handleCanvasInteraction(e); }}
                         onTouchEnd={() => setIsDrawing(false)}
                         onTouchMove={handleCanvasInteraction}
                         className={`max-h-[75vh] block object-contain ${fixingMode === 'remove-text' ? 'cursor-crosshair' : 'cursor-default'}`}
                       />
                    </div>
                  </div>
                )}
                {isFixing && (
                  <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center gap-6 backdrop-blur-xl">
                    <Icons.Loader /><p className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-500 animate-pulse">Retouching High-Precision Graphics...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 border-l border-white/5 bg-[#080808] p-8 flex flex-col justify-end">
             {fixingImage && !fixingResult && (
               <div className="space-y-4">
                 {fixingMode === 'remove-text' && (
                    <button onClick={resetFixingCanvas} className="w-full border border-white/10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Reset Brushing</button>
                 )}
                 <button onClick={startFixingTask} disabled={isFixing || (fixingMode === 'add-text' && !aiTextPrompt.trim())} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-8 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(37,99,235,0.2)] transition-all">
                   {fixingMode === 'add-text' ? 'Add Custom Text' : (fixingMode === 'remove-bg' ? 'Erase BG' : 'Erase Selection')}
                 </button>
               </div>
             )}
          </div>
        </main>
      )}

      {enlargedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} className="max-w-full max-h-[90vh] rounded-xl border border-white/10 shadow-2xl" />
        </div>
      )}

      <footer className="flex-none py-3 text-center bg-black border-t border-white/5">
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.6em]">JAGO-HP High-Speed Production Node</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        .font-orbitron { font-family: 'Orbitron', sans-serif; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-duration: 0.5s; animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
};

export default App;
