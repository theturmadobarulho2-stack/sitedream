'use client'
import styles from './style.module.scss'
import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import dynamic from 'next/dynamic'
import Button from '../../design-system/Button'
import FloatingActionButton from '../../design-system/FloatingActionButton'

const DreamFlappy = dynamic(() => import('../DreamFlappy'), {
  ssr: false,
  loading: () => <div className={styles.gameSkeleton} />,
})
const ClipPong = dynamic(() => import('../ClipPong'), {
  ssr: false,
  loading: () => <div className={styles.gameSkeleton} />,
})
const DreamPizzatron = dynamic(() => import('../DreamPizzatron'), {
  ssr: false,
  loading: () => <div className={styles.gameSkeleton} />,
})

export default function GamesSection() {
  const sectionRef = useRef(null)
  const containerRef = useRef(null)
  const [activeGame, setActiveGame] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
  }, [])

  useEffect(() => {
    if (activeGame) {
      ScrollTrigger.getById('gamesPin')?.kill()
      ScrollTrigger.create({
        id: 'gamesPin',
        trigger: sectionRef.current,
        start: "top top",
        end: "+=9999",
        pin: true,
      })
    } else {
      ScrollTrigger.getById('gamesPin')?.kill()
    }
  }, [activeGame])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <section ref={sectionRef} id="games" className={styles.section}>
      <div className={styles.container} ref={containerRef}>
        <AnimatePresence mode="wait">
          {!activeGame ? (
            <motion.div 
              key="grid"
              className={styles.grid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.card} onClick={() => setActiveGame('flappy')}>
                <div className={styles.cardPreview}>
                  <img src="/dreambabies/happy-kid.png" alt="Dream Flappy" />
                </div>
                <div className={styles.cardInfo}>
                  <h3>DREAM FLAPPY</h3>
                  <p>Guie os Dream Babies pelos canos neon.</p>
                </div>
              </div>

              <div className={styles.card} onClick={() => setActiveGame('pong')}>
                <div className={styles.cardPreview}>
                  <div className={styles.pongMock}>
                    <div className={styles.paddleLeft} />
                    <div className={styles.ball} />
                    <div className={styles.paddleRight} />
                  </div>
                </div>
                <div className={styles.cardInfo}>
                  <h3>CLIP PONG</h3>
                  <p>O Rei do Pong com a trilha sonora oficial.</p>
                </div>
              </div>

              <div className={styles.card} onClick={() => setActiveGame('pizzatron')}>
                <div className={styles.cardPreview}>
                  <div className={styles.pizzaMock}>
                    <div className={styles.pizzaCircle} />
                    <div className={styles.pizzaBelt} />
                  </div>
                </div>
                <div className={styles.cardInfo}>
                  <h3>DREAM PIZZATRON</h3>
                  <p>Monta a pizza antes que escape.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="game"
              className={styles.activeGameWrapper}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.gameToolbar}>
                <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
                  ← VOLTAR
                </Button>
                <span className={styles.toolbarTitle}>
                  {activeGame === 'flappy' && 'DREAM FLAPPY'}
                  {activeGame === 'pong' && 'CLIP PONG'}
                  {activeGame === 'pizzatron' && 'DREAM PIZZATRON'}
                </span>
              </div>

              <FloatingActionButton
                label="MODO FOCO"
                labelActive="SAIR FOCO"
                icon={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
                iconActive={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M5 1v5H1M11 1v5h4M1 11h4v4M11 11h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
                onClick={toggleFullscreen}
                isActive={isFullscreen}
                position="top-right"
              />
              
              <div className={styles.gameContent}>
                {activeGame === 'flappy' && <DreamFlappy />}
                {activeGame === 'pong' && <ClipPong />}
                {activeGame === 'pizzatron' && <DreamPizzatron />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
