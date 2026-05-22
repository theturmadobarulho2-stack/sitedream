'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './style.module.scss'
import characters from './characters'
import Button from '../../design-system/Button'
import KbdHint from '../../design-system/KbdHint'
import { useCanvasScale } from '../../lib/useCanvasScale'

const W = 480
const H = 640
const GRAVITY = 0.5
const JUMP = -9
const PIPE_WIDTH = 64
const PIPE_GAP = 160
const PIPE_SPEED = 3
const PIPE_INTERVAL = 1600 // ms

function randomChar() {
  return characters[Math.floor(Math.random() * characters.length)]
}

function getBestScore() {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem('dreamflappy_best') || '0', 10)
}
function saveBestScore(s) {
  if (typeof window === 'undefined') return
  const prev = getBestScore()
  if (s > prev) localStorage.setItem('dreamflappy_best', String(s))
}

export default function DreamFlappy() {
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const gameRef = useRef(null)
  const animRef = useRef(null)
  const lastPipeRef = useRef(0)
  const spriteRef = useRef(null)
  const pausedRef = useRef(false)
  const manualPauseRef = useRef(false)

  const [status, setStatus] = useState('idle') // idle | playing | gameover
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [character, setCharacter] = useState(null)
  const [isPaused, setIsPaused] = useState(false)

  // Responsive + hi-DPI scaling
  useCanvasScale(canvasRef, W, H)

  // Pause game loop when tab is hidden
  useEffect(() => {
    const onVisibility = () => { pausedRef.current = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Pick character once on mount
  useEffect(() => {
    const c = randomChar()
    setCharacter(c)
    setBestScore(getBestScore())
  }, [])

  // load sprite image when character changes
  useEffect(() => {
    if (!character) return
    const img = new Image()
    img.src = character.sprite
    img.onload = () => { spriteRef.current = img }
  }, [character])

  const initGame = useCallback(() => {
    gameRef.current = {
      bird: { x: 100, y: H / 2, vy: 0 },
      pipes: [],
      score: 0,
      alive: true,
    }
    lastPipeRef.current = performance.now()
    manualPauseRef.current = false
    setIsPaused(false)
  }, [])

  const jump = useCallback(() => {
    if (status === 'idle') {
      const c = randomChar()
      setCharacter(c)
      initGame()
      setStatus('playing')
      setScore(0)
      // if (locomotiveRef?.current) locomotiveRef.current.stop()
      return
    }
    if (status === 'gameover') {
      const c = randomChar()
      setCharacter(c)
      initGame()
      setStatus('playing')
      setScore(0)
      return
    }
    if (status === 'playing' && gameRef.current?.alive) {
      gameRef.current.bird.vy = JUMP
    }
  }, [status, initGame])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        jump()
      }
      if (e.code === 'KeyR' && status === 'gameover') jump()
      if (e.code === 'KeyP' && status === 'playing') {
        manualPauseRef.current = !manualPauseRef.current
        setIsPaused(manualPauseRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [jump, status])

  // game loop
  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const tick = (now) => {
      if (pausedRef.current || manualPauseRef.current) {
        lastPipeRef.current = now
        animRef.current = requestAnimationFrame(tick)
        return
      }
      const g = gameRef.current
      if (!g || !g.alive) return

      // spawn pipes
      if (now - lastPipeRef.current > PIPE_INTERVAL) {
        const top = 60 + Math.random() * (H - PIPE_GAP - 120)
        g.pipes.push({ x: W, top, passed: false })
        lastPipeRef.current = now
      }

      // physics
      g.bird.vy += GRAVITY
      g.bird.y += g.bird.vy

      // move pipes
      for (const p of g.pipes) {
        p.x -= PIPE_SPEED
        if (!p.passed && p.x + PIPE_WIDTH < g.bird.x) {
          p.passed = true
          g.score++
          setScore(g.score)
        }
      }
      g.pipes = g.pipes.filter(p => p.x + PIPE_WIDTH > 0)

      // collision — ceiling / floor
      if (g.bird.y - 20 < 0 || g.bird.y + 20 > H) {
        g.alive = false
        endGame(g.score)
        return
      }

      // collision — pipes (AABB, bird radius 20)
      for (const p of g.pipes) {
        const bx = g.bird.x
        const by = g.bird.y
        const inX = bx + 18 > p.x && bx - 18 < p.x + PIPE_WIDTH
        const inTop = by - 18 < p.top
        const inBot = by + 18 > p.top + PIPE_GAP
        if (inX && (inTop || inBot)) {
          g.alive = false
          endGame(g.score)
          return
        }
      }

      draw(ctx, g, now)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const endGame = (finalScore) => {
    saveBestScore(finalScore)
    setBestScore(getBestScore())
    setStatus('gameover')
    // if (locomotiveRef?.current) locomotiveRef.current.start()
  }

  const draw = (ctx, g, now) => {
    // background gradient — sky claro
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#dbeeff')
    grad.addColorStop(1, '#f0f8ff')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // estrelas → pontilhado azul suave
    ctx.fillStyle = 'rgba(77,179,246,0.25)'
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 17) % W)
      const sy = ((i * 97 + 53) % H)
      ctx.beginPath()
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2)
      ctx.fill()
    }

    // pipes
    for (const p of g.pipes) {
      drawPipe(ctx, p)
    }

    // bird / sprite
    if (spriteRef.current) {
      ctx.save()
      ctx.translate(g.bird.x, g.bird.y)
      const tilt = Math.max(-0.4, Math.min(0.6, g.bird.vy * 0.05))
      ctx.rotate(tilt)
      ctx.drawImage(spriteRef.current, -24, -24, 48, 48)
      ctx.restore()
    } else {
      // fallback circle
      ctx.fillStyle = '#4db3f6'
      ctx.beginPath()
      ctx.arc(g.bird.x, g.bird.y, 20, 0, Math.PI * 2)
      ctx.fill()
    }

    // score overlay
    ctx.fillStyle = 'rgba(10,15,30,0.85)'
    ctx.font = 'bold 32px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(g.score, W / 2, 48)
  }

  const drawPipe = (ctx, p) => {
    const radius = 6
    // neon glow azul
    ctx.shadowColor = '#1a88d4'
    ctx.shadowBlur = 16

    ctx.fillStyle = '#4db3f6'
    // top pipe
    roundRect(ctx, p.x, 0, PIPE_WIDTH, p.top, radius)
    // bottom pipe
    roundRect(ctx, p.x, p.top + PIPE_GAP, PIPE_WIDTH, H - p.top - PIPE_GAP, radius)

    ctx.shadowBlur = 0

    // pipe caps
    ctx.fillStyle = '#1a88d4'
    ctx.fillRect(p.x - 4, p.top - 16, PIPE_WIDTH + 8, 16)
    ctx.fillRect(p.x - 4, p.top + PIPE_GAP, PIPE_WIDTH + 8, 16)
  }

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
  }

  return (
    <section id="dream-flappy" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>DREAM FLAPPY</h2>
        <span className={styles.best}>RECORDE: {bestScore}</span>
      </div>

      <div className={styles.gameArea} ref={wrapperRef}>
        <div className={styles.gameWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onClick={jump}
          />

        {isPaused && status === 'playing' && (
          <div className={styles.pauseOverlay}>
            <p className={styles.pauseLabel}>PAUSADO</p>
            <p className={styles.pauseHint}>aperte P para continuar</p>
          </div>
        )}

        {status === 'idle' && character && (
          <div className={styles.overlay}>
            <div className={styles.charCard}>
              <img src={character.sprite} alt={character.name} className={styles.charImg} />
              <p className={styles.charName}>{character.name}</p>
              <p className={styles.charRole}>{character.role}</p>
            </div>
            <Button variant="neon" size="md" onClick={jump}>COMEÇAR</Button>
            <KbdHint keys={[{ key: 'ESPAÇO', action: 'pular' }]} />
          </div>
        )}

        {status === 'gameover' && character && (
          <div className={styles.overlay}>
            <p className={styles.gameoverLabel}>FIM DE JOGO</p>
            <p className={styles.scoreDisplay}>{score}</p>
            {score > 0 && score >= getBestScore() && (
              <p className={styles.newRecord}>NOVO RECORDE!</p>
            )}
            <div className={styles.phraseBox}>
              <img src={character.sprite} alt={character.name} className={styles.charImgSmall} />
              <p className={styles.phrase}>"{character.phrase}"</p>
              <p className={styles.phraseAuthor}>— {character.name}</p>
            </div>
            <Button variant="neon" size="md" onClick={jump}>TENTAR DE NOVO</Button>
            <KbdHint keys={[{ key: 'R', action: 'reiniciar' }]} />
          </div>
        )}
        </div>
      </div>
    </section>
  )
}
