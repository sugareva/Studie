import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AuthForm from '../components/AuthForm';
import { BookOpen, BrainCircuit, Clock, Users, ChevronDown, Goal, NotebookPen, Globe } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const { t } = useTranslation();
  
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-base-100 to-base-200 flex flex-col md:flex-row items-stretch overflow-x-hidden relative">
      {/* Language Switcher - Positionné en haut à droite de la page */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher minimal={true} />
      </div>
      
      {/* Section d'en-tête sur mobile */}
      <div className="md:hidden pt-10 px-6 text-center">
        <h1 className="text-4xl font-bold text-primary mb-3 app-title">StudyApp</h1>
        <p className="text-lg text-gray-600 mb-4">{t('login.optimizeStudyTime')}</p>
      </div>
      
      {/* Section informative avec fonctionnalités (première sur mobile) */}
      <div className="flex-1 order-1 md:order-1 p-4 pt-6 sm:p-6 md:p-12 flex flex-col justify-center bg-white bg-opacity-90 rounded-t-3xl md:rounded-r-3xl md:rounded-t-none shadow-lg min-h-[60vh] md:min-h-0 relative">
        <div className="max-w-md mx-auto w-full py-6 md:py-6">
          <div className="hidden md:block text-center mb-8">
            <h1 className="text-5xl font-bold text-primary mb-4 app-title">Studie</h1>
            <p className="text-xl text-gray-600 px-4">{t('login.optimizeStudyProductivity')}</p>
          </div>
          
          <div className="space-y-6 my-6 md:my-10">
            <h2 className="text-2xl font-bold text-primary text-center md:text-center mb-6">{t('login.features')}</h2>
            
            <div className="flex gap-4 md:gap-6 items-start p-3 md:p-4 hover:bg-base-200 hover:bg-opacity-5 rounded-lg transition-colors duration-300">
              <div className="bg-primary bg-opacity-10 p-3 md:p-4 rounded-lg shrink-0">
                <Clock className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-primary-focus mb-1 md:mb-2">{t('login.trackStudyTime')}</h3>
                <p className="text-gray-600 text-sm md:text-base">{t('login.trackStudyTimeDesc')}</p>
              </div>
            </div>
            
            <div className="flex gap-4 md:gap-6 items-start p-3 md:p-4 hover:bg-base-200 hover:bg-opacity-5 rounded-lg transition-colors duration-300">
              <div className="bg-primary bg-opacity-10 p-3 md:p-4 rounded-lg shrink-0">
                <Goal className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-primary-focus mb-1 md:mb-2">{t('login.setGoals')}</h3>
                <p className="text-gray-600 text-sm md:text-base">{t('login.setGoalsDesc')}</p>
              </div>
            </div>
            
            <div className="flex gap-4 md:gap-6 items-start p-3 md:p-4 hover:bg-base-200 hover:bg-opacity-5 rounded-lg transition-colors duration-300">
              <div className="bg-primary bg-opacity-10 p-3 md:p-4 rounded-lg shrink-0">
                <NotebookPen className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-primary-focus mb-1 md:mb-2">{t('login.organizeDays')}</h3>
                <p className="text-gray-600 text-sm md:text-base">{t('login.organizeDaysDesc')}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bouton "Commencer" en bas de section sur mobile */}
        <div className="md:hidden w-full flex justify-center pb-6 absolute bottom-0 left-0 right-0">
          <button 
            onClick={scrollToForm}
            className="btn btn-primary rounded-full px-6 shadow-lg flex items-center gap-2 w-auto"
          >
            {t('login.getStarted')}
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        <div className="hidden md:block text-center text-gray-500 text-sm mt-auto pt-6">
          <p>© {new Date().getFullYear()} StudyApp. {t('login.allRightsReserved')}</p>
        </div>
      </div>
      
      {/* Section formulaire (apparaît en second sur mobile après clic) */}
      <div className="flex-1 order-2 md:order-2 p-6 sm:p-8 md:p-12 flex items-center justify-center" 
        style={{
          backgroundColor: '#f3ede9',
          opacity: 0.8,
          backgroundImage: 'linear-gradient(#e2ddd9 2px, transparent 2px), linear-gradient(90deg, #e2ddd9 2px, transparent 2px), linear-gradient(#e2ddd9 1px, transparent 1px), linear-gradient(90deg, #e2ddd9 1px, #f3ede9 1px)',
          backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
          backgroundPosition: '-2px -2px, -2px -2px, -1px -1px, -1px -1px'
        }}
        ref={formRef}>
        <div className="w-full max-w-md p-6 sm:p-8 bg-base-100 rounded-xl shadow-xl">
          <div className="text-center mb-6">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{t('login.welcome')}</h2>
          </div>
          
          <AuthForm setIsLoading={setIsLoading} />
        </div>
      </div>
      
      <div className="order-3 md:hidden text-center text-gray-500 text-xs p-4">
        <p>© {new Date().getFullYear()} StudyApp. {t('login.allRightsReserved')}</p>
      </div>
    </div>
  );
}

export default Login;