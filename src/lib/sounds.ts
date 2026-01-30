class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      this.ctx =
        new // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number = 0.1,
  ) {
    this.init();
    if (!this.ctx) return;

    // Ensure context is running (especially for mobile)
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      this.ctx.currentTime + duration,
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playHover() {
    // Very subtle click
    this.playTone(800, "sine", 0.05, 0.02);
  }

  playSelectStart() {
    this.playTone(440, "sine", 0.1, 0.05);
  }

  playSuccess() {
    // High pitched "ding"
    this.playTone(880, "sine", 0.1, 0.1);
    setTimeout(() => this.playTone(1760, "sine", 0.3, 0.1), 100);
  }

  playError() {
    // Low buzzing "error"
    this.playTone(150, "sawtooth", 0.3, 0.05);
  }

  playLevelComplete() {
    // Victory fanfare
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, "square", 0.4, 0.1), i * 150);
    });
  }
}

export const sounds = new SoundManager();
