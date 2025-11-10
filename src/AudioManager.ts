export type SoundEffect = 
  | 'slingshotStretch'
  | 'birdLaunch'
  | 'abilityActivate'
  | 'blockHit'
  | 'blockDestroy'
  | 'pigDestroy'
  | 'levelComplete';

export class AudioManager {
  private sounds: Map<SoundEffect, AudioBuffer | null> = new Map();
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize Web Audio API context
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
    
    // Initialize sound placeholders
    this.initializeSounds();
  }

  private initializeSounds(): void {
    // Placeholder: In production, these would load actual audio files
    const soundEffects: SoundEffect[] = [
      'slingshotStretch',
      'birdLaunch',
      'abilityActivate',
      'blockHit',
      'blockDestroy',
      'pigDestroy',
      'levelComplete'
    ];
    
    soundEffects.forEach(effect => {
      this.sounds.set(effect, null);
    });
  }

  play(soundEffect: SoundEffect): void {
    if (!this.enabled || !this.audioContext) return;
    
    // For now, generate simple procedural sounds
    // In production, this would play pre-loaded audio files
    this.playProceduralSound(soundEffect);
  }

  private playProceduralSound(soundEffect: SoundEffect): void {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    // Create oscillator for simple sound effects
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Configure based on sound effect
    switch (soundEffect) {
      case 'slingshotStretch':
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'birdLaunch':
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
        
      case 'abilityActivate':
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
        
      case 'blockHit':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
        break;
        
      case 'blockDestroy':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;
        
      case 'pigDestroy':
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;
        
      case 'levelComplete':
        oscillator.frequency.setValueAtTime(523, now);
        oscillator.frequency.setValueAtTime(659, now + 0.15);
        oscillator.frequency.setValueAtTime(784, now + 0.3);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.setValueAtTime(0.2, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Method to load actual audio files (for production)
  async loadSound(soundEffect: SoundEffect, url: string): Promise<void> {
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(soundEffect, audioBuffer);
    } catch (error) {
      console.error(`Failed to load sound: ${soundEffect}`, error);
    }
  }

  // Method to play loaded audio buffer
  private playBuffer(buffer: AudioBuffer): void {
    if (!this.audioContext) return;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }
}