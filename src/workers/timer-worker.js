// src/workers/timer-worker.js
let timerId = null;
let startTime = null;
let pausedTime = 0;
let isRunning = false;

// Fonction pour gérer les messages reçus du thread principal
self.onmessage = function(e) {
  const { action, data } = e.data;
  
  switch (action) {
    case 'START':
      startTimer(data);
      break;
    case 'PAUSE':
      pauseTimer();
      break;
    case 'RESET':
      resetTimer();
      break;
    case 'GET_TIME':
      sendCurrentTime();
      break;
    default:
      console.error('Action non reconnue:', action);
  }
};

// Démarrer le timer
function startTimer(savedTime) {
  isRunning = true;
  
  // Si on reprend après une pause
  if (savedTime && savedTime.pausedTime) {
    pausedTime = savedTime.pausedTime;
  }
  
  startTime = Date.now();
  
  // Envoyer des mises à jour régulièrement
  timerId = setInterval(() => {
    sendCurrentTime();
  }, 1000);
  
  // Envoyer le temps actuel immédiatement
  sendCurrentTime();
}

// Mettre en pause le timer
function pauseTimer() {
  if (!isRunning) return;
  
  isRunning = false;
  
  // Calculer le temps écoulé et l'ajouter au temps en pause
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  pausedTime += elapsed;
  
  // Arrêter l'intervalle
  clearInterval(timerId);
  
  // Envoyer le temps final
  sendCurrentTime();
}

// Réinitialiser le timer
function resetTimer() {
  isRunning = false;
  startTime = null;
  pausedTime = 0;
  
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  
  // Envoyer le temps réinitialisé
  sendCurrentTime();
}

// Envoyer le temps actuel au thread principal
function sendCurrentTime() {
  let currentTime = pausedTime;
  
  // Si le timer est en cours, ajouter le temps écoulé depuis le dernier départ
  if (isRunning && startTime) {
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    currentTime += elapsed;
  }
  
  self.postMessage({
    time: currentTime,
    isRunning: isRunning
  });
}