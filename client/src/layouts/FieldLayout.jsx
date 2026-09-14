import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LiveIndicator } from '../components/common/LiveIndicator';
import { DemoControlBar } from '../components/common/DemoControlBar';
import { LightParticleBackground } from '../components/common/LightParticleBackground';

export const FieldLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#deecfc] via-[#eaf2fc] to-[#f5f9ff] text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-900 selection:text-white relative overflow-hidden">
      <LightParticleBackground />
      <DemoControlBar />

      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/60 px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e6f1fb] border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
            <Shield className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <span className="font-bold text-sm text-neutral-900 block leading-tight">RAKSHA-NER</span>
            <span className="text-[10px] text-sky-600 font-mono uppercase tracking-wider font-semibold">Field Inspection App</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LiveIndicator showLabel={true} />
          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto relative z-10">
        <div className="max-w-[1280px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

