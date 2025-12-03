import React, { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import Button from './Button';

function ThemeToggle({ className }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
    >
      {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </Button>
  );
}

export default ThemeToggle;
