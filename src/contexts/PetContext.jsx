// src/contexts/PetContext.jsx
// Ce fichier centralise la logique d'état mais reste simple
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRive } from '@rive-app/react-canvas';

// Constantes
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';
const CLAIMED_CROQUETTES_KEY = 'CLAIMED_CROQUETTES';
const MAX_LEVEL = 5;
const LEVEL_PROGRESS_PER_DAY = 15; // 15% de progression par jour consécutif

// Création du contexte
const PetContext = createContext();

// Hook pour utiliser le contexte
export function usePet() {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error('usePet doit être utilisé à l\'intérieur d\'un PetProvider');
  }
  return context;
}

// Provider qui encapsule la logique
export function PetProvider({ children }) {
  const { user } = useAuth();
  const [petName, setPetName] = useState('');
  const [happiness, setHappiness] = useState(100);
  const [croquettes, setCroquettes] = useState(0);
  const [consecutiveDays, setConsecutiveDays] = useState(0);
  const [isOnVacation, setIsOnVacation] = useState(false);
  const [chatMood, setChatMood] = useState('happy');
  const [lastFedTime, setLastFedTime] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [petLevel, setPetLevel] = useState(1);
const [levelProgress, setLevelProgress] = useState(0);
const [currentPose, setCurrentPose] = useState('default');
  
  // État pour les objectifs
  const [goals, setGoals] = useState([]);
  const [todayGoalProgress, setTodayGoalProgress] = useState([]);
  const [successToday, setSuccessToday] = useState(false);
  const [activeDays, setActiveDays] = useState([]);
  const [claimedCroquettes, setClaimedCroquettes] = useState([]);
  const [activeDaysStatus, setActiveDaysStatus] = useState({
    'L': false, 'M': false, 'M': false, 'J': false, 'V': false, 'S': false, 'D': false
  });
  
  const getRiveProps = useCallback(() => {
    return {
      src: '/pet/cat_idle.riv', // Assurez-vous que ce chemin est correct
      autoplay: true
    };
  }, []);


  
  // Chargement des croquettes réclamées depuis localStorage
  useEffect(() => {
    try {
      const savedClaimedCroquettes = localStorage.getItem(CLAIMED_CROQUETTES_KEY);
      if (savedClaimedCroquettes) {
        setClaimedCroquettes(JSON.parse(savedClaimedCroquettes));
      }
    } catch (error) {
      console.error('Error loading claimed croquettes:', error);
    }
  }, []);

  // Calcul du niveau et de la progression basés sur les jours consécutifs
useEffect(() => {
  if (consecutiveDays > 0) {
    // Exemple : 7 jours = niveau 2 à 5% (7 * 15 = 105% = 1 niveau complet + 5%)
    const totalProgress = consecutiveDays * LEVEL_PROGRESS_PER_DAY;
    const level = Math.min(MAX_LEVEL, 1 + Math.floor(totalProgress / 100));
    const progress = totalProgress % 100;
    
    setPetLevel(level);
    setLevelProgress(progress);
  } else {
    setPetLevel(1);
    setLevelProgress(0);
  }
}, [consecutiveDays]);

// Changement de pose aléatoire
useEffect(() => {
  // Définir les poses disponibles
  const availablePoses = ['default', 'sitting', 'standing', 'playing'];
  
  // Fonction pour changer la pose avec un peu d'aléatoire
  const updatePose = () => {
    // Base le changement sur un multiple d'heures avec un petit aléa
    const baseTime = Math.floor(Date.now() / (1000 * 60 * 60 * 3)); // Toutes les 3 heures environ
    const randomSeed = Math.sin(baseTime) * 10000;
    const randomOffset = Math.floor(Math.abs(Math.sin(randomSeed)) * 60 * 60 * 1000); // 0-1h en ms
    
    // Détermine la pose de façon pseudoaléatoire
    const poseIndex = Math.floor(Math.abs(Math.sin(baseTime * 0.7)) * availablePoses.length);
    const newPose = availablePoses[poseIndex];
    
    setCurrentPose(newPose);
    
    // Retourne un délai pour le prochain changement (3h + offset aléatoire)
    return 3 * 60 * 60 * 1000 + randomOffset;
  };
  
  // Premier changement
  const initialDelay = updatePose();
  
  // Configure le timer pour les changements suivants
  const timerId = setTimeout(() => {
    // Intervalle récurrent après le premier délai
    const intervalId = setInterval(updatePose, 3 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, initialDelay);
  
  // Nettoyage
  return () => clearTimeout(timerId);
}, []);
  
  // Fonction pour vérifier si un objectif est prévu pour aujourd'hui
  const isGoalScheduledForToday = useCallback((goal) => {
    try {
      if (!goal.days_of_week || !Array.isArray(goal.days_of_week)) return false;
      
      const today = format(new Date(), 'EEEE', { locale: fr });
      const capitalizedDay = today.charAt(0).toUpperCase() + today.slice(1);
      
      return goal.days_of_week.includes(capitalizedDay);
    } catch (error) {
      console.error('Error checking if goal is scheduled:', error);
      return false;
    }
  }, []);

  
  
  // Mettre à jour l'affichage des jours actifs
  const updateActiveDaysDisplay = useCallback((goalsData, isSuccessToday) => {
    const daysMap = {
      'Lundi': 'L',
      'Mardi': 'M',
      'Mercredi': 'M',
      'Jeudi': 'J',
      'Vendredi': 'V',
      'Samedi': 'S',
      'Dimanche': 'D'
    };
    
    // Collecter tous les jours programmés
    const scheduledDays = new Set();
    
    for (const goal of goalsData || []) {
      if (goal.days_of_week && Array.isArray(goal.days_of_week)) {
        goal.days_of_week.forEach(day => scheduledDays.add(day));
      }
    }
    
    // Convertir en format court
    const activeDaysShort = [...scheduledDays].map(day => daysMap[day] || day.charAt(0));
    
    setActiveDays(activeDaysShort);
    
    // Mettre à jour le statut des jours (aujourd'hui en success si un objectif complété)
    const today = format(new Date(), 'EEEE', { locale: fr });
    const todayShort = daysMap[today.charAt(0).toUpperCase() + today.slice(1)];
    
    const newDaysStatus = { ...activeDaysStatus };
    if (todayShort && isSuccessToday) {
      newDaysStatus[todayShort] = true;
    }
    
    setActiveDaysStatus(newDaysStatus);
  }, [activeDaysStatus]);
  
  // Vérification des objectifs du jour
  const checkTodayGoals = useCallback(async () => {
    if (!user) return;
    
    // Recharger les croquettes réclamées depuis localStorage
    try {
      const savedClaimedCroquettes = localStorage.getItem(CLAIMED_CROQUETTES_KEY);
      if (savedClaimedCroquettes) {
        setClaimedCroquettes(JSON.parse(savedClaimedCroquettes));
      }
    } catch (error) {
      console.error('Error loading claimed croquettes in checkTodayGoals:', error);
    }
    
    
    try {
      // 1. Récupérer tous les objectifs de l'utilisateur
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (goalsError) throw goalsError;
      
      setGoals(goalsData || []);
      
      // 2. Pour chaque objectif, vérifier la progression d'aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const progressData = [];
      let anyGoalCompleted = false;
      
      for (const goal of goalsData || []) {
        const key = `${DAILY_PROGRESS_KEY}_${goal.id}_${today}`;
        const storedProgress = localStorage.getItem(key) || '0';
        const progress = parseInt(storedProgress, 10);
        const isCompleted = progress >= goal.duration;
        const isScheduledToday = isGoalScheduledForToday(goal);
        
        // Vérifier si cet objectif est déjà réclamé aujourd'hui
        const goalClaimedKey = `${goal.id}_${today}`;
        const isClaimedCroquette = claimedCroquettes.includes(goalClaimedKey);
        
        // Si l'objectif est complété et programmé aujourd'hui, mettre à jour le statut du jour
        if (isCompleted && isScheduledToday) {
          anyGoalCompleted = true;
        }
        
        progressData.push({
          goalId: goal.id,
          goalName: goal.name,
          goalColor: goal.color,
          duration: goal.duration || 0,
          progress: progress,
          isCompleted: isCompleted,
          isScheduledToday: isScheduledToday,
          isClaimedCroquette: isClaimedCroquette,
          claimKey: goalClaimedKey
        });
      }
      
      setTodayGoalProgress(progressData);
      setSuccessToday(anyGoalCompleted);
      
      // Mettre à jour activeDays pour le visuel
      updateActiveDaysDisplay(goalsData, anyGoalCompleted);
      
    } catch (error) {
      console.error('Error checking today goals:', error);
      setError('Impossible de vérifier les objectifs du jour');
    }
  }, [user, claimedCroquettes, isGoalScheduledForToday, updateActiveDaysDisplay]);
  
  // Récupération des données du pet
  const fetchPetData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Récupérer les user_settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setUserSettings(data);
      
      if (data?.pet) {
        // Mise à jour des données du pet
        setPetName(data.pet.name || '');
        setHappiness(data.pet.happiness || 100);
        setCroquettes(data.croquettes || 0);
        setConsecutiveDays(data.pet.consecutive_days || 0);
        setIsOnVacation(data.is_on_vacation || false);
        setChatMood(data.pet.happiness === 0 ? 'sad' : 'happy');
        setLastFedTime(data.pet.last_fed_time || null);
        
       
      }
      
      // Vérifier les objectifs du jour
      await checkTodayGoals();
      
    } catch (error) {
      console.error('Error fetching pet data:', error);
      setError('Impossible de récupérer les données du pet');
    } finally {
      setLoading(false);
    }
  }, [user, checkTodayGoals]);

  // Mettre à jour les données du pet
  const updatePetData = useCallback(async (updatedData) => {
    if (!user || !userSettings?.pet) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ 
          pet: { ...userSettings.pet, ...updatedData },
          // Si les croquettes sont présentes dans updatedData, les mettre à jour aussi
          ...(updatedData.croquettes !== undefined ? { croquettes: updatedData.croquettes } : {})
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Mettre à jour l'état local
      setUserSettings(prev => ({
        ...prev,
        pet: { ...prev.pet, ...updatedData },
        ...(updatedData.croquettes !== undefined ? { croquettes: updatedData.croquettes } : {})
      }));
      
      // Mettre à jour les variables d'état individuelles
      if (updatedData.name !== undefined) setPetName(updatedData.name);
      if (updatedData.happiness !== undefined) setHappiness(updatedData.happiness);
      if (updatedData.croquettes !== undefined) setCroquettes(updatedData.croquettes);
      if (updatedData.consecutive_days !== undefined) setConsecutiveDays(updatedData.consecutive_days);
      if (updatedData.is_on_vacation !== undefined) setIsOnVacation(updatedData.is_on_vacation);
      if (updatedData.last_fed_time !== undefined) setLastFedTime(updatedData.last_fed_time);
      
      // Mettre à jour l'humeur du chat si le bonheur change
      if (updatedData.happiness !== undefined) {
        setChatMood(updatedData.happiness === 0 ? 'sad' : 'happy');
      }
      
    } catch (error) {
      console.error('Error updating pet data:', error);
      setError('Impossible de mettre à jour les données du pet');
    }
  }, [user, userSettings]);

  // Création d'un nouveau pet
  const createPet = useCallback(async (newPetName) => {
    if (!user || !newPetName.trim()) return;
    
    try {
      setLoading(true);
      
      const petData = {
        name: newPetName.trim(),
        type: 'chat',
        happiness: 100,
        consecutive_days: 0,
        unlocked_accessories: [1], // Le collier est débloqué par défaut
        equipped_accessories: [],
        is_on_vacation: false,
        last_fed_time: null,
      };
      
      const { error } = await supabase
        .from('user_settings')
        .update({ 
          pet: petData,
          croquettes: 0, // Commencer avec 3 croquettes
          is_on_vacation: false
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Mettre à jour les états locaux
      setPetName(newPetName.trim());
      setHappiness(100);
      setCroquettes(3);
      setConsecutiveDays(0);
      setIsOnVacation(false);
      setLastFedTime(null);
      setChatMood('happy');
      
      // Recharger les données complètes
      await fetchPetData();
      
    } catch (error) {
      console.error('Error creating pet:', error);
      setError('Impossible de créer le pet');
    } finally {
      setLoading(false);
    }
  }, [user, fetchPetData]);
  
  // Alimentation du pet
  const feedPet = useCallback(async () => {
    if (croquettes <= 0) return false;
    
    try {
      // Mettre à jour le bonheur et les croquettes
      const newHappiness = 24;
      const newCroquettes = croquettes - 1;
      
      // Mettre à jour la date de dernier nourrissage
      const currentTime = new Date().toISOString();
      
      // Vérifier si c'est la première nourriture de la journée
      const today = new Date().toISOString().split('T')[0];
      const lastFedDate = lastFedTime ? new Date(lastFedTime).toISOString().split('T')[0] : null;
      
      // Incrémenter les jours consécutifs si c'est la première fois aujourd'hui
      let newConsecutiveDays = consecutiveDays;
      if (lastFedDate !== today) {
        newConsecutiveDays = consecutiveDays + 1;
      }

      // Mettre à jour en base de données
      await updatePetData({
        happiness: newHappiness,
        croquettes: newCroquettes,
        last_fed_time: currentTime,
        consecutive_days: newConsecutiveDays
      });
      
      // Mettre à jour les états locaux immédiatement
      setHappiness(newHappiness);
      setCroquettes(newCroquettes);
      setLastFedTime(currentTime);
      setConsecutiveDays(newConsecutiveDays);
      //setChatMood(newHappiness === 0 ? 'sad' : 'happy');
     setChatMood('happy'); 
      return true;
    } catch (error) {
      console.error('Error feeding pet:', error);
      return false;
    }
  }, [croquettes, happiness, lastFedTime, consecutiveDays, updatePetData]);
  
  // Réclamation d'une croquette
  const claimCroquette = useCallback(async (goalId) => {
    // Trouver l'objectif dans la liste
    const goalProgress = todayGoalProgress.find(g => g.goalId === goalId);
    
    if (!goalProgress || !goalProgress.isCompleted || !goalProgress.isScheduledToday) {
      return false;
    }
    
    // Vérifier si cette croquette a déjà été réclamée
    const isAlreadyClaimed = claimedCroquettes.includes(goalProgress.claimKey);
    if (isAlreadyClaimed) {
     
      return false;
    }
    
    try {
      // Incrémenter le nombre de croquettes
      const newCroquettes = croquettes + 1;
      
      // Ajouter cet objectif à la liste des croquettes réclamées
      const newClaimedCroquettes = [...claimedCroquettes, goalProgress.claimKey];
      setClaimedCroquettes(newClaimedCroquettes);
      
      // Sauvegarder dans localStorage pour persistance
      localStorage.setItem(CLAIMED_CROQUETTES_KEY, JSON.stringify(newClaimedCroquettes));
     
      
      // Mettre à jour en base de données
      await updatePetData({ croquettes: newCroquettes });
      
      // Mettre à jour l'état local
      setCroquettes(newCroquettes);
      
      // Mettre à jour l'affichage des objectifs
      const updatedProgress = todayGoalProgress.map(item => 
        item.goalId === goalId 
          ? { ...item, isClaimedCroquette: true }
          : item
      );
      setTodayGoalProgress(updatedProgress);
      
      return true;
    } catch (error) {
      console.error('Error claiming croquette:', error);
      return false;
    }
  }, [todayGoalProgress, croquettes, claimedCroquettes, updatePetData]);
  
  // Gestion du mode vacances
  const toggleVacationMode = useCallback(async () => {
    const newVacationState = !isOnVacation;
    
    try {
      // Mettre à jour la base de données
      const { error } = await supabase
        .from('user_settings')
        .update({ is_on_vacation: newVacationState })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Mettre à jour l'état local
      setIsOnVacation(newVacationState);
      
      return true;
    } catch (error) {
      console.error('Error toggling vacation mode:', error);
      return false;
    }
  }, [isOnVacation, user.id]);
  
  // Chargement des données lors du montage
  // Modification du useEffect qui charge les données
useEffect(() => {
    let isMounted = true; // Flag pour éviter les mises à jour si le composant est démonté
    
    if (user) {
      const loadData = async () => {
        setLoading(true);
        try {
          // Récupérer les user_settings
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
    
          if (error) throw error;
          
          if (isMounted) {
            setUserSettings(data);
            
            if (data?.pet) {
              setPetName(data.pet.name || '');
              setHappiness(data.pet.happiness || 100);
              setCroquettes(data.croquettes || 0);
              setConsecutiveDays(data.pet.consecutive_days || 0);
              setIsOnVacation(data.is_on_vacation || false);
              setChatMood(data.pet.happiness === 0 ? 'sad' : 'happy');
              setLastFedTime(data.pet.last_fed_time || null);
              
              
            }
            
            // Important: Ne pas appeler checkTodayGoals() ici car ça créera une boucle
            // Charger les objectifs séparément
            loadGoals();
          }
        } catch (error) {
          console.error('Error fetching pet data:', error);
          if (isMounted) {
            setError('Impossible de récupérer les données du pet');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      
      const loadGoals = async () => {
        try {
          // Récupérer tous les objectifs de l'utilisateur
          const { data: goalsData, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id);
            
          if (goalsError) throw goalsError;
          
          if (isMounted) {
            setGoals(goalsData || []);
          
            
            // Traiter les données des objectifs
            processGoalsData(goalsData || []);
          }
        } catch (error) {
          console.error('Error loading goals:', error);
        }
      };
      
      loadData();
      
      // Nettoyage
      return () => {
        isMounted = false;
      };
    }
  }, [user]); // Dépendance uniquement à user, pas aux fonctions
  
  // Fonction pour traiter les données des objectifs sans créer de boucle
  const processGoalsData = (goalsData) => {
    const today = new Date().toISOString().split('T')[0];
    const progressData = [];
    let anyGoalCompleted = false;
    
    // IMPORTANT : Recharger les croquettes réclamées directement depuis localStorage
    let currentClaimedCroquettes = [];
    try {
      const savedClaimedCroquettes = localStorage.getItem(CLAIMED_CROQUETTES_KEY);
      if (savedClaimedCroquettes) {
        currentClaimedCroquettes = JSON.parse(savedClaimedCroquettes);
        
        // Mettre également à jour l'état du composant
        setClaimedCroquettes(currentClaimedCroquettes);
      }
    } catch (error) {
      console.error('Error loading claimed croquettes in processGoalsData:', error);
    }
    

    
    for (const goal of goalsData) {
      const key = `${DAILY_PROGRESS_KEY}_${goal.id}_${today}`;
      const storedProgress = localStorage.getItem(key) || '0';
      const progress = parseInt(storedProgress, 10);
      const isCompleted = progress >= goal.duration;
      const isScheduledToday = isGoalScheduledForToday(goal);
      
      // Vérifier si cet objectif est déjà réclamé aujourd'hui
      // IMPORTANT : Utiliser currentClaimedCroquettes au lieu de claimedCroquettes
      const goalClaimedKey = `${goal.id}_${today}`;
      const isClaimedCroquette = currentClaimedCroquettes.includes(goalClaimedKey);
      

      
      if (isCompleted && isScheduledToday) {
        anyGoalCompleted = true;
      }
      
      progressData.push({
        goalId: goal.id,
        goalName: goal.name,
        goalColor: goal.color,
        duration: goal.duration || 0,
        progress: progress,
        isCompleted: isCompleted,
        isScheduledToday: isScheduledToday,
        isClaimedCroquette: isClaimedCroquette,
        claimKey: goalClaimedKey
      });
    }
    
    setTodayGoalProgress(progressData);
    setSuccessToday(anyGoalCompleted);
    
    // Mettre à jour activeDays pour le visuel
    updateActiveDaysDisplay(goalsData, anyGoalCompleted);
  };
  
  // Gestion de la perte de bonheur quotidienne
  useEffect(() => {
    // Version améliorée: vérifier le temps écoulé depuis le dernier nourrissage
    const checkHappinessLoss = () => {
      if (isOnVacation || !lastFedTime) return;
      
      const now = new Date();
      const lastFed = new Date(lastFedTime);
      
      // Calculer le nombre d'heures écoulées depuis le dernier repas
      const hoursSinceLastFed = Math.floor((now - lastFed) / (1000 * 60 * 60));
      
      // Sur une échelle de 24, chaque heure = -1 point
      const newHappiness = Math.max(0, 24 - hoursSinceLastFed);
      
      if (newHappiness !== happiness) {
        setHappiness(newHappiness);
        setChatMood(newHappiness < 12 ? 'sad' : 'happy');
        
        // Mettre à jour en base de données
        updatePetData({ happiness: newHappiness });
      }
    };
    
    // Vérifier au chargement
    checkHappinessLoss();
    
    // Vérifier toutes les heures
    const intervalId = setInterval(checkHappinessLoss, 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [happiness, isOnVacation, lastFedTime, updatePetData]);
  
  // Mise à jour de l'humeur en fonction du bonheur
  useEffect(() => {
    setChatMood(happiness === 0 ? 'sad' : 'happy');
  }, [happiness]);
  
  return (
    <PetContext.Provider value={{
      // État du pet
      petName,
      happiness,
      croquettes,
      consecutiveDays,
      isOnVacation,
      chatMood,
      lastFedTime,
      userSettings,
      getRiveProps,
      
      
      // État des objectifs
      goals,
      todayGoalProgress,
      successToday,
      activeDays,
      activeDaysStatus,
      
      // État général
      loading,
      error,
      
      // Nouvelles propriétés pour le système de niveaux
      petLevel,
      levelProgress,
      currentPose,
      
      // Actions
      feedPet,
      claimCroquette,
      toggleVacationMode,
      createPet,
      updatePetData,
      checkTodayGoals,
      refreshData: fetchPetData
    }}>
      {children}
    </PetContext.Provider>
  );
}
