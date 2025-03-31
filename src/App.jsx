import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Settings, User, LogOut } from 'lucide-react';
import StudyGoalApp from './components/StudyGoalApp';
import TimerApp from './components/TimerApp';
import { supabase } from './supabase';
import AuthComponent from './components/Auth';

const App = () => {
  // Remplacer le simple toggle darkMode par un état plus flexible pour le thème
  const [theme, setTheme] = useState('cupcake');
  const [goals, setGoals] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Référence pour le modal
  const modalRef = useRef(null);
  
  // Référence pour suivre si la redirection a déjà eu lieu
  const redirected = useRef(false);

  // Effet pour appliquer le thème à l'élément HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Optionnellement, stocker le thème dans localStorage pour se souvenir du choix
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Récupérer le thème du localStorage au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Fonction pour basculer entre thème clair et sombre
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('cupcake');
    } else {
      setTheme('dark');
    }
  };

  // Fonction pour changer de thème via un menu déroulant
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  // Vérifier si l'utilisateur est connecté au chargement
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Ouvrir le modal des objectifs
  const openGoalsModal = () => {
    if (modalRef.current) {
      modalRef.current.showModal();
    }
  };

  // Chargement des données après connexion
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      
      try {
        // Charger les objectifs
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id.toString());
          
        if (goalsError) throw goalsError;
        
        // Charger les sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id.toString());
          
        if (sessionsError) throw sessionsError;
        
        // Mettre à jour les états
        setGoals(goalsData || []);
        setStudySessions(sessionsData || []);
        
        // Sélectionner le premier objectif si disponible
        if (goalsData && goalsData.length > 0) {
          setSelectedGoal(goalsData[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const handleGoalsUpdate = async (updatedGoals) => {
    try {
      // Mettre à jour l'état local
      setGoals(updatedGoals);
      
      if (!user) return;
      
      // Sauvegarder dans Supabase
      for (const goal of updatedGoals) {
        const { error } = await supabase
          .from('goals')
          .upsert({ ...goal, user_id: user.id.toString() })
          .eq('id', goal.id);
          
        if (error) throw error;
      }
      
      // Si des objectifs ont été supprimés, les supprimer de Supabase
      const currentIds = updatedGoals.map(g => g.id);
      const deletedIds = goals.filter(g => !currentIds.includes(g.id)).map(g => g.id);
      
      if (deletedIds.length > 0) {
        const { error } = await supabase
          .from('goals')
          .delete()
          .in('id', deletedIds)
          .eq('user_id', user.id.toString());
          
        if (error) throw error;
      }
      
      // Gérer la sélection d'objectif
      if (!selectedGoal && updatedGoals.length > 0) {
        setSelectedGoal(updatedGoals[0].id);
      } else if (selectedGoal && !updatedGoals.some(g => g.id === selectedGoal)) {
        setSelectedGoal(updatedGoals.length > 0 ? updatedGoals[0].id : null);
      }

      // Fermer le modal après mise à jour
      if (modalRef.current) {
        modalRef.current.close();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs:', error);
    }
  };

  const handleAddStudySession = async (session) => {
    try {
      // Ajouter l'ID utilisateur
      const sessionWithUserId = user ? { ...session, user_id: user.id.toString() } : session;
      
      // Mettre à jour l'état local
      const newSessions = [...studySessions, sessionWithUserId];
      setStudySessions(newSessions);
      
      // Sauvegarder dans Supabase si l'utilisateur est connecté
      if (user) {
        const { error } = await supabase
          .from('sessions')
          .insert(sessionWithUserId);
          
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une session:', error);
    }
  };

  const handleDeleteStudySession = async (sessionId) => {
    try {
      // Mettre à jour l'état local
      const updatedSessions = studySessions.filter(s => s.id !== sessionId);
      setStudySessions(updatedSessions);
      
      // Supprimer de Supabase si l'utilisateur est connecté
      if (user) {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId)
          .eq('user_id', user.id.toString());
          
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la suppression d\'une session:', error);
    }
  };

  // Fonction de déconnexion
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Fonction pour formater l'email de l'utilisateur
  const formatUserEmail = (email) => {
    if (!email) return "";
    const atIndex = email.indexOf('@');
    if (atIndex > 10) {
      return email.substring(0, 10) + '...' + email.substring(atIndex);
    }
    return email;
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher le composant d'authentification
  if (!user) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-base-100">
        <AuthComponent />
      </div>
    );
  }

  // Liste des thèmes disponibles dans DaisyUI
  const availableThemes = [
    'cupcake', 'dark', 'light', 'bumblebee', 'emerald', 'corporate', 
    'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 
    'garden', 'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 
    'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 
    'business', 'acid', 'lemonade', 'night', 'coffee', 'winter'
  ];

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-base-100 text-base-content">
      <div className="w-full max-w-[80%] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header avec logo et contrôles utilisateur */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold">Studie</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm opacity-70">
              <User size={16} className="mr-1" />
              <span>{formatUserEmail(user.email)}</span>
            </div>
            
            {/* Menu déroulant pour sélectionner le thème */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-96 overflow-y-auto">
                {availableThemes.map((t) => (
                  <li key={t}>
                    <a 
                      className={theme === t ? 'active' : ''} 
                      onClick={() => changeTheme(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="btn btn-sm btn-ghost"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline ml-1">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Barre de navigation principale */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Suivi du temps</h2>
          <button
            onClick={openGoalsModal}
            className="btn btn-circle btn-ghost"
            title="Gérer les objectifs"
          >
            <Settings size={20} />
          </button>
        </div>

        

        {/* Modal des objectifs */}
        <dialog id="goals_modal" className="modal" ref={modalRef}>
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Gestion des objectifs</h3>
            <div className="max-h-[70vh] overflow-auto">
              <StudyGoalApp 
                theme={theme}
                goals={goals} 
                onGoalsUpdate={handleGoalsUpdate} 
              />
            </div>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn">Fermer</button>
              </form>
            </div>
          </div>
        </dialog>

        {/* Timer App toujours affiché */}
        <TimerApp 
          theme={theme}
          goals={goals} 
          studySessions={studySessions}
          onAddSession={handleAddStudySession}
          onDeleteSession={handleDeleteStudySession}
          selectedGoal={selectedGoal}
          onSelectGoal={setSelectedGoal}
        />
      </div>
    </div>
  );
};
// Fonction pour changer de thème via un menu déroulant
const changeTheme = (newTheme) => {
  // Appliquer le thème directement à l'élément html
  document.documentElement.setAttribute('data-theme', newTheme);
  // Mettre à jour l'état
  setTheme(newTheme);
  // Sauvegarder dans localStorage
  localStorage.setItem('theme', newTheme);
};

// Récupérer le thème du localStorage au chargement
useEffect(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    // Appliquer directement le thème sauvegardé
    document.documentElement.setAttribute('data-theme', savedTheme);
    setTheme(savedTheme);
  } else {
    // Si pas de thème sauvegardé, appliquer le thème par défaut
    document.documentElement.setAttribute('data-theme', 'cupcake');
    setTheme('cupcake');
  }
}, []);

export default App;