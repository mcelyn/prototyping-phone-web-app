// Web Audio API synthesizer for realistic camera shutter sounds and beeps

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (highPitch ? 0.3 : 0.18));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (highPitch ? 0.31 : 0.19));
  } catch (e) {
    console.debug("Audio countdown beep error", e);
  }
}

/**
 * Multi-stage authentic mechanical SLR / film camera shutter sound:
 * 1. Mirror reflex slap
 * 2. Xenon flash spark
 * 3. Front curtain snap
 * 4. Rear curtain latch
 * 5. Motor-drive film advance winding
 */
export function playShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // --- 1. Mirror reflex slap (low-mid transient thud) ---
    const mirrorOsc = ctx.createOscillator();
    const mirrorGain = ctx.createGain();
    mirrorOsc.type = "triangle";
    mirrorOsc.frequency.setValueAtTime(180, t);
    mirrorOsc.frequency.exponentialRampToValueAtTime(45, t + 0.05);

    mirrorGain.gain.setValueAtTime(0.7, t);
    mirrorGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    mirrorOsc.connect(mirrorGain);
    mirrorGain.connect(ctx.destination);
    mirrorOsc.start(t);
    mirrorOsc.stop(t + 0.06);

    // --- 2. Shutter front curtain snap (crisp metallic snap) ---
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, t + 0.01);
    filter.Q.setValueAtTime(3.0, t + 0.01);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, t + 0.07);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(t + 0.01);
    whiteNoise.stop(t + 0.08);

    // --- 3. Rear curtain closing latch (second click at t + 0.09) ---
    const rearOsc = ctx.createOscillator();
    const rearGain = ctx.createGain();
    rearOsc.type = "sine";
    rearOsc.frequency.setValueAtTime(320, t + 0.09);
    rearOsc.frequency.exponentialRampToValueAtTime(80, t + 0.14);

    rearGain.gain.setValueAtTime(0, t);
    rearGain.gain.setValueAtTime(0.55, t + 0.09);
    rearGain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    rearOsc.connect(rearGain);
    rearGain.connect(ctx.destination);
    rearOsc.start(t + 0.09);
    rearOsc.stop(t + 0.15);

    // --- 4. Film motor advance winding sound (t + 0.15 to t + 0.32) ---
    const motorBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
    const motorData = motorBuffer.getChannelData(0);
    for (let i = 0; i < motorBuffer.length; i++) {
      const p = i / motorBuffer.length;
      motorData[i] = (Math.random() * 2 - 1) * (1 - p * 0.8) * Math.sin(i * 0.08);
    }
    const motorNoise = ctx.createBufferSource();
    motorNoise.buffer = motorBuffer;

    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = "bandpass";
    motorFilter.frequency.setValueAtTime(1400, t + 0.15);
    motorFilter.frequency.linearRampToValueAtTime(900, t + 0.32);
    motorFilter.Q.setValueAtTime(4.0, t + 0.15);

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0, t);
    motorGain.gain.setValueAtTime(0.3, t + 0.15);
    motorGain.gain.exponentialRampToValueAtTime(0.005, t + 0.32);

    motorNoise.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(ctx.destination);

    motorNoise.start(t + 0.15);
    motorNoise.stop(t + 0.33);
  } catch (e) {
    console.debug("Audio shutter error", e);
  }
}
