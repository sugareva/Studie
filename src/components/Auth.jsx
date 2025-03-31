import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabase';

const AuthComponent = () => {
    return (
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-6">Connectez-vous</h2>
          
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--p))', // Couleur primaire de daisyUI
                    brandAccent: 'hsl(var(--pf))', // Couleur primaire focus de daisyUI
                    brandButtonText: 'hsl(var(--pc))', // Texte sur couleur primaire
                    defaultButtonBackground: 'color-mix(in oklab, var(--btn-color, var(--color-base-200)), #000 7%)', // Fond de bouton par défaut
                    defaultButtonBackgroundHover: 'hsl(var(--b3))', // Fond de bouton hover
                    defaultButtonBorder: 'hsl(var(--b3))', // Bordure de bouton
                    defaultButtonText: 'hsl(var(--bc))', // Texte de bouton par défaut
                    dividerBackground: 'hsl(var(--b3))', // Couleur de séparateur
                    inputBackground: 'hsl(var(--b1))', // Fond d'input
                    inputBorder: 'hsl(var(--b3))', // Bordure d'input
                    inputBorderHover: 'hsl(var(--b3))', // Bordure d'input au survol
                    inputBorderFocus: 'hsl(var(--p))', // Bordure d'input au focus
                    inputText: 'hsl(var(--bc))', // Texte d'input
                    inputPlaceholder: 'hsl(var(--bc) / 0.5)', // Placeholder d'input
                    messageText: 'hsl(var(--bc))', // Texte de message
                    messageTextDanger: 'hsl(var(--er))', // Texte de message d'erreur
                    anchorTextColor: 'hsl(var(--p))', // Couleur des liens
                    anchorTextHoverColor: 'hsl(var(--pf))' // Couleur des liens au survol
                  },
                  space: {
                    buttonPadding: 'var(--btn-padding, 0.75rem 1rem)',
                    inputPadding: 'var(--input-padding, 0.75rem)',
                  },
                  borderWidths: {
                    buttonBorderWidth: 'var(--btn-border-width, 1px)',
                    inputBorderWidth: 'var(--input-border-width, 1px)',
                  },
                  borderRadius: {
                    buttonBorderRadius: 'var(--rounded-btn, 0.5rem)',
                    inputBorderRadius: 'var(--rounded-box, 0.5rem)',
                  }
                }
              },
              className: {
                button: 'btn',
                input: 'input input-bordered w-full',
                label: 'label-text',
                anchor: 'link link-primary text-sm',
                divider: 'divider',
                message: 'text-sm mt-2',
              }
            }}
            localization={{
              variables: {
                sign_up: {
                  email_label: 'Adresse email',
                  password_label: 'Mot de passe',
                  email_input_placeholder: 'Votre adresse email',
                  password_input_placeholder: 'Votre mot de passe',
                  button_label: 'S\'inscrire',
                  link_text: 'Pas encore de compte ? Inscrivez-vous',
                  confirmation_text: 'Vérifiez votre boîte mail pour le lien de confirmation'
                },
                sign_in: {
                  email_label: 'Adresse email',
                  password_label: 'Mot de passe',
                  email_input_placeholder: 'Votre adresse email',
                  password_input_placeholder: 'Votre mot de passe',
                  button_label: 'Se connecter',
                  link_text: 'Déjà un compte ? Connectez-vous'
                },
                forgotten_password: {
                  email_label: 'Adresse email',
                  password_label: 'Mot de passe',
                  email_input_placeholder: 'Votre adresse email',
                  button_label: 'Réinitialiser mon mot de passe',
                  link_text: 'Mot de passe oublié ?',
                  confirmation_text: 'Vérifiez votre boîte mail pour le lien de réinitialisation'
                }
              }
            }}
            providers={[]}
          />
        </div>
      </div>
    );
  };
  
  export default AuthComponent;