/**
 * Protected Route Component
 * JWT-based route protection with beautiful loading states
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import LoginForm from './LoginForm';
import { cn } from '../../lib/utils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
  className?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback, 
  className 
}: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Validate token (in real app, this would be an API call)
      const user = JSON.parse(userStr);
      
      // Mock token validation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if token is expired (mock validation)
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check role permissions
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        setError(`Access denied. Required role: ${requiredRole}`);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setUser(user);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error('Authentication check failed:', err);
      setIsAuthenticated(false);
      setError('Authentication verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (credentials: any) => {
    setIsLoading(true);
    try {
      // Mock login API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockUser: User = {
        id: 1,
        name: 'John Doe',
        email: credentials.email,
        role: 'admin'
      };

      const mockToken = `jwt-token-${Date.now()}`;
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24); // 24 hours expiry

      localStorage.setItem('authToken', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('tokenExpiry', expiryDate.toISOString());

      setUser(mockUser);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      setError('Login failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
          data-testid="auth-loading"
        >
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
              >
                <Shield className="h-6 w-6 text-white" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Verifying Access
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we check your credentials...
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600">Authenticating</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Access denied due to role restrictions
  if (error && isAuthenticated === false) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900', className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
          data-testid="access-denied"
        >
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="space-y-6">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Access Denied
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {error}
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <Button onClick={handleLogout} variant="outline">
                  Sign Out
                </Button>
                <Button onClick={() => window.history.back()}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show login form
  if (isAuthenticated === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={cn('min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4', className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
          data-testid="login-required"
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please sign in to access this page
            </p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </motion.div>
      </div>
    );
  }

  // Authenticated - render children
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="protected-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={className}
        data-testid="protected-content"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}