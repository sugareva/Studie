// src/utils/authPersistence.js

import { supabase } from '../lib/supabase';

// Constantes pour les clés de stockage local
const TOKEN_EXPIRY_KEY = 'studie_token_expiry';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes en millisecondes

// Fonction pour vérifier si la session est active
export const isSessionActive = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
};

// Fonction pour rafraîchir manuellement le token si nécessaire
export const refreshTokenIfNeeded = async () => {
  const { data } = await supabase.auth.getSession();
  
  if (!data.session) {
    console.log('Pas de session active, impossible de rafraîchir');
    return false;
  }
  
  // Si la session expire dans moins de 10 minutes, on la renouvelle
  const expiresAt = data.session.expires_at;
  const expirationTime = new Date(expiresAt * 1000);
  const now = new Date();
  const timeUntilExpiry = expirationTime - now;
  
  // Rafraîchir si moins de 10 minutes restantes
  if (timeUntilExpiry < 10 * 60 * 1000) {
    console.log('Rafraîchissement du token (expiration dans', Math.round(timeUntilExpiry / 1000 / 60), 'minutes)');
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Erreur lors du rafraîchissement de la session', error);
      return false;
    }
    
    // Enregistrer le nouveau moment d'expiration
    try {
      if (refreshData.session && refreshData.session.expires_at) {
        const newExpiryTime = new Date(refreshData.session.expires_at * 1000);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiryTime.toString());
        console.log('Nouveau token valide jusqu\'à', newExpiryTime);
      }
    } catch (e) {
      console.error('Erreur lors de la mise à jour de l\'expiration', e);
    }
    
    return !!refreshData.session;
  } else {
    console.log('Token encore valide pour', Math.round(timeUntilExpiry / 1000 / 60), 'minutes');
  }
  
  return true;
};

// Fonction pour configurer le rafraîchissement périodique
export const setupPeriodicTokenRefresh = () => {
  // Vérifier et rafraîchir immédiatement si nécessaire
  refreshTokenIfNeeded();
  
  // Configurer un intervalle pour vérifier régulièrement
  const intervalId = setInterval(async () => {
    const isActive = await refreshTokenIfNeeded();
    if (!isActive) {
      // Si on ne peut pas rafraîchir, arrêter l'intervalle
      clearInterval(intervalId);
      console.log('Arrêt du rafraîchissement périodique - session inactive');
    }
  }, REFRESH_INTERVAL);
  
  // Retourner l'ID d'intervalle pour pouvoir l'arrêter plus tard si nécessaire
  return intervalId;
};

// Fonction pour surveiller l'état de l'application et maintenir la connexion
export const setupSessionPersistence = () => {
  // Configurer le rafraîchissement périodique
  const refreshIntervalId = setupPeriodicTokenRefresh();
  
  // Rafraîchir le token lorsque l'application revient au premier plan
  const visibilityChangeHandler = () => {
    if (document.visibilityState === 'visible') {
      console.log('Application revenue au premier plan, vérification de la session');
      refreshTokenIfNeeded();
    }
  };
  
  document.addEventListener('visibilitychange', visibilityChangeHandler);
  
  // Configurer la détection de connexion/déconnexion réseau
  const onlineHandler = () => {
    console.log('Connexion internet rétablie, vérification de la session');
    refreshTokenIfNeeded();
  };
  
  window.addEventListener('online', onlineHandler);
  
  // Nettoyer lors du déchargement de l'application
  return () => {
    clearInterval(refreshIntervalId);
    document.removeEventListener('visibilitychange', visibilityChangeHandler);
    window.removeEventListener('online', onlineHandler);
    console.log('Nettoyage du système de persistance de session');
  };
};