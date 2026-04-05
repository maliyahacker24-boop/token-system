import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isAdminLoggedIn, subscribeAdminAuth } from '../auth'

function ProtectedRoute({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAdminLoggedIn())

  useEffect(() => {
    const unsubscribe = subscribeAdminAuth((nextValue) => setIsLoggedIn(nextValue))
    return () => {
      unsubscribe()
    }
  }, [])

  if (!isLoggedIn) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default ProtectedRoute
