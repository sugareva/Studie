// src/components/TodoList.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function TodoList({ currentDay = null, ignoreDate = false }) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [taskType, setTaskType] = useState('unique'); // 'unique' ou 'recurring'
  const [selectedTag, setSelectedTag] = useState(null); // null, 'normal', 'important', 'optional'
  const { user } = useAuth();
  const [todayDate, setTodayDate] = useState('');

  // Clés pour les jours au lieu des valeurs directes
  const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  // Les valeurs traduites sont obtenues à partir des clés
  const weekDays = WEEKDAY_KEYS.map(day => t(`todoList.days.${day}`));
  
  const tagOptions = [
    { value: 'normal', labelKey: 'todoList.tags.normal', color: 'info' },
    { value: 'important', labelKey: 'todoList.tags.important', color: 'error' },
    { value: 'optional', labelKey: 'todoList.tags.optional', color: 'warning' }
  ];

  // Déterminer le jour actuel au chargement du composant
  useEffect(() => {
    const date = new Date();
    const dayIndex = date.getDay() - 1; // 0 pour lundi, -1 pour dimanche (qui devient 6)
    const adjustedIndex = dayIndex < 0 ? 6 : dayIndex;
    setTodayDate(weekDays[adjustedIndex]);
  }, [weekDays]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, todayDate]); // Mise à jour basée sur le jour actuel

  // Utiliser localStorage pour stocker l'état de complétion des tâches récurrentes par jour
  const getCompletionKey = (taskId) => `task_${taskId}_${todayDate}`;

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Gérer l'état de complétion des tâches récurrentes
      const adjustedTasks = data.map(task => {
        if (task.type === 'recurring') {
          // Vérifier si la tâche a été complétée aujourd'hui via localStorage
          const completionKey = getCompletionKey(task.id);
          const isCompletedToday = localStorage.getItem(completionKey) === 'true';
          
          // Mettre à jour l'état de complétion pour l'affichage
          return { ...task, completed: isCompletedToday };
        }
        return task;
      });
      
      const sortedTasks = sortTasksByCompletion(adjustedTasks || []);
      setTasks(sortedTasks);
    } catch (error) {
      console.error(t('todoList.errors.tasksFetchError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortTasksByCompletion = (taskList) => {
    return [...taskList].sort((a, b) => {
      if (a.completed === b.completed) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return a.completed ? 1 : -1;
    });
  };

  const getFilteredTasks = () => {
    if (!tasks || tasks.length === 0) return [];
    
    if (ignoreDate || !currentDay) return tasks;
    
    const currentDayAbbr = currentDay.substring(0, 3);
    
    return tasks.filter(task => {
      if (task.type === 'unique') return true;
      
      return task.type === 'recurring' && 
             task.recurring_days && 
             task.recurring_days.includes(currentDayAbbr);
    });
  };

  const toggleDaySelection = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const resetForm = () => {
    setNewTask('');
    setSelectedDays([]);
    setTaskType('unique');
    setSelectedTag(null);
    setIsAddingTask(false);
  };

  const addTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.trim()) return;
    
    try {
      setIsLoading(true);
      
      const newTaskData = { 
        user_id: user.id, 
        content: newTask,
        completed: false,
        tag: selectedTag,
        type: taskType,
        recurring_days: taskType === 'recurring' ? selectedDays : null
      };
      
      const { error, data } = await supabase
        .from('tasks')
        .insert([newTaskData])
        .select();
        
      if (error) throw error;
      
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error(t('todoList.errors.taskAddError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = async (id, completed, isRecurring) => {
    try {
      // Pour les tâches récurrentes, on utilise localStorage pour suivre l'état par jour
      if (isRecurring) {
        const completionKey = getCompletionKey(id);
        const newCompletionState = !completed;
        
        // Mettre à jour localStorage
        localStorage.setItem(completionKey, newCompletionState.toString());
        
        // Mettre à jour l'état local sans toucher à la base de données
        const updatedTasks = tasks.map(task => 
          task.id === id ? { ...task, completed: newCompletionState } : task
        );
        
        setTasks(sortTasksByCompletion(updatedTasks));
      } else {
        // Pour les tâches uniques, on met à jour la base de données
        const { error } = await supabase
          .from('tasks')
          .update({ completed: !completed })
          .eq('id', id);
          
        if (error) throw error;
        
        const updatedTasks = tasks.map(task => 
          task.id === id ? { ...task, completed: !completed } : task
        );
        
        setTasks(sortTasksByCompletion(updatedTasks));
      }
    } catch (error) {
      console.error(t('todoList.errors.taskUpdateError'), error);
    }
  };

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Supprimer également les entrées de localStorage pour cette tâche
      weekDays.forEach(day => {
        localStorage.removeItem(`task_${id}_${day}`);
      });
      
      setTasks(tasks.filter(task => task.id !== id));
    } catch (error) {
      console.error(t('todoList.errors.taskDeleteError'), error);
    }
  };

  const toggleTag = (tag) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const getTagColor = (tag) => {
    const option = tagOptions.find(t => t.value === tag);
    return option ? option.color : null;
  };

  return (
    <div className="card w-full bg-base-100 shadow-xl flex flex-col max-h-screen">
      <div className="card-body flex flex-col h-full p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title text-lg">{t('todoList.headings.taskList')}</h2>
          {!isAddingTask && (
            <button 
              className="btn btn-sm btn-soft btn-secondary"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus size={16} />
              {t('todoList.buttons.add')}
            </button>
          )}
        </div>
        
        {/* Contenu avec hauteur dynamique et défilement si nécessaire */}
        <div className="flex flex-col overflow-hidden flex-grow">
          {isAddingTask && (
            <div className="rounded-lg p-4 mb-4 overflow-y-auto">
              <h3 className="font-medium text-base mb-3">{t('todoList.headings.addTask')}</h3>
              <form onSubmit={addTask} className="space-y-4">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder={t('todoList.placeholders.newTask')}
                  autoFocus
                />
                
                {/* Accordion pour les options avancées */}
                <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-lg">
                  <input type="checkbox" className="peer" /> 
                  <div className="collapse-title text-sm font-medium">
                    {t('todoList.headings.advancedOptions')}
                  </div>
                  <div className="collapse-content">
                    <div className="space-y-4 pt-2">
                      {/* Type de tâche */}
                      <div className="form-control">
                        <label className="cursor-pointer label">
                          <span className="label-text">{t('todoList.labels.recurringTask')}</span>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-primary toggle-sm" 
                            checked={taskType === 'recurring'} 
                            onChange={() => setTaskType(taskType === 'unique' ? 'recurring' : 'unique')}
                          />
                        </label>
                      </div>
                      
                      {/* Jours de la semaine pour tâches récurrentes */}
                      {taskType === 'recurring' && (
                        <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
                          <legend className="fieldset-legend">{t('todoList.labels.daysOfWeek')}</legend>
                          <div className="flex flex-wrap gap-1 justify-center">
                            {WEEKDAY_KEYS.map((dayKey, index) => (
                              <button
                                key={dayKey}
                                type="button"
                                className={`btn btn-xs ${
                                  selectedDays.includes(weekDays[index]) 
                                    ? 'btn-success' 
                                    : 'bg-base-300 text-base-content opacity-60'
                                }`}
                                onClick={() => toggleDaySelection(weekDays[index])}
                              >
                                {t(`todoList.days.${dayKey}Short`)}
                              </button>
                            ))}
                          </div>
                          <p className="fieldset-label">{t('todoList.help.chooseTodoDays')}</p>
                        </fieldset>
                      )}
                      
                      {/* Tags */}
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">{t('todoList.labels.optionalTag')}</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {tagOptions.map(tag => (
                            <button
                              key={tag.value}
                              type="button"
                              className={`btn btn-sm ${
                                selectedTag === tag.value 
                                  ? `btn-${tag.color}` 
                                  : `btn-outline btn-${tag.color}`
                              }`}
                              onClick={() => toggleTag(tag.value)}
                            >
                              {t(tag.labelKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Boutons d'action */}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={resetForm}
                  >
                    {t('todoList.buttons.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={isLoading || !newTask.trim()}
                  >
                    {t('todoList.buttons.add')}
                  </button>
                </div>
              </form>
              
              {/* Divider pour séparer la section d'ajout de la liste */}
              <div className="divider mt-6"></div>
            </div>
          )}
          
          {isLoading && !isAddingTask && (
            <div className="loading loading-spinner mx-auto my-4"></div>
          )}
          
          {/* Liste des tâches avec défilement indépendant */}
          <div className="overflow-y-auto flex-grow">
            <ul className="space-y-2 pr-1">
              {tasks.length === 0 ? (
                <li className="text-center text-gray-500 py-4">{t('todoList.emptyStates.noTasks')}</li>
              ) : getFilteredTasks().length === 0 ? (
                <li className="text-center text-gray-500 py-4">
                  {t('todoList.emptyStates.noTasksForDay', { day: currentDay })}
                </li>
              ) : (
                getFilteredTasks().map(task => (
                  <li 
                    key={task.id} 
                    className={`border border-base-300 rounded-lg shadow-sm p-3 bg-base-100 hover:shadow-md transition-all ${
                      task.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={task.completed}
                          onChange={() => toggleTask(task.id, task.completed, task.type === 'recurring')}
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={task.completed ? 'line-through text-gray-500' : 'font-medium'}>
                              {task.content}
                            </span>
                            {/* Badge selon le tag (seulement si un tag est présent) */}
                            {task.tag && (
                              <span className={`badge badge-sm ${
                                task.tag === 'important' 
                                  ? 'bg-error text-error-content' 
                                  : task.tag === 'optional' 
                                    ? 'bg-warning text-warning-content' 
                                    : 'bg-info text-info-content'
                              }`}>
                                {t(`todoList.tags.${task.tag}`)}
                              </span>
                            )}
                          </div>
                          
                          {/* Jours récurrents */}
                          {task.type === 'recurring' && (
                            <div className="flex gap-1 mt-1">
                              {WEEKDAY_KEYS.map((dayKey, index) => {
                                const dayValue = weekDays[index];
                                return (
                                  <span 
                                    key={dayKey} 
                                    className={`text-xs ${
                                      task.recurring_days.includes(dayValue) 
                                        ? task.tag === 'important'
                                          ? 'text-error font-bold'
                                          : task.tag === 'optional'
                                            ? 'text-warning font-bold'
                                            : task.tag === 'normal'
                                              ? 'text-info font-bold'
                                              : 'text-primary font-bold'
                                        : 'opacity-30'
                                    }`}
                                  >
                                    {t(`todoList.days.${dayKey}Short`)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        className="group"
                        onClick={() => deleteTask(task.id)}
                        aria-label={t('todoList.buttons.deleteAriaLabel')}
                      >
                        <Trash2 size={14} className="text-base-content group-hover:text-error transition-colors" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TodoList;