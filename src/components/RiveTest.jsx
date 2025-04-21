import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import { useEffect, useState, useRef } from "react";

const RiveTest = ({
  mood = "happy",
  isFeeding = false,
  timeOfDay = "day",
  customAnimation = null
}) => {
  const riveInstance = useRef(null);
  
  // Configuration spécifique pour chaque fichier Rive
  const riveFiles = {
    idle: {
      file: "cat_idle.riv",
      stateMachine: "Idle",
      animation: "Timeline1"
    },
    sad: {
      file: "cat_sad.riv",
      stateMachine: "Cat_Sad",
      animation: "Timeline1"
    },
    feeding: {
      file: "cat_feeding.riv",
      stateMachine: "Feeding",
      animation: "CroquetteFeeding"
    },
    sleeping: {
      file: "cat_sleeping.riv",
      stateMachine: "Sleep",
      animation: "Sleep"
    }
  };
  
  // Déterminer quel type de fichier utiliser
  const getFileType = () => {
    if (isFeeding) return "feeding";
    if (timeOfDay === "night") return "sleeping";
    return mood === "happy" ? "idle" : "sad";
  };
  
  // État pour le type de fichier actuel
  const [currentFileType, setCurrentFileType] = useState(getFileType());
  
  // Force un rechargement quand le type de fichier change
  const [key, setKey] = useState(0);
  
  // Mettre à jour le type de fichier quand l'état change
  useEffect(() => {
    const newFileType = getFileType();
    if (newFileType !== currentFileType) {
      console.log(`Changing Rive file type: ${currentFileType} -> ${newFileType}`);
      setCurrentFileType(newFileType);
      setKey(prev => prev + 1); // Force un rechargement complet
    }
  }, [mood, isFeeding, timeOfDay, currentFileType]);
  
  // Obtenir la configuration pour le type de fichier actuel
  const currentConfig = riveFiles[currentFileType];
  
  // Charger le fichier Rive
  const { rive, RiveComponent } = useRive({
    src: currentConfig.file,
    animations: currentConfig.animation,
    stateMachines: currentConfig.stateMachine,
    autoplay: true,
    onLoadError: (err) => console.error("ERROR LOADING RIVE", currentConfig.file, err),
    onLoad: (r) => {
      console.log("LOADED RIVE", currentConfig.file);
      console.log("Available animations:", r.animationNames);
      console.log("Available state machines:", r.stateMachineNames);
      riveInstance.current = r;
    },
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    })
  });
  
  // Logging pour le débogage
  console.log("RiveTest rendering with:", {
    mood,
    isFeeding,
    timeOfDay,
    fileType: currentFileType,
    file: currentConfig.file,
    animation: currentConfig.animation,
    stateMachine: currentConfig.stateMachine,
    key
  });
  
  return (
    <div className="w-full h-full">
      <RiveComponent key={key} />
    </div>
  );
};

export default RiveTest;