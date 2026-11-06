// Web Audio API synthesizer for native camera sounds without external asset dependencies

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playCountdownBeep(highPitch = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(highPitch ? 880 : 587.33, ctx.currentTime); // A5 or D5

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (highPitch ? 0.25 : 0.15));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (highPitch ? 0.26 : 0.16));
  } catch (e) {
    console.debug("Audio play error", e);
  }
}

export function playShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Shutter mechanical click transient
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    // 2. White noise burst for shutter curtain sound
    const bufferSize = ctx.sampleRate * 0.1;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(t + 0.02);
    whiteNoise.stop(t + 0.13);
  } catch (e) {
    console.debug("Audio shutter error", e);
  }
}
