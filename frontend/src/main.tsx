import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRoutes from './AppRoutes'
import './app/globals.css'

// 在开发环境中禁用 StrictMode 来避免双重调用 useEffect
const isDevelopment = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById('root')!).render(
  isDevelopment ? (
    <AppRoutes />
  ) : (
    <React.StrictMode>
      <AppRoutes />
    </React.StrictMode>
  ),
)