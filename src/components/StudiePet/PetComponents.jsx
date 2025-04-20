// src/components/StudiePet/PetComponents.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Heart, 
  Moon, 
  Utensils,
  Target,
  Award,
  CalendarDays,
  Trophy,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { usePet } from '../../contexts/PetContext';
import catHappy from '../../../public/pet/cat_happy.svg'; // Gardés comme fallback
import catSad from '../../../public/pet/cat_sad.svg';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

// Composant pour afficher le pet (chat)
export const PetDisplay = ({ onFeed }) => {
  const { t } = useTranslation();
  const { 
    petName, 
    happiness, 
    chatMood, 
    isOnVacation, 
    lastFedTime,
    toggleVacationMode
  } = usePet();
  const [feedAnimation, setFeedAnimation] = useState(false);
  
  // Configuration Rive
  const { rive, RiveComponent } = useRive({
    src: '../../../public/pet/cat_idle.riv', // Ajustez le chemin selon votre structure de fichiers
    stateMachines: 'Main', // Nom de la state machine dans votre fichier Rive
    autoplay: true,
  });
  
  // Inputs pour contrôler les états dans Rive
  const happyInput = useStateMachineInput(rive, 'Main', 'isHappy', true);
  const feedingInput = useStateMachineInput(rive, 'Main', 'isFeeding', false);
  
  // Mettre à jour les états de Rive en fonction des props
  useEffect(() => {
    if (happyInput) {
      happyInput.value = chatMood === 'happy';
    }
  }, [chatMood, happyInput]);
  
  useEffect(() => {
    if (feedingInput && feedAnimation) {
      feedingInput.value = true;
      
      // Réinitialiser l'input après l'animation
      const timer = setTimeout(() => {
        if (feedingInput) {
          feedingInput.value = false;
        }
      }, 2000); // Durée de l'animation
      
      return () => clearTimeout(timer);
    }
  }, [feedAnimation, feedingInput]);
  
  // Fonction pour gérer l'animation de nourrissage
  const handleFeed = async () => {
    setFeedAnimation(true);
    
    // Appeler la fonction de nourrissage fournie
    if (onFeed) {
      await onFeed();
    }
    
    // Désactiver l'animation après un délai
    setTimeout(() => {
      setFeedAnimation(false);
    }, 1000);
  };

  return (
    <div className="">
      {/* Heart indicator */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 bg-base-100 bg-opacity-60 rounded-full px-3 py-1 shadow-md">
          <Heart 
            className={`${happiness > 50 ? "text-error" : "text-error opacity-50"} w-5 h-5`} 
            fill={happiness > 0 ? "currentColor" : "none"} 
          />
          <div className="w-24 bg-base-300 rounded-full h-2 overflow-hidden">
            <div
              className={`${happiness > 70 ? "bg-success" : happiness > 30 ? "bg-warning" : "bg-error"} h-2 rounded-full transition-all duration-500 ease-in-out`}
              style={{ width: `${happiness}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Pet Animation Area */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center mb-2">
        {/* Animation de nourrissage (conservée comme élément visuel supplémentaire) */}
        {feedAnimation && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-8 animate-bounce z-10">
            <Utensils className="text-primary w-8 h-8" />
          </div>
        )}
        
        {/* Animation Rive */}
        {rive ? (
          <RiveComponent className="w-full h-full" />
        ) : (
          /* Fallback SVGs si Rive n'est pas encore chargé */
          <>
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${chatMood === 'happy' ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              <img src={catHappy} alt={t('studiePet.happyCat')} className="w-full h-full object-contain" />
            </div>
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${chatMood === 'sad' ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              <img src={catSad} alt={t('studiePet.sadCat')} className="w-full h-full object-contain" />
            </div>
          </>
        )}
      </div>
      
      {/* Pet Name */}
      <div className="text-center mt-auto">
        <h2 className="text-xl md:text-2xl font-bold text-base-content mb-2">
          {petName || t('studiePet.noName')}
        </h2>
        
        {/* Last Fed Message */}
        {lastFedTime && (
          <div className="bg-success bg-opacity-10 text-success rounded-full px-4 py-1 text-sm font-medium shadow-inner">
            <span className="flex items-center gap-1">
              <Utensils className="w-4 h-4" />
              {t('studiePet.fedMessage', { 
                time: new Date(lastFedTime).toLocaleTimeString(), 
                petName: petName || t('studiePet.pet') 
              })}
            </span>
          </div>
        )}
      </div>
      
      {/* Vacation Mode Toggle */}
      <div className="absolute bottom-4 left-4">
        <label className="swap swap-flip text-base-content">
          <input type="checkbox" checked={isOnVacation} onChange={toggleVacationMode} />
          <div className="swap-on flex items-center gap-1 bg-success bg-opacity-20 rounded-full px-3 py-1 shadow-md">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">{t('studiePet.vacationOn')}</span>
          </div>
          <div className="swap-off flex items-center gap-1 bg-base-100 bg-opacity-60 rounded-full px-3 py-1 shadow-md">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">{t('studiePet.vacationMode')}</span>
          </div>
        </label>
      </div>
    </div>
  );
};

// Composant pour le formulaire de création de pet
export const CreatePetForm = () => {
  const { t } = useTranslation();
  const { createPet } = usePet();
  const [newPetName, setNewPetName] = useState('');
  
  const handleCreatePet = async () => {
    if (newPetName.trim()) {
      await createPet(newPetName);
    } else {
      alert(t('studiePet.enterPetName'));
    }
  };

  return (
    <div className="flex-1 p-4 flex flex-col items-center justify-center">
      <div className="bg-base-100 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-primary text-center">
          {t('studiePet.createYourPet')}
        </h2>
        <div className="mb-6">
          <div className="flex justify-center mb-6">
            <img src={catHappy} alt="Happy Cat" className="w-32 h-32" />
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
};