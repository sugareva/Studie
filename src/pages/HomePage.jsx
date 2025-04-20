// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { 
  Moon, Sun, Play, Pause, RotateCcw, 
  StopCircle, Maximize, Minimize, 
  Volume2, VolumeX, Coffee, X,
  CheckCircle, Brain, BarChart2, Target, Check
} from 'lucide-react';

// URL de la chaîne lofi girl par défaut
const DEFAULT_LOFI_URL = 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1';

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPomodoroMode, setIsPomodoroMode] = useState(true);
  const [pomodoroSession, setPomodoroSession] = useState('focus');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const mainContentRef = useRef(null);
  
  // Paramètres Pomodoro
  const pomodoroFocusTime = 25 * 60; // 25 minutes
  const pomodoroBreakTime = 5 * 60; // 5 minutes

  // Détecter et initialiser le thème
  useEffect(() => {
    // Récupérer le thème du localStorage
    const savedTheme = localStorage.getItem('theme') || 'bumblebee';
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Vérifier si l'alerte a déjà été fermée
    const alertClosed = localStorage.getItem('alertClosed');
    if (alertClosed === 'true') {
      setShowAlert(false);
    } else {
      setShowAlert(true);
    }
  }, []);

  // Mettre à jour le timer à intervalles réguliers
  useEffect(() => {
    let intervalId;
    
    if (isRunning) {
      // Mettre à jour l'affichage à intervalles réguliers
      intervalId = setInterval(() => {
        setDisplayTime(prevTime => {
          const newTime = prevTime + 1;
          
          // Gestion du mode pomodoro
          if (isPomodoroMode) {
            const sessionElapsed = newTime % (pomodoroFocusTime + pomodoroBreakTime);
            
            if (pomodoroSession === 'focus' && sessionElapsed >= pomodoroFocusTime) {
              // Transition de focus à pause
              setPomodoroSession('break');
              // Jouer le son de notification
              playNotificationSound();
            } else if (pomodoroSession === 'break' && sessionElapsed < pomodoroFocusTime) {
              // Transition de pause à focus
              setPomodoroSession('focus');
              // Jouer le son de notification
              playNotificationSound();
            }
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, isPomodoroMode, pomodoroSession]);
  
  // Fonction pour jouer le son de notification
  const playNotificationSound = () => {
    try {
      const notification = new Audio('/notification.mp3');
      notification.volume = 0.7; // Ajuster le volume à 70%
      notification.play().catch(e => console.log('Audio playback failed:', e));
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  };
  
  // Fonctions de contrôle du timer
  const startTimer = () => {
    setIsRunning(true);
  };
  
  const pauseTimer = () => {
    setIsRunning(false);
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setDisplayTime(0);
    setPomodoroSession('focus');
  };
  
  const togglePomodoroMode = () => {
    setIsPomodoroMode(prev => !prev);
    setPomodoroSession('focus'); // Reset to focus mode when toggling
    resetTimer();
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    
    // Activer YouTube automatiquement en mode plein écran si ce n'est pas déjà fait
    if (!isFullscreen && !showYouTube) {
      setShowYouTube(true);
    }
  };
  
  const toggleYouTube = () => {
    setShowYouTube(!showYouTube);
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const closeAlert = () => {
    setShowAlert(false);
    localStorage.setItem('alertClosed', 'true');
  };
  
  // Scroll vers le contenu SEO
  const scrollToContent = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Formatage du temps (HH:MM:SS ou MM:SS en fonction du format)
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  
  // Calcul du temps restant en mode pomodoro
  const calculatePomodoroRemaining = () => {
    if (!isPomodoroMode) return '00:00';
    
    let sessionRemaining;
    if (pomodoroSession === 'focus') {
      sessionRemaining = pomodoroFocusTime - (displayTime % pomodoroFocusTime);
    } else {
      sessionRemaining = pomodoroBreakTime - (displayTime % pomodoroBreakTime);
    }
    
    const minutes = Math.floor(sessionRemaining / 60);
    const seconds = sessionRemaining % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Bascule entre mode clair et sombre
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    const newTheme = newMode ? 'dark' : 'bumblebee';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Fonction pour changer de langue
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Construction de l'URL YouTube avec ou sans mute
  const getYouTubeUrl = () => {
    const baseUrl = DEFAULT_LOFI_URL;
    const muteParam = isMuted ? '&mute=1' : '';
    return `${baseUrl}${muteParam}`;
  };
  
  // Données des avantages pour le contenu SEO
  const benefits = [
    {
      title: t('home.benefits.focusTitle', 'Améliorez votre concentration'),
      description: t('home.benefits.focusDescription', 'La technique Pomodoro aide particulièrement les personnes avec TDAH/ADHD à maintenir leur attention.'),
      icon: Brain
    },
    {
      title: t('home.benefits.structureTitle', 'Structurez votre apprentissage'),
      description: t('home.benefits.structureDescription', 'Définissez des objectifs personnalisés et suivez votre progression réelle.'),
      icon: Target
    },
    {
      title: t('home.benefits.progressTitle', 'Visualisez votre progression'),
      description: t('home.benefits.progressDescription', 'Combattez l\'effet Dunning-Kruger grâce à des données objectives sur votre temps d\'étude.'),
      icon: BarChart2
    },
    {
      title: t('home.benefits.regularityTitle', 'Créez une routine d\'apprentissage'),
      description: t('home.benefits.regularityDescription', 'Établissez des habitudes régulières pour maximiser vos résultats sur le long terme.'),
      icon: CheckCircle
    }
  ];
  
  // FAQ pour le contenu SEO
  const faqItems = [
    {
      question: t('home.faq.question1', 'Comment la technique Pomodoro aide-t-elle les personnes avec TDAH/ADHD ?'),
      answer: t('home.faq.answer1', 'La technique Pomodoro est particulièrement efficace pour les personnes avec TDAH/ADHD car elle fournit une structure externe, décompose le travail en sessions courtes et gérables, et alterne entre concentration et pauses, ce qui correspond bien aux fluctuations naturelles d\'attention.')
    },
    {
      question: t('home.faq.question2', 'Comment visualiser ma progression dans l\'apprentissage ?'),
      answer: t('home.faq.answer2', 'StudyApp vous permet de visualiser concrètement le temps que vous consacrez à chaque objectif grâce à des graphiques et statistiques. Cette vision objective vous aide à éviter la surestimation ou sous-estimation de vos progrès (effet Dunning-Kruger).')
    },
    {
      question: t('home.faq.question3', 'Comment paramétrer des objectifs d\'étude réalistes ?'),
      answer: t('home.faq.answer3', 'Dans StudyApp, vous pouvez définir des objectifs personnalisés en spécifiant la durée cible pour chaque jour de la semaine, ce qui vous permet d\'adapter vos objectifs à votre emploi du temps réel et à vos capacités de concentration.')
    }
  ];

  // Rendu du composant en mode plein écran
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-100">
        <button 
          className="absolute top-4 right-4 btn btn-ghost btn-circle text-primary"
          onClick={toggleFullscreen}
        >
          <Minimize size={24} />
        </button>
        
        <div className="flex flex-col items-center relative z-10 text-primary">
          <div className="text-8xl font-bold mb-8 drop-shadow-lg text-primary">
            {formatTime(isPomodoroMode ? 
              (pomodoroSession === 'focus' ? 
                Math.floor((pomodoroFocusTime - displayTime % pomodoroFocusTime)) : 
                Math.floor((pomodoroBreakTime - displayTime % pomodoroBreakTime))) : 
              displayTime)}
          </div>
          
          {isPomodoroMode && (
            <div className="stat-desc text-lg md:text-xl mb-6 text-base-content">
              {pomodoroSession === 'focus' 
                ? t('timer.remainingBeforeBreak', { time: calculatePomodoroRemaining() })
                : t('timer.remainingBeforeResume', { time: calculatePomodoroRemaining() })}
            </div>
          )}
          
          <div className="flex gap-6 mb-8">
            {!isRunning ? (
              <button 
                className="btn btn-circle btn-lg bg-base-200 text-primary hover:bg-base-300 border-none"
                onClick={startTimer}
                aria-label={t('timer.start', 'Démarrer le timer')}
              >
                <Play size={28} />
              </button>
            ) : (
              <button 
                className="btn btn-circle btn-lg bg-base-200 text-primary hover:bg-base-300 border-none" 
                onClick={pauseTimer}
                aria-label={t('timer.pause', 'Mettre en pause')}
              >
                <Pause size={28} />
              </button>
            )}
            
            <button 
              className="btn btn-circle btn-lg bg-base-100 text-primary hover:bg-base-300 border-none" 
              onClick={resetTimer}
              disabled={displayTime === 0}
              aria-label={t('timer.reset', 'Réinitialiser')}
            >
              <RotateCcw size={28} />
            </button>
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-base-content">Timer</span>
              <input
                type="checkbox"
                className="toggle toggle-lg toggle-primary"
                checked={isPomodoroMode}
                onChange={togglePomodoroMode}
                aria-label={t('timer.toggleMode', 'Basculer entre mode Timer et Pomodoro')}
              />
              <span className="text-base-content">Pomodoro</span>
            </label>
          </div>
        </div>
        
        {/* YouTube flottant en bas */}
        {showYouTube && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-64 md:w-80 z-50">
            <div className="card bg-base-200 shadow-xl">
              <figure className="relative">
                <div className="w-full h-36 bg-base-300 rounded-t-lg flex items-center justify-center overflow-hidden">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {showYouTube && (
                    <iframe 
                      className="w-full h-full"
                      src={getYouTubeUrl()}
                      title={t('timer.lofiMusicTitle')}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                  )}
                </div>
              </figure>
              <div className="card-body p-2">
                <h3 className="card-title text-sm truncate">{t('timer.lofiChannelTitle')}</h3>
                <div className="card-actions justify-end mt-1">
                  <button 
                    className="btn btn-xs btn-circle bg-base-300"
                    onClick={toggleMute}
                    aria-label={isMuted ? t('timer.unmute', 'Activer le son') : t('timer.mute', 'Couper le son')}
                  >
                    {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  
                  <button 
                    className="btn btn-xs btn-circle bg-base-300"
                    onClick={toggleYouTube}
                    aria-label={t('timer.stopMusic', 'Arrêter la musique')}
                  >
                    <StopCircle size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bouton pour afficher YouTube s'il est masqué */}
        {!showYouTube && (
          <button 
            className="fixed bottom-4 right-4 btn btn-primary btn-sm gap-1"
            onClick={toggleYouTube}
            aria-label={t('timer.showMusic', 'Afficher la musique')}
          >
            <Volume2 size={16} />
            <span className="hidden md:inline">{t('timer.lofiMusic')}</span>
          </button>
        )}
      </div>
    );
  }

  // Rendu normal de la page avec améliorations SEO
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-base-100">
      <Helmet>
        <title>Studie| Timer Pomodoro et Suivi d'Objectifs personnalisés</title>
        <meta name="description" content="StudyApp: Timer Pomodoro, suivi d'objectifs et visualisation de progression conçus pour les personnes ayant des difficultés de concentration (TDAH/ADHD). Essayez gratuitement!" />
        <meta name="keywords" content="pomodoro timer, technique pomodoro, TDAH, ADHD, concentration, suivi objectifs, tracker temps d'étude" />
        
        {/* Structured data pour application */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Studie",
              "applicationCategory": "EducationalApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR"
              },
              "description": "Timer Pomodoro et suivi d'objectifs pour personnes avec TDAH/ADHD"
            }
          `}
        </script>
        
        {/* Structured data pour FAQ */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Comment la technique Pomodoro aide-t-elle les personnes avec TDAH/ADHD ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "La technique Pomodoro est particulièrement efficace pour les personnes avec TDAH/ADHD car elle fournit une structure externe, décompose le travail en sessions courtes et gérables, et alterne entre concentration et pauses, ce qui correspond bien aux fluctuations naturelles d'attention."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Comment visualiser ma progression dans l'apprentissage ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "StudyApp vous permet de visualiser concrètement le temps que vous consacrez à chaque objectif grâce à des graphiques et statistiques. Cette vision objective vous aide à éviter la surestimation ou sous-estimation de vos progrès (effet Dunning-Kruger)."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Comment paramétrer des objectifs d'étude réalistes ?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Dans StudyApp, vous pouvez définir des objectifs personnalisés en spécifiant la durée cible pour chaque jour de la semaine, ce qui vous permet d'adapter vos objectifs à votre emploi du temps réel et à vos capacités de concentration."
                  }
                }
              ]
            }
          `}
        </script>
      </Helmet>
      
      {/* Contenu principal */}
      <div className="flex flex-col min-h-screen items-center py-4 px-4">
        {/* Navbar arrondie */}
        <div className="navbar rounded-full max-w-5xl w-full mb-8">
          <div className="flex-1 px-4">
            <h1 className="normal-case text-xl md:text-xl text-base-content app-title">Studie</h1>
          </div>
          <div className="flex gap-2 px-2">
            {/* Sélecteur de langue */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle">
                <div className="w-10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">{i18n.language.toUpperCase()}</span>
                </div>
              </label>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52">
                <li><button className="text-base-content" onClick={() => changeLanguage('fr')}>Français</button></li>
                <li><button className="text-base-content" onClick={() => changeLanguage('en')}>English</button></li>
              </ul>
            </div>
            
            {/* Toggle mode sombre */}
            <button 
              className="btn btn-ghost btn-circle" 
              onClick={toggleDarkMode}
              aria-label={darkMode ? t('home.lightMode', 'Mode clair') : t('home.darkMode', 'Mode sombre')}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
           
            
            {/* Bouton Se connecter */}
            <Link to="/login" className="btn btn-sm btn-primary md:btn-md">
              {t('home.signInButton')}
            </Link>
          </div>
        </div>
        
        {/* Hero section avec titre SEO (visible pour les moteurs mais discret visuellement) */}
        <div className="max-w-5xl text-center mb-4">
          <h1 className="text-3xl font-bold sr-only">
            {t('home.seoTitle', 'Timer Pomodoro et Suivi d\'Objectifs personnalisés')}
          </h1>
          <p className="sr-only">
            {t('home.seoDescription', 'Studie vous aide à structurer votre apprentissage, visualiser votre progression et combattre la procrastination grâce à son suivi d\'objectifs personnalisés.')}
          </p>
        </div>
        
        {/* Timer centré */}
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-base-content">Timer</span>
                <input
                  type="checkbox"
                  className="toggle toggle-lg toggle-primary"
                  checked={isPomodoroMode}
                  onChange={togglePomodoroMode}
                  aria-label={t('timer.toggleMode', 'Basculer entre mode Timer et Pomodoro')}
                />
                <span className="text-base-content">Pomodoro</span>
              </label>
            </div>

            <div className="text-8xl font-bold mb-8 text-primary">
              {formatTime(isPomodoroMode ? 
                (pomodoroSession === 'focus' ? 
                  Math.floor((pomodoroFocusTime - displayTime % pomodoroFocusTime)) : 
                  Math.floor((pomodoroBreakTime - displayTime % pomodoroBreakTime))) : 
                displayTime)}
            </div>
            
            {isPomodoroMode && (
              <div className="stat-desc text-lg mb-6 text-base-content">
                {pomodoroSession === 'focus' 
                  ? t('timer.remainingBeforeBreak', { time: calculatePomodoroRemaining() })
                  : t('timer.remainingBeforeResume', { time: calculatePomodoroRemaining() })}
              </div>
            )}
            
            <div className="flex justify-center">
              {!isRunning ? (
                <button 
                  className="btn btn-primary btn-lg rounded-full w-24 h-24 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  onClick={startTimer}
                  aria-label={t('timer.start', 'Démarrer le timer')}
                >
                  <Play size={48} />
                </button>
              ) : (
                <div className="flex gap-4">
                  <button 
                    className="btn btn-warning btn-circle btn-lg shadow-md hover:shadow-lg border-none" 
                    onClick={pauseTimer}
                    aria-label={t('timer.pause', 'Mettre en pause')}
                  >
                    <Pause size={28} />
                  </button>
                  
                  <button 
                    className="btn btn-error btn-circle btn-lg shadow-md hover:shadow-lg border-none" 
                    onClick={resetTimer}
                    disabled={displayTime === 0}
                    aria-label={t('timer.reset', 'Réinitialiser')}
                  >
                    <RotateCcw size={28} />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions supplémentaires */}
          <div className="mt-8 flex gap-4 justify-center">
            <button 
              className="btn btn-sm bg-base-200 text-base-content hover:bg-base-300 border-none gap-2"
              onClick={toggleFullscreen}
              aria-label={t('timer.focusMode', 'Mode focus')}
            >
              <Maximize size={16} />
              <span>{t('timer.focusMode')}</span>
            </button>
            
            <button 
              className="btn btn-sm bg-base-200 text-base-content hover:bg-base-300 border-none gap-2"
              onClick={toggleYouTube}
              aria-label={t('timer.lofiMusic', 'Musique lofi')}
            >
              <Volume2 size={16} />
              <span>{t('timer.lofiMusic')}</span>
            </button>
            
          
          </div>
          
          {/* Alert flottante masquable */}
          {showAlert && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 max-w-xs sm:max-w-sm md:max-w-md w-full px-4 z-20">
              <div className="alert bg-base-200 shadow-lg text-base-content">
                <div className="flex-1">
                  <Coffee size={20} />
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="mr-2">{t('home.alertMessage')}</span>
                    <Link to="/login" 
                      className="btn btn-xs btn-primary mt-2 sm:mt-0"
                    >
                      {t('home.signUpButton')}
                    </Link>
                  </div>
                </div>
                <button 
                  className="btn btn-xs btn-ghost btn-circle" 
                  onClick={closeAlert}
                  aria-label={t('home.closeAlert', 'Fermer')}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          
          {/* YouTube flottant si activé */}
          {showYouTube && (
            <div className="fixed bottom-24 right-4 w-64 md:w-80 z-50">
              <div className="card bg-base-200 shadow-xl">
                <figure className="relative">
                  <div className="w-full h-36 bg-base-300 rounded-t-lg flex items-center justify-center overflow-hidden">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <iframe 
                      className="w-full h-full"
                      src={getYouTubeUrl()}
                      title={t('timer.lofiMusicTitle')}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                  </div>
                </figure>
                <div className="card-body p-2">
                  <h3 className="card-title text-sm truncate">{t('timer.lofiChannelTitle')}</h3>
                  <div className="card-actions justify-end mt-1">
                    <button 
                      className="btn btn-xs btn-circle bg-base-300"
                      onClick={toggleMute}
                      aria-label={isMuted ? t('timer.unmute', 'Activer le son') : t('timer.mute', 'Couper le son')}
                    >
                      {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                    
                    <button 
                      className="btn btn-xs btn-circle bg-base-300"
                      onClick={toggleYouTube}
                      aria-label={t('timer.stopMusic', 'Arrêter la musique')}
                    >
                      <StopCircle size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Contenu SEO en dessous du timer (visible en scrollant) */}
        <div ref={mainContentRef} className="max-w-5xl mx-auto mt-24 pt-12 w-full">
          <div className="divider mb-12">
            <span className="text-base-content opacity-60">
              {t('home.seoContentDivider', 'Découvrez Studie')}
            </span>
          </div>
          
          {/* Section principale - avantages */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              {t('home.benefits.title', 'Un cadre structuré pour votre apprentissage')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="card bg-base-200 hover:shadow-lg transition-shadow">
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-full bg-primary bg-opacity-10">
                          <Icon size={22} className="text-primary" />
                        </div>
                        <h3 className="card-title text-lg">{benefit.title}</h3>
                      </div>
                      <p className="text-base-content opacity-80">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          
         
          {/* Section TDAH/ADHD */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              {t('home.seoContent.tdah.title', 'Conçu pour les personnes avec TDAH')}
            </h2>
            
            <div className="bg-primary text-primary-content p-8 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">
                    {t('home.seoContent.tdah.challenges', 'Les défis de l\'apprentissage avec TDAH/ADHD')}
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.challenge1', 'Difficulté à maintenir l\'attention sur une tâche')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.challenge2', 'Tendance à procrastiner et éviter les tâches complexes')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.challenge3', 'Besoin constant de stimulation et susceptibilité aux distractions')}</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">
                    {t('home.seoContent.tdah.solutions', 'Comment Studie vous aide')}
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.solution1', 'Timer Pomodoro avec alternance travail/pause adaptée aux fluctuations d\'attention')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.solution2', 'Mode focus plein écran pour éliminer les distractions visuelles')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-white bg-opacity-20 p-1 rounded-full mt-1">
                        <Check size={14} />
                      </div>
                      <span>{t('home.seoContent.tdah.solution3', 'Structure flexible adaptée à vos capacités réelles')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
          
          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              {t('home.seoContent.faq.title', 'Questions fréquentes')}
            </h2>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="collapse collapse-arrow bg-base-200">
                  <input type="checkbox" />
                  <div className="collapse-title text-lg font-medium">
                    {item.question}
                  </div>
                  <div className="collapse-content">
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* CTA final */}
          <section className="mb-16 text-center">
            <h2 className="text-3xl font-bold mb-6">
              {t('home.seoContent.cta.title', 'Prêt à transformer votre façon d\'apprendre ?')}
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto mb-8">
              {t('home.seoContent.cta.description', 'Créez un compte gratuit et commencez à structurer votre apprentissage dès aujourd\'hui.')}
            </p>
            <Link to="/login" className="btn btn-primary btn-lg">
              {t('home.seoContent.cta.button', 'Créer un compte gratuit')}
            </Link>
          </section>
        </div>
        
        {/* Footer */}
        <footer className="text-center text-base-content text-opacity-60 py-6 text-sm">
          <div className="mb-4 flex justify-center gap-4">
            <Link to="/technique-pomodoro-tdah" className="hover:underline">
              {t('home.footer.pomodoro', 'Technique Pomodoro')}
            </Link>
            <Link to="/fonctionnalites" className="hover:underline">
              {t('home.footer.features', 'Fonctionnalités')}
            </Link>
            <Link to="/login" className="hover:underline">
              {t('home.footer.login', 'Se connecter')}
            </Link>
          </div>
          <p>© 2025 Studie - {t('home.footerText')}</p>
        </footer>
      </div>
      
      {/* Image de fond en bas de page - avec version différente selon le mode */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none z-0">
        {/* Image pour le mode clair */}
        <img 
          src="/bg/home_bg.png" 
          alt="Arrière-plan décoratif" 
          className="w-full object-cover object-bottom hidden dark:hidden light:block"
          style={{ height: 'auto', minWidth: '100%' }}
        />
        {/* Image pour le mode sombre */}
        <img 
          src="/bg/home_darkbg.png" 
          alt="Arrière-plan décoratif (mode sombre)" 
          className="w-full object-cover object-bottom hidden dark:block light:hidden"
          style={{ height: 'auto', minWidth: '100%' }}
        />
      </div>
    </div>
  );
};

export default HomePage;