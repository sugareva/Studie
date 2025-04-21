// src/pages/StudiePetPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  formatDistanceToNow, 
  format, 
  isToday, 
  isYesterday, 
  parseISO 
} from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { 
  Heart, 
  Star, 
  Moon, 
  Utensils, 
  Target,
  Award,
  Pencil,
  CalendarDays,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Info,
  X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { PetProvider, usePet } from '../contexts/PetContext';
import UserOptionsModal from '../components/UserOptionsModal';
import catHappy from '../../public/pet/cat_happy.svg';
import catSad from '../../public/pet/cat_sad.svg';
import RiveTest from '../components/RiveTest';


// Composant interne qui utilise le contexte du pet
const StudiePetContent = () => {
  const { t, i18n } = useTranslation();
  const { 
    petName, 
    happiness, 
    croquettes,
    consecutiveDays,
    lastFedTime,
    isOnVacation,
    todayGoalProgress,
    activeDays,
    activeDaysStatus,
    successToday,
    accessoires,
    feedPet,
    createPet,
    claimCroquette,
    toggleVacationMode,
    loading,
    error,
    updatePetData,
    petLevel,
    levelProgress,
    currentPose
  } = usePet();
  
  // États locaux
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showCroquetteAnimation, setShowCroquetteAnimation] = useState(false);
  const [feedAnimation, setFeedAnimation] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [resetTime, setResetTime] = useState(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
const [editedPetName, setEditedPetName] = useState(petName);
  
  const handleCreatePet = async () => {
    if (!newPetName.trim()) {
      alert(t('studiePet.enterPetName'));
      return;
    }
    
    // Appeler la fonction createPet du contexte
    await createPet(newPetName);
    
    // Réinitialiser newPetName après la création
    setNewPetName('');
  };

  const handleUpdatePetName = async () => {
    if (!editedPetName.trim()) {
      alert(t('studiePet.enterPetName'));
      return;
    }
  
    try {
      // Utilisez updatePetData du contexte
      await updatePetData({ name: editedPetName.trim() });
      
      // Réinitialiser le mode édition
      setIsEditingName(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      alert(t('studiePet.errorUpdatingName'));
    }
  };
    // Fonction pour formater l'heure (existante)
    const formatTime = (timeString) => {
      try {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return timeString;
      }
    };

    const formatTimeUntilReset = () => {
      if (!resetTime) return '';
      
      const now = new Date();
      const reset = new Date(resetTime);
      const diffMs = reset - now;
      
      if (diffMs <= 0) return "immédiatement";
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours} heure${diffHours > 1 ? 's' : ''} ${diffMinutes > 0 ? `et ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : ''}`;
      } else {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
    };

    const calculateCurrentHappiness = () => {
      if (!lastFedTime || isOnVacation) return happiness;
      
      const now = new Date();
      const lastFed = new Date(lastFedTime);
      const hoursSinceLastFed = Math.max(0, (now - lastFed) / (1000 * 60 * 60));
      
      return Math.max(0, Math.floor(24 - hoursSinceLastFed));
    };
    
    // Ajouter un state local pour le bonheur actuel
    const [currentHappiness, setCurrentHappiness] = useState(happiness);
    
    // Utiliser un useEffect pour mettre à jour le bonheur toutes les minutes
    useEffect(() => {
      const updateCurrentHappiness = () => {
        setCurrentHappiness(calculateCurrentHappiness());
      };
      
      // Mise à jour initiale
      updateCurrentHappiness();
      
      // Mise à jour toutes les minutes
      const interval = setInterval(updateCurrentHappiness, 60 * 1000);
      
      return () => clearInterval(interval);
    }, [happiness, lastFedTime, isOnVacation]);
    
    // Nouvelle fonction pour le format relatif
    const formatRelativeTime = (timeString) => {
      try {
        const date = new Date(timeString);
        const locale = i18n.language === 'fr' ? fr : enUS;
        
        if (isToday(date)) {
          // Si c'est aujourd'hui, affiche "il y a X minutes/heures"
          return t('studiePet.fedTimeToday', {
            time: formatDistanceToNow(date, { locale, addSuffix: true })
          });
        } else if (isYesterday(date)) {
          // Si c'est hier, affiche "hier à XX:XX"
          return t('studiePet.fedTimeYesterday', {
            time: format(date, 'HH:mm', { locale })
          });
        } else {
          // Si c'est plus ancien, affiche la date complète
          return t('studiePet.fedTimeDateFull', {
            date: format(date, 'dd/MM/yyyy', { locale }),
            time: format(date, 'HH:mm', { locale })
          });
        }
      } catch (e) {
        console.error('Error formatting time:', e);
        return timeString;
      }
    }

    useEffect(() => {
      // Si le chat est déjà en mode vacances, ne rien faire
      if (isOnVacation) {
        setShowResetWarning(false);
        setResetTime(null);
        return;
      }
      
      // Si le bonheur tombe à zéro, démarrer le compte à rebours
      if (currentHappiness <= 0 && !resetTime) {
        const resetDate = new Date();
        resetDate.setHours(resetDate.getHours() + 24);
        setResetTime(resetDate.toISOString());
        setShowResetWarning(true);
      }
      
      // Si le bonheur remonte au-dessus de zéro, annuler le compte à rebours
      if (currentHappiness > 0 && resetTime) {
        setResetTime(null);
        setShowResetWarning(false);
      }
      
      // Vérifier si le délai de réinitialisation est passé
      if (resetTime) {
        const checkReset = () => {
          const now = new Date();
          const reset = new Date(resetTime);
          
          if (now >= reset) {
            // Réinitialiser le niveau
            updatePetData({
              consecutive_days: 0,
              last_fed_time: null
            });
            
            // Réinitialiser les états locaux
            setResetTime(null);
            setShowResetWarning(false);
            setConsecutiveDays(0);
            
            // Afficher une notification ou une alerte
            alert(`${petName} a perdu tous ses niveaux par manque de nourriture !`);
          }
        };
        
        // Vérifier immédiatement
        checkReset();
        
        // Puis vérifier toutes les minutes
        const interval = setInterval(checkReset, 60 * 1000);
        return () => clearInterval(interval);
      }
    }, [currentHappiness, resetTime, isOnVacation, petName]);
  
  // Obtenir le texte d'humeur du chat
  const getPetMoodText = () => {
    const currentMood = currentHappiness;
    
    if (currentMood >= 20) return t('studiePet.mood.veryHappy',{petName: petName});
    if (currentMood >= 12) return t('studiePet.mood.happy',{petName: petName});
    if (currentMood >= 6) return t('studiePet.mood.hungry',{petName: petName});
    if (currentMood > 0) return t('studiePet.mood.sad',{petName: petName});
    return t('studiePet.mood.verySad',{petName: petName});
  };
  
  // Fonction pour le rendu de l'image du chat
  const renderPetImage = () => {
    // Détermine l'humeur du chat (happy, sad)
    const mood = currentHappiness > 12 ? 'happy' : 'sad'; 
    console.log("Rendering pet with mood:", mood, "currentHappiness:", currentHappiness);
    const getTimeOfDay = () => {
      // Si une heure de test est définie, l'utiliser
      if (window._testTimeOfDay) {
        switch(window._testTimeOfDay) {
          case 'matin': return "morning";
          case 'jour': return "day";
          case 'soir': return "evening";
          case 'nuit': return "night";
          default: return window._testTimeOfDay;
        }
      }
      
      // Sinon, utiliser l'heure réelle
      const hours = new Date().getHours();
      if (hours >= 5 && hours < 12) return "morning";
      if (hours >= 12 && hours < 18) return "day";
      if (hours >= 18 && hours < 22) return "night";
      return "night";
    };
    //const imagePath = mood === 'happy' ? catHappy : catSad;

    
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Animation de nourrissage */}
        {feedAnimation && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-8 animate-bounce z-20">
            <Utensils className="text-primary w-8 h-8" />
          </div>
        )}
        
        { /*<img 
          src={imagePath}
          alt={`${petName} - ${t(`studiePet.mood.${mood}`)}`}
          className="w-auto h-auto max-w-full max-h-full object-contain transition-all duration-500"
        />*/}
               <RiveTest 
          mood={mood}
          isFeeding={feedAnimation}
          timeOfDay={getTimeOfDay()}
          customAnimation={null} // Utilisez cette prop pour des animations spéciales
        />
        {/* Compteur de niveau */}
        <div className="absolute top-4 left-4 badge badge-lg badge-soft badge-primary gap-1 p-3">
          <Star className="w-4 h-4" />
          <span className="font-bold">{petLevel}</span>
        </div>
        
        {/* Indicateur de bonheur */}
        <div className="absolute top-4 right-4 z-10">
    <div className="tooltip tooltip-bottom" data-tip={`${currentHappiness}/24`}>
      <div className="flex items-center gap-2 bg-base-100 bg-opacity-60 backdrop-blur-sm rounded-full px-3 py-1 shadow-md">
        <Heart
          className={`${currentHappiness >= 12 ? "text-error" : "text-error opacity-50"} w-5 h-5`}
          fill={currentHappiness > 0 ? "currentColor" : "none"}
        />
        <div className="relative w-20 h-2 overflow-hidden rounded-full bg-base-300">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ease-in-out ${
              currentHappiness > 18 ? "bg-success" :
              currentHappiness > 12 ? "bg-warning" :
              "bg-error"
            }`}
            style={{ width: `${Math.round((currentHappiness / 24) * 100)}%` }}
          ></div>
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-base-100 opacity-50"></div>
        </div>
      </div>
    </div>
  </div>
      </div>
    );
  };
  
  // Gestion de l'alimentation du pet
  const handleFeedPet = async () => {
    if (croquettes <= 0) return;
    
    setFeedAnimation(true);
    
    const success = await feedPet();
    
    // Désactiver l'animation après un délai
    setTimeout(() => {
      setFeedAnimation(false);
    }, 1500);
    
    return success;
  };
  
  const handleClaimCroquette = async (goalId) => {
    // Bloquer la réclamation en mode vacances
    if (isOnVacation) {
      return false;
    }
    
    const success = await claimCroquette(goalId);
    
    if (success) {
      setShowCroquetteAnimation(true);
      
      // Désactiver l'animation après un délai
      setTimeout(() => {
        setShowCroquetteAnimation(false);
      }, 2000);
    }
    
    return success;
  };
  
  // Affichage du chargement
  if (loading) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-base-content font-medium">{t('studiePet.loading')}</p>
      </div>
    );
  }
  
  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="alert alert-error shadow-lg max-w-md">
          <X className="w-6 h-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }
  
  // Si pas de pet, afficher le formulaire de création
  if (!petName) {
    return (
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="bg-base-100 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-primary text-center">
            {t('studiePet.createYourPet')}
          </h2>
          <div className="mb-6">
            <div className="flex justify-center mb-6">
            <RiveTest 
         
        />
            </div>
            <label htmlFor="petName" className="label">
              <span className="label-text text-lg font-medium">{t('studiePet.petName')}</span>
            </label>
            <input
              type="text"
              id="petName"
              placeholder={t('studiePet.petNamePlaceholder')}
              className="input input-bordered w-full bg-base-200 border-base-300 focus:border-primary"
              value={newPetName}
              onChange={(e) => setNewPetName(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary w-full"
            onClick={handleCreatePet}
          >
            {t('studiePet.createPetButton')}
          </button>
        </div>
      </div>
    );
  }
  
  // Rendu principal
  return (
    <>
      {/* Container principal avec largeur à 80% sur desktop */}
      <div className="flex-1 px-4 py-3 w-full md:w-[90%] lg:w-[80%] mx-auto">
  {/* Layout principal - En colonne sur mobile, en ligne sur desktop */}
  <div className="flex flex-col md:flex-row gap-4">
    
    {/* Zone du chat - Taille réduite */}
    <div className="w-full md:w-3/5 relative">
  {/* Conteneur du chat avec hauteur réduite */}
  <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-3xl shadow-md p-4 h-[calc(100vh-14rem)] max-h-[560px] flex flex-col">
    {/* Alerte de réinitialisation du niveau si nécessaire */}
    {showResetWarning && (
      <div className="alert alert-error mb-2 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <h3 className="font-bold text-sm">{petName} va perdre tous ses niveaux !</h3>
            <div className="text-xs">Nourrissez-le dans {formatTimeUntilReset()} pour éviter la perte de progression.</div>
          </div>
        </div>
      </div>
    )}
    
    {/* Mode vacances - Overlay qui masque les interactions */}
    {isOnVacation && (
      <div className="absolute inset-0 bg-base-300 bg-opacity-80 backdrop-blur-sm rounded-3xl z-30 flex flex-col items-center justify-center p-4">
        <Moon className="w-12 h-12 text-info mb-4" />
        <h2 className="text-xl font-bold text-center mb-2"> {t('studiePet.vacation.vacationOn')}</h2>
        <p className="text-center text-base-content opacity-80 max-w-xs">
          {t('studiePet.vacation.vacationDescription',{petName: petName})}
        </p>
        <button 
          onClick={toggleVacationMode}
          className="btn btn-outline btn-info mt-4"
        >
          {t('studiePet.vacation.vacationButton')}
        </button>
      </div>
    )}
    
    {/* Visuel du chat - comme avant */}
    <div className="flex-grow flex items-center justify-center relative">
      <div className="relative w-full h-full flex items-center justify-center">
        {renderPetImage()}
        
        {/* Animation croquette */}
        {showCroquetteAnimation && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-ping z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary bg-opacity-30 rounded-full blur-sm transform scale-125"></div>
              <div className="relative bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center font-bold">
                +1
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Bouton Nourrir - réduit et rapproché du chat */}
    <div className="mt-2">
      <button 
        className={`btn w-full ${
          croquettes > 0 ? 'btn-primary' : 'btn-disabled'
        } rounded-xl shadow-md transition-all duration-300`}
        onClick={handleFeedPet} 
        disabled={croquettes <= 0 || isOnVacation}
      >
        <div className="flex items-center justify-center gap-2">
          <Utensils className="w-5 h-5" />
          <span className="font-bold">{t('studiePet.feedPet')}</span>
        </div>
      </button>
    </div>
  </div>
</div>
    
    {/* Panneau latéral - Plus compact */}
    <div className="w-full md:w-2/5">
      <div className="bg-base-100 rounded-3xl shadow-md p-4 h-[calc(100vh-14rem)] max-h-[560px] flex flex-col gap-3">
        {/* En-tête avec badges - Réduit */}
        <div className="flex justify-between items-start">
          {/* Mode vacances */}
          <div>
  <label className="label cursor-pointer justify-start gap-2">
    <span className="label-text text-sm">{t('studiePet.vacationMode')}</span>
    <input 
      type="checkbox" 
      className="toggle toggle-info toggle-sm" 
      checked={isOnVacation}
      onChange={toggleVacationMode}
    />
  </label>
</div>
          {/* Badges de statut + Bouton d'aide - Plus compact */}
          <div className="flex gap-2 items-center">
            {/* Bouton d'aide */}
            <button 
              onClick={() => setIsHelpModalOpen(true)}
              className="btn btn-circle btn-ghost btn-sm h-7 w-7 min-h-0"
              aria-label={t('studiePet.helpTitle')}
            >
              <Info className="w-3.5 h-3.5 text-primary" />
            </button>
            
            {/* Badge croquettes */}
            <div className="badge badge-soft badge-primary bg-opacity-20 text-primary font-bold gap-1 p-2">
              <Utensils className="w-3 h-3" />
              <span>{croquettes}</span>
            </div>
            
            {/* Badge jours consécutifs */}
            <div className="tooltip tooltip-bottom" data-tip={t('studiePet.consecutiveDays')}>
            <div className="badge badge-soft badge-secondary bg-opacity-20 text-secondary font-bold gap-1 p-2">
              <CalendarDays className="w-3 h-3" />
              <span>{consecutiveDays}</span>
            </div></div>
          </div>
        </div>
        
        {/* Nom du chat et niveau - Plus compact */}
        <div>
        <div>
  {isEditingName ? (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={editedPetName}
        onChange={(e) => setEditedPetName(e.target.value)}
        className="input input-bordered input-sm w-full max-w-xs"
        autoFocus
      />
      <button 
        onClick={handleUpdatePetName}
        className="btn btn-circle btn-primary btn-sm"
        aria-label={t('studiePet.savePetName')}
      >
        <CheckCircle2 className="w-4 h-4" />
      </button>
      <button 
        onClick={() => {
          setEditedPetName(petName);
          setIsEditingName(false);
        }}
        className="btn btn-circle btn-ghost btn-sm"
        aria-label={t('studiePet.cancelEdit')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <h2 className="text-xl font-bold text-base-content">{petName}</h2>
      <button 
        onClick={() => setIsEditingName(true)}
        className="btn btn-circle btn-ghost btn-sm"
        aria-label={t('studiePet.editPetName')}
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  )}
</div>

          
          {/* Niveau et progression */}
          <div className="mt-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium">{t('studiePet.level')} {petLevel}</span>
              <span className="text-xs">{Math.round(levelProgress)}%</span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              ></div>
            </div>
          </div>
          
          {/* État du chat */}
          <p className="text-xs mt-1 text-base-content opacity-70">
            {getPetMoodText()}
          </p>
        </div>
        
        {/* Dernière fois nourri - Plus compact */}
        {lastFedTime && (
          <div className="alert alert-info alert-soft alert-sm  bg-opacity-10 text-info p-2">
            <Utensils className="w-3 h-3" />
            <span className="text-xs">{formatRelativeTime(lastFedTime)}</span>
          </div>
        )}
        
        {/* Réclamer des croquettes - Plus compact */}
<div className="flex-grow flex flex-col overflow-hidden">
  <h3 className="text-sm font-semibold flex items-center gap-1 mb-1">
    <Trophy className="w-3.5 h-3.5 text-primary" />
    {t('studiePet.claimCroquettes')}
  </h3>
  
  <div className="space-y-1.5 overflow-y-auto flex-grow">
    {todayGoalProgress
      .filter(goal => goal.isScheduledToday)
      .map((goal) => (
        <div key={goal.goalId} className="flex items-center justify-between p-2 bg-base-200 rounded-xl">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: goal.goalColor || '#888' }}
            ></div>
            <span className="font-medium text-xs truncate max-w-[80px]">{goal.goalName}</span>
          </div>
          
          {goal.isCompleted ? (
            goal.isClaimedCroquette ? (
              <div className="badge badge-success badge-sm gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-xs">{t('studiePet.obtained')}</span>
              </div>
            ) : (
              <button 
                onClick={() => handleClaimCroquette(goal.goalId)}
                className="btn btn-primary btn-xs h-6 min-h-0"
                disabled={isOnVacation} // Désactiver le bouton en mode vacances
              >
                <Trophy className="w-3 h-3" />
                <span className="text-xs">{t('studiePet.claim')}</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-12 bg-base-300 rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((goal.progress / goal.duration) * 100))}%` }}
                ></div>
              </div>
              <span className="text-xs">{Math.round((goal.progress / goal.duration) * 100)}%</span>
            </div>
          )}
        </div>
      ))}
      
    {/* Si en mode vacances, afficher un message explicatif */}
    {isOnVacation && (
      <div className="alert alert-warning alert-soft mt-2 py-2 text-xs">
        <Info className="w-3 h-3" />
        <span>{t('studiePet.vacation.VacationAlert')}</span>
      </div>
    )}
    
    {/* Message s'il n'y a pas d'objectifs programmés aujourd'hui */}
    {todayGoalProgress.filter(goal => goal.isScheduledToday).length === 0 && !isOnVacation && (
      <div className="text-center py-2 text-base-content opacity-60">
        <span className="text-xs">{t('studiePet.noGoalsToday')}</span>
      </div>
    )}
  </div>
</div>
        
        {/* Prochain niveau - Plus compact */}
        <div className="mt-auto">
          <div className="flex items-center gap-1 mb-1">
            <Award className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-base-content">
              {t('studiePet.nextLevel')}
            </span>
          </div>
          
          <div className="bg-base-200 rounded-xl p-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-base-content opacity-70">{t('studiePet.currentLevel')}</span>
                <div className="font-bold text-sm flex items-center">
                  <Star className="w-3.5 h-3.5 mr-1 text-primary" />
                  {petLevel}
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-xs text-base-content opacity-70">{t('studiePet.nextUnlockIn')}</span>
                <div className="font-bold text-sm">
                  {Math.ceil((100 - levelProgress) / 15)} {t('studiePet.days')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
{/* Bouton pour afficher/masquer le panneau de test */}
<div className="fixed bottom-4 right-4">
  <button 
    onClick={() => setShowTestPanel(!showTestPanel)} 
    className="btn btn-circle btn-sm btn-primary"
  >
    {showTestPanel ? 'X' : 'T'}
  </button>
</div>

{/* Panneau de test */}
{showTestPanel && (
  <div className="fixed bottom-16 right-4 bg-base-200 p-4 rounded-lg shadow-lg z-50 w-64">
    <h3 className="text-sm font-bold mb-2">Panneau de test</h3>
    
    <div className="space-y-2">
      {/* Test d'humeur */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <span className="label-text">Chat triste</span>
          <input 
            type="checkbox" 
            className="toggle toggle-primary toggle-sm" 
            checked={currentHappiness <= 12}
            onChange={() => setCurrentHappiness(currentHappiness > 12 ? 6 : 18)}
          />
        </label>
      </div>
      
      {/* Test de nourrissage */}
      <button 
        onClick={() => {
          setFeedAnimation(true);
          setTimeout(() => setFeedAnimation(false), 3000);
        }}
        className="btn btn-xs btn-primary w-full"
      >
        Tester nourrissage (3s)
      </button>
      
      {/* Test d'heure */}
      <div>
        <p className="text-xs mb-1">Simuler heure du jour:</p>
        <div className="grid grid-cols-4 gap-1">
          {['Matin', 'Jour', 'Soir', 'Nuit'].map(time => (
            <button 
              key={time}
              onClick={() => {
                // Ici, nous simulons un changement d'heure en forçant
                // la fonction getTimeOfDay à retourner une valeur spécifique
                // Vous devrez adapter cette partie à votre code
                window._testTimeOfDay = time.toLowerCase();
                // Force refresh
                setFeedAnimation(true);
                setTimeout(() => setFeedAnimation(false), 10);
              }}
              className="btn btn-xs"
            >
              {time}
            </button>
          ))}
        </div>
      </div>
      
      {/* Informations sur l'état actuel */}
      <div className="bg-base-300 p-2 rounded text-xs">
        <p>Bonheur: {currentHappiness}/24</p>
        <p>Humeur: {currentHappiness > 12 ? 'Content' : 'Triste'}</p>
        <p>Heure: {window._testTimeOfDay || 'Normale'}</p>
        <p>Animation: {feedAnimation ? 'Nourrissage' : 'Standard'}</p>
      </div>
    </div>
  </div>
)}
      
      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-base-100">
            <button 
              className="absolute top-3 right-3 btn btn-sm btn-circle btn-ghost"
              onClick={() => setIsHelpModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4 text-base-content flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              {t('studiePet.helpTitle')}
            </h3>
            
            <div className="divider"></div>
            
            <div className="prose">
              <p className="text-base-content">
                {t('studiePet.helpDescription')}
              </p>
              
              <ul className="space-y-2 text-base-content">
                <li className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 mt-1 text-primary" />
                  <span>{t('studiePet.helpComplete')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Utensils className="w-4 h-4 mt-1 text-primary" />
                  <span>{t('studiePet.helpFeed')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 mt-1 text-error" />
                  <span>{t('studiePet.helpHappiness')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="w-4 h-4 mt-1 text-primary" />
                  <span>{t('studiePet.helpAccessories')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Moon className="w-4 h-4 mt-1 text-info" />
                  <span>{t('studiePet.helpVacation')}</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-6">
              <button 
                className="btn btn-primary w-full"
                onClick={() => setIsHelpModalOpen(false)}
              >
                {t('studiePet.understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Composant principal StudiePetPage
const StudiePetPage = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  
  // Gestionnaire de mise à jour des paramètres utilisateur
  const handleUpdateSettings = (updatedSettings) => {
    setUserSettings(updatedSettings);
  };
  
  return (
    <div className="min-h-screen bg-base-200 p-4">
      <Navbar 
        onOpenUserModal={() => setIsModalOpen(true)} 
        userSettings={userSettings}
      />
      
      <PetProvider>
        <StudiePetContent />
      </PetProvider>
      
      {/* User Modal */}
      <UserOptionsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        onUpdateSettings={handleUpdateSettings}
        onSignOut={signOut}
      />
    </div>
  );
};

export default StudiePetPage;