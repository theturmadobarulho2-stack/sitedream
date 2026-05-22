'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './style.module.scss'
import ProgressBar from '../../design-system/ProgressBar'

const CLIPS = [
  { id: 'eojI0nU7XHs', label: 'CLIP 01' },
  { id: 'XLlEQTxMYSE', label: 'CLIP 02' },
  { id: 'cmZTtBdn84U', label: 'CLIP 03' },
  { id: 'dkRchNdB5bs', label: 'CLIP 04' },
  { id: 'iBIh1ui7tnE', label: 'CLIP 05' },
  { id: 'QEmSMJs0EJI', label: 'CLIP 06' },
  { id: 'rI3L7NyOeto', label: 'CLIP 07' },
  { id: 'Uvzlwd5bdPo', label: 'CLIP 08' },
  { id: 'f4GPRK5kelg', label: 'CLIP 09' },
  { id: 'aQH8oAq60UU', label: 'CLIP 10' },
]

const SCROLL_PER_SLIDE = 500 // px of scroll per slide

export default function ClipCarouselFlat() {
  const sectionRef  = useRef(null)
  const stripRef    = useRef(null)
  const slideRef    = useRef(0)
  const stRef       = useRef(null)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [activeClipId, setActiveClipId] = useState(null)

  // ── Animate strip to a given index ───────────────────────────────
  const goToSlide = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(CLIPS.length - 1, idx))
    slideRef.current = clamped
    setCurrentSlide(clamped)
    const sectionW = sectionRef.current?.offsetWidth ?? window.innerWidth
    gsap.to(stripRef.current, {
      x: -clamped * sectionW,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: true,
    })
  }, [])

  // ── ScrollTrigger pin + scrub drives slide index ──────────────────
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const totalScroll = CLIPS.length * SCROLL_PER_SLIDE

    stRef.current = ScrollTrigger.create({
      id: 'flatCarousel',
      trigger: sectionRef.current,
      start: 'top top',
      end: `+=${totalScroll}`,
      pin: true,
      scrub: 0.4,
      snap: {
        snapTo: 1 / (CLIPS.length - 1),
        duration: { min: 0.3, max: 0.55 },
        ease: 'power2.inOut',
      },
      onUpdate(self) {
        const idx = Math.round(self.progress * (CLIPS.length - 1))
        if (idx !== slideRef.current) goToSlide(idx)
      },
    })

    // Recalculate strip offset on resize
    const onResize = () => goToSlide(slideRef.current)
    window.addEventListener('resize', onResize)

    return () => {
      stRef.current?.kill()
      window.removeEventListener('resize', onResize)
    }
  }, [goToSlide])

  // ── Keyboard navigation ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goToSlide(slideRef.current + 1)
      if (e.key === 'ArrowLeft')  goToSlide(slideRef.current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToSlide])

  // ── Touch swipe ───────────────────────────────────────────────────
  useEffect(() => {
    const el = sectionRef.current
    let startX = 0
    const onStart = (e) => { startX = e.touches[0].clientX }
    const onEnd   = (e) => {
      const diff = startX - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) goToSlide(slideRef.current + (diff > 0 ? 1 : -1))
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [goToSlide])

  return (
    <section ref={sectionRef} id="clips-flat" className={styles.section}>

      {/* Section label */}
      <p className={styles.sectionLabel}>TODOS OS CLIPES</p>

      {/* Counter top-right */}
      <div className={styles.counter} aria-live="polite">
        <span className={styles.current}>{String(currentSlide + 1).padStart(2, '0')}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.total}>{CLIPS.length}</span>
      </div>

      {/* Slides strip */}
      <div className={styles.viewport}>
        <div ref={stripRef} className={styles.strip}>
          {CLIPS.map((clip, i) => (
            <div
              key={clip.id}
              className={`${styles.slide} ${i === currentSlide ? styles.active : ''}`}
              role="button"
              tabIndex={i === currentSlide ? 0 : -1}
              aria-label={`${clip.label} — clique para assistir`}
              onClick={() => i === currentSlide && setActiveClipId(clip.id)}
              onKeyDown={(e) => e.key === 'Enter' && i === currentSlide && setActiveClipId(clip.id)}
            >
              <div className={styles.thumb}>
                <img
                  src={`https://img.youtube.com/vi/${clip.id}/maxresdefault.jpg`}
                  alt={clip.label}
                  loading={i <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <div className={styles.slideOverlay}>
                  <span className={styles.bigNum}>{String(i + 1).padStart(2, '0')}</span>
                  {i === currentSlide && (
                    <motion.button
                      className={styles.playBtn}
                      aria-label={`Assistir ${clip.label}`}
                      onClick={(e) => { e.stopPropagation(); setActiveClipId(clip.id) }}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 300 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                        <path d="M8 5.14v13.72a1 1 0 001.5.86l11.2-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor"/>
                      </svg>
                    </motion.button>
                  )}
                </div>
              </div>
              <p className={styles.clipLabel}>{clip.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        className={`${styles.arrow} ${styles.prev}`}
        onClick={() => goToSlide(currentSlide - 1)}
        disabled={currentSlide === 0}
        aria-label="Clipe anterior"
      >
        <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        className={`${styles.arrow} ${styles.next}`}
        onClick={() => goToSlide(currentSlide + 1)}
        disabled={currentSlide === CLIPS.length - 1}
        aria-label="Próximo clipe"
      >
        <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Progress bar + hint */}
      <div className={styles.bottom}>
        <ProgressBar
          value={(currentSlide + 1) / CLIPS.length}
          accent="green"
        />
        <AnimatePresence>
          {currentSlide === CLIPS.length - 1 && (
            <motion.span
              className={styles.hint}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ↓ jogos
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Modal player */}
      <AnimatePresence>
        {activeClipId && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveClipId(null)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.closeBtn} onClick={() => setActiveClipId(null)}>
                ✕ FECHAR
              </button>
              <div className={styles.videoWrapper}>
                <iframe
                  src={`https://www.youtube.com/embed/${activeClipId}?autoplay=1&rel=0&modestbranding=1`}
                  title={CLIPS.find(c => c.id === activeClipId)?.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
