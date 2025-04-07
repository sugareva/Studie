import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useEffect } from 'react';
import { saveUserLanguage, getUserLanguage } from '../services/languageService';

const LanguageSwitcher = ({ minimal = false }) => {
  const { i18n } = useTranslation();
  
  // Récupère la langue de l'utilisateur depuis Supabase au chargement
  useEffect(() => {
    const fetchUserLanguage = async () => {
      const { language } = await getUserLanguage();
      if (language && language !== i18n.language) {
        i18n.changeLanguage(language);
      }
    };
    
    fetchUserLanguage();
  }, [i18n]);
  
  const changeLanguage = async (lng) => {
    i18n.changeLanguage(lng);
    await saveUserLanguage(lng);
  };
  
  // Version minimale pour la page de login
  if (minimal) {
    return (
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-ghost btn-sm btn-circle">
          <Globe className="h-5 w-5" />
        </label>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-auto">
          <li>
            <button 
              onClick={() => changeLanguage('fr')} 
              className={`flex items-center gap-2 ${i18n.language === 'fr' ? 'font-bold text-primary' : ''}`}
            >
              <span className="text-lg">🇫🇷</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => changeLanguage('en')} 
              className={`flex items-center gap-2 ${i18n.language === 'en' ? 'font-bold text-primary' : ''}`}
            >
              <span className="text-lg">🇬🇧</span>
            </button>
          </li>
        </ul>
      </div>
    );
  }
  
  // Version complète pour la navbar
  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle">
        <span className="text-xl">{i18n.language === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
      </label>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
        <li>
          <button 
            onClick={() => changeLanguage('fr')} 
            className={i18n.language === 'fr' ? 'active' : ''}
          >
            🇫🇷 Français
          </button>
        </li>
        <li>
          <button 
            onClick={() => changeLanguage('en')} 
            className={i18n.language === 'en' ? 'active' : ''}
          >
            🇬🇧 English
          </button>
        </li>
      </ul>
    </div>
  );
};

export default LanguageSwitcher;