import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './design-system.css'
import { applyAccent, getSavedAccent } from './utils/accentColor.js'
import App from './App.jsx'
import { ErrorBoundary } from './common/ErrorBoundary.jsx'
import { DialogProvider } from './common/DialogProvider.jsx'
import { RealTimeProvider } from './realtime/RealTimeProvider.jsx'
import { installGlobalFetchInterceptor, installGlobalEventSourceInterceptor, installGlobalErrorHandlers } from './utils/logger.js'
import { installButtonLoading } from './utils/buttonLoading.js'

// Initialize comprehensive centralized console logging and debugging
installButtonLoading();
installGlobalFetchInterceptor();
installGlobalEventSourceInterceptor();
installGlobalErrorHandlers();
applyAccent(getSavedAccent());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <DialogProvider>
          <RealTimeProvider>
            <App />
          </RealTimeProvider>
        </DialogProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
