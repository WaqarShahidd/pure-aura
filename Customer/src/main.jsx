import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import { muiTheme } from './theme/muiTheme'
import { queryClient } from './lib/queryClient'
import CartProvider from './context/CartProvider'
import AuthProvider from './context/AuthProvider'
import ErrorBoundary from './components/Common/ErrorBoundary/ErrorBoundary'
import './index.css'
import App from './App.jsx'

// QueryClientProvider sits outside CartProvider because the cart is client-authoritative
// and needs nothing from the server, while everything inside App does.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {/* AuthProvider sits inside QueryClientProvider because it clears cached
              account data on sign-out, which needs the client. */}
          <AuthProvider>
            <CartProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
