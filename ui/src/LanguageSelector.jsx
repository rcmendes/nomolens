import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlobeIcon } from './icons';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt-BR', label: 'Português', short: 'PT-BR' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  const currentLang = LANGUAGES.find((lang) => i18n.language.toLowerCase().startsWith(lang.code.toLowerCase())) || LANGUAGES[0];

  return (
    <div className="language-selector" ref={containerRef}>
      <button 
        className="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('header.selectLanguage')}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <GlobeIcon size={16} />
        <span className="language-short">{currentLang.short}</span>
      </button>

      {isOpen && (
        <div className="language-dropdown" role="menu">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              role="menuitem"
              className={`language-option ${currentLang.code === lang.code ? 'active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
            >
              <span className="language-short-badge">{lang.short}</span>
              <span className="language-label">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
