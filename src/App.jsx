import { Routes, Route, Navigate } from 'react-router-dom'
import Topbar from './components/Topbar.jsx'
import BroadcastCreator from './pages/BroadcastCreator.jsx'
import KeycardCreator from './pages/KeycardCreator.jsx'
import CassieCreator from './pages/CassieCreator.jsx'

export default function App() {
  return (
    <div className="main-content">
      <Topbar />
      <Routes>
        <Route path="/" element={<Navigate to="/broadcast" replace />} />
        <Route path="/broadcast" element={<BroadcastCreator />} />
        <Route path="/keycard" element={<KeycardCreator />} />
        <Route path="/cassie" element={<CassieCreator />} />
      </Routes>
    </div>
  )
}