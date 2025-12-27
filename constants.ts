import { SoundCategory, SoundConfig, SoundType, TonePreset } from './types';

export const FADE_DURATION = 3; // Seconds

export const TONE_PRESETS: TonePreset[] = [
  { id: 'pure', name: 'Pure Sine', description: 'Clean, simple sine waves for deep clarity.' },
  { id: 'warm', name: 'Warm Pad', description: 'Soft, filtered triangle waves for comfort.' },
  { id: 'astral', name: 'Astral', description: 'Shimmering harmonics with a gentle sway.' },
  { id: 'organ', name: 'Healing Organ', description: 'Rich, breathy tones inspired by pump organs.' },
];

// Traditional Yantra Geometries for Chakras
const ICONS = {
  // ROOT (Muladhara) - Square inside Circle (Earth Element)
  ROOT: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3.5 8h7v7h-7v-7z", 
  
  // SACRAL (Svadhisthana) - Crescent Moon inside Circle (Water Element)
  SACRAL: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17c-3.31 0-6-2.69-6-6 0-1.28.41-2.47 1.11-3.44C7.83 12.04 10.26 14 12 14s4.17-1.96 4.89-4.44c.7 .97 1.11 2.16 1.11 3.44 0 3.31-2.69 6-6 6z",
  
  // SOLAR (Manipura) - Downward Triangle inside Circle (Fire Element)
  SOLAR: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17L7 9h10l-5 10z",
  
  // HEART (Anahata) - Hexagram inside Circle (Air Element)
  HEART: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4.5l4 7h-8l4-7zm0 11l-4-7h8l-4 7z",
  
  // THROAT (Vishuddha) - Circle in Triangle in Circle (Ether Element)
  THROAT: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-5 7l5 8 5-8H7zm5 2.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z",
  
  // THIRD EYE (Ajna) - Two Petals (Wings) + Down Triangle
  THIRD_EYE: "M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm-10 7c0-4 4-7 8-7v14c-4 0-8-3-8-7zm20 0c0 4-4 7-8 7V5c4 0 8 3 8 7zm-10 1l-3-5h6l-3 5z",
  
  // CROWN (Sahasrara) - 1000 Petal Lotus (Radiant Star)
  CROWN: "M12 2l1.5 3.5 3.5-.5-1.5 3.5 3 2-3.5 1.5 1.5 3.5-3.5-.5L12 22l-1.5-3.5-3.5.5 1.5-3.5-3.5-1.5 3-2L4 9l3.5.5L9 6l3-4zm0 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  
  // OM Symbol (Simplified)
  OM: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5-5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM9 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
  
  // Nature Icons
  RAIN: "M4 16c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4 0-2.1-1.6-3.8-3.6-4-.2-2.3-2.1-4-4.4-4-1.8 0-3.4 1-4.2 2.5C9.1 10.3 8.6 10 8 10c-2.2 0-4 1.8-4 4h-.8C2.5 14.4 2 15.2 2 16h2zm3 6h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z",
  WIND: "M4 14h14c1.1 0 2-.9 2-2s-.9-2-2-2H4c-1.1 0-2 .9-2 2s.9 2 2 2zm18-5h-4c-1.1 0-2 .9-2 2s.9 2 2 2h4c1.1 0 2-.9 2-2s-.9-2-2-2zM3 8h10c1.1 0 2-.9 2-2s-.9-2-2-2H3c-1.1 0-2 .9-2 2s.9 2 2 2z",
  WAVE: "M2 12c0 1.6 1.3 3 2.8 3 1.2 0 2.3-.8 2.7-2 .4 1.2 1.5 2 2.7 2 1.2 0 2.3-.8 2.7-2 .4 1.2 1.5 2 2.7 2 1.2 0 2.3-.8 2.7-2 .3.9.9 1.6 1.7 1.9V12h-23z",
  BIRD: "M20 6c-1.5 0-3 .5-4.2 1.4-1.7-1-3.6-1.4-5.8-1.4-4 0-7.3 2.8-8.6 6.6 2.5-1.6 5.4-2.6 8.6-2.6 2.5 0 4.9.6 7 1.7V6h3z",
  WATERFALL: "M12 3v18m-4-14v10m8-10v10m-12-6v4m16-4v4",
  CICADA: "M12 2l2 4h-4l2-4zm-4 6l-3 3 3 3v-6zm8 0l3 3-3 3v-6zm-4 0v12h4v-12"
};

// 432Hz TUNING SCALE (C3 - C4)
// Based on A4 = 432Hz
export const SOUND_LIBRARY: SoundConfig[] = [
  // --- Tonal Base (Chromatic Octave) ---
  {
    id: 'drone-c',
    label: 'Sound Heal Me',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 128.43, 
    fileUrl: 'Audio/Roots/Sound%20Heal%20Me.mp3',
    loop: true,
    color: 'shadow-red-600/50 border-red-600 dark:text-red-500 text-red-600',
    iconPath: ICONS.ROOT
  },
  {
    id: 'drone-c-sharp',
    label: 'C#',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 136.07,
    color: 'shadow-red-800/50 border-red-800 dark:text-red-700 text-red-800',
    isHalftone: true
  },
  {
    id: 'drone-d',
    label: 'Sacral D',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 144.16,
    color: 'shadow-orange-500/50 border-orange-500 dark:text-orange-500 text-orange-600',
    iconPath: ICONS.SACRAL
  },
  {
    id: 'drone-d-sharp',
    label: 'D#',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 152.74,
    color: 'shadow-orange-700/50 border-orange-700 dark:text-orange-700 text-orange-800',
    isHalftone: true
  },
  {
    id: 'drone-e',
    label: 'Solar E',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 161.82,
    color: 'shadow-yellow-500/50 border-yellow-500 dark:text-yellow-500 text-yellow-600',
    iconPath: ICONS.SOLAR
  },
  {
    id: 'drone-f',
    label: 'Heart F',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 171.44,
    color: 'shadow-green-500/50 border-green-500 dark:text-green-500 text-green-600',
    iconPath: ICONS.HEART
  },
  {
    id: 'drone-f-sharp',
    label: 'F#',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 181.63,
    color: 'shadow-green-700/50 border-green-700 dark:text-green-700 text-green-800',
    isHalftone: true
  },
  {
    id: 'drone-g',
    label: 'Throat G',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 192.43,
    color: 'shadow-cyan-500/50 border-cyan-500 dark:text-cyan-500 text-cyan-600',
    iconPath: ICONS.THROAT
  },
  {
    id: 'drone-g-sharp',
    label: 'G#',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 203.88,
    color: 'shadow-cyan-700/50 border-cyan-700 dark:text-cyan-700 text-cyan-800',
    isHalftone: true
  },
  {
    id: 'drone-a',
    label: 'Eye A',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 216.00,
    color: 'shadow-indigo-500/50 border-indigo-500 dark:text-indigo-500 text-indigo-600',
    iconPath: ICONS.THIRD_EYE
  },
  {
    id: 'drone-a-sharp',
    label: 'A#',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 228.84,
    color: 'shadow-indigo-800/50 border-indigo-800 dark:text-indigo-800 text-indigo-900',
    isHalftone: true
  },
  {
    id: 'drone-b',
    label: 'Crown B',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 242.45,
    color: 'shadow-violet-500/50 border-violet-500 dark:text-violet-500 text-violet-600',
    iconPath: ICONS.CROWN
  },
  {
    id: 'drone-c-high',
    label: 'Soul C',
    category: SoundCategory.TONAL,
    type: SoundType.DRONE,
    baseFrequency: 256.87,
    color: 'shadow-fuchsia-300/50 border-fuchsia-300 dark:text-fuchsia-300 text-fuchsia-600',
    iconPath: ICONS.OM
  },
  
  // --- Atmosphere ---
  {
    id: 'atmos-rain',
    label: 'Rain',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.NOISE,
    noiseType: 'white',
    color: 'shadow-blue-400/50 border-blue-400 dark:text-blue-300 text-blue-600',
    iconPath: ICONS.RAIN
  },
  {
    id: 'atmos-wind',
    label: 'Wind',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.NOISE,
    noiseType: 'pink',
    color: 'shadow-slate-400/50 border-slate-400 dark:text-slate-300 text-slate-600',
    iconPath: ICONS.WIND
  },
  {
    id: 'atmos-waves',
    label: 'Waves',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.WAVE,
    color: 'shadow-teal-500/50 border-teal-500 dark:text-teal-300 text-teal-600',
    iconPath: ICONS.WAVE
  },
  {
    id: 'atmos-waterfall',
    label: 'Waterfall',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.WATERFALL,
    color: 'shadow-cyan-400/50 border-cyan-400 dark:text-cyan-300 text-cyan-600',
    iconPath: ICONS.WATERFALL
  },
  {
    id: 'atmos-birds',
    label: 'Birds',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.BIRD,
    baseFrequency: 2000,
    fileUrl: 'Audio/Athmospheres/Birds.mp3',
    loop: true,
    color: 'shadow-amber-300/50 border-amber-300 dark:text-amber-200 text-amber-600',
    iconPath: ICONS.BIRD
  },
  {
    id: 'atmos-cicada',
    label: 'Cicada',
    category: SoundCategory.ATMOSPHERE,
    type: SoundType.CICADA,
    color: 'shadow-lime-400/50 border-lime-400 dark:text-lime-300 text-lime-600',
    iconPath: ICONS.CICADA
  },
];
