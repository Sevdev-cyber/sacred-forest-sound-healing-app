import React from 'react';
import { SoundConfig } from '../types';

interface SoundTileProps {
  sound: SoundConfig;
  isActive: boolean;
  onToggle: () => void;
  sizeClass?: string;
  isHalftone?: boolean;
}

const SoundTile: React.FC<SoundTileProps> = ({ sound, isActive, onToggle, sizeClass, isHalftone }) => {
  // Determine size based on type if not explicitly overridden
  const baseSize = sizeClass 
    ? sizeClass 
    : isHalftone 
      ? "w-10 h-10 md:w-12 md:h-12" 
      : "w-20 h-20 md:w-24 md:h-24";

  return (
    <button
      onClick={onToggle}
      className={`
        relative ${baseSize} rounded-full flex flex-col items-center justify-center
        transition-all duration-500 ease-out group z-10
        ${isActive 
          ? `dark:bg-slate-900 bg-white border-2 ${sound.color} scale-110 z-20` 
          : `dark:bg-slate-900/60 bg-white/60 border-2 dark:border-transparent border-stone-200 dark:hover:bg-slate-800 hover:bg-stone-50 ${isHalftone ? 'hover:scale-110' : 'hover:scale-105'}`
        }
      `}
      aria-pressed={isActive}
      title={sound.label}
    >
      {/* Glow Effect Background */}
      <div 
        className={`absolute inset-0 rounded-full transition-opacity duration-1000 ease-in-out pointer-events-none
          ${isActive ? 'opacity-40 animate-pulse' : 'opacity-0'}
          bg-current blur-md
        `}
        style={{ color: isActive ? 'inherit' : 'transparent' }} 
      />
      
      {/* Icon / Symbol */}
      <div className={`
        relative z-10 flex flex-col items-center justify-center transition-all duration-500
        ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}
      `}
      style={{ color: isActive ? 'inherit' : undefined }}
      >
        {/* If not active, apply default colors via class. If active, inherit from parent which has the `sound.color` classes */}
        <div className={isActive ? '' : 'dark:text-slate-400 text-stone-400'}>
          {sound.iconPath ? (
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className={`${isHalftone ? 'w-4 h-4' : 'w-8 h-8 md:w-10 md:h-10'}`}
            >
              <path d={sound.iconPath} />
            </svg>
          ) : (
            /* Fallback for halftones without specific icons */
            <div className={`rounded-full bg-current ${isHalftone ? 'w-3 h-3' : 'w-4 h-4'}`} />
          )}
        </div>
      </div>

      {/* Orbiting Dot Indicator */}
      <div className={`
        absolute -top-1 -right-1 w-2 h-2 rounded-full transition-all duration-700 border dark:border-slate-900 border-white
        ${isActive ? 'bg-current shadow-[0_0_8px_currentColor] opacity-100 scale-100' : 'bg-transparent opacity-0 scale-0'}
      `} />
    </button>
  );
};

export default SoundTile;