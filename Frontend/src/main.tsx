import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Silence expected benign development-only WebSocket/HMR disconnect warning logs and unhandled rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason || '');
    if (
      message.includes('WebSocket') || 
      message.includes('websocket') || 
      message.includes('vite') ||
      message.includes('failed to connect')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (
      message.includes('WebSocket') || 
      message.includes('websocket') || 
      message.includes('vite') ||
      message.includes('failed to connect')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

