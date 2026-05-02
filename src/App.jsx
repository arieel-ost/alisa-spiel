import { useState } from 'react'
import Game from './Game'
import './App.css'

function App() {
  const [view, setView] = useState('home') // home | game

  if (view === 'game') {
    return <Game onExit={() => setView('home')} />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🐱 Alysas Hüpf-Abenteuer</h1>
        <p className="untertitel">Lauf, springe und sammle Sterne!</p>
      </header>

      <main className="main">
        <div className="karte">
          <h2>🎮 So spielst du</h2>
          <ul className="ideen">
            <li>⬅️ ➡️ <strong>Pfeiltasten</strong> zum Laufen</li>
            <li>⬆️ <strong>Pfeil hoch</strong> oder <strong>Leertaste</strong> — kann <strong>2× springen</strong>! 💫</li>
            <li>⬇️ In der Luft <strong>Pfeil runter</strong> = Bodenstoss 💥</li>
            <li>❓ Springe von unten gegen Fragezeichen-Blöcke — oder Bodenstoss von oben!</li>
            <li>🔥❄️ Feuer/Eis sammeln, dann <strong>X</strong> zum Schiessen!</li>
            <li>🌈 Regenbogen = unverwundbar · 🛡️ Schild = blockt 1 Treffer · 🪶 Feder = <strong>nach vorne schweben</strong> (Sprung halten!)</li>
            <li>👑 Krone = +10 Punkte · 🪙 Münzen sammeln</li>
            <li>⭐ Sterne · 💎 Diamanten · ❤️ Herzen</li>
            <li>🚩 Erreiche die Flagge am Ende</li>
          </ul>
        </div>

        <div className="karte test-karte">
          <h2>Bereit?</h2>
          <button className="knopf" onClick={() => setView('game')}>
            🎮 Spiel starten!
          </button>
        </div>
      </main>

      <footer className="footer">
        <p>Viel Spass! Sag mir, wenn du etwas ändern möchtest. 💡</p>
      </footer>
    </div>
  )
}

export default App
