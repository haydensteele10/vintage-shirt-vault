import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SheetProvider } from './context/SheetContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import ShirtDetail from './pages/ShirtDetail';
import AddEditShirt from './pages/AddEditShirt';
import PriceHistory from './pages/PriceHistory';
import Discover from './pages/Discover';
import Profile from './pages/Profile';
import Activity from './pages/Activity';
import Social from './pages/Social';
import Search from './pages/Search';
import TagGuide from './pages/TagGuide';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SheetProvider>
      <AuthProvider>
        <SplashScreen />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="collection" element={<Collection />} />
              <Route path="shirts/new" element={<AddEditShirt />} />
              <Route path="shirts/:id" element={<ShirtDetail />} />
              <Route path="shirts/:id/edit" element={<AddEditShirt />} />
              <Route path="price-history" element={<PriceHistory />} />
              <Route path="search" element={<Search />} />
              <Route path="discover" element={<Discover />} />
              <Route path="profile" element={<Profile />} />
              <Route path="social" element={<Social />} />
              <Route path="activity" element={<Activity />} />
              <Route path="tag-guide" element={<TagGuide />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </SheetProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
