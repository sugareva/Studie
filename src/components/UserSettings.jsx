import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../supabase';

// Liste des avatars disponibles
const AVATARS = [
  '/avatars/avatar1.png',
  '/avatars/avatar2.png',
  '/avatars/avatar3.png',
  '/avatars/avatar4.png',
  '/avatars/avatar5.png',
  '/avatars/avatar6.png',
  '/avatars/avatar7.png',
  '/avatars/avatar8.png'
];

const UserSettings = ({ user, updateUserProfile, modalRef }) => {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Charger les données du profil au montage
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Récupérer les métadonnées du profil depuis Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (profile) {
          setNickname(profile.nickname || '');
          setSelectedAvatar(profile.avatar_url);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      }
    };
    
    if (user) {
      loadProfile();
    }
  }, [user]);

  const closeModal = () => {
    if (modalRef.current) {
      modalRef.current.close();
    }
  };
    // Fonction pour mettre à jour l'avatar séparément
    const updateAvatar = async (avatarUrl) => {
        try {
          // Utilisez upsert directement pour éviter les problèmes de duplication
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString()
            });
            
          if (error) throw error;
          return { success: true };
        } catch (error) {
          console.error('Erreur lors de la mise à jour du profil:', error);
          throw new Error("Impossible de sauvegarder les modifications. Veuillez réessayer.");
        }
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');
        
        try {
          // Vérifier d'abord si un profil existe déjà
          const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')  // Récupérer l'ID pour pouvoir faire une mise à jour
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (checkError) {
            console.error('Erreur lors de la vérification du profil:', checkError);
            throw checkError;
          }
          
          let profileError;
          
          if (existingProfile) {
            // Mettre à jour le profil existant en utilisant l'ID existant
            const { error } = await supabase
              .from('profiles')
              .update({
                nickname: nickname.trim(),
                avatar_url: selectedAvatar,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProfile.id);  // Utiliser l'ID comme critère
            
            profileError = error;
          } else {
            // Créer un nouveau profil
            const { error } = await supabase
              .from('profiles')
              .insert({
                user_id: user.id,
                nickname: nickname.trim(),
                avatar_url: selectedAvatar
                // Pas besoin de spécifier created_at et updated_at car ils ont des valeurs par défaut
              });
            
            profileError = error;
          }
          
          if (profileError) throw profileError;
          
          // Mettre à jour l'état global via la fonction passée en props
          updateUserProfile({
            nickname: nickname.trim(),
            avatar_url: selectedAvatar
          });
          
          // Fermer le modal après la mise à jour réussie
          closeModal();
        } catch (error) {
          console.error('Erreur détaillée lors de la sauvegarde du profil:', error);
          setErrorMessage("Impossible de sauvegarder les modifications. Veuillez réessayer.");
        } finally {
          setIsLoading(false);
        }
      };

  return (
    <>
      <dialog id="settings_modal" className="modal" ref={modalRef}>
        <div className="modal-box w-11/12 max-w-md">
          <h3 className="font-bold text-lg mb-4">Paramètres du profil</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Pseudo</span>
              </label>
              <input
                type="text"
                placeholder="Votre pseudo"
                className="input input-bordered w-full"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
              />
              <label className="label">
                <span className="label-text-alt text-opacity-70">
                  Le pseudo sera affiché à la place de votre adresse e-mail
                </span>
              </label>
            </div>

            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Avatar</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((avatar, index) => (
                  <div
                    key={index}
                    className={`relative cursor-pointer p-1 rounded-lg transition-all ${
                      selectedAvatar === avatar ? 'bg-primary bg-opacity-20 ring-2 ring-primary' : 'hover:bg-base-200'
                    }`}
                    onClick={() => setSelectedAvatar(avatar)}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    {selectedAvatar === avatar && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-content rounded-full p-1">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="alert alert-error mb-4">
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="modal-action">
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={closeModal}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                Enregistrer
              </button>
            </div>
          </form>
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={closeModal}>
            <X size={16} />
          </button>
        </div>
      </dialog>
    </>
  );
};

export default UserSettings;