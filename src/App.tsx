import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'

// The landing page is the entry point, so it ships in the first chunk.
// Everything else — including Leaflet and the analytics charts — is split out.
const Monitor = lazy(() => import('./pages/Monitor'))
const Predict = lazy(() => import('./pages/Predict'))
const Analytics = lazy(() => import('./pages/Analytics'))

/** Routers preserve scroll position by default; every view here starts at the top. */
function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RouteFallback() {
  return (
    <div className="route-loading">
      <span className="route-loading__bar" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollReset />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Suspense>
    </>
  )
}
