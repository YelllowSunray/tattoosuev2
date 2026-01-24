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

    // Add a timeout to force loading to false if onAuthStateChanged takes too long
    // This is especially important for Safari where IndexedDB can be slow or fail
    // Safari often takes longer to check IndexedDB, causing the loading state to persist
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 seconds max wait - same as AuthButton timeout

    const unsubscribe = onAuthStateChanged(
      auth, 
      (user) => {
        clearTimeout(loadingTimeout);
        setUser(user);
        setLoading(false);
      },
      (error) => {
        clearTimeout(loadingTimeout);
        // Handle auth state change errors gracefully
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Detect Safari for better diagnostics
    const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Retry logic for Vercel network issues
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Log Safari attempts for debugging
        if (isSafari && attempt === 0) {
          console.log('Safari sign-in attempt - checking Firebase connectivity...');
        }
        
        // Increase timeout to 60 seconds for Vercel
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Sign in request timed out. Please check your connection and try again.")), 60000);
        });
        
        const signInPromise = signInWithEmailAndPassword(auth, email, password);
        await Promise.race([signInPromise, timeoutPromise]);
        
        // Success - return immediately
        if (isSafari) {
          console.log('Safari sign-in successful');
        }
        return;
      } catch (error: any) {
        lastError = error;
        
        // Enhanced diagnostic logging
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        const currentUrl = typeof window !== 'undefined' ? window.location.href : 'unknown';
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const referrer = typeof window !== 'undefined' ? document.referrer : '';
        const wasRedirected = referrer && new URL(referrer).hostname !== currentHost;
        
        console.error('🔴 Sign-in Error Details:', {
          attempt: attempt + 1,
          code: error?.code,
          message: error?.message,
          currentHost,
          currentUrl,
          authDomain,
          isSafari,
          errorName: error?.name,
          wasRedirected,
          referrer: referrer || 'none',
          cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : 'unknown',
          localStorageAvailable: typeof window !== 'undefined' ? (() => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          })() : 'unknown',
        });
        
        // Check for domain authorization errors
        if (error?.code === 'auth/unauthorized-domain' || 
            error?.message?.toLowerCase().includes('unauthorized') ||
            error?.message?.toLowerCase().includes('domain')) {
          console.error('❌ DOMAIN AUTHORIZATION ERROR DETECTED');
          console.error('   This domain may not be authorized in Firebase Console.');
          console.error('   Fix: Firebase Console → Authentication → Settings → Authorized domains');
          console.error(`   Add: ${currentHost}`);
          if (currentHost.startsWith('www.')) {
            console.error(`   Add: ${currentHost.replace('www.', '')}`);
          } else {
            console.error(`   Add: www.${currentHost}`);
          }
          throw new Error(`Domain authorization error: ${currentHost} is not authorized. Please add this domain in Firebase Console → Authentication → Settings → Authorized domains.`);
        }
        
        // Enhanced logging for Safari
        if (isSafari) {
          console.error(`Safari sign-in error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
            code: error?.code,
            message: error?.message,
            name: error?.name,
            stack: error?.stack?.substring(0, 200) // First 200 chars of stack
          });
        }
        
        // Don't retry on authentication errors (wrong password, etc.)
        if (error?.code === 'auth/user-not-found' || 
            error?.code === 'auth/wrong-password' ||
            error?.code === 'auth/invalid-email' ||
            error?.code === 'auth/user-disabled') {
          throw error;
        }
        
        // Retry on network errors or timeouts
        if (attempt < maxRetries && (
          error?.code === 'auth/network-request-failed' ||
          error?.message?.includes('timeout')
        )) {
          if (isSafari) {
            console.log(`Safari: Retrying in ${1000 * (attempt + 1)}ms...`);
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // Handle network errors specifically with Safari-specific guidance
        if (error?.code === 'auth/network-request-failed') {
          if (isSafari) {
            throw new Error("Safari blocked the authentication request. This may be due to Safari's privacy settings. Try: Safari → Preferences → Privacy → uncheck 'Prevent cross-site tracking', or clear Safari cache and cookies for this site.");
          }
          throw new Error("Network error. Please check your internet connection and ensure Firebase is properly configured. If the problem persists, check your Firebase Auth domain settings in Vercel.");
        }
        
        throw error;
      }
    }
    
    // If we get here, all retries failed
    if (isSafari) {
      console.error('Safari sign-in failed after all retries:', lastError);
    }
    throw lastError;
  };

  const signUp = async (email: string, password: string) => {
    const isSafari = typeof window !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    // Retry logic for Vercel network issues
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Increase timeout to 60 seconds for Vercel
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Sign up request timed out. Please check your connection and try again.")), 60000);
        });
        
        const signUpPromise = createUserWithEmailAndPassword(auth, email, password);
        await Promise.race([signUpPromise, timeoutPromise]);
        
        // Success - return immediately
        return;
      } catch (error: any) {
        lastError = error;
        
        // Enhanced diagnostic logging
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        const currentUrl = typeof window !== 'undefined' ? window.location.href : 'unknown';
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const referrer = typeof window !== 'undefined' ? document.referrer : '';
        const wasRedirected = referrer && new URL(referrer).hostname !== currentHost;
        
        console.error('🔴 Sign-up Error Details:', {
          attempt: attempt + 1,
          code: error?.code,
          message: error?.message,
          currentHost,
          currentUrl,
          authDomain,
          errorName: error?.name,
          wasRedirected,
          referrer: referrer || 'none',
          cookiesEnabled: typeof navigator !== 'undefined' ? navigator.cookieEnabled : 'unknown',
          localStorageAvailable: typeof window !== 'undefined' ? (() => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          })() : 'unknown',
        });
        
        // Check for domain authorization errors
        if (error?.code === 'auth/unauthorized-domain' || 
            error?.message?.toLowerCase().includes('unauthorized') ||
            error?.message?.toLowerCase().includes('domain')) {
          console.error('❌ DOMAIN AUTHORIZATION ERROR DETECTED');
          console.error('   This domain may not be authorized in Firebase Console.');
          console.error('   Fix: Firebase Console → Authentication → Settings → Authorized domains');
          console.error(`   Add: ${currentHost}`);
          if (currentHost.startsWith('www.')) {
            console.error(`   Add: ${currentHost.replace('www.', '')}`);
          } else {
            console.error(`   Add: www.${currentHost}`);
          }
          throw new Error(`Domain authorization error: ${currentHost} is not authorized. Please add this domain in Firebase Console → Authentication → Settings → Authorized domains.`);
        }
        
        // Don't retry on validation errors
        if (error?.code === 'auth/email-already-in-use' ||
            error?.code === 'auth/invalid-email' ||
            error?.code === 'auth/weak-password') {
          throw error;
        }
        
        // Retry on network errors or timeouts
        if (attempt < maxRetries && (
          error?.code === 'auth/network-request-failed' ||
          error?.message?.includes('timeout')
        )) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // Handle network errors specifically
        if (error?.code === 'auth/network-request-failed') {
          throw new Error("Network error. Please check your internet connection and ensure Firebase is properly configured. If the problem persists, check your Firebase Auth domain settings in Vercel.");
        }
        
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
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


