'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './style.module.scss'
import { ALL_INGREDIENTS, getIng, getIngsForMode, generateOrder } from './ingredients'
import Button from '../../design-system/Button'
import KbdHint from '../../design-system/KbdHint'

// Canvas (belt area only)
const CW = 480
const CH = 220

// Belt
const BELT_Y = 110         // center Y of belt
const BELT_TOP = 50
const BELT_BTM = 170
const PIZZA_R = 50
const PIZZA_SPACING = 210  // distance between pizza centers on spawn

// Game config
const PIZZA_GOAL = 40
const MAX_MISTAKES = 5
const SPEED_MIN = 1.5
const SPEED_MAX = 3.5
const SPEED_INC = 0.2      // increase per 5 correct pizzas
const FREESTYLE_CHANCE = 0.12
const FREESTYLE_START = 10

// Streak bonuses: [threshold, bonus_points]
const STREAK_BONUSES = [[5,10],[10,15],[15,20],[20,25],[25,30],[30,35]]

function getBest(mode) {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(`dreampizzatron_best_${mode}`) || '0', 10)
}
function saveBest(mode, score) {
  if (typeof window === 'undefined') return
  if (score > getBest(mode)) localStorage.setItem(`dreampizzatron_best_${mode}`, String(score))
}

function streakBonus(streak) {
  let b = 0
  for (const [thresh, pts] of STREAK_BONUSES) {
    if (streak === thresh) { b = pts; break }
  }
  return b
}

export default function DreamPizzatron() {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const pausedRef  = useRef(false)

  // Mutable game state (accessed in RAF loop)
  const pizzasRef       = useRef([])
  const speedRef        = useRef(SPEED_MIN)
  const beltOffsetRef   = useRef(0)
  const pizzaIdRef      = useRef(0)
  const pizzasMadeRef   = useRef(0)
  const mistakesRef     = useRef(0)
  const scoreRef        = useRef(0)
  const streakRef       = useRef(0)
  const statusRef       = useRef('idle')
  const modeRef         = useRef('normal')
  const flashRef        = useRef(0)         // time of last mistake flash
  const selectedIngRef  = useRef(null)

  // UI state
  const [status,       setStatus      ] = useState('idle')
  const [score,        setScore       ] = useState(0)
  const [pizzasMade,   setPizzasMade  ] = useState(0)
  const [mistakes,     setMistakes    ] = useState(0)
  const [streak,       setStreak      ] = useState(0)
  const [candyMode,    setCandyMode   ] = useState(false)
  const [selectedIng,  setSelectedIng ] = useState(null)
  const [bestScore,    setBestScore   ] = useState(0)
  const [showFlash,    setShowFlash   ] = useState(false)
  const [activeOrder,  setActiveOrder ] = useState(null)  // {order, applied, isFreeStyle, bonus}

  // Pause on tab hidden
  useEffect(() => {
    const onVis = () => { pausedRef.current = document.hidden }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Sync candyMode ref
  useEffect(() => { modeRef.current = candyMode ? 'candy' : 'normal' }, [candyMode])

  // Sync selectedIng ref
  useEffect(() => { selectedIngRef.current = selectedIng }, [selectedIng])

  // ── Helpers ──────────────────────────────────────────────────────

  const getActivePizza = useCallback(() => {
    const incomplete = pizzasRef.current.filter(p => !p.done)
    if (!incomplete.length) return null
    return incomplete.reduce((min, p) => p.x < min.x ? p : min, incomplete[0])
  }, [])

  const syncActiveOrder = useCallback(() => {
    const active = getActivePizza()
    if (!active) { setActiveOrder(null); return }
    setActiveOrder({
      order: active.order,
      applied: [...active.applied],
      isFreeStyle: active.isFreeStyle,
      bonus: active.freestyleBonus,
    })
  }, [getActivePizza])

  const triggerFlash = useCallback(() => {
    flashRef.current = performance.now()
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 450)
  }, [])

  const endGame = useCallback((result) => {
    cancelAnimationFrame(animRef.current)
    const mode = modeRef.current
    saveBest(mode, scoreRef.current)
    setBestScore(getBest(mode))
    statusRef.current = result
    setStatus(result)
    setScore(scoreRef.current)
  }, [])

  const handleMistake = useCallback(() => {
    mistakesRef.current++
    streakRef.current = 0
    setMistakes(mistakesRef.current)
    setStreak(0)
    triggerFlash()
    if (mistakesRef.current >= MAX_MISTAKES) endGame('gameover')
  }, [triggerFlash, endGame])

  const completePizza = useCallback((pizza) => {
    pizza.done = true
    const mode = modeRef.current
    const pts = mode === 'candy' ? 10 : 5
    const bonus = streakBonus(streakRef.current + 1) + (pizza.isFreeStyle ? pizza.freestyleBonus : 0)
    streakRef.current++
    scoreRef.current += pts + bonus
    pizzasMadeRef.current++

    speedRef.current = Math.min(
      SPEED_MAX,
      SPEED_MIN + Math.floor(pizzasMadeRef.current / 5) * SPEED_INC
    )

    setScore(scoreRef.current)
    setStreak(streakRef.current)
    setPizzasMade(pizzasMadeRef.current)
    syncActiveOrder()

    if (pizzasMadeRef.current >= PIZZA_GOAL) endGame('victory')
  }, [syncActiveOrder, endGame])

  const spawnPizza = useCallback(() => {
    const mode = modeRef.current
    const isFS = pizzasMadeRef.current >= FREESTYLE_START && Math.random() < FREESTYLE_CHANCE
    const pizza = {
      id: pizzaIdRef.current++,
      x: CW + 30,
      order:         isFS ? [] : generateOrder(pizzasMadeRef.current, mode),
      applied:       [],
      isFreeStyle:   isFS,
      freestyleBonus: 0,
      done:          false,
      errorFlash:    0,
    }
    pizzasRef.current.push(pizza)
    syncActiveOrder()
  }, [syncActiveOrder])

  // ── Ingredient click ─────────────────────────────────────────────

  const handleIngredientClick = useCallback((ingId) => {
    if (statusRef.current !== 'playing') return

    setSelectedIng(ingId)
    selectedIngRef.current = ingId

    const pizza = getActivePizza()
    if (!pizza) return

    if (pizza.isFreeStyle) {
      pizza.applied.push(ingId)
      pizza.freestyleBonus += 2
      scoreRef.current += 2
      setScore(scoreRef.current)
      syncActiveOrder()
      return
    }

    const expected = pizza.order[pizza.applied.length]
    if (ingId === expected) {
      pizza.applied.push(ingId)
      pizza.errorFlash = 0
      syncActiveOrder()
      if (pizza.applied.length === pizza.order.length) {
        completePizza(pizza)
      }
    } else {
      pizza.errorFlash = performance.now()
      handleMistake()
    }
  }, [getActivePizza, completePizza, handleMistake, syncActiveOrder])

  // ── Keyboard ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e) => {
      if (statusRef.current !== 'playing') return
      const mode = modeRef.current
      const ings = getIngsForMode(mode)
      const idx = parseInt(e.key, 10) - 1
      if (idx >= 0 && idx < ings.length) {
        handleIngredientClick(ings[idx].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleIngredientClick])

  // ── Start / Reset ────────────────────────────────────────────────

  const startGame = useCallback(() => {
    pizzasRef.current      = []
    speedRef.current       = SPEED_MIN
    beltOffsetRef.current  = 0
    pizzaIdRef.current     = 0
    pizzasMadeRef.current  = 0
    mistakesRef.current    = 0
    scoreRef.current       = 0
    streakRef.current      = 0
    flashRef.current       = 0
    statusRef.current      = 'playing'

    setScore(0); setPizzasMade(0); setMistakes(0); setStreak(0)
    setSelectedIng(null); setActiveOrder(null); setShowFlash(false)
    setBestScore(getBest(modeRef.current))
    setStatus('playing')

    // Spawn first pizza immediately
    spawnPizza()
  }, [spawnPizza])

  // ── Game loop ────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    const tick = (now) => {
      if (statusRef.current !== 'playing') return
      if (pausedRef.current) { animRef.current = requestAnimationFrame(tick); return }

      // Move belt offset (visual only)
      beltOffsetRef.current = (beltOffsetRef.current + speedRef.current) % 40

      // Move pizzas
      for (const p of pizzasRef.current) {
        p.x -= speedRef.current
      }

      // Check exits
      const exited = pizzasRef.current.filter(p => p.x + PIZZA_R < 0)
      for (const p of exited) {
        if (!p.done && !p.isFreeStyle && p.applied.length < p.order.length) {
          mistakesRef.current++
          streakRef.current = 0
          flashRef.current = now
          setMistakes(mistakesRef.current)
          setStreak(0)
          setShowFlash(true)
          setTimeout(() => setShowFlash(false), 450)
          if (mistakesRef.current >= MAX_MISTAKES) {
            pizzasRef.current = pizzasRef.current.filter(p2 => p2.x + PIZZA_R >= 0)
            endGame('gameover')
            return
          }
        } else if (!p.done && p.isFreeStyle) {
          // Freestyle exit always counts as made
          p.done = true
          scoreRef.current += p.freestyleBonus
          streakRef.current++
          pizzasMadeRef.current++
          speedRef.current = Math.min(SPEED_MAX, SPEED_MIN + Math.floor(pizzasMadeRef.current / 5) * SPEED_INC)
          setScore(scoreRef.current)
          setStreak(streakRef.current)
          setPizzasMade(pizzasMadeRef.current)
          if (pizzasMadeRef.current >= PIZZA_GOAL) {
            pizzasRef.current = pizzasRef.current.filter(p2 => p2.x + PIZZA_R >= 0)
            endGame('victory')
            return
          }
        }
      }

      // Remove exited
      pizzasRef.current = pizzasRef.current.filter(p => p.x + PIZZA_R >= 0)

      // Spawn next pizza only when no incomplete pizza is on the belt
      const hasIncomplete = pizzasRef.current.some(p => !p.done)
      if (!hasIncomplete) {
        spawnPizza()
      }

      draw(ctx, now)
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw ─────────────────────────────────────────────────────────

  function draw(ctx, now) {
    ctx.clearRect(0, 0, CW, CH)

    // Background
    ctx.fillStyle = '#f0f6ff'
    ctx.fillRect(0, 0, CW, CH)

    drawBelt(ctx)

    for (const p of pizzasRef.current) {
      drawPizza(ctx, p, now)
    }
  }

  function drawBelt(ctx) {
    // Belt shadow top/bottom
    ctx.fillStyle = '#dde8f4'
    ctx.fillRect(0, BELT_TOP - 4, CW, 8)
    ctx.fillRect(0, BELT_BTM - 4, CW, 8)

    // Belt surface
    ctx.fillStyle = '#e4eef8'
    ctx.fillRect(0, BELT_TOP, CW, BELT_BTM - BELT_TOP)

    // Moving horizontal dashes
    ctx.strokeStyle = '#c8d8ec'
    ctx.lineWidth = 2
    ctx.setLineDash([18, 14])
    const off = beltOffsetRef.current
    for (let y = BELT_TOP + 12; y < BELT_BTM; y += 28) {
      ctx.beginPath()
      ctx.moveTo(-off, y)
      ctx.lineTo(CW - off + 40, y)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Belt edge rails
    ctx.strokeStyle = '#b3c8e0'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, BELT_TOP); ctx.lineTo(CW, BELT_TOP); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, BELT_BTM); ctx.lineTo(CW, BELT_BTM); ctx.stroke()

    // Work zone highlight (where active pizza should be)
    ctx.fillStyle = 'rgba(77,179,246,0.06)'
    ctx.fillRect(40, BELT_TOP, 160, BELT_BTM - BELT_TOP)
  }

  function drawPizza(ctx, pizza, now) {
    const x = pizza.x
    const y = BELT_Y
    const isActive = !pizza.done && pizzasRef.current
      .filter(p => !p.done)
      .sort((a, b) => a.x - b.x)[0]?.id === pizza.id

    const hasError = pizza.errorFlash && (now - pizza.errorFlash) < 400

    // Drop shadow
    ctx.shadowColor = 'rgba(77,179,246,0.3)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4

    // Pizza base
    ctx.fillStyle = '#fffbf4'
    ctx.strokeStyle = hasError ? '#ef4444' : isActive ? '#4db3f6' : '#b3daf9'
    ctx.lineWidth = hasError ? 3 : isActive ? 3 : 2
    ctx.beginPath()
    ctx.arc(x, y, PIZZA_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // Draw applied ingredients
    pizza.applied.forEach((ingId, i) => {
      drawIngOnPizza(ctx, x, y, ingId, i, pizza.id)
    })

    // Pizza crust ring
    ctx.strokeStyle = '#e5c87a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(x, y, PIZZA_R - 2, 0, Math.PI * 2)
    ctx.stroke()

    // Active indicator (arrow below)
    if (isActive) {
      ctx.fillStyle = '#4db3f6'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('▲', x, y + PIZZA_R + 16)
    }

    // Error flash X
    if (hasError) {
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('✕', x, y + 8)
    }
  }

  function drawIngOnPizza(ctx, cx, cy, ingId, idx, pizzaId) {
    const ing = getIng(ingId)
    if (!ing) return

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, PIZZA_R - 7, 0, Math.PI * 2)
    ctx.clip()

    if (ing.category === 'sauce') {
      ctx.globalAlpha = 0.65
      ctx.fillStyle = ing.color
      ctx.beginPath()
      ctx.arc(cx, cy, PIZZA_R - 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    } else if (ing.category === 'cheese') {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2
        const r = PIZZA_R * 0.52
        ctx.fillStyle = ing.color
        ctx.beginPath()
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = ing.color
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Toppings: 4 blobs seeded by pizzaId + idx
      const seed = (pizzaId * 31 + idx * 17 + ing.id.charCodeAt(0)) % 360
      for (let i = 0; i < 4; i++) {
        const angle = ((seed + i * 90) % 360) * Math.PI / 180
        const r = PIZZA_R * 0.45
        ctx.fillStyle = ing.color
        ctx.beginPath()
        ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }

  // ── Render ───────────────────────────────────────────────────────

  const mode = candyMode ? 'candy' : 'normal'
  const currentIngs = getIngsForMode(mode)
  const sauces   = currentIngs.filter(i => i.category === 'sauce')
  const cheeses  = currentIngs.filter(i => i.category === 'cheese')
  const toppings = currentIngs.filter(i => i.category === 'topping')

  const isPlaying = status === 'playing'

  return (
    <section id="dream-pizzatron" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>DREAM PIZZATRON</h2>
        <span className={styles.best}>REC: {bestScore}</span>
      </div>

      <div className={`${styles.gameWrapper} ${!isPlaying ? styles.gameWrapperMenu : ''}`}>
        {/* HUD */}
        {isPlaying && (
          <div className={styles.hud}>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>PONTOS</span>
              <span className={styles.hudScore}>{score}</span>
            </div>
            <div className={styles.hudItem}>
              <span className={styles.hudLabel}>PIZZAS</span>
              <span>{pizzasMade}/{PIZZA_GOAL}</span>
            </div>
            {streak > 0 && (
              <div className={styles.hudItem}>
                <span className={styles.hudLabel}>STREAK</span>
                <span className={styles.hudStreak}>×{streak}</span>
              </div>
            )}
            <div className={styles.hudItem}>
              <div className={styles.hearts}>
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <span key={i} className={`${styles.heart} ${i < mistakes ? styles.heartLost : ''}`}>
                    ♥
                  </span>
                ))}
              </div>
            </div>
            {candyMode && <span className={styles.candyBadge}>🍬 CANDYTRON</span>}
          </div>
        )}

        {/* Game row — só durante o gameplay */}
        {isPlaying && (
        <div className={styles.gameRow}>
          {/* Ingredient panel */}
          <div className={styles.ingPanel}>
            <>
                <span className={styles.ingLabel}>Molho</span>
                {sauces.map((ing, i) => (
                  <button
                    key={ing.id}
                    className={`${styles.ingBtn} ${selectedIng === ing.id ? styles.ingBtnActive : ''}`}
                    style={{ '--ing-color': ing.color, '--ing-bg': ing.bg, '--ing-border': ing.border }}
                    onClick={() => handleIngredientClick(ing.id)}
                    title={`Tecla ${i + 1}`}
                  >
                    <span className={styles.ingDot} />
                    {ing.label}
                  </button>
                ))}
                <span className={styles.ingLabel}>Queijo</span>
                {cheeses.map((ing, i) => (
                  <button
                    key={ing.id}
                    className={`${styles.ingBtn} ${selectedIng === ing.id ? styles.ingBtnActive : ''}`}
                    style={{ '--ing-color': ing.color, '--ing-bg': ing.bg, '--ing-border': ing.border }}
                    onClick={() => handleIngredientClick(ing.id)}
                    title={`Tecla ${sauces.length + i + 1}`}
                  >
                    <span className={styles.ingDot} />
                    {ing.label}
                  </button>
                ))}
                <span className={styles.ingLabel}>Toppings</span>
                {toppings.map((ing, i) => (
                  <button
                    key={ing.id}
                    className={`${styles.ingBtn} ${selectedIng === ing.id ? styles.ingBtnActive : ''}`}
                    style={{ '--ing-color': ing.color, '--ing-bg': ing.bg, '--ing-border': ing.border }}
                    onClick={() => handleIngredientClick(ing.id)}
                    title={`Tecla ${sauces.length + cheeses.length + i + 1}`}
                  >
                    <span className={styles.ingDot} />
                    {ing.label}
                  </button>
                ))}
            </>
          </div>

          {/* Canvas */}
          <div className={styles.beltArea}>
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className={styles.canvas}
            />
          </div>

          {/* Recipe panel */}
          <div className={styles.recipePanel}>
            {activeOrder ? (
              activeOrder.isFreeStyle ? (
                <div className={styles.recipeFreestyle}>
                  <p className={styles.recipeFreestyleTitle}>MONTA LIVRE!</p>
                  <p className={styles.recipeFreestyleSub}>+2 pts por ingrediente</p>
                  <span className={styles.recipeBonus}>+{activeOrder.bonus}</span>
                </div>
              ) : (
                <>
                  <p className={styles.recipeTitle}>RECEITA</p>
                  {activeOrder.order.map((ingId, i) => {
                    const ing = getIng(ingId)
                    const done = i < activeOrder.applied.length
                    const active = i === activeOrder.applied.length
                    return (
                      <div
                        key={i}
                        className={`${styles.recipeItem} ${done ? styles.recipeItemDone : active ? styles.recipeItemActive : styles.recipeItemPending}`}
                      >
                        <span className={styles.recipeCheck}>{done ? '✓' : active ? '►' : '○'}</span>
                        <span>{ing?.label || ingId}</span>
                      </div>
                    )
                  })}
                </>
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <span style={{ fontSize: '32px', opacity: 0.35 }}>📋</span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* mistake flash sobre o gameWrapper inteiro durante gameplay */}
        {isPlaying && showFlash && <div className={styles.mistakeFlashFull} />}

        {/* Menu screens — não absolutos, ocupam todo o wrapper */}
        {status === 'idle' && (
          <div className={styles.menuScreen}>
            <p className={styles.overlayTitle}>DREAM PIZZATRON</p>
            <p className={styles.overlaySub}>
              Monte as pizzas antes que saiam da esteira.<br />
              40 pizzas para vencer. Máximo 5 erros.
            </p>
            <button
              className={`${styles.candyToggle} ${candyMode ? styles.candyToggleOn : ''}`}
              onClick={() => setCandyMode(c => !c)}
            >
              <span className={styles.lever}>{candyMode ? '🔴' : '⚙️'}</span>
              {candyMode ? 'CANDYTRON 3000 ATIVADO' : 'MODO CANDY'}
            </button>
            {candyMode && (
              <p style={{ fontSize: 12, color: '#be185d', margin: 0, letterSpacing: '0.06em' }}>
                Ingredientes doces · Velocidade maior · 2× pontos
              </p>
            )}
            <Button variant="neon" size="md" onClick={startGame}>COMEÇAR</Button>
            <KbdHint keys={[{ key: '1-7', action: 'ingredientes' }]} />
          </div>
        )}

        {status === 'gameover' && (
          <div className={styles.menuScreen}>
            <p className={styles.overlayTitle}>FIM DE JOGO</p>
            <p className={styles.overlayScore}>{score}</p>
            {score >= bestScore && score > 0 && (
              <p className={styles.overlayBest}>NOVO RECORDE!</p>
            )}
            <p className={styles.overlaySub}>
              Você completou {pizzasMade} pizza{pizzasMade !== 1 ? 's' : ''}
            </p>
            <Button variant="neon" size="md" onClick={startGame}>TENTAR DE NOVO</Button>
          </div>
        )}

        {status === 'victory' && (
          <div className={styles.menuScreen}>
            <p className={styles.overlayTitle}>🏆 VITÓRIA!</p>
            <p className={styles.overlayScore}>{score}</p>
            {score >= bestScore && (
              <p className={styles.overlayBest}>NOVO RECORDE!</p>
            )}
            <p className={styles.overlaySub}>
              Você completou {PIZZA_GOAL} pizzas!
              {candyMode ? ' No modo Candytron!' : ''}
            </p>
            <Button variant="neon" size="md" onClick={startGame}>JOGAR DE NOVO</Button>
          </div>
        )}
      </div>
    </section>
  )
}
