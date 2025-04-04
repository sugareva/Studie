import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Settings, User, LogOut } from 'lucide-react';
import StudyGoalApp from './components/StudyGoalApp';
import TimerApp from './components/TimerApp';
import { supabase } from './supabase';
import AuthPage from './components/AuthPage'; // Importez votre nouveau composant
import EmailConfirmation from './components/EmailConfirmation'; // Importez le composant de confirmation d'email
import UserSettings from './components/UserSettings';

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  
  const [goals, setGoals] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isEmailConfirmation, setIsEmailConfirmation] = useState(false);


  // Référence pour les modals
  const goalsModalRef = useRef(null);
  const settingsModalRef = useRef(null);

  // Référence pour suivre si la redirection a déjà eu lieu
  const redirected = useRef(false);

  
  // Vérifier s'il s'agit d'une confirmation d'email
  
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=signup')) {
      setIsEmailConfirmation(true);
    }
  }, []);

  useEffect(() => {
    // Utiliser bumblebee comme thème par défaut au lieu de cupcake
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDarkMode) {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'bumblebee');
    }
  }, []);

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.setAttribute('data-theme', newDarkMode ? 'dark' : 'bumblebee');
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

    // Chargement du profil utilisateur
    useEffect(() => {
      const loadUserProfile = async () => {
        if (!user) return;
  
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('user_id', user.id)
            .single();
  
          if (error && error.code !== 'PGRST116') {
            console.error('Erreur lors du chargement du profil:', error);
            return;
          }
  
          setUserProfile(data || null);
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error);
        }
      };
  
      if (user) {
        loadUserProfile();
      }
    }, [user]);
  

  // Ouvrir le modal des objectifs
  const openGoalsModal = () => {
    if (goalsModalRef.current) {
      goalsModalRef.current.showModal();
    }
  };

  // Ouvrir le modal des paramètres
  const openSettingsModal = () => {
    if (settingsModalRef.current) {
      settingsModalRef.current.showModal();}
  };

    // Mettre à jour le profil utilisateur
    const updateUserProfile = (profileData) => {
      setUserProfile(profileData);
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
    
    // Ne plus détecter la préférence du système pour utiliser le thème cupcake par défaut
    
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
      if (goalsModalRef.current) {
        goalsModalRef.current.close();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs:', error);
    }
  };
  const handleAddStudySession = async (session) => {
    try {
      // Vérifier si une session avec cet ID existe déjà
      if (studySessions.some(s => s.id === session.id)) {
        console.warn('Session déjà existante, ignorée:', session.id);
        return;
      }
      
      // Transformation des noms de propriétés de camelCase vers snake_case
      const sessionForDB = {
        id: session.id,
        goal_id: session.goalId ? session.goalId.toString() : null,
        duration: session.duration,
        date: session.date,
        goal_title: session.goalTitle,
        user_id: user.id.toString()
      };
      
      console.log('Tentative d\'enregistrement avec session:', sessionForDB);
      
      // Mettre à jour l'état local avec la version originale
      const newSessions = [...studySessions, session];
      setStudySessions(newSessions);
      
      // Sauvegarder dans Supabase avec la version formatée
      if (user) {
        const { data, error } = await supabase
          .from('sessions')
          .insert([sessionForDB])
          .select();
          
        if (error) {
          console.error('Erreur Supabase détaillée:', error);
          throw error;
        }
        
        console.log('Session enregistrée avec succès:', data);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'une session:', error);
      alert('Erreur lors de l\'enregistrement de la session: ' + error.message);
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

    // Fonction pour formater l'email de l'utilisateur ou afficher le pseudo
    const getUserDisplayName = () => {
      if (userProfile?.nickname) {
        return userProfile.nickname;
      }
      
      const email = user?.email;
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

  // S'il s'agit d'une confirmation d'email
  if (isEmailConfirmation) {
    return <EmailConfirmation />;
  }

  // Si l'utilisateur n'est pas connecté, afficher le composant d'authentification
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-base-100 text-base-content">
      <div className="w-full max-w-[80%] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header avec logo et contrôles utilisateur */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold">Studie</h1>
          <div className="flex items-center space-x-4">
          <div className="flex items-center"><button onClick={openSettingsModal}
              className="btn btn-sm btn-ghost">
              {userProfile?.avatar_url && (
                <div className="avatar mr-2">
                  <div className="w-6 h-6 rounded-full">
                    <img src={userProfile.avatar_url} alt="Avatar" />
                  </div>
                </div>
              )}
              <span className="text-sm opacity-70">
                {userProfile?.avatar_url ? "" : <User size={16} className="mr-1 inline-block" />}
                {getUserDisplayName()}
              </span></button>
            </div>
            <button 
              onClick={handleSignOut}
              className="btn btn-sm btn-ghost"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline ml-1">Déconnexion</span>
            </button>
            <button 
  onClick={handleDarkModeToggle}
  className="btn btn-circle btn-sm btn-ghost"
>
  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
</button>
          </div>
        </header>

        

        {/* Barre de navigation principale */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Suivi du temps</h2>
          
        </div>

        {/* Modal des objectifs */}
        <dialog id="goals_modal" className="modal" ref={goalsModalRef}>
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Gestion des objectifs</h3>
            <div className="max-h-[70vh] overflow-auto">
              <StudyGoalApp 
                darkMode={darkMode} 
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
          
        {/* Composant de paramètres utilisateur */}
        <UserSettings 
          user={user} 
          updateUserProfile={updateUserProfile} 
          modalRef={settingsModalRef}
        />



        {/* Timer App toujours affiché */}
        <TimerApp 
          darkMode={darkMode} 
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

export default App;