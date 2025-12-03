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
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/50 border-b border-white/40 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded bg-brand-600"></span>
          <span className="font-semibold tracking-tight">VocaResume Pro</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center max-w-3xl">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => cn(
                'px-2.5 py-2 rounded-md text-sm font-medium transition-colors hover:text-brand-600 whitespace-nowrap',
                isActive ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-600 dark:text-slate-300'
              )}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-slate-600 dark:text-slate-300"
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
        
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {token ? (
            <NavLink to="/logout" className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600">Logout</NavLink>
          ) : (
            <NavLink to="/login" className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600">Login</NavLink>
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/40 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <nav className="px-4 py-2 space-y-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive 
                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {t.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <ThemeToggle />
              {token ? (
                <NavLink 
                  to="/logout" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600"
                >
                  Logout
                </NavLink>
              ) : (
                <NavLink 
                  to="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600"
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
