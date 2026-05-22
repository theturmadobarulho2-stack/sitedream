'use client';
import styles from './page.module.scss'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion';
import Preloader from '../components/Preloader';
import Hero from '../components/Hero';
import ClipCarousel from '../components/ClipCarousel';
import GamesSection from '../components/GamesSection';
import Footer from '../components/Footer';

export default function Home() {

  const [isLoading, setIsLoading] = useState(true);

  useEffect( () => {
    setTimeout( () => {
      setIsLoading(false);
      document.body.style.cursor = 'default'
      window.scrollTo(0,0);
    }, 2000)
  }, [])

  return (
    <main id="main-content" className={styles.main}>
      <AnimatePresence mode='wait'>
        {isLoading && <Preloader />}
      </AnimatePresence>
      <Hero />
      <ClipCarousel />
      <GamesSection />
      <Footer />
    </main>
  )
}
