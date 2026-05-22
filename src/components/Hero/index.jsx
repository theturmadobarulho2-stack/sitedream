'use client'
import styles from './style.module.scss'
import { useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/all';
import { motion, useTransform, useSpring, useReducedMotion } from 'framer-motion';

const slideUp = {
  initial: { y: 300 },
  enter: {
    y: 0,
    transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1], delay: 2.5 }
  }
}

const slideUpInstant = {
  initial: { y: 0 },
  enter: { y: 0 }
}

export default function Hero() {
  const firstText = useRef(null);
  const secondText = useRef(null);
  const slider = useRef(null);
  const heroRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const reduceRef = useRef(shouldReduceMotion);
  let xPercent = 0;
  let direction = -1;

  useLayoutEffect(() => {
    reduceRef.current = shouldReduceMotion;
  }, [shouldReduceMotion]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (!reduceRef.current) {
      gsap.to(slider.current, {
        scrollTrigger: {
          trigger: document.documentElement,
          scrub: 0.25,
          start: 0,
          end: window.innerHeight,
          onUpdate: e => direction = e.direction * -1
        },
        x: "-500px",
        force3D: true,
      })
      requestAnimationFrame(animate);
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const animate = () => {
    if (reduceRef.current) return;
    if (xPercent < -100) {
      xPercent = 0;
    } else if (xPercent > 0) {
      xPercent = -100;
    }
    gsap.set(firstText.current, { xPercent: xPercent })
    gsap.set(secondText.current, { xPercent: xPercent })
    requestAnimationFrame(animate);
    xPercent += 0.1 * direction;
  }

  const scrollToClips = () => {
    const clipsSection = document.getElementById('clips');
    if (clipsSection) {
      clipsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const springConfig = { damping: 25, stiffness: 100, mass: 0.5 };
  const smoothX = useSpring(0, springConfig);
  const smoothY = useSpring(0, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-15, 15]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const handleMouseMove = (event) => {
      const rect = heroEl.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseXVal = event.clientX - rect.left - width / 2;
      const mouseYVal = event.clientY - rect.top - height / 2;
      smoothX.set(mouseXVal / width);
      smoothY.set(mouseYVal / height);
    };

    const handleMouseLeave = () => {
      smoothX.set(0);
      smoothY.set(0);
    };

    heroEl.addEventListener('mousemove', handleMouseMove);
    heroEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroEl.removeEventListener('mousemove', handleMouseMove);
      heroEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [shouldReduceMotion, smoothX, smoothY]);

  const variants = shouldReduceMotion ? slideUpInstant : slideUp;

  return (
    <motion.section
      ref={heroRef}
      variants={variants}
      initial="initial"
      animate="enter"
      className={styles.hero}
    >
      <div className={styles.videoBackground}>
        <iframe
          src="https://www.youtube.com/embed/eojI0nU7XHs?autoplay=1&mute=1&controls=0&loop=1&playlist=eojI0nU7XHs&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        ></iframe>
      </div>

      <div className={styles.overlay} />

      <div className={styles.content}>
        <motion.img
          src="/logo-dream.png"
          alt="DreamStation Logo"
          className={styles.logo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.01 : 0.8,
            delay: shouldReduceMotion ? 0 : 3.2
          }}
          style={shouldReduceMotion ? {} : { rotateX, rotateY, transformPerspective: 1000 }}
        />
        <motion.button
          className={styles.cta}
          onClick={scrollToClips}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0.01 : 0.8,
            delay: shouldReduceMotion ? 0 : 3.4
          }}
          whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        >
          <span>Assistir Clipes</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M8 13L13 8M8 13L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>

      <div className={styles.sliderContainer}>
        <div ref={slider} className={styles.slider}>
          <p ref={firstText}>CLIPS ★ DREAMSTATION ★ VIBE ★</p>
          <p ref={secondText}>CLIPS ★ DREAMSTATION ★ VIBE ★</p>
        </div>
      </div>
    </motion.section>
  )
}
