// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import i18n from '../i18n'; // Importez votre configuration i18n (ajustez le chemin)

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
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signIn: async (email, password) => {
      try {
        const response = await supabase.auth.signInWithPassword({ email, password });
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
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}