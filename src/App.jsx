import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getAccessToken, clearTokens } from './api/client'
import AuthScreen from './screens/AuthScreen'
import AppShell from './components/AppShell'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getAccessToken())

  useEffect(() => {
    const onLogout = () => setIsLoggedIn(false)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  function handleLoginSuccess() {
    setIsLoggedIn(true)
  }

  function handleLogout() {
    clearTokens()
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return <AuthScreen onSuccess={handleLoginSuccess} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell onLogout={handleLogout} />} />
      </Routes>
    </BrowserRouter>
  )
}
