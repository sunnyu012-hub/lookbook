import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './registerServiceWorker'

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾지 못했습니다.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
