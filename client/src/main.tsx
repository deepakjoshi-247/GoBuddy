import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Completely wipe localStorage before components mount on fresh load to prevent ghost sessions
try {
  localStorage.clear();
} catch (e) {
  console.warn('Could not clear localStorage:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
