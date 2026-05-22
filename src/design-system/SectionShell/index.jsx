import styles from './style.module.scss'

export default function SectionShell({ id, children, className = '', style }) {
  return (
    <section id={id} className={`${styles.shell} ${className}`} style={style}>
      {children}
    </section>
  )
}
