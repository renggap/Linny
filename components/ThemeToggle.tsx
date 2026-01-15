/**
 * ============================================================================
 * THEME TOGGLE COMPONENT
 * ============================================================================
 * 
 * Provides a toggle switch for light/dark/system theme
 */

import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-lg transition-colors ${theme === 'light'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                title="Light mode"
                aria-label="Switch to light mode"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-9m9 0h-9m9 9l-9-9m9 9l9-9m-9 9l9-9m-9 9l-9-9"
                    />
                </svg>
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                title="Dark mode"
                aria-label="Switch to dark mode"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9 9 0 00-12.708 0 9 9 0 00-9 9 9 0 0012.708 0 9 9 0 013.354-6.646z"
                    />
                </svg>
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-lg transition-colors ${theme === 'system'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                title="System theme"
                aria-label="Use system theme"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1.75M4 4h16M4 4h16M4 4v16M4 4v16"
                    />
                </svg>
            </button>
        </div>
    );
}
