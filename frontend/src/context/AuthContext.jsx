import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function normalizeUser(userData) {
  if (!userData) {
    return null;
  }

  return {
    ...userData,
    role: String(userData.role ?? "user").toLowerCase(),
  };
}

export function AuthProvider({ children }) {
  
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("busgo_user");
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      localStorage.removeItem("busgo_user");
      return null;
    }
  });

  
  // Load dark mode from localStorage for all users (guests and authenticated)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("busgo_dark") === "true";
  });

  const isAdmin = user?.role === "admin";
  const isLoggedIn = !!user;

  // Apply data-theme="dark" attribute to <html> element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  // Toggle dark mode across all pages
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("busgo_dark", String(next));
  };

  const login = (userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    localStorage.setItem("busgo_user", JSON.stringify(normalizedUser));
    setDarkMode(localStorage.getItem("busgo_dark") === "true");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("busgo_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isLoggedIn,
        darkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
