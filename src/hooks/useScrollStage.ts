import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-driven stage tracking for the cinematic hero.
 *
 * Progress is written to a ref, not to state, so the camera can read it every
 * frame without ever re-rendering React. The integer *stage* is state, but it
 * only changes when a threshold is crossed — a handful of renders across the
 * entire scroll instead of one per pixel.
 */
export function useScrollStage(
  targetRef: React.RefObject<HTMLElement | null>,
  thresholds: number[],
) {
  const progress = useRef(0)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    let ticking = false

    const measure = () => {
      ticking = false
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel))
      progress.current = p

      let next = 0
      for (let i = 0; i < thresholds.length; i++) {
        if (p >= thresholds[i]) next = i + 1
      }
      setStage((cur) => (cur === next ? cur : next))
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [targetRef, thresholds])

  return { progress, stage }
}
