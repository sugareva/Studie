import React, { useState } from 'react';
import { Clock, Plus, Trash } from 'lucide-react';

const StudyGoalApp = ({ darkMode, goals = [], onGoalsUpdate }) => {
  const [newGoal, setNewGoal] = useState({
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

    const updatedGoals = [...goals, { ...newGoal, id: Date.now() }];
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

  return (
    <div className="space-y-6">
      {/* Carte pour l'ajout d'un objectif */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Définir un Nouvel Objectif</h2>
          
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
              <span className="label-text">Durée (minutes par jour)</span>
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="5"
                value={newGoal.minutes}
                onChange={(e) => setNewGoal({ ...newGoal, minutes: parseInt(e.target.value) || 0 })}
                className="input input-bordered w-full"
              />
              <Clock size={20} className="ml-2" />
            </div>
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
              {calculateWeeklyHours(newGoal)} heures
            </div>
            <div className="text-sm opacity-60 mt-1">
              ({Object.values(newGoal.days).filter(d => d).length} jours × {newGoal.minutes} min)
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
      
      {/* Liste des objectifs */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">Mes Objectifs d'Étude</h2>
          
          {goals.length === 0 ? (
            <div className="alert alert-info alert-soft">
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
                          {goal.minutes} minutes par jour • {calculateWeeklyHours(goal)} heures par semaine
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
  );
};

export default StudyGoalApp;