import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../../lib/firebase';
import { UserProfile } from '../../types/journal';
import { apiService } from '../../services/api';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Single Source of Truth: onAuthStateChanged from Firebase Auth SDK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      try {
        if (currentFbUser) {
          let idToken: string | null = null;
          try {
            idToken = await currentFbUser.getIdToken(/* forceRefresh */ false);
            apiService.setToken(idToken);
            setToken(idToken);
          } catch (tokenErr) {
            console.warn('[AuthContext] getIdToken error:', tokenErr);
          }

          setFirebaseUser(currentFbUser);

          const profile: UserProfile = {
            uid: currentFbUser.uid,
            displayName: currentFbUser.displayName || currentFbUser.email?.split('@')[0] || 'Owner',
            email: currentFbUser.email || '',
            avatar: currentFbUser.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(currentFbUser.uid)}`,
            createdAt: currentFbUser.metadata.creationTime || new Date().toISOString(),
          };

          // Background profile sync attempt (non-blocking)
          if (idToken) {
            apiService.syncProfile(currentFbUser.uid, profile).catch((syncErr) => {
              console.warn('[AuthContext] Background profile sync warning:', syncErr);
            });
          }

          setUser(profile);
        } else {
          // Unauthenticated: clean state, show login screen.
          setUser(null);
          setFirebaseUser(null);
          setToken(null);
          apiService.setToken(null);
        }
      } catch (err) {
        console.error('[AuthContext] onAuthStateChanged error:', err);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const createProfileFromFirebaseUser = (fbUser: FirebaseUser): UserProfile => ({
    uid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Owner',
    email: fbUser.email || '',
    avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(fbUser.uid)}`,
    createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
  });

  // Email & Password Sign-In
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await userCredential.user.getIdToken();
      apiService.setToken(idToken);
      setToken(idToken);
      setFirebaseUser(userCredential.user);
      const profile = createProfileFromFirebaseUser(userCredential.user);
      setUser(profile);
      apiService.syncProfile(userCredential.user.uid, profile).catch(console.warn);
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Registration
  const register = async (displayName: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });
      }
      const idToken = await userCredential.user.getIdToken();
      apiService.setToken(idToken);
      setToken(idToken);
      setFirebaseUser(userCredential.user);
      const profile = createProfileFromFirebaseUser(userCredential.user);
      if (displayName.trim()) profile.displayName = displayName.trim();
      setUser(profile);
      apiService.syncProfile(userCredential.user.uid, profile).catch(console.warn);
    } finally {
      setIsLoading(false);
    }
  };

  // Real OAuth Popup Authentication (Google / GitHub)
  const loginWithOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const authProvider = provider === 'google' ? googleProvider : githubProvider;
      const userCredential = await signInWithPopup(auth, authProvider);
      const idToken = await userCredential.user.getIdToken();
      apiService.setToken(idToken);
      setToken(idToken);
      setFirebaseUser(userCredential.user);
      const profile = createProfileFromFirebaseUser(userCredential.user);
      setUser(profile);
      apiService.syncProfile(userCredential.user.uid, profile).catch(console.warn);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setToken(null);
    apiService.setToken(null);
  };

  // Password Reset
  const resetPassword = async (email: string): Promise<string> => {
    await sendPasswordResetEmail(auth, email.trim());
    return `Password reset link has been dispatched to ${email.trim()} via Firebase Auth.`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithOAuth,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
