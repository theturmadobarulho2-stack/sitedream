'use client'
import styles from './style.module.scss'

/**
 * variant: 'primary' | 'neon' | 'ghost'
 * size: 'sm' | 'md' | 'lg'
 * as: 'button' | 'a' (+ href, target, rel)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  children,
  className = '',
  ...rest
}) {
  return (
    <Tag
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
