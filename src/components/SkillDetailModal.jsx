import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SkillDetailModal = ({ isOpen, onClose, skillId, targetLanguage, skillTitle }) => {
  // Utilisez deux appels à useTranslation:
  // 1. Pour les détails des compétences (namespace 'roadmap')
  // 2. Pour les textes d'interface (namespace par défaut 'translation')
  const { t: tRoadmap, i18n } = useTranslation('roadmap');
  const { t } = useTranslation(); // Pour les textes d'interface
  
  const currentLanguage = i18n.language; // 'fr' ou 'en'
  
  if (!isOpen) return null;
  
  // Récupérer les détails selon votre structure
  const path = `competence_details.${skillId}.${currentLanguage}.language_specific.${targetLanguage}`;
  const skillDetails = tRoadmap(path, {
    returnObjects: true,
    defaultValue: null
  });
  
  // Pour le débogage - à retirer en production
  console.log("Paramètres:", { skillId, targetLanguage, currentLanguage });
  console.log("Chemin d'accès:", path);
  console.log("Données récupérées:", skillDetails);
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-base-100 rounded-xl w-full max-w-xl shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">{skillTitle}</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="btn btn-sm btn-circle"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-6">
          {skillDetails ? (
            <div className="space-y-4">
              {skillDetails.description && (
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">{t('skillDetail.description')}</h3>
                  <p className="text-base-content">{skillDetails.description}</p>
                </div>
              )}
              
              {skillDetails.examples && (
                <div>
                  <h3 className="font-semibold text-lg text-primary mb-2">{t('skillDetail.examples')}</h3>
                  <p className="text-base-content">{skillDetails.examples}</p>
                </div>
              )}
              
              {skillDetails.tips && (
                <div role="alert" className="alert alert-info alert-soft" >
                  <h3 className="font-semibold text-lg mb-2">{t('skillDetail.tips')}</h3>
                  <p className="">{skillDetails.tips}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-base-content">{t('skillDetail.noDetailsAvailable')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillDetailModal;