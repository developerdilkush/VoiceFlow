import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext.jsx';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button className="btn-ghost !px-3" onClick={toggle} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}>
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
