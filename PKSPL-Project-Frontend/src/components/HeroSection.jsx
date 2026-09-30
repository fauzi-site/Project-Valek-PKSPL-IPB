import React from 'react';
import { MapPin, BookOpen, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const HeroSection = () => {
  const { t } = useTranslation(['landing']);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative min-h-[90vh] lg:min-h-screen flex items-center justify-center text-center text-white overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-beach.jpg')" }}
      />
      
      {/* Consistent Marine Blue Overlay */}
      <div className="absolute inset-0 z-10 hero-overlay" />
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a2540]/60 via-transparent to-[#0a2540]/80 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center pt-24 pb-20">
        
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.2] sm:leading-[1.18] tracking-tight max-w-4xl text-white drop-shadow-md">
          {t('hero.title')}
        </h1>
        
        {/* Formal Description */}
        <p className="text-base sm:text-lg lg:text-xl text-blue-100 max-w-2xl mt-5 sm:mt-6 leading-relaxed font-normal drop-shadow-sm">
          {t('hero.description')}
        </p>

        {/* Action Buttons: Primary 'Jelajahi Peta' & Secondary 'Pelajari Platform' */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          {/* Primary Button: Jelajahi Peta */}
          <a 
            href="#map"
            onClick={(e) => scrollToSection(e, 'map')}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-lg shadow-blue-900/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-blue-200" />
            <span>{t('hero.exploreMap')}</span>
          </a>

          {/* Secondary Button: Pelajari Platform */}
          <a 
            href="#about"
            onClick={(e) => scrollToSection(e, 'about')}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base border border-white/25 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-200" />
            <span>{t('hero.learnPlatform')}</span>
          </a>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20">
        <a 
          href="#about"
          onClick={(e) => scrollToSection(e, 'about')}
          className="text-white/70 hover:text-white transition-colors block animate-bounce" 
          aria-label="Scroll down to explore"
        >
          <ChevronDown className="w-7 h-7 sm:w-8 sm:h-8" />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
