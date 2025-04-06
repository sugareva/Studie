// src/components/Timer.jsx
import { useState, useEffect } from 'react';
import { Play, Coffee, Pause, RotateCcw, Clock, StopCircle, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const TIMER_STORAGE_KEY = 'STUDY_APP_TIMER_STATE';
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';
// URL de la chaîne lofi girl par défaut
const DEFAULT_LOFI_URL = 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1';
// Thumbnail de la vidéo lofi girl
const LOFI_THUMBNAIL = 'https://i.ytimg.com/vi/jfKfPfyJRdk/maxresdefault.jpg';

const Timer = ({ selectedGoal, onTimerStop }) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [pomodoroSession, setPomodoroSession] = useState('focus');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const { user } = useAuth();
  
  // Paramètres Pomodoro
  const pomodoroFocusTime = 25 * 60; // 25 minutes
  const pomodoroBreakTime = 5 * 60; // 5 minutes

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
      console.error('Erreur lors de la récupération de l\'état du timer:', error);
    }
    return null;
  };
  
  // Fonction pour enregistrer l'état du timer dans le localStorage
  const saveTimerState = (state) => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'état du timer:', error);
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
      
      // Si le timer était en cours, calculer le temps écoulé
      if (storedState.isRunning) {
        const elapsedSinceSave = Math.floor((Date.now() - storedState.timestamp) / 1000);
        setDisplayTime(storedState.elapsedTime + elapsedSinceSave);
      } else {
        setDisplayTime(storedState.elapsedTime);
      }
    } else {
      resetTimer();
    }
  }, [selectedGoal]);
  
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
          isMuted
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
          
          // Gestion du mode pomodoro
          if (isPomodoroMode) {
            const currentSession = pomodoroSession;
            const sessionDuration = currentSession === 'focus' ? pomodoroFocusTime : pomodoroBreakTime;
            const sessionElapsed = totalElapsed % (pomodoroFocusTime + pomodoroBreakTime);
            
            if (currentSession === 'focus' && sessionElapsed >= pomodoroFocusTime) {
              // Transition de focus à pause
              setPomodoroSession('break');
              try {
                const notification = new Audio('/notification.mp3');
                notification.play().catch(e => console.log('Audio play failed:', e));
              } catch (e) {
                console.log('Audio play failed:', e);
              }
              
              // Mettre à jour l'état stocké
              saveTimerState({
                ...currentState,
                pomodoroSession: 'break',
                timestamp: now,
                elapsedTime: totalElapsed
              });
            } else if (currentSession === 'break' && sessionElapsed < pomodoroFocusTime) {
              // Transition de pause à focus
              setPomodoroSession('focus');
              try {
                const notification = new Audio('/notification.mp3');
                notification.play().catch(e => console.log('Audio play failed:', e));
              } catch (e) {
                console.log('Audio play failed:', e);
              }
              
              // Mettre à jour l'état stocké
              saveTimerState({
                ...currentState,
                pomodoroSession: 'focus',
                timestamp: now,
                elapsedTime: totalElapsed
              });
            }
          }
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, isPomodoroMode, pomodoroSession, selectedGoal]);
  
  // Vérifier si nous devons mettre à jour l'état quand la page devient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const storedState = getTimerState();
        
        if (storedState && storedState.isRunning) {
          const elapsedSinceSave = Math.floor((Date.now() - storedState.timestamp) / 1000);
          setDisplayTime(storedState.elapsedTime + elapsedSinceSave);
          setIsRunning(true);
          setIsPomodoroMode(storedState.isPomodoroMode);
          setPomodoroSession(storedState.pomodoroSession);
          setShowYouTube(storedState.showYouTube || false);
          setIsMuted(storedState.isMuted || false);
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
      alert("Veuillez sélectionner un objectif avant de démarrer le timer.");
      return;
    }
    
    setIsRunning(true);
    
    // Enregistrer l'état initial
    saveTimerState({
      isRunning: true,
      elapsedTime: displayTime,
      timestamp: Date.now(),
      goalId: selectedGoal.id,
      isPomodoroMode,
      pomodoroSession,
      showYouTube,
      isMuted
    });
  };
  
  const pauseTimer = () => {
    setIsRunning(false);
    
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
    
    // Effacer l'état du timer
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };
  
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
        
        const { data, error: updateError } = await supabase
          .from('goals')
          .update({
            completed_duration: newCompletedDuration,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedGoal.id)
          .select();
          
        if (updateError) throw updateError;
        
        // Enregistrer la session
        const { error: insertError } = await supabase.from('study_sessions').insert({
          user_id: user.id,
          goal_id: parseInt(selectedGoal.id),
          duration: finalTime,
          created_at: new Date().toISOString()
        });
        
        if (insertError) throw insertError;
        
        // Mettre à jour la progression quotidienne dans localStorage
        const today = getTodayDate();
        const key = `${DAILY_PROGRESS_KEY}_${selectedGoal.id}_${today}`;
        
        let currentProgress = 0;
        const storedProgress = localStorage.getItem(key);
        if (storedProgress) {
          currentProgress = parseInt(storedProgress, 10);
        }
        
        const newProgress = currentProgress + finalTime;
        localStorage.setItem(key, newProgress.toString());
        
        // Appeler le callback
        if (onTimerStop && data && data.length > 0) {
          onTimerStop(selectedGoal.id, finalTime, data[0]);
        }
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la session d\'étude:', error);
      }
    }
    
    // Réinitialiser le timer
    resetTimer();
  };
  
  const togglePomodoroMode = () => {
    setIsPomodoroMode(!isPomodoroMode);
    resetTimer();
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
      console.error('Erreur lors de la récupération de la progression quotidienne:', error);
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
      console.error('Erreur lors de la récupération de la progression quotidienne:', error);
    }
    
    const totalDuration = selectedGoal.duration || 0;
    
    if (totalDuration === 0) return 0;
    return Math.min(100, Math.round((todayProgress / totalDuration) * 100));
  };
  
  // Calcul du temps restant en mode pomodoro
  const calculatePomodoroRemaining = () => {
    if (!isPomodoroMode) return '00:00';
    
    const sessionDuration = pomodoroSession === 'focus' ? pomodoroFocusTime : pomodoroBreakTime;
    const sessionElapsed = displayTime % (pomodoroFocusTime + pomodoroBreakTime);
    const sessionRemaining = sessionDuration - (sessionElapsed % sessionDuration);
    
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
              <span className="text-sm md:text-base">Temps restant: {calculateRemainingTime()}</span>
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
          <div className="text-6xl font-bold mb-8">
            {formatTime(displayTime)}
          </div>
          
          {isPomodoroMode && (
            <div className="text-lg md:text-xl mb-6">
              {pomodoroSession === 'focus' 
                ? `${calculatePomodoroRemaining()} restants avant pause`
                : `${calculatePomodoroRemaining()} restants avant reprise`}
            </div>
          )}
          
          <div className="flex gap-4 mb-4">
            {!isRunning ? (
              <button 
                className="btn btn-success btn-lg btn-circle tooltip" 
                data-tip="Démarrer"
                onClick={startTimer}
                disabled={!selectedGoal}
              >
                <Play size={28} />
              </button>
            ) : (
              <button 
                className="btn btn-warning btn-lg btn-circle tooltip" 
                data-tip="Pause"
                onClick={pauseTimer}
              >
                <Pause size={28} />
              </button>
            )}
            
            <button 
              className="btn btn-error btn-lg btn-circle tooltip" 
              data-tip="Arrêter et enregistrer"
              onClick={stopTimer}
              disabled={displayTime === 0}
            >
              <StopCircle size={28} />
            </button>
            
            <button 
              className="btn btn-neutral btn-lg btn-circle tooltip" 
              data-tip="Réinitialiser"
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
                      title="Lofi Music pour étudier"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                  )}
                </div>
              </figure>
              <div className="card-body p-2 md:p-3">
                <h3 className="card-title text-xs md:text-sm truncate">lofi hip hop radio - beats to relax/study to</h3>
                <div className="card-actions justify-end mt-1">
                  <button 
                    className="btn btn-xs btn-circle btn-ghost tooltip"
                    data-tip={isMuted ? "Activer le son" : "Couper le son"}
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  
                  <button 
                    className="btn btn-xs btn-circle btn-ghost tooltip"
                    data-tip="Masquer YouTube"
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
            <span className="hidden md:inline">Lofi Music</span>
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
          <span>Minuteur</span>
          <div className="form-control">
            <label className="label cursor-pointer gap-2">
            <Coffee size={14} /><span className="label-text text-xs"> Pomodoro</span>
              <input
                type="checkbox"
                className="toggle toggle-secondary toggle-sm"
                checked={isPomodoroMode}
                onChange={togglePomodoroMode}
              />
            </label>
          </div>
        </h2>

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
              <span className="text-xs">Temps restant: {calculateRemainingTime()}</span>
            </div>
            <progress
              className="progress progress-info w-full mt-1.5 h-1.5"
              value={calculateProgress()}
              max="100"
            ></progress>
          </div>
        ) : (
          <div className="alert py-2 text-sm flex-shrink-0 mb-3">
            <span>Sélectionnez un objectif pour commencer</span>
          </div>
        )}

        {/* Affichage du timer */}
        <div className="grid place-items-center flex-grow">
          <div className="stats shadow">
            <div className="stat p-4">
              <div className="stat-title text-sm">
                {isPomodoroMode ? `${pomodoroSession === 'focus' ? 'Focus' : 'Pause'}` : 'Temps écoulé'}
              </div>
              <div className={`stat-value text-3xl ${!selectedGoal ? 'text-gray-400' : ''}`}>
                {formatTime(displayTime)}
              </div>
              {isPomodoroMode && (
                <div className="stat-desc text-xs">
                  {pomodoroSession === 'focus' 
                    ? `${calculatePomodoroRemaining()} restants avant pause`
                    : `${calculatePomodoroRemaining()} restants avant reprise`}
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
              data-tip="Démarrer"
              onClick={startTimer}
              disabled={!selectedGoal}
            >
              <Play size={20} />
            </button>
          ) : (
            <button 
              className="btn btn-warning btn-circle btn-md tooltip" 
              data-tip="Pause"
              onClick={pauseTimer}
            >
              <Pause size={20} />
            </button>
          )}
          
          <button 
            className="btn btn-error btn-circle btn-md tooltip" 
            data-tip="Arrêter et enregistrer"
            onClick={stopTimer}
            disabled={displayTime === 0}
          >
            <StopCircle size={20} />
          </button>
          
          <button 
            className="btn btn-neutral btn-circle btn-md tooltip" 
            data-tip="Réinitialiser"
            onClick={resetTimer}
            disabled={displayTime === 0}
          >
            <RotateCcw size={18} />
          </button>
          
          <div className="w-full"></div>
          
          <button 
            className="btn btn-outline btn-sm gap-2 tooltip" 
            data-tip="Mode focus avec Lofi Music"
            onClick={toggleFullscreen}
            disabled={!isRunning}
          >
            <Maximize size={16} />
            <span>Mode focus</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timer;