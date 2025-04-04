import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, StopCircle, BarChart2, Clock, X, Maximize, Minimize, Trash2, Coffee, PlusCircle } from 'lucide-react';
import GoalCard from './GoalCard';

const TimerApp = ({ 
  darkMode, 
  goals, 
  studySessions, 
  onAddSession, 
  onDeleteSession,
  selectedGoal, 
  onSelectGoal 
}) => {
  const [filteredGoalId, setFilteredGoalId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [todaysSessions, setTodaysSessions] = useState([]);
  const [weekSessions, setWeekSessions] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomodoroState, setPomodoroState] = useState('focus'); // 'focus' ou 'break'
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [effectiveStudyTime, setEffectiveStudyTime] = useState(0); // Temps d'étude effectif (sans pauses)
  const [showAllGoals, setShowAllGoals] = useState(false);
  
  const intervalRef = useRef(null);
  const pomodoroTimerRef = useRef(null);

  // Constantes pour le mode Pomodoro
  const POMODORO_FOCUS_TIME = 25 * 60; // 25 minutes en secondes
  const POMODORO_BREAK_TIME = 5 * 60; // 5 minutes en secondes
  const POMODORO_LONG_BREAK_TIME = 15 * 60; // 15 minutes en secondes
  const POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;

  // Calculer le temps restant pour aujourd'hui
  useEffect(() => {
    if (selectedGoal && goals.length > 0) {
      const selectedGoalObj = goals.find(goal => goal.id === selectedGoal);
      
      if (selectedGoalObj) {
        // Déterminer si aujourd'hui est un jour d'objectif
        const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const today = days[new Date().getDay()];
        
        if (selectedGoalObj.days[today]) {
          // Calculer le temps total passé aujourd'hui sur cet objectif
          const today = new Date().toDateString();
          const todaySessionsForGoal = studySessions.filter(
            session => 
              session.goalId === selectedGoal && 
              new Date(session.date).toDateString() === today
          );
          
          const totalMinutesToday = todaySessionsForGoal.reduce(
            (total, session) => total + session.duration, 0
          ) / 60; // Convertir les secondes en minutes
          
          // Calculer le temps restant en secondes
          const remainingMinutes = Math.max(0, selectedGoalObj.minutes - totalMinutesToday);
          setRemainingTime(Math.round(remainingMinutes * 60));
        } else {
          // Aujourd'hui n'est pas un jour planifié pour cet objectif
          setRemainingTime(0);
        }
      }
    }
  }, [selectedGoal, goals, studySessions]);

  // Filtrer les sessions d'aujourd'hui et de la semaine
  useEffect(() => {
    const today = new Date().toDateString();
    
    // Sessions d'aujourd'hui
    const todaySessions = studySessions.filter(
      session => new Date(session.date).toDateString() === today
    );
    setTodaysSessions(todaySessions);
    
    // Sessions de la semaine
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekSessions = studySessions.filter(
      session => new Date(session.date) >= oneWeekAgo
    );
    setWeekSessions(weekSessions);
  }, [studySessions]);

  // Gérer le timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimer(prevTimer => {
          // En mode pomodoro, on compte aussi le temps d'étude effectif
          if (pomodoroMode && pomodoroState === 'focus') {
            setEffectiveStudyTime(prev => prev + 1);
          }
          return prevTimer + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, pomodoroMode, pomodoroState]);

  // Gestion du mode Pomodoro
  useEffect(() => {
    if (pomodoroMode && isActive) {
      // Configuration initiale du timer Pomodoro
      if (!pomodoroTimerRef.current) {
        startPomodoroSession();
      }
    } else {
      // Nettoyage si on désactive le mode ou le timer
      if (pomodoroTimerRef.current) {
        clearTimeout(pomodoroTimerRef.current);
        pomodoroTimerRef.current = null;
      }
    }

    return () => {
      if (pomodoroTimerRef.current) {
        clearTimeout(pomodoroTimerRef.current);
        pomodoroTimerRef.current = null;
      }
    };
  }, [pomodoroMode, isActive]);

  // Formater le temps en hh:mm:ss
  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    
    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Démarrer une session Pomodoro
  const startPomodoroSession = () => {
    const isBreak = pomodoroState === 'break';
    const currentCycle = pomodoroCount % POMODORO_CYCLES_BEFORE_LONG_BREAK;
    
    // Déterminer la durée de la session en cours
    let sessionDuration;
    if (isBreak) {
      // Si c'est une pause après 4 cycles, c'est une longue pause
      sessionDuration = currentCycle === 0 && pomodoroCount > 0 
        ? POMODORO_LONG_BREAK_TIME 
        : POMODORO_BREAK_TIME;
    } else {
      sessionDuration = POMODORO_FOCUS_TIME;
    }
    
    // Planifier la prochaine transition
    pomodoroTimerRef.current = setTimeout(() => {
      // Si on était en phase de travail, on passe en pause
      if (pomodoroState === 'focus') {
        setPomodoroState('break');
        setPomodoroCount(prev => prev + 1);
        
        // Notification de pause
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Temps de pause!', {
            body: 'Prenez une pause de 5 minutes.',
            icon: '/favicon.ico'
          });
        }
      } else {
        // Si on était en pause, on repasse en phase de travail
        setPomodoroState('focus');
        
        // Notification de reprise
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Reprenez le travail!', {
            body: 'La pause est terminée, c\'est reparti!',
            icon: '/favicon.ico'
          });
        }
      }
      
      // Configurer la prochaine session
      startPomodoroSession();
    }, sessionDuration * 1000);
  };

  // Basculer le mode Pomodoro
  const togglePomodoroMode = () => {
    // Si on désactive le mode Pomodoro, on réinitialise son état
    if (pomodoroMode) {
      setPomodoroState('focus');
      setPomodoroCount(0);
      
      if (pomodoroTimerRef.current) {
        clearTimeout(pomodoroTimerRef.current);
        pomodoroTimerRef.current = null;
      }
    } else {
      // Demander l'autorisation pour les notifications
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }
    
    setPomodoroMode(!pomodoroMode);
  };

  // Démarrer le timer
  const startTimer = () => {
    if (!selectedGoal) {
      alert('Veuillez sélectionner un objectif');
      return;
    }
    
    setIsActive(true);
    setTimerStartTime(new Date());
    setFocusMode(true); // Activer le mode focus
    
    // Réinitialiser le temps d'étude effectif si on commence une nouvelle session
    setEffectiveStudyTime(0);
    
    // Si mode Pomodoro, démarrer avec l'état focus
    if (pomodoroMode) {
      setPomodoroState('focus');
      startPomodoroSession();
    }
  };

  // Mettre en pause le timer
  const pauseTimer = () => {
    setIsActive(false);
    
    // En mode Pomodoro, mettre aussi en pause le cycle
    if (pomodoroMode && pomodoroTimerRef.current) {
      clearTimeout(pomodoroTimerRef.current);
      pomodoroTimerRef.current = null;
    }
  };

  // Arrêter le timer et enregistrer la session
  const stopTimer = () => {
    // Éviter les appels multiples en vérifiant si le timer est déjà arrêté
    if (!isActive && timer === 0) {
      console.log('Timer déjà arrêté, ignoré');
      return;
    }
    
    console.log("stopTimer - selectedGoal:", selectedGoal, typeof selectedGoal);
    
    if (timer > 0) {
      // Trouver l'objectif avec conversion explicite des types pour éviter les erreurs
      const targetGoal = goals.find(g => String(g.id) === String(selectedGoal));
      console.log("Objectif trouvé pour la session:", targetGoal);
      
      const session = {
        id: Date.now(),
        goalId: targetGoal ? targetGoal.id : null,
        duration: pomodoroMode ? effectiveStudyTime : timer,
        date: new Date().toISOString(),
        goalTitle: targetGoal ? targetGoal.title : 'Inconnu'
      };
      
      console.log("Session créée:", session);
      onAddSession(session);
    }
    
    
    setIsActive(false);
    setTimer(0);
    setTimerStartTime(null);
    setFocusMode(false);
    setEffectiveStudyTime(0);
    
    // Réinitialiser le mode Pomodoro si actif
    if (pomodoroMode) {
      setPomodoroState('focus');
      setPomodoroCount(0);
      
      if (pomodoroTimerRef.current) {
        clearTimeout(pomodoroTimerRef.current);
        pomodoroTimerRef.current = null;
      }
    }
  };
  
  // Basculer le mode focus
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // Demander confirmation avant de supprimer
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
      onDeleteSession(sessionId);
    }
  };

  // Filtrer les sessions en fonction de l'objectif sélectionné
const filteredSessions = filteredGoalId 
? studySessions.filter(session => session.goalId === filteredGoalId || session.goal_id === filteredGoalId)
: studySessions;

  // Obtenir le nom de l'objectif
  const getGoalName = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal_title : 'Objectif inconnu';
  };

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  // Calculer le temps total passé aujourd'hui
  const totalTimeToday = todaysSessions.reduce((total, session) => total + session.duration, 0);
  
  // Calculer le temps total passé cette semaine
  const totalTimeWeek = weekSessions.reduce((total, session) => total + session.duration, 0);

  // Obtenir les objectifs à afficher (tous ou seulement ceux du jour)
  const getGoalsToDisplay = () => {
    if (showAllGoals) return goals;
    
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = days[new Date().getDay()];
    
    return goals.filter(goal => goal.days[today]);
  };

  // Calculer le temps restant par objectif
  const getRemainingTimeForGoal = (goalId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return 0;
    
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = days[new Date().getDay()];
    
    if (!goal.days[today]) return 0;
    
    const todayStr = new Date().toDateString();
    const todaySessionsForGoal = studySessions.filter(
      session => session.goalId === goalId && new Date(session.date).toDateString() === todayStr
    );
    
    const totalMinutesToday = todaySessionsForGoal.reduce(
      (total, session) => total + session.duration, 0
    ) / 60; // Convertir les secondes en minutes
    
    // Calculer le temps restant en secondes
    const remainingMinutes = Math.max(0, goal.minutes - totalMinutesToday);
    return Math.round(remainingMinutes * 60);
  };

  // Si mode focus activé, afficher uniquement le timer en plein écran
  if (focusMode) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-base-100">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={toggleFocusMode}
            className="btn btn-sm btn-circle btn-ghost"
            title="Réduire"
          >
            <Minimize size={20} />
          </button>
          <button
            onClick={stopTimer}
            className="btn btn-sm btn-circle btn-error"
            title="Arrêter et enregistrer"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="text-center px-4 w-full max-w-[60%]">
          {selectedGoal && (
            <h2 className="text-xl font-medium mb-4">
              {getGoalName(selectedGoal)}
            </h2>
          )}
          
          {pomodoroMode && (
            <div className="mb-4">
              <div className={`badge badge-lg ${pomodoroState === 'focus' ? 'badge-primary' : 'badge-accent'}`}>
                {pomodoroState === 'focus' ? 'Focus' : 'Pause'} - Cycle {Math.floor(pomodoroCount / 2) + 1}
              </div>
            </div>
          )}
          
          <div className={`text-8xl font-mono my-8 ${
            isActive 
              ? pomodoroState === 'focus' ? 'text-primary' : 'text-accent'
              : ''
          }`}>
            {formatTime(timer)}
          </div>
          
          {pomodoroMode && pomodoroState === 'focus' && (
            <div className="text-xl mb-4">
              Temps d'étude effectif: {formatTime(effectiveStudyTime)}
            </div>
          )}
          
          <div className="flex justify-center space-x-4 mt-8">
            {isActive ? (
              <button
                onClick={pauseTimer}
                className="btn btn-circle btn-lg btn-warning"
                title="Pause"
              >
                <Pause size={36} />
              </button>
            ) : (
              <button
                onClick={() => setIsActive(true)}
                className="btn btn-circle btn-lg btn-primary"
                title="Reprendre"
              >
                <Play size={36} />
              </button>
            )}
          </div>
          
          {remainingTime > 0 && (
            <div className="mt-8 text-lg">
              <span>Temps restant aujourd'hui : </span>
              <strong>{formatTime(remainingTime)}</strong>
            </div>
          )}
          
          {timerStartTime && (
            <div className="mt-4 text-sm opacity-75">
              Démarré à {new Date(timerStartTime).toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Affichage normal
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-6 gap-4 sm:gap-6">
      {/* Sélection d'objectif et mode Pomodoro */}
      <div className="bg-base-200 p-4 rounded-box shadow md:col-span-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-l font-medium">Choisir un objectif</h2>
          <div className="flex items-center gap-2">
            
            <button 
              onClick={() => setShowAllGoals(!showAllGoals)}
              className="btn btn-xs btn-outline"
            >
              {showAllGoals ? "Aujourd'hui" : "Voir tout"}
            </button>
          </div>
        </div>
        
        {/* Affichage des cartes d'objectifs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 ">
          {getGoalsToDisplay().map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              isSelected={selectedGoal === goal.id}
              onSelect={onSelectGoal}
              remainingTime={getRemainingTimeForGoal(goal.id)}
            />
          ))}
          
          {/* Carte pour ajouter un nouvel objectif */}
          <div 
            className="card bg-base-100 border-2 border-dashed border-base-300 cursor-pointer hover:border-primary transition-colors duration-200 flex items-center justify-center"
            onClick={() => document.getElementById('goals_modal').showModal()}
          >
            <div className="text-center p-2">
              <PlusCircle size={32} className="mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium">Ajouter un objectif</p>
            </div>
          </div>
        </div>

        {/* Switch pour le mode Pomodoro */}
        {selectedGoal && (
      <div className="border-t pt-4 mt-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Coffee size={18} />
            <span className="text-sm">Mode Pomodoro</span>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-primary" 
            checked={pomodoroMode}
            onChange={togglePomodoroMode}
            disabled={isActive}
          />
        </div>
        
        {pomodoroMode && (
          <div className="text-xs mb-4 opacity-70">
            25 min de travail, 5 min de pause. Les pauses ne sont pas comptées.
          </div>
        )}
        
        <div className="text-center">
          <div className={`text-3xl font-mono my-4 ${
            isActive 
              ? pomodoroState === 'focus' ? 'text-primary' : 'text-accent'
              : ''
          }`}>
            {formatTime(timer)}
          </div>
          
          {pomodoroMode && isActive && (
            <div className="badge badge-sm mb-4">
              {pomodoroState === 'focus' ? 'Focus' : 'Pause'}
            </div>
          )}
          
          <div className="flex justify-center space-x-4">
            {!isActive ? (
              <button
                onClick={startTimer}
                className="btn btn-primary"
                disabled={!selectedGoal}
                title="Démarrer"
              >
                <Play size={20} className="mr-2" />
                Démarrer
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="btn btn-warning"
                title="Pause"
              >
                <Pause size={20} className="mr-2" />
                Pause
              </button>
            )}
            

          </div>
          
          {timerStartTime && (
            <div className="mt-4 text-sm opacity-75">
              Démarré à {new Date(timerStartTime).toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>
        
        {isActive && (
          <div className="mt-4 flex justify-end">
            <button 
              onClick={toggleFocusMode}
              className="btn btn-sm btn-ghost"
              title="Mode plein écran"
            >
              <Maximize size={18} className="mr-1" />
              Plein écran
            </button>
          </div>
        )}
      </div>
    )}
      </div>

      {/* Timer et statistiques */}
      <div className="card bg-base-200 shadow-lg md:col-span-2">
        {/* Timer */}

        {/* Statistiques */}
        <div className="">
          <div className="card-body">
            <h2 className="card-title">Statistiques</h2>
            
            <div className="stats shadow my-4 stats-horizontal">
            <div className="stat">
              <div className="stat-title text-xs">Aujourd'hui</div>
              <div className="stat-value text-xl">{formatTime(totalTimeToday)}</div>
            </div>
            
            <div className="stat">
              <div className="stat-title text-xs">Cette semaine</div>
              <div className="stat-value text-xl">{formatTime(totalTimeWeek)}</div>
            </div>
          </div>
            
            <div>
              <div className="flex items-center mb-3">
                <BarChart2 size={18} className="mr-2" />
                <h3 className="font-medium">Sessions récentes</h3>
              </div>
              
              {studySessions.length === 0 ? (
                <div className="text-center py-3">
                  <p className="italic opacity-70">
                    Aucune session d'étude enregistrée
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
  {/* Filtre par objectif */}
  <div className="mb-2">
  <select
  className="select select-xs select-bordered w-full max-w-xs"
  value={filteredGoalId || ""}
  onChange={(e) => setFilteredGoalId(e.target.value ? Number(e.target.value) : null)}
>
  <option value="">Tous les objectifs</option>
  {goals.map(goal => (
    <option key={goal.id} value={goal.id}>
      {goal.title}
    </option>
  ))}
</select>
  </div>

  <table className="table table-xs">
    <thead>
      <tr>
        <th>Date</th>
        <th>Objectif</th>
        <th>Durée</th>
      </tr>
    </thead>
    <tbody>
      {studySessions.slice().reverse().slice(0, 3).filter(session => !filteredGoalId || Number(session.goal_id) === filteredGoalId).map(session => (
          <tr key={session.id}>
            <td>{formatDate(session.date)}</td>
            <td>{session.goal_title || getGoalName(session.goal_id)}</td> {/* Nom de l'objectif */}
            <td className="font-mono">{formatTime(session.duration)}</td>
            <td>
              <button
                onClick={() => handleDeleteSession(session.id)}
                className="btn btn-xs btn-ghost text-error px-1" // Taille réduite avec padding ajusté
                title="Supprimer cette session">
                <Trash2 size={12} /> {/* Taille d'icône réduite */}
              </button>
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerApp;