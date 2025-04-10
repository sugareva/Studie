// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Lock, Loader } from 'lucide-react';

function ResetPasswordPage() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Récupérer et utiliser le token d'accès au chargement de la page
  useEffect(() => {
    const handleHashParams = async () => {
      try {
        setIsLoading(true);
        
        // Extraire le hash de l'URL (tout ce qui suit le #)
        const hash = location.hash;
        
        if (hash && hash.includes('access_token')) {
          // Récupérer le token d'accès du hash
          const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
          
          if (accessToken) {
            // Utiliser le token pour établir une session
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: ''
            });
            
            if (error) {
              console.error('Error setting session:', error);
              setError(t('resetPassword.errors.invalidLink'));
            } else {
              setAuthenticated(true);
            }
          }
        } else {
          setError(t('resetPassword.errors.missingToken'));
        }
      } catch (err) {
        console.error('Error processing token:', err);
        setError(t('resetPassword.errors.tokenProcessingError'));
      } finally {
        setIsLoading(false);
      }
    };
    
    handleHashParams();
  }, [location, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!authenticated) {
      setError(t('resetPassword.errors.notAuthenticated'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.errors.passwordMismatch'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(t('resetPassword.success'));
        // Rediriger vers la page de connexion après quelques secondes
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message || t('resetPassword.errors.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-base-100 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">{t('resetPassword.title')}</h1>
      
      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{success}</span>
        </div>
      )}
      
      {isLoading && !authenticated ? (
        <div className="flex justify-center items-center py-10">
          <Loader className="animate-spin h-10 w-10 text-primary" />
          <span className="ml-3">{t('resetPassword.messages.validatingLink')}</span>
        </div>
      ) : (
        authenticated && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="block text-sm font-medium text-base-content/50 mb-1">
                {t('resetPassword.labels.newPassword')}
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  className="input input-bordered w-full pl-10"
                  placeholder={t('resetPassword.placeholders.newPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            </div>
            
            <div className="form-control">
              <label className="block text-sm font-medium text-base-content/50 mb-1">
                {t('resetPassword.labels.confirmPassword')}
              </label>
              <div className="relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  className="input input-bordered w-full pl-10"
                  placeholder={t('resetPassword.placeholders.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            </div>
            
            <div className="form-control">
              <button
                type="submit"
                className="btn btn-primary w-full flex justify-center items-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin h-4 w-4" />
                    {t('resetPassword.buttons.loading')}
                  </>
                ) : (
                  t('resetPassword.buttons.updatePassword')
                )}
              </button>
            </div>
          </form>
        )
      )}
      
      {!isLoading && !authenticated && error && (
        <div className="mt-4 text-center">
          <p className="mb-4">{t('resetPassword.messages.invalidLinkInfo')}</p>
          <button
            className="btn btn-outline btn-primary"
            onClick={() => navigate('/login')}
          >
            {t('resetPassword.buttons.backToLogin')}
          </button>
        </div>
      )}
    </div>
  );
}

export default ResetPasswordPage;