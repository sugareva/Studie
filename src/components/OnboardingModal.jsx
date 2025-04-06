// src/components/OnboardingModal.jsx
import { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Check, User, Target, Clock, ListTodo, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Liste des avatars prédéfinis (même liste que dans UserOptionsModal)
const avatars = [
  '/avatars/avatar1.png',
  '/avatars/avatar2.png',
  '/avatars/avatar3.png',
  '/avatars/avatar4.png',
  '/avatars/avatar5.png',
  '/avatars/avatar6.png',
  '/avatars/avatar7.png',
  '/avatars/avatar8.png'
];

// Couleurs disponibles pour les objectifs (identiques à GoalSetting)
const COLORS = [
  { name: 'Rouge corail', hex: '#f07167' },
  { name: 'Pêche', hex: '#fed9b7' },
  { name: 'Jaune pâle', hex: '#fdfcdc' },
  { name: 'Turquoise', hex: '#00afb9' },
  { name: 'Bleu océan', hex: '#0081a7' }
];

// Constantes pour les jours
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const WEEKEND = ['Samedi', 'Dimanche'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Constantes pour les tags de tâches
const tagOptions = [
  { value: 'normal', label: 'Normal', color: 'secondary' },
  { value: 'important', label: 'Important', color: 'accent' },
  { value: 'optional', label: 'Facultatif', color: 'primary' }
];

function OnboardingModal({ isOpen, onClose, user, onComplete }) {
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(4);
  
  // Étape 1: Profil utilisateur
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]);
  const [showTodoList, setShowTodoList] = useState(true);
  
  // Étape 2: Création d'objectif (en alignement avec GoalSetting)
  const [goalName, setGoalName] = useState('');
  const [goalColor, setGoalColor] = useState(COLORS[0].hex);
  const [selectedDays, setSelectedDays] = useState([...WEEKDAYS]); // Jours ouvrés par défaut
  const [dailyTime, setDailyTime] = useState(60); // 1 heure par défaut
  const [timeUnit, setTimeUnit] = useState('minutes');
  const [daysSelectionMode, setDaysSelectionMode] = useState('weekdays'); // 'all', 'weekdays', 'weekend', 'custom'
  
  // Étape 4: Todo
  const [todoText, setTodoText] = useState('');
  const [todoDays, setTodoDays] = useState([DAYS_SHORT[0]]);
  const [todoType, setTodoType] = useState('unique'); // 'unique' ou 'recurring'
  const [todoTag, setTodoTag] = useState(null); // null, 'normal', 'important', 'optional'
  
  // Gestion des erreurs
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Réinitialiser l'erreur lors du changement d'étape
  useEffect(() => {
    setError(null);
  }, [step]);
  
  // Naviguer à l'étape suivante
  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };
  
  // Naviguer à l'étape précédente
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // Valider l'étape 1 (profil utilisateur)
  const validateStep1 = () => {
    if (!nickname.trim()) {
      setError('Veuillez choisir un pseudo');
      return false;
    }
    return true;
  };
  
  // Valider l'étape 2 (création d'objectif)
  const validateStep2 = () => {
    if (!goalName.trim()) {
      setError('Veuillez donner un nom à votre objectif');
      return false;
    }
    if (selectedDays.length === 0) {
      setError('Veuillez sélectionner au moins un jour de la semaine');
      return false;
    }
    return true;
  };
  
  // Sélectionner un avatar
  const handleAvatarSelect = (avatarUrl) => {
    setAvatar(avatarUrl);
  };
  
  // Gérer la sélection/déselection des jours de la semaine pour les objectifs
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    setDaysSelectionMode('custom');
  };
  
  // Fonction pour gérer la sélection groupée des jours (comme dans GoalSetting)
  const handleDaySelection = (days, mode = 'custom') => {
    setSelectedDays(days);
    setDaysSelectionMode(mode);
  };
  
  // Gérer la sélection/déselection des jours de la semaine pour les todos
  const toggleTodoDay = (day) => {
    if (todoDays.includes(day)) {
      setTodoDays(todoDays.filter(d => d !== day));
    } else {
      setTodoDays([...todoDays, day]);
    }
  };
  
  // Toggle pour le tag de la todo
  const toggleTodoTag = (tag) => {
    if (todoTag === tag) {
      setTodoTag(null);
    } else {
      setTodoTag(tag);
    }
  };
  
  // Terminer le processus d'onboarding et sauvegarder les données
  const completeOnboarding = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. Vérifier si des paramètres utilisateur existent déjà
      const { data: existingSettings, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      
      // Définir les paramètres utilisateur
      const userSettings = {
        user_id: user.id,
        nickname,
        avatar,
        show_todo_list: showTodoList,
        onboarding_completed: true
      };
      
      let settingsError;
      
      // Insérer ou mettre à jour selon que des paramètres existent ou non
      if (existingSettings) {
        // Mise à jour des paramètres existants
        const { error } = await supabase
          .from('user_settings')
          .update(userSettings)
          .eq('user_id', user.id);
          
        settingsError = error;
      } else {
        // Insertion de nouveaux paramètres
        const { error } = await supabase
          .from('user_settings')
          .insert(userSettings);
          
        settingsError = error;
      }
      
      if (settingsError) throw settingsError;
      
      // 2. Créer l'objectif (en alignement avec GoalSetting)
      const durationInSeconds = timeUnit === 'minutes' 
        ? dailyTime * 60 
        : dailyTime * 3600;
        
      const goal = {
        user_id: user.id,
        name: goalName,
        color: goalColor,
        days_of_week: selectedDays,
        duration: durationInSeconds,
        time_unit: timeUnit,
        completed_duration: 0,
        created_at: new Date().toISOString()
      };
      
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert(goal)
        .select()
        .single();
      
      if (goalError) throw goalError;
      
      // 3. Créer la todo si elle existe
      if (todoText.trim()) {
        const todo = {
          user_id: user.id,
          content: todoText,
          completed: false,
          tag: todoTag,
          type: todoType,
          recurring_days: todoType === 'recurring' ? todoDays : null,
          created_at: new Date().toISOString()
        };
        
        const { error: todoError } = await supabase
          .from('tasks')
          .insert(todo);
        
        if (todoError) throw todoError;
      }
      
      // Appeler le callback de réussite
      if (onComplete) {
        onComplete(userSettings);
      }
      
      // Fermer le modal
      onClose();
      
    } catch (err) {
      console.error('Erreur lors de la création du profil:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Ignorer l'onboarding
// Ignorer l'onboarding - Version corrigée
const skipOnboarding = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Vérifier si des paramètres utilisateur existent déjà
      const { data: existingSettings, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      
      let skipError;
      
      // Insérer ou mettre à jour selon que des paramètres existent ou non
      if (existingSettings) {
        // Mise à jour des paramètres existants
        const { error } = await supabase
          .from('user_settings')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id);
          
        skipError = error;
      } else {
        // Insertion de nouveaux paramètres
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            onboarding_completed: true
          });
          
        skipError = error;
      }
      
      if (skipError) throw skipError;
      
      // Fermer le modal
      onClose();
      
    } catch (err) {
      console.error('Erreur lors de l\'ignore de l\'onboarding:', err);
      setError('Une erreur est survenue lors de l\'ignoration de l\'onboarding.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-xl">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">
              {step === 1 && 'Bienvenue sur Studie!'}
              {step === 2 && 'Créons votre premier objectif'}
              {step === 3 && 'Utiliser le timer'}
              {step === 4 && 'La to-do list'}
          </h3>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => {
              if (window.confirm('Êtes-vous sûr de vouloir passer les explications ?')) {
                skipOnboarding();
              }
            }}
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Message d'erreur */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        
        {/* Contenu de l'étape */}
        <div className="p-4 py-2">
          {/* Étape 1: Profil utilisateur */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User size={20} />
                <h4 className="font-semibold">Personnalisez votre profil</h4>
              </div>
              
              <p className="text-base-content text-opacity-70 mb-6">
                Pour commencer, choisissez un pseudo et un avatar. Cela vous permettra de vous sentir un peu plus chez vous ! 
              </p>
              
              <div className="form-control mb-4">
                <label className="input w-full">
                  <User size={20} />
                  <input 
                    type="text" 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    placeholder="Votre pseudo"
                  />
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Choisir un avatar</span>
                </label>
                
                {/* Navigation avec flèches et prévisualisation */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  <button 
                    className="btn btn-circle btn-sm" 
                    onClick={() => {
                      const currentIndex = avatars.indexOf(avatar);
                      const prevIndex = currentIndex <= 0 ? avatars.length - 1 : currentIndex - 1;
                      handleAvatarSelect(avatars[prevIndex]);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="avatar">
                    <div className="w-20 h-20 rounded-full">
                      <img src={avatar || avatars[0]} alt="Avatar sélectionné" />
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-circle btn-sm" 
                    onClick={() => {
                      const currentIndex = avatars.indexOf(avatar);
                      const nextIndex = currentIndex >= avatars.length - 1 ? 0 : currentIndex + 1;
                      handleAvatarSelect(avatars[nextIndex]);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                {/* Puces indicatrices */}
                <div className="flex justify-center mt-3 gap-1">
                  {avatars.map((avatarUrl, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${avatar === avatarUrl ? 'bg-secondary' : 'bg-base-300'}`}
                      onClick={() => handleAvatarSelect(avatarUrl)}
                      aria-label={`Sélectionner avatar ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Étape 2: Création d'objectif */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target size={20} />
                <h4 className="font-semibold">Objectif d'étude</h4>
              </div>
              
              <p className="text-sm text-opacity-70 mb-6">
                Votre objectif apparaitra dans votre tableau de bord selon les jours que vous aurez définis et vous pourrez suivre le temps passé dessus.
              </p>
              
              <div className="form-control mb-4">
                <label className="input w-full">
                  <span className="opacity-50">Nom</span>
                  <input 
                    type="text" 
                    value={goalName} 
                    onChange={(e) => setGoalName(e.target.value)} 
                    placeholder="Ex: Mathématiques, Anglais, etc."
                  />
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Couleur de l'objectif</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      className={`w-8 h-8 rounded-full cursor-pointer border-2 ${goalColor === color.hex ? 'border-secondary' : 'border-transparent'}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      onClick={() => setGoalColor(color.hex)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Jours concernés</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    className={`btn btn-sm ${daysSelectionMode === 'all' ? 'btn-info' : 'btn-outline'}`}
                    onClick={() => handleDaySelection([...DAYS], 'all')}
                  >
                    Tous les jours
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${daysSelectionMode === 'weekdays' ? 'btn-info' : 'btn-outline'}`}
                    onClick={() => handleDaySelection([...WEEKDAYS], 'weekdays')}
                  >
                    Jours ouvrés
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${daysSelectionMode === 'weekend' ? 'btn-info' : 'btn-outline'}`}
                    onClick={() => handleDaySelection([...WEEKEND], 'weekend')}
                  >
                    Week-end
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${daysSelectionMode === 'custom' ? 'btn-info' : 'btn-outline'}`}
                    onClick={() => setDaysSelectionMode('custom')}
                  >
                    Personnalisé
                  </button>
                </div>
                
                {daysSelectionMode === 'custom' && (
                  <div className="grid grid-cols-7 gap-1">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`btn btn-xs ${selectedDays.includes(day) ? 'btn-info' : 'btn-outline'}`}
                        onClick={() => toggleDay(day)}
                      >
                        {day.substring(0, 2)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Objectif de temps</span>
                </label>
                <div className="join w-full">
                  <div className="grow">
                    <input 
                      type="number" 
                      className="input input-bordered w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={dailyTime}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setDailyTime(value);
                      }}
                      min="1"
                      required
                    />
                  </div>
                  <select 
                    className="select select-bordered" 
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="heures">Heures</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Étape 3: Timer */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} />
                <h4 className="font-semibold">Comment ça marche ?</h4>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 items-start">
                  <div className=" bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Sélectionnez un objectif</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      Cliquez sur un objectif que vous avez créé dans la liste pour le sélectionner.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Démarrez le timer</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      Cliquez sur le bouton Play pour commencer à chronométrer votre session. Vous pouvez activer le mode Pomodoro ou passer en "Focus mode" pour éviter les distractions.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Progression</p>
                    <p className="text-sm text-base-content text-opacity-70">
                     Lorsque vous arrêtez le timer, le temps restant pour compléter votre objectif est mis à jour ! 
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Statistiques</p>
                    <p className="text-sm text-base-content text-opacity-70">
                    L'onglet "Activité" vous permet de suivre le temps passé sur vos différents objectifs, et de supprimer les temps rentrés par erreur.

                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Étape 4: Todo */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListTodo size={20} />
                <h4 className="font-semibold">Ajoutez votre première tâche</h4>
              </div>
              
              <p className="text-base-content text-opacity-70 mb-6">
                La todo list vous permet de renseigner une petite tâche, en parallèle ou en supplément de vos objectifs.
              </p>
              
              <div className="form-control mb-4">
                <span className="opacity-50">Titre de la tâche</span>
                <label className="input w-full">
                  <input 
                    type="text" 
                    value={todoText} 
                    onChange={(e) => setTodoText(e.target.value)} 
                    placeholder="Ex: Résoudre les exercices du chapitre 3"
                  />
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label className="cursor-pointer label">
                  <span className="label-text">Tâche récurrente</span>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary toggle-sm" 
                    checked={todoType === 'recurring'} 
                    onChange={() => setTodoType(todoType === 'unique' ? 'recurring' : 'unique')}
                  />
                </label>
              </div>
              
              {todoType === 'recurring' && (
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Choisissez quel jour afficher la tâche</span>
                  </label>
                  <div className="bg-base-200 rounded-lg p-2 border border-base-300 mb-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {DAYS_SHORT.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`btn btn-xs ${
                            todoDays.includes(day) 
                              ? 'btn-info' 
                              : 'bg-base-300 text-base-content opacity-60'
                          }`}
                          onClick={() => toggleTodoDay(day)}
                        >
                          {day.substring(0, 1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              

            </div>
          )}
        </div>
        
        {/* Boutons de navigation */}
        <div className="mt-6 space-y-4">
          {/* Indicateur de progression */}
          
          
          <div className="flex justify-between items-center">
            {step > 1 ? (
              <button 
                className="btn btn-outline flex items-center gap-2"
                onClick={prevStep}
                disabled={loading}
              >
                <ArrowLeft size={16} />
                Précédent
              </button>
            ) : (
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  if (window.confirm('Êtes-vous sûr de vouloir passer les explications ?')) {
                    skipOnboarding();
                  }
                }}
                disabled={loading}
              >
                Ignorer
              </button>
            )}
            <div className="w-56 bg-base-200 h-2 rounded-full">
            <div 
              className="bg-primary h-2 rounded-full transition-all" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
            <button 
              className="btn btn-neutral flex items-center gap-2"
              onClick={nextStep}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Chargement...
                </>
              ) : step === totalSteps ? (
              <>
                Terminer
                <Check size={16} />
              </>
            ) : (
              <>
                Suivant
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

export default OnboardingModal;