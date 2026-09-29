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

  const getValuasiLink = () => {
    if (!isAuthenticated) return '/peneliti/projects';
    const role = user?.role?.nama_role;
    if (role === 'Admin' || role === 'Administrator' || role === 'Super Admin') return '/admin/dashboard';
    return '/peneliti/projects';
  };

  const navLinks = [
    { name: t('nav.home'), href: '#hero' },
    { name: t('nav.about'), href: '#about' },
    { name: t('nav.valuation'), href: getValuasiLink() },
    { name: t('nav.contact'), href: '#map' },
  ];

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 sm:px-6 lg:px-8">
      <div
        className={`
          w-full max-w-5xl rounded-full px-3 sm:px-5 py-2.5
          transition-all duration-500
          ${isScrolled
            ? 'bg-white shadow-xl shadow-black/10'
            : 'bg-black/12 shadow-lg shadow-black/5'
          }
          backdrop-blur-md border border-white/10
        `}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 flex-shrink-0">
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
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`px-3 xl:px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    isScrolled
                      ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  className={`px-3 xl:px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    isScrolled
                      ? 'text-slate-700 hover:text-blue-600 hover:bg-slate-100'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </a>
              )
            )}
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
              className={`p-1.5 rounded-full transition-all ${
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

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed top-[72px] left-4 right-4 sm:left-6 sm:right-6
                     bg-black/80 backdrop-blur-md
                     rounded-2xl shadow-2xl shadow-black/20 border border-white/10
                     overflow-hidden animate-fade-in"
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/90
                             hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium text-white/90
                             hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {link.name}
                </a>
              )
            )}
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
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
                  >
                    <User size={16} /> {t('profile.myProfile', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); setShowMobileEditProfile(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
                  >
                    <Edit3 size={16} /> {t('profile.editProfile', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); setShowMobileChangePassword(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/90 hover:bg-white/10 transition-all"
                  >
                    <Lock size={16} /> {t('profile.changePassword', { ns: 'profile' })}
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm font-semibold text-white
                               bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200"
                  >
                    <LogOut size={16} /> {t('profile.logout', { ns: 'profile' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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
