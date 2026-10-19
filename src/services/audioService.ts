// StayNexa KDS Web Audio API Synthesizer Engine
// Zero external asset dependency - synthesizes pleasant dual-tone acoustic chimes

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private isMuted: boolean = false;
  private alertIntervalId: ReturnType<typeof setInterval> | null = null;
  private isAlerting: boolean = false;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('staynexa_kds_muted');
      if (saved === 'true') {
        this.isMuted = true;
      }
    }
  }

  // Must be called on user interaction (click/touch) to unlock browser Autoplay
  public unlockAudio(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isUnlocked = true;
      return true;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
      return false;
    }
  }

  public getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      this.unlockAudio();
    }
    return this.audioCtx;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && !!this.audioCtx && this.audioCtx.state === 'running';
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('staynexa_kds_muted', this.isMuted ? 'true' : 'false');
    }
    if (this.isMuted) {
      this.stopContinuousAlert();
    }
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('staynexa_kds_muted', muted ? 'true' : 'false');
    }
    if (muted) {
      this.stopContinuousAlert();
    }
  }

  // Synthesizes a pleasant dual-tone chime: 880Hz (A5) then 1760Hz (A6)
  public playChime(): void {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 1760Hz (A6) with slight delay
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now + 0.15);

      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.25, now + 0.19);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Failed to synthesize chime:', e);
    }
  }

  // Start continuous 2-tone chime alert every intervalMs while new orders are active
  public startContinuousAlert(intervalMs: number = 4000): void {
    if (this.isMuted) return;
    if (this.isAlerting) return;

    this.isAlerting = true;
    this.playChime();

    this.alertIntervalId = setInterval(() => {
      if (!this.isMuted && this.isAlerting) {
        this.playChime();
      }
    }, intervalMs);
  }

  // Stop the continuous chime alert
  public stopContinuousAlert(): void {
    this.isAlerting = false;
    if (this.alertIntervalId) {
      clearInterval(this.alertIntervalId);
      this.alertIntervalId = null;
    }
  }

  public getIsAlerting(): boolean {
    return this.isAlerting && !this.isMuted;
  }
}

export const audioService = new AudioService();
