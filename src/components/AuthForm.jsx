import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function AuthForm({ setIsLoading: setParentLoading }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Nouvelle option "Rester connecté" - activée par défaut
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Mettre à jour le state du parent si nécessaire
  useEffect(() => {
    if (setParentLoading) {
      setParentLoading(isLoading);
    }
  }, [isLoading, setParentLoading]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!isForgotPassword) {
      // Si on n'est pas déjà en mode mot de passe oublié, activer ce mode
      setIsForgotPassword(true);
      setError('');
      return;
    }

    // Sinon, c'est une soumission du formulaire de réinitialisation
    if (!email) {
      setError(t('auth.errors.emailRequired'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(t('auth.messages.passwordResetEmailSent'));
        // Optionnel : Retourner au mode de connexion après quelques secondes
        setTimeout(() => {
          setIsForgotPassword(false);
          setIsLogin(true);
        }, 3000);
      }
    } catch (error) {
      console.error(t('auth.errors.passwordResetError'), error);
      setError(error.message || t('auth.errors.genericPasswordResetError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si on est en mode mot de passe oublié, déléguer à la fonction handleForgotPassword
    if (isForgotPassword) {
      handleForgotPassword(e);
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      let result;
      if (isLogin) {
        // Passer l'option rememberMe au contexte d'authentification
        result = await signIn(email, password, rememberMe);
      } else {
        result = await signUp(email, password);
      }
      
      console.log(t('auth.debugMessages.authResult'), result); // Log pour déboguer
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.data.session) {
        // Redirection réussie vers le dashboard
        navigate('/dashboard');
      } else if (!isLogin) {
        // Pour l'inscription, afficher un message de confirmation par email si nécessaire
        setError(t('auth.messages.checkEmailConfirmation'));
      }
    } catch (error) {
      console.error(t('auth.errors.authError'), error); // Log détaillé
      setError(error.message || t('auth.errors.genericAuthError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour revenir au mode connexion depuis le mode mot de passe oublié
  const handleBackToLogin = () => {
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-base mb-1">
          {isForgotPassword 
            ? t('auth.headings.forgotPassword')
            : isLogin 
              ? t('auth.headings.login') 
              : t('auth.headings.createAccount')
          }
        </h2>
        <p className="text-xs text-base-content/70">
          {isForgotPassword
            ? t('auth.descriptions.forgotPasswordDescription')
            : isLogin 
              ? t('auth.descriptions.loginDescription') 
              : t('auth.descriptions.signupDescription')
          }
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="block text-sm font-medium text-base-content/50 mb-1">
            {t('auth.labels.email')}
          </label>
          <div className="relative rounded-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              className="input input-bordered w-full pl-10"
              placeholder={t('auth.placeholders.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Afficher le champ mot de passe uniquement si on n'est pas en mode mot de passe oublié */}
        {!isForgotPassword && (
          <div className="form-control">
            <label className="block text-sm font-medium text-base-content/50 mb-1">
              {isLogin ? t('auth.labels.password') : t('auth.labels.passwordWithRequirement')}
            </label>
            <div className="relative rounded-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                className="input input-bordered w-full pl-10"
                placeholder={isLogin ? t('auth.placeholders.existingPassword') : t('auth.placeholders.newPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isForgotPassword}
              />
            </div>
          </div>
        )}
        
        {/* Option "Rester connecté" - uniquement affichée en mode connexion */}
        {isLogin && !isForgotPassword && (
          <div className="form-control">
            <label className="cursor-pointer label justify-start gap-2">
              <input 
                type="checkbox" 
                className="checkbox checkbox-sm checkbox-primary" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="label-text text-sm">
                {t('auth.labels.rememberMe', 'Rester connecté')}
              </span>
            </label>
          </div>
        )}

        <div className="form-control">
          <button
            type="submit"
            className="btn btn-primary w-full flex justify-center items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-4 w-4" />
                {t('auth.buttons.loading')}
              </>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" />
                {t('auth.buttons.login')}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                {t('auth.buttons.signup')}
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        {isForgotPassword ? (
          // Bouton pour revenir à la connexion depuis le mode mot de passe oublié
          <button
            className="btn btn-link text-primary hover:text-primary-focus p-0 h-auto min-h-0 flex items-center justify-center mx-auto gap-1"
            onClick={handleBackToLogin}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.toggleButtons.backToLogin')}
          </button>
        ) : (
          // Boutons pour basculer entre connexion et inscription
          <>
            <button
              className="btn btn-link text-primary hover:text-primary-focus p-0 h-auto min-h-0"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? t('auth.toggleButtons.toSignup') : t('auth.toggleButtons.toLogin')}
            </button>
            
            
          </>
        )}
      </div>

      {!isLogin && !isForgotPassword && (
        <div className="mt-4 text-center text-xs text-gray-500">
          {t('auth.disclaimers.privacyInfo')}
        </div>
      )}
    </div>
  );
}

export default AuthForm;