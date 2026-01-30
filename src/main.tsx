import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './index.css'
import App from './App.tsx'

// DEV: Verify database schema
if (import.meta.env.DEV) {
  import('./utils/verifySchema').then(({ verifySchema }) => {
    verifySchema();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
