import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedUserRoute from "./components/ProtectedUserRoute";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import SchedulePage from "./pages/SchedulePage";
import SeatBookingPage from "./pages/SeatBookingPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import AdminSchedulesPage from "./pages/AdminSchedulesPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import LoginPage from "./pages/SharedLoginPage";
import RoutesListingPage from "./pages/RoutesListingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import UserProfilePage from "./pages/UserProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminChangePasswordPage from "./pages/AdminChangePasswordPage";
import NotFoundPage from "./pages/NotFoundPage";

function AppContent() {
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuth();

  useEffect(() => {
    document.title = "BusGo";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  // Case 1: Unauthenticated user (not logged in)
  // When user tries to navigate without logging in to admin panel or user panel pages, redirect to /login.
  // URL navigation to public pages (home, about, contact, login, etc.) is allowed.
  if (!isLoggedIn) {
    if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/user")) {
      return <Navigate to="/login" replace />;
    }

    return (
      <>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedules/:routeId" element={<SchedulePage />} />
          <Route path="/booking/:scheduleId" element={<SeatBookingPage />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/routes-listing" element={<RoutesListingPage />} />
          <Route path="*" element={<NotFoundPage role="guest" />} />
        </Routes>
        <Footer />
      </>
    );
  }

  // Case 2: Logged-in Admin
  // Admin can navigate between admin panel pages.
  // Any navigation to pages NOT in admin panel renders admin navbar + Airtel 404 page.
  if (isAdmin) {
    if (!location.pathname.startsWith("/admin")) {
      return <NotFoundPage role="admin" />;
    }

    return (
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/change-password"
          element={
            <ProtectedAdminRoute>
              <AdminChangePasswordPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedAdminRoute>
              <AdminBookingsPage />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/schedules"
          element={
            <ProtectedAdminRoute>
              <AdminSchedulesPage />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/admin/*" element={<NotFoundPage role="admin" />} />
        <Route path="*" element={<NotFoundPage role="admin" />} />
      </Routes>
    );
  }

  // Case 3: Logged-in User
  // User can navigate to user application pages (home, about, contact, routes-listing, schedules, booking, user panel).
  // Any navigation to pages NOT in user panel (e.g. /admin/*, /login, or invalid routes) renders user navbar + 404 page.
  const isKnownUserRoute =
    location.pathname === "/" ||
    location.pathname === "/about" ||
    location.pathname === "/contact" ||
    location.pathname === "/routes-listing" ||
    location.pathname.startsWith("/schedules/") ||
    location.pathname.startsWith("/booking/") ||
    location.pathname === "/booking-success" ||
    location.pathname === "/user" ||
    location.pathname === "/user/dashboard" ||
    location.pathname === "/user/profile" ||
    location.pathname === "/user/change-password";

  if (!isKnownUserRoute) {
    return <NotFoundPage role="user" />;
  }

  const isUserSection = location.pathname.startsWith("/user");

  return (
    <>
      {!isUserSection && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedules/:routeId" element={<SchedulePage />} />
        <Route path="/booking/:scheduleId" element={<SeatBookingPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/routes-listing" element={<RoutesListingPage />} />

        <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
        <Route
          path="/user/dashboard"
          element={
            <ProtectedUserRoute>
              <UserDashboardPage />
            </ProtectedUserRoute>
          }
        />
        <Route
          path="/user/profile"
          element={
            <ProtectedUserRoute>
              <UserProfilePage />
            </ProtectedUserRoute>
          }
        />
        <Route
          path="/user/change-password"
          element={
            <ProtectedUserRoute>
              <ChangePasswordPage />
            </ProtectedUserRoute>
          }
        />
        <Route path="*" element={<NotFoundPage role="user" />} />
      </Routes>
      {!isUserSection && <Footer />}
    </>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
