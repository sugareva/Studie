import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

const GoalCard = ({ goal, isSelected, onSelect, remainingTime, showRemaining = true }) => {
  // Calculer le total d'heures par semaine
  const calculateWeeklyHours = () => {
    const activeDays = Object.values(goal.days).filter(day => day).length;
    return ((goal.minutes * activeDays) / 60).toFixed(1);
  };

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

  return (
    <div 
      className={`card cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-primary text-primary-content shadow-xl transform scale-105' 
          : 'bg-base-100 hover:shadow-md hover:bg-base-200'
      }`}
      onClick={() => onSelect(goal.id)}
    >
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <h3 className={`font-medium text-lg ${isSelected ? 'text-primary-content' : ''}`}>
            {goal.title}
          </h3>
          {isSelected && <CheckCircle size={18} className="text-primary-content" />}
        </div>
        
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={16} />
            <span>{goal.minutes} min/jour • {calculateWeeklyHours()} heures/semaine</span>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(goal.days).map(([day, selected]) => (
              selected && (
                <span 
                  key={day} 
                  className={`badge badge-sm ${
                    day === getCurrentDay() 
                      ? isSelected ? 'bg-primary-content text-primary' : 'badge-primary' 
                      : isSelected ? 'bg-primary-content/70 text-primary' : 'badge-ghost'
                  }`}
                >
                  {day.substring(0, 3)}
                </span>
              )
            ))}
          </div>
          
          {showRemaining && isScheduledForToday && (
            <div className={`text-sm mt-2 ${isSelected ? 'text-primary-content/90' : 'opacity-75'}`}>
              {remainingTime > 0 ? (
                <span>Reste: {formatTime(remainingTime)}</span>
              ) : (
                <span className="font-medium">Objectif atteint ✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalCard;