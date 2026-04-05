import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import MenuPage from './pages/MenuPage'
import Dashboard from './pages/Dashboard'
import Display from './pages/Display'
import Admin from './pages/Admin'
import Analytics from './pages/Analytics'
import AdminLogin from './pages/AdminLogin'
import Kitchen from './pages/Kitchen'
import Waiter from './pages/Waiter'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/kiosk" element={<MenuPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/display" element={<Display />} />
      <Route path="/kitchen" element={<Kitchen />} />
      <Route path="/waiter" element={<Waiter />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
