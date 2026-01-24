"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle unhandled promise rejections from Firebase IndexedDB errors
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress known Firebase IndexedDB errors (non-critical)
      if (event.reason?.message?.includes('IndexedDB') || 
          event.reason?.code === 'app/idb-get' ||
          event.reason?.name === 'AbortError') {
        event.preventDefault(); // Prevent console error
        console.warn('Firebase IndexedDB warning (non-critical):', event.reason?.message || event.reason);
        return;
      }
      // Log other unhandled rejections
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const unsubscribe = onAuthStateChanged(
      auth, 
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        // Handle auth state change errors gracefully
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    );

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Add timeout to prevent hanging on Vercel
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Sign in request timed out. Please check your connection and try again.")), 30000);
    });
    
    try {
      const signInPromise = signInWithEmailAndPassword(auth, email, password);
      await Promise.race([signInPromise, timeoutPromise]);
    } catch (error: any) {
      // Handle network errors specifically
      if (error?.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your internet connection and ensure Firebase is properly configured. If the problem persists, check your Firebase Auth domain settings.");
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    // Add timeout to prevent hanging on Vercel
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Sign up request timed out. Please check your connection and try again.")), 30000);
    });
    
    try {
      const signUpPromise = createUserWithEmailAndPassword(auth, email, password);
      await Promise.race([signUpPromise, timeoutPromise]);
    } catch (error: any) {
      // Handle network errors specifically
      if (error?.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your internet connection and ensure Firebase is properly configured. If the problem persists, check your Firebase Auth domain settings.");
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


