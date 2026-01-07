let audioContext: AudioContext | null = null;

export function playCompletionSound(): void {
  if (typeof window === "undefined") return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const ctx = audioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    oscillator.frequency.setValueAtTime(523.25, now);
    oscillator.frequency.setValueAtTime(659.25, now + 0.1);
    oscillator.frequency.setValueAtTime(783.99, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  } catch {
    // falha silenciosa: áudio não é funcionalidade crítica
  }
}
