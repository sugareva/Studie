import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction utilitaire pour la gestion des erreurs avec logs
export const handleSupabaseError = (error, operation) => {
  console.error(`Erreur Supabase (${operation}):`, error);
  // Vous pouvez ajouter ici un service de journalisation externe si nécessaire
  return error;
};

// Fonctions d'aide pour les opérations communes
export const supabaseHelpers = {
  // Récupérer les données de l'utilisateur connecté
  getCurrentUser: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session?.user || null;
    } catch (error) {
      handleSupabaseError(error, 'getCurrentUser');
      return null;
    }
  },
  
  // Charger les objectifs d'un utilisateur
  loadGoals: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId.toString());
        
      if (error) throw error;
      
      console.log('Objectifs chargés:', data);
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'loadGoals');
      return [];
    }
  },
  
  // Sauvegarder un objectif
  saveGoal: async (goal, userId) => {
    try {
      const goalWithUserId = {
        ...goal,
        user_id: userId.toString()
      };
      
      console.log('Sauvegarde de l\'objectif:', goalWithUserId);
      
      const { data, error } = await supabase
        .from('goals')
        .upsert(goalWithUserId)
        .select();
        
      if (error) throw error;
      
      console.log('Objectif sauvegardé:', data);
      return data;
    } catch (error) {
      handleSupabaseError(error, 'saveGoal');
      throw error;
    }
  },
  
  // Supprimer un objectif
  deleteGoal: async (goalId, userId) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId.toString());
        
      if (error) throw error;
      
      console.log('Objectif supprimé:', goalId);
      return true;
    } catch (error) {
      handleSupabaseError(error, 'deleteGoal');
      throw error;
    }
  },
  
  // Fonctions similaires pour les sessions...
};