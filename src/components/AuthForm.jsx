import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader, LogIn, UserPlus } from 'lucide-react';

function AuthForm({ setIsLoading: setParentLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Mettre à jour le state du parent si nécessaire
  useEffect(() => {
    if (setParentLoading) {
      setParentLoading(isLoading);
    }
  }, [isLoading, setParentLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password);
      }
      
      console.log("Résultat auth:", result); // Log pour déboguer
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.data.session) {
        // Redirection réussie vers le dashboard
        navigate('/dashboard');
      } else if (!isLogin) {
        // Pour l'inscription, afficher un message de confirmation par email si nécessaire
        setError("Veuillez vérifier votre email pour confirmer votre inscription.");
      }
    } catch (error) {
      console.error("Erreur d'authentification:", error); // Log détaillé
      setError(error.message || "Erreur d'authentification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          {isLogin ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="text-xs text-gray-600">
          {isLogin 
            ? 'Entrez vos identifiants pour accéder à votre compte' 
            : 'Remplissez le formulaire pour créer votre compte'
          }
        </p>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative rounded-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              className="input input-bordered w-full pl-10"
              placeholder="votreemail@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-control">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isLogin ? "Mot de passe" : "Mot de passe (8 caractères min.)"}
          </label>
          <div className="relative rounded-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              className="input input-bordered w-full pl-10"
              placeholder={isLogin ? "Votre mot de passe" : "Créez un mot de passe"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
                Chargement...
              </>
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" />
                Se connecter
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                S'inscrire
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 text-center">
        <button
          className="btn btn-link text-primary hover:text-primary-focus p-0 h-auto min-h-0"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </button>
      </div>

      {!isLogin && (
        <div className="mt-4 text-center text-xs text-gray-500">
          Ces informations servent uniquement à votre connexion et à la sauvegarde de vos actions sur Studie. Aucune donnée n'est partagée ou vendue. {" "}
        </div>
      )}
    </div>
  );
}

export default AuthForm;