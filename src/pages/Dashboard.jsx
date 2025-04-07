// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Timer from '../components/Timer';
import GoalSetting from '../components/GoalSetting';
import TodoList from '../components/TodoList';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import UserOptionsModal from '../components/UserOptionsModal';
import Navbar from '../components/Navbar';
import OnboardingModal from '../components/OnboardingModal';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import { convertToStoredFormat } from '../utils/dayMapping';

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const [showTodoList, setShowTodoList] = useState(true);
  const [ignoreDate, setIgnoreDate] = useState(false);
  
  // Fonction pour gérer la sélection d'un objectif
  const handleGoalSelect = (goal) => {
    setSelectedGoal(goal);
  };

  // Ajouter cette constante
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';

// Ajouter cette fonction utilitaire
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Ajouter cette fonction pour mettre à jour la progression journalière
const updateDailyProgress = (goalId, duration) => {
  try {
    const today = getTodayDate();
    const key = `${DAILY_PROGRESS_KEY}_${goalId}_${today}`;
    
    // Récupérer la progression existante
    let currentProgress = 0;
    const storedProgress = localStorage.getItem(key);
    if (storedProgress) {
      currentProgress = parseInt(storedProgress, 10);
    }
    
    // Ajouter la nouvelle durée
    const newProgress = currentProgress + duration;
    
    // Enregistrer la progression mise à jour
    localStorage.setItem(key, newProgress.toString());
    
    return newProgress;
  } catch (error) {
    console.error(t('dashboard.errorUpdatingProgress'), error);
    return 0;
  }
};
  
  // Fonction pour gérer l'arrêt du timer avec mise à jour directe des données
  const handleTimerStop = (goalId, elapsedTime, updatedGoal) => {
    updateDailyProgress(goalId, elapsedTime);
  
    // Mise à jour directe à partir des données de la DB
    if (updatedGoal) {
      setSelectedGoal(updatedGoal);
      // Déclencher un rafraîchissement pour tous les objectifs
      setRefreshTrigger(prev => prev + 1);
    } else {
      // Fallback vers la méthode précédente au cas où
      if (!selectedGoal || goalId !== selectedGoal.id) return;
      const newCompletedDuration = (selectedGoal.completed_duration || 0) + elapsedTime;
      setSelectedGoal({
        ...selectedGoal,
        completed_duration: newCompletedDuration
      });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error(t('dashboard.errorCheckingOnboarding'), error);
          return;
        }
        
        // Si aucun paramètre n'existe ou si onboarding_completed est false, afficher l'onboarding
        if (!data || data.onboarding_completed !== true) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error(t('dashboard.errorInOnboardingCheck'), error);
      }
    }
    
    checkOnboardingStatus();
  }, [user, t]);
  
  // Gérer la complétion de l'onboarding
  const handleOnboardingComplete = (updatedSettings) => {
    if (updatedSettings) {
      setUserSettings(updatedSettings);
    }
    setShowOnboarding(false);
    // Rafraîchir les objectifs et les todos
    setRefreshTrigger(prev => prev + 1);
  };

  // Charger les paramètres de l'utilisateur au chargement
  useEffect(() => {
    async function fetchUserSettings() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = pas de données trouvées
          console.error(t('dashboard.errorFetchingSettings'), error);
          return;
        }
        
        if (data) {
          setUserSettings(data);
          setShowTodoList(data.show_todo_list !== false); // Default to true if not set
        }
      } catch (error) {
        console.error(t('dashboard.errorInFetchSettings'), error);
      }
    }
    
    fetchUserSettings();
  }, [user, t]);

  // Gestionnaire de mise à jour des paramètres utilisateur
  const handleUpdateSettings = (updatedSettings) => {
    setUserSettings(updatedSettings);
    setShowTodoList(updatedSettings.show_todo_list !== false);
  };

  // Formater la date actuelle en utilisant date-fns pour la traduction
  const formatCurrentDate = () => {
    const locale = i18n.language === 'fr' ? fr : enGB;
    return format(currentDate, 'EEEE d MMMM', { locale });
  };
  
  // Naviguer au jour précédent
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setIgnoreDate(false);
  };
  
  // Naviguer au jour suivant
  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setIgnoreDate(false);
  };
  
  // Basculer l'affichage de tous les objectifs
  const toggleIgnoreDate = () => {
    setIgnoreDate(!ignoreDate);
  };

  // Obtenir le nom du jour pour les composants qui en ont besoin
  const getCurrentDayName = () => {
    const locale = i18n.language === 'fr' ? fr : enGB;
    const day = format(currentDate, 'EEEE', { locale });
    // Capitaliser la première lettre
    const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
    
    // Si on est en anglais, convertir au format stocké (français)
    if (i18n.language !== 'fr') {
      return convertToStoredFormat(formattedDay, i18n.language);
    }
    
    return formattedDay;
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col pt-4">
      {/* Utiliser le composant Navbar partagé */}
      <Navbar
        onOpenUserModal={() => setIsModalOpen(true)}
        userSettings={userSettings}
      />
      
      {/* Conteneur principal avec largeur maximale de 80% */}
      <div className="flex-1 p-4 w-full max-w-[90%] sm:max-w-[80%] mx-auto">
        {/* Barre de date */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-xs btn-outline btn-secondary btn-circle"
              onClick={goToPreviousDay}
              aria-label={t('dashboard.previousDay')}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-xl">{formatCurrentDate()}</span>
            <button
              className="btn btn-xs btn-outline btn-secondary btn-circle"
              onClick={goToNextDay}
              aria-label={t('dashboard.nextDay')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t('dashboard.viewAll')}</span>
            <input 
              type="checkbox" 
              className="toggle toggle-secondary" 
              checked={ignoreDate} 
              onChange={toggleIgnoreDate}
              aria-label={t('dashboard.toggleDateFilter')}
            />
          </div>
        </div>
        
        {/* Grille des composants principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1">
            <GoalSetting
              onGoalSelect={handleGoalSelect}
              refreshTrigger={refreshTrigger}
              currentDay={getCurrentDayName()}
              ignoreDate={ignoreDate}
            />
          </div>
          <div className="md:col-span-1">
            <Timer
              selectedGoal={selectedGoal}
              onTimerStop={handleTimerStop}
            />
          </div>
          {showTodoList && (
            <div className="md:col-span-1">
              <TodoList
                currentDay={getCurrentDayName()}
                ignoreDate={ignoreDate}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        user={user}
        onComplete={handleOnboardingComplete}
      />
      
      <UserOptionsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        onUpdateSettings={handleUpdateSettings}
        onSignOut={signOut}
      />
    </div>
  );
}

export default Dashboard;