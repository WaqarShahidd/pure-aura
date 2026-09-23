import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import AdminLayout from './layout/AdminLayout/AdminLayout'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import ProductList from './pages/Products/ProductList'
import ProductEditor from './pages/Products/ProductEditor'
import MediaLibrary from './pages/Media/MediaLibrary'
import HomepageEditor from './pages/Content/HomepageEditor'
import CustomerList from './pages/Customers/CustomerList'

export default function App() {
  const { isSignedIn, isChecking } = useAuth()

  // The boot refresh has to settle before routing, or a signed-in reload flashes the
  // login form for the length of one request.
  if (isChecking) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!isSignedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="content/homepage" element={<HomepageEditor />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
