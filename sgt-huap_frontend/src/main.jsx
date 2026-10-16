import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import LayoutProvider from './layout/LayoutProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LayoutProvider>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </LayoutProvider>
  </StrictMode>,
)
