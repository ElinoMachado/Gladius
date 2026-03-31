let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function resume(): void {
  void ctx()?.resume();
}

/** Partilhado com música ambiente e outros efeitos. */
export function ensureAudioContext(): AudioContext | null {
  return ctx();
}

/** Feedback curto em botões da UI. */
export function playUiClick(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(620, t);
  o.frequency.exponentialRampToValueAtTime(420, t + 0.045);
  const g = c.createGain();
  g.gain.setValueAtTime(0.085, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.08);
}

/** Disparo curto (pistoleiro). */
export function playGunshot(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const noise = c.createBufferSource();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.35));
  noise.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
  noise.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.08);
}

export function playGunVolley(count: number, staggerMs: number): void {
  for (let i = 0; i < count; i++) {
    window.setTimeout(() => playGunshot(), i * staggerMs);
  }
}

/** Impacto metálico / espada. */
export function playSwordHit(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.15);
}

/** Projétil mágico leve. */
export function playMagicWhoosh(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(2200, t + 0.08);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.13);
}

/** Múltiplos “hits” mágicos (sentença). */
export function playMagicBarrage(hits: number, staggerMs: number): void {
  for (let i = 0; i < hits; i++) {
    window.setTimeout(() => {
      const c = ctx();
      if (!c) return;
      resume();
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = 600 + i * 80;
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.1);
    }, i * staggerMs);
  }
}

/** Corte / faca (duelo). */
export function playKnifeCut(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const noise = c.createBufferSource();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.14), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  noise.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 700;
  const g = c.createGain();
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.13);
  noise.connect(f);
  f.connect(g);
  g.connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.15);
}

/** Explosão curta tipo mina terrestre. */
export function playLandmineExplosion(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const noise = c.createBufferSource();
  const n = Math.floor(c.sampleRate * 0.18);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.22));
  }
  noise.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 120;
  const g = c.createGain();
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  noise.connect(hp);
  hp.connect(g);
  g.connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.2);
}

/** Disparo de morteiro (grave + ruído). */
export function playMortarLaunch(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.35);
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.38);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.4);
}

/** Correntes + corte (ataque corpo a corpo do escravo). */
export function playEscravoChainSlash(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const n1 = c.createBufferSource();
  const buf1 = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate);
  const d1 = buf1.getChannelData(0);
  for (let i = 0; i < d1.length; i++) {
    d1[i] = (Math.random() * 2 - 1) * (1 - i / d1.length) * 0.85;
  }
  n1.buffer = buf1;
  const hp1 = c.createBiquadFilter();
  hp1.type = "bandpass";
  hp1.frequency.value = 1400;
  hp1.Q.value = 0.7;
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.2, t);
  g1.gain.exponentialRampToValueAtTime(0.01, t + 0.11);
  n1.connect(hp1);
  hp1.connect(g1);
  g1.connect(c.destination);
  n1.start(t);
  n1.stop(t + 0.12);
  const n2 = c.createBufferSource();
  const buf2 = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate);
  const d2 = buf2.getChannelData(0);
  for (let i = 0; i < d2.length; i++) {
    d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d2.length * 0.35));
  }
  n2.buffer = buf2;
  const hp2 = c.createBiquadFilter();
  hp2.type = "highpass";
  hp2.frequency.value = 600;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.14, t + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  n2.connect(hp2);
  hp2.connect(g2);
  g2.connect(c.destination);
  n2.start(t + 0.02);
  n2.stop(t + 0.11);
  const o = c.createOscillator();
  const go = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(180, t + 0.04);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  go.gain.setValueAtTime(0.1, t + 0.04);
  go.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  o.connect(go);
  go.connect(c.destination);
  o.start(t + 0.04);
  o.stop(t + 0.11);
}

/** Impacto pesado no alvo. */
export function playMortarImpact(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.3);
  playLandmineExplosion();
}

/** Ato falho / feedback de clique inválido (ex.: tentar entrar no bunker cedo demais). */
export function playInputError(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(520, t);
  o.frequency.linearRampToValueAtTime(260, t + 0.14);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.18);
}

/** Armas engatilhando (feedback ao entrar no bunker). */
export function playWeaponsCock(): void {
  const c = ctx();
  if (!c) return;
  resume();
  const t = c.currentTime;
  // Dois “clacks” mecânicos + ping metálico curto, mais alto/marcante.
  const mkClack = (at: number, freq: number, gain: number): void => {
    const noise = c.createBufferSource();
    const n = Math.floor(c.sampleRate * 0.06);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.09));
    }
    noise.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.01, at + 0.08);
    noise.connect(bp);
    bp.connect(g);
    g.connect(c.destination);
    noise.start(at);
    noise.stop(at + 0.09);
  };

  mkClack(t, 2100, 0.32);
  mkClack(t + 0.06, 1700, 0.28);

  const o = c.createOscillator();
  const g2 = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(980, t + 0.03);
  o.frequency.exponentialRampToValueAtTime(620, t + 0.14);
  g2.gain.setValueAtTime(0.18, t + 0.03);
  g2.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
  o.connect(g2);
  g2.connect(c.destination);
  o.start(t + 0.03);
  o.stop(t + 0.19);
}
