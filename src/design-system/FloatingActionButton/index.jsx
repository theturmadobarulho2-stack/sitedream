'use client'
import styles from './style.module.scss'

/**
 * label: string
 * icon: ReactNode
 * onClick: () => void
 * isActive: boolean — troca ícone/label quando fullscreen ativo
 * position: 'top-right' | 'bottom-right' (default 'top-right')
 */
export default function FloatingActionButton({
  label,
  labelActive,
  icon,
  iconActive,
  onClick,
  isActive = false,
  position = 'top-right',
}) {
  return (
    <button
      className={`${styles.fab} ${styles[position.replace('-', '_')]} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      aria-label={isActive ? (labelActive ?? label) : label}
      title={isActive ? (labelActive ?? label) : label}
    >
      <span className={styles.icon}>
        {isActive && iconActive ? iconActive : icon}
      </span>
      <span className={styles.label}>
        {isActive ? (labelActive ?? label) : label}
      </span>
    </button>
  )
}
