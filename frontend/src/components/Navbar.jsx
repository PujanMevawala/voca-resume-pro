import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { cn } from '../lib/cn';

function Navbar({ token, onLogout }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const tabs = [
    { to: '/', label: 'Home' },
    { to: '/documents', label: 'Documents' },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400 to-purple-500 blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-brand-600 dark:from-slate-100 dark:to-brand-400 bg-clip-text text-transparent">
            VocaResume Pro
          </span>
        </NavLink>
        
        <nav className="hidden md:flex items-center gap-2 flex-1 justify-center max-w-2xl">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => cn(
                'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                isActive 
                  ? 'text-white bg-gradient-to-r from-brand-600 to-purple-600 shadow-lg' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600'
              )}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {token ? (
            <NavLink 
              to="/logout" 
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 transition-all"
            >
              Logout
            </NavLink>
          ) : (
            <NavLink 
              to="/login" 
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-lg">
          <nav className="px-4 py-4 space-y-2">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  'block px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                  isActive 
                    ? 'text-white bg-gradient-to-r from-brand-600 to-purple-600 shadow-lg' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {t.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
              <ThemeToggle />
              {token ? (
                <NavLink 
                  to="/logout" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Logout
                </NavLink>
              ) : (
                <NavLink 
                  to="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 shadow-lg transition-all"
                >
                  Login
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
