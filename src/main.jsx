import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './common/ErrorBoundary.jsx'
import { DialogProvider } from './common/DialogProvider.jsx'
import { installGlobalFetchInterceptor, installGlobalErrorHandlers } from './utils/logger.js'

// Initialize comprehensive centralized console logging and debugging
installGlobalFetchInterceptor();
installGlobalErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <DialogProvider>
          <App />
        </DialogProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
