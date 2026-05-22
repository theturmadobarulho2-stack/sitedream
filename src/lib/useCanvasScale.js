'use client'
import { useEffect } from 'react'

/**
 * Mantém o canvas crisp em hi-DPI e responsivo ao tamanho de CSS.
 *
 * - O tamanho de display é controlado por CSS (use aspect-ratio + max-width/height no parent)
 * - Esta hook observa o canvas via ResizeObserver e atualiza a resolução interna
 *   para `displayPx × devicePixelRatio`
 * - Aplica `ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0)` onde scaleX = canvas.width / baseW.
 *   O código de draw continua usando coordenadas (baseW, baseH).
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {number} baseW — largura lógica do jogo
 * @param {number} baseH — altura lógica do jogo
 */
export function useCanvasScale(canvasRef, baseW, baseH) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))

    const apply = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const newW = Math.round(rect.width * dpr)
      const newH = Math.round(rect.height * dpr)

      if (canvas.width !== newW) canvas.width = newW
      if (canvas.height !== newH) canvas.height = newH

      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(newW / baseW, 0, 0, newH / baseH, 0, 0)
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(canvas)
    window.addEventListener('orientationchange', apply)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', apply)
    }
  }, [canvasRef, baseW, baseH])
}
