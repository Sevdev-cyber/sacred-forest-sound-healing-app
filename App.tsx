import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SOUND_LIBRARY, TONE_PRESETS } from './constants';
import { SoundCategory, SoundConfig, TonePresetId } from './types';
import { audioEngine } from './services/AudioEngine';
import InfoModal from './components/InfoModal';

type TabView = 'harp' | 'backing' | 'mixer' | 'visuals';

// --- Helper Hook for Responsive Sizing ---
const useWindowSize = () => {
  const [size, setSize] = useState([typeof window !== 'undefined' ? window.innerWidth : 0, typeof window !== 'undefined' ? window.innerHeight : 0]);
  useEffect(() => {
    const handleResize = () => setSize([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
};

// --- Types for Visual Effects ---
interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

// --- Vertical Icon Slider (Atmosphere) ---
interface VerticalIconSliderProps {
  sound: SoundConfig;
  value: number;
  onChange: (val: number) => void;
}

const VerticalIconSlider: React.FC<VerticalIconSliderProps> = ({ sound, value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateValue(e.clientY);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateValue(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const updateValue = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    
    // Calculate relative to the track bottom
    const height = rect.height;
    const bottom = rect.bottom;
    const dist = bottom - clientY;
    
    let newVal = dist / height;
    newVal = Math.max(0, Math.min(1, newVal));
    
    // Snap to 0
    if (newVal < 0.05) newVal = 0;
    
    onChange(newVal);
  };

  const colorClass = sound.color.split(' ').find(c => c.startsWith('text-')) || 'text-white';
  const isActive = value > 0;

  return (
    <div className="flex flex-col items-center gap-2 h-32 w-16 touch-none">
       {/* Slider Area */}
       <div 
         ref={trackRef}
         className="relative flex-1 w-12 cursor-pointer group"
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onPointerCancel={handlePointerUp}
       >
          {/* Background Track */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 top-0 w-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
             {/* Fill Track */}
             <div 
               className={`absolute bottom-0 w-full transition-all duration-75 bg-current opacity-60 ${colorClass}`} 
               style={{ height: `${value * 100}%` }}
             />
          </div>

          {/* The Handle (Icon) */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full transition-all duration-100 shadow-lg border-2 select-none
               ${isActive 
                 ? `w-14 h-14 bg-stone-900 border-white/40 text-white ${sound.color}` 
                 : 'w-12 h-12 bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 group-hover:scale-105'
               }
            `}
            style={{ 
              bottom: `${value * 100}%`,
              transform: `translate(-50%, 50%)`, // Center the circle on the value point
              marginBottom: value === 0 ? '0px' : '0px' // Adjust if needed to not clip
            }}
          >
             {sound.iconPath ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className={isActive ? "w-6 h-6" : "w-6 h-6 opacity-50"}>
                  <path d={sound.iconPath} />
                </svg>
             ) : (
                <div className={`rounded-full bg-current w-3 h-3`} />
             )}
          </div>
       </div>
       
       {/* Label */}
       <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'dark:text-white text-black' : 'text-stone-400'}`}>
         {sound.label}
       </span>
    </div>
  );
};


// --- Orbital Fader Component ---
interface OrbitalFaderProps {
  sound: SoundConfig;
  angle: number;       
  minRadius: number;   
  maxRadius: number;   
  value: number;       
  onChange: (val: number) => void;
  onRipple: (x: number, y: number, color: string) => void;
  index: number;
}

const OrbitalFader: React.FC<OrbitalFaderProps> = ({ 
  sound, angle, minRadius, maxRadius, value, onChange, onRipple, index
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const currentRadius = maxRadius - (value * (maxRadius - minRadius));
  
  const radian = (angle * Math.PI) / 180;
  const x = Math.cos(radian) * currentRadius;
  const y = Math.sin(radian) * currentRadius;

  const colorClass = sound.color.split(' ').find(c => c.startsWith('text-')) || 'text-white';
  const glowColor = sound.color.split(' ').find(c => c.startsWith('shadow-')) || 'shadow-white/50';
  const borderColor = sound.color.split(' ').find(c => c.startsWith('border-')) || 'border-white';

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    onRipple(e.clientX, e.clientY, borderColor);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const ptrX = e.clientX - rect.left;
    const ptrY = e.clientY - rect.top;
    
    const dist = Math.sqrt(Math.pow(ptrX - centerX, 2) + Math.pow(ptrY - centerY, 2));
    const clampedDist = Math.max(minRadius, Math.min(maxRadius, dist));
    
    const distanceFraction = (clampedDist - minRadius) / (maxRadius - minRadius);
    const newValue = 1 - distanceFraction;
    
    onChange(newValue);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if(isDragging) onRipple(e.clientX, e.clientY, borderColor);
  };

  return (
    <>
      {/* The Visual Tether */}
      <div 
        className={`absolute top-1/2 left-1/2 origin-left h-[2px] rounded-full pointer-events-none transition-all duration-300
          ${value > 0 ? 'opacity-100' : 'opacity-20'}
        `}
        style={{ 
          width: `${currentRadius}px`,
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, transparent 0%, currentColor 100%)`,
          color: value > 0 ? 'inherit' : '#9ca3af', 
          zIndex: 0
        }}
      >
          <div className={`w-full h-full ${colorClass} opacity-50`} />
      </div>

      {/* The Orb (Draggable Handle) */}
      <div
        className={`absolute top-1/2 left-1/2 flex items-center justify-center cursor-pointer select-none touch-none
          transition-transform duration-75 ease-linear
        `}
        style={{
          transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
          zIndex: isDragging || value > 0 ? 50 : 20,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
         {/* Touch Target */}
         <div className="absolute w-20 h-20 rounded-full bg-transparent" />

         {/* Animation Wrapper for Float and Breathe */}
         <div 
           className="relative animate-float" 
           style={{ animationDelay: `${index * -0.5}s` }}
         >
             {/* Breathing Halo (Wavy Effect) */}
             {value > 0 && (
                <div 
                   className={`absolute inset-0 rounded-full border-2 ${borderColor} opacity-0 animate-breathe`} 
                   style={{ animationDelay: `${index * -0.3}s` }}
                />
             )}

             {/* Visual Orb */}
             <div className={`
               relative flex items-center justify-center rounded-full transition-all duration-300
               ${value > 0 
                  ? `w-14 h-14 md:w-16 md:h-16 bg-stone-50 dark:bg-stone-900 border-2 ${borderColor} ${glowColor} shadow-[0_0_20px_currentColor] scale-110` 
                  : `w-9 h-9 md:w-10 md:h-10 bg-white dark:bg-stone-800 border dark:border-stone-700 border-stone-200 opacity-60 hover:scale-110`
                }
             `}>
                {/* Active Core */}
                {value > 0 && (
                    <div className={`absolute inset-0 rounded-full opacity-20 bg-current animate-pulse ${colorClass}`} />
                )}

                <div className={`transition-all duration-300 relative z-10 ${value > 0 ? `${colorClass} scale-100` : `text-stone-400 dark:text-stone-600 scale-90`}`}>
                   <span className="font-sans font-bold text-[10px] md:text-xs tracking-widest uppercase">
                      {sound.label.split(' ')[0].substring(0, 3)}
                   </span>
                </div>
             </div>
         </div>
      </div>
    </>
  );
};


const App: React.FC = () => {
  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Mixer State
  const [tonalVolume, setTonalVolume] = useState(0.8);
  const [atmosVolume, setAtmosVolume] = useState(0.5);
  const [reverbLevel, setReverbLevel] = useState(0.3);
  const [movementLevel, setMovementLevel] = useState(0.5);
  const [brightnessLevel, setBrightnessLevel] = useState(0.5);

  const [currentTab, setCurrentTab] = useState<TabView>('backing');
  const [selectedPresetId, setSelectedPresetId] = useState<TonePresetId>('pure');
  const [width, height] = useWindowSize();
  
  // Ripple State
  const [ripples, setRipples] = useState<Ripple[]>([]);
  
  const [soundIntensities, setSoundIntensities] = useState<{[id: string]: number}>({});

  const tonalSounds = SOUND_LIBRARY.filter(s => s.category === SoundCategory.TONAL);
  const atmosSounds = SOUND_LIBRARY.filter(s => s.category === SoundCategory.ATMOSPHERE);

  const isSmall = width < 380;
  const isMobile = width < 768;
  
  const minRadius = isSmall ? 65 : (isMobile ? 85 : 130);
  const maxRadius = isSmall ? 120 : (isMobile ? 150 : 250);

  const addRipple = useCallback((x: number, y: number, borderColorClass: string) => {
    const id = Date.now() + Math.random();
    setRipples(prev => [...prev, { id, x, y, color: borderColorClass }]);
    setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
    }, 1200);
  }, []);

  const handleTonalChange = (soundId: string, value: number) => {
    const effectiveValue = value < 0.05 ? 0 : value;
    setSoundIntensities(prev => ({ ...prev, [soundId]: effectiveValue }));
    const sound = SOUND_LIBRARY.find(s => s.id === soundId);
    if (!sound) return;
    if (effectiveValue > 0) {
      if (!activeSoundIds.has(soundId)) {
        setActiveSoundIds(prev => new Set(prev).add(soundId));
        audioEngine.play(sound, effectiveValue);
      } else {
        audioEngine.setSoundIntensity(soundId, effectiveValue);
      }
    } else {
      if (activeSoundIds.has(soundId)) {
        setActiveSoundIds(prev => {
            const next = new Set(prev);
            next.delete(soundId);
            return next;
        });
        audioEngine.stop(sound);
      }
    }
  };
  
  const handleAtmosChange = (soundId: string, value: number) => {
     setSoundIntensities(prev => ({ ...prev, [soundId]: value }));
     const sound = SOUND_LIBRARY.find(s => s.id === soundId);
     if (!sound) return;
     if (value > 0) {
        if (!activeSoundIds.has(soundId)) {
           setActiveSoundIds(prev => new Set(prev).add(soundId));
           audioEngine.play(sound, value);
        } else {
           audioEngine.setSoundIntensity(soundId, value);
        }
     } else {
        if (activeSoundIds.has(soundId)) {
           setActiveSoundIds(prev => {
               const next = new Set(prev);
               next.delete(soundId);
               return next;
           });
           audioEngine.stop(sound);
        }
     }
  };

  const handlePresetSelect = (id: TonePresetId) => {
    setSelectedPresetId(id);
    audioEngine.setTonePreset(id);
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        audioEngine.suspend();
      } else {
        audioEngine.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      audioEngine.stopAll();
    };
  }, []);

  const CornerButton = ({ 
    label, onClick, isActive, positionClass, icon 
  }: { 
    label: string, onClick: () => void, isActive: boolean, positionClass: string, icon: React.ReactNode 
  }) => (
    <button
      onClick={onClick}
      className={`fixed ${positionClass} z-50 flex flex-col items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full transition-all duration-300
        ${isActive 
          ? 'bg-forest-700 text-white shadow-[0_0_15px_rgba(74,124,102,0.5)] scale-100' 
          : 'dark:bg-slate-900/50 bg-white/80 dark:text-slate-500 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 border dark:border-slate-800 border-slate-200 scale-90'
        }
      `}
    >
      <div className="mb-0.5 md:mb-1 transform scale-75 md:scale-100">{icon}</div>
      <span className="text-[7px] md:text-[9px] uppercase tracking-widest font-bold text-center leading-none">{label}</span>
    </button>
  );

  return (
    <div className={`${isDarkMode ? 'dark' : ''} fixed inset-0 w-full h-full`}>
      <div className="absolute inset-0 dark:bg-midnight bg-stone-50 text-stone-600 dark:text-stone-100 font-sans selection:bg-teal-500 selection:text-white overflow-hidden flex flex-col transition-colors duration-500">
        
        {/* --- Background / Visuals Layer --- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] bg-radial-gradient from-forest-900/10 to-transparent dark:from-forest-900/30" />
             {ripples.map(r => (
                <div 
                  key={r.id}
                  className={`absolute rounded-full animate-ripple blur-sm ${r.color}`}
                  style={{ 
                    left: r.x, top: r.y, width: '60px', height: '60px', marginLeft: '-30px', marginTop: '-30px', pointerEvents: 'none' 
                  }}
                />
             ))}
        </div>

        {/* --- Navigation --- */}
        <CornerButton 
          positionClass="top-[calc(env(safe-area-inset-top)+0.5rem)] left-[calc(env(safe-area-inset-left)+0.5rem)] md:top-[calc(env(safe-area-inset-top)+1rem)] md:left-[calc(env(safe-area-inset-left)+1rem)]" label="Harp" isActive={currentTab === 'harp'} onClick={() => setCurrentTab('harp')}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
        />
        <CornerButton 
          positionClass="top-[calc(env(safe-area-inset-top)+0.5rem)] right-[calc(env(safe-area-inset-right)+0.5rem)] md:top-[calc(env(safe-area-inset-top)+1rem)] md:right-[calc(env(safe-area-inset-right)+1rem)]" label="Visuals" isActive={currentTab === 'visuals'} onClick={() => setCurrentTab('visuals')}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
        />
        <CornerButton 
          positionClass="bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-[calc(env(safe-area-inset-left)+0.5rem)] md:bottom-[calc(env(safe-area-inset-bottom)+1rem)] md:left-[calc(env(safe-area-inset-left)+1rem)]" label="Forest" isActive={currentTab === 'backing'} onClick={() => setCurrentTab('backing')}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <CornerButton 
          positionClass="bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] right-[calc(env(safe-area-inset-right)+0.5rem)] md:bottom-[calc(env(safe-area-inset-bottom)+1rem)] md:right-[calc(env(safe-area-inset-right)+1rem)]" label="Mixer" isActive={currentTab === 'mixer'} onClick={() => setCurrentTab('mixer')}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
        />
        
        {/* Center Controls */}
        <div className="absolute top-[calc(env(safe-area-inset-top)+1.5rem)] left-1/2 -translate-x-1/2 z-40 flex items-center space-x-4">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full dark:bg-slate-800 bg-white text-stone-500 shadow hover:scale-110 transition-transform">
             {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             )}
           </button>
           <button onClick={() => setShowInfo(true)} className="p-2 rounded-full dark:bg-slate-800 bg-white text-stone-500 shadow hover:scale-110 transition-transform">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
        </div>

        {/* --- Main Content --- */}
        <main className="flex-1 relative w-full h-full flex flex-col items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
           
           {/* FOREST / MAIN TAB */}
           <div className={`transition-opacity duration-500 absolute inset-0 flex flex-col
             ${currentTab === 'backing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              
              {/* ORBITAL MIXER AREA */}
              <div className="flex-1 relative flex items-center justify-center touch-none mt-8">
                 
                 {/* VISUAL BACKGROUND LAYER */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute rounded-full border-2 border-stone-300/60 dark:border-stone-500/60 opacity-60" style={{ width: minRadius * 2, height: minRadius * 2 }} />
                    <div className="absolute rounded-full border-2 border-dashed border-stone-200/40 dark:border-stone-700/40 opacity-40" style={{ width: maxRadius * 2, height: maxRadius * 2 }} />
                    <svg className="absolute animate-spin-slow opacity-20 dark:opacity-30 text-forest-500" width={maxRadius * 2.5} height={maxRadius * 2.5} viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="2 4" />
                        <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="0.1" />
                        <path d="M50 2 L50 98 M2 50 L98 50" stroke="currentColor" strokeWidth="0.1" />
                        <path d="M16 16 L84 84 M84 16 L16 84" stroke="currentColor" strokeWidth="0.1" />
                    </svg>
                 </div>

                 <div className="absolute z-10 w-24 h-24 rounded-full border-2 border-stone-100 dark:border-stone-800 dark:bg-stone-900 bg-white flex items-center justify-center shadow-lg pointer-events-none">
                    <span className="text-[9px] uppercase tracking-widest opacity-40">Om</span>
                 </div>

                 {/* Container for Orbs */}
                 <div className="relative w-full h-full flex items-center justify-center">
                    {tonalSounds.map((sound, i) => {
                       const angle = (i / tonalSounds.length) * 360 - 90;
                       return (
                         <OrbitalFader
                           key={sound.id}
                           sound={sound}
                           angle={angle}
                           minRadius={minRadius}
                           maxRadius={maxRadius}
                           value={soundIntensities[sound.id] || 0}
                           onChange={(val) => handleTonalChange(sound.id, val)}
                           onRipple={addRipple}
                           index={i}
                         />
                       );
                    })}
                 </div>
              </div>

              {/* MIDDLE: Preset Selection (Moved Under Circle) */}
              <div className="w-full flex justify-center py-2 z-30 mb-2">
                 <div className="flex gap-1 p-1 bg-white/40 dark:bg-black/30 backdrop-blur-md rounded-full border border-white/20 dark:border-white/5 shadow-lg max-w-[90vw] overflow-x-auto no-scrollbar">
                    {TONE_PRESETS.map(preset => (
                       <button
                         key={preset.id}
                         onClick={() => handlePresetSelect(preset.id)}
                         className={`px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all whitespace-nowrap
                           ${selectedPresetId === preset.id 
                              ? 'bg-forest-600 text-white shadow-md scale-105' 
                              : 'text-stone-600 dark:text-stone-400 hover:bg-white/30 dark:hover:bg-white/10'
                           }
                         `}
                       >
                         {preset.name}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Bottom Atmosphere Dock */}
              <div className="h-44 mb-24 md:mb-10 w-full z-30 flex items-center justify-center pointer-events-none">
                 <div className="pointer-events-auto dark:bg-slate-900/80 bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-2xl border dark:border-slate-800 border-stone-200 flex gap-4 overflow-x-auto max-w-[95vw] no-scrollbar items-end">
                    {atmosSounds.map((sound) => (
                       <VerticalIconSlider
                          key={sound.id}
                          sound={sound}
                          value={soundIntensities[sound.id] || 0}
                          onChange={(val) => handleAtmosChange(sound.id, val)}
                       />
                    ))}
                 </div>
              </div>

           </div>
           
           {/* MIXER TAB */}
           <div className={`transition-opacity duration-500 absolute inset-0 flex flex-col items-center justify-center max-w-lg mx-auto p-6
             ${currentTab === 'mixer' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              
              <div className="w-full space-y-6 bg-white/50 dark:bg-black/20 p-8 rounded-2xl backdrop-blur-sm border dark:border-stone-800 border-stone-100 overflow-y-auto max-h-[80vh] no-scrollbar">
                 {/* Existing Volume Controls */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs uppercase tracking-wider font-bold opacity-70">Tonal Base Volume</label>
                      <span className="text-xs opacity-50">{Math.round(tonalVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={tonalVolume} onChange={(e) => {
                         const v = parseFloat(e.target.value);
                         setTonalVolume(v);
                         audioEngine.setVolume(SoundCategory.TONAL, v);
                      }}
                      className="w-full h-12 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10"
                    />
                    <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden -mt-8 relative z-0 pointer-events-none">
                        <div className="h-full bg-forest-500" style={{ width: `${tonalVolume * 100}%` }} />
                    </div>
                 </div>

                 <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs uppercase tracking-wider font-bold opacity-70">Atmosphere Volume</label>
                      <span className="text-xs opacity-50">{Math.round(atmosVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={atmosVolume} onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setAtmosVolume(v);
                        audioEngine.setVolume(SoundCategory.ATMOSPHERE, v);
                      }}
                      className="w-full h-12 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10"
                    />
                    <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden -mt-8 relative z-0 pointer-events-none">
                        <div className="h-full bg-teal-500" style={{ width: `${atmosVolume * 100}%` }} />
                    </div>
                 </div>

                 <hr className="border-stone-200 dark:border-stone-700 opacity-50 my-4" />
                 
                 {/* NEW MODIFIERS */}
                 <div className="space-y-6">
                    {/* Reverb Slider */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs uppercase tracking-wider font-bold opacity-70">Reverb Space</label>
                        <span className="text-xs opacity-50">{Math.round(reverbLevel * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={reverbLevel} onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setReverbLevel(v);
                          audioEngine.setReverb(v);
                        }}
                        className="w-full h-8 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10"
                      />
                      <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden -mt-6 relative z-0 pointer-events-none">
                          <div className="h-full bg-indigo-500" style={{ width: `${reverbLevel * 100}%` }} />
                      </div>
                    </div>

                    {/* Movement Slider */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs uppercase tracking-wider font-bold opacity-70">Tone Movement</label>
                        <span className="text-xs opacity-50">{Math.round(movementLevel * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={movementLevel} onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setMovementLevel(v);
                          audioEngine.setMovement(v);
                        }}
                        className="w-full h-8 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10"
                      />
                      <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden -mt-6 relative z-0 pointer-events-none">
                          <div className="h-full bg-fuchsia-500" style={{ width: `${movementLevel * 100}%` }} />
                      </div>
                    </div>

                    {/* Brightness Slider */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs uppercase tracking-wider font-bold opacity-70">Brightness</label>
                        <span className="text-xs opacity-50">{Math.round(brightnessLevel * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={brightnessLevel} onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setBrightnessLevel(v);
                          audioEngine.setBrightness(v);
                        }}
                        className="w-full h-8 bg-transparent rounded-lg appearance-none cursor-pointer relative z-10"
                      />
                      <div className="h-2 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden -mt-6 relative z-0 pointer-events-none">
                          <div className="h-full bg-amber-500" style={{ width: `${brightnessLevel * 100}%` }} />
                      </div>
                    </div>
                 </div>

              </div>
           </div>

           {/* PLACEHOLDERS */}
           <div className={`transition-opacity duration-500 absolute inset-0 flex flex-col items-center justify-center
             ${(currentTab === 'harp' || currentTab === 'visuals') ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <h1 className="text-2xl font-light opacity-50">Feature Coming Soon</h1>
              <p className="mt-2 opacity-30 text-sm uppercase tracking-widest">{currentTab}</p>
           </div>
        </main>
        
        <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
      </div>
    </div>
  );
};

export default App;
