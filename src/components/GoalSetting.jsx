// src/components/GoalSetting.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {translateStoredDay,convertToStoredFormat } from '../utils/dayMapping';

// Les jours seront maintenant gérés par i18next
const DAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAYS_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_KEYS = ['saturday', 'sunday'];
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';

// Définir la limite d'objectifs ici
const GOALS_LIMIT = 3;

// Palettes de couleurs disponibles
const COLORS = [
  { nameKey: 'colors.coralRed', hex: '#f07167' },
  { nameKey: 'colors.peach', hex: '#fed9b7' },
  { nameKey: 'colors.paleYellow', hex: '#fdfcdc' },
  { nameKey: 'colors.turquoise', hex: '#00afb9' },
  { nameKey: 'colors.oceanBlue', hex: '#0081a7' }
];

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  
  return (
    <dialog open={isOpen} className="modal modal-open">
      <div className="modal-box">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
};


const GoalSetting = ({ onGoalSelect, refreshTrigger = 0, currentDay = null, ignoreDate = false, selectedDate = new Date()  }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  // État pour suivre si la limite est atteinte
  const [isLimitReached, setIsLimitReached] = useState(false);
  
  // Transformer les clés de jours en noms de jours traduits
  const DAYS = DAYS_KEYS.map(day => t(`days.${day}`));
  const WEEKDAYS = WEEKDAYS_KEYS.map(day => t(`days.${day}`));
  const WEEKEND = WEEKEND_KEYS.map(day => t(`days.${day}`));


  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState(null);
  
  // New goal form state
  const [newGoal, setNewGoal] = useState({
    name: '',
    dailyTime: 25,
    timeUnit: 'minutes',
    daysOfWeek: [...DAYS],
    color: COLORS[0].hex
  });

  const handleSliderScroll = (e) => {
    const container = e.currentTarget;
    const scrollPosition = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85; // 85% de la largeur
    const newIndex = Math.round(scrollPosition / cardWidth);
    
    if (newIndex !== activeCardIndex) {
      setActiveCardIndex(newIndex);
    }
  };

  // Récupérer la date actuelle au format YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  
  // Fonction pour récupérer la progression quotidienne
  const getDailyProgress = (goalId, date = null) => {
    if (!goalId) return 0;
    
    try {
      // Utiliser la date fournie ou la date actuelle
      const dateToUse = date ? new Date(date) : new Date();
      const dateString = dateToUse.toISOString().split('T')[0];
      
      // Utiliser dateString au lieu de today pour construire la clé
      const key = `${DAILY_PROGRESS_KEY}_${goalId}_${dateString}`;
      const storedProgress = localStorage.getItem(key);
      
      if (storedProgress) {
        return parseInt(storedProgress, 10);
      }
    } catch (error) {
      console.error(t('errors.dailyProgressRetrievalError'), error);
    }
    
    return 0;
  };

  // Vérifier le nombre d'objectifs actuel
  const checkGoalsLimit = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Mettre à jour l'état de limite atteinte
      setIsLimitReached(count >= GOALS_LIMIT);
      return count;
    } catch (err) {
      console.error(t('errors.goalsLimitCheckError'), err);
      return 0;
    }
  }, [user, t]);

  // Effet pour le chargement initial
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Nettoyer d'abord les sessions orphelines
        await cleanupOrphanedSessions();
        
        // Puis charger les objectifs
        await fetchGoals();
        
      } catch (err) {
        console.error(t('errors.dataLoadError'), err);
        setError(t('errors.unableToLoadData'));
      } finally {
        setLoading(false);
      }
    }
  
    fetchData();
  }, [user, t]);
  
  useEffect(() => {
    // Si des objectifs sont chargés, recalculer leurs progressions
    if (goals.length > 0) {
      // Forcer un rafraîchissement des composants
      setGoals([...goals]);
    }
  }, [selectedDate]);
  
  // Effet séparé pour le rafraîchissement
  useEffect(() => {
    if (refreshTrigger > 0 && user) {
      fetchGoals();
    }
  }, [refreshTrigger]); // Dépend seulement de refreshTrigger

  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) throw error;

      // Pour chaque objectif, vérifier si nous avons une entrée pour aujourd'hui
      const today = getTodayDate();
      data.forEach(goal => {
        const key = `${DAILY_PROGRESS_KEY}_${goal.id}_${today}`;
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, '0');
        }
      });
      
      setGoals(data || []);
      
      // Mettre à jour l'état de limite atteinte
      setIsLimitReached(data.length >= GOALS_LIMIT);

      // Si un objectif était sélectionné, mettre à jour sa représentation
      if (selectedGoalId) {
        const selectedGoal = data.find(goal => goal.id === selectedGoalId);
        if (selectedGoal) {
          onGoalSelect(selectedGoal);
        } else {
          // Si l'objectif n'existe plus, désélectionner
          setSelectedGoalId(null);
          onGoalSelect(null);
        }
      }
    } catch (err) {
      console.error(t('errors.goalsRetrievalError'), err);
      setError(t('errors.unableToLoadGoals'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Vérifier le nombre d'objectifs à nouveau pour être sûr
      const count = await checkGoalsLimit();
      
      if (count >= GOALS_LIMIT) {
        setError(t('errors.goalsLimitReached', { limit: GOALS_LIMIT }));
        setLoading(false);
        return;
      }
      
      // Convertir chaque jour au format de stockage (français)
      const storedDaysOfWeek = newGoal.daysOfWeek.map(day => 
        convertToStoredFormat(day, i18n.language)
      );
      
      const { data, error } = await supabase
        .from('goals')
        .insert([
          {
            user_id: user.id,
            name: newGoal.name,
            duration: newGoal.timeUnit === 'minutes' ? newGoal.dailyTime * 60 : newGoal.dailyTime * 3600,
            completed_duration: 0,
            days_of_week: storedDaysOfWeek, // Utiliser les jours convertis
            time_unit: newGoal.timeUnit,
            color: newGoal.color
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Reset form and close modal
      setNewGoal({
        name: '',
        dailyTime: 25,
        timeUnit: 'minutes',
        daysOfWeek: [...DAYS],
        color: COLORS[0].hex
      });
      setIsCreateModalOpen(false);
      
      // Refresh goals list
      await fetchGoals();
      
      // Effacer tout message d'erreur précédent
      setError(null);
    } catch (err) {
      console.error(t('errors.goalCreationError'), err);
      setError(t('errors.unableToCreateGoal'));
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedSessions = async () => {
    if (!user) return;
    
    try {
      // 1. Récupérer tous les IDs des objectifs existants
      const { data: existingGoals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id);
      
      if (goalsError) throw goalsError;
      
      // Créer un ensemble (Set) des IDs d'objectifs valides pour une recherche rapide
      const validGoalIds = new Set(existingGoals.map(g => g.id));
      
      // 2. Récupérer toutes les sessions
      const { data: allSessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('id, goal_id')
        .eq('user_id', user.id);
      
      if (sessionsError) throw sessionsError;
      
      // 3. Identifier les sessions orphelines (dont l'objectif n'existe plus ou est null)
      const orphanedSessionIds = allSessions
        .filter(session => 
          // Vérifier si goal_id est null ou s'il n'existe pas dans validGoalIds
          session.goal_id === null || !validGoalIds.has(session.goal_id)
        )
        .map(session => session.id);
      
      if (orphanedSessionIds.length === 0) {
        console.log('Aucune session orpheline à nettoyer');
        return;
      }
      
      console.log(`${orphanedSessionIds.length} sessions orphelines trouvées, nettoyage en cours...`);
      
      // 4. Supprimer les sessions orphelines une par une pour éviter les problèmes avec null
      for (const sessionId of orphanedSessionIds) {
        const { error: deleteError } = await supabase
          .from('study_sessions')
          .delete()
          .eq('id', sessionId);
        
        if (deleteError) {
          console.error(`Erreur lors de la suppression de la session ${sessionId}:`, deleteError);
          // Continuer avec les autres sessions même si celle-ci échoue
        }
      }
      
      console.log('Nettoyage des sessions orphelines terminé');
      
    } catch (err) {
      console.error('Erreur lors du nettoyage des sessions orphelines:', err);
    }
  };
  

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    
    if (!currentGoal) return;
    
    try {
      setLoading(true);

      // Calculer la durée en secondes
      const durationInSeconds = currentGoal.timeUnit === 'minutes' 
        ? currentGoal.dailyTime * 60 
        : currentGoal.dailyTime * 3600;
      
      const { error } = await supabase
        .from('goals')
        .update({
          name: currentGoal.name,
          duration: durationInSeconds,
          days_of_week: currentGoal.daysOfWeek,
          time_unit: currentGoal.timeUnit,
          color: currentGoal.color,
          updated_at: new Date()
        })
        .eq('id', currentGoal.id);
        
      if (error) throw error;
      
      setIsEditModalOpen(false);
      setCurrentGoal(null);
      
      // Refresh goals list
      await fetchGoals();

      // Si c'était l'objectif sélectionné, mettre à jour sa représentation
      if (selectedGoalId === currentGoal.id) {
        const updatedGoal = {
          ...currentGoal,
          duration: durationInSeconds
        };
        onGoalSelect(updatedGoal);
      }
      
      // Effacer tout message d'erreur précédent
      setError(null);
    } catch (err) {
      console.error(t('errors.goalUpdateError'), err);
      setError(t('errors.unableToUpdateGoal'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm(t('confirmations.deleteGoal'))) {
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Supprimer d'abord toutes les sessions associées à cet objectif
      const { error: sessionsError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('goal_id', goalId);
      
      if (sessionsError) throw sessionsError;
      
      // 2. Ensuite, supprimer l'objectif lui-même
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);
        
      if (error) throw error;
      
      // Si c'était l'objectif sélectionné, désélectionner
      if (selectedGoalId === goalId) {
        setSelectedGoalId(null);
        onGoalSelect(null);
      }
      
      // Supprimer également les entrées de localStorage pour cet objectif
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`${DAILY_PROGRESS_KEY}_${goalId}`)) {
          localStorage.removeItem(key);
        }
      });
  
      // Refresh goals list
      await fetchGoals();
      
      // Vérifier explicitement la limite après la suppression
      await checkGoalsLimit();
      
      // Effacer tout message d'erreur précédent
      setError(null);
    } catch (err) {
      console.error(t('errors.goalDeletionError'), err);
      setError(t('errors.unableToDeleteGoal'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditGoal = (goal) => {
    // Prepare goal for editing
    setCurrentGoal({
      ...goal,
      dailyTime: goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600,
      timeUnit: goal.time_unit,
      daysOfWeek: goal.days_of_week,
      color: goal.color || COLORS[0].hex // Valeur par défaut si color n'existe pas
    });
    setIsEditModalOpen(true);
  };

  const handleDaySelection = (days, setFunction) => {
    // Assurez-vous que les jours sont au format de stockage (français)
    const storedDays = days.map(day => convertToStoredFormat(day, i18n.language));
    
    setFunction(prev => ({
      ...prev,
      daysOfWeek: storedDays
    }));
  };

  const formatTime = (duration, unit) => {
    if (unit === 'heures' || unit === 'hours') {
      return t('time.hourFormat', { count: duration });
    }
    return t('time.minuteFormat', { count: duration });
  };
  
  const renderDaysOfWeek = (days) => {
    if (days.length === 7) return t('days.everyday');
    if (JSON.stringify(days.sort()) === JSON.stringify(WEEKDAYS.sort())) return t('days.weekdays');
    if (JSON.stringify(days.sort()) === JSON.stringify(WEEKEND.sort())) return t('days.weekend');
    
    return days.join(', ');
  };

  // Fonction pour sélectionner un objectif
  const handleSelectGoal = (goal) => {
    setSelectedGoalId(goal.id);
    onGoalSelect(goal);
  };

  // Calculer le pourcentage de progression basé sur la progression quotidienne
  const calculateProgress = (goal) => {
    if (!goal.duration) return 0;
    
    const todayProgress = getDailyProgress(goal.id, selectedDate);
    return Math.min(100, Math.round((todayProgress / goal.duration) * 100));
  };
  const scrollToCard = (index) => {
      const container = document.querySelector('.snap-x');
      if (container) {
        const cardWidth = container.offsetWidth * 0.85; // 85% de la largeur
        container.scrollTo({
          left: index * cardWidth,
          behavior: 'smooth'
        });
      }
    };
  

// Filtrer les objectifs en fonction du jour de la semaine
const filteredGoals = useMemo(() => {
  if (!goals || goals.length === 0) return [];
  
  // Si on ignore la date ou qu'il n'y a pas de jour spécifié, retourner tous les objectifs
  if (ignoreDate || !currentDay) return goals;
  
  // Convertir le jour actuel au format stocké (français)
  const storedFormatDay = convertToStoredFormat(currentDay, i18n.language);
  
  // Vérifier que les jours de la semaine sont bien définis pour chaque objectif
  // et comparer avec le jour stocké
  return goals.filter(goal => {
    return goal.days_of_week && Array.isArray(goal.days_of_week) && 
           goal.days_of_week.some(day => day === storedFormatDay);
  });
}, [goals, currentDay, ignoreDate, i18n.language]);

  // Formater le temps restant basé sur la progression quotidienne
  const formatRemainingTime = (goal) => {
    if (!goal) return '';
    
    const totalSeconds = goal.duration || 0;
    const completedSeconds = getDailyProgress(goal.id, selectedDate);
    const remainingSeconds = totalSeconds - completedSeconds;
    
    if (remainingSeconds <= 0) return t('status.completed');
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    if (hours > 0) {
      return t('time.hoursMinutesRemaining', { hours, minutes });
    }
    return t('time.minutesSecondsRemaining', { minutes, seconds });
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg m-0">{t('headings.myGoals')}</h2>
          {selectedGoalId ? (
            <button 
              className="btn btn-sm btn-soft btn-secondary"
              onClick={() => {
                setSelectedGoalId(null);
                onGoalSelect(null);
              }}
            >
              {t('buttons.changeGoal')}
            </button>
          ) : (
              <div className={isLimitReached ? "tooltip tooltip-left" : ""} data-tip={isLimitReached ? t('tooltips.goalsLimitReached', { limit: GOALS_LIMIT }) : ""}>
              <button 
                className="btn btn-sm btn-soft btn-secondary"
                onClick={() => setIsCreateModalOpen(true)}
                disabled={loading || isLimitReached}
              >
                <Plus size={16} />
                {t('buttons.add')}
              </button>
            </div>
          )}
        </div>
  
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
  
        {loading && goals.length === 0 ? (
          <div className="flex justify-center flex-grow items-center">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className=" flex-grow flex items-center justify-center">
            <span>
              {goals.length === 0 
                ? t('emptyStates.noGoalsDefined') 
                : t('emptyStates.noGoalsForDay', { day: currentDay })}
            </span>
          </div>
        ) : (
<div className="space-y-3 overflow-y-auto flex-grow">
  {/* Si un objectif est sélectionné, on n'affiche que celui-ci */}
  {selectedGoalId ? (
    filteredGoals
      .filter(goal => goal.id === selectedGoalId)
      .map((goal) => (
        <div
          key={goal.id}
          className="border-2 border-primary rounded-lg p-4 shadow-md"
        >
          {/* Contenu existant inchangé */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0 ring-secondary ring-offset-1" 
                style={{ backgroundColor: goal.color || COLORS[0].hex }}
              ></div>
              <div>
                <h3 className="font-semibold text-base">{goal.name}</h3>
                <div className="text-sm text-gray-500 mt-0.5">
                  {formatTime(goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600, goal.time_unit)} 
                  <span className="mx-1">•</span>
                  <span className="inline-flex gap-1">
  {DAYS_KEYS.map((day, index) => {
    // Obtenir le jour dans le format stocké (français)
    const storedFormatDay = convertToStoredFormat(DAYS[index], i18n.language);
    return (
      <span
        key={day}
        className={`text-xs ${
          goal.days_of_week && goal.days_of_week.includes(storedFormatDay)
            ? 'font-bold'
            : 'opacity-30'
        }`}
      >
        {t(`days.${day}Short`)}
      </span>
    );
  })}
</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className="btn btn-xs btn-ghost rounded-full"
                onClick={() => handleEditGoal(goal)}
                disabled={loading}
                aria-label={t('buttons.editAriaLabel')}
              >
                <Edit size={14} />
              </button>
              <button
                className="btn btn-xs btn-ghost rounded-full text-error"
                onClick={() => handleDeleteGoal(goal.id)}
                disabled={loading}
                aria-label={t('buttons.deleteAriaLabel')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">{formatRemainingTime(goal)}</span>
              <span className="font-medium">
                {t('status.percentCompleted', { percent: calculateProgress(goal) })}
              </span>
            </div>
            <progress
              className="progress progress-info w-full"
              value={calculateProgress(goal)}
              max="100"
            ></progress>
          </div>
        </div>
      ))
  ) : (
    /* Slider pour mobile, liste pour desktop */
    <>
      {/* Affichage sur mobile - slider horizontal */}
      <div className="sm:hidden">
  <div 
    className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-6 scrollbar-hide -mx-5 px-5"
    onScroll={handleSliderScroll}
  >
    {filteredGoals.map((goal, index) => (
      <div
        key={goal.id}
        className="border border-base-200 rounded-lg p-4 cursor-pointer hover:bg-base-200 transition-all shadow-sm snap-center min-w-[85%] first:ml-5 last:mr-5"
        onClick={() => handleSelectGoal(goal)}
      >
              {/* Contenu de la carte d'objectif */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: goal.color || COLORS[0].hex }}
                  ></div>
                  <div>
                    <h3 className="font-semibold text-base">{goal.name}</h3>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {formatTime(goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600, goal.time_unit)} 
                      <span className="mx-1">•</span>
                      <span className="inline-flex gap-1">
                        {DAYS_KEYS.map((day, index) => {
                          const storedFormatDay = convertToStoredFormat(DAYS[index], i18n.language);
                          return (
                            <span
                              key={day}
                              className={`text-xs ${
                                goal.days_of_week.includes(storedFormatDay)
                                  ? 'font-bold'
                                  : 'opacity-30'
                              }`}
                            >
                              {t(`days.${day}Short`)}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn btn-xs btn-ghost rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditGoal(goal);
                    }}
                    disabled={loading}
                    aria-label={t('buttons.editAriaLabel')}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    className="btn btn-xs btn-ghost rounded-full text-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGoal(goal.id);
                    }}
                    disabled={loading}
                    aria-label={t('buttons.deleteAriaLabel')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{formatRemainingTime(goal)}</span>
                  <span className="font-medium">{calculateProgress(goal)}%</span>
                </div>
                <progress
                  className="progress progress-info w-full"
                  value={calculateProgress(goal)}
                  max="100"
                ></progress>
              </div>
            </div>
          ))}
        </div>
        
        {/* Indicateurs de pagination pour mobile */}
        {filteredGoals.length > 1 && (
  <div className="flex justify-center gap-1 mt-2">
    {filteredGoals.map((_, index) => (
      <button
        key={index}
        onClick={() => scrollToCard(index)}
        className={`h-2 rounded-full transition-all ${
          index === activeCardIndex 
            ? 'bg-primary w-4' 
            : 'bg-gray-300 w-2'
        }`}
        aria-label={`Go to card ${index + 1}`}
      ></button>
    ))}
  </div>
  )}
</div>
      
      {/* Affichage desktop - liste verticale */}
      <div className="hidden sm:space-y-3 sm:block">
        {filteredGoals.map((goal) => (
          <div
            key={goal.id}
            className="border border-base-200 rounded-lg p-4 cursor-pointer hover:bg-base-200 transition-all shadow-sm"
            onClick={() => handleSelectGoal(goal)}
          >
            {/* Contenu existant inchangé */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: goal.color || COLORS[0].hex }}
                ></div>
                <div>
                  <h3 className="font-semibold text-base">{goal.name}</h3>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {formatTime(goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600, goal.time_unit)} 
                    <span className="mx-1">•</span>
                    <span className="inline-flex gap-1">
                      {DAYS_KEYS.map((day, index) => {
                        const storedFormatDay = convertToStoredFormat(DAYS[index], i18n.language);
                        return (
                          <span
                            key={day}
                            className={`text-xs ${
                              goal.days_of_week.includes(storedFormatDay)
                                ? 'font-bold'
                                : 'opacity-30'
                            }`}
                          >
                            {t(`days.${day}Short`)}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn btn-xs btn-ghost rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditGoal(goal);
                  }}
                  disabled={loading}
                  aria-label={t('buttons.editAriaLabel')}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="btn btn-xs btn-ghost rounded-full text-error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGoal(goal.id);
                  }}
                  disabled={loading}
                  aria-label={t('buttons.deleteAriaLabel')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">{formatRemainingTime(goal)}</span>
                <span className="font-medium">{calculateProgress(goal)}%</span>
              </div>
              <progress
                className="progress progress-info w-full"
                value={calculateProgress(goal)}
                max="100"
              ></progress>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>
        )}

{/* Modal de création d'objectif */}
<Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={t('modals.createGoal.title')}
        >
          <form onSubmit={handleCreateGoal}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">{t('modals.createGoal.goalName')}</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={t('modals.createGoal.goalNamePlaceholder')}
                value={newGoal.name}
                onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                required
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">{t('modals.createGoal.dailyTime')}</span>
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="input input-bordered w-full pl-10"
                    value={newGoal.dailyTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewGoal({
                        ...newGoal, 
                        dailyTime: value === '' ? 1 : parseInt(value) || 1
                      });
                    }}
                    onFocus={(e) => e.target.select()}
                    min="1"
                    required
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
                <select
                  className="select select-bordered w-full max-w-[120px]"
                  value={newGoal.timeUnit}
                  onChange={(e) => setNewGoal({...newGoal, timeUnit: e.target.value})}
                >
                  <option value="minutes">{t('time.minutes')}</option>
                  <option value="heures">{t('time.hours')}</option>
                </select>
              </div>
            </div>

            <div className="form-control mb-4">
              <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
                <legend className="fieldset-legend">{t('modals.createGoal.daysOfWeek')}</legend>
                <div className="flex flex-wrap gap-1 justify-center">
                  {DAYS_KEYS.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      className={`btn btn-xs ${
                        newGoal.daysOfWeek.includes(DAYS[index]) 
                          ? 'btn-primary' 
                          : 'bg-base-300 text-base-content opacity-60'
                      }`}
                      onClick={() => {
                        if (newGoal.daysOfWeek.includes(DAYS[index])) {
                          handleDaySelection(newGoal.daysOfWeek.filter(d => d !== DAYS[index]), setNewGoal);
                        } else {
                          handleDaySelection([...newGoal.daysOfWeek, DAYS[index]], setNewGoal);
                        }
                      }}
                    >
                      {t(`days.${day}Short`)}
                    </button>
                  ))}
                </div>
                <p className="fieldset-label">{t('modals.createGoal.chooseDaysHelp')}</p>
              </fieldset>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">{t('modals.createGoal.color')}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${newGoal.color === color.hex ? 'border-primary' : 'border-transparent'}`}
                    style={{ backgroundColor: color.hex }}
                    title={t(color.nameKey)}
                    onClick={() => setNewGoal({...newGoal, color: color.hex})}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={loading}
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={loading || !newGoal.name || newGoal.dailyTime <= 0 || newGoal.daysOfWeek.length === 0}
              >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : t('buttons.create')}
              </button>
            </div>
          </form>
        </Modal>


        {/* Modal d'édition d'objectif */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            if (!loading) {
              setIsEditModalOpen(false);
              setCurrentGoal(null);
            }
          }}
          title={t('modals.editGoal.title')}
        >
          {currentGoal && (
            <form onSubmit={handleUpdateGoal}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('modals.editGoal.goalName')}</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={currentGoal.name}
                  onChange={(e) => setCurrentGoal({...currentGoal, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('modals.editGoal.dailyTime')}</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="input input-bordered w-full pl-10"
                      value={currentGoal.dailyTime}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCurrentGoal({
                          ...currentGoal, 
                          dailyTime: value === '' ? 1 : parseInt(value) || 1
                        });
                      }}
                      onFocus={(e) => e.target.select()}
                      min="1"
                      required
                    />
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  <select
                    className="select select-bordered w-full max-w-[120px]"
                    value={currentGoal.timeUnit}
                    onChange={(e) => setCurrentGoal({...currentGoal, timeUnit: e.target.value})}
                  >
                    <option value="minutes">{t('time.minutes')}</option>
                    <option value="heures">{t('time.hours')}</option>
                  </select>
                </div>
              </div>

              <div className="form-control mb-4">
                <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
                  <legend className="fieldset-legend">{t('modals.editGoal.daysOfWeek')}</legend>
                  <div className="flex flex-wrap gap-1 justify-center">
  {DAYS_KEYS.map((day, index) => {
    // Traduire le jour en français pour la comparaison avec les jours stockés
    const frenchDay = {
      "Monday": "Lundi",
      "Tuesday": "Mardi",
      "Wednesday": "Mercredi",
      "Thursday": "Jeudi",
      "Friday": "Vendredi",
      "Saturday": "Samedi",
      "Sunday": "Dimanche"
    }[DAYS[index]] || DAYS[index];
    
    // Vérifier si le jour est sélectionné en tenant compte de la langue
    const isSelected = currentGoal.daysOfWeek.includes(
      i18n.language === 'fr' ? DAYS[index] : frenchDay
    );
    
    return (
      <button
        key={day}
        type="button"
        className={`btn btn-xs ${
          isSelected
            ? 'btn-primary'
            : 'bg-base-300 text-base-content opacity-60'
        }`}
        onClick={() => {
          if (isSelected) {
            // Si le jour est sélectionné, le retirer de la liste
            const dayToRemove = i18n.language === 'fr' ? DAYS[index] : frenchDay;
            handleDaySelection(
              currentGoal.daysOfWeek.filter(d => d !== dayToRemove),
              setCurrentGoal
            );
          } else {
            // Si le jour n'est pas sélectionné, l'ajouter à la liste
            // Toujours ajouter en format français (format de stockage)
            handleDaySelection(
              [...currentGoal.daysOfWeek, frenchDay],
              setCurrentGoal
            );
          }
        }}
      >
        {t(`days.${day}Short`)}
      </button>
    );
  })}
</div>
                  <p className="fieldset-label">{t('modals.editGoal.chooseDaysHelp')}</p>
                </fieldset>
              </div>

              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text">{t('modals.editGoal.color')}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${currentGoal.color === color.hex ? 'border-primary' : 'border-transparent'}`}
                      style={{ backgroundColor: color.hex }}
                      title={t(color.nameKey)}
                      onClick={() => setCurrentGoal({...currentGoal, color: color.hex})}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setCurrentGoal(null);
                  }}
                  disabled={loading}
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={loading || !currentGoal.name || currentGoal.dailyTime <= 0 || currentGoal.daysOfWeek.length === 0}
                >
                  {loading ? <span className="loading loading-spinner loading-xs"></span> : t('buttons.save')}
                </button>
              </div>
            </form>
          )}
        </Modal>

      </div>
    </div>
  );
};

export default GoalSetting;