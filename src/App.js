import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import ShirtDetail from './pages/ShirtDetail';
import AddEditShirt from './pages/AddEditShirt';
import PriceHistory from './pages/PriceHistory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="collection" element={<Collection />} />
          <Route path="shirts/new" element={<AddEditShirt />} />
          <Route path="shirts/:id" element={<ShirtDetail />} />
          <Route path="shirts/:id/edit" element={<AddEditShirt />} />
          <Route path="price-history" element={<PriceHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
