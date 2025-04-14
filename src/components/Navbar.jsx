// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { User, Grid, BarChart2, Sun, Moon, Map, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

function Navbar({ onOpenUserModal, userSettings: propUserSettings, learningLanguage }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [userSettings, setUserSettings] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Récupérer le thème du localStorage ou utiliser le thème par défaut
    return localStorage.getItem('theme') || 'bumblebee';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Appliquer le thème au chargement et lors des changements
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Utiliser les paramètres fournis en props s'ils existent
  useEffect(() => {
    if (propUserSettings) {
      setUserSettings(propUserSettings);
    }
  }, [propUserSettings]);
  
  // Charger les paramètres de l'utilisateur au chargement
  useEffect(() => {
    let isMounted = true;
    
    async function fetchUserSettings() {
      if (!user || propUserSettings) return;
      
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error(t('navbar.errors.fetchSettingsError'), error);
          return;
        }
        
        if (data && isMounted) {
          setUserSettings(data);
        }
      } catch (error) {
        console.error(t('navbar.errors.fetchSettingsCatchError'), error);
      }
    }
    
    fetchUserSettings();
    
    return () => {
      isMounted = false;
    };
  }, [user, propUserSettings, t]);

  // Fonction qui gère l'ouverture de la modale
  const handleOpenModal = () => {
    if (onOpenUserModal && typeof onOpenUserModal === 'function') {
      onOpenUserModal();
      setIsMenuOpen(false); // Fermer le menu après avoir ouvert la modale
    } else {
      console.error(t('navbar.errors.invalidOpenModalFunction'));
    }
  };

  // Basculer entre les thèmes clair et sombre
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'bumblebee' ? 'dark' : 'bumblebee');
  };

  // Toggle le menu mobile
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fonction pour vérifier si le chemin actuel correspond à la page dashboard
  const isDashboardActive = () => {
    return location.pathname === '/' || location.pathname === '/dashboard';
  };

  return (
    <div className="w-full flex justify-center">
      <div className="navbar bg-base-100 rounded-box mb-4 max-w-[90%] sm:max-w-[80%] w-full">
        <div className="flex flex-1">
          {/* Lien vers dashboard depuis le titre de l'application */}
          <Link to="/dashboard" className="px-4 text-2xl app-title hover:opacity-80 transition-opacity">
            Studie
          </Link>
          
          {/* Navigation links - visible sur desktop, caché sur mobile */}
          <div className="hidden sm:flex gap-2">
            <Link
              to="/dashboard"
              className={`tab ${isDashboardActive() ? 'tab-active' : ''}`}
            >
              <Grid size={16} className="mr-1" />
              {t('navbar.links.dashboard')}
            </Link>
            
            <Link
              to="/activity"
              className={`tab ${location.pathname === '/activity' ? 'tab-active' : ''}`}
            >
              <BarChart2 size={16} className="mr-1" />
              {t('navbar.links.activity')}
            </Link>
            
          </div>
        </div>
        
        {/* Actions Desktop - visible sur desktop, caché sur mobile */}
        <div className="flex-none hidden sm:flex items-center gap-3">
          
          {/* Bouton pour basculer entre les thèmes */}
          <button 
            className="btn btn-ghost btn-circle" 
            onClick={toggleTheme}
            aria-label={theme === 'bumblebee' 
              ? t('navbar.buttons.enableDarkModeAriaLabel')
              : t('navbar.buttons.enableLightModeAriaLabel')
            }
          >
            {theme === 'bumblebee' ? (
              <Moon size={20} /> // Icône de lune pour le mode sombre
            ) : (
              <Sun size={20} /> // Icône de soleil pour le mode clair
            )}
          </button>
          
          {/* Bouton du profil utilisateur */}
          <button 
            className="btn btn-ghost" 
            onClick={handleOpenModal}
          >
            <div className="flex items-center gap-2">
              {userSettings?.avatar ? (
                <div className="avatar">
                  <div className="w-8 h-8 rounded-full">
                    <img src={userSettings.avatar} alt={t('navbar.images.avatarAlt')} />
                  </div>
                </div>
              ) : (
                <div className="avatar placeholder">
                  <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                    <User size={16} />
                  </div>
                </div>
              )}
              <span>{userSettings?.nickname || user?.email}</span>
            </div>
          </button>
        </div>
        
        {/* Bouton de menu burger - visible uniquement sur mobile */}
        <div className="flex-none sm:hidden">
          <button 
            className="btn btn-ghost btn-circle" 
            onClick={toggleMenu}
            aria-label={isMenuOpen 
              ? t('navbar.buttons.closeMenuAriaLabel') 
              : t('navbar.buttons.openMenuAriaLabel')
            }
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Menu mobile - s'affiche lorsque le menu est ouvert */}
      {isMenuOpen && (
        <div className="fixed top-16 left-0 w-full flex justify-center z-50 sm:hidden">
          <div className="max-w-[80%] w-full mx-auto bg-base-100 shadow-lg rounded-box p-4 flex flex-col gap-4">
            <Link 
              to="/dashboard" 
              className={`btn justify-start ${isDashboardActive() ? 'btn-soft btn-secondary' : 'btn-ghost'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Grid size={16} className="mr-2" />
              {t('navbar.links.dashboard')}
            </Link>
            <Link 
              to="/activity" 
              className={`btn justify-start ${location.pathname === '/activity' ? 'btn-soft btn-secondary' : 'btn-ghost'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              <BarChart2 size={16} className="mr-2" />
              {t('navbar.links.activity')}
            </Link>
            
            
            <div className="divider"></div>
            
            {/* Bouton pour basculer entre les thèmes */}
            <button 
              className="btn btn-ghost justify-start" 
              onClick={toggleTheme}
            >
              {theme === 'bumblebee' ? (
                <><Moon size={20} className="mr-2" /> {t('navbar.buttons.darkMode')}</>
              ) : (
                <><Sun size={20} className="mr-2" /> {t('navbar.buttons.lightMode')}</>
              )}
            </button>
            
            {/* Bouton du profil utilisateur */}
            <button 
              className="btn btn-ghost justify-start" 
              onClick={handleOpenModal}
            >
              <div className="flex items-center gap-2">
                {userSettings?.avatar ? (
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                      <img src={userSettings.avatar} alt={t('navbar.images.avatarAlt')} />
                    </div>
                  </div>
                ) : (
                  <div className="avatar placeholder">
                    <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                      <User size={16} />
                    </div>
                  </div>
                )}
                <span>{userSettings?.nickname || user?.email}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;