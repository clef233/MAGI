'use client'

import { useEffect, useRef } from 'react'

interface SplashProps {
  onComplete: () => void
}

export default function Splash({ onComplete }: SplashProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the font
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    // Run the boot animation
    const balthasar = document.getElementById('node-balthasar')
    const casper = document.getElementById('node-casper')
    const melchior = document.getElementById('node-melchior')
    const shingiBox = document.getElementById('ui-shingi')

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    function resetNodes() {
      [balthasar, casper, melchior].forEach(node => {
        if (node) {
          node.classList.remove('state-thinking', 'state-approved', 'state-rejected')
        }
      })
      if (shingiBox) {
        shingiBox.classList.remove('active')
      }
    }

    let running = true

    async function bootMagiOS() {
      // First cycle - show animation
      resetNodes()
      await wait(1500)

      if (!running) return

      shingiBox?.classList.add('active')
      ;[balthasar, casper, melchior].forEach(n => n?.classList.add('state-thinking'))
      await wait(3500)

      if (!running) return

      resetNodes()
      const states = ['state-approved', 'state-rejected']
      ;[balthasar, casper, melchior].forEach(n => {
        const randomState = states[Math.floor(Math.random() * 2)]
        n?.classList.add(randomState)
      })

      await wait(2500)

      // Animation complete, trigger callback
      if (running) {
        onComplete()
      }
    }

    bootMagiOS()

    return () => {
      running = false
      resetNodes()
    }
  }, [onComplete])

  return (
    <div ref={containerRef}>
      <style jsx global>{`
        :root {
          --c-bg: #000000;
          --c-orange: #f26600;
          --c-orange-dim: rgba(242, 102, 0, 0.4);
          --c-green-line: #2b7a5f;
          --c-fill-blue: #54a5d9;
          --c-fill-green: #67ff8c;
          --c-fill-red: #e30000;
          --c-text-idle: transparent;
          --c-text-dark: #0a1f2e;
          --c-yellow: #fec200;
          --hz-4: 0.4s;
        }

        .magi-splash-container {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          background-color: var(--c-bg);
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          font-family: 'Noto Serif JP', serif;
        }

        .magi-splash-svg {
          width: 100%;
          height: 100%;
          max-width: 1920px;
          max-height: 1080px;
          filter: drop-shadow(0 0 3px var(--c-orange-dim));
        }

        .magi-splash-svg text {
          font-weight: 900;
          user-select: none;
        }

        .magi-splash-svg .header-text { fill: var(--c-orange); letter-spacing: 0.1em; }
        .magi-splash-svg .magi-text { fill: var(--c-orange); letter-spacing: 0.25em; font-size: 48px; }
        .magi-splash-svg .node-text { fill: var(--c-text-idle); letter-spacing: 0.05em; font-size: 50px; }

        .magi-splash-svg .node-stroke {
          fill: transparent;
          stroke: var(--c-orange);
          stroke-width: 8;
          stroke-linejoin: miter;
        }

        .magi-splash-svg .scanline-mask {
          fill: url(#scanline-pattern);
          pointer-events: none;
        }

        @keyframes flash-fill-blue {
          0%, 49.9% { fill: var(--c-fill-blue); }
          50%, 100% { fill: transparent; }
        }
        @keyframes flash-text-dark {
          0%, 49.9% { fill: var(--c-text-dark); }
          50%, 100% { fill: transparent; }
        }
        .magi-splash-svg .state-thinking .node-fill { animation: flash-fill-blue var(--hz-4) steps(1, end) infinite; }
        .magi-splash-svg .state-thinking .node-text { animation: flash-text-dark var(--hz-4) steps(1, end) infinite; }

        .magi-splash-svg .state-approved .node-fill { fill: var(--c-fill-green); }
        .magi-splash-svg .state-approved .node-text { fill: var(--c-text-dark); }

        .magi-splash-svg .state-rejected .node-fill { fill: var(--c-fill-red); }
        .magi-splash-svg .state-rejected .node-text { fill: var(--c-text-dark); }

        .magi-splash-svg .shingi-box { opacity: 0; }
        .magi-splash-svg .shingi-box.active { opacity: 1; }
        @keyframes flash-shingi {
          0%, 49.9% { fill: var(--c-yellow); stroke: var(--c-yellow); }
          50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
        }
        .magi-splash-svg .shingi-box.active rect { animation: flash-shingi 1s steps(1, end) infinite; }
        .magi-splash-svg .shingi-box.active text { animation: flash-shingi 1s steps(1, end) infinite; stroke: none; }
      `}</style>

      <div className="magi-splash-container">
        <svg className="magi-splash-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="scanline-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
              <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            </pattern>
          </defs>

          <rect x="40" y="40" width="1840" height="1000" stroke="var(--c-orange)" strokeWidth="3" fill="none" />
          <rect x="70" y="70" width="1780" height="940" stroke="var(--c-orange)" strokeWidth="8" fill="none" />

          <g transform="translate(180, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" strokeWidth="6" />
            <text x="200" y="160" fontSize="140" textAnchor="middle" className="header-text">提訴</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" strokeWidth="6" />
          </g>

          <g transform="translate(1340, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" strokeWidth="6" />
            <text x="200" y="160" fontSize="140" textAnchor="middle" className="header-text">決議</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" strokeWidth="6" />
          </g>

          <g className="shingi-box" id="ui-shingi" transform="translate(1420, 420)">
            <rect x="0" y="0" width="240" height="80" strokeWidth="4" fill="none" />
            <text x="120" y="58" fontSize="50" textAnchor="middle" letterSpacing="0.1em">審議中</text>
          </g>

          <g stroke="var(--c-orange)" strokeWidth="30">
            <line x1="850" y1="860" x2="1070" y2="860" />
            <line x1="775" y1="515" x2="725" y2="675" />
            <line x1="1145" y1="515" x2="1195" y2="675" />
          </g>

          <text x="960" y="700" textAnchor="middle" className="magi-text">MAGI</text>

          <g id="node-balthasar" className="magi-group">
            <polygon className="node-fill" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" fill="transparent"/>
            <polygon className="scanline-mask" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <polygon className="node-stroke" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <text x="960" y="380" textAnchor="middle" className="node-text" fontSize="75">BALTHASAR</text>
          </g>

          <g id="node-casper" className="magi-group">
            <polygon className="node-fill" points="250,550 600,550 850,800 850,940 250,940" fill="transparent"/>
            <polygon className="scanline-mask" points="250,550 600,550 850,800 850,940 250,940" />
            <polygon className="node-stroke" points="250,550 600,550 850,800 850,940 250,940" />
            <text x="500" y="780" textAnchor="middle" className="node-text">CASPER</text>
          </g>

          <g id="node-melchior" className="magi-group">
            <polygon className="node-fill" points="1670,550 1320,550 1070,800 1070,940 1670,940" fill="transparent"/>
            <polygon className="scanline-mask" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <polygon className="node-stroke" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <text x="1370" y="780" textAnchor="middle" className="node-text">MELCHIOR</text>
          </g>
        </svg>
      </div>
    </div>
  )
}