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
import OrderList from './pages/Orders/OrderList'
import OrderDetail from './pages/Orders/OrderDetail'
import CollectionList from './pages/Collections/CollectionList'
import CollectionEditor from './pages/Collections/CollectionEditor'
import CategoryList from './pages/Categories/CategoryList'
import FacetList from './pages/Facets/FacetList'
import QuizEditor from './pages/Quiz/QuizEditor'
import SortAndFiltersEditor from './pages/SortAndFilters/SortAndFiltersEditor'
import InventoryList from './pages/Inventory/InventoryList'
import DiscountList from './pages/Discounts/DiscountList'
import PagesEditor from './pages/Content/PagesEditor'
import FaqsEditor from './pages/Content/FaqsEditor'
import AnnouncementsEditor from './pages/Content/AnnouncementsEditor'
import FooterEditor from './pages/Content/FooterEditor'
import NavigationEditor from './pages/Content/NavigationEditor'
import SettingsPage from './pages/Settings/SettingsPage'

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
        <Route path="collections" element={<CollectionList />} />
        <Route path="collections/:id" element={<CollectionEditor />} />
        <Route path="categories" element={<CategoryList />} />
        <Route path="facets" element={<FacetList />} />
        <Route path="quiz" element={<QuizEditor />} />
        <Route path="sort-and-filters" element={<SortAndFiltersEditor />} />
        <Route path="inventory" element={<InventoryList />} />
        <Route path="discounts" element={<DiscountList />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="content/homepage" element={<HomepageEditor />} />
        <Route path="content/pages" element={<PagesEditor />} />
        <Route path="content/faqs" element={<FaqsEditor />} />
        <Route path="content/announcements" element={<AnnouncementsEditor />} />
        <Route path="content/footer" element={<FooterEditor />} />
        <Route path="content/navigation" element={<NavigationEditor />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:number" element={<OrderDetail />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
