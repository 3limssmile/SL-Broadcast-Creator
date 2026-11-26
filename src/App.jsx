import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Topbar from './components/Topbar.jsx'
import BroadcastCreator from './pages/BroadcastCreator.jsx'
import KeycardCreator from './pages/KeycardCreator.jsx'
import CassieCreator from './pages/CassieCreator.jsx'
import RankCreator from './pages/RankCreator.jsx'

export default function App() {
  const { search } = useLocation()
  return (
    <div className="main-content">
      <Topbar />
      <Routes>
        <Route path="/" element={<Navigate to="/broadcast" replace />} />
        <Route path="/broadcast" element={<BroadcastCreator key={search} />} />
        <Route path="/keycard" element={<KeycardCreator key={search} />} />
        <Route path="/cassie" element={<CassieCreator key={search} />} />
        <Route path="/ranks" element={<RankCreator key={search} />} />
      </Routes>
    </div>
  )
}