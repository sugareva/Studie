// src/components/OnboardingModal.jsx
import { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Check, User, Target, Clock, ListTodo, Mail, Globe, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

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
  { nameKey: 'colors.coralRed', hex: '#f07167' },
  { nameKey: 'colors.peach', hex: '#fed9b7' },
  { nameKey: 'colors.paleYellow', hex: '#fdfcdc' },
  { nameKey: 'colors.turquoise', hex: '#00afb9' },
  { nameKey: 'colors.oceanBlue', hex: '#0081a7' }
];

// Les clés pour les jours au lieu des valeurs directes
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_KEYS = ['saturday', 'sunday'];
const DAY_SHORT_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Constantes pour les tags de tâches
const tagOptions = [
  { value: 'normal', labelKey: 'todoList.tags.normal', color: 'secondary' },
  { value: 'important', labelKey: 'todoList.tags.important', color: 'accent' },
  { value: 'optional', labelKey: 'todoList.tags.optional', color: 'primary' }
];



function OnboardingModal({ isOpen, onClose, user, onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(5);
  const [targetLanguage, setTargetLanguage] = useState('french');
  const [learningLanguage, setLearningLanguage] = useState(false);

  const availableLanguages = [
    { id: 'french', name: t('roadmap.language.french') },
    { id: 'english', name: t('roadmap.language.english') },
    { id: 'german', name: t('roadmap.language.german') },
    { id: 'italian', name: t('roadmap.language.italian') },
    { id: 'spanish', name: t('roadmap.language.spanish') },
    { id: 'japanese', name: t('roadmap.language.japanese') },
    { id: 'korean', name: t('roadmap.language.korean') },
    { id: 'russian', name: t('roadmap.language.russian') }
  ];

  
  // Transformer les clés de jours en noms de jours traduits
  const DAYS = DAY_KEYS.map(day => t(`days.${day}`));
  const WEEKDAYS = WEEKDAY_KEYS.map(day => t(`days.${day}`));
  const WEEKEND = WEEKEND_KEYS.map(day => t(`days.${day}`));
  const DAYS_SHORT = DAY_SHORT_KEYS.map(day => t(`todoList.days.${day}`));
  
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
      setError(t('onboarding.errors.nicknameRequired'));
      return false;
    }
    return true;
  };
  
  // Valider l'étape 2 (création d'objectif)
  const validateStep2 = () => {
    if (!goalName.trim()) {
      setError(t('onboarding.errors.goalNameRequired'));
      return false;
    }
    if (selectedDays.length === 0) {
      setError(t('onboarding.errors.daySelectionRequired'));
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
        learning_language: learningLanguage,
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

      if (learningLanguage) {
        const languageProgress = {
          user_id: user.id,
          target_language: targetLanguage,
          completed_skills: []
        };
      
        const { error: langError } = await supabase
          .from('language_progress')
          .insert(languageProgress);
      
        if (langError) throw langError;
      }
      
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
      console.error(t('onboarding.errors.profileCreationError'), err);
      setError(t('onboarding.errors.genericError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Ignorer l'onboarding
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
      console.error(t('onboarding.errors.skipError'), err);
      setError(t('onboarding.errors.skipErrorMessage'));
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
          {step === 1 && t('onboarding.headings.welcome')}
  {step === 2 && t('onboarding.headings.firstGoal')}
  {step === 3 && t('onboarding.headings.targetLanguage')} {/* Nouvelle étape */}
  {step === 4 && t('onboarding.headings.useTimer')}
  {step === 5 && t('onboarding.headings.todoList')}
          </h3>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => {
              if (window.confirm(t('onboarding.confirmations.skipTutorial'))) {
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
                <h4 className="font-semibold">{t('onboarding.steps.profile.title')}</h4>
              </div>
              
              <p className="text-base-content text-opacity-70 mb-6">
                {t('onboarding.steps.profile.description')}
              </p>
              
              <div className="form-control mb-4">
                <label className="input w-full">
                  <User size={20} />
                  <input 
                    type="text" 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)} 
                    placeholder={t('onboarding.steps.profile.nicknamePlaceholder')}
                  />
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">{t('onboarding.steps.profile.chooseAvatar')}</span>
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
                    aria-label={t('onboarding.buttons.previousAvatar')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="avatar">
                    <div className="w-20 h-20 rounded-full">
                      <img src={avatar || avatars[0]} alt={t('onboarding.steps.profile.selectedAvatarAlt')} />
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-circle btn-sm" 
                    onClick={() => {
                      const currentIndex = avatars.indexOf(avatar);
                      const nextIndex = currentIndex >= avatars.length - 1 ? 0 : currentIndex + 1;
                      handleAvatarSelect(avatars[nextIndex]);
                    }}
                    aria-label={t('onboarding.buttons.nextAvatar')}
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
                      aria-label={t('onboarding.buttons.selectAvatarNum', { number: index + 1 })}
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
      <h4 className="font-semibold">{t('onboarding.steps.goal.title')}</h4>
    </div>
    
    <p className="text-sm text-opacity-70 mb-6">
      {t('onboarding.steps.goal.description')}
    </p>
    
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">{t('onboarding.steps.goal.name')}</span>
      </label>
      <input 
        type="text" 
        className="input input-bordered w-full"
        value={goalName} 
        onChange={(e) => setGoalName(e.target.value)} 
        placeholder={t('onboarding.steps.goal.namePlaceholder')}
        required
      />
    </div>
    
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">{t('onboarding.steps.goal.timeObjective')}</span>
      </label>
      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <input 
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered w-full pl-10"
            value={dailyTime}
            onChange={(e) => {
              const value = e.target.value;
              setDailyTime(value === '' ? 1 : parseInt(value) || 1);
            }}
            onFocus={(e) => e.target.select()}
            min="1"
            required
          />
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <select 
          className="select select-bordered w-full max-w-[120px]" 
          value={timeUnit}
          onChange={(e) => setTimeUnit(e.target.value)}
        >
          <option value="minutes">{t('time.minutes')}</option>
          <option value="heures">{t('time.hours')}</option>
        </select>
      </div>
    </div>
    
    <div className="form-control mb-4">
      <fieldset className="fieldset bg-base-200 rounded-lg p-2 border border-base-300">
        <legend className="fieldset-legend">{t('onboarding.steps.goal.days')}</legend>
        <div className="flex flex-wrap gap-1 justify-center mb-2">
          <button
            type="button"
            className={`btn btn-sm ${daysSelectionMode === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleDaySelection([...DAYS], 'all')}
          >
            {t('days.everyday')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${daysSelectionMode === 'weekdays' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleDaySelection([...WEEKDAYS], 'weekdays')}
          >
            {t('days.weekdays')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${daysSelectionMode === 'weekend' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleDaySelection([...WEEKEND], 'weekend')}
          >
            {t('days.weekend')}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-1 justify-center">
          {DAY_KEYS.map((dayKey, index) => (
            <button
              key={dayKey}
              type="button"
              className={`btn btn-xs ${
                selectedDays.includes(DAYS[index]) 
                  ? 'btn-primary' 
                  : 'bg-base-300 text-base-content opacity-60'
              }`}
              onClick={() => toggleDay(DAYS[index])}
            >
              {t(`days.${dayKey}Short`)}
            </button>
          ))}
        </div>
        
      </fieldset>
    </div>
    
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text">{t('onboarding.steps.goal.color')}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            className={`w-8 h-8 rounded-full border-2 ${goalColor === color.hex ? 'border-primary' : 'border-transparent'}`}
            style={{ backgroundColor: color.hex }}
            title={t(color.nameKey)}
            onClick={() => setGoalColor(color.hex)}
          />
        ))}
      </div>
    </div>
  </div>
)}

          {/* Nouvelle étape: Sélection de la langue cible */}
          {step === 3 && (
  <div>
    <div className="flex items-center gap-2 mb-4">
      <Globe size={20} />
      <h4 className="font-semibold">{t('onboarding.steps.language.title')}</h4>
    </div>
    
    <p className="text-base-content text-opacity-70 mb-6">
      {t('onboarding.steps.language.description')}
    </p>
    
    <div className="form-control mb-6">
      <label className="cursor-pointer label justify-start gap-4">
        <span className="label-text font-medium">{t('onboarding.steps.language.useLearning')}</span>
        <input 
          type="checkbox" 
          className="toggle toggle-primary" 
          checked={learningLanguage} 
          onChange={() => setLearningLanguage(!learningLanguage)}
        />
      </label>
    </div>
    
    {learningLanguage && (
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">{t('onboarding.steps.language.selectLabel')}</span>
        </label>
        <select 
          className="select select-bordered w-full" 
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          {availableLanguages.map(lang => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>
      </div>
    )}
  </div>
)}
          
          {/* Étape 3: Timer */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} />
                <h4 className="font-semibold">{t('onboarding.steps.timer.title')}</h4>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 items-start">
                  <div className=" bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">{t('onboarding.steps.timer.step1Title')}</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      {t('onboarding.steps.timer.step1Description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">{t('onboarding.steps.timer.step2Title')}</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      {t('onboarding.steps.timer.step2Description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">{t('onboarding.steps.timer.step3Title')}</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      {t('onboarding.steps.timer.step3Description')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="bg-opacity-20 p-3 rounded-full">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">{t('onboarding.steps.timer.step4Title')}</p>
                    <p className="text-sm text-base-content text-opacity-70">
                      {t('onboarding.steps.timer.step4Description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Étape 4: Todo */}
          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ListTodo size={20} />
                <h4 className="font-semibold">{t('onboarding.steps.todo.title')}</h4>
              </div>
              
              <p className="text-base-content text-opacity-70 mb-6">
                {t('onboarding.steps.todo.description')}
              </p>
              
              <div className="form-control mb-4">
                <span className="opacity-50">{t('onboarding.steps.todo.taskTitle')}</span>
                <label className="input w-full">
                  <input 
                    type="text" 
                    value={todoText} 
                    onChange={(e) => setTodoText(e.target.value)} 
                    placeholder={t('onboarding.steps.todo.taskPlaceholder')}
                  />
                </label>
              </div>
              
              <div className="form-control mb-4">
                <label className="cursor-pointer label">
                  <span className="label-text">{t('todoList.labels.recurringTask')}</span>
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
                    <span className="label-text">{t('onboarding.steps.todo.chooseDays')}</span>
                  </label>
                  <div className="bg-base-200 rounded-lg p-2 border border-base-300 mb-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {DAY_SHORT_KEYS.map((dayKey, index) => (
                        <button
                          key={dayKey}
                          type="button"
                          className={`btn btn-xs ${
                            todoDays.includes(DAYS_SHORT[index]) 
                              ? 'btn-info' 
                              : 'bg-base-300 text-base-content opacity-60'
                          }`}
                          onClick={() => toggleTodoDay(DAYS_SHORT[index])}
                        >
                          {t(`todoList.days.${dayKey}Short`)}
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
                {t('onboarding.buttons.previous')}
              </button>
            ) : (
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  if (window.confirm(t('onboarding.confirmations.skipTutorial'))) {
                    skipOnboarding();
                  }
                }}
                disabled={loading}
              >
                {t('onboarding.buttons.skip')}
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
                  {t('onboarding.buttons.loading')}
                </>
              ) : step === totalSteps ? (
                <>
                  {t('onboarding.buttons.finish')}
                  <Check size={16} />
                </>
              ) : (
                <>
                  {t('onboarding.buttons.next')}
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

export default OnboardingModal