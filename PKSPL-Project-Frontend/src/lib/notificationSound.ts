/**
 * Utility Audio Notifikasi Ringan berbasis Web Audio API
 * Menghasilkan suara denting halus (two-tone chime) tanpa ketergantungan file eksternal.
 * Aman dari browser autoplay restriction (failsafe tanpa console error).
 */

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Daftarkan listener interaksi pengguna pertama kali untuk meng-unlock AudioContext
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        isAudioUnlocked = true;
      }
    } catch {
      // ignore
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Memutar suara denting pesan baru yang lembut (WhatsApp/Slack style two-tone chime)
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      if (!isAudioUnlocked) return;
    }

    const now = ctx.currentTime;

    // Nada pertama: C6 (1046.5 Hz) -> Nada kedua: E6 (1318.5 Hz)
    const tones = [
      { freq: 784, start: now, duration: 0.12 },        // G5
      { freq: 1046.5, start: now + 0.08, duration: 0.25 } // C6
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Amplop volume lembut: attack cepat, decay eksponensial
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });
  } catch {
    // Failsafe: tidak menimbulkan error pada console jika audio belum diizinkan
  }
}
