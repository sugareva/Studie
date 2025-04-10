// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Activity from './pages/Activity';
import Login from './pages/Login';
import Roadmap from './pages/Roadmap';
import HomePage from './pages/HomePage';
import './i18n';

// Composant pour protéger les routes privées
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  // Afficher un indicateur de chargement si la vérification de l'authentification est en cours
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Afficher le contenu protégé si l'utilisateur est authentifié
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Nouvelle route publique pour la page d'accueil */}
          <Route path="/" element={<HomePage />} />
          
          {/* Route publique de connexion */}
          <Route path="/login" element={<Login />} />
          
          {/* Routes protégées */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/activity" element={
            <PrivateRoute>
              <Activity />
            </PrivateRoute>
          } />
          <Route path="/roadmap" element={
            <PrivateRoute>
              <Roadmap />
            </PrivateRoute>
          } />
          
          {/* Redirection par défaut vers la page d'accueil */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;