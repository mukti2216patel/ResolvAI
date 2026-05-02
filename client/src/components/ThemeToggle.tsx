import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border-color bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary hover:border-accent-theme/40 cursor-pointer transition-all duration-200"
        aria-label="Toggle theme"
      >
        {theme === 'light' && <Sun className="w-4 h-4 text-amber-500 animate-fadeIn" />}
        {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400 animate-fadeIn" />}
        {theme === 'system' && <Laptop className="w-4 h-4 text-emerald-400 animate-fadeIn" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-lg border border-border-color bg-bg-card shadow-lg z-[200] py-1 animate-slideUp font-mono text-xs">
          <button
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${
              theme === 'light'
                ? 'bg-accent-theme/15 text-accent-theme font-bold'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${
              theme === 'dark'
                ? 'bg-accent-theme/15 text-accent-theme font-bold'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors ${
              theme === 'system'
                ? 'bg-accent-theme/15 text-accent-theme font-bold'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            System
          </button>
        </div>
      )}
    </div>
  );
}
