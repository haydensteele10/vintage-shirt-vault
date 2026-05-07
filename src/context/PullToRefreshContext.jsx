import { createContext, useContext, useEffect, useRef, useState } from 'react'

const Ctx = createContext(null)

const THRESHOLD  = 80     // px of pull needed to trigger refresh
const RESISTANCE = 2.5    // divide raw drag by this for visual pull
const MAX_PULL   = 120    // max translateY applied to main (px)
const REST_Y     = 40     // translateY held during active refresh
const SPRING     = 'transform 0.45s cubic-bezier(0.32,0.72,0,1)'

function setTransform(el, y, animated) {
  if (!el) return
  el.style.transition = animated ? SPRING : 'none'
  el.style.transform  = y > 0 ? `translateY(${y}px)` : ''
}

function PullSpinner({ pull, refreshing }) {
  if (pull < 2 && !refreshing) return null
  const progress  = Math.min(pull / THRESHOLD, 1)
  const triggered = pull >= THRESHOLD || refreshing

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center"
      style={{ top: '3.5rem' }}
    >
      <div
        className="mt-1.5 w-7 h-7 rounded-full bg-gray-900/95 border border-gray-700/60 flex items-center justify-center shadow-md"
        style={!refreshing ? { transform: `rotate(${progress * 540}deg)` } : undefined}
      >
        <svg
          className={`w-3.5 h-3.5 ${triggered ? 'text-amber-400' : 'text-gray-500'} ${refreshing ? 'animate-spin' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
        >
          <path
            strokeLinecap="round" strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    </div>
  )
}

export function PullToRefreshProvider({ children }) {
  const mainRef       = useRef(null)
  const callbackRef   = useRef(null)
  const startYRef     = useRef(0)
  const activeRef     = useRef(false)   // currently in a pull gesture
  const pullYRef      = useRef(0)       // current applied pull (px)
  const refreshingRef = useRef(false)   // refresh in progress
  const rafRef        = useRef(null)

  const [spinnerPull, setSpinnerPull] = useState(0)
  const [refreshing,  setRefreshing]  = useState(false)

  useEffect(() => {
    function reset(animated) {
      pullYRef.current   = 0
      activeRef.current  = false
      cancelAnimationFrame(rafRef.current)
      setTransform(mainRef.current, 0, animated)
      setSpinnerPull(0)
    }

    function onTouchStart(e) {
      if (refreshingRef.current) return
      const main = mainRef.current
      if (!main || window.scrollY > 0) return
      startYRef.current  = e.touches[0].clientY
      activeRef.current  = false
    }

    function onTouchMove(e) {
      if (refreshingRef.current) return
      const main = mainRef.current
      if (!main) return
      if (window.scrollY > 0) { activeRef.current = false; return }
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) { activeRef.current = false; return }
      activeRef.current = true
      e.preventDefault()
      const y = Math.min(dy / RESISTANCE, MAX_PULL)
      pullYRef.current = y
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setTransform(main, y, false)
        setSpinnerPull(y)
      })
    }

    function onTouchEnd() {
      if (!activeRef.current) return
      activeRef.current = false
      const y    = pullYRef.current
      const main = mainRef.current

      if (y >= THRESHOLD) {
        pullYRef.current    = REST_Y
        refreshingRef.current = true
        setRefreshing(true)
        setSpinnerPull(REST_Y)
        setTransform(main, REST_Y, true)

        const cb = callbackRef.current
        const finish = () => {
          refreshingRef.current = false
          setRefreshing(false)
          reset(true)
        }
        if (cb) {
          Promise.resolve(cb()).then(finish, finish)
        } else {
          setTimeout(finish, 600)
        }
      } else {
        reset(true)
      }
    }

    document.addEventListener('touchstart',  onTouchStart, { passive: true })
    document.addEventListener('touchmove',   onTouchMove,  { passive: false })
    document.addEventListener('touchend',    onTouchEnd,   { passive: true })
    document.addEventListener('touchcancel', onTouchEnd,   { passive: true })

    return () => {
      document.removeEventListener('touchstart',  onTouchStart)
      document.removeEventListener('touchmove',   onTouchMove)
      document.removeEventListener('touchend',    onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return (
    <Ctx.Provider value={{ mainRef, callbackRef }}>
      {children}
      <PullSpinner pull={spinnerPull} refreshing={refreshing} />
    </Ctx.Provider>
  )
}

export function useMainRef() {
  return useContext(Ctx).mainRef
}

export function useRegisterPullRefresh(fn) {
  const ctx = useContext(Ctx)
  useEffect(() => {
    if (!ctx) return
    ctx.callbackRef.current = fn
    return () => { ctx.callbackRef.current = null }
  })
}
