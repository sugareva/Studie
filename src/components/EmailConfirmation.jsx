import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';

const EmailConfirmation = () => {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Récupérer le hash de l'URL
        const hash = window.location.hash;
        
        if (hash && hash.includes('type=signup')) {
          const { error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          setStatus('success');
          setMessage('Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant vous connecter à votre compte.');
        } else {
          setStatus('error');
          setMessage('Lien de confirmation invalide ou expiré.');
        }
      } catch (error) {
        console.error('Erreur lors de la confirmation de l\'email:', error.message);
        setStatus('error');
        setMessage('Une erreur est survenue lors de la vérification de votre e-mail. Veuillez réessayer plus tard.');
      }
    };

    handleEmailConfirmation();
  }, []);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-base-100">
      <div className="w-full max-w-md mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              {status === 'loading' && (
                <span className="loading loading-spinner loading-lg text-primary"></span>
              )}
              {status === 'success' && (
                <CheckCircle size={64} className="text-success" />
              )}
              {status === 'error' && (
                <AlertCircle size={64} className="text-error" />
              )}
            </div>

            <h2 className="card-title text-2xl font-bold justify-center mb-4">
              Confirmation d'email
            </h2>

            <p className="mb-6">{message}</p>

            {status !== 'loading' && (
              <div className="flex justify-center">
                <a href="/" className="btn btn-primary">
                  Retour à l'accueil
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;