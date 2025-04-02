import React, { useState } from 'react';
import { Clock, Plus, Trash, ChevronUp, ChevronDown } from 'lucide-react';

const StudyGoalApp = ({ darkMode, goals = [], onGoalsUpdate }) => {
  const [newGoal, setNewGoal] = useState({
    title: '',
    user_id: user.id.toString(),
    minutes: 30,
    days: {
      lundi: false,
      mardi: false,
      mercredi: false,
      jeudi: false,
      vendredi: false,
      samedi: false,
      dimanche: false
    }
  });
  const [timeUnit, setTimeUnit] = useState('minutes'); // 'minutes' ou 'heures'

  // Calculer le total d'heures par semaine
  const calculateWeeklyHours = (goal) => {
    const activeDays = Object.values(goal.days).filter(day => day).length;
    return ((goal.minutes * activeDays) / 60).toFixed(1);
  };

  // Ajouter un nouvel objectif
  const handleAddGoal = () => {
    // Vérifier si au moins un jour est sélectionné
    const hasDaySelected = Object.values(newGoal.days).some(day => day);
    
    if (newGoal.title.trim() === '') {
      alert('Veuillez donner un titre à votre objectif');
      return;
    }
    
    if (!hasDaySelected) {
      alert('Veuillez sélectionner au moins un jour de la semaine');
      return;
    }
    

    // Convertir les heures en minutes si nécessaire
    const minutes = timeUnit === 'heures' ? Math.round(newGoal.minutes * 60) : newGoal.minutes;
    
    const updatedGoals = [...goals, { ...newGoal, minutes, id: Date.now() }];
    onGoalsUpdate(updatedGoals);
    
    // Réinitialiser le formulaire
    setNewGoal({
      title: '',
      minutes: 30,
      days: {
        lundi: false,
        mardi: false,
        mercredi: false,
        jeudi: false,
        vendredi: false,
        samedi: false,
        dimanche: false
      }
    });
    setTimeUnit('minutes');
  };

  // Gérer le changement de durée
  const handleDurationChange = (value) => {
    // S'assurer que la valeur est un nombre et non vide
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Limiter les valeurs minimales selon l'unité
    const minValue = timeUnit === 'minutes' ? 5 : 0.1;
    
    // Mettre à jour l'état
    setNewGoal({ ...newGoal, minutes: Math.max(numValue, 0) });
  };

  // Supprimer un objectif
  const handleDeleteGoal = (id) => {
    const updatedGoals = goals.filter(goal => goal.id !== id);
    onGoalsUpdate(updatedGoals);
  };

  // Sélectionner tous les jours
  const selectAllDays = () => {
    setNewGoal({
      ...newGoal,
      days: {
        lundi: true,
        mardi: true,
        mercredi: true,
        jeudi: true,
        vendredi: true,
        samedi: true,
        dimanche: true
      }
    });
  };

  // Jours ouvrables uniquement
  const selectWeekdays = () => {
    setNewGoal({
      ...newGoal,
      days: {
        lundi: true,
        mardi: true,
        mercredi: true,
        jeudi: true,
        vendredi: true,
        samedi: false,
        dimanche: false
      }
    });
  };

  // Formatter la durée d'affichage pour les objectifs existants
  const formatDuration = (minutes) => {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60} heures`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    } else {
      return `${minutes} minutes`;
    }
  };

  const [newGoalOpen, setNewGoalOpen] = useState(true);
  const [goalsListOpen, setGoalsListOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Accordion pour l'ajout d'un objectif */}
      <div className="collapse collapse-plus bg-base-200 shadow-xl rounded-box">
        <input 
          type="checkbox" 
          checked={newGoalOpen} 
          onChange={() => setNewGoalOpen(!newGoalOpen)}
          className="collapse-toggle"
        />
        <div className="collapse-title text-xl font-medium flex items-center">
          Définir un Nouvel Objectif
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Titre de l'objectif</span>
              </label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Ex: Mathématiques"
              />
            </div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Durée par jour</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min={timeUnit === 'minutes' ? '5' : '0.1'}
                    step={timeUnit === 'minutes' ? '5' : '0.1'}
                    value={newGoal.minutes}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="input input-bordered w-full"
                  />
                </div>
                <select
                  className="select select-bordered"
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                >
                  <option value="minutes">minutes</option>
                  <option value="heures">heures</option>
                </select>
                <Clock size={20} className="ml-2" />
              </div>
              <label className="label">
                <span className="label-text-alt">
                  {timeUnit === 'heures' ? `${(newGoal.minutes * 60).toFixed(0)} minutes` : `${(newGoal.minutes / 60).toFixed(1)} heures`}
                </span>
              </label>
            </div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Jours de la semaine</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button 
                  onClick={selectAllDays}
                  className="btn btn-sm btn-primary"
                >
                  Tous les jours
                </button>
                <button 
                  onClick={selectWeekdays}
                  className="btn btn-sm btn-secondary"
                >
                  Jours ouvrables
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {Object.entries(newGoal.days).map(([day, selected]) => (
                  <div 
                    key={day}
                    onClick={() => setNewGoal({
                      ...newGoal,
                      days: { ...newGoal.days, [day]: !selected }
                    })}
                    className={`cursor-pointer p-2 rounded-md text-center capitalize transition ${
                      selected 
                        ? 'bg-primary text-primary-content' 
                        : 'bg-base-300 text-base-content'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-2">
              <div className="badge badge-lg">
                <span className="font-semibold">Total hebdomadaire : </span>
                {timeUnit === 'heures' 
                  ? (newGoal.minutes * Object.values(newGoal.days).filter(d => d).length).toFixed(1)
                  : calculateWeeklyHours(newGoal)} heures
              </div>
              <div className="text-sm opacity-60 mt-1">
                ({Object.values(newGoal.days).filter(d => d).length} jours × {
                  timeUnit === 'heures' 
                    ? `${newGoal.minutes} h`
                    : `${newGoal.minutes} min`
                })
              </div>
            </div>
            
            <div className="card-actions justify-end mt-4">
              <button
                onClick={handleAddGoal}
                className="btn btn-primary w-full"
              >
                <Plus size={18} className="mr-1" />
                Ajouter cet objectif
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Accordion pour la liste des objectifs */}
      <div className="collapse collapse-plus bg-base-200 shadow-xl rounded-box">
        <input 
          type="checkbox" 
          checked={goalsListOpen} 
          onChange={() => setGoalsListOpen(!goalsListOpen)}
          className="collapse-toggle"
        />
        <div className="collapse-title text-xl font-medium flex items-center">
          Mes Objectifs d'Étude
          {goals.length > 0 && (
            <span className="badge badge-sm ml-2">{goals.length}</span>
          )}
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            {goals.length === 0 ? (
              <div className="alert alert-info">
                <div>
                  <span>Aucun objectif défini pour le moment</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map(goal => (
                  <div key={goal.id} className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{goal.title}</h3>
                          <p className="opacity-70">
                            {formatDuration(goal.minutes)} par jour • {calculateWeeklyHours(goal)} heures par semaine
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(goal.days).map(([day, selected]) => (
                              selected && (
                                <span 
                                  key={day} 
                                  className="badge badge-sm"
                                >
                                  {day.substring(0, 3)}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="btn btn-sm btn-circle btn-ghost text-error"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyGoalApp;