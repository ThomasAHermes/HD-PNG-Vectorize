import React, { useState, useEffect } from 'react';
import { ImageDropzone } from './components/ImageDropzone';
import { generateVectorizedImage } from './services/geminiService';
import { AppState } from './types';

// Helper to find the closest supported aspect ratio for Gemini
function getOptimalAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  const supportedRatios = [
    { id: '1:1', value: 1 },
    { id: '3:4', value: 3/4 },
    { id: '4:3', value: 4/3 },
    { id: '9:16', value: 9/16 },
    { id: '16:9', value: 16/9 },
  ];

  const closest = supportedRatios.reduce((prev, curr) => {
    return (Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev);
  });

  return closest.id;
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [sourceRatio, setSourceRatio] = useState<string>('1:1');
  const [removeText, setRemoveText] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processLoadedImage = (base64: string, type: string) => {
    const img = new Image();
    img.onload = () => {
      const ratio = getOptimalAspectRatio(img.width, img.height);
      setSourceImage(base64);
      setMimeType(type);
      setSourceRatio(ratio);
      setSelectedRatio('1:1'); 
      setResultImage(null);
      setAppState(AppState.IDLE);
      setErrorMsg(null);
    };
    img.onerror = () => {
      setErrorMsg("Failed to load image dimensions.");
    };
    img.src = base64;
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              processLoadedImage(base64, blob.type);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageSelected = (base64: string, type: string) => {
    processLoadedImage(base64, type);
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;
    setAppState(AppState.PROCESSING);
    setErrorMsg(null);
    setResultImage(null); // Clear previous result to avoid confusion

    try {
      const effectiveRatio = selectedRatio === 'source' ? sourceRatio : selectedRatio;
      const generatedImageBase64 = await generateVectorizedImage(sourceImage, mimeType, effectiveRatio, removeText);
      setResultImage(generatedImageBase64);
      setAppState(AppState.SUCCESS);
    } catch (err) {
      console.error(err);
      setAppState(AppState.ERROR);
      setErrorMsg("Failed to generate image. The model may have blocked the content or had a connection issue.");
    }
  };

  const handleReset = () => {
    setSourceImage(null);
    setResultImage(null);
    setAppState(AppState.IDLE);
    setErrorMsg(null);
    setSelectedRatio('1:1');
    setSourceRatio('1:1');
    setRemoveText(true);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `hd-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 flex flex-col">
      
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Img to HD PNG
            </h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="hidden sm:block text-xs font-mono text-slate-500 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
               Gemini 2.5 Flash
             </div>
             {sourceImage && (
               <div className="text-xs font-mono text-blue-400 px-3 py-1 bg-blue-900/20 rounded-full border border-blue-900/50">
                 {selectedRatio === 'source' ? sourceRatio : selectedRatio}
               </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col min-h-0">
        
        {!sourceImage && (
          <div className="max-w-3xl mx-auto mt-12 w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 leading-tight">
              Turn raster images into <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">high-definition PNGs.</span>
            </h2>
            <ImageDropzone onImageSelected={handleImageSelected} />
            <div className="mt-8 text-center text-slate-500 text-sm">
              <p>Supports PNG, JPG, WEBP. Paste anywhere to upload.</p>
            </div>
          </div>
        )}

        {sourceImage && (
          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 max-h-[calc(100vh-160px)]">
            
            {/* Left Column: Source & Controls */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex-1 flex flex-col overflow-hidden relative min-h-0">
                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded z-10 shadow-md">
                  Original
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-950/50 rounded-lg overflow-hidden relative">
                  <img 
                    src={sourceImage} 
                    alt="Source" 
                    className="max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-300" 
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center flex-shrink-0">
                <button
                  onClick={handleReset}
                  className="px-6 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium"
                  disabled={appState === AppState.PROCESSING}
                >
                  Clear
                </button>

                <div className="relative h-12 flex-shrink-0">
                  <select
                    value={selectedRatio}
                    onChange={(e) => setSelectedRatio(e.target.value)}
                    disabled={appState === AppState.PROCESSING}
                    className="h-full pl-4 pr-10 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium cursor-pointer disabled:opacity-50"
                  >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3</option>
                    <option value="16:9">16:9</option>
                    <option value="source">Source img ({sourceRatio})</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <label className={`
                  flex items-center gap-2 px-4 h-12 rounded-xl border cursor-pointer transition-all
                  ${removeText 
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }
                  ${appState === AppState.PROCESSING ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={removeText}
                      onChange={(e) => setRemoveText(e.target.checked)}
                      disabled={appState === AppState.PROCESSING}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 rounded border-slate-600 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-colors flex items-center justify-center">
                      {removeText && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold select-none whitespace-nowrap">Remove Text</span>
                </label>

                <button
                  onClick={handleGenerate}
                  disabled={appState === AppState.PROCESSING}
                  className={`flex-1 h-12 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                    ${appState === AppState.PROCESSING 
                      ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                      : appState === AppState.SUCCESS 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-[1.02]'
                    }
                  `}
                >
                  {appState === AppState.PROCESSING ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <span>Generate HD</span>
                    </>
                  )}
                </button>
              </div>
              
              {errorMsg && (
                <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-sm flex items-center gap-2 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                   </svg>
                   {errorMsg}
                </div>
              )}
            </div>

            {/* Right Column: Result */}
            <div className="flex-1 bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col relative overflow-hidden min-h-0">
               <div className="absolute top-6 left-6 bg-blue-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded z-20 shadow-lg">
                  HD Result
               </div>
              
              <div 
                className="flex-1 flex items-center justify-center rounded-lg relative overflow-hidden bg-slate-950/50 min-h-0"
                style={{
                  backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px), radial-gradient(#1e293b 1px, transparent 1px)`,
                  backgroundPosition: '0 0, 8px 8px',
                  backgroundSize: '16px 16px',
                }}
              >
                {appState === AppState.IDLE && !resultImage && (
                   <div className="text-slate-600 flex flex-col items-center p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="opacity-40 font-medium">Click "Generate HD" to redraw the image</span>
                   </div>
                )}

                {appState === AppState.PROCESSING && (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 bg-blue-500/10 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <span className="text-slate-400 mt-6 font-medium animate-pulse">Redrawing at High Fidelity...</span>
                  </div>
                )}

                {resultImage && (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <img 
                      src={resultImage} 
                      alt="HD Result" 
                      className="max-h-full max-w-full object-contain shadow-2xl animate-in zoom-in-95 duration-500"
                      onError={() => setErrorMsg("The generated image failed to display. Try generating again.")}
                    />
                  </div>
                )}
              </div>

              {resultImage && (
                <div className="mt-4 flex justify-end flex-shrink-0">
                   <button 
                    onClick={handleDownload}
                    className="bg-slate-100 hover:bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                     Download PNG
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;