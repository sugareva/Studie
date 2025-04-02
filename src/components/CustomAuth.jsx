import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const CustomAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        setMessage('Vérifiez votre boîte mail pour valider votre inscription.');
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        // Redirection gérée par l'écouteur d'événements dans App.jsx
      }
    } catch (error) {
      setError(error.message || 'Une erreur est survenue lors de l\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Veuillez saisir votre adresse email pour réinitialiser votre mot de passe.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      setMessage('Si cette adresse est reconnue, vous recevrez un lien de réinitialisation par email.');
    } catch (error) {
      setError(error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-6">
            {isSignUp ? 'Créer un compte' : 'Connexion'}
          </h2>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="alert alert-success mb-4">
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleAuth}>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Adresse email</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  className="input input-bordered w-full pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  className="input input-bordered w-full pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-control">
              <button
                type="submit"
                className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {isSignUp ? 'S\'inscrire' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              className="btn btn-link btn-sm"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Déjà un compte ? Connectez-vous' : 'Pas encore de compte ? Inscrivez-vous'}
            </button>
          </div>

          {!isSignUp && (
            <div className="text-center mt-2">
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={handleResetPassword}
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          
        </div>
      </div>
    </div>
  );
};

export default CustomAuth;