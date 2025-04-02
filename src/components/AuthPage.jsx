import React from 'react';
import CustomAuth from './CustomAuth';

const AuthPage = () => {
  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-base-100 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-primary">Studie</h1>
        <p className="text-center mt-2 text-base-content/70">Suivez vos objectifs d'étude</p>
      </div>
      
      <CustomAuth />
      
      <div className="mt-8 text-sm text-base-content/50 max-w-md text-center">
        En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </div>
    </div>
  );
};

export default AuthPage;