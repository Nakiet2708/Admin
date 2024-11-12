import React, { createContext, useState, useContext, useEffect } from 'react';
import Cookies from 'js-cookie';
import { getAuth } from "firebase/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userCookie = Cookies.get('user');
        const tokenCookie = Cookies.get('token');

        if (userCookie && tokenCookie) {
          const auth = getAuth();
          // Kiểm tra trạng thái người dùng hiện tại
          const currentUser = auth.currentUser;
          
          if (currentUser) {
            setIsAuthenticated(true);
          } else {
            // Nếu không có user hiện tại, xóa cookies
            Cookies.remove('user');
            Cookies.remove('token');
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Lỗi khởi tạo xác thực:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);