// Mini Chiptune-Synth — generiert Hintergrund-Musik mit Web Audio API
// Eine kleine fröhliche Schleifenmelodie + Bass im 8-Bit-Stil

let ctx = null
let masterGain = null
let timer = null
let stepIndex = 0
let started = false
let muted = false

// Notenfrequenzen (vereinfacht). Index → MIDI-ähnliche Tonhöhe
const NOTE_FREQS = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
}

// Eine einfache, fröhliche Melodie (16 Schritte, je 1/8 Note)
const MELODY = [
  'E5', 'G5', 'C6', 'G5', 'A5', 'G5', 'E5', 'C5',
  'D5', 'F5', 'A5', 'F5', 'G5', 'F5', 'D5', 'B4',
  'E5', 'G5', 'C6', 'B5', 'A5', 'G5', 'F5', 'E5',
  'D5', 'E5', 'F5', 'G5', 'A5', 'G5', 'E5', 'C5',
]

const BASS = [
  'C3', 'C3', 'G3', 'G3', 'C3', 'C3', 'G3', 'G3',
  'F3', 'F3', 'C3', 'C3', 'F3', 'F3', 'C3', 'C3',
  'C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'E3', 'E3',
  'F3', 'F3', 'G3', 'G3', 'C3', 'C3', 'G3', 'G3',
]

const STEP_MS = 200 // ~120 BPM (1/8 Note)

function playNote(freq, duration, type, vol) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  osc.connect(gain).connect(masterGain)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

function tick() {
  if (!ctx || muted) return
  const melodyNote = MELODY[stepIndex % MELODY.length]
  const bassNote = BASS[stepIndex % BASS.length]
  if (melodyNote && NOTE_FREQS[melodyNote]) {
    playNote(NOTE_FREQS[melodyNote], STEP_MS / 1000 * 0.9, 'square', 0.07)
  }
  if (bassNote && NOTE_FREQS[bassNote] && stepIndex % 2 === 0) {
    playNote(NOTE_FREQS[bassNote], STEP_MS / 1000 * 1.5, 'triangle', 0.15)
  }
  stepIndex += 1
}

export function startMusic() {
  if (started) return
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)
    started = true
    timer = setInterval(tick, STEP_MS)
  } catch (e) {
    // Audio nicht verfügbar
  }
}

export function stopMusic() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (ctx) {
    ctx.close().catch(() => {})
    ctx = null
    masterGain = null
  }
  started = false
  stepIndex = 0
}

export function setMuted(m) {
  muted = m
  if (masterGain) {
    masterGain.gain.value = m ? 0 : 0.5
  }
}

export function isMusicStarted() {
  return started
}

// Kleine Sound-Effekte für besondere Momente
export function playSfx(kind) {
  if (!ctx || muted) return
  if (kind === 'jump') {
    playNote(660, 0.08, 'square', 0.12)
    setTimeout(() => playNote(880, 0.08, 'square', 0.1), 40)
  } else if (kind === 'collect') {
    playNote(1320, 0.08, 'square', 0.1)
    setTimeout(() => playNote(1760, 0.1, 'square', 0.1), 50)
  } else if (kind === 'hurt') {
    playNote(220, 0.2, 'sawtooth', 0.15)
  } else if (kind === 'powerup') {
    playNote(523, 0.08, 'square', 0.12)
    setTimeout(() => playNote(659, 0.08, 'square', 0.12), 70)
    setTimeout(() => playNote(784, 0.08, 'square', 0.12), 140)
    setTimeout(() => playNote(1047, 0.15, 'square', 0.14), 210)
  }
}
