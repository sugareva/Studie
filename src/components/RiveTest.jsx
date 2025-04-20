// src/components/RiveTest.jsx
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import { useEffect, useState } from "react";

const RiveTest = ({
  mood = "happy",
  isFeeding = false,
  timeOfDay = "day",
  customAnimation = null
}) => {
  // Suivi de l'état précédent pour détecter les changements
  const [prevFeeding, setPrevFeeding] = useState(isFeeding);
  
  // Utiliser un fichier unique pour tous les états si possible
  // Sinon, sélectionnez le fichier en fonction de l'humeur de base
  const baseFile = mood === "happy" ? 
    (timeOfDay === "night" ? "cat_sleep.riv" : "cat_idle.riv") : 
    "cat_sad.riv";
  
  const { rive, RiveComponent } = useRive({
    src: baseFile,
    autoplay: true,
    onLoadError: () => console.log("ERROR LOADING RIVE", baseFile),
    onLoad: (r) => {
      console.log("LOADED RIVE", baseFile);
      
      // Si le chat est en train d'être nourri au chargement
      if (isFeeding) {
        // Essayez de jouer l'animation de nourrissage directement
        try {
          // Le nom de l'animation dans votre fichier Rive (pas le nom du fichier)
          r.play("feeding"); // Remplacez par le nom réel de l'animation
          console.log("Playing feeding animation on load");
        } catch (err) {
          console.error("Error playing feeding animation on load:", err);
        }
      }
    },
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    })
  });
  
  // Effet pour suivre les changements d'état de nourrissage
  useEffect(() => {
    // Si l'état de nourrissage a changé
    if (prevFeeding !== isFeeding) {
      // Mettre à jour l'état précédent
      setPrevFeeding(isFeeding);
      
      if (!rive) return;
      
      try {
        if (isFeeding) {
          // Le nom correct de l'animation dans votre fichier Rive
          console.log("Trying to play feeding animation");
          rive.play("feeding"); // Remplacez par le nom réel de l'animation
        } else if (customAnimation) {
          console.log("Playing custom animation:", customAnimation);
          rive.play(customAnimation);
        } else {
          // Revenir à l'animation par défaut
          console.log("Playing default animation");
          rive.play("idle"); // Remplacez par le nom de l'animation par défaut
        }
      } catch (err) {
        console.error("Error triggering Rive animation:", err);
      }
    }
  }, [rive, isFeeding, customAnimation, prevFeeding]);
  
  // Logging pour le débogage
  console.log("RiveTest rendering with mood:", mood, "isFeeding:", isFeeding, "file:", baseFile);
  
  return (
    <div className="w-full h-full">
      <RiveComponent />
    </div>
  );
};

export default RiveTest;