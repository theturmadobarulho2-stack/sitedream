'use client'
import { useEffect, useState } from 'react'
import styles from './style.module.scss'

/**
 * keys: Array<{ key: string, action: string }>
 * Ex: [{ key: 'ESPAÇO', action: 'pular' }, { key: 'R', action: 'reiniciar' }]
 * activeKey: string — pisca o badge quando a tecla é pressionada
 */
export default function KbdHint({ keys = [], activeKey }) {
  const [pressed, setPressed] = useState(null)

  useEffect(() => {
    const down = (e) => setPressed(e.key.toUpperCase())
    const up   = () => setPressed(null)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  return (
    <div className={styles.wrap}>
      {keys.map(({ key, action }) => (
        <span key={key} className={`${styles.item} ${pressed === key ? styles.pressed : ''}`}>
          <kbd className={styles.kbd}>{key}</kbd>
          {action && <span className={styles.action}>{action}</span>}
        </span>
      ))}
    </div>
  )
}
