import React, { useState, useEffect } from 'react';
import { Menu, X, User, Edit3, Lock, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import ProfileModal from './ProfileModal';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';

const Navbar = () => {
  const { t } = useTranslation(['common', 'profile']);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showMobileEditProfile, setShowMobileEditProfile] = useState(false);
  const [showMobileChangePassword, setShowMobileChangePassword] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success(t('messages.loggedOut'));
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('nav.home', { defaultValue: 'Beranda' }), href: '#hero', targetId: 'hero' },
    { name: t('nav.aboutPlatform', { defaultValue: 'Tentang Platform' }), href: '#about', targetId: 'about' },
    { name: t('nav.mapDistribution', { defaultValue: 'Peta Sebaran' }), href: '#map', targetId: 'map' },
    { name: t('nav.valuation', { defaultValue: 'Valuasi Ekonomi' }), href: '#workflow', targetId: 'workflow' },
    { name: t('nav.contact', { defaultValue: 'Bantuan / Kontak' }), href: '#contact', targetId: 'contact' },
  ];

  const handleNavClick = (e, link) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);

    const targetId = link.targetId || link.href.replace(/^.*#/, '');
    const isLandingPage = window.location.pathname === '/' || window.location.pathname === '';

    if (isLandingPage) {
      if (targetId === 'hero' || !targetId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
      } else {
        const el = document.getElementById(targetId);
        if (el) {
          const navbarHeight = 90;
          const elementPosition = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: Math.max(0, elementPosition - navbarHeight),
            behavior: 'smooth'
          });
          window.history.pushState(null, '', `#${targetId}`);
        } else {
          window.location.hash = targetId;
        }
      }
    } else {
      navigate(`/#${targetId}`);
    }
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 sm:px-6 lg:px-8">
      <div
        className={`
          w-full max-w-5xl xl:max-w-6xl rounded-full px-3 sm:px-5 py-2.5
          transition-all duration-500
          ${isScrolled
            ? 'bg-white shadow-xl shadow-black/10'
            : 'bg-black/12 shadow-lg shadow-black/5'
          }
          backdrop-blur-md border border-white/10
        `}
      >
        <div className="flex items-center justify-between">
          {/* Logo PKSPL IPB */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, { href: '#hero', targetId: 'hero' })}
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
          >
            <img
              src="/images/ipb-logo.png"
              alt="IPB Logo"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30"
            />
            <span className={`font-bold ${isScrolled ? 'text-slate-900' : 'text-white'} text-sm sm:text-base tracking-wide whitespace-nowrap`}>
              PKSPL IPB
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`px-2.5 xl:px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isScrolled
                    ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Login/Profile */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {!isAuthenticated ? (
              <Link
                to="/login"
                className={`px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200 border whitespace-nowrap ${
                  isScrolled
                    ? 'text-white bg-blue-600 hover:bg-blue-700 border-blue-600'
                    : 'text-white bg-white/15 hover:bg-white/25 border-white/20 hover:border-white/40'
                }`}
              >
                {t('nav.loginRegister')}
              </Link>
            ) : (
              <ProfileDropdown isScrolled={isScrolled} />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                isScrolled
                  ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop & Navigation Dropdown */}
      {isMobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="lg:hidden fixed top-[72px] left-4 right-4 sm:left-6 sm:right-6
                       bg-black/85 backdrop-blur-md
                       rounded-2xl shadow-2xl shadow-black/20 border border-white/10
                       max-h-[calc(100vh-5.5rem)] overflow-y-auto z-50 animate-fade-in"
          >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/90
                           hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-2 pb-1 border-t border-white/10 mt-2">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-white
                             bg-white/15 hover:bg-white/25 text-center transition-all duration-200"
                >
                  {t('nav.loginRegister')}
                </Link>
              ) : (
                <div className="px-4 py-2 space-y-1">
                  <p className="text-sm text-white/70 mb-2">{t('nav.loggedInAs')} <span className="font-medium text-white">{user?.nama}</span></p>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); setShowMobileProfile(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <User size={16} /> {t('profile.myProfile', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); setShowMobileEditProfile(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Edit3 size={16} /> {t('profile.editProfile', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); setShowMobileChangePassword(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <Lock size={16} /> {t('profile.changePassword', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-semibold text-white
                               bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 cursor-pointer"
                  >
                    <LogOut size={16} /> {t('profile.logout', { ns: 'profile' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}
    </nav>

    {/* Mobile Modals */}
    {showMobileProfile && (
      <ProfileModal
        onClose={() => setShowMobileProfile(false)}
        onEditProfile={() => { setShowMobileProfile(false); setShowMobileEditProfile(true); }}
        onChangePassword={() => { setShowMobileProfile(false); setShowMobileChangePassword(true); }}
      />
    )}
    {showMobileEditProfile && (
      <EditProfileModal onClose={() => setShowMobileEditProfile(false)} />
    )}
    {showMobileChangePassword && (
      <ChangePasswordModal onClose={() => setShowMobileChangePassword(false)} />
    )}
    </>
  );
};

export default Navbar;
