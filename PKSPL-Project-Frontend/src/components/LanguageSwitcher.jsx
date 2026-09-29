import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const languages = [
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const LanguageSwitcher = ({ isScrolled = false, darkBg = false }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = (i18n.language || 'id').toLowerCase().startsWith('en') ? 'en' : 'id';
  const currentLang = languages.find((l) => l.code === currentLangCode) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('pkspl_language', code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          darkBg
            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            : isScrolled
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
        }`}
        aria-label="Select Language"
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="uppercase tracking-wider">{currentLang.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 z-50 overflow-hidden animate-fade-in">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                  currentLangCode === lang.code
                    ? 'bg-blue-50 text-[#1a56db] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
