'use client'
import styles from './style.module.scss'
import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { CLIPS as clips } from '../../lib/clips'

export default function ClipCarousel() {
  const sectionRef = useRef(null)
  const carouselRef = useRef(null)
  const [activeClipId, setActiveClipId] = useState(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    
    // We animate the rotateY of the carousel container from 0 to -360
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "+=4000", // A good distance for full 360 rotation
        pin: true,
        scrub: 1, // Smooth scrub
      }
    })

    tl.to(carouselRef.current, {
      rotateY: -360,
      ease: "none"
    })

    return () => {
      tl.kill()
    }
  }, [])

  const activeClip = clips.find(c => c.id === activeClipId)

  // Math for positioning:
  // Card width is 360px in CSS. R = 360 / (2 * tan(PI/10)) = ~554px
  // We use 500px to keep them tighter and avoid screen overflow.
  const radius = 500; // Increased further for ample spacing
  const angle = 360 / clips.length;

  return (
    <section ref={sectionRef} id="clips" className={styles.section}>
      <div ref={carouselRef} className={styles.carousel3D}>
        {clips.map((clip, i) => {
          const currentAngle = i * angle;
          return (
            <div 
              key={clip.id} 
              className={styles.card3D}
              style={{
                transform: `rotateY(${currentAngle}deg) translateZ(${radius}px)`
              }}
              onClick={() => setActiveClipId(clip.id)}
            >
              <img
                src={`https://img.youtube.com/vi/${clip.id}/hqdefault.jpg`}
                alt=""
              />
              <div className={styles.overlay}>
                <span className={styles.number}>{String(i + 1).padStart(2, '0')}</span>
                <div className={styles.playButton}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5.14v13.72a1 1 0 001.5.86l11.2-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {activeClip && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveClipId(null)}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className={styles.closeButton}
                onClick={() => setActiveClipId(null)}
              >
                ✕ FECHAR
              </button>
              <div className={styles.videoWrapper}>
                <iframe
                  src={`https://www.youtube.com/embed/${activeClip.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={activeClip.title}
                  className={styles.iframe}
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
