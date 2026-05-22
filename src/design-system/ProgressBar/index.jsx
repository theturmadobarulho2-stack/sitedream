'use client'
import styles from './style.module.scss'

/**
 * value: number 0–1
 * accent: 'green' | 'purple'
 * label: string (ex: '03 / 10')
 */
export default function ProgressBar({ value = 0, accent = 'green', label }) {
  return (
    <div className={`${styles.wrap} ${styles[accent]}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ transform: `scaleX(${value})` }} />
      </div>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  )
}
