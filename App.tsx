
import React, { useState } from 'react';
import { MOOD_OPTIONS, RATIO_OPTIONS, POSITION_OPTIONS, TITLE_SIZE_OPTIONS, MOCKUP_DEVICE_OPTIONS, Icons } from './constants';
import { PosterConfig, GeneratedBatch } from './types';
import { generatePosterBatch } from './services/geminiService';

const App: React.FC = () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'text' | 'mockup') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'icon') {
          setConfig(prev => ({ ...prev, logoIconBase64: base64 }));
        } else if (type === 'text') {
          setConfig(prev => ({ ...prev, logoTextBase64: base64 }));
        } else if (type === 'mockup') {
          setConfig(prev => ({ ...prev, mockupScreenshot: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMockup = () => {
    setConfig(prev => ({ ...prev, mockupScreenshot: undefined }));
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
      setBatch({
        results,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during batch generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `jagohp-design-${index + 1}-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-slate-200 overflow-hidden font-inter">
      <header className="flex-none py-4 px-8 border-b border-white/5 flex items-center justify-between bg-black/80 z-50 backdrop-blur-3xl">
        <div className="flex items-center gap-4">
          <img 
            src="https://imgur.com/AmPZ1cP.jpg" 
            alt="JAGO-HP Logo" 
            className="w-14 h-14 object-cover rounded-lg shadow-lg border border-white/10"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-widest text-white uppercase italic font-orbitron">JAGO-HP</span>
              <span className="h-5 w-[1px] bg-slate-800 hidden sm:block"></span>
              <span className="text-[10px] font-bold text-blue-500 hidden sm:block tracking-[0.3em]">PRO STUDIO</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-0.5 leading-none">High-Fidelity Product Visualization</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Distributed Cluster: Active</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT PANEL: Art Direction & Assets */}
        <div className="lg:col-span-3 border-r border-white/5 bg-[#080808] overflow-y-auto p-6 lg:p-8 custom-scrollbar space-y-8">
          <div>
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Icons.Layout />
              ART DIRECTION
            </h2>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Headline</label>
                <input
                  type="text"
                  name="title"
                  value={config.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Vanguard X"
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500/50 transition-all font-bold text-white text-base placeholder:text-slate-900 uppercase"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={config.tagline}
                  onChange={handleInputChange}
                  placeholder="e.g. The Future is Now."
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-xs text-slate-300"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">Social Media</label>
                <textarea
                  name="marketing"
                  value={config.marketing}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="e.g. @jagohp"
                  className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-all text-xs text-slate-400 resize-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Logo Pos</label>
              <select
                value={config.logoPosition}
                onChange={(e) => handleSelectChange('logoPosition', e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer"
              >
                {POSITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Headline Size</label>
              <select
                value={config.titleSize}
                onChange={(e) => handleSelectChange('titleSize', e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer"
              >
                {TITLE_SIZE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Branding Assets</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'icon')} className="hidden" id="logo-icon-file" />
                  <label htmlFor="logo-icon-file" className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoIconBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>
                    {config.logoIconBase64 ? 'ICON' : 'UPLOAD ICON'}
                  </label>
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'text')} className="hidden" id="logo-text-file" />
                  <label htmlFor="logo-text-file" className={`flex items-center justify-center h-12 border rounded-xl cursor-pointer transition-all text-[8px] font-black tracking-[0.1em] text-center px-2 ${config.logoTextBase64 ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-[#111] border-white/5 text-slate-700 hover:border-white/10'}`}>
                    {config.logoTextBase64 ? 'TEXT' : 'UPLOAD TEXT'}
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-2 ml-1 tracking-widest">Canvas Ratio</label>
              <select
                value={config.ratio}
                onChange={(e) => handleSelectChange('ratio', e.target.value)}
                className="w-full bg-[#111] border border-white/5 rounded-lg px-2 py-3 text-[10px] font-bold focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer"
              >
                {RATIO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#111]">{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Generated Results */}
        <div className="lg:col-span-6 bg-[#030303] overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
          {!batch && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 opacity-40">
              <div className="w-32 h-32 rounded-full border border-white/5 flex items-center justify-center text-slate-800">
                <Icons.Image />
              </div>
              <div className="text-center space-y-3">
                 <h3 className="text-[14px] font-black uppercase tracking-[0.6em] text-slate-500">Stage Idle</h3>
                 <p className="text-[10px] text-slate-700 max-w-[320px] mx-auto leading-relaxed font-bold uppercase tracking-widest">Configure your product on the left and select a mood on the right to start.</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="h-full flex flex-col items-center justify-center gap-12">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                  {[0,1,2].map(i => (
                    <div key={i} className="aspect-[9/16] bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse flex flex-col items-center justify-center p-4 space-y-4">
                       <Icons.Loader />
                       <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700 text-center">Rendering Variant {i+1}</p>
                    </div>
                  ))}
               </div>
               <div className="space-y-4 text-center">
                  <p className="text-[12px] font-black uppercase tracking-[0.8em] text-blue-500 animate-pulse">Processing Batch</p>
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.4em]">Multi-Asset Fusion Engine</p>
               </div>
            </div>
          )}

          {batch && !isLoading && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-6">
                 <div>
                    <h2 className="text-lg font-black tracking-widest text-white uppercase">Render Result</h2>
                    <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase mt-1 leading-none">Typographic accuracy verified</p>
                 </div>
                 <button 
                  onClick={() => setBatch(null)}
                  className="text-[10px] font-black text-slate-700 hover:text-white transition-colors tracking-widest uppercase border border-white/5 px-4 py-2 rounded-full"
                 >
                   Clear Stage
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {batch.results.map((result, idx) => (
                  <div key={idx} className="group relative">
                    <div className="absolute -inset-1 bg-blue-600/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div 
                      onClick={() => setEnlargedImage(result.imageUrl)}
                      className="relative bg-black rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all duration-300 shadow-2xl cursor-zoom-in"
                    >
                      <img
                        src={result.imageUrl}
                        alt={`Design Variation ${idx + 1}`}
                        className="w-full h-auto block"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                         <button 
                          onClick={(e) => { e.stopPropagation(); downloadImage(result.imageUrl, idx); }}
                          className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                        >
                          <Icons.Download />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                       <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-none">Variation {idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revision Trigger */}
              <div className="mt-12 flex flex-col items-center gap-4">
                 <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Spelling error or miss-typo in the design?</p>
                 <button 
                  onClick={() => handleGenerate(true)}
                  className="group flex items-center gap-3 px-10 py-4 bg-slate-900/50 hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/50 rounded-2xl transition-all"
                 >
                    <Icons.Sparkles />
                    <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-400 uppercase tracking-[0.3em]">Request Design Revision</span>
                 </button>
              </div>
            </div>
          )}

          {/* Image Modal */}
          {enlargedImage && (
            <div 
              className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 lg:p-20 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setEnlargedImage(null)}
            >
              <div className="relative max-w-full max-h-full">
                <img 
                  src={enlargedImage} 
                  alt="Enlarged design" 
                  className="max-w-full max-h-[85vh] rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 object-contain"
                />
                <button 
                  onClick={() => setEnlargedImage(null)}
                  className="absolute -top-12 right-0 lg:-right-12 text-white hover:text-blue-400 transition-colors p-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Aesthetics & Mockup Action */}
        <div className="lg:col-span-3 border-l border-white/5 bg-[#080808] overflow-y-auto p-6 lg:p-8 custom-scrollbar space-y-8 flex flex-col">
          <div className="flex-1 space-y-8">
            {/* Visual Aesthetic Section */}
            <div>
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Icons.Sparkles />
                VISUAL AESTHETIC
              </h2>
              <div className="relative">
                <select
                  value={config.mood}
                  onChange={(e) => handleSelectChange('mood', e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer appearance-none"
                >
                  {MOOD_OPTIONS.map(mood => (
                    <option key={mood.value} value={mood.value} className="bg-[#111] py-2">{mood.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
              <p className="mt-2 text-[8px] text-slate-600 font-bold uppercase tracking-wider leading-relaxed px-1">
                {MOOD_OPTIONS.find(m => m.value === config.mood)?.description}
              </p>
            </div>

            {/* Mockup Device Type Section */}
            <div>
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Icons.Layout />
                DEVICE TYPE
              </h2>
              <div className="relative">
                <select
                  value={config.mockupType}
                  onChange={(e) => handleSelectChange('mockupType', e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-1 focus:ring-blue-500/50 outline-none cursor-pointer appearance-none"
                >
                  {MOCKUP_DEVICE_OPTIONS.map(device => (
                    <option key={device.value} value={device.value} className="bg-[#111] py-2">{device.label}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            {/* Mockup Upload Section (Single Slot - Reduced Size) */}
            <div>
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Icons.Image />
                SCREEN CONTENT
              </h2>
              <div className="group relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'mockup')} 
                  className="hidden" 
                  id="mockup-file-single" 
                />
                <label 
                  htmlFor="mockup-file-single" 
                  className={`flex flex-col items-center justify-center h-32 border rounded-xl cursor-pointer transition-all relative overflow-hidden ${
                    config.mockupScreenshot 
                      ? 'border-blue-500/30' 
                      : 'bg-[#111] border-white/5 hover:border-white/10'
                  }`}
                >
                  {config.mockupScreenshot ? (
                    <>
                      <img 
                        src={config.mockupScreenshot} 
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" 
                        alt="Screen Content"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest shadow-2xl">Ready</span>
                        <span className="text-[7px] text-slate-300 font-bold uppercase tracking-widest">Change Image</span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); removeMockup(); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors z-10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                       <div className="p-2 rounded-full bg-white/5 text-slate-700 group-hover:text-slate-400 group-hover:bg-white/10 transition-colors">
                         <Icons.Image />
                       </div>
                       <div className="text-center px-2">
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-400">Upload Screen</span>
                          <span className="block text-[6px] text-slate-700 font-bold uppercase tracking-widest mt-0.5">Mockup Reference</span>
                       </div>
                    </div>
                  )}
                </label>
              </div>
              <p className="mt-3 text-[7px] text-slate-700 font-bold uppercase tracking-widest text-center leading-tight">Integrated onto selected hardware.</p>
            </div>
          </div>

          <div className="flex-none pt-6 border-t border-white/5">
            <button
              onClick={() => handleGenerate(false)}
              disabled={isLoading}
              className="w-full bg-white hover:bg-blue-50 disabled:bg-[#121212] disabled:text-slate-800 text-black font-black py-6 rounded-2xl shadow-[0_20px_50px_rgba(255,255,255,0.03)] flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] group relative overflow-hidden"
            >
              {isLoading ? (
                <>
                  <Icons.Loader />
                  <span className="uppercase tracking-[0.4em] text-[10px] animate-pulse leading-none">Processing...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10 uppercase tracking-[0.4em] text-[12px] leading-none">Render Batch</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest relative z-10 leading-none">Generate 3 Variations</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </>
              )}
            </button>
            
            {error && (
               <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-500 text-[9px] font-black text-center uppercase tracking-[0.2em] leading-tight">
                  {error}
               </div>
            )}
          </div>
        </div>
      </main>

      <footer className="flex-none py-4 text-center bg-black/40 border-t border-white/5">
        <div className="inline-flex items-center gap-4 px-6 py-2 rounded-full bg-white/[0.02] border border-white/5 shadow-2xl">
           <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
           <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.6em] leading-none">JAGO-HP High-Speed Production Node</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #111; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #222; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-duration: 0.6s; animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
};

export default App;
