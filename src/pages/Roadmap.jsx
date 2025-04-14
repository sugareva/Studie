import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Globe, X, ChevronRight, ChevronLeft, Award, BarChart3, BookOpen, CheckCircle, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import UserOptionsModal from '../components/UserOptionsModal';
import SkillDetailModal from '../components/SkillDetailModal';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';


const InfoModal = ({ isOpen, onClose, language }) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;
  
  const handleBackdropClick = (e) => {
    // Ferme la modale uniquement si on clique sur le fond et non sur le contenu
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-base-100 rounded-xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">{t('roadmap.infoTitle')}</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Empêche la propagation du clic vers le parent
              onClose();
            }} 
            className="btn btn-sm btn-circle"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm">{t('roadmap.infoDesc', { language })}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{t('roadmap.infoText')}</p>
        </div>
      </div>
    </div>
  );
};

const SkillCard = ({ skill, onToggle, isCompleted, isDisabled = false, onInfoClick }) => {
  const { id, title, hours } = skill;

  
    // Gestion séparée des clics avec failsafe
    const handleInfoClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Vérifier si la fonction existe avant de l'appeler
      if (!isDisabled && typeof onInfoClick === 'function') {
        onInfoClick(id, title);
      } else {
        console.warn(`Info click handler not available for skill ${id}`);
        // Action alternative
        alert(`Informations sur: ${title}`);
      }
    };
  


  const handleCheckboxChange = (e) => {
    e.preventDefault(); // Important pour éviter les doubles déclenchements sur mobile
    e.stopPropagation();
    if (!isDisabled) {
      onToggle(id);
    }
  };

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      isCompleted ? 'bg-primary/10 border-primary' : 'bg-base-100 border-gray-200'
    } ${isDisabled ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <div 
          className={`flex-1 ${!isDisabled ? 'cursor-pointer' : ''}`}
          onClick={handleInfoClick}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled}
        >
          <h3 className="font-medium text-base-content">{title}</h3>
          {hours && <p className="text-xs text-base-content">{hours}</p>}
        </div>
        
        {/* Bouton de checkbox séparé avec une zone de clic plus grande */}
        <div 
          className={`p-2 -mr-2 ${isDisabled ? 'opacity-60' : ''}`}
          onClick={handleCheckboxChange}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled}
        >
          <input
            type="checkbox"
            className="checkbox checkbox-primary pointer-events-none"
            checked={isCompleted}
            readOnly
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ section, completedSkills, onToggleSkill, isDisabled = false, onSkillInfoClick }) => {
  const { id, title, skills } = section;
  const [isOpen, setIsOpen] = useState(false);

  const totalSkills = skills.length;
  const completedCount = skills.filter(skill =>
    completedSkills.includes(skill.id)
  ).length;

  // Format fractionnel au lieu du pourcentage
  const progressText = `${completedCount}/${totalSkills}`;
  
  // On garde quand même le pourcentage pour la barre de progression
  const progressPercent = totalSkills > 0
    ? Math.round((completedCount / totalSkills) * 100)
    : 0;

  return (
    <div className={`bg-base-100 rounded-lg border border-base-300 p-4 mb-4 transition-all ${
      isDisabled ? 'opacity-70' : ''
    }`}>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <button
            className="flex items-center gap-2 text-lg font-semibold text-base-content hover:text-primary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isDisabled}
          >
            <h2>{title}</h2>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          <span className={`text-sm font-medium ${completedCount === totalSkills ? 'text-primary' : 'text-base-content'}`}>
            {progressText}
          </span>
        </div>
        <div className="w-full bg-base-200 rounded-full h-2.5">
          <div
            className={`${completedCount === totalSkills ? 'bg-primary' : 'bg-primary'} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {isOpen && !isDisabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-300">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isCompleted={completedSkills.includes(skill.id)}
              onToggle={onToggleSkill}
              isDisabled={isDisabled}
              onInfoClick={onSkillInfoClick}
            />
          ))}
        </div>
      )}
      {isOpen && isDisabled && (
         <p className="text-sm text-base-content italic mt-2">Complétez les niveaux précédents pour débloquer cette section.</p>
      )}
    </div>
  );
};

// Composant de carte de niveau miniature (pour la grille)
const LevelCardMini = ({ level, completedSkills, isDisabled, onClick, isSelected }) => {
  const { id, title, timeInfo } = level;

  const { t } = useTranslation();

  
  // Calcul de la progression
  const allSkills = level.sections.flatMap(section => section.skills);
  const totalSkills = allSkills.length;
  const completedCount = allSkills.filter(skill => completedSkills.includes(skill.id)).length;
  const progressPercent = totalSkills > 0 ? Math.round((completedCount / totalSkills) * 100) : 0;
  
  return (
    <div 
      className={`level-card bg-base-100 rounded-2xl shadow-md border-2 
                 ${isSelected ? 'level-card-selected border-primary' : 'border-base-200'} 
                 h-full flex flex-col justify-between p-5 
                 ${isDisabled ? 'level-card-disabled' : ''} 
                 ${!isDisabled ? 'cursor-pointer' : ''}`}
      onClick={isDisabled ? undefined : onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-base-content">
            {title.split(' ')[0]}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{timeInfo}</p>
        </div>
        {isDisabled && <Lock size={20} className="text-gray-400" />}
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">{t('goals.progress')}</span>
          <span className={`font-bold text-xl ${progressPercent === 100 ? 'text-primary' : 'text-primary'}`}>
            {progressPercent}<span className="text-sm">%</span>
          </span>
        </div>
        <div className="w-full bg-base-200 rounded-full h-3">
          <div
            className={`${progressPercent === 100 ? 'bg-primary' : 'bg-primary'} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Composant détaillé de niveau (affiché après clic)
const LevelDetailView = ({ level, completedSkills, onToggleSkill, isDisabled, onClose, onSkillInfoClick }) => {
  const { title, timeInfo, sections } = level;
  
  // Calcul de la progression globale
  const allSkills = sections.flatMap(section => section.skills);
  const totalSkills = allSkills.length;
  const completedCount = allSkills.filter(skill => completedSkills.includes(skill.id)).length;
  const progressPercent = totalSkills > 0 ? Math.round((completedCount / totalSkills) * 100) : 0;
  
  const { t } = useTranslation();
  
  return (
    <div className="bg-primary/10 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-content">{title}</h1>
          {timeInfo && <p className="text-sm text-primary-content">{timeInfo}</p>}
        </div>
        <button onClick={onClose} className="btn btn-circle btn-sm btn-ghost">
          <X size={20} />
        </button>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className="text-lg text-primary-content font-medium">{t('common.progress')}</span>
          <span className={`text-xl font-bold ${progressPercent === 100 ? 'text-primary' : 'text-primary-content'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-base-100 rounded-full h-3">
          <div
            className={`${progressPercent === 100 ? 'bg-primary' : 'bg-primary'} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
      
      <div className="rounded-xl">
        {isDisabled ? (
          <div className="text-center py-8">
            <Lock size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">{t('roadmap.levelLocked')}</h2>
            <p className="text-gray-500">{t('roadmap.completePreviousLevels')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                completedSkills={completedSkills}
                onToggleSkill={onToggleSkill}
                isDisabled={isDisabled}
                onSkillInfoClick={onSkillInfoClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant de progression globale



const ProgressSummary = ({ levels, completedSkills, onShowRemaining, currentLanguageName, onInfoClick }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false); // Ajoutez cette ligne
  
  // Détecter si on est sur mobile pour désactiver le bouton sur desktop
// Correction de la fonction de nettoyage dans useEffect pour éviter une fuite de mémoire

useEffect(() => {
  const checkIsMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  
  checkIsMobile();
  window.addEventListener('resize', checkIsMobile);
  
  return () => {
    window.removeEventListener('resize', checkIsMobile); // Notez le removeEventListener au lieu de addEventListener
  };
}, []);

  
  // Calculer la progression globale
  const allSkills = levels.flatMap(level => 
    level.data.sections.flatMap(section => section.skills)
  );
  const totalSkills = allSkills.length;
  const completedCount = allSkills.filter(skill => 
    completedSkills.includes(skill.id)
  ).length;
  
  const totalProgressPercent = totalSkills > 0 
    ? Math.round((completedCount / totalSkills) * 100) 
    : 0;
  
  // Trouver le niveau actuel basé sur la progression
  const getCurrentLevel = () => {
    for (let i = levels.length - 1; i >= 0; i--) {
      const levelSkills = levels[i].data.sections.flatMap(section => section.skills);
      const levelCompletedCount = levelSkills.filter(skill => 
        completedSkills.includes(skill.id)
      ).length;
      
      if (levelCompletedCount > 0) {
        return levels[i];
      }
    }
    return levels[0];
  };
  
  const currentLevel = getCurrentLevel();
  
  // Message d'encouragement basé sur le niveau
  const getEncouragementMessage = (levelId) => {
    // Les ID des niveaux sont: 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'
    switch(levelId) {
      case 'a1':
        return t('encouragement.a1');
      case 'a2':
        return t('encouragement.a2');
      case 'b1':
        return t('encouragement.b1');
      case 'b2':
        return t('encouragement.b2');
      case 'c1':
        return t('encouragement.c1');
      case 'c2':
        return t('encouragement.c2');
      default:
        return t('encouragement.default');
    }
  };
  
  return (
    <div className="bg-base-200 rounded-2xl border border-base-300 p-6 h-full">
      <div className="flex flex-col items-center text-center mb-6">
        {/* Badge de langue */}
        <div className="flex items-center gap-2 mb-4">
          <div className="badge badge-primary gap-2">
            <Globe size={14} />
            {currentLanguageName}
          </div>
          <button 
            className="btn btn-circle btn-xs btn-ghost text-primary"
            onClick={onInfoClick}
            aria-label="Informations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>
        </div>
        
        <div className="relative mb-4">
          <div className="bg-primary/10 rounded-full p-2">
            <Award size={36} className="text-primary" />
          </div>
          <span className="absolute -top-1 -right-1 bg-info text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {currentLevel.title}
          </span>
        </div>
        <h2 className="text-3xl font-bold text-base-content">
          {totalProgressPercent > 0 ? totalProgressPercent : 0}
          <span className="text-xl">%</span>
        </h2>
        <p className="text-sm text-base-content mt-1">{t('roadmap.globalProgress')}</p>
      </div>
      
      {/* Message d'encouragement */}
      <div className="bg-primary/10 rounded-xl p-4 mb-6 text-center">
        <p className="text-primary font-medium">
          {getEncouragementMessage(currentLevel.id)}
        </p>
      </div>
      
      <div className="w-full bg-base-100 rounded-full h-4 mb-8">
        <div
          className="bg-secondary h-4 rounded-full transition-all duration-300"
          style={{ width: `${totalProgressPercent}%` }}
        ></div>
      </div>
      
      
      <div className="space-y-3">
        <div className="bg-base-100 rounded-xl p-4 border border-base-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-base-content">{t('roadmap.acquiredSkills')}</span>
            <span className="font-bold text-primary">{completedCount}</span>
          </div>
        </div>
        <div 
          className={`bg-base-100 rounded-xl p-4 border border-base-200 ${
            isMobile 
              ? 'hover:bg-base-200 transition-colors cursor-pointer' 
              : 'opacity-70'
          }`}
          onClick={isMobile ? onShowRemaining : undefined}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-base-content">{t('roadmap.remainingSkills')}</span>
            <div className="flex items-center">
              <span className="font-bold text-base-content">{totalSkills - completedCount}</span>
              {isMobile && <ChevronRight size={16} className="text-primary ml-1" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
  const RemainingSkillsModal = ({ isOpen, onClose, levels, completedSkills, onSelectLevel, isLevelDisabled }) => {
    if (!isOpen) return null;
    
    const { t } = useTranslation();
    
    // Trouver les compétences restantes par niveau
    const remainingByLevel = levels.map(level => {
      const allSkills = level.data.sections.flatMap(section => section.skills);
      const remainingSkills = allSkills.filter(skill => !completedSkills.includes(skill.id));
      
      return {
        level: level,
        remaining: remainingSkills.length,
        total: allSkills.length
      };
    });
  
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">{t('roadmap.remainingSkillsTitle')}</h2>
            <button onClick={onClose} className="btn btn-sm btn-circle">
              <X size={16} />
            </button>
          </div>
          
          <div className="p-4">
            <div className="mb-6">
            <MobileCarousel 
  levels={levels} 
  completedSkills={completedSkills} 
  onSelectLevel={setSelectedLevel} 
  onToggleSkill={onToggleSkill}
  isLevelDisabled={isLevelDisabled}
  onSkillInfoClick={handleSkillInfoClick}
/>

            </div>
            
            <div className="space-y-3">
              {remainingByLevel.map(item => (
                <div 
                  key={item.level.id}
                  className={`p-3 rounded-lg border ${
                    item.remaining > 0 ? 'border-primary/30 bg-base-100' : 'border-success/30 bg-success/5'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.level.title}</span>
                    <span className={`${
                      item.remaining > 0 ? 'text-primary' : 'text-primary'
                    } font-bold`}>
                      {item.total - item.remaining}/{item.total}
                    </span>
                  </div>
                  {item.remaining > 0 && (
                    <button 
                      className="btn btn-xs btn-primary btn-outline w-full mt-2"
                      onClick={() => {
                        onSelectLevel(item.level.data);
                        onClose();
                      }}
                    >
                      {t('roadmap.continueLevel')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const MobileCarousel = ({ levels, completedSkills, onSelectLevel, isLevelDisabled, onSkillInfoClick, onToggleSkill}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const carouselRef = useRef(null);
  
    // Définir une fonction pour faire défiler vers un index spécifique
    const scrollToIndex = (index) => {
      if (carouselRef.current) {
        const container = carouselRef.current;
        const itemWidth = container.clientWidth;
        container.scrollTo({
          left: index * itemWidth,
          behavior: 'smooth'
        });
      }
      setActiveIndex(index);
    };
  
    // Naviguer vers le prochain élément
    const goToNext = () => {
      const nextIndex = activeIndex === levels.length - 1 ? 0 : activeIndex + 1;
      scrollToIndex(nextIndex);
    };
  
    // Naviguer vers l'élément précédent
    const goToPrev = () => {
      const prevIndex = activeIndex === 0 ? levels.length - 1 : activeIndex - 1;
      scrollToIndex(prevIndex);
    };
  
    // Gérer l'événement de défilement
    const handleScroll = useCallback(() => {
      if (!carouselRef.current) return;
      
      const container = carouselRef.current;
      const itemWidth = container.clientWidth;
      const index = Math.round(container.scrollLeft / itemWidth);
      
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    }, [activeIndex]);
  
    // Ajouter un écouteur d'événement pour le défilement
    useEffect(() => {
      const container = carouselRef.current;
      if (container) {
        container.addEventListener('scroll', handleScroll);
        return () => {
          container.removeEventListener('scroll', handleScroll);
        };
      }
    }, [handleScroll]);
  
    return (
      <div className="pb-5">
        <div className="flex items-center mb-4">
          <button onClick={goToPrev} className="btn btn-circle btn-sm mr-2 z-10 bg-white border-primary text-primary hover:bg-primary hover:text-white">
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex-1 overflow-hidden">
            <div 
              ref={carouselRef}
              className="flex w-full overflow-x-auto snap-x snap-mandatory snap-container"
            >
              {levels.map((level, index) => (
                <div 
                  key={level.id} 
                  className="snap-item w-full flex-shrink-0"
                  style={{ flexBasis: '100%' }}
                >
                  <div className={`h-40 carousel-animation ${index === activeIndex ? 'opacity-100' : 'opacity-95'}`}>
                    <LevelCardMini
                      level={level.data}
                      completedSkills={completedSkills}
                      isDisabled={isLevelDisabled(level.data)}
                      onClick={() => onSelectLevel(level.data)}
                      isSelected={index === activeIndex}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={goToNext} className="btn btn-circle btn-sm ml-2 z-10 bg-white border-primary text-primary hover:bg-primary hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="carousel-indicators">
          {levels.map((_, index) => (
            <button 
              key={index} 
              className={`carousel-indicator ${index === activeIndex ? 'carousel-indicator-active' : ''}`}
              onClick={() => scrollToIndex(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Détail du niveau actuel */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-base-200 mt-4 animate-fadeIn">
          <h2 className="text-lg font-bold text-primary mb-4">{levels[activeIndex].data.title}</h2>
          {levels[activeIndex].data.sections.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              completedSkills={completedSkills}
              onToggleSkill={onToggleSkill}
              isDisabled={isLevelDisabled(levels[activeIndex].data)}
              onSkillInfoClick={onSkillInfoClick}
            />
          ))}
        </div>
      </div>
    );
  };

  // Composant d'alerte pour l'information explicative
  const InfoAlert = ({ language, onClose }) => {
    const { t } = useTranslation();
    
    return (
      <div className="alert alert-info shadow-lg mb-6 animate-fadeIn">
        <div className="flex justify-between w-full">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div className="ml-2">
              <h3 className="font-bold">{t('roadmap.infoTitle')}</h3>
              <div className="text-sm">{t('roadmap.infoDesc', { language: language })}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={20} />
          </button>
        </div>
      </div>
    );
  };
// Page principale Roadmap redesignée
const RoadmapPage = () => {
  const [showRemainingModal, setShowRemainingModal] = useState(false);
  const [completedSkills, setCompletedSkills] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('french');
  const [isLoading, setIsLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [mobileView, setMobileView] = useState("progress");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [skillDetailModalOpen, setSkillDetailModalOpen] = useState(false);
const [selectedSkillInfo, setSelectedSkillInfo] = useState({ id: '', title: '' });

  
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSkillInfoClick = (skillId, skillTitle) => {
    setSelectedSkillInfo({ id: skillId, title: skillTitle });
    setSkillDetailModalOpen(true);
  };

  // Langues disponibles
  const languages = [
    { 
      id: 'french', 
      name: 'Français', 
      properties: {
        alphabet: 'latin',
        tones: false,
        cases: false,
        articles: true,
        genderSystem: true,
        verbConjugation: 'complex',
        honorificSystem: false
      },
      specificFeatures: ['liaison', 'elision', 'partitiveArticles']
    },
    { 
      id: 'english', 
      name: 'Anglais', 
      properties: {
        alphabet: 'latin',
        tones: false,
        cases: false,
        articles: true,
        genderSystem: false,
        verbConjugation: 'simple',
        honorificSystem: false
      },
      specificFeatures: ['irregularVerbs', 'phrasal verbs', 'gerund']
    },
    { 
      id: 'german', 
      name: 'Allemand', 
      properties: {
        alphabet: 'latin',
        tones: false,
        cases: true,
        articles: true,
        genderSystem: true,
        verbConjugation: 'moderate',
        honorificSystem: false
      },
      specificFeatures: ['compoundNouns', 'wordOrder', 'separableVerbs']
    },
    { 
      id: 'italian', 
      name: 'Italien', 
      properties: {
        alphabet: 'latin',
        tones: false,
        cases: false,
        articles: true,
        genderSystem: true,
        verbConjugation: 'complex',
        honorificSystem: false
      },
      specificFeatures: ['contractions', 'doubleConsonants', 'subjunctiveMood']
    },
    { 
      id: 'spanish', 
      name: 'Espagnol', 
      properties: {
        alphabet: 'latin',
        tones: false,
        cases: false,
        articles: true,
        genderSystem: true,
        verbConjugation: 'complex',
        honorificSystem: false
      },
      specificFeatures: ['subjunctiveMood', 'objectPronouns', 'serVsEstar']
    },
    { 
      id: 'japanese', 
      name: 'Japonais', 
      properties: {
        alphabet: 'mixed',
        tones: false,
        cases: true,
        articles: false,
        genderSystem: false,
        verbConjugation: 'agglutinative',
        honorificSystem: true
      },
      specificFeatures: ['kanji', 'hiragana', 'katakana', 'particles', 'counters', 'keigo']
    },
    { 
      id: 'korean', 
      name: 'Coréen', 
      properties: {
        alphabet: 'hangul',
        tones: false,
        cases: false,
        articles: false,
        genderSystem: false,
        verbConjugation: 'agglutinative',
        honorificSystem: true
      },
      specificFeatures: ['particles', 'counters', 'honorifics', 'sentenceEndings']
    },
    { 
      id: 'russian', 
      name: 'Russe', 
      properties: {
        alphabet: 'cyrillic',
        tones: false,
        cases: true,
        articles: false,
        genderSystem: true,
        verbConjugation: 'aspectual',
        honorificSystem: false
      },
      specificFeatures: ['verbAspect', 'motionVerbs', 'palatalization']
    }
  ];

  // Récupérer les propriétés de la langue sélectionnée
  const getLanguageProps = useCallback(() => {
    return languages.find(lang => lang.id === selectedLanguage) || languages[0];
  }, [selectedLanguage]);

  const getSkillsForSection = useCallback((sectionId, langProps) => {
    switch(sectionId) {
      // Niveau A1
      case 'a1_1': // Systèmes fondamentaux
        return [
          ...(langProps.properties.alphabet !== 'latin' ? [{ id: 'a1_1_1', title: t('roadmap.subsections.a1_1_1') }] : []),
          ...(langProps.properties.tones ? [{ id: 'a1_1_2', title: t('roadmap.subsections.a1_1_2')}] : []),
          { id: 'a1_1_3', title: t('roadmap.subsections.a1_1_3')},
          ...(langProps.properties.cases ? [{ id: 'a1_1_4', title: t('roadmap.subsections.a1_1_4')}] : []),
          ...(langProps.properties.articles ? [{ id: 'a1_1_5', title: t('roadmap.subsections.a1_1_5')}] : []),
          ...(langProps.properties.genderSystem ? [{ id: 'a1_1_6', title: t('roadmap.subsections.a1_1_6')}] : [])
        ].filter(Boolean);
      
      case 'a1_2': // Communication minimale
        return [
          { id: 'a1_2_1', title: t('roadmap.subsections.a1_2_1')},
          { id: 'a1_2_2', title: t('roadmap.subsections.a1_2_2')},
          { id: 'a1_2_3', title: t('roadmap.subsections.a1_2_3')}
        ];
      
      case 'a1_3': // Grammaire élémentaire
        return [
          { id: 'a1_3_1', title: t('roadmap.subsections.a1_3_1')},
          { id: 'a1_3_2', title: t('roadmap.subsections.a1_3_2')},
          { id: 'a1_3_3', title: t('roadmap.subsections.a1_3_3')},
          { id: 'a1_3_4', title: t('roadmap.subsections.a1_3_4')},
          ...(langProps.properties.honorificSystem ? [{ id: 'a1_3_5', title: t('roadmap.subsections.a1_3_5')}] : []),
          ...(langProps.specificFeatures.includes('particles') ? [{ id: 'a1_3_6', title: t('roadmap.subsections.a1_3_6')}] : [])
        ].filter(Boolean);
      
      // Niveau A2
      case 'a2_1': // Élargissement lexical
        return [
          { id: 'a2_1_1', title: t('roadmap.subsections.a2_1_1')},
          { id: 'a2_1_2', title: t('roadmap.subsections.a2_1_2')}
        ];
      
      case 'a2_2': // Grammaire fonctionnelle
        return [
          { id: 'a2_2_1', title: t('roadmap.subsections.a2_2_1')},
          { id: 'a2_2_2', title: t('roadmap.subsections.a2_2_2')},
          ...(langProps.properties.cases ? [{ id: 'a2_2_3', title: t('roadmap.subsections.a2_2_3')}] : []),
          ...(langProps.specificFeatures.includes('particles') ? [{ id: 'a2_2_4', title: t('roadmap.subsections.a2_2_4')}] : []),
          ...(langProps.properties.articles ? [{ id: 'a2_2_5', title: t('roadmap.subsections.a2_2_5')}] : []),
          ...(langProps.specificFeatures.includes('gerund') || langProps.specificFeatures.includes('phrasalVerbs') ? 
            [{ id: 'a2_2_6', title: t('roadmap.subsections.a2_2_6')}] : [])
        ].filter(Boolean);
      
      case 'a2_3': // Communication pratique
        return [
          { id: 'a2_3_1', title: t('roadmap.subsections.a2_3_1')},
          { id: 'a2_3_2', title: t('roadmap.subsections.a2_3_2')},
          { id: 'a2_3_3', title: t('roadmap.subsections.a2_3_3')},
          { id: 'a2_3_4', title: t('roadmap.subsections.a2_3_4')}
        ];
      
      // Niveau B1
      case 'b1_1': // Autonomie langagière
        return [
          { id: 'b1_1_1', title: t('roadmap.subsections.b1_1_1')},
          { id: 'b1_1_2', title: t('roadmap.subsections.b1_1_2')},
          { id: 'b1_1_3', title: t('roadmap.subsections.b1_1_3')}
        ];
      
      case 'b1_2': // Complexification grammaticale
        return [
          { id: 'b1_2_1', title: t('roadmap.subsections.b1_2_1')},
          ...(langProps.specificFeatures.includes('subjunctiveMood') ? [{ id: 'b1_2_2', title: t('roadmap.subsections.b1_2_2')}] : []),
          ...(langProps.properties.honorificSystem ? [{ id: 'b1_2_3', title: t('roadmap.subsections.b1_2_3')}] : []),
          ...(langProps.specificFeatures.includes('verbAspect') ? [{ id: 'b1_2_4', title: t('roadmap.subsections.b1_2_4')}] : []),
          ...(langProps.properties.honorificSystem ? [{ id: 'b1_2_5', title: t('roadmap.subsections.b1_2_5')}] : []),
          { id: 'b1_2_6', title: t('roadmap.subsections.b1_2_6'), hours: '5-10h' }
        ].filter(Boolean);
      
      case 'b1_3': // Expression personnelle
        return [
          { id: 'b1_3_1', title: t('roadmap.subsections.b1_3_1')},
          { id: 'b1_3_2', title: t('roadmap.subsections.b1_3_2')},
          { id: 'b1_3_3', title: t('roadmap.subsections.b1_3_3')}
        ];
      
      // Niveau B2
      case 'b2_1': // Maîtrise contextuelle
        return [
          { id: 'b2_1_1', title: t('roadmap.subsections.b2_1_1')},
          { id: 'b2_1_2', title: t('roadmap.subsections.b2_1_2')},
          { id: 'b2_1_3', title: t('roadmap.subsections.b2_1_3')}
        ];
      
      case 'b2_2': // Finesse grammaticale
        return [
          { id: 'b2_2_1', title: t('roadmap.subsections.b2_2_1')},
          { id: 'b2_2_2', title: t('roadmap.subsections.b2_2_2')},
          { id: 'b2_2_3', title: t('roadmap.subsections.b2_2_3')},
          { id: 'b2_2_4', title: t('roadmap.subsections.b2_2_4')},
          { id: 'b2_2_5', title: t('roadmap.subsections.b2_2_5')}
        ];
      
      case 'b2_3': // Expression élaborée
        return [
          { id: 'b2_3_1', title: t('roadmap.subsections.b2_3_1')},
          { id: 'b2_3_2', title: t('roadmap.subsections.b2_3_2')},
          { id: 'b2_3_3', title: t('roadmap.subsections.b2_3_3')}
        ];
      
      // Niveau C1
      case 'c1_1': // Compétence approfondie
        return [
          { id: 'c1_1_1', title: t('roadmap.subsections.c1_1_1')},
          { id: 'c1_1_2', title: t('roadmap.subsections.c1_1_2')},
          { id: 'c1_1_3', title: t('roadmap.subsections.c1_1_3')}
        ];
      
      case 'c1_2': // Subtilités linguistiques
        return [
          { id: 'c1_2_1', title: t('roadmap.subsections.c1_2_1')},
          { id: 'c1_2_2', title: t('roadmap.subsections.c1_2_2')},
          { id: 'c1_2_3', title: t('roadmap.subsections.c1_2_3')}
        ];
      
      case 'c1_3': // Communication sophistiquée
        return [
          { id: 'c1_3_1', title: t('roadmap.subsections.c1_3_1')},
          { id: 'c1_3_2', title: t('roadmap.subsections.c1_3_2')},
          { id: 'c1_3_3', title: t('roadmap.subsections.c1_3_3')}
        ];
      
      // Niveau C2
      case 'c2_1': // Excellence linguistique
        return [
          { id: 'c2_1_1', title: t('roadmap.subsections.c2_1_1')},
          { id: 'c2_1_2', title: t('roadmap.subsections.c2_1_2')},
          { id: 'c2_1_3', title: t('roadmap.subsections.c2_1_3')}
        ];
      
      case 'c2_2': // Nuances et finesses
        return [
          { id: 'c2_2_1', title: t('roadmap.subsections.c2_2_1')},
          { id: 'c2_2_2', title: t('roadmap.subsections.c2_2_2')},
          { id: 'c2_2_3', title: t('roadmap.subsections.c2_2_3')}
        ];
      
      case 'c2_3': // Communication native
        return [
          { id: 'c2_3_1', title: t('roadmap.subsections.c2_3_1')},
          { id: 'c2_3_2', title: t('roadmap.subsections.c2_3_2')},
          { id: 'c2_3_3', title: t('roadmap.subsections.c2_3_3')}
        ];
      
      default:
        return [];
    }
  }, [t]);

  // Fonctions pour générer les données des niveaux
  const getA1Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'a1',
      title: t('roadmap.levelDescription.a1'),
      timeInfo: '60-100h',
      sections: [
        {
          id: 'a1_1',
          title: t('roadmap.sections.fundamentalSystems'),
          skills: getSkillsForSection('a1_1', langProps)
        },
        {
          id: 'a1_2',
          title: t('roadmap.sections.minimalCommunication'),
          skills: getSkillsForSection('a1_2', langProps)
        },
        {
          id: 'a1_3',
          title: t('roadmap.sections.elementaryGrammar'),
          skills: getSkillsForSection('a1_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  const getA2Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'a2',
      title: t('roadmap.levelDescription.a2'),
      timeInfo: '80-120h',
      sections: [
        {
          id: 'a2_1',
          title: t('roadmap.sections.lexicalExpansion'),
          skills: getSkillsForSection('a2_1', langProps)
        },
        {
          id: 'a2_2',
          title: t('roadmap.sections.functionalGrammar'),
          skills: getSkillsForSection('a2_2', langProps)
        },
        {
          id: 'a2_3',
          title: t('roadmap.sections.practicalCommunication'),
          skills: getSkillsForSection('a2_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  // Fonctions similaires pour les niveaux B1, B2, C1 et C2
  const getB1Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'b1',
      title: t('roadmap.levelDescription.b1'),
      timeInfo: '150-180h',
      sections: [
        {
          id: 'b1_1',
          title: t('roadmap.sections.languageAutonomy'),
          skills: getSkillsForSection('b1_1', langProps)
        },
        {
          id: 'b1_2',
          title: t('roadmap.sections.grammaticalComplexity'),
          skills: getSkillsForSection('b1_2', langProps)
        },
        {
          id: 'b1_3',
          title: t('roadmap.sections.personalExpression'),
          skills: getSkillsForSection('b1_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  const getB2Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'b2',
      title: t('roadmap.levelDescription.b2'),
      timeInfo: '200-250h',
      sections: [
        {
          id: 'b2_1',
          title: t('roadmap.sections.contextualMastery'),
          skills: getSkillsForSection('b2_1', langProps)
        },
        {
          id: 'b2_2',
          title: t('roadmap.sections.grammaticalFinesse'),
          skills: getSkillsForSection('b2_2', langProps)
        },
        {
          id: 'b2_3',
          title: t('roadmap.sections.elaborateExpression'),
          skills: getSkillsForSection('b2_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  const getC1Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'c1',
      title: t('roadmap.levelDescription.c1'),
      timeInfo: '250-300h',
      sections: [
        {
          id: 'c1_1',
          title: t('roadmap.sections.deepCompetence'),
          skills: getSkillsForSection('c1_1', langProps)
        },
        {
          id: 'c1_2',
          title: t('roadmap.sections.linguisticSubtleties'),
          skills: getSkillsForSection('c1_2', langProps)
        },
        {
          id: 'c1_3',
          title: t('roadmap.sections.sophisticatedCommunication'),
          skills: getSkillsForSection('c1_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  const getC2Data = useCallback(() => {
    const langProps = getLanguageProps();
    
    return {
      id: 'c2',
      title: t('roadmap.levelDescription.c2'),
      timeInfo: '300-400h',
      sections: [
        {
          id: 'c2_1',
          title: t('roadmap.sections.linguisticExcellence'),
          skills: getSkillsForSection('c2_1', langProps)
        },
        {
          id: 'c2_2',
          title: t('roadmap.sections.nuancesAndFinesse'),
          skills: getSkillsForSection('c2_2', langProps)
        },
        {
          id: 'c2_3',
          title: t('roadmap.sections.nativeCommunication'),
          skills: getSkillsForSection('c2_3', langProps)
        }
      ]
    };
  }, [getLanguageProps, getSkillsForSection, t]);
  
  // 6. Fonction principale pour obtenir toutes les données
  const getLanguageRoadmap = useCallback(() => {
    return {
      a1: getA1Data(),
      a2: getA2Data(),
      b1: getB1Data(),
      b2: getB2Data(),
      c1: getC1Data(),
      c2: getC2Data()
    };
  }, [getA1Data, getA2Data, getB1Data, getB2Data, getC1Data, getC2Data]);

  // Chargement des données utilisateur
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setIsLoading(false);
        setErrorLoading("Utilisateur non connecté.");
        return;
      }

      setIsLoading(true);
      setErrorLoading(null);

      try {
        const [settingsResult, progressResult] = await Promise.all([
          supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),

          supabase
            .from('language_progress')
            .select('target_language, completed_skills')
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        if (settingsResult.error) {
          console.error('Erreur lors de la récupération des paramètres utilisateur:', settingsResult.error);
        } else {
          setUserSettings(settingsResult.data);
        }

        if (progressResult.error) {
          console.error('Erreur lors de la récupération de la progression linguistique:', progressResult.error);
          setErrorLoading("Erreur lors du chargement de votre progression.");
        } else {
          if (progressResult.data) {
            setSelectedLanguage(progressResult.data.target_language || 'french');
            setCompletedSkills(progressResult.data.completed_skills || []);
          } else {
            console.log("Aucune progression linguistique trouvée pour cet utilisateur. Utilisation des valeurs par défaut.");
          }
        }

      } catch (error) {
        console.error('Erreur globale lors de la récupération des données:', error);
        setErrorLoading("Une erreur est survenue lors du chargement des données.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Fonction pour activer/désactiver une compétence
  const handleToggleSkill = async (skillId) => {
    if (!user) {
      console.error("Utilisateur non connecté, impossible de sauvegarder la progression.");
      return;
    }

    const isCurrentlyCompleted = completedSkills.includes(skillId);
    const nextCompletedSkills = isCurrentlyCompleted
      ? completedSkills.filter(id => id !== skillId)
      : [...completedSkills, skillId];

    setCompletedSkills(nextCompletedSkills);

    try {
      const { error } = await supabase
        .from('language_progress')
        .update({ completed_skills: nextCompletedSkills })
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors de la sauvegarde de la progression:', error);
        setCompletedSkills(completedSkills);
      }
    } catch (dbError) {
      console.error('Erreur inattendue lors de la sauvegarde:', dbError);
      setCompletedSkills(completedSkills);
    }
  };

  // Gestionnaire pour la mise à jour des paramètres utilisateur
  const handleUpdateSettings = (updatedSettings) => {
    setUserSettings(updatedSettings);
  };

  // Récupération des données de roadmap
  const a1Data = getA1Data();
  const a2Data = getA2Data();
  const b1Data = getB1Data();
  const b2Data = getB2Data();
  const c1Data = getC1Data();
  const c2Data = getC2Data();

  // Fonction pour vérifier si un niveau est complété
  const isLevelCompleted = useCallback((levelData) => {
    if (!levelData || !levelData.sections) return false;
    const allSkills = levelData.sections.flatMap(section => section.skills || []);
    const totalSkills = allSkills.length;
    if (totalSkills === 0) return true;

    const completedCount = allSkills.filter(skill =>
      completedSkills.includes(skill.id)
    ).length;

    return completedCount === totalSkills;
  }, [completedSkills]);

  // Fonction pour vérifier si un niveau est désactivé
  const isLevelDisabled = useCallback((levelData) => {
    const levelId = levelData.id;
    
    if (levelId === 'a1') return false; // A1 est toujours actif
    if (levelId === 'a2') return !isLevelCompleted(a1Data);
    if (levelId === 'b1') return !isLevelCompleted(a1Data) || !isLevelCompleted(a2Data);
    if (levelId === 'b2') return !isLevelCompleted(a1Data) || !isLevelCompleted(a2Data) || !isLevelCompleted(b1Data);
    if (levelId === 'c1') return !isLevelCompleted(a1Data) || !isLevelCompleted(a2Data) || !isLevelCompleted(b1Data) || !isLevelCompleted(b2Data);
    if (levelId === 'c2') return !isLevelCompleted(a1Data) || !isLevelCompleted(a2Data) || !isLevelCompleted(b1Data) || !isLevelCompleted(b2Data) || !isLevelCompleted(c1Data);
    
    return false;
  }, [a1Data, a2Data, b1Data, b2Data, c1Data, isLevelCompleted]);

  // Trouver le nom complet de la langue sélectionnée
  const currentLanguageName = t(`roadmap.language.${selectedLanguage}`) || selectedLanguage;

  const levels = [
    { id: 'a1', title: 'A1', data: a1Data },
    { id: 'a2', title: 'A2', data: a2Data },
    { id: 'b1', title: 'B1', data: b1Data },
    { id: 'b2', title: 'B2', data: b2Data },
    { id: 'c1', title: 'C1', data: c1Data },
    { id: 'c2', title: 'C2', data: c2Data },
  ];

  // Affichage pendant le chargement ou en cas d'erreur
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary/10 flex justify-center items-center pt-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (errorLoading) {
    return (
      <div className="min-h-screen bg-primary/10 flex flex-col items-center justify-center pt-4">
        <Navbar onOpenUserModal={() => setIsModalOpen(true)} userSettings={userSettings} />
        <div className="text-center p-8">
          <h2 className="text-xl text-error font-semibold mb-4">Erreur</h2>
          <p>{errorLoading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col pt-4">
      <Navbar
        onOpenUserModal={() => setIsModalOpen(true)}
        userSettings={userSettings}
      />
  
      <div className="container mx-auto px-4 py-6 flex-1  sm:max-w-[80%]">
        {/* En-tête avec information sur la langue */}

  
        {/* Layout responsive */}
        <div className="h-full">
          {/* Version mobile: Progression en haut, carousel en bas */}
          <div className="md:hidden">
            {mobileView === "progress" ? (
              <div className="p-4">
                <ProgressSummary 
  levels={levels} 
  completedSkills={completedSkills} 
  onShowRemaining={() => setMobileView("levels")}
  currentLanguageName={currentLanguageName}
  onInfoClick={() => setShowInfoModal(true)}
/>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{t('roadmap.levels')}</h2>
                  <button 
                    onClick={() => setMobileView("progress")}
                    className="btn btn-sm btn-circle btn-ghost"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <MobileCarousel 
  levels={levels} 
  completedSkills={completedSkills} 
  onSelectLevel={setSelectedLevel} 
  onToggleSkill={handleToggleSkill}
  isLevelDisabled={isLevelDisabled}
  onSkillInfoClick={handleSkillInfoClick}
/>

              </div>
            )}
            
            {/* Vue détaillée d'un niveau en plein écran sur mobile quand on clique sur une carte */}
            {selectedLevel && (
              <div className="fixed inset-0 bg-base-100 z-50 p-4 overflow-y-auto">
                <LevelDetailView
  level={selectedLevel}
  completedSkills={completedSkills}
  onToggleSkill={handleToggleSkill}
  isDisabled={isLevelDisabled(selectedLevel)}
  onClose={() => setSelectedLevel(null)}
  onSkillInfoClick={handleSkillInfoClick}
/>

              </div>
            )}
          </div>
  
          {/* Version desktop: Progression à gauche, grid au milieu, détail à droite */}
          <div className="hidden md:grid md:grid-cols-12 gap-6 h-[calc(100vh-16rem)]">
            {/* Panneau de progression - augmenté en largeur */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="sticky top-20 h-full">
              <ProgressSummary 
  levels={levels} 
  completedSkills={completedSkills} 
  onShowRemaining={() => {}}
  currentLanguageName={currentLanguageName}
  onInfoClick={() => setShowInfoModal(true)}
/>
              </div>
            </div>
            
            {/* Grille de niveaux ou détail */}
            {!selectedLevel ? (
              <div className="md:col-span-8 lg:col-span-9">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 h-full pr-2">
                  {levels.map((level) => (
                    <LevelCardMini
                      key={level.id}
                      level={level.data}
                      completedSkills={completedSkills}
                      isDisabled={isLevelDisabled(level.data)}
                      onClick={() => setSelectedLevel(level.data)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="md:col-span-8 lg:col-span-9 grid md:grid-cols-12 gap-5 h-full overflow-y-auto">
                {/* Grille réduite à gauche - une seule colonne mais scrollable */}
                <div className="md:col-span-4 h-full overflow-y-auto pr-2 hide-scrollbar">
                  <div className="grid grid-cols-1 gap-4">
                    {levels.map((level) => (
                      <LevelCardMini
                        key={level.id}
                        level={level.data}
                        completedSkills={completedSkills}
                        isDisabled={isLevelDisabled(level.data)}
                        isSelected={selectedLevel.id === level.data.id}
                        onClick={() => setSelectedLevel(level.data)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Détail du niveau à droite - plus large */}
                <div className="md:col-span-8">
                <LevelDetailView
  level={selectedLevel}
  completedSkills={completedSkills}
  onToggleSkill={handleToggleSkill}
  isDisabled={isLevelDisabled(selectedLevel)}
  onClose={() => setSelectedLevel(null)}
  onSkillInfoClick={handleSkillInfoClick}
/>

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  
      {/* Modal pour les paramètres utilisateur */}
      <UserOptionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={user}
        onUpdateSettings={handleUpdateSettings}
        onSignOut={signOut}
      />
      <SkillDetailModal
  isOpen={skillDetailModalOpen}
  onClose={() => setSkillDetailModalOpen(false)}
  skillId={selectedSkillInfo.id}
  skillTitle={selectedSkillInfo.title}
  targetLanguage={selectedLanguage}
/>
      <InfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
        language={currentLanguageName}
      />
    </div>
  );
};

export default RoadmapPage;

    