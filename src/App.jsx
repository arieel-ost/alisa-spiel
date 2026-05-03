import { useState } from 'react'
import Game from './Game'
import './App.css'

const CHARACTERS = [
  { emoji: '🐈', name: 'Katze' },
  { emoji: '🐕', name: 'Hund' },
  { emoji: '🐇', name: 'Hase' },
  { emoji: '🐢', name: 'Schildkröte' },
  { emoji: '🐅', name: 'Tiger' },
  { emoji: '🦄', name: 'Einhorn' },
  { emoji: '🦔', name: 'Igel' },
  { emoji: '🦘', name: 'Känguru' },
  { emoji: '🐘', name: 'Elefant' },
  { emoji: '🐎', name: 'Pferd' },
  { emoji: '🦒', name: 'Giraffe' },
  { emoji: '🐒', name: 'Alisa' },
  { emoji: '🦜', name: 'Niki', goofy: true },
]

function App() {
  const [view, setView] = useState('home') // home | game
  const [character, setCharacter] = useState('🐈')

  if (view === 'game') {
    return <Game onExit={() => setView('home')} character={character} />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>{character} Alysas Hüpf-Abenteuer</h1>
        <p className="untertitel">Lauf, springe und sammle Sterne!</p>
      </header>

      <main className="main">
        <div className="karte">
          <h2>🐾 Wähle deinen Charakter</h2>
          <div className="character-grid">
            {CHARACTERS.map((c) => (
              <button
                key={c.emoji}
                className={`character-btn ${character === c.emoji ? 'selected' : ''} ${c.goofy ? 'goofy' : ''}`}
                onClick={() => setCharacter(c.emoji)}
              >
                <span className="character-emoji">{c.emoji}{c.goofy && <span className="fart-mini">💨</span>}</span>
                <span className="character-name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="karte">
          <h2>🎮 So spielst du</h2>
          <ul className="ideen">
            <li>⬅️ ➡️ <strong>Pfeiltasten</strong> zum Laufen</li>
            <li>⬆️ <strong>Sprung</strong> · <strong>2× springen</strong> für Doppelsprung! 💫</li>
            <li>⬇️ In der Luft = Bodenstoss 💥 (knackt Blöcke von oben)</li>
            <li>❓ Springe von unten gegen Fragezeichen-Blöcke!</li>
            <li>🔥❄️ Feuer/Eis sammeln, dann <strong>X</strong> zum Schiessen!</li>
            <li>🌈 Regenbogen · 🛡️ Schild · 🧿 Hexer-Schild · 🪶 Feder = schweben</li>
            <li>🧲 Magnet · 💣 Bombe · ⏰ Zeit-Stopp · 💰 Geld · ⚡ Blitz</li>
            <li>👑 Krone = +10 · 🪙 Münzen · ⭐ Sterne · 💎 Diamanten · ❤️ Herzen</li>
            <li>🚩 Erreiche die Flagge am Ende</li>
          </ul>
        </div>

        <div className="karte test-karte">
          <h2>Bereit, {CHARACTERS.find((c) => c.emoji === character)?.name}?</h2>
          <button className="knopf" onClick={() => setView('game')}>
            🎮 Spiel starten!
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>100 Levels · 12 Charaktere · Viel Spass! 💡</p>
      </footer>
    </div>
  )
}

export default App
