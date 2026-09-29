import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronUp } from 'lucide-react';

const languages = [
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const FloatingLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = (i18n.language || 'id').toLowerCase().startsWith('en') ? 'en' : 'id';

  // Click outside and ESC key handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsHovered(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsHovered(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('pkspl_language', code);
    setIsOpen(false);
    setIsHovered(false);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  // Active visual state (Hover or Dropdown Open)
  const isActive = isOpen || isHovered;

  return (
    <div
      ref={dropdownRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-[9990] flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Dropdown Options Menu */}
      {isOpen && (
        <div className="mb-2 w-44 bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200/80 overflow-hidden animate-fade-in p-1.5 border border-slate-100 opacity-100">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentLangCode === lang.code
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {currentLangCode === lang.code && (
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Floating Control Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-label="Language Selector / Ganti Bahasa"
        title="Ganti Bahasa / Switch Language"
        className={`group flex items-center gap-2 rounded-full backdrop-blur-md border shadow-lg transition-all duration-300 ease-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
          isActive
            ? 'px-3.5 py-2.5 bg-white/95 border-slate-200 text-slate-800 opacity-100 shadow-slate-900/10 scale-100'
            : 'px-2.5 py-2.5 bg-white/40 border-slate-200/60 text-slate-600 opacity-30 hover:opacity-100 hover:bg-white/90 scale-95'
        }`}
      >
        <Globe className={`w-4 h-4 text-blue-600 transition-transform duration-300 ${isActive ? 'rotate-12' : ''}`} />
        
        <span className={`text-xs font-bold uppercase tracking-wider text-slate-800 transition-all duration-200 ${isActive ? 'inline-block' : 'hidden md:inline-block'}`}>
          {currentLangCode}
        </span>

        <ChevronUp size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'inline-block' : 'hidden'}`} />
      </button>
    </div>
  );
};

export default FloatingLanguageSwitcher;
