export type SoundEffect = 
  | 'slingshotStretch'
  | 'birdLaunch'
  | 'abilityActivate'
  | 'blockHit'
  | 'blockDestroy'
  | 'pigDestroy'
  | 'levelComplete'
  | 'bgm';  // <--- 1. ADDED THIS

export class AudioManager {
  private buffers: Map<SoundEffect, AudioBuffer> = new Map();
  private context: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode; // <--- 2. New volume control just for music
  private bgmSource: AudioBufferSourceNode | null = null; // <--- 3. Track current music to stop/loop it
  private enabled: boolean = true;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Volume (Global)
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5; 
    this.masterGain.connect(this.context.destination);

    // Music Volume (Background only)
    // usually we want background music quieter than sound effects
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.4; 
    this.musicGain.connect(this.masterGain);
  }

  async loadAssets(): Promise<void> {
    const soundFiles: Record<SoundEffect, string> = {
      'slingshotStretch': '/assets/sounds/stretch.mp3',
      'birdLaunch':       '/assets/sounds/launch.mp3',
      'abilityActivate':  '/assets/sounds/ability.mp3',
      'blockHit':         '/assets/sounds/hit.mp3',
      'blockDestroy':     '/assets/sounds/wood_destroy.mp3',
      'pigDestroy':       '/assets/sounds/pig_destroy.mp3',
      'levelComplete':    '/assets/sounds/win.mp3',
      'bgm':              '/assets/sounds/bgm.mp3' // <--- 4. Add your music file path here
    };

    const promises = Object.entries(soundFiles).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
           throw new Error(`HTTP error ${response.status} for ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set(key as SoundEffect, audioBuffer);
        console.log(`Audio loaded: ${key}`);
      } catch (error) {
        console.warn(`Using fallback synth for: ${key} (File not found)`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Specialized method for Background Music
   * Handles looping and stopping previous tracks.
   */
  playMusic(effect: SoundEffect): void { 
    console.log(`Attempting to play music: ${effect}`);
  console.log(`Audio Context State: ${this.context.state}`); 
    if (!this.enabled) return;
   

    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    // Stop currently playing music if any
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource = null;
    }

    const buffer = this.buffers.get(effect);

    if (buffer) {
      this.bgmSource = this.context.createBufferSource();
      this.bgmSource.buffer = buffer;
      this.bgmSource.loop = true; // <--- 5. This makes it repeat forever
      this.bgmSource.connect(this.musicGain); // Connect to Music volume, not Master directly
      this.bgmSource.start(0);
    } else {
      console.warn(`Music track '${effect}' not found.`);
    }
  }

  stopMusic(): void {
    if (this.bgmSource) {
        this.bgmSource.stop();
        this.bgmSource = null;
    }
  }

  // Existing SFX play method
  play(effect: SoundEffect): void {
    if (!this.enabled) return;
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const buffer = this.buffers.get(effect);
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain); // SFX go directly to Master (louder)
      source.start(0);
    } else {
      this.playProceduralSound(effect);
    }
  }

  private playProceduralSound(soundEffect: SoundEffect): void {
    // ... (Keep your existing switch statement here for backups) ...
    // You don't need to add a case for 'bgm' here unless you want a generated beep loop
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
        if(this.context.state === 'suspended') this.context.resume();
        // If we re-enable, you might want to restart music, 
        // but usually just unmuting the context is enough.
    } else {
        this.stopMusic();
    }
  }
  
  isEnabled(): boolean { return this.enabled; }
}