import React from 'react';
import { Outlet } from 'react-router-dom';
import { LightParticleBackground } from '../components/common/LightParticleBackground';

export const CitizenLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#deecfc] via-[#eaf2fc] to-[#f5f9ff] flex flex-col font-sans antialiased text-neutral-900 selection:bg-neutral-900 selection:text-white relative overflow-x-hidden">
      <LightParticleBackground />
      <div className="flex-1 max-w-2xl md:max-w-3xl mx-auto w-full relative z-10">
        <Outlet />
      </div>
    </div>
  );
};
