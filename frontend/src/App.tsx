import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShopDashboardPage from './pages/ShopDashboardPage';
import PublicHistoryPage from './pages/PublicHistoryPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import VehicleSharePage from './pages/VehicleSharePage';
import AnalyticsPage from './pages/AnalyticsPage';
import BuyerPage from './pages/BuyerPage';
import SettingsPage from './pages/SettingsPage';
import MarketplacePage from './pages/MarketplacePage';
import FeaturedShopsPage from './pages/FeaturedShopsPage';
import AdminPage from './pages/AdminPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import VisitTracker from './components/VisitTracker';

function homeForRole(role?: string) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SHOP') return '/shop';
  if (role === 'BUYER') return '/buyer';
  return '/';
}

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 200, height: 24 }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <>{children}</>;
}

function ShellLayout({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: 'owner' | 'shop' | 'buyer';
}) {
  return <AppShell theme={theme}>{children}</AppShell>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const home = homeForRole(user?.role);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="mono muted">Loading…</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/history/:token" element={<PublicHistoryPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={home} replace /> : <RegisterPage />} />
        <Route
          path="/"
          element={
            user ? (
              <PrivateRoute roles={['OWNER']}>
                <ShellLayout theme="owner">
                  <DashboardPage />
                </ShellLayout>
              </PrivateRoute>
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/vehicles/:vehicleId"
          element={
            <PrivateRoute roles={['OWNER']}>
              <ShellLayout theme="owner">
                <VehicleDetailPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/vehicles/:vehicleId/share"
          element={
            <PrivateRoute roles={['OWNER']}>
              <ShellLayout theme="owner">
                <VehicleSharePage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute roles={['OWNER', 'SHOP']}>
              <ShellLayout theme={user?.role === 'SHOP' ? 'shop' : 'owner'}>
                <AnalyticsPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/marketplace"
          element={
            <PrivateRoute roles={['OWNER']}>
              <ShellLayout theme="owner">
                <MarketplacePage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/shops"
          element={
            <PrivateRoute roles={['OWNER']}>
              <ShellLayout theme="owner">
                <FeaturedShopsPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['ADMIN']}>
              <ShellLayout theme="owner">
                <AdminPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <ShellLayout theme={user?.role === 'SHOP' ? 'shop' : user?.role === 'BUYER' ? 'buyer' : 'owner'}>
                <SettingsPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/buyer"
          element={
            <PrivateRoute roles={['BUYER']}>
              <ShellLayout theme="buyer">
                <BuyerPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <PrivateRoute roles={['SHOP']}>
              <ShellLayout theme="shop">
                <ShopDashboardPage />
              </ShellLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={user ? home : '/login'} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <VisitTracker />
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
