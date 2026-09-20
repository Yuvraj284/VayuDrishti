import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Monitor from './pages/Monitor'
import Predict from './pages/Predict'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/monitor" element={<Monitor />} />
      <Route path="/predict" element={<Predict />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  )
}
