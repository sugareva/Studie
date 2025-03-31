import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const GoalCard = ({ goal, isSelected, onSelect, remainingTime, showRemaining = true }) => {
  // Convertir les secondes en format lisible
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} minutes`;
    }
  };

  // Obtenir le jour actuel
  const getCurrentDay = () => {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[new Date().getDay()];
  };

  // Vérifier si l'objectif est prévu pour aujourd'hui
  const isScheduledForToday = goal.days[getCurrentDay()];
  const currentDay = getCurrentDay();

  // Ordre des jours pour affichage (commence par lundi)
  const orderedDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  return (
    <div 
    className={`card card-compact card-bordered cursor-pointer transition-all duration-200 ${
      isSelected 
        ? 'bg-primary text-primary-content border-primary shadow-md' 
        : 'bg-base-100 border-base-200 hover:shadow-sm hover:bg-base-200'
    }`} 
    onClick={() => onSelect(goal.id)}
  >
    <div 
  className={`card card-compact card-bordered cursor-pointer transition-all duration-200 ${
    isSelected 
      ? 'bg-primary text-primary-content border-primary shadow-md' 
      : 'bg-base-100 border-base-200 hover:shadow-sm hover:bg-base-200'
  }`} 
  onClick={() => onSelect(goal.id)}
>
  <div className="card-body p-3">
    <div className="flex justify-between items-start">
      <h3 className={`card-title text-sm ${isSelected ? 'text-primary-content' : ''}`}>
        {goal.title}
      </h3>
      {isSelected && <CheckCircle size={16} className="text-primary-content" />}
    </div>
    
    <div className="mt-1">
      <div className="flex items-center gap-1 text-xs">
        <Clock size={14} />
        <span>{goal.minutes} min/jour</span>
      </div>
      
      
      
      {showRemaining && isScheduledForToday && (
        <div className={` badge text-xs mt-2 ${isSelected ? 'text-primary-content/90' : 'opacity-75'}`}>
          {remainingTime > 0 ? (
            <span>Reste: {formatTime(remainingTime)}</span>
          ) : (
            <span className="font-medium">✓ Objectif atteint</span>
          )}
        </div>
      )}
    </div>
  </div>
</div>
  </div>
  );
};

export default GoalCard;