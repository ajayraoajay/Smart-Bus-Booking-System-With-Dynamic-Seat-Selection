import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";




export default function ProtectedAdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}
