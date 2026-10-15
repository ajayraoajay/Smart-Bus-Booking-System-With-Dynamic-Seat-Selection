import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider } from "./context/AuthContext";
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

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const isUserDashPage = location.pathname.startsWith("/user");

  useEffect(() => {
    document.title = "BusGo";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      {!isAdminPage && !isUserDashPage && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedules/:routeId" element={<SchedulePage />} />
        <Route path="/booking/:scheduleId" element={<SeatBookingPage />} />
        <Route path="/booking-success" element={<BookingSuccessPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/routes-listing" element={<RoutesListingPage />} />

        
        <Route path="/user/dashboard" element={
          <ProtectedUserRoute><UserDashboardPage /></ProtectedUserRoute>
        } />
        <Route path="/user/profile" element={
          <ProtectedUserRoute><UserProfilePage /></ProtectedUserRoute>
        } />
        <Route path="/user/change-password" element={
          <ProtectedUserRoute><ChangePasswordPage /></ProtectedUserRoute>
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>
        } />
        <Route path="/admin/bookings" element={
          <ProtectedAdminRoute><AdminBookingsPage /></ProtectedAdminRoute>
        } />
        <Route path="/admin/schedules" element={
          <ProtectedAdminRoute><AdminSchedulesPage /></ProtectedAdminRoute>
        } />
      </Routes>
      {!isAdminPage && !isUserDashPage && <Footer />}
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
