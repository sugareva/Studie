// src/components/Timer.jsx
import { useState, useEffect, useRef } from 'react';
import { Play, Coffee, Pause, RotateCcw, Clock, StopCircle, Maximize, Minimize, Volume2, VolumeX, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const TIMER_STORAGE_KEY = 'STUDY_APP_TIMER_STATE';
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';
const POMODORO_SETTINGS_KEY = 'POMODORO_SETTINGS';
const ORIGINAL_TITLE = 'Studie'; // Titre par défaut de l'application
// URL de la chaîne lofi girl par défaut
const DEFAULT_LOFI_URL = 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1';
// Thumbnail de la vidéo lofi girl
const LOFI_THUMBNAIL = 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg';

// Valeurs par défaut pour le Pomodoro
const DEFAULT_POMODORO_SETTINGS = {
  focusTime: 25 * 60, // 25 minutes par défaut
  breakTime: 5 * 60,   // 5 minutes par défaut
  longBreakTime: 15 * 60, // 15 minutes par défaut
  longBreakInterval: 4    // Long break tous les 4 pomodoros
};

const Timer = ({ selectedGoal, onTimerStop }) => {
  const { t } = useTranslation();
  const [displayTime, setDisplayTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [pomodoroSession, setPomodoroSession] = useState('focus');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [pomodoroSettings, setPomodoroSettings] = useState(() => {
    try {
      const storedSettings = localStorage.getItem(POMODORO_SETTINGS_KEY);
      return storedSettings ? JSON.parse(storedSettings) : DEFAULT_POMODORO_SETTINGS;
    } catch (error) {
      return DEFAULT_POMODORO_SETTINGS;
    }
  });
  const [pomodoroCount, setPomodoroCount] = useState(0);
  
  const { user } = useAuth();
  
  // Récupérer la date actuelle au format YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Fonction pour récupérer l'état actuel du timer depuis le localStorage
  const getTimerState = () => {
    try {
      const storedState = localStorage.getItem(TIMER_STORAGE_KEY);
      if (storedState) {
        return JSON.parse(storedState);
      }
    } catch (error) {
      console.error(t('timer.errorRetrievingState'), error);
    }
    return null;
  };
  
  // Fonction pour enregistrer l'état du timer dans le localStorage
  const saveTimerState = (state) => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error(t('timer.errorSavingState'), error);
    }
  };

  // Enregistrer les paramètres du pomodoro dans le localStorage
  const savePomodoroSettings = (settings) => {
    try {
      localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving pomodoro settings', error);
    }
  };

  // Fonction pour jouer le son de notification
  const playNotificationSound = () => {
    try {
      const notification = new Audio('/notification.mp3');
      notification.volume = 0.7; // Ajuster le volume à 70%
      notification.play().catch(e => console.log(t('timer.audioPlayFailed'), e));
    } catch (e) {
      console.log(t('timer.audioPlayFailed'), e);
    }
  };
  
  // Fonction pour mettre à jour le titre de l'onglet
  const updatePageTitle = (time = null) => {
    if (!isRunning) {
      document.title = ORIGINAL_TITLE;
      return;
    }

    if (time !== null) {
      // Format HH:MM:SS pour le titre
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = time % 60;
      
      // Afficher uniquement HH:MM si heures > 0, sinon MM:SS
      let timeStr;
      if (hours > 0) {
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // Afficher le temps dans le titre avec le nom de l'application
      document.title = `${timeStr} - ${ORIGINAL_TITLE}`;
    } else {
      // Titre simple quand on n'affiche pas le temps
      document.title = `${ORIGINAL_TITLE} - ${t('timer.running')}`;
    }
  };
  
  // Charger l'état du timer depuis le localStorage au démarrage
  useEffect(() => {
    const storedState = getTimerState();
    
    if (storedState && storedState.goalId === selectedGoal?.id) {
      setIsRunning(storedState.isRunning);
      setIsPomodoroMode(storedState.isPomodoroMode);
      setPomodoroSession(storedState.pomodoroSession);
      setShowYouTube(storedState.showYouTube || false);
      setIsMuted(storedState.isMuted || false);
      setPomodoroCount(storedState.pomodoroCount || 0);
      
      // Si le timer était en cours, calculer le temps écoulé
      if (storedState.isRunning) {
        const elapsedSinceSave = Math.floor((Date.now() - storedState.timestamp) / 1000);
        const totalElapsed = storedState.elapsedTime + elapsedSinceSave;
        setDisplayTime(totalElapsed);
        
        // Mettre à jour le titre de l'onglet
        updatePageTitle(totalElapsed);
      } else {
        setDisplayTime(storedState.elapsedTime);
        updatePageTitle(null);
      }
    } else {
      resetTimer();
    }
    
    // Restaurer le titre original quand le composant est démonté
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [selectedGoal]);
  
  // Calculer la durée totale d'un cycle Pomodoro
  const getTotalPomodoroTime = () => {
    const { focusTime, breakTime, longBreakTime, longBreakInterval } = pomodoroSettings;
    // Un cycle complet est: (focus + break) * (longBreakInterval - 1) + focus + longBreak
    return (focusTime + breakTime) * (longBreakInterval - 1) + focusTime + longBreakTime;
  };
  
  // Calculer le temps écoulé dans le cycle Pomodoro actuel
  const getCurrentSessionElapsedTime = (totalTimeInSeconds) => {
    const { focusTime, breakTime, longBreakTime, longBreakInterval } = pomodoroSettings;
    const cycleDuration = getTotalPomodoroTime();
    
    // Obtenir le temps dans le cycle actuel (modulo la durée totale du cycle)
    const timeInCurrentCycle = totalTimeInSeconds % cycleDuration;
    
    // Calculer le nombre de sessions complètes dans le cycle actuel
    let timeSum = 0;
    let currentSession = 'focus';
    let completedSessions = 0;
    
    for (let i = 0; i < longBreakInterval * 2; i++) {
      const isEven = i % 2 === 0;
      const isLastBreak = i === longBreakInterval * 2 - 1;
      
      // Durée de la session actuelle
      const sessionDuration = isEven 
        ? focusTime 
        : (isLastBreak ? longBreakTime : breakTime);
      
      // Si l'ajout de cette session dépasse le temps écoulé, nous sommes dans cette session
      if (timeSum + sessionDuration > timeInCurrentCycle) {
        return {
          sessionType: isEven ? 'focus' : (isLastBreak ? 'longBreak' : 'break'),
          elapsedInSession: timeInCurrentCycle - timeSum,
          completedPomodoros: Math.floor(completedSessions)
        };
      }
      
      // Sinon, ajouter cette session et continuer
      timeSum += sessionDuration;
      if (isEven) {
        completedSessions += 0.5; // Chaque focus complété compte comme 0.5
      }
    }
    
    // Par défaut, retourner le début d'un cycle
    return { sessionType: 'focus', elapsedInSession: 0, completedPomodoros: 0 };
  };
  
  // Mettre à jour le timer à intervalles réguliers
  useEffect(() => {
    let intervalId;
    
    if (isRunning) {
      const storedState = getTimerState();
      
      if (!storedState || !storedState.isRunning) {
        // Si on démarre un nouveau timer, enregistrer l'état initial
        saveTimerState({
          isRunning: true,
          elapsedTime: displayTime,
          timestamp: Date.now(),
          goalId: selectedGoal?.id,
          isPomodoroMode,
          pomodoroSession,
          showYouTube,
          isMuted,
          pomodoroCount
        });
      }
      
      // Mettre à jour l'affichage à intervalles réguliers
      intervalId = setInterval(() => {
        const currentState = getTimerState();
        
        if (currentState && currentState.isRunning) {
          const now = Date.now();
          const elapsedSinceSave = Math.floor((now - currentState.timestamp) / 1000);
          const totalElapsed = currentState.elapsedTime + elapsedSinceSave;
          
          setDisplayTime(totalElapsed);
          
          // Mettre à jour le titre de l'onglet avec le temps actuel
          updatePageTitle(totalElapsed);
          
          // Gestion du mode pomodoro
          if (isPomodoroMode) {
            const { focusTime, breakTime, longBreakTime, longBreakInterval } = pomodoroSettings;
            const { sessionType, elapsedInSession, completedPomodoros } = getCurrentSessionElapsedTime(totalElapsed);
            
            // Mettre à jour le compteur de pomodoros
            if (completedPomodoros !== pomodoroCount) {
              setPomodoroCount(completedPomodoros);
            }
            
            // Détecter les changements de session
            if (sessionType !== pomodoroSession) {
              // Transition vers une nouvelle session
              setPomodoroSession(sessionType);
              
              // Jouer le son de notification pour la transition
              playNotificationSound();
              
              // Mettre à jour l'état stocké
              saveTimerState({
                ...currentState,
                pomodoroSession: sessionType,
                timestamp: now,
                elapsedTime: totalElapsed,
                pomodoroCount: completedPomodoros
              });
            }
          }
        }
      }, 1000);
    } else {
      // Réinitialiser le titre quand le timer n'est pas en cours
      updatePageTitle(null);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, isPomodoroMode, pomodoroSession, selectedGoal, t, pomodoroCount, pomodoroSettings]);
  
  // Vérifier si nous devons mettre à jour l'état quand la page devient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const storedState = getTimerState();
        
        if (storedState && storedState.isRunning) {
          const elapsedSinceSave = Math.floor((Date.now() - storedState.timestamp) / 1000);
          const totalElapsed = storedState.elapsedTime + elapsedSinceSave;
          
          setDisplayTime(totalElapsed);
          setIsRunning(true);
          setIsPomodoroMode(storedState.isPomodoroMode);
          setPomodoroSession(storedState.pomodoroSession);
          setShowYouTube(storedState.showYouTube || false);
          setIsMuted(storedState.isMuted || false);
          setPomodoroCount(storedState.pomodoroCount || 0);
          
          // Mettre à jour le titre lorsque la page redevient visible
          updatePageTitle(totalElapsed);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Fonctions de contrôle du timer
  const startTimer = () => {
    if (!selectedGoal) {
      alert(t('timer.selectGoalBeforeStarting'));
      return;
    }
    
    setIsRunning(true);

    window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'event': 'timerInteraction',
    'timerAction': 'start',
    'timerLabel': 'Homepage Timer'
  });
    
    // Mettre à jour le titre lors du démarrage
    updatePageTitle(displayTime);
    
    // Enregistrer l'état initial
    saveTimerState({
      isRunning: true,
      elapsedTime: displayTime,
      timestamp: Date.now(),
      goalId: selectedGoal.id,
      isPomodoroMode,
      pomodoroSession,
      showYouTube,
      isMuted,
      pomodoroCount
    });
  };
  
  const pauseTimer = () => {
    setIsRunning(false);
    
    // Réinitialiser le titre lors de la pause
    document.title = ORIGINAL_TITLE;
    
    const storedState = getTimerState();
    
    if (storedState) {
      const now = Date.now();
      const elapsedSinceSave = Math.floor((now - storedState.timestamp) / 1000);
      const totalElapsed = storedState.elapsedTime + elapsedSinceSave;
      
      // Mettre à jour l'état avec le timer en pause
      saveTimerState({
        ...storedState,
        isRunning: false,
        elapsedTime: totalElapsed,
        timestamp: now
      });
      
      setDisplayTime(totalElapsed);
    }
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setDisplayTime(0);
    setPomodoroSession('focus');
    setPomodoroCount(0);
    
    // Réinitialiser le titre
    document.title = ORIGINAL_TITLE;
    
    // Effacer l'état du timer
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };
  
// Modification du composant Timer.jsx

// 1. Modifiez la fonction stopTimer dans Timer.jsx
const stopTimer = async () => {
  if (displayTime === 0) return;

  // Mettre en pause et calculer le temps final
  pauseTimer();

  const storedState = getTimerState();
  let finalTime = displayTime;

  if (storedState) {
    const now = Date.now();
    const elapsedSinceSave = Math.floor((now - storedState.timestamp) / 1000);
    finalTime = storedState.elapsedTime + (storedState.isRunning ? elapsedSinceSave : 0);
  }

  if (finalTime > 0 && selectedGoal) {
    try {
      // Mise à jour de la durée complétée de l'objectif
      const newCompletedDuration = (selectedGoal.completed_duration || 0) + finalTime;

      const { data, error: updateGoalError } = await supabase
        .from('goals')
        .update({
          completed_duration: newCompletedDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedGoal.id)
        .select();

      if (updateGoalError) throw updateGoalError;

      // Enregistrer la session
      const { error: insertSessionError } = await supabase.from('study_sessions').insert({
        user_id: user.id,
        goal_id: parseInt(selectedGoal.id),
        duration: finalTime,
        created_at: new Date().toISOString()
      });

      if (insertSessionError) throw insertSessionError;

      // IMPORTANT: SUPPRIMER/COMMENTER LE CODE DE MISE À JOUR DANS LOCALSTORAGE ICI
      // Ne pas mettre à jour directement localStorage ici, laissez le callback onTimerStop s'en charger
      
      // **Ajout pour incrémenter les croquettes (MODIFIÉ)**
      // Récupérer la progression quotidienne après mise à jour dans onTimerStop
      // au lieu de la recalculer ici
      const today = getTodayDate();
      const key = `${DAILY_PROGRESS_KEY}_${selectedGoal.id}_${today}`;
      
      // Lire la valeur actuelle après mise à jour par le Dashboard
      const updatedProgressStr = localStorage.getItem(key);
      const updatedProgress = updatedProgressStr ? parseInt(updatedProgressStr, 10) : 0;
      
      // Calculer le pourcentage de complétion avec la valeur mise à jour
      const goalCompletionPercentage = selectedGoal.duration > 0
        ? (updatedProgress / selectedGoal.duration) * 100
        : 0; // Éviter la division par zéro

      // Vérifier si l'objectif est complété à 100% ou plus
      if (goalCompletionPercentage >= 100) {
        if (user) {
          // Code existant pour les croquettes...
          // 1. Récupérer l'objet pet actuel
          const { data: userSettingsData, error: fetchError } = await supabase
            .from('user_settings')
            .select('pet')
            .eq('user_id', user.id)
            .single();

          if (fetchError) {
            console.error('Error fetching user settings:', fetchError);
          }

          if (userSettingsData?.pet) {
            // 2. Incrémenter le nombre de croquettes
            const updatedPet = { ...userSettingsData.pet, croquettes: (userSettingsData.pet.croquettes || 0) + 1 };

            // 3. Mettre à jour l'objet pet dans la base de données
            const { error: updatePetError } = await supabase
              .from('user_settings')
              .update({ pet: updatedPet })
              .eq('user_id', user.id);

            if (updatePetError) {
              console.error('Error updating pet with croquettes:', updatePetError);
            } else {
              console.log('Croquette ajoutée pour la complétion de la session !');
            }
          }
        }
      }
      // Fin de l'ajout pour les croquettes

      // SOLUTION: Appeler le callback avec toutes les informations nécessaires
      // Le Dashboard va s'occuper de mettre à jour la progression dans localStorage
      if (onTimerStop && data && data.length > 0) {
        onTimerStop(selectedGoal.id, finalTime, data[0]);
      }
    } catch (error) {
      console.error(t('timer.errorSavingStudySession'), error);
    }
  }

  // Réinitialiser le timer
  resetTimer();
};
  
  const togglePomodoroMode = () => {
    setIsPomodoroMode(!isPomodoroMode);
    resetTimer();
  };

  const togglePomodoroSettings = () => {
    setShowPomodoroSettings(!showPomodoroSettings);
  };

  const handlePomodoroSettingChange = (setting, value) => {
    // Assurer que la valeur est un nombre et convertir en secondes
    const numValue = parseInt(value, 10) * 60;
    
    if (!isNaN(numValue) && numValue > 0) {
      const newSettings = { ...pomodoroSettings, [setting]: numValue };
      setPomodoroSettings(newSettings);
      savePomodoroSettings(newSettings);
      
      // Réinitialiser le timer si nécessaire
      if (isRunning && isPomodoroMode) {
        resetTimer();
      }
    }
  };

  const handleLongBreakIntervalChange = (value) => {
    // Assurer que la valeur est un nombre
    const numValue = parseInt(value, 10);
    
    if (!isNaN(numValue) && numValue > 0) {
      const newSettings = { ...pomodoroSettings, longBreakInterval: numValue };
      setPomodoroSettings(newSettings);
      savePomodoroSettings(newSettings);
      
      // Réinitialiser le timer si nécessaire
      if (isRunning && isPomodoroMode) {
        resetTimer();
      }
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Activer YouTube automatiquement en mode plein écran si ce n'est pas déjà fait
    if (!isFullscreen && !showYouTube) {
      setShowYouTube(true);
    }
  };
  
  const toggleYouTube = () => {
    setShowYouTube(!showYouTube);
    
    // Mettre à jour l'état stocké
    const storedState = getTimerState();
    if (storedState) {
      saveTimerState({
        ...storedState,
        showYouTube: !showYouTube
      });
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    // Mettre à jour l'état stocké
    const storedState = getTimerState();
    if (storedState) {
      saveTimerState({
        ...storedState,
        isMuted: !isMuted
      });
    }
  };
  
  // Formatage du temps (HH:MM:SS)
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calcul du temps restant pour l'objectif - basé sur la progression quotidienne
  const calculateRemainingTime = () => {
    if (!selectedGoal) return '00:00:00';
    
    // Récupérer la progression d'aujourd'hui depuis localStorage
    const today = getTodayDate();
    const key = `${DAILY_PROGRESS_KEY}_${selectedGoal.id}_${today}`;
    let todayCompletedSeconds = 0;
    
    try {
      const storedProgress = localStorage.getItem(key);
      if (storedProgress) {
        todayCompletedSeconds = parseInt(storedProgress, 10);
      }
    } catch (error) {
      console.error(t('timer.errorRetrievingDailyProgress'), error);
    }
    
    const totalSeconds = selectedGoal.duration || 0;
    const remainingSeconds = totalSeconds - todayCompletedSeconds;
    
    return remainingSeconds > 0 ? formatTime(remainingSeconds) : '00:00:00';
  };
  
  // Calcul du pourcentage de progression basé sur la progression quotidienne
  const calculateProgress = () => {
    if (!selectedGoal) return 0;
    
    // Récupérer la progression d'aujourd'hui depuis localStorage
    const today = getTodayDate();
    const key = `${DAILY_PROGRESS_KEY}_${selectedGoal.id}_${today}`;
    let todayProgress = 0;
    
    try {
      const storedProgress = localStorage.getItem(key);
      if (storedProgress) {
        todayProgress = parseInt(storedProgress, 10);
      }
    } catch (error) {
      console.error(t('timer.errorRetrievingDailyProgress'), error);
    }
    
    const totalDuration = selectedGoal.duration || 0;
    
    if (totalDuration === 0) return 0;
    return Math.min(100, Math.round((todayProgress / totalDuration) * 100));
  };
  
  // Calcul du temps restant dans la session pomodoro actuelle
  const calculatePomodoroRemaining = () => {
    if (!isPomodoroMode) return '00:00';
    
    const { focusTime, breakTime, longBreakTime } = pomodoroSettings;
    const { sessionType, elapsedInSession } = getCurrentSessionElapsedTime(displayTime);
    
    let sessionDuration;
    if (sessionType === 'focus') {
      sessionDuration = focusTime;
    } else if (sessionType === 'break') {
      sessionDuration = breakTime;
    } else {
      sessionDuration = longBreakTime;
    }
    
    const sessionRemaining = Math.max(0, sessionDuration - elapsedInSession);
    
    const minutes = Math.floor(sessionRemaining / 60);
    const seconds = sessionRemaining % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Construction de l'URL YouTube avec ou sans mute
  const getYouTubeUrl = () => {
    const baseUrl = DEFAULT_LOFI_URL;
    const muteParam = isMuted ? '&mute=1' : '';
    return `${baseUrl}${muteParam}`;
  };

  // Obtenir le libellé de la session Pomodoro actuelle
  const getPomodoroSessionLabel = () => {
    if (pomodoroSession === 'focus') {
      return t('timer.focus');
    } else if (pomodoroSession === 'break') {
      return t('timer.break');
    } else {
      return t('timer.longBreak');
    }
  };

  // Rendu du composant en mode plein écran
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 flex flex-col items-center justify-center p-8">
        <button 
          className="absolute top-4 right-4 btn btn-ghost btn-circle"
          onClick={toggleFullscreen}
        >
          <Minimize size={24} />
        </button>
        
        {selectedGoal && (
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{selectedGoal.name}</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock size={16} />
              <span className="text-sm md:text-base">{t('timer.timeRemaining')}: {calculateRemainingTime()}</span>
            </div>
            <div className="w-48 md:w-64 mx-auto">
              <progress
                className="progress progress-primary w-full h-2"
                value={calculateProgress()}
                max="100"
              ></progress>
            </div>
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <div className="text-6xl font-bold mb-4">
            {formatTime(displayTime)}
          </div>
          
          {isPomodoroMode && (
            <div className="flex flex-col items-center mb-6 gap-2">
              <div className="badge badge-lg badge-primary mb-2">
                {getPomodoroSessionLabel()} {pomodoroCount > 0 && `(${Math.floor(pomodoroCount)}/${pomodoroSettings.longBreakInterval})`}
              </div>
              <div className="text-lg md:text-xl">
                {t('timer.remainingInSession', { time: calculatePomodoroRemaining() })}
              </div>
            </div>
          )}
          
          <div className="flex gap-4 mb-4">
            {!isRunning ? (
              <button 
                className="btn btn-success btn-lg btn-circle tooltip" 
                data-tip={t('timer.start')}
                onClick={startTimer}
                disabled={!selectedGoal}
              >
                <Play size={28} />
              </button>
            ) : (
              <button 
                className="btn btn-warning btn-lg btn-circle tooltip" 
                data-tip={t('timer.pause')}
                onClick={pauseTimer}
              >
                <Pause size={28} />
              </button>
            )}
            
            <button 
              className="btn btn-error btn-lg btn-circle tooltip" 
              data-tip={t('timer.stopAndSave')}
              onClick={stopTimer}
              disabled={displayTime === 0}
            >
              <StopCircle size={28} />
            </button>
            
            <button 
              className="btn btn-neutral btn-lg btn-circle tooltip" 
              data-tip={t('timer.reset')}
              onClick={resetTimer}
              disabled={displayTime === 0}
            >
              <RotateCcw size={28} />
            </button>
          </div>
        </div>
        
        {/* Tuile YouTube flottante en bas à droite - plus petite sur mobile */}
        {showYouTube && (
          <div className="fixed bottom-4 right-4 w-48 md:w-64 z-50">
            <div className="card bg-base-200 shadow-xl">
              <figure className="relative">
                <div className="w-full h-24 md:h-36 bg-base-300 rounded-t-lg flex items-center justify-center overflow-hidden">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {showYouTube && (
                    <iframe 
                      className="w-full h-full"
                      src={getYouTubeUrl()}
                      title={t('timer.lofiMusicTitle')}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                  )}
                </div>
              </figure>
              <div className="card-body p-2 md:p-3">
                <h3 className="card-title text-xs md:text-sm truncate">{t('timer.lofiChannelTitle')}</h3>
                <div className="card-actions justify-end mt-1">
                  <button 
                    className="btn btn-xs btn-circle btn-ghost tooltip"
                    data-tip={isMuted ? t('timer.unmute') : t('timer.mute')}
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  
                  <button 
                    className="btn btn-xs btn-circle btn-ghost tooltip"
                    data-tip={t('timer.hideYouTube')}
                    onClick={toggleYouTube}
                  >
                    <StopCircle size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bouton pour afficher YouTube s'il est masqué - plus petit sur mobile */}
        {!showYouTube && (
          <button 
            className="fixed bottom-4 right-4 btn btn-primary btn-xs md:btn-sm gap-1"
            onClick={toggleYouTube}
          >
            <Volume2 size={14} />
            <span className="hidden md:inline">{t('timer.lofiMusic')}</span>
          </button>
        )}
      </div>
    );
  }

  // Rendu du composant en mode normal
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body h-full flex flex-col">
        <h2 className="card-title text-lg flex justify-between items-center">
          <span>{t('timer.title')}</span>
          <div className="flex items-center gap-2">
            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <span className="label-text text-xs">{t('timer.pomodoro')}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-secondary toggle-sm"
                  checked={isPomodoroMode}
                  onChange={togglePomodoroMode}
                />
              </label>
            </div>
            {isPomodoroMode && (
              <button 
                className="btn btn-ghost btn-circle btn-xs"
                onClick={togglePomodoroSettings}
                aria-label={t('timer.pomodoroSettings')}
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </h2>

        {/* Panneau de paramétrage du Pomodoro */}
        {isPomodoroMode && showPomodoroSettings && (
          <div className="bg-base-200 rounded-lg p-3 mb-3 animate-fadeIn">
            <h3 className="font-medium text-sm mb-2">{t('timer.pomodoroSettings')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control w-full">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('timer.focusTime')} (min)</span>
                </label>
                <input 
                  type="number" 
                  className="input input-sm input-bordered w-full" 
                  value={pomodoroSettings.focusTime / 60}
                  min="1"
                  onChange={(e) => handlePomodoroSettingChange('focusTime', e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('timer.breakTime')} (min)</span>
                </label>
                <input 
                  type="number" 
                  className="input input-sm input-bordered w-full" 
                  value={pomodoroSettings.breakTime / 60}
                  min="1"
                  onChange={(e) => handlePomodoroSettingChange('breakTime', e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('timer.longBreakTime')} (min)</span>
                </label>
                <input 
                  type="number" 
                  className="input input-sm input-bordered w-full" 
                  value={pomodoroSettings.longBreakTime / 60}
                  min="5"
                  onChange={(e) => handlePomodoroSettingChange('longBreakTime', e.target.value)}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('timer.longBreakInterval')}</span>
                </label>
                <input 
                  type="number" 
                  className="input input-sm input-bordered w-full" 
                  value={pomodoroSettings.longBreakInterval}
                  min="1"
                  onChange={(e) => handleLongBreakIntervalChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Information sur l'objectif */}
        {selectedGoal ? (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedGoal.color || '#0081a7' }}
              ></div>
              <p className="font-semibold">{selectedGoal.name}</p>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock size={14} />
              <span className="text-xs">{t('timer.timeRemaining')}: {calculateRemainingTime()}</span>
            </div>
            <progress
              className="progress progress-info w-full mt-1.5 h-1.5"
              value={calculateProgress()}
              max="100"
            ></progress>
          </div>
        ) : (
          <div className="alert py-2 text-sm flex-shrink-0 mb-3">
            <span>{t('timer.selectGoalToStart')}</span>
          </div>
        )}

        {/* Affichage du timer */}
        <div className="grid place-items-center flex-grow">
          <div className="stats shadow">
            <div className="stat p-4">
              <div className="stat-title text-sm flex items-center justify-between">
                {isPomodoroMode ? (
                  <div className="flex items-center gap-1">
                    {getPomodoroSessionLabel()} 
                    {pomodoroCount > 0 && (
                      <span className="badge badge-xs badge-primary ml-1">
                        {Math.floor(pomodoroCount)}/{pomodoroSettings.longBreakInterval}
                      </span>
                    )}
                  </div>
                ) : (
                  t('timer.elapsedTime')
                )}
              </div>
              <div className={`stat-value text-3xl ${!selectedGoal ? 'text-gray-400' : ''}`}>
                {formatTime(displayTime)}
              </div>
              {isPomodoroMode && (
                <div className="stat-desc text-xs">
                  {t('timer.remainingInSession', { time: calculatePomodoroRemaining() })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="card-actions justify-center mt-3 flex-wrap gap-2">
          {!isRunning ? (
            <button 
              className="btn btn-success btn-circle btn-md tooltip" 
              data-tip={t('timer.start')}
              onClick={startTimer}
              disabled={!selectedGoal}
            >
              <Play size={20} />
            </button>
          ) : (
            <button 
              className="btn btn-warning btn-circle btn-md tooltip" 
              data-tip={t('timer.pause')}
              onClick={pauseTimer}
            >
              <Pause size={20} />
            </button>
          )}
          
          <button 
            className="btn btn-error btn-circle btn-md tooltip" 
            data-tip={t('timer.stopAndSave')}
            onClick={stopTimer}
            disabled={displayTime === 0}
          >
            <StopCircle size={20} />
          </button>
          
          <button 
            className="btn btn-neutral btn-circle btn-md tooltip" 
            data-tip={t('timer.reset')}
            onClick={resetTimer}
            disabled={displayTime === 0}
          >
            <RotateCcw size={18} />
          </button>
          
          <div className="w-full"></div>
          
          <button 
            className="btn btn-outline btn-sm gap-2 tooltip" 
            data-tip={t('timer.focusModeTooltip')}
            onClick={toggleFullscreen}
            disabled={!isRunning}
          >
            <Maximize size={16} />
            <span>{t('timer.focusMode')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timer;