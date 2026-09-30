import React from 'react';
import { TrendingUp, Database, Calculator, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AboutSection = () => {
  const { t } = useTranslation(['landing']);

  const pillars = [
    {
      icon: TrendingUp,
      title: t('about.pillar1Title'),
      desc: t('about.pillar1Desc'),
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      icon: Database,
      title: t('about.pillar2Title'),
      desc: t('about.pillar2Desc'),
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      icon: Calculator,
      title: t('about.pillar3Title'),
      desc: t('about.pillar3Desc'),
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      icon: Map,
      title: t('about.pillar4Title'),
      desc: t('about.pillar4Desc'),
      color: 'bg-sky-50 text-sky-600 border-sky-100',
    },
  ];

  return (
    <section id="about" className="py-16 lg:py-24 bg-white border-b border-slate-100 scroll-mt-24 relative">
      <span id="tentang" className="absolute -top-24 block pointer-events-none" />
      <span id="tentang-platform" className="absolute -top-24 block pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Image with Subtle Accent Frame */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-100">
              <img 
                src="/images/coastal-cliffs.jpg" 
                alt="Ekosistem Pesisir Indonesia" 
                className="w-full h-[360px] sm:h-[420px] lg:h-[460px] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-white/20 backdrop-blur-md">
                  Pesisir & Kelautan Indonesia
                </span>
                <p className="text-xs text-white/90 mt-1.5 font-medium">
                  Laboratorium alami keanekaragaman hayati dan jasa ekosistem bernilai tinggi.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Context & 4 Pillars */}
          <div className="lg:col-span-7">
            <div className="inline-block bg-blue-50 text-blue-700 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider mb-3">
              {t('about.tag')}
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t('about.title')}<br className="hidden sm:inline" />
              <span className="text-gradient"> {t('about.subtitle')}</span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-4 mb-6">
              {t('about.description')}
            </p>

            {/* 4 Focused Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {pillars.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border flex-shrink-0 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
