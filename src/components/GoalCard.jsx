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
      className={`card cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-primary text-primary-content shadow-md transform scale-102'
          : 'bg-base-100 hover:shadow-sm hover:bg-base-200'
      }`}
      onClick={() => onSelect(goal.id)}
    >
      <div className="card-body p-3">
        <div className="flex justify-between items-start">
          <h3 className={`font-medium text-lg ${isSelected ? 'text-primary-content' : ''}`}>
            {goal.title}
          </h3>
          {isSelected && <CheckCircle size={16} className="text-primary-content" />}
        </div>
        
        <div className="mt-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} />
            <span>{goal.minutes} min/jour</span>
          </div>
          
          <div className="flex items-center mt-2 gap-1">
            {orderedDays.map((day) => (
              <div 
                key={day} 
                title={day.charAt(0).toUpperCase() + day.slice(1)}
                className={`w-2 h-2 rounded-full ${
                  goal.days[day]
                    ? day === currentDay
                      ? isSelected ? 'bg-primary-content' : 'bg-primary'
                      : isSelected ? 'bg-primary-content/70' : 'bg-neutral-content'
                    : isSelected ? 'bg-primary-content/20' : 'bg-base-300'
                }`}
              />
            ))}
          </div>
          
          {showRemaining && isScheduledForToday && (
            <div className={`text-xs mt-2 ${isSelected ? 'text-primary-content/90' : 'opacity-75'}`}>
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
  );
};

export default GoalCard;