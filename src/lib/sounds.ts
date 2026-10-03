// Synthesized wooden "thock" sounds (no audio files needed).
let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

function knock(at: number, freq: number, gain: number, len = 0.09) {
  const a = ac();
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(a.currentTime + at);
}

export function playSound(kind: "move" | "capture" | "end") {
  try {
    if (ac().state === "suspended") void ac().resume();
    if (kind === "move") knock(0, 900, 2.2);
    else if (kind === "capture") { knock(0, 1300, 2.6); knock(0.045, 700, 2.4); }
    else { knock(0, 600, 2); knock(0.12, 800, 2); knock(0.24, 1000, 2); }
  } catch { /* audio unavailable */ }
}
