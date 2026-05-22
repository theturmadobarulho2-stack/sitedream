'use client'
import styles from './style.module.scss'
import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.brand}>DreamStation</p>
          <p className={styles.copy}>© 2025</p>
        </div>
        <div className={styles.right}>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
            YouTube
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
