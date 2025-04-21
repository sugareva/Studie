// src/components/CalendarView.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, addDays } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import { convertToStoredFormat } from '../utils/dayMapping';

const CalendarView = ({ goals = [], onDateSelect, selectedDate = new Date() }) => {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [goalsByDay, setGoalsByDay] = useState({});

  // Obtenir la locale en fonction de la langue actuelle
  const getLocale = () => i18n.language === 'fr' ? fr : enGB;

  // Prévoir les objectifs par jour
  useEffect(() => {
    if (!goals || goals.length === 0) {
      setGoalsByDay({});
      return;
    }

    // Créer un mapping des jours de la semaine aux objectifs
    const mapping = {};
    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    // Pour chaque jour de la semaine
    dayNames.forEach(day => {
      // Trouver tous les objectifs qui ont ce jour dans leur days_of_week
      const goalsForDay = goals.filter(goal => 
        goal.days_of_week && goal.days_of_week.includes(day)
      );
      
      // Si des objectifs existent pour ce jour, les stocker
      if (goalsForDay.length > 0) {
        mapping[day] = goalsForDay;
      }
    });
    
    setGoalsByDay(mapping);
  }, [goals]);

  // Navigation du calendrier
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Obtenir le nom du jour de la semaine à partir d'une date
  const getDayName = (date) => {
    const locale = getLocale();
    const day = format(date, 'EEEE', { locale });
    // Capitaliser la première lettre
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Obtenir les objectifs pour un jour donné
  const getGoalsForDay = (date) => {
    const dayName = getDayName(date);
    const storedFormat = convertToStoredFormat(dayName, i18n.language);
    return goalsByDay[storedFormat] || [];
  };

  // Rendu des en-têtes des jours de la semaine
  const renderDaysOfWeek = () => {
    const locale = getLocale();
    const dateFormat = 'EEEEE'; // Format court (première lettre)
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Semaine commence le lundi

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      days.push(
        <div key={i} className="text-center text-xs font-medium">
          {format(day, dateFormat, { locale }).toUpperCase()}
        </div>
      );
    }

    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  // Rendu des cellules du calendrier
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const goalsForDay = getGoalsForDay(day);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);

        days.push(
          <div 
            key={day.toString()} 
            className={`
              p-1 relative min-h-[35px] flex flex-col items-center justify-start cursor-pointer
              ${!isCurrentMonth ? 'text-gray-400' : ''}
              ${isToday ? 'font-bold ring-2 ring-primary ring-opacity-50 rounded-lg' : ''}
              ${isSelected ? 'bg-primary bg-opacity-20 rounded-lg' : ''}
              hover:bg-base-300 rounded-lg transition-colors
            `}
            onClick={() => onDateSelect(cloneDay)}
          >
            <span className="text-xs mt-1">{format(day, 'd')}</span>
            {goalsForDay.length > 0 && (
              <div className="flex gap-0.5 mt-auto mb-1">
                {/* Afficher jusqu'à 3 points de couleur pour les objectifs */}
                {goalsForDay.slice(0, 3).map((goal, idx) => (
                  <div 
                    key={idx} 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: goal.color || '#0081a7' }}
                    title={goal.name}
                  />
                ))}
                {/* Indicateur s'il y a plus d'objectifs */}
                {goalsForDay.length > 3 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" title={`+${goalsForDay.length - 3} more`} />
                )}
              </div>
            )}
          </div>
        );
        
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }
    
    return <div className="space-y-1">{rows}</div>;
  };

  // Rendu du composant
  return (
    <div className="calendar max-w-full">
      {/* En-tête avec navigation du mois */}
      <div className="flex justify-between items-center mb-2">
        <button 
          className="btn btn-xs btn-ghost btn-circle"
          onClick={prevMonth}
          aria-label={t('calendar.previousMonth')}
        >
          <ChevronLeft size={14} />
        </button>
        
        <h2 className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy', { locale: getLocale() })}
        </h2>
        
        <button 
          className="btn btn-xs btn-ghost btn-circle"
          onClick={nextMonth}
          aria-label={t('calendar.nextMonth')}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      
      {/* Jours de la semaine */}
      {renderDaysOfWeek()}
      
      {/* Cellules du calendrier */}
      {renderCells()}
      
      {/* Légende des objectifs - version compacte */}
      {goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-base-300">
          <div className="flex flex-wrap gap-1">
            {goals.slice(0, 3).map(goal => (
              <div key={goal.id} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: goal.color || '#0081a7' }}
                />
                <span className="truncate max-w-[80px]">{goal.name}</span>
              </div>
            ))}
            {goals.length > 3 && (
              <span className="text-xs text-gray-500">+{goals.length - 3}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;