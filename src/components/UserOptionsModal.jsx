// src/components/UserOptionsModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, X, Check, AlertTriangle, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

// Liste des avatars prédéfinis
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

function UserOptionsModal({ isOpen, onClose, user, onUpdateSettings, onSignOut }) {
  const { t, i18n } = useTranslation();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showTodoList, setShowTodoList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [learningLanguage, setLearningLanguage] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('french');
  const [showLanguageWarning, setShowLanguageWarning] = useState(false);
  const [previousLanguage, setPreviousLanguage] = useState('');

  const handleLearningToggle = (value) => {
    setLearningLanguage(value);
    if (!value) {
      // Si désactivé, on ne montre pas d'avertissement
      setShowLanguageWarning(false);
    }
  };
  
  // Charger les paramètres actuels de l'utilisateur
  useEffect(() => {
    if (isOpen && user) {
      fetchUserSettings();
    }
  }, [isOpen, user]);
  
  // Récupérer les paramètres utilisateur depuis la base de données
// Récupérer les paramètres utilisateur depuis la base de données
const fetchUserSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = Pas de données trouvées
      console.error(t('userOptions.errors.fetchSettingsLogError'), error);
      setError(t('userOptions.errors.loadSettingsError'));
      return;
    }
    
    if (data) {
      setNickname(data.nickname || '');
      setAvatar(data.avatar || avatars[0]);
      setShowTodoList(data.show_todo_list !== false); // Default to true if not set
    } else {
      // Valeurs par défaut si pas de données trouvées
      setNickname('');
      setAvatar(avatars[0]);
      setShowTodoList(true);
    }
    
    setError(null);
    
    // Récupérer les données de langue cible
    // Récupérer les données de langue cible
try {
  const { data: langData, error: langError } = await supabase
    .from('language_progress')
    .select('target_language')
    .eq('user_id', user.id)
    .single();
  
  if (langError && langError.code !== 'PGRST116') {
    console.error('Erreur lors de la récupération de la langue cible:', langError);
    return;
  }
  
  if (langData) {
    setLearningLanguage(true);
    setTargetLanguage(langData.target_language);
    setPreviousLanguage(langData.target_language);
  } else {
    setLearningLanguage(false);
    setTargetLanguage('french');
    setPreviousLanguage('');
  }
} catch (langErr) {
  console.error('Erreur lors de la récupération de la langue cible:', langErr);
}

// Ajouter cette fonction pour gérer le changement d'état d'apprentissage
const handleLearningToggle = (value) => {
  setLearningLanguage(value);
  if (!value) {
    // Si désactivé, on ne montre pas d'avertissement
    setShowLanguageWarning(false);
  }
};

// Fonction pour gérer le changement de langue cible
const handleTargetLanguageChange = (e) => {
  const newLanguage = e.target.value;
  if (previousLanguage && newLanguage !== previousLanguage) {
    setPreviousLanguage(targetLanguage);
    setTargetLanguage(newLanguage);
    setShowLanguageWarning(true);
  } else {
    setTargetLanguage(newLanguage);
    setShowLanguageWarning(false);
  }
};

// Fonction pour confirmer le changement de langue
const confirmLanguageChange = async () => {
  try {
    setSaving(true);
    
    const { data: existingData, error: checkError } = await supabase
      .from('language_progress')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    const newProgress = {
      user_id: user.id,
      target_language: targetLanguage,
      completed_skills: []
    };
    
    let result;
    
    if (existingData) {
      result = await supabase
        .from('language_progress')
        .update(newProgress)
        .eq('user_id', user.id);
    } else {
      result = await supabase
        .from('language_progress')
        .insert(newProgress);
    }
    
    if (result.error) throw result.error;
    
    setPreviousLanguage(targetLanguage);
    setShowLanguageWarning(false);
    
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la langue cible:', err);
    setError(t('userOptions.errors.saveLanguageError'));
  } finally {
    setSaving(false);
  }
};
    
  } catch (err) {
    console.error(t('userOptions.errors.fetchSettingsTryCatchError'), err);
    setError(t('userOptions.errors.loadSettingsError'));
  }
};
  
  
  // Enregistrer les paramètres utilisateur
const saveSettings = async () => {
  if (!user) return;
  
  try {
    setSaving(true);
    setError(null);
    
    const settings = {
      user_id: user.id,
      nickname,
      avatar,
      show_todo_list: showTodoList,
      learning_language: learningLanguage // Ajouter cette propriété
    };
    
    // Vérifier si des paramètres existent déjà pour cet utilisateur
    const { data: existingData, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    let result;
    
    if (existingData) {
      // Mettre à jour les paramètres existants
      result = await supabase
        .from('user_settings')
        .update(settings)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // Insérer de nouveaux paramètres
      result = await supabase
        .from('user_settings')
        .insert(settings)
        .select()
        .single();
    }
    
    // Gestion de la progression linguistique (ce code semble correct)
    if (!learningLanguage) {
      // Supprimer l'enregistrement de progression linguistique s'il existe
      const { error: deleteError } = await supabase
        .from('language_progress')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError && deleteError.code !== 'PGRST116') {
        console.error('Erreur lors de la suppression de la progression linguistique:', deleteError);
      }
    } 
    else if (showLanguageWarning) {
      // La langue a changé, on confirme d'abord
      await confirmLanguageChange();
    } 
    else if (learningLanguage) {
      // L'apprentissage est activé mais pas de changement de langue
      // Vérifier si un enregistrement existe déjà
      const { data: existingLangData, error: checkLangError } = await supabase
        .from('language_progress')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkLangError && checkLangError.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification de la progression linguistique:', checkLangError);
      } else if (!existingLangData) {
        // Si pas d'enregistrement, en créer un nouveau
        const { error: insertError } = await supabase
          .from('language_progress')
          .insert({
            user_id: user.id,
            target_language: targetLanguage,
            completed_skills: []
          });
        
        if (insertError) {
          console.error('Erreur lors de la création de la progression linguistique:', insertError);
        }
      }
    }
    
    if (result.error) {
      throw result.error;
    }
    
    // Mettre à jour les paramètres dans le composant parent
    if (onUpdateSettings) {
      onUpdateSettings(result.data);
    }
    
    // Afficher un message de succès
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    
  } catch (err) {
    console.error(t('userOptions.errors.saveSettingsError'), err);
    setError(t('userOptions.errors.saveSettingsErrorMessage'));
  } finally {
    setSaving(false);
  }
};
  
  // Sélectionner un avatar
  const handleAvatarSelect = (avatarUrl) => {
    setAvatar(avatarUrl);
  };

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
  
  // Fermer le modal et réinitialiser les états
  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onClose();
  };

  // Fonction pour gérer le changement de langue cible
const handleTargetLanguageChange = (e) => {
  const newLanguage = e.target.value;
  if (newLanguage !== previousLanguage) {
    setPreviousLanguage(targetLanguage);
    setTargetLanguage(newLanguage);
    setShowLanguageWarning(true);
  } else {
    setTargetLanguage(newLanguage);
    setShowLanguageWarning(false);
  }
};

// Fonction pour confirmer le changement de langue
const confirmLanguageChange = async () => {
  try {
    setSaving(true);
    
    // Vérifier si un enregistrement existe déjà pour cet utilisateur
    const { data: existingData, error: checkError } = await supabase
      .from('language_progress')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    const newProgress = {
      user_id: user.id,
      target_language: targetLanguage,
      completed_skills: []
    };
    
    let result;
    
    if (existingData) {
      // Mettre à jour la langue et réinitialiser les compétences
      result = await supabase
        .from('language_progress')
        .update(newProgress)
        .eq('user_id', user.id);
    } else {
      // Créer un nouvel enregistrement
      result = await supabase
        .from('language_progress')
        .insert(newProgress);
    }
    
    if (result.error) {
      throw result.error;
    }
    
    setPreviousLanguage(targetLanguage);
    setShowLanguageWarning(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    
  } catch (err) {
    console.error('Erreur lors de la mise à jour de la langue cible:', err);
    setError(t('userOptions.errors.saveLanguageError'));
  } finally {
    setSaving(false);
  }
};

// Fonction pour annuler le changement de langue
const cancelLanguageChange = () => {
  setTargetLanguage(previousLanguage);
  setShowLanguageWarning(false);
};
  
  // Gérer la déconnexion
  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    }
    handleClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <User size={20} />
            {t('userOptions.title')}
          </h3>
          <button 
            className="btn btn-sm btn-ghost"
            onClick={handleClose}
            aria-label={t('userOptions.buttons.closeAriaLabel')}
          >
            <X size={16} />
          </button>
        </div>
        
        {error && (
          <div className="alert alert-soft alert-error mb-4">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="alert alert-soft alert-success mb-4">
            <Check size={16} />
            <span>{t('userOptions.messages.settingsSaved')}</span>
          </div>
        )}
       
        
        <div className="form-control mb-4 w-full">
          <label className="input w-full">
            <Mail size={20} />
            <input 
              type="email" 
              className="input input-bordered" 
              value={user?.email || ''} 
              disabled 
            />
          </label>
        </div>
        
        <div className="form-control mb-4">
          <label className="input w-full">
            <User size={20} />
            <input 
              type="input" 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder={t('userOptions.placeholders.nickname')}
            />
          </label>
        </div>

        {/* Sélecteur de langue - version minimaliste */}
        <div className="form-control mb-4">
       
          <div className="flex justify-between"> <label className="label">
            <span className="label-text">{t('navbar.links.language')} :</span>
          </label>
            <div className="join">
              <button
                onClick={() => i18n.changeLanguage('fr')}
                className={`btn join-item btn-sm ${i18n.language === 'fr' ? 'btn-active' : ''}`}
                aria-label="Français"
              >
                Français
              </button>
              <button
                onClick={() => i18n.changeLanguage('en')}
                className={`btn join-item btn-sm ${i18n.language === 'en' ? 'btn-active' : ''}`}
                aria-label="English"
              >
                English
              </button>
            </div>
          </div>
        </div>

        
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">{t('userOptions.labels.chooseAvatar')}</span>
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
              aria-label={t('userOptions.buttons.previousAvatar')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="avatar">
              <div className="w-20 h-20 rounded-full">
                <img src={avatar || avatars[0]} alt={t('userOptions.altTexts.selectedAvatar')} />
              </div>
            </div>
            
            <button 
              className="btn btn-circle btn-sm" 
              onClick={() => {
                const currentIndex = avatars.indexOf(avatar);
                const nextIndex = currentIndex >= avatars.length - 1 ? 0 : currentIndex + 1;
                handleAvatarSelect(avatars[nextIndex]);
              }}
              aria-label={t('userOptions.buttons.nextAvatar')}
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
                aria-label={t('userOptions.buttons.selectAvatarNum', { number: index + 1 })}
              />
            ))}
          </div>
        </div>
        

        
        <fieldset className="w-full fieldset p-4 bg-base-100 border border-base-300 rounded-box w-64">
          <legend className="fieldset-legend">{t('userOptions.labels.showTodoList')}</legend>
          <label className="fieldset-label">
          <input 
      type="checkbox" 
      className="toggle toggle-primary" 
      checked={learningLanguage} 
      onChange={(e) => handleLearningToggle(e.target.checked)}
    />
            {t('onboarding.steps.language.useLearning')}
          </label>
          {learningLanguage && (
  <div className="form-control flex mb-4 gap-4">
    <label className="label">
      <span className="label-text">{t('roadmap.language.languageSelection')}</span>
    </label>
    <select 
      className="select select-sm select-bordered" 
      value={targetLanguage}
      onChange={handleTargetLanguageChange}
    >
      {availableLanguages.map(lang => (
        <option key={lang.id} value={lang.id}>{lang.name}</option>
      ))}
    </select>
  </div>
)}

{/* Alerte d'avertissement pour le changement de langue */}
{showLanguageWarning && (
  <div className="alert alert-soft alert-warning mb-2">
    <AlertTriangle size={16} />
    <div>
      
      <h3 className="font-bold">{t('onboarding.steps.language.warningTitle')}</h3>
      <div className="text-xs">{t('onboarding.steps.language.warningText')}</div>
      
    </div>
  </div>
)}
        </fieldset>
        
        <div className="flex justify-between mt-6">
          <button 
            className="btn btn-neutral flex items-center gap-2" 
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            {t('userOptions.buttons.signOut')}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={saveSettings} 
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                {t('userOptions.buttons.saving')}
              </>
            ) : t('userOptions.buttons.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserOptionsModal;