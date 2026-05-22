'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './style.module.scss'
import { CLIPS as clips } from '../../lib/clips'
import Button from '../../design-system/Button'
import KbdHint from '../../design-system/KbdHint'
import { useCanvasScale } from '../../lib/useCanvasScale'

// Canvas dimensions
const CW = 800
const CH = 500
// Paddle
const PW = 14
const PH = 100
const PX_L = 30
const PX_R = CW - 30 - PW
// Ball
const BR = 8
const SPEED0 = 4
// Game
const WIN = 3
const AI_K = 0.075

export default function ClipPong() {
  // ── Game refs (accessed in rAF loop) ──────────────────────────
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const pausedRef  = useRef(false)
  const manualPauseRef = useRef(false)
  const gradLRef   = useRef(null)
  const gradRRef   = useRef(null)
  const ball       = useRef({ x: CW / 2, y: CH / 2, vx: SPEED0, vy: 2 })
  const pyL        = useRef(CH / 2 - PH / 2)
  const pyR        = useRef(CH / 2 - PH / 2)
  const sL         = useRef(0)
  const sR         = useRef(0)
  const ciChamp    = useRef(0)
  const ciChall    = useRef(1)
  const defeatedR  = useRef(0)
  const statusRef  = useRef('idle')
  const glowRef    = useRef({ side: null, t: 0 })
  const ytL        = useRef(null)
  const ytR        = useRef(null)
  const audioTimer = useRef(null)
  const mouseY     = useRef(CH / 2)
  const keys       = useRef({})

  // ── UI state ──────────────────────────────────────────────────
  const [status,     setStatus    ] = useState('idle')
  const [uiSL,       setUiSL      ] = useState(0)
  const [uiSR,       setUiSR      ] = useState(0)
  const [uiChamp,    setUiChamp   ] = useState(0)
  const [uiChall,    setUiChall   ] = useState(1)
  const [uiDefeated, setUiDefeated] = useState(0)
  const [transMsg,   setTransMsg  ] = useState('')
  const [glowL,      setGlowL     ] = useState(false)
  const [glowR,      setGlowR     ] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [isPaused,   setIsPaused  ] = useState(false)
  const [ytReady,    setYtReady   ] = useState(false)

  // Responsive + hi-DPI scaling
  useCanvasScale(canvasRef, CW, CH)

  // ── Landscape warning (mobile portrait) ──────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait) and (max-width: 768px)')
    const check = () => setIsPortrait(mq.matches)
    check()
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  // ── Pause on tab hidden ────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      pausedRef.current = document.hidden
      if (document.hidden) {
        try { ytL.current?.mute(); ytR.current?.mute() } catch {}
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // ── Lazy YouTube IFrame API loader ─────────────────────────────
  // Só carrega quando o usuário clicar COMEÇAR (poupa ~150KB + 2 iframes em background)
  const ensureYouTube = () => {
    if (typeof window === 'undefined') return Promise.resolve()
    return new Promise((resolve) => {
      const initPlayers = () => {
        if (ytL.current) { setYtReady(true); resolve(); return }
        let readyCount = 0
        const onPlayerReady = (e) => {
          e.target.mute()
          readyCount++
          if (readyCount >= 2) { setYtReady(true); resolve() }
        }
        const make = (id, videoId) => new window.YT.Player(id, {
          videoId,
          playerVars: {
            autoplay: 1, mute: 1, controls: 0, loop: 1,
            playlist: videoId, rel: 0, modestbranding: 1,
            iv_load_policy: 3, playsinline: 1,
          },
          events: { onReady: onPlayerReady },
        })
        ytL.current = make('yt-pong-left',  clips[0].id)
        ytR.current = make('yt-pong-right', clips[1].id)
      }

      if (window.YT?.Player) {
        initPlayers()
      } else {
        const prev = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => { initPlayers(); prev?.() }
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const s = document.createElement('script')
          s.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(s)
        }
      }
    })
  }

  // ── Input listeners ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = e => {
      const r = canvas.getBoundingClientRect()
      mouseY.current = (e.clientY - r.top) * (CH / r.height)
    }
    const onTouch = e => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      mouseY.current = (e.touches[0].clientY - r.top) * (CH / r.height)
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('touchmove', onTouch, { passive: false })
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('touchmove', onTouch)
    }
  }, [])

  useEffect(() => {
    const dn = e => {
      keys.current[e.code] = true
      if (e.code === 'KeyP' && statusRef.current === 'playing') {
        manualPauseRef.current = !manualPauseRef.current
        setIsPaused(manualPauseRef.current)
      }
    }
    const up = e => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Game helpers ───────────────────────────────────────────────
  function resetBall(dir) {
    const vy = (Math.random() * 2.5 + 1) * (Math.random() > 0.5 ? 1 : -1)
    ball.current = { x: CW / 2, y: CH / 2, vx: SPEED0 * dir, vy }
    pyL.current = CH / 2 - PH / 2
    pyR.current = CH / 2 - PH / 2
  }

  function flashAudio(side) {
    if (audioTimer.current) clearTimeout(audioTimer.current)
    const winner = side === 'left' ? ytL.current : ytR.current
    const loser  = side === 'left' ? ytR.current : ytL.current
    try { winner?.unMute(); winner?.setVolume(80) } catch {}
    try { loser?.mute() } catch {}
    glowRef.current = { side, t: performance.now() }
    if (side === 'left') { setGlowL(true);  setGlowR(false) }
    else                 { setGlowR(true);  setGlowL(false) }
    audioTimer.current = setTimeout(() => {
      try { winner?.mute() } catch {}
      setGlowL(false); setGlowR(false)
    }, 1200)
  }

  function loadVideos(ci, ch) {
    try {
      ytL.current?.loadVideoById({ videoId: clips[ci].id })
      setTimeout(() => ytL.current?.mute(), 500)
    } catch {}
    try {
      ytR.current?.loadVideoById({ videoId: clips[ch].id })
      setTimeout(() => ytR.current?.mute(), 500)
    } catch {}
  }

  function startMatch(ci, ch) {
    sL.current = 0; sR.current = 0
    ciChamp.current = ci; ciChall.current = ch
    resetBall(1)
    loadVideos(ci, ch)
    setUiSL(0); setUiSR(0)
    setUiChamp(ci); setUiChall(ch)
    statusRef.current = 'playing'
    setStatus('playing')
  }

  function handleMatchEnd(winner) {
    cancelAnimationFrame(animRef.current)
    try { ytL.current?.mute(); ytR.current?.mute() } catch {}
    setGlowL(false); setGlowR(false)

    if (winner === 'left') {
      const newDefeated = defeatedR.current + 1
      defeatedR.current = newDefeated
      setUiDefeated(newDefeated)
      const nextChall = ciChall.current + 1

      if (newDefeated >= clips.length - 1) {
        statusRef.current = 'champion'
        setStatus('champion')
        try { ytL.current?.unMute(); ytL.current?.setVolume(100) } catch {}
      } else {
        statusRef.current = 'matchover'
        setStatus('matchover')
        setTransMsg(`PRÓXIMO DESAFIANTE: ${clips[nextChall].label}`)
        setTimeout(() => startMatch(ciChamp.current, nextChall), 2200)
      }
    } else {
      statusRef.current = 'gameover'
      setStatus('gameover')
    }
  }

  async function handleStart() {
    const s = statusRef.current
    if (s !== 'idle' && s !== 'gameover' && s !== 'champion') return
    statusRef.current = 'loading'
    setStatus('loading')
    await ensureYouTube()
    defeatedR.current = 0
    setUiDefeated(0)
    manualPauseRef.current = false
    setIsPaused(false)
    startMatch(0, 1)
  }

  // ── Game loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Cache gradients once per match — eram recriados em todo flash de gol
    gradLRef.current = ctx.createLinearGradient(0, 0, CW / 2, 0)
    gradLRef.current.addColorStop(0, 'rgba(77,179,246,1)')
    gradLRef.current.addColorStop(1, 'rgba(77,179,246,0)')
    gradRRef.current = ctx.createLinearGradient(CW / 2, 0, CW, 0)
    gradRRef.current.addColorStop(0, 'rgba(77,179,246,0)')
    gradRRef.current.addColorStop(1, 'rgba(77,179,246,1)')

    // Snapshot current-render functions so loop always calls latest version
    const _flash = (side) => flashAudio(side)
    const _end   = (w)    => handleMatchEnd(w)

    const tick = () => {
      if (statusRef.current !== 'playing') return
      if (pausedRef.current || manualPauseRef.current) {
        animRef.current = requestAnimationFrame(tick)
        return
      }
      const b = ball.current
      const k = keys.current

      // Left paddle — mouse + arrows
      const tgt = mouseY.current - PH / 2
      pyL.current += (tgt - pyL.current) * 0.2
      if (k['ArrowUp'])   pyL.current -= 7
      if (k['ArrowDown']) pyL.current += 7
      pyL.current = Math.max(0, Math.min(CH - PH, pyL.current))

      // Right paddle — AI
      pyR.current += ((b.y - PH / 2) - pyR.current) * AI_K
      pyR.current = Math.max(0, Math.min(CH - PH, pyR.current))

      // Cap ball speed ANTES da física (evita tunneling em sequência de colisões rápidas)
      const maxSpeed = 14
      if (Math.abs(b.vx) > maxSpeed) b.vx = Math.sign(b.vx) * maxSpeed
      if (Math.abs(b.vy) > maxSpeed) b.vy = Math.sign(b.vy) * maxSpeed

      // Ball movement
      b.x += b.vx
      b.y += b.vy

      // Wall bounce
      if (b.y - BR < 0)  { b.y = BR;      b.vy =  Math.abs(b.vy) }
      if (b.y + BR > CH) { b.y = CH - BR; b.vy = -Math.abs(b.vy) }

      // Left paddle collision
      if (b.vx < 0 &&
          b.x - BR <= PX_L + PW &&
          b.x - BR >= PX_L - 2 &&
          b.y + BR >= pyL.current &&
          b.y - BR <= pyL.current + PH) {
        b.vx = Math.abs(b.vx) * 1.05
        b.vy = ((b.y - (pyL.current + PH / 2)) / (PH / 2)) * 6
        b.x = PX_L + PW + BR + 1
      }

      // Right paddle collision
      if (b.vx > 0 &&
          b.x + BR >= PX_R &&
          b.x + BR <= PX_R + PW + 2 &&
          b.y + BR >= pyR.current &&
          b.y - BR <= pyR.current + PH) {
        b.vx = -Math.abs(b.vx) * 1.05
        b.vy = ((b.y - (pyR.current + PH / 2)) / (PH / 2)) * 6
        b.x = PX_R - BR - 1
      }

      // Goals
      if (b.x + BR < 0) {
        sR.current++
        setUiSR(sR.current)
        _flash('right')
        if (sR.current >= WIN) { _end('right'); return }
        resetBall(1)
      }
      if (b.x - BR > CW) {
        sL.current++
        setUiSL(sL.current)
        _flash('left')
        if (sL.current >= WIN) { _end('left'); return }
        resetBall(-1)
      }

      draw(ctx)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw ────────────────────────────────────────────────────────
  function draw(ctx) {
    const b = ball.current
    const g = glowRef.current
    const now = performance.now()

    // Background
    ctx.fillStyle = '#f0f6ff'
    ctx.fillRect(0, 0, CW, CH)

    // Center dashes
    ctx.setLineDash([10, 14])
    ctx.strokeStyle = 'rgba(77,179,246,0.25)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(CW / 2, 0); ctx.lineTo(CW / 2, CH); ctx.stroke()
    ctx.setLineDash([])

    // Glow flash on scoring side — usa gradientes cacheados via globalAlpha
    if (g.side && g.t) {
      const alpha = Math.max(0, (1 - (now - g.t) / 1200)) * 0.22
      if (alpha > 0) {
        const isLeft = g.side === 'left'
        ctx.globalAlpha = alpha
        ctx.fillStyle = isLeft ? gradLRef.current : gradRRef.current
        ctx.fillRect(isLeft ? 0 : CW / 2, 0, CW / 2, CH)
        ctx.globalAlpha = 1
      }
    }

    // Scores
    ctx.fillStyle = 'rgba(10,15,30,0.9)'
    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(sL.current, CW / 4, 62)
    ctx.fillText(sR.current, (3 * CW) / 4, 62)

    // Clip labels
    ctx.fillStyle = 'rgba(10,15,30,0.35)'
    ctx.font = '600 11px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(clips[ciChamp.current].label, PX_L + PW + 10, 20)
    ctx.textAlign = 'right'
    ctx.fillText(clips[ciChall.current].label, PX_R - 10, 20)

    // Defeated HUD
    ctx.fillStyle = 'rgba(77,179,246,0.65)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`DERROTADOS: ${defeatedR.current} / 9`, CW / 2, CH - 10)

    // Paddles — shadowBlur reduzido (era 18) para fluidez
    ctx.shadowBlur = 8; ctx.shadowColor = '#4db3f6'
    ctx.fillStyle = '#4db3f6'
    ctx.fillRect(PX_L, pyL.current, PW, PH)
    ctx.fillStyle = '#1a88d4'
    ctx.fillRect(PX_R, pyR.current, PW, PH)
    ctx.shadowBlur = 0

    // Ball — shadowBlur reduzido (era 28)
    ctx.shadowColor = '#b3daf9'; ctx.shadowBlur = 12
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <section id="clip-pong" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>CLIP PONG</h2>
        <span className={styles.sub}>REI DO PONG · {uiDefeated}/9</span>
      </div>

      <div className={styles.gameArea}>
        {/* YouTube iframes — always mounted as background */}
        <div className={styles.iframes}>
          <div className={`${styles.iframeHalf} ${glowL ? styles.iframeActive : ''}`}>
            <div id="yt-pong-left" className={styles.ytDiv} />
          </div>
          <div className={`${styles.iframeHalf} ${glowR ? styles.iframeActive : ''}`}>
            <div id="yt-pong-right" className={styles.ytDiv} />
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className={styles.canvas}
        />

        {isPaused && status === 'playing' && (
          <div className={styles.pauseOverlay}>
            <p className={styles.pauseLabel}>PAUSADO</p>
            <p className={styles.pauseHint}>aperte P para continuar</p>
          </div>
        )}

        {status === 'loading' && (
          <div className={styles.overlay}>
            <div className={styles.loadingSpinner} />
            <p className={styles.pongDesc}>Carregando partida…</p>
          </div>
        )}

        {status === 'idle' && (
          <div className={styles.overlay}>
            <p className={styles.pongTitle}>REI DO PONG</p>
            <p className={styles.pongDesc}>Derrote todos os 9 clipes para se tornar campeão.</p>
            <Button variant="neon" size="md" onClick={handleStart}>COMEÇAR</Button>
            <KbdHint keys={[{ key: '↑↓', action: 'mover' }, { key: 'MOUSE', action: 'mover' }]} />
          </div>
        )}

        {status === 'matchover' && (
          <div className={styles.overlayLight}>
            <p className={styles.transMsg}>{transMsg}</p>
          </div>
        )}

        {status === 'gameover' && (
          <div className={styles.overlay}>
            <p className={styles.goTitle}>FIM DE JOGO</p>
            <p className={styles.goSub}>{clips[uiChall].label} dominou o Pong</p>
            <p className={styles.goMini}>Você derrotou {uiDefeated} clipe{uiDefeated !== 1 ? 's' : ''}</p>
            <Button variant="neon" size="md" onClick={handleStart}>TENTAR DE NOVO</Button>
          </div>
        )}

        {status === 'champion' && (
          <div className={styles.overlay}>
            <p className={styles.champTitle}>TROFÉU DREAMSTATION</p>
            <p className={styles.champSub}>{clips[uiChamp].label} dominou todos os 9 clipes</p>
            <Button variant="neon" size="md" onClick={handleStart}>JOGAR DE NOVO</Button>
          </div>
        )}

        {isPortrait && (
          <div className={styles.rotateWarning}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16.48 2.52a3.5 3.5 0 0 1 0 4.95l-1.06 1.06a.5.5 0 0 1-.71 0l-4.24-4.24a.5.5 0 0 1 0-.71l1.06-1.06a3.5 3.5 0 0 1 4.95 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 18l-2 2M18 6l2-2M3 21h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" transform="rotate(-90 8 12) translate(-4 0)"/>
            </svg>
            <p>Gire o celular</p>
            <span>CLIP PONG é melhor em modo paisagem</span>
          </div>
        )}
      </div>
    </section>
  )
}
