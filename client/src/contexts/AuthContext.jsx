import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set default token if exists in local storage
  useEffect(() => {
    const token = localStorage.getItem('safecommute_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(response => {
          if (response.data?.success) {
            setCurrentUser(response.data.user);
          } else {
            localStorage.removeItem('safecommute_token');
            delete axios.defaults.headers.common['Authorization'];
            setCurrentUser(null);
          }
        })
        .catch(err => {
          console.error('Failed to restore session:', err.message);
          localStorage.removeItem('safecommute_token');
          delete axios.defaults.headers.common['Authorization'];
          setCurrentUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function signup(email, password, name, phone) {
    const response = await axios.post('/api/auth/signup', {
      email,
      password,
      name,
      phone
    });

    if (response.data?.success) {
      const { token, user } = response.data;
      localStorage.setItem('safecommute_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(user);
      return user;
    } else {
      throw new Error(response.data?.error || 'Registration failed');
    }
  }

  async function login(email, password) {
    const response = await axios.post('/api/auth/login', {
      email,
      password
    });

    if (response.data?.success) {
      const { token, user } = response.data;
      localStorage.setItem('safecommute_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(user);
      return user;
    } else {
      throw new Error(response.data?.error || 'Login failed');
    }
  }

  function logout() {
    localStorage.removeItem('safecommute_token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    return Promise.resolve();
  }

  const value = {
    currentUser,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
