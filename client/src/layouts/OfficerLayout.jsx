import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Map,
  AlertOctagon,
  Activity,
  Camera,
  TrendingUp,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Building2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LiveIndicator } from '../components/common/LiveIndicator';
import { DemoControlBar } from '../components/common/DemoControlBar';
import { NotificationDropdown } from '../components/common/NotificationDropdown';
import { DISTRICTS } from '../utils/constants';

export const OfficerLayout = ({ selectedDistrict, onDistrictChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Command Overview', path: '/officer/dashboard', icon: LayoutDashboard },
    { label: 'Live GIS Risk Map', path: '/officer/map', icon: Map },
    { label: 'Alerts & Verification', path: '/officer/alerts', icon: AlertOctagon },
    { label: 'IoT Sensor Health', path: '/officer/sensors', icon: Activity },
    { label: 'Citizen Reports', path: '/officer/citizen-reports', icon: Camera },
    { label: 'Analytics & Accuracy', path: '/officer/analytics', icon: TrendingUp },
    { label: 'Audit Log Trail', path: '/officer/audit', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#ededed] flex flex-col font-sans antialiased selection:bg-[#171717] selection:text-[#f2f2f2]">
      {/* Pitch Demo Simulation Controls Bar */}
      <DemoControlBar />

      {/* Enterprise NOC Top Header (Vercel-Inspired Sleek Header) */}
      <header className="bg-[#0a0a0a]/95 border-b border-neutral-800/80 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-white font-semibold shadow-sm">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-[-0.4px] text-white block">
                RAKSHA-NER
              </span>
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:block uppercase tracking-wider leading-none">
                Disaster Operations Command Center
              </span>
            </div>
          </div>
        </div>

        {/* Center: District Switcher (Pill shape) */}
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-neutral-500 hidden sm:block" />
          <select
            value={selectedDistrict}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="bg-neutral-900 text-neutral-200 font-mono text-xs border border-neutral-700/80 rounded-full px-3 py-1.5 focus:border-neutral-500 focus:outline-none cursor-pointer transition-colors shadow-sm"
          >
            {DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Header Status */}
        <div className="flex items-center gap-3">
          <LiveIndicator showLabel={true} />

          <NotificationDropdown role="OFFICER" />

          <div className="hidden lg:flex items-center gap-1.5 text-neutral-400 font-mono text-[11px] px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-neutral-800 text-xs">
            <div className="text-right hidden sm:block">
              <span className="font-medium text-neutral-200 block truncate max-w-[130px] tracking-tight">
                {user?.name || 'Officer'}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono block leading-none">
                {user?.officerDetails?.department || 'SDMA'} In-charge
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/80 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Sidebar / Collapsible Mobile Drawer */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-[#0a0a0a] border-r border-neutral-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="p-3.5 space-y-1 overflow-y-auto">
            <span className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2 block">
              Operational Modules
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium tracking-tight transition-all duration-150 ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.5)] border border-neutral-700/60 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-neutral-800/80 text-[11px] text-neutral-500 space-y-1 font-mono">
            <div className="flex items-center justify-between text-neutral-400 font-medium">
              <span>Jurisdiction</span>
              <span className="text-sky-400">{selectedDistrict}</span>
            </div>
            <p className="text-[10px] text-neutral-500 leading-tight">
              RAKSHA-NER v1.0.0 · Disaster Management Authority
            </p>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#050505]">
          <div className="max-w-[1440px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
