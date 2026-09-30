import React from 'react';
import { MapPin, Facebook, Twitter, Instagram, Linkedin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation(['landing', 'common']);

  return (
    <footer id="contact" className="bg-[#081f37] text-white border-t border-slate-800 scroll-mt-24 relative">
      <span id="kontak" className="absolute -top-24 block pointer-events-none" />
      <span id="bantuan" className="absolute -top-24 block pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid Content */}
        <div className="py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1 - Identity & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img 
                src="/images/ipb-logo.png" 
                alt="IPB University Logo" 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20" 
              />
              <div>
                <span className="text-white text-lg font-bold block leading-tight">PKSPL IPB</span>
                <span className="text-[11px] text-blue-300 font-medium block">IPB University</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              {t('footer.aboutText')}
            </p>
          </div>

          {/* Column 2 - Navigation */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 pb-1 border-b border-white/10">
              {t('footer.navTitle')}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#hero" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.home')}
                </a>
              </li>
              <li>
                <a href="#about" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.about')}
                </a>
              </li>
              <li>
                <a href="#map" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.map')}
                </a>
              </li>
              <li>
                <a href="#workflow" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.workflow')}
                </a>
              </li>
              <li>
                <a href="#stats" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.stats')}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 - System Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 pb-1 border-b border-white/10">
              {t('footer.systemTitle')}
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/login" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.researcherAccess')}
                </Link>
              </li>
              <li>
                <Link to="/peneliti/projects" className="text-slate-400 hover:text-white transition-colors">
                  {t('footer.valuationPortal')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Contact & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 pb-1 border-b border-white/10">
              {t('common:footer.contactUs')}
            </h3>
            <div className="flex gap-2.5 items-start">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {t('common:footer.address')}
              </p>
            </div>
            {/* Social Icons */}
            <div className="flex gap-2.5 pt-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="Facebook" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="Twitter" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="Instagram" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noreferrer" 
                aria-label="LinkedIn" 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-600 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs">
            © 2026 PKSPL IPB University. {t('common:footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Sistem Valuasi Ekonomi Pesisir & Laut</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
