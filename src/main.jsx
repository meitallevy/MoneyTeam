import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './lib/i18n'
import { AuthProvider } from './context/AuthContext'
import { SeasonProvider } from './context/SeasonContext'
import { ToastProvider } from './lib/toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <SeasonProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </SeasonProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  </React.StrictMode>
)
