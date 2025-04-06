// src/components/GoalSetting.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Clock, AlertCircle } from 'lucide-react';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const WEEKEND = ['Samedi', 'Dimanche'];
const DAILY_PROGRESS_KEY = 'DAILY_PROGRESS';
// Définir la limite d'objectifs ici
const GOALS_LIMIT = 3;

// Palettes de couleurs disponibles
const COLORS = [
  { name: 'Rouge corail', hex: '#f07167' },
  { name: 'Pêche', hex: '#fed9b7' },
  { name: 'Jaune pâle', hex: '#fdfcdc' },
  { name: 'Turquoise', hex: '#00afb9' },
  { name: 'Bleu océan', hex: '#0081a7' }
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


const GoalSetting = ({ onGoalSelect, refreshTrigger = 0, currentDay = null, ignoreDate = false }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  // État pour suivre si la limite est atteinte
  const [isLimitReached, setIsLimitReached] = useState(false);
  
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

  // Récupérer la date actuelle au format YYYY-MM-DD
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };
  
  // Fonction pour récupérer la progression quotidienne
  const getDailyProgress = (goalId) => {
    if (!goalId) return 0;
    
    try {
      const today = getTodayDate();
      const key = `${DAILY_PROGRESS_KEY}_${goalId}_${today}`;
      const storedProgress = localStorage.getItem(key);
      
      if (storedProgress) {
        return parseInt(storedProgress, 10);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la progression quotidienne:', error);
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
      console.error('Erreur lors de la vérification de la limite d\'objectifs:', err);
      return 0;
    }
  }, [user]);

  // Effet pour le chargement initial
  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]); // Dépend seulement de user
  
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
      console.error('Erreur lors de la récupération des objectifs:', err);
      setError('Impossible de charger vos objectifs. Veuillez réessayer.');
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
        setError(`Vous avez atteint la limite de ${GOALS_LIMIT} objectifs`);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('goals')
        .insert([
          {
            user_id: user.id,
            name: newGoal.name,
            duration: newGoal.timeUnit === 'minutes' ? newGoal.dailyTime * 60 : newGoal.dailyTime * 3600,
            completed_duration: 0,
            days_of_week: newGoal.daysOfWeek,
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
      console.error('Erreur lors de la création de l\'objectif:', err);
      setError('Impossible de créer l\'objectif. Veuillez réessayer.');
    } finally {
      setLoading(false);
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
      console.error('Erreur lors de la mise à jour de l\'objectif:', err);
      setError('Impossible de mettre à jour l\'objectif. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
      return;
    }
    
    try {
      setLoading(true);
      
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
      console.error('Erreur lors de la suppression de l\'objectif:', err);
      setError('Impossible de supprimer l\'objectif. Veuillez réessayer.');
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
    setFunction(prev => ({
      ...prev,
      daysOfWeek: days
    }));
  };

  const formatTime = (duration, unit) => {
    if (unit === 'heures') {
      return `${duration} heure(s)`;
    }
    return `${duration} minute(s)`;
  };
  
  const renderDaysOfWeek = (days) => {
    if (days.length === 7) return 'Tous les jours';
    if (JSON.stringify(days.sort()) === JSON.stringify(WEEKDAYS.sort())) return 'Jours ouvrés';
    if (JSON.stringify(days.sort()) === JSON.stringify(WEEKEND.sort())) return 'Week-end';
    
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
    
    const todayProgress = getDailyProgress(goal.id);
    return Math.min(100, Math.round((todayProgress / goal.duration) * 100));
  };
  
  // Filtrer les objectifs en fonction du jour de la semaine
  const filteredGoals = useMemo(() => {
    if (!goals || goals.length === 0) return [];
    
    // Si on ignore la date ou qu'il n'y a pas de jour spécifié, retourner tous les objectifs
    if (ignoreDate || !currentDay) return goals;
    
    // Sinon, filtrer les objectifs pour le jour actuel
    return goals.filter(goal => {
      return goal.days_of_week && goal.days_of_week.includes(currentDay);
    });
  }, [goals, currentDay, ignoreDate]);

  // Formater le temps restant basé sur la progression quotidienne
  const formatRemainingTime = (goal) => {
    if (!goal) return '';
    
    const totalSeconds = goal.duration || 0;
    const completedSeconds = getDailyProgress(goal.id);
    const remainingSeconds = totalSeconds - completedSeconds;
    
    if (remainingSeconds <= 0) return 'Terminé';
    
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m restante(s)`;
    }
    return `${minutes}m ${seconds}s restante(s)`;
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg m-0">Mes objectifs</h2>
          {selectedGoalId ? (
            <button 
              className="btn btn-sm btn-soft btn-secondary"
              onClick={() => {
                setSelectedGoalId(null);
                onGoalSelect(null);
              }}
            >
              Changer d'objectif
            </button>
          ) : (
              <div className={isLimitReached ? "tooltip tooltip-left" : ""} data-tip={isLimitReached ? `Limite de ${GOALS_LIMIT} objectifs atteinte` : ""}>
              <button 
                className="btn btn-sm btn-soft btn-secondary"
                onClick={() => setIsCreateModalOpen(true)}
                disabled={loading || isLimitReached}
              >
                <Plus size={16} />
                Ajouter
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
                ? "Aucun objectif défini. Créez-en un pour commencer." 
                : `Aucun objectif pour ${currentDay}. Ajoutez-en un ou modifiez les jours d'un objectif existant.`}
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
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {/* Puce de couleur devant le titre */}
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0 ring-secondary ring-offset-1" 
                          style={{ backgroundColor: goal.color || COLORS[0].hex }}
                        ></div>
                        <div>
                          <h3 className="font-semibold text-base">{goal.name}</h3>
                          <div className="text-sm text-gray-500 mt-0.5">
                          {formatTime(goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600, goal.time_unit)} 
      {/* Affichage des jours sélectionnés en format compact */}
      <span className="mx-1">•</span>
      <span className="inline-flex gap-1">
        {DAYS.map(day => (
          <span 
            key={day} 
            className={`text-xs ${
              goal.days_of_week.includes(day) 
                ? 'font-bold' 
                : 'opacity-30'
            }`}
          >
            {day.substring(0, 1)}
          </span>
        ))}
      </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-xs btn-ghost rounded-full"
                          onClick={() => handleEditGoal(goal)}
                          disabled={loading}
                          aria-label="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-xs btn-ghost rounded-full text-error"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={loading}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-600">{formatRemainingTime(goal)}</span>
                        <span className="font-medium">{calculateProgress(goal)}% accompli</span>
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
              /* Sinon, on affiche tous les objectifs */
              filteredGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-base-200 transition-all shadow-sm"
                  onClick={() => handleSelectGoal(goal)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      {/* Puce de couleur devant le titre */}
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: goal.color || COLORS[0].hex }}
                      ></div>
                      <div>
                        <h3 className="font-semibold text-base">{goal.name}</h3>
                        <div className="text-sm text-gray-500 mt-0.5">
                        {formatTime(goal.time_unit === 'minutes' ? goal.duration / 60 : goal.duration / 3600, goal.time_unit)} 
      {/* Affichage des jours sélectionnés en format compact */}
      <span className="mx-1">•</span>
      <span className="inline-flex gap-1">
        {DAYS.map(day => (
          <span 
            key={day} 
            className={`text-xs ${
              goal.days_of_week.includes(day) 
                ? 'font-bold' 
                : 'opacity-30'
            }`}
          >
            {day.substring(0, 1)}
          </span>
        ))}
      </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-ghost rounded-full"
                        onClick={(e) => {
                          e.stopPropagation(); // Empêche le déclenchement du onClick du parent
                          handleEditGoal(goal);
                        }}
                        disabled={loading}
                        aria-label="Modifier"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost rounded-full text-error"
                        onClick={(e) => {
                          e.stopPropagation(); // Empêche le déclenchement du onClick du parent
                          handleDeleteGoal(goal.id);
                        }}
                        disabled={loading}
                        aria-label="Supprimer"
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
              ))
            )}
          </div>
        )}

        {/* Modal de création d'objectif */}
        <Modal
  isOpen={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
  title="Créer un nouvel objectif"
>
  <form onSubmit={handleCreateGoal}>
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">Nom de l'objectif</span>
      </label>
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder="Ex: Apprendre JavaScript"
        value={newGoal.name}
        onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
        required
      />
    </div>

    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">Temps quotidien</span>
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
          <option value="minutes">Minutes</option>
          <option value="heures">Heures</option>
        </select>
      </div>
    </div>

    <div className="form-control mb-4">
      <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
        <legend className="fieldset-legend">Jours de la semaine</legend>
        <div className="flex flex-wrap gap-1 justify-center">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`btn btn-xs ${
                newGoal.daysOfWeek.includes(day) 
                  ? 'btn-primary' 
                  : 'bg-base-300 text-base-content opacity-60'
              }`}
              onClick={() => {
                if (newGoal.daysOfWeek.includes(day)) {
                  handleDaySelection(newGoal.daysOfWeek.filter(d => d !== day), setNewGoal);
                } else {
                  handleDaySelection([...newGoal.daysOfWeek, day], setNewGoal);
                }
              }}
            >
              {day.substring(0, 1)}
            </button>
          ))}
        </div>
        <p className="fieldset-label">Choisissez quand appliquer cet objectif</p>
      </fieldset>
    </div>

    <div className="form-control mb-6">
      <label className="label">
        <span className="label-text">Couleur</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            className={`w-8 h-8 rounded-full border-2 ${newGoal.color === color.hex ? 'border-primary' : 'border-transparent'}`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
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
        Annuler
      </button>
      <button
        type="submit"
        className="btn btn-secondary"
        disabled={loading || !newGoal.name || newGoal.dailyTime <= 0 || newGoal.daysOfWeek.length === 0}
      >
        {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Créer'}
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
  title="Modifier l'objectif"
>
  {currentGoal && (
    <form onSubmit={handleUpdateGoal}>
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Nom de l'objectif</span>
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
          <span className="label-text">Temps quotidien</span>
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
            <option value="minutes">Minutes</option>
            <option value="heures">Heures</option>
          </select>
        </div>
      </div>

      <div className="form-control mb-4">
        <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
          <legend className="fieldset-legend">Jours de la semaine</legend>
          <div className="flex flex-wrap gap-1 justify-center">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`btn btn-xs ${
                  currentGoal.daysOfWeek.includes(day) 
                    ? 'btn-primary' 
                    : 'bg-base-300 text-base-content opacity-60'
                }`}
                onClick={() => {
                  if (currentGoal.daysOfWeek.includes(day)) {
                    handleDaySelection(currentGoal.daysOfWeek.filter(d => d !== day), setCurrentGoal);
                  } else {
                    handleDaySelection([...currentGoal.daysOfWeek, day], setCurrentGoal);
                  }
                }}
              >
                {day.substring(0, 1)}
              </button>
            ))}
          </div>
          <p className="fieldset-label">Choisissez quand appliquer cet objectif</p>
        </fieldset>
      </div>

      <div className="form-control mb-6">
        <label className="label">
          <span className="label-text">Couleur</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.hex}
              type="button"
              className={`w-8 h-8 rounded-full border-2 ${currentGoal.color === color.hex ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
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
          Annuler
        </button>
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={loading || !currentGoal.name || currentGoal.dailyTime <= 0 || currentGoal.daysOfWeek.length === 0}
        >
          {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Enregistrer'}
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