import { FADE_DURATION } from '../constants';
import { SoundConfig, SoundCategory, SoundType, TonePresetId } from '../types';

interface ActiveTrack {
  config: SoundConfig;
  source: AudioNode | null;
  gain: GainNode;
  setIntensity?: (val: number) => void;
  currentIntensity: number;
  cleanup?: () => void;
  stopTimeoutId?: number;
}

/**
 * AudioEngine
 * Encapsulates the Web Audio API logic for creating, playing, and stopping sounds.
 */
class AudioEngine {
  private context: AudioContext | null = null;
  private tracks: Map<string, ActiveTrack> = new Map();
  private masterGain: GainNode | null = null;
  private tonalGain: GainNode | null = null;
  private atmosGain: GainNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private bufferPromises: Map<string, Promise<AudioBuffer>> = new Map();
  
  // New Global Effects
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  
  private currentPresetId: TonePresetId = 'pure';
  
  // Global Modifiers (0.0 - 1.0)
  private globalMovement: number = 0.5;
  private globalBrightness: number = 0.5;

  constructor() {
    // Lazy init
  }

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master Output
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 1.0; 
      this.masterGain.connect(this.context.destination);

      // Reverb Setup (Send Effect)
      this.reverbNode = this.context.createConvolver();
      // Generate a lush 3-second impulse response
      this.reverbNode.buffer = this.createImpulseResponse(3.0, 2.0);
      
      this.reverbGain = this.context.createGain();
      this.reverbGain.gain.value = 0.3; // Default reverb level
      
      // Route Reverb to Master
      this.reverbNode.connect(this.masterGain);
      this.reverbGain.connect(this.reverbNode);

      // Group Gains
      this.tonalGain = this.context.createGain();
      this.tonalGain.gain.value = 0.5; 
      this.tonalGain.connect(this.masterGain);
      this.tonalGain.connect(this.reverbGain); // Send to reverb

      this.atmosGain = this.context.createGain();
      this.atmosGain.gain.value = 0.5; 
      this.atmosGain.connect(this.masterGain);
      this.atmosGain.connect(this.reverbGain); // Send to reverb
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public suspend() {
    if (this.context && this.context.state === 'running') {
      this.context.suspend();
    }
  }

  public resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * Generates a synthetic impulse response for reverb
   */
  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.context!.sampleRate;
    const length = rate * duration;
    const impulse = this.context!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        // Exponential decay function
        const n = i / length;
        const vol = Math.pow(1 - n, decay); 
        // White noise
        left[i] = (Math.random() * 2 - 1) * vol;
        right[i] = (Math.random() * 2 - 1) * vol;
    }
    return impulse;
  }

  // --- GLOBAL SETTERS ---

  public setReverb(value: number) {
    this.initContext();
    if (this.reverbGain && this.context) {
      this.reverbGain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
    }
  }

  public setMovement(value: number) {
    this.globalMovement = value;
    // Refresh all tracks to apply new movement multiplier
    this.tracks.forEach((track) => {
      // Re-trigger the synthesis setup if it relies on static params, 
      // but ideally we utilize the setIntensity or recreating logic.
      // For now, we recreate the tonal sources to apply new base LFO speeds.
      if (track.config.category === SoundCategory.TONAL && !this.shouldUseSample(track.config)) {
         void this.refreshTrack(track);
      }
    });
  }

  public setBrightness(value: number) {
    this.globalBrightness = value;
    this.tracks.forEach((track) => {
      if (track.config.category === SoundCategory.TONAL && !this.shouldUseSample(track.config)) {
         void this.refreshTrack(track);
      }
    });
  }

  public setTonePreset(presetId: TonePresetId) {
    if (this.currentPresetId === presetId) return;
    this.currentPresetId = presetId;
    
    // Refresh all active tonal tracks
    this.tracks.forEach((track) => {
      if (track.config.category === SoundCategory.TONAL) {
        void this.refreshTrack(track);
      }
    });
  }

  // Helper to seamlessly recreate a source node with new settings
  private async refreshTrack(track: ActiveTrack) {
      const oldSource = track.source;
      const currentIntensity = track.currentIntensity;
      const trackId = track.config.id;

      this.clearStopTimeout(track);
      track.cleanup?.();
      
      if (oldSource && (oldSource as any).stop) {
          try { (oldSource as any).stop(); } catch(e) {}
      }
      oldSource?.disconnect();
      
      const newSourceData = await this.createSourceForSound(track.config, track.gain);
      if (!newSourceData) return;

      const currentTrack = this.tracks.get(trackId);
      if (!currentTrack || currentTrack.currentIntensity === 0) {
        newSourceData.cleanup?.();
        newSourceData.node.disconnect();
        return;
      }

      currentTrack.source = newSourceData.node;
      currentTrack.setIntensity = newSourceData.setIntensity;
      currentTrack.cleanup = newSourceData.cleanup;
      if (newSourceData.setIntensity) {
        newSourceData.setIntensity(currentIntensity);
      }
  }

  public setVolume(category: SoundCategory, value: number) {
    this.initContext();
    const targetNode = category === SoundCategory.TONAL ? this.tonalGain : this.atmosGain;
    if (targetNode && this.context) {
      targetNode.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
    }
  }

  public setSoundIntensity(id: string, value: number) {
    const track = this.tracks.get(id);
    if (track) {
      track.currentIntensity = value;
      // Also update the gain node volume
      if (this.context) {
          track.gain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
      }
      if (track.setIntensity) {
        track.setIntensity(value);
      }
      if (value > 0) {
        this.clearStopTimeout(track);
      }
    }
  }

  private clearStopTimeout(track: ActiveTrack) {
    if (track.stopTimeoutId !== undefined) {
      clearTimeout(track.stopTimeoutId);
      track.stopTimeoutId = undefined;
    }
  }
  
  // --- PLAYBACK CONTROL ---

  public async play(sound: SoundConfig, initialIntensity: number = 0.5) {
      this.initContext();
      if (!this.context) return;
      
      // If already playing, just update intensity
      if (this.tracks.has(sound.id)) {
          this.setSoundIntensity(sound.id, initialIntensity);
          return;
      }

      const trackGain = this.context.createGain();
      trackGain.gain.value = 0; // Start at 0 for fade in
      
      // Route to correct bus
      if (sound.category === SoundCategory.TONAL) {
          trackGain.connect(this.tonalGain!);
      } else {
          trackGain.connect(this.atmosGain!);
      }

      const track: ActiveTrack = {
          config: sound,
          source: null,
          gain: trackGain,
          currentIntensity: initialIntensity,
          cleanup: undefined
      };

      this.tracks.set(sound.id, track);

      // Fade In
      trackGain.gain.setTargetAtTime(initialIntensity, this.context.currentTime, FADE_DURATION);

      const sourceData = await this.createSourceForSound(sound, trackGain);
      if (!sourceData) {
        this.tracks.delete(sound.id);
        trackGain.disconnect();
        return;
      }

      const currentTrack = this.tracks.get(sound.id);
      if (!currentTrack || currentTrack.currentIntensity === 0) {
        sourceData.cleanup?.();
        sourceData.node.disconnect();
        return;
      }

      currentTrack.source = sourceData.node;
      currentTrack.setIntensity = sourceData.setIntensity;
      currentTrack.cleanup = sourceData.cleanup;

      if (sourceData.setIntensity) {
          sourceData.setIntensity(initialIntensity);
      }
  }

  public stop(sound: SoundConfig) {
      const track = this.tracks.get(sound.id);
      if (!track || !this.context) return;

      track.currentIntensity = 0;
      this.clearStopTimeout(track);

      // Fade Out
      track.gain.gain.setTargetAtTime(0, this.context.currentTime, FADE_DURATION);

      // Cleanup after fade
      track.stopTimeoutId = window.setTimeout(() => {
          // Check if it hasn't been re-enabled
          const currentTrack = this.tracks.get(sound.id);
          if (!currentTrack || currentTrack.currentIntensity > 0) return;
          currentTrack.cleanup?.();
          if (currentTrack.source && (currentTrack.source as any).stop) {
              try { (currentTrack.source as any).stop(); } catch(e) {}
          }
          currentTrack.source?.disconnect();
          currentTrack.gain.disconnect();
          this.tracks.delete(sound.id);
      }, (FADE_DURATION + 0.5) * 1000);
  }

  public stopAll() {
      this.tracks.forEach(t => this.stop(t.config));
  }

  private async getAudioBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    const inFlight = this.bufferPromises.get(url);
    if (inFlight) return inFlight;

    const loadPromise = fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load audio: ${url}`);
        }
        return res.arrayBuffer();
      })
      .then((data) => this.context!.decodeAudioData(data));

    this.bufferPromises.set(url, loadPromise);
    try {
      const buffer = await loadPromise;
      this.bufferCache.set(url, buffer);
      return buffer;
    } finally {
      this.bufferPromises.delete(url);
    }
  }

  // --- SOURCE GENERATORS ---

  private createSource(sound: SoundConfig, destination: AudioNode): { node: AudioNode, setIntensity?: (val: number) => void, cleanup?: () => void } | null {
      if (!this.context) return null;

      if (sound.category === SoundCategory.TONAL && sound.baseFrequency) {
          return this.createTonalSource(sound.baseFrequency, destination);
      } else if (sound.category === SoundCategory.ATMOSPHERE) {
          return this.createAtmosSource(sound, destination);
      }
      return null;
  }

  private shouldUseSample(sound: SoundConfig): boolean {
      if (!sound.fileUrl) return false;
      if (sound.category === SoundCategory.TONAL) {
        return this.currentPresetId === 'pure';
      }
      return true;
  }

  private async createSourceForSound(
    sound: SoundConfig,
    output: AudioNode
  ): Promise<{ node: AudioNode, setIntensity?: (val: number) => void, cleanup?: () => void } | null> {
      if (this.shouldUseSample(sound)) {
        return this.createSampleSource(sound, output);
      }
      return this.createSource(sound, output);
  }

  private async createSampleSource(
    sound: SoundConfig,
    output: AudioNode
  ): Promise<{ node: AudioNode, setIntensity?: (val: number) => void, cleanup?: () => void } | null> {
      if (!this.context || !sound.fileUrl) return null;

      const resolvedUrl = new URL(sound.fileUrl, window.location.href).toString();
      const buffer = await this.getAudioBuffer(resolvedUrl);
      if (!buffer) return null;

      const src = this.context.createBufferSource();
      src.buffer = buffer;
      src.loop = sound.loop !== false;
      if (sound.category === SoundCategory.TONAL && sound.baseFrequency && sound.sampleBaseFrequency) {
        src.playbackRate.value = sound.baseFrequency / sound.sampleBaseFrequency;
      }
      src.connect(output);
      src.start();

      return {
        node: src,
        cleanup: () => {
          try { src.stop(); } catch(e) {}
          try { src.disconnect(); } catch(e) {}
        }
      };
  }

  private createTonalSource(freq: number, output: AudioNode) {
      // Common nodes
      const merger = this.context!.createChannelMerger(1);
      merger.connect(output);
      
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];
      const nodesToDisconnect: AudioNode[] = [merger];
      
      // Helpers
      const addOsc = (type: OscillatorType, f: number, g: number) => {
          const osc = this.context!.createOscillator();
          osc.type = type;
          osc.frequency.value = f;
          const gain = this.context!.createGain();
          gain.gain.value = g;
          osc.connect(gain);
          gain.connect(merger);
          osc.start();
          oscillators.push(osc);
          gains.push(gain);
          nodesToDisconnect.push(gain);
          return { osc, gain };
      };

      const brightnessVal = this.globalBrightness; // 0 to 1
      const movementVal = this.globalMovement; // 0 to 1

      // Preset Logic
      let setIntensityCallback = (val: number) => {};

      if (this.currentPresetId === 'pure') {
          // --- PURE CRYSTAL BOWL ---
          // Main fundamental
          addOsc('sine', freq, 0.7);
          
          // Slight detune for phasing/movement
          // Movement controls the detune spread (beat frequency)
          const detuneFactor = 1.0 + (0.002 * movementVal); 
          addOsc('sine', freq * detuneFactor, 0.3);

          // LFO for Amplitude Modulation (Wah-wah)
          const lfo = this.context!.createOscillator();
          const lfoFreq = 0.2 + (movementVal * 4.0); // 0.2Hz (calm) to 4.2Hz (shimmer)
          lfo.frequency.value = lfoFreq;
          
          const lfoGain = this.context!.createGain();
          lfoGain.gain.value = 0.15; // Depth of tremolo
          
          const masterGain = this.context!.createGain();
          masterGain.gain.value = 0.8;
          
          // Wire up LFO -> Gain
          merger.disconnect();
          merger.connect(masterGain);
          lfo.connect(lfoGain);
          lfoGain.connect(masterGain.gain);
          masterGain.connect(output);
          lfo.start();
          oscillators.push(lfo);
          nodesToDisconnect.push(lfoGain, masterGain);

          // Brightness controls a subtle overtone
          const harmonic = addOsc('sine', freq * 3, 0); // Start silent
          harmonic.gain.gain.value = brightnessVal * 0.15; // Controlled by brightness

      } else if (this.currentPresetId === 'warm') {
          // --- WARM PAD ---
          addOsc('triangle', freq, 0.5);
          addOsc('sine', freq * 0.5, 0.4); // Sub

          const filter = this.context!.createBiquadFilter();
          filter.type = 'lowpass';
          // Brightness controls cutoff
          const minCutoff = freq * 1.5;
          const maxCutoff = freq * 8;
          filter.frequency.value = minCutoff + (brightnessVal * (maxCutoff - minCutoff));
          
          merger.disconnect();
          merger.connect(filter);
          filter.connect(output);
          nodesToDisconnect.push(filter);

          // Movement controls slight Vibrato
          const vib = this.context!.createOscillator();
          vib.frequency.value = 3 + (movementVal * 3);
          const vibGain = this.context!.createGain();
          vibGain.gain.value = movementVal * 5; // Pitch modulation depth
          vib.connect(vibGain);
          
          oscillators.forEach(o => {
              if (o.frequency.value > 10) { // Don't modulate LFOs if any
                  vibGain.connect(o.frequency);
              }
          });
          vib.start();
          oscillators.push(vib);
          nodesToDisconnect.push(vibGain);

      } else if (this.currentPresetId === 'astral') {
          // --- ASTRAL SHIMMER ---
          addOsc('sine', freq, 0.6);
          const high = addOsc('sine', freq * 2, 0.2);
          
          // High Sparkles
          const sparkle = addOsc('triangle', freq * 4, 0.0);
          sparkle.gain.gain.value = brightnessVal * 0.1;

          // Movement controls LFO on the high harmonics
          const lfo = this.context!.createOscillator();
          lfo.frequency.value = 0.1 + (movementVal * 2);
          const lfoGain = this.context!.createGain();
          lfoGain.gain.value = 0.2;
          
          lfo.connect(lfoGain);
          lfoGain.connect(high.gain.gain);
          lfo.start();
          oscillators.push(lfo);
          nodesToDisconnect.push(lfoGain);

      } else if (this.currentPresetId === 'organ') {
           // --- ORGAN ---
           addOsc('sine', freq, 0.4);
           addOsc('triangle', freq * 2, 0.2);
           addOsc('sine', freq * 3, 0.1 * brightnessVal);
           
           // Leslie Effect (Tremolo)
           const trem = this.context!.createOscillator();
           trem.frequency.value = 1 + (movementVal * 5); // Speed
           const tremGain = this.context!.createGain();
           tremGain.gain.value = 0.2;
           
           const masterGain = this.context!.createGain();
           masterGain.gain.value = 0.7;
           merger.disconnect();
           merger.connect(masterGain);
           trem.connect(tremGain);
           tremGain.connect(masterGain.gain);
           masterGain.connect(output);
           trem.start();
           oscillators.push(trem);
           nodesToDisconnect.push(tremGain, masterGain);
      }

      return {
          node: merger, // The merger (or whatever replaced it) is the root
          setIntensity: (val: number) => {
              // Can optionally add intensity-specific modulation here
          },
          cleanup: () => {
              oscillators.forEach((osc) => {
                  try { osc.stop(); } catch(e) {}
                  try { osc.disconnect(); } catch(e) {}
              });
              nodesToDisconnect.forEach((node) => {
                  try { node.disconnect(); } catch(e) {}
              });
          }
      };
  }

  private createAtmosSource(sound: SoundConfig, output: AudioNode) {
      if (sound.type === SoundType.NOISE || sound.type === SoundType.WATERFALL || sound.type === SoundType.WAVE) {
          let noiseType: 'white'|'pink'|'brown' = 'white';
          if (sound.noiseType) noiseType = sound.noiseType;
          else if (sound.type === SoundType.WATERFALL) noiseType = 'brown';
          else if (sound.type === SoundType.WAVE) noiseType = 'pink';

          const buffer = this.createNoiseBuffer(noiseType);
          const src = this.context!.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          
          const filter = this.context!.createBiquadFilter();
          
          if (sound.id === 'atmos-wind') {
             filter.type = 'lowpass';
             filter.frequency.value = 400 + (this.globalBrightness * 400);
          } else if (sound.id === 'atmos-rain') {
             filter.type = 'lowpass';
             filter.frequency.value = 800 + (this.globalBrightness * 1000);
          } else if (sound.type === SoundType.WATERFALL) {
             filter.type = 'lowpass';
             filter.frequency.value = 500 + (this.globalBrightness * 500);
          } else if (sound.type === SoundType.WAVE) {
             filter.type = 'lowpass';
             filter.frequency.value = 300 + (this.globalBrightness * 300);
          } else {
             filter.type = 'allpass';
          }
          
          src.connect(filter);
          filter.connect(output);
          src.start();

          return {
              node: src,
              setIntensity: (val: number) => {
                  const m = this.globalMovement; 
                  if (sound.id === 'atmos-wind') {
                      // Intensity increases wind speed (filter mod)
                      // Movement adds randomness
                      filter.frequency.setTargetAtTime(200 + (val * 1000) + (Math.random() * 100 * m), this.context!.currentTime, 0.2);
                  }
                  if (sound.id === 'atmos-rain') {
                      filter.frequency.setTargetAtTime(400 + (val * 2000), this.context!.currentTime, 0.2);
                  }
              },
              cleanup: () => {
                  try { src.stop(); } catch(e) {}
                  try { src.disconnect(); } catch(e) {}
                  try { filter.disconnect(); } catch(e) {}
              }
          };
      }
      
      // Fallback/Simulations for Cicada, Birds etc.
      const osc = this.context!.createOscillator();
      if (sound.type === SoundType.CICADA) {
          osc.type = 'sawtooth';
          osc.frequency.value = 4000;
      } else {
          osc.type = 'sine';
          osc.frequency.value = 2000;
      }
      osc.connect(output);
      osc.start();

      return {
        node: osc,
        setIntensity: (val: number) => { },
        cleanup: () => {
          try { osc.stop(); } catch(e) {}
          try { osc.disconnect(); } catch(e) {}
        }
      };
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
    if (!this.context) throw new Error("No Audio Context");
    const bufferSize = 2 * this.context.sampleRate; // 2 seconds
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    } else { // Brown
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }
    }
    return buffer;
  }
}

export const audioEngine = new AudioEngine();
