export enum SoundCategory {
  TONAL = 'TONAL',
  ATMOSPHERE = 'ATMOSPHERE'
}

export enum SoundType {
  DRONE = 'DRONE',
  NOISE = 'NOISE',
  WAVE = 'WAVE',
  BIRD = 'BIRD',
  WATERFALL = 'WATERFALL',
  CICADA = 'CICADA'
}

export type TonePresetId = 'pure' | 'warm' | 'astral' | 'organ';

export interface TonePreset {
  id: TonePresetId;
  name: string;
  description: string;
}

export interface SoundConfig {
  id: string;
  label: string;
  category: SoundCategory;
  type: SoundType;
  baseFrequency?: number; // For tonal sounds
  noiseType?: 'pink' | 'white' | 'brown'; // For atmosphere
  color: string; // Tailwind color class for glow
  iconPath?: string; // SVG path data
  isHalftone?: boolean;
}

export interface AudioTrack {
  source: AudioNode | null;
  gainNode: GainNode;
  isPlaying: boolean;
}