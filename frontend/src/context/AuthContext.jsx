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
    const saved = localStorage.getItem("busgo_user");
    return saved ? normalizeUser(JSON.parse(saved)) : null;
  });

  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("busgo_user");
    const savedUser = saved ? normalizeUser(JSON.parse(saved)) : null;
    
    if (savedUser) {
      return localStorage.getItem("busgo_dark") === "true";
    }
    return false;
  });

  const isAdmin = user?.role === "admin";
  const isLoggedIn = !!user;

  
  useEffect(() => {
    if (isLoggedIn && darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode, isLoggedIn]);

  
  const toggleDarkMode = () => {
    if (!isLoggedIn) return;
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
    setDarkMode(false);
    localStorage.removeItem("busgo_user");
    localStorage.removeItem("busgo_dark");
    document.documentElement.removeAttribute("data-theme");
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
