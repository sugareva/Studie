import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AuthForm from '../components/AuthForm';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const formRef = useRef(null);
  const { t } = useTranslation();
  
  const slides = [
    {
      title: t('login.trackStudyTime'),
      description: t('login.trackStudyTimeDesc'),
      image: '/carousel/time-tracking.png',
    },
    {
      title: t('login.setGoals'),
      description: t('login.setGoalsDesc'),
      image: '/carousel/goal-setting.png',
    },
    {
      title: t('login.organizeDays'),
      description: t('login.organizeDaysDesc'),
      image: '/carousel/organize-day.png',
    },
  ];

  // Auto rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-base-200 text-base-content">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher minimal={true} />
      </div>
      
      {/* Presentation Side - Desktop only - Exactly 50% width */}
      <div className="hidden md:block w-1/2 h-screen relative bg-base-100 overflow-hidden">
        {/* Desktop Logo */}
        <div className="flex items-center p-4 relative z-10 text-primary">
        <Link to="/" className="text-3xl font-bold app-title">
              Studie
            </Link>
          
        </div>
        
        {/* Carousel Section */}
        <div className="relative h-full flex items-center justify-center text-primary-content">          
          <div className="z-10 w-full max-w-lg px-8">
            {/* Main carousel content */}
            <div className="carousel-content h-full flex items-center justify-center relative mb-8">
              {slides.map((slide, index) => (
                <div 
                  key={index} 
                  className={`absolute w-full transition-all duration-500 ease-in-out ${
                    index === activeSlide 
                      ? "opacity-100 translate-x-0" 
                      : index < activeSlide 
                        ? "opacity-0 -translate-x-full" 
                        : "opacity-0 translate-x-full"
                  }`}
                >
                  {/* Image - Modifications apportées ici */}
                  <div className="mb-6 flex justify-center">
                    <div className=" w-full max-w-lg rounded-lg overflow-hidden">
                      <img 
                        src={slide.image} 
                        alt={slide.title}
                        className="w-full h-full object-contain bg-base-100"
                      />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="bg-base-100 rounded-xl p-4 text-base-content">
                    <h2 className="text-2xl font-bold mb-3 text-primary">{slide.title}</h2>
                    <p className="text-lg">{slide.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation indicators only */}

          </div>
          
          {/* Tagline */}
          
        </div>
        
        {/* Footer */}
        
      </div>
      
      {/* Form Side - Full width on mobile */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-12" ref={formRef}>
        {/* Mobile Logo and Title */}
        <div className="md:hidden text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 app-title">Studie</h1>
          <p className="text-lg text-base-content/70 mb-4">{t('login.optimizeStudyTime')}</p>
        </div>
      
        <div className="w-full max-w-md p-8 bg-base-100 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <BookOpen className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-base-content mb-2">{t('login.welcome')}</h2>
          </div>
          
          <AuthForm setIsLoading={setIsLoading} />
          
          {/* Footer */}
          <div className="text-center text-xs mt-8 text-base-content/60">
            <p>© {new Date().getFullYear()} Studie. {t('login.allRightsReserved')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;