import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonId from './locales/id/common';
import authId from './locales/id/auth';
import profileId from './locales/id/profile';
import projectId from './locales/id/project';
import mapId from './locales/id/map';
import valuationId from './locales/id/valuation';
import dashboardId from './locales/id/dashboard';
import landingId from './locales/id/landing';

import commonEn from './locales/en/common';
import authEn from './locales/en/auth';
import profileEn from './locales/en/profile';
import projectEn from './locales/en/project';
import mapEn from './locales/en/map';
import valuationEn from './locales/en/valuation';
import dashboardEn from './locales/en/dashboard';
import landingEn from './locales/en/landing';

const getInitialLanguage = () => {
  const savedLang = localStorage.getItem('pkspl_language');
  if (savedLang === 'id' || savedLang === 'en') {
    return savedLang;
  }
  
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  
  return 'id';
};

const resources = {
  id: {
    common: commonId,
    auth: authId,
    profile: profileId,
    project: projectId,
    map: mapId,
    valuation: valuationId,
    dashboard: dashboardId,
    landing: landingId
  },
  en: {
    common: commonEn,
    auth: authEn,
    profile: profileEn,
    project: projectEn,
    map: mapEn,
    valuation: valuationEn,
    dashboard: dashboardEn,
    landing: landingEn
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'id',
    defaultNS: 'common',
    ns: ['common', 'auth', 'profile', 'project', 'map', 'valuation', 'dashboard', 'landing'],
    interpolation: {
      escapeValue: false // React already escapes XSS
    }
  });

export default i18n;
