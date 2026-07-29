import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles/global.css';

// Note: React StrictMode is intentionally NOT used. It double-invokes effects in
// development, which would fire each screen's data-load twice. The prototype
// loaded once per navigation, so we match that behaviour here.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ToastProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ToastProvider>
  </BrowserRouter>
);
