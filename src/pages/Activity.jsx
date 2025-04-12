import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import UserOptionsModal from '../components/UserOptionsModal';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  BarChart2, 
  ChevronLeft, 
  ChevronRight,
  Target,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// Constante pour la clé de progression journalière (doit être la même que dans les autres composants)
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';

function Activity() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [goalCompletionData, setGoalCompletionData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiplicateur de défilement
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  // Fonction pour récupérer la date actuelle au format YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Fonction pour récupérer la progression quotidienne d'un objectif
  const getDailyProgress = (goalId, date) => {
    if (!goalId) return 0;
    
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const key = `${DAILY_PROGRESS_KEY}_${goalId}_${dateString}`;
      const storedProgress = localStorage.getItem(key);
      
      if (storedProgress) {
        return parseInt(storedProgress, 10);
      }
    } catch (error) {
      console.error(t('activity.errors.dailyProgressError'), error);
    }
    
    return 0;
  };
  
  // Charger les sessions d'étude et les objectifs
  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Récupérer tous les objectifs d'abord
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (goalsError) {
          throw goalsError;
        }
        
        // Récupérer les sessions avec les informations sur les objectifs associés
        const { data: sessionsData, error: sessionsError } = await supabase
  .from('study_sessions')
  .select(`
    id,
    duration,
    created_at,
    goal_id,
    goals (
      id,
      name,
      color
    )
  `)
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(15); // Limiter à 15 sessions maximum

        
        if (sessionsError) {
          throw sessionsError;
        }
        
        console.log(t('activity.debug.sessionsLoaded'), sessionsData?.length);
        console.log(t('activity.debug.goalsLoaded'), goalsData?.length);
        console.log(t('activity.debug.availableGoals'), goalsData?.map(g => ({ id: g.id, type: typeof g.id, name: g.name })));
        
        // Pour chaque objectif, vérifier si nous avons une entrée pour aujourd'hui
        const today = getTodayDate();
        goalsData.forEach(goal => {
          const key = `${DAILY_PROGRESS_KEY}_${goal.id}_${today}`;
          if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, '0');
          }
        });
        
        // Mettre à jour les états avec les données récupérées
        setSessions(sessionsData || []);
        setGoals(goalsData || []);
        
        // Définir l'objectif sélectionné par défaut (le premier)
        if (goalsData && goalsData.length > 0) {
          const firstGoal = goalsData[0];
          console.log(t('activity.debug.settingDefaultGoal'), firstGoal.name, firstGoal.id, typeof firstGoal.id);
          setSelectedGoal(firstGoal);
          
          // Préparer les données pour les graphiques
          prepareChartData(sessionsData || [], firstGoal);
        } else {
          console.log(t('activity.debug.noGoalsFound'));
          prepareChartData(sessionsData || [], null);
        }
        
      } catch (err) {
        console.error(t('activity.errors.dataLoadError'), err);
        setError(t('activity.errors.unableToLoadData'));
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user, t]);

  // Mettre à jour les données du graphique quand la semaine change
  useEffect(() => {
    if (sessions.length > 0) {
      prepareChartData(sessions, selectedGoal);
    }
  }, [currentWeek]);

  // Fonction d'aide pour formater le temps en "Xmin Ysec"
  const formatTimeForTooltip = (seconds) => {
    if (seconds === 0) return t('activity.time.zeroSeconds');
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes === 0) {
      return t('activity.time.secondsOnly', { seconds: remainingSeconds });
    } else if (remainingSeconds === 0) {
      return t('activity.time.minutesOnly', { minutes });
    } else {
      return t('activity.time.minutesAndSeconds', { minutes, seconds: remainingSeconds });
    }
  };
  
  // Préparer les données pour les graphiques
  const prepareChartData = (sessionsData, goal) => {
    // Données par jour pour la semaine en cours
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Lundi
    const end = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Dimanche
    
    const days = eachDayOfInterval({ start, end });
    
    // Regrouper les sessions par jour
    const dailyStats = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE', { locale: fr });
      
      // Filtrer les sessions pour ce jour
      const daySessions = sessionsData.filter(session => {
        const sessionDate = parseISO(session.created_at);
        return isSameDay(sessionDate, day);
      });
      
      // Calculer la durée totale (en secondes puis en minutes)
      const totalSeconds = daySessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const totalMinutes = Math.round(totalSeconds / 60 * 10) / 10;
      
      return {
        date: dayStr,
        jour: dayName.charAt(0).toUpperCase() + dayName.slice(1, 3),
        minutes: totalMinutes,
        secondes: totalSeconds // Conserver les secondes pour les tooltips
      };
    });
    
    setDailyData(dailyStats);
    
    // Données de complétion d'objectif pour la visualisation hebdomadaire
    if (goal) {
      console.log(t('activity.debug.preparingChartData'), goal.name, goal.id);
      
      try {
        // Assurer que days est un tableau valide
        let goalDays = [];
        try {
          goalDays = goal.days_of_week || [];
          if (!Array.isArray(goalDays)) {
            console.warn(t('activity.debug.invalidDaysFormat'), goal.days_of_week);
            goalDays = [];
          }
        } catch (e) {
          console.error(t('activity.debug.errorParsingDays'), e, t('activity.debug.daysValue'), goal.days_of_week);
          goalDays = [];
        }
        
        const goalDuration = goal.duration || 0; // en secondes
        
        const goalCompletionStats = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayName = format(day, 'EEEE', { locale: fr });
          const dayShort = format(day, 'EEE', { locale: fr }).charAt(0).toUpperCase() + format(day, 'EEE', { locale: fr }).slice(1, 3);
          
          // Vérifier si ce jour est prévu pour cet objectif
          const dayFullName = format(day, 'EEEE', { locale: fr });
          const capitalizedDayName = dayFullName.charAt(0).toUpperCase() + dayFullName.slice(1);
          const isScheduled = goalDays.includes(capitalizedDayName);
          
          // Si c'est aujourd'hui ou un jour passé, récupérer la progression quotidienne réelle depuis localStorage
          let totalSeconds = 0;
          const today = new Date();
          
          if (isSameDay(day, today)) {
            // Pour aujourd'hui, utiliser la progression stockée
            totalSeconds = getDailyProgress(goal.id, day);
          } else if (day < today) {
            // Pour les jours passés, utiliser les données de sessions
            // Filtrer les sessions pour ce jour et cet objectif
            const dayGoalSessions = sessionsData.filter(session => {
              const sessionDate = parseISO(session.created_at);
              return isSameDay(sessionDate, day) && session.goal_id === goal.id;
            });
            
            // Calculer la durée totale (en secondes)
            totalSeconds = dayGoalSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
          }
          // Pour les jours futurs, totalSeconds reste à 0
          
          console.log(t('activity.debug.dayDebugInfo', { day: dayStr, dayShort, totalSeconds, isScheduled }));
          
          // Déterminer si l'objectif a été atteint pour ce jour
          const isCompleted = totalSeconds >= goalDuration;
          const hasActivity = totalSeconds > 0;
          
          return {
            date: dayStr,
            jour: dayShort,
            jourComplet: dayName,
            isScheduled,
            isCompleted,
            hasActivity,
            secondes: totalSeconds,
            objectifSecondes: isScheduled ? goalDuration : 0,
            completion: goalDuration > 0 ? Math.min(100, Math.round((totalSeconds / goalDuration) * 100)) : 0
          };
        });
        
        setGoalCompletionData(goalCompletionStats);
      } catch (error) {
        console.error(t('activity.errors.goalCompletionDataError'), error);
        setGoalCompletionData([]);
      }
    } else {
      console.log(t('activity.debug.noGoalSelected'));
      setGoalCompletionData([]);
    }
  };
  
  // Gérer le changement d'objectif sélectionné
  const handleGoalChange = (event) => {
    const goalId = event.target.value;
    console.log(t('activity.debug.goalSelected'), goalId, typeof goalId);
    
    // Convertir l'ID en nombre si nécessaire (les valeurs de select sont souvent des chaînes)
    // Certaines bases de données utilisent des IDs numériques
    const searchId = goalId;
    const searchIdNumber = parseInt(goalId, 10);
    
    // Trouver l'objectif correspondant dans la liste des objectifs (en testant les deux formats)
    let goal = goals.find(g => g.id === searchId);
    
    // Si non trouvé avec la chaîne, essayer avec le numérique
    if (!goal) {
      goal = goals.find(g => g.id === searchIdNumber);
    }
    
    // Log détaillé pour comprendre le problème
    console.log(t('activity.debug.searchingForGoal'), searchId, t('activity.debug.or'), searchIdNumber);
    console.log(t('activity.debug.availableGoals'), goals.map(g => ({ id: g.id, type: typeof g.id, name: g.name })));
    console.log(t('activity.debug.foundGoal'), goal);
    
    if (goal) {
      setSelectedGoal(goal);
      // Recalculer les données avec le nouvel objectif sélectionné
      prepareChartData(sessions, goal);
    } else {
      console.error(t('activity.errors.goalNotFound'), goalId);
      
      // Solution de repli : s'il y a des objectifs disponibles, sélectionner le premier
      if (goals.length > 0) {
        console.log(t('activity.debug.fallingBackToFirstGoal'), goals[0]);
        setSelectedGoal(goals[0]);
        prepareChartData(sessions, goals[0]);
      }
    }
  };
  
  // Naviguer à la semaine précédente
  const goToPreviousWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
  };
  
  // Naviguer à la semaine suivante
  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
  };
  
  // Formater la durée (de secondes à heures et minutes)
  const formatDuration = (seconds) => {
    if (!seconds) return t('activity.time.zeroMinutes');
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return t('activity.time.hoursFormat', { hours, minutes: minutes > 0 ? t('activity.time.minutesAppend', { minutes }) : '' });
    } else if (minutes > 0) {
      return t('activity.time.minutesFormat', { minutes });
    } else {
      return t('activity.time.secondsFormat', { seconds: secs });
    }
  };
  
  // Formater la date et l'heure
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Préparer la suppression d'une session
  const prepareDeleteSession = (session) => {
    setSessionToDelete(session);
  };
  
  // Annuler la suppression
  const cancelDelete = () => {
    setSessionToDelete(null);
  };
  
  // Confirmer et exécuter la suppression
  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    
    try {
      setLoading(true);
      
      // 1. Récupérer l'objectif associé pour connaître sa durée actuelle
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('completed_duration')
        .eq('id', sessionToDelete.goal_id)
        .single();
      
      if (goalError) {
        throw goalError;
      }
      
      // 2. Supprimer la session
      const { error: sessionError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionToDelete.id);
      
      if (sessionError) {
        throw sessionError;
      }
      
      // 3. Mettre à jour la durée complétée de l'objectif
      if (goalData) {
        const newCompletedDuration = Math.max(0, (goalData.completed_duration || 0) - sessionToDelete.duration);
        
        const { error: updateError } = await supabase
          .from('goals')
          .update({ completed_duration: newCompletedDuration })
          .eq('id', sessionToDelete.goal_id);
        
        if (updateError) {
          throw updateError;
        }
      }
      
      // 4. Si la session est d'aujourd'hui, mettre à jour la progression quotidienne
      const sessionDate = new Date(sessionToDelete.created_at);
      if (isToday(sessionDate)) {
        const today = getTodayDate();
        const key = `${DAILY_PROGRESS_KEY}_${sessionToDelete.goal_id}_${today}`;
        
        // Récupérer la progression existante
        let currentProgress = 0;
        const storedProgress = localStorage.getItem(key);
        if (storedProgress) {
          currentProgress = parseInt(storedProgress, 10);
        }
        
        // Calculer la nouvelle progression (en s'assurant qu'elle ne devient pas négative)
        const newProgress = Math.max(0, currentProgress - sessionToDelete.duration);
        
        // Mettre à jour le localStorage
        localStorage.setItem(key, newProgress.toString());
      }
      
      // 5. Mettre à jour la liste locale des sessions
      const updatedSessions = sessions.filter(s => s.id !== sessionToDelete.id);
      setSessions(updatedSessions);
      
      // 6. Mettre à jour les graphiques
      prepareChartData(updatedSessions, selectedGoal);
      
      // Réinitialiser l'état
      setSessionToDelete(null);
      
    } catch (err) {
      console.error(t('activity.errors.sessionDeletionError'), err);
      setError(t('activity.errors.unableToDeleteSession'));
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de mise à jour des paramètres utilisateur
  const handleUpdateSettings = (updatedSettings) => {
    setUserSettings(updatedSettings);
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      {/* Utiliser le composant Navbar partagé */}
      <Navbar 
        onOpenUserModal={() => setIsModalOpen(true)} 
        userSettings={userSettings}
      />
      
      <div className="grid grid-cols-1 gap-4 max-w-[90%] sm:max-w-[80%] mx-auto">
        {/* Section des graphiques */}
        <div className="flex flex-col gap-4">
          {/* Contrôles de navigation pour la semaine */}
          <div className="flex items-center justify-center gap-2 p-3 bg-base-100 rounded-lg">
            <button 
              className="btn btn-sm btn-ghost btn-circle" 
              onClick={goToPreviousWeek}
              aria-label={t('activity.ariaLabels.previousWeek')}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-lg mx-2">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd/MM')} - 
              {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
            </span>
            <button 
              className="btn btn-sm btn-ghost btn-circle" 
              onClick={goToNextWeek}
              aria-label={t('activity.ariaLabels.nextWeek')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          {/* Conteneur des graphiques - change en 2 colonnes sur MD et plus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow-md">
  <div className="card-body">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
      <h2 className="card-title flex items-center gap-2">
        <Target size={20} className="text-primary" />
        {t('activity.headings.goalTracking')}
      </h2>

      {goals.length > 0 && (
        <div className="form-control
         max-w-xs">
          <select 
            className="select select-bordered select-sm w-48"
            value={selectedGoal?.id || ''}
            onChange={handleGoalChange}
          >
            {goals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>

    {!selectedGoal && (
      <div className="alert">
        <span>{t('activity.messages.selectGoalToViewTracking')}</span>
      </div>
    )}

    {selectedGoal && (
      <>
        <div className="alert alert-soft alert-info mb-4 py-2">
          <Info size={16} />
          <span>{t('activity.labels.goalTarget', { duration: formatDuration(selectedGoal.duration) })}</span>
        </div>
        
        {/* Conteneur avec scroll horizontal sur petit écran */}
        <div className="relative">
          {/* Indicateurs de défilement sur petits écrans */}
          <div className="md:hidden absolute -left-2 top-1/2 transform -translate-y-1/2 z-10 opacity-80">
            <div className="bg-base-100 rounded-full p-1 shadow-sm">
              <ChevronLeft size={16} className="text-primary" />
            </div>
          </div>
          <div className="md:hidden absolute -right-2 top-1/2 transform -translate-y-1/2 z-10 opacity-80">
            <div className="bg-base-100 rounded-full p-1 shadow-sm">
              <ChevronRight size={16} className="text-primary" />
            </div>
          </div>
          
          {/* Conteneur scrollable */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto pb-2 hide-scrollbar"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="grid grid-flow-col md:grid-cols-7 auto-cols-min gap-2 my-2">
  {goalCompletionData.map((day) => (
    <div
      key={day.date}
      className={`flex flex-col items-center justify-center h-24 w-24 md:w-auto p-2 rounded-lg bg-accent-content shadow-sm border ${
        day.isCompleted 
          ? 'border-success border-2' 
          : 'border-gray-200'
      } ${
        !day.isCompleted && day.hasActivity
          ? 'opacity-60'
          : ''
      }`}
    >
      <div className="text-sm font-medium mb-1">{day.jour}</div>
      
      {day.hasActivity ? (
        <>
          {/* Icône et pourcentage centrés */}
          <div className="flex flex-col items-center justify-center flex-grow">
            <div className="mb-1">
              {day.isCompleted
                ? <CheckCircle2 size={22} className="text-success" />
                : <XCircle size={22} className="text-error" />
              }
            </div>
            
            {/* Pourcentage en gros et temps en plus petit */}
            <div className="text-md font-bold">{day.completion}%</div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-grow">
          {day.isScheduled ? (
            <>
              <div className="text-xs text-center text-base-content text-opacity-50 mb-1">
                {t('activity.labels.scheduled')}
              </div>
              <div className="text-xl font-bold">0%</div>
            </>
          ) : (
            <div className="text-xs text-center text-base-content text-opacity-50">
              {t('activity.labels.notScheduled')}
            </div>
          )}
        </div>
      )}
    </div>
  ))}
</div>
          </div>
        </div>
        
        {/* Légende */}
        <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={16} className="text-success" />
            <span>{t('activity.legend.goalAchieved')}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle size={16} className="text-error" />
            <span>{t('activity.legend.goalNotAchieved')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-base-200 rounded-full border border-base-300"></div>
            <span>{t('activity.legend.dayNotScheduled')}</span>
          </div>
        </div>
      </>
    )}
  </div>
</div>
            {/* Graphique journalier */}
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  {t('activity.headings.studyTimePerDay')}
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dailyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jour" />
                      <YAxis unit={t('activity.units.minutes')} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          if (props.payload && props.payload.secondes !== undefined) {
                            return [formatTimeForTooltip(props.payload.secondes), t('activity.tooltips.studyTime')];
                          }
                          return [`${value} ${t('activity.units.minutes')}`, t('activity.tooltips.studyTime')];
                        }}
                      />
                      <Bar 
                        dataKey="minutes" 
                        name={t('activity.tooltips.studyTime')}
                      >
                        {dailyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#fdca11" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Liste des sessions */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              {t('activity.headings.sessionHistory')}
            </h2>
            
            {loading && <div className="alert">{t('activity.messages.loadingSessions')}</div>}
            
            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {!loading && sessions.length === 0 && (
              <div className="alert">
                <span>{t('activity.messages.noStudySessionsRecorded')}</span>
              </div>
            )}
            
            {!loading && sessions.length > 0 && (
  <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
    <table className="table table-zebra w-full">
      <thead className="sticky top-0 bg-base-100 z-10">
        <tr>
          <th>{t('activity.table.date')}</th>
          <th>{t('activity.table.goal')}</th>
          <th>{t('activity.table.duration')}</th>
          <th>{t('activity.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map(session => (
          <tr key={session.id}>
            <td>{formatDateTime(session.created_at)}</td>
            <td>
              <div className="flex items-center gap-2">
                {session.goals && (
                  <>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: session.goals.color || 'hsl(var(--p))' }}
                    ></div>
                    <span>{session.goals.name}</span>
                  </>
                )}
                {!session.goals && <span className="text-opacity-50">{t('activity.labels.deletedGoal')}</span>}
              </div>
            </td>
            <td>{formatDuration(session.duration)}</td>
            <td>
              <button 
                className="btn btn-sm btn-ghost text-error" 
                onClick={() => prepareDeleteSession(session)}
                aria-label={t('activity.ariaLabels.deleteSession')}
              >
                <Trash2 size={16} />
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
      
      {/* Modal de confirmation de suppression */}
      {sessionToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="text-warning" size={20} />
              {t('activity.modals.deleteConfirmation.title')}
            </h3>
            <p className="py-4">
              {t('activity.modals.deleteConfirmation.confirmationQuestion')}
              <br />
              <span className="font-medium">{t('activity.modals.deleteConfirmation.goal')}:</span> {sessionToDelete.goals ? sessionToDelete.goals.name : t('activity.labels.deletedGoal')}
              <br />
              <span className="font-medium">{t('activity.modals.deleteConfirmation.duration')}:</span> {formatDuration(sessionToDelete.duration)}
              <br />
              <span className="font-medium">{t('activity.modals.deleteConfirmation.date')}:</span> {formatDateTime(sessionToDelete.created_at)}
            </p>
            <p className="text-warning text-sm">
              {t('activity.modals.deleteConfirmation.note')}
              {isToday(new Date(sessionToDelete.created_at)) && (
                <> {t('activity.modals.deleteConfirmation.todayProgressNote')}</>
              )}
            </p>
            <div className="modal-action">
              <button className="btn" onClick={cancelDelete}>{t('activity.buttons.cancel')}</button>
              <button className="btn btn-error" onClick={confirmDelete}>{t('activity.buttons.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'options utilisateur */}
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

export default Activity;