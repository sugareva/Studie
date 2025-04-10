import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Globe, X, ChevronRight, ChevronLeft, Award, BarChart3, BookOpen, CheckCircle, Lock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import UserOptionsModal from '../components/UserOptionsModal';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

// Nous gardons les mêmes composants avec une UI améliorée
const SkillCard = ({ skill, onToggle, isCompleted, isDisabled = false }) => {
  const { id, title, hours } = skill;

  return (
    <div className={`border rounded-lg p-3 transition-all ${
      isCompleted ? 'bg-primary/10 border-primary' : 'bg-base-100 border-gray-200'
    } ${isDisabled ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-base-content">{title}</h3>
          {hours && <p className="text-xs text-base-content ">{hours}</p>}
        </div>
        <label className={`${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={isCompleted}
            onChange={() => onToggle(id)}
            disabled={isDisabled}
          />
        </label>
      </div>
    </div>
  );
};

const SectionCard = ({ section, completedSkills, onToggleSkill, isDisabled = false }) => {
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
  
        {/* Le reste du code reste identique */}
        {isOpen && !isDisabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-300">
            {skills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isCompleted={completedSkills.includes(skill.id)}
                onToggle={onToggleSkill}
                isDisabled={isDisabled}
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
const LevelDetailView = ({ level, completedSkills, onToggleSkill, isDisabled, onClose }) => {
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
        
        <div className=" rounded-xl">
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
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

// Composant de progression globale



const ProgressSummary = ({ levels, completedSkills, onShowRemaining, currentLanguageName }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(false);
  
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
        <div className="badge badge-primary gap-2 mb-4">
          <Globe size={14} />
          {currentLanguageName}
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
                onSelectLevel={(level) => {
                  onSelectLevel(level);
                  onClose();
                }} 
                isLevelDisabled={isLevelDisabled}
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
  
  const MobileCarousel = ({ levels, completedSkills, onSelectLevel, isLevelDisabled }) => {
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
              onToggleSkill={() => {}} // Lecture seule dans ce mode
              isDisabled={isLevelDisabled(levels[activeIndex].data)}
            />
          ))}
        </div>
      </div>
    );
  };

  // Composant d'alerte pour l'information explicative
const InfoAlert = ({ language, onClose }) => {
  const { t } = useTranslation();
  
  
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
  const [showInfoAlert, setShowInfoAlert] = useState(true);
  
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  // Langues disponibles
  const languages = [
    { id: 'french', name: 'Français', hasLatinAlphabet: true, hasTones: false, hasSpecificCases: false },
    { id: 'english', name: 'Anglais', hasLatinAlphabet: true, hasTones: false, hasSpecificCases: false },
    { id: 'german', name: 'Allemand', hasLatinAlphabet: true, hasTones: false, hasSpecificCases: true },
    { id: 'italian', name: 'Italien', hasLatinAlphabet: true, hasTones: false, hasSpecificCases: false },
    { id: 'spanish', name: 'Espagnol', hasLatinAlphabet: true, hasTones: false, hasSpecificCases: false },
    { id: 'japanese', name: 'Japonais', hasLatinAlphabet: false, hasTones: false, hasSpecificCases: false },
    { id: 'korean', name: 'Coréen', hasLatinAlphabet: false, hasTones: false, hasSpecificCases: false },
    { id: 'russian', name: 'Russe', hasLatinAlphabet: false, hasTones: false, hasSpecificCases: true },
  ];

  // Récupérer les propriétés de la langue sélectionnée
  const getLanguageProps = useCallback(() => {
    return languages.find(lang => lang.id === selectedLanguage) || languages[0];
  }, [selectedLanguage]);

  // Fonctions pour générer les données des niveaux
  // Note: ici on utiliserait les fonctions de génération de données du code original
  // Je simplifie pour l'exemple
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
            skills: [
              ...(langProps.hasLatinAlphabet ? [] : [{ id: 'a1_1_1', title: t('roadmap.subsections.a1_1_1'), hours: '5-20h' }]),
              ...(langProps.hasTones ? [{ id: 'a1_1_2', title: t('roadmap.subsections.a1_1_2'), hours: '10-20h' }] : []),
              { id: 'a1_1_3', title: t('roadmap.subsections.a1_1_3'), hours: '5-10h' },
              ...(langProps.hasSpecificCases ? [{ id: 'a1_1_4', title: t('roadmap.subsections.a1_1_4'), hours: '10-15h' }] : [])
            ].filter(Boolean) // Filtre les éléments potentiellement vides
          },
          {
            id: 'a1_2',
            title: t('roadmap.sections.minimalCommunication'),
            skills: [
              { id: 'a1_2_1', title: t('roadmap.subsections.a1_2_1'), hours: '20-30h' },
              { id: 'a1_2_2', title: t('roadmap.subsections.a1_2_2'), hours: '5-10h' },
              { id: 'a1_2_3', title: t('roadmap.subsections.a1_2_3'), hours: '5-10h' }
            ]
          },
          {
            id: 'a1_3',
            title: t('roadmap.sections.elementaryGrammar'),
            skills: [
              { id: 'a1_3_1', title: t('roadmap.subsections.a1_3_1'), hours: '10-15h' },
              { id: 'a1_3_2', title: t('roadmap.subsections.a1_3_2'), hours: '5h' },
              { id: 'a1_3_3', title: t('roadmap.subsections.a1_3_3'), hours: '5-10h' },
              { id: 'a1_3_4', title: t('roadmap.subsections.a1_3_4'), hours: '5h' }
            ]
          }
        ]
      };
    }, [getLanguageProps]);
  
  // Fonction pour générer les données du niveau A2 adaptées à la langue sélectionnée
  const getA2Data = useCallback(() => {
    const langProps = getLanguageProps();
  
    return {
      id: 'a2',
      title: t('roadmap.levelDescription.a2'),
      timeInfo: '80-100h',
      sections: [
        {
          id: 'a2_1',
          title: t('roadmap.sections.lexicalExpansion'),
          skills: [
            { id: 'a2_1_1', title: t('roadmap.subsections.a2_1_1'), hours: '30-40h' },
            { id: 'a2_1_2', title: t('roadmap.subsections.a2_1_2'), hours: '10h' }
          ]
        },
        {
          id: 'a2_2',
          title: t('roadmap.sections.functionalGrammar'),
          skills: [
            { id: 'a2_2_1', title: t('roadmap.subsections.a2_2_1'), hours: '15-20h' },
            { id: 'a2_2_2', title: t('roadmap.subsections.a2_2_2'), hours: '10h' },
            ...(langProps.hasSpecificCases ? [{ id: 'a2_2_3', title: t('roadmap.subsections.a2_2_3'), hours: '15-20h' }] : []),
            ...(langProps.id === 'japanese' || langProps.id === 'korean' ? [{ id: 'a2_2_4', title: t('roadmap.subsections.a2_2_4'), hours: '15h' }] : [])
          ].filter(Boolean)
        },
        {
          id: 'a2_3',
          title: t('roadmap.sections.practicalCommunication'),
          skills: [
            { id: 'a2_3_1', title: t('roadmap.subsections.a2_3_1'), hours: '10h' },
            { id: 'a2_3_2', title: t('roadmap.subsections.a2_3_2'), hours: '5h' },
            { id: 'a2_3_3', title: t('roadmap.subsections.a2_3_3'), hours: '15h' },
            { id: 'a2_3_4', title: t('roadmap.subsections.a2_3_4'), hours: '5-10h' }
          ]
        }
      ]
    };
  }, [getLanguageProps]);
  
  // Fonction pour générer les données du niveau B1 adaptées à la langue sélectionnée
  const getB1Data = useCallback(() => {
    const langProps = getLanguageProps();
  
    return {
      id: 'b1',
      title: t('roadmap.levelDescription.b1'),
      timeInfo: '150-200h',
      sections: [
        {
          id: 'b1_1',
          title: t('roadmap.sections.languageAutonomy'),
          skills: [
            { id: 'b1_1_1', title: t('roadmap.subsections.b1_1_1'), hours: '50-60h' },
            { id: 'b1_1_2', title: t('roadmap.subsections.b1_1_2'), hours: '30-40h' },
            { id: 'b1_1_3', title: t('roadmap.subsections.b1_1_3'), hours: '30h' }
          ]
        },
        {
          id: 'b1_2',
          title: t('roadmap.sections.grammaticalComplexity'),
          skills: [
            { id: 'b1_2_1', title: t('roadmap.subsections.b1_2_1'), hours: '15-20h' },
            ...(langProps.id === 'french' || langProps.id === 'spanish' || langProps.id === 'italian' || langProps.id === 'russian' ?
              [{ id: 'b1_2_2', title: t('roadmap.subsections.b1_2_2'), hours: '20-30h' }] : []),
            ...(langProps.id === 'japanese' || langProps.id === 'korean' ?
              [{ id: 'b1_2_3', title: t('roadmap.subsections.b1_2_3'), hours: '20-30h' }] : []),
            ...(langProps.id === 'russian' ?
              [{ id: 'b1_2_4', title: t('roadmap.subsections.b1_2_4'), hours: '15-20h' }] : [])
          ].filter(Boolean)
        },
        {
          id: 'b1_3',
          title: t('roadmap.sections.personalExpression'),
          skills: [
            { id: 'b1_3_1', title: t('roadmap.subsections.b1_3_1'), hours: '15h' },
            { id: 'b1_3_2', title: t('roadmap.subsections.b1_3_2'), hours: '15h' },
            { id: 'b1_3_3', title: t('roadmap.subsections.b1_3_3'), hours: '10h' }
          ]
        }
      ]
    };
  }, [getLanguageProps]);
  
  // Fonction pour générer les données du niveau B2 adaptées à la langue sélectionnée
  const getB2Data = useCallback(() => {
    const langProps = getLanguageProps();
  
    return {
      id: 'b2',
      title: t('roadmap.levelDescription.b2'),
      timeInfo: '150-200h',
      sections: [
        {
          id: 'b2_1',
          title: t('roadmap.sections.contextualMastery'),
          skills: [
            { id: 'b2_1_1', title: t('roadmap.subsections.b2_1_1'), hours: '60-80h' },
            { id: 'b2_1_2', title: t('roadmap.subsections.b2_1_2'), hours: '40h' },
            { id: 'b2_1_3', title: t('roadmap.subsections.b2_1_3'), hours: '10-20h' }
          ]
        },
        {
          id: 'b2_2',
          title: t('roadmap.sections.grammaticalFinesse'),
          skills: [
            { id: 'b2_2_1', title: t('roadmap.subsections.b2_2_1'), hours: '40h' },
            { id: 'b2_2_2', title: t('roadmap.subsections.b2_2_2'), hours: '10-15h' },
            { id: 'b2_2_3', title: t('roadmap.subsections.b2_2_3'), hours: '15-20h' }
          ]
        },
        {
          id: 'b2_3',
          title: t('roadmap.sections.elaborateExpression'),
          skills: [
            { id: 'b2_3_1', title: t('roadmap.subsections.b2_3_1'), hours: '20h' },
            { id: 'b2_3_2', title: t('roadmap.subsections.b2_3_2'), hours: '15h' },
            { id: 'b2_3_3', title: t('roadmap.subsections.b2_3_3'), hours: '15h' }
          ]
        }
      ]
    };
  }, [getLanguageProps]);
  
  // Fonction pour générer les données du niveau C1 adaptées à la langue sélectionnée
  const getC1Data = useCallback(() => {
    // Pas de dépendance spécifique à la langue dans cet exemple C1, mais on garde la structure pour la cohérence
    // const langProps = getLanguageProps();
    return {
      id: 'c1',
      title: t('roadmap.levelDescription.c1'),
      timeInfo: '+200h',
      sections: [
        {
          id: 'c1_1',
          title: t('roadmap.sections.deepCompetence'),
          skills: [
            { id: 'c1_1_1', title: t('roadmap.subsections.c1_1_1'), hours: '80-100h' },
            { id: 'c1_1_2', title: t('roadmap.subsections.c1_1_2'), hours: '40h' },
            { id: 'c1_1_3', title: t('roadmap.subsections.c1_1_3'), hours: '20-30h' }
          ]
        },
        {
          id: 'c1_2',
          title: t('roadmap.sections.linguisticSubtleties'),
          skills: [
            { id: 'c1_2_1', title: t('roadmap.subsections.c1_2_1'), hours: '30h' },
            { id: 'c1_2_2', title: t('roadmap.subsections.c1_2_2'), hours: '30h' },
            { id: 'c1_2_3', title: t('roadmap.subsections.c1_2_3'), hours: '30h' }
          ]
        },
        {
          id: 'c1_3',
          title: t('roadmap.sections.sophisticatedCommunication'),
          skills: [
            { id: 'c1_3_1', title: t('roadmap.subsections.c1_3_1'), hours: '20h' },
            { id: 'c1_3_2', title: t('roadmap.subsections.c1_3_2'), hours: '20h' },
            { id: 'c1_3_3', title: t('roadmap.subsections.c1_3_3'), hours: '20h' }
          ]
        }
      ]
    };
  }, [getLanguageProps]); // Garder la dépendance au cas où
  
  // Fonction pour générer les données du niveau C2 adaptées à la langue sélectionnée
  const getC2Data = useCallback(() => {
    // Pas de dépendance spécifique à la langue dans cet exemple C2
    // const langProps = getLanguageProps();
    return {
      id: 'c2',
      title: t('roadmap.levelDescription.c2'),
      timeInfo: '+200-400h',
      sections: [
        {
          id: 'c2_1',
          title: t('roadmap.sections.linguisticExcellence'),
          skills: [
            { id: 'c2_1_1', title: t('roadmap.subsections.c2_1_1'), hours: '100-150h' },
            { id: 'c2_1_2', title: t('roadmap.subsections.c2_1_2'), hours: '50h' },
            { id: 'c2_1_3', title: t('roadmap.subsections.c2_1_3'), hours: '50h' }
          ]
        },
        {
          id: 'c2_2',
          title: t('roadmap.sections.nuancesAndFinesse'),
          skills: [
            { id: 'c2_2_1', title: t('roadmap.subsections.c2_2_1'), hours: '30h' },
            { id: 'c2_2_2', title: t('roadmap.subsections.c2_2_2'), hours: '50h' },
            { id: 'c2_2_3', title: t('roadmap.subsections.c2_2_3'), hours: '30-50h' }
          ]
        },
        {
          id: 'c2_3',
          title: t('roadmap.sections.nativeCommunication'),
          skills: [
            { id: 'c2_3_1', title: t('roadmap.subsections.c2_3_1'), hours: '30-50h' },
            { id: 'c2_3_2', title: t('roadmap.subsections.c2_3_2'), hours: '30h' },
            { id: 'c2_3_3', title: t('roadmap.subsections.c2_3_3'), hours: '30h' }
          ]
        }
      ]
    };
  }, [getLanguageProps]); // Garder la dépendance au cas où
  

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
  const currentLanguageName = languages.find(lang => lang.id === selectedLanguage)?.name || selectedLanguage;

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
  
      <div className="container mx-auto px-4 py-6 flex-1">
        {/* En-tête avec information sur la langue */}
        
        {/* Alerte informative qu'on peut fermer */}
        {showInfoAlert && (
          <InfoAlert 
            language={currentLanguageName} 
            onClose={() => setShowInfoAlert(false)} 
          />
        )}
  
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
                  isLevelDisabled={isLevelDisabled}
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
    </div>
  );
};

export default RoadmapPage;

    