import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { debugApiConnection } from './services/hunyuan3d.js'

// Expose debug function globally for testing
window.debugApiConnection = debugApiConnection

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
