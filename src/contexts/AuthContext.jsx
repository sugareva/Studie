// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';
import { setupSessionPersistence } from '../utils/authPersistence';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Vérifier l'utilisateur actuel
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Erreur lors de la récupération de la session:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Configurer le système de persistance de session
    const cleanupPersistence = setupSessionPersistence();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );
    
    // Nettoyer les abonnements lors du démontage du composant
    return () => {
      subscription.unsubscribe();
      cleanupPersistence();
    };
  }, []);

  const value = {
    user,
    loading,
    
    signIn: async (email, password, rememberMe = true) => {
      try {
        // Définir une durée de session plus longue si "Remember Me" est activé
        const expiresIn = rememberMe ? 604800 : 3600; // 7 jours ou 1 heure
        
        const response = await supabase.auth.signInWithPassword({ 
          email, 
          password,
          options: {
            expiresIn
          }
        });
        
        console.log("Réponse de signIn:", response); // Log pour déboguer
        return response;
      } catch (error) {
        console.error("Erreur dans signIn:", error);
        throw error;
      }
    },
    
    signUp: async (email, password) => {
      try {
        // Obtenir la langue actuelle
        const currentLanguage = i18n.language || 'en';
        // URL de redirection vers le dashboard
        const redirectUrl = `${window.location.origin}/dashboard`;
        
        const response = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              lang: currentLanguage // Inclure la langue actuelle
            }
          }
        });
        
        console.log("Réponse de signUp:", response); // Log pour déboguer
        return response;
      } catch (error) {
        console.error("Erreur dans signUp:", error);
        throw error;
      }
    },
    
    signOut: () => supabase.auth.signOut(),
    
    resetPassword: async (email) => {
      try {
        // Obtenir la langue actuelle
        const currentLanguage = i18n.language || 'en';
        // URL de redirection après réinitialisation
        const redirectUrl = `${window.location.origin}/reset-password`;
        
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
          data: {
            lang: currentLanguage
          }
        });
        
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error("Erreur dans resetPassword:", error);
        return { data: null, error };
      }
    },
    
    updatePassword: async (newPassword) => {
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error("Erreur dans updatePassword:", error);
        return { data: null, error };
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}