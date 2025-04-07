// src/utils/dayMapping.js

export const dayMappings = {
    // Anglais -> Français
    "Monday": "Lundi",
    "Tuesday": "Mardi",
    "Wednesday": "Mercredi",
    "Thursday": "Jeudi",
    "Friday": "Vendredi",
    "Saturday": "Samedi",
    "Sunday": "Dimanche"
  };
  
  // Fonction qui convertit un jour d'une langue à l'autre
  export const translateDay = (day, fromLanguage, toLanguage) => {
    if (fromLanguage === toLanguage) return day;
    
    // Si on convertit de l'anglais vers le français
    if (fromLanguage === 'en' && toLanguage === 'fr') {
      return dayMappings[day] || day;
    }
    
    // Si on convertit du français vers l'anglais
    if (fromLanguage === 'fr' && toLanguage === 'en') {
      // Inverser l'objet de mappage
      const reverseMappings = Object.entries(dayMappings).reduce((acc, [en, fr]) => {
        acc[fr] = en;
        return acc;
      }, {});
      
      return reverseMappings[day] || day;
    }
    
    return day;
  };
  
  // Fonction qui traduit un jour stocké (français) vers la langue actuelle pour l'affichage
  export const translateStoredDay = (storedDay, targetLanguage) => {
    return translateDay(storedDay, 'fr', targetLanguage);
  };
  
  // Fonction qui convertit un jour depuis la langue actuelle vers le format stocké (français)
  export const convertToStoredFormat = (currentDay, currentLanguage) => {
    return translateDay(currentDay, currentLanguage, 'fr');
  };