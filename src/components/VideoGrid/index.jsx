'use client'
import styles from './style.module.scss'
import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const clips = [
  { id: 'eojI0nU7XHs', title: 'Clip 01' },
  { id: 'XLlEQTxMYSE', title: 'Clip 02' },
  { id: 'cmZTtBdn84U', title: 'Clip 03' },
  { id: 'dkRchNdB5bs', title: 'Clip 04' },
  { id: 'iBIh1ui7tnE', title: 'Clip 05' },
  { id: 'QEmSMJs0EJI', title: 'Clip 06' },
  { id: 'rI3L7NyOeto', title: 'Clip 07' },
  { id: 'Uvzlwd5bdPo', title: 'Clip 08' },
  { id: 'f4GPRK5kelg', title: 'Clip 09' },
  { id: 'aQH8oAq60UU', title: 'Clip 10' },
]

function VideoCard({ clip, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <motion.div
      ref={ref}
      className={styles.card}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.08,
        ease: [0.33, 1, 0.68, 1]
      }}
    >
      <div className={styles.videoWrapper}>
        {!isPlaying ? (
          <div className={styles.thumbnail} onClick={() => setIsPlaying(true)}>
            <img
              src={`https://img.youtube.com/vi/${clip.id}/maxresdefault.jpg`}
              alt={clip.title}
              loading="lazy"
            />
            <div className={styles.playOverlay}>
              <div className={styles.playButton}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5.14v13.72a1 1 0 001.5.86l11.2-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <div className={styles.duration}>
              <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${clip.id}?autoplay=1&rel=0&modestbranding=1`}
            title={clip.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </motion.div>
  )
}

export default function VideoGrid() {
  const sectionRef = useRef(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
  }, [])

  return (
    <section ref={sectionRef} id="clips" className={styles.section}>
      <div className={styles.grid}>
        {clips.map((clip, i) => (
          <VideoCard key={clip.id} clip={clip} index={i} />
        ))}
      </div>
    </section>
  )
}
