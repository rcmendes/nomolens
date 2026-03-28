import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { TldProvider } from './context/TldContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TldProvider>
      <App />
    </TldProvider>
  </StrictMode>,
)
