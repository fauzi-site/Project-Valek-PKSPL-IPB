import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WorkflowSection = () => {
  const { t } = useTranslation(['landing']);

  const steps = [
    {
      num: 1,
      title: t('workflow.step1Title'),
      desc: t('workflow.step1Desc'),
    },
    {
      num: 2,
      title: t('workflow.step2Title'),
      desc: t('workflow.step2Desc'),
    },
    {
      num: 3,
      title: t('workflow.step3Title'),
      desc: t('workflow.step3Desc'),
    },
    {
      num: 4,
      title: t('workflow.step4Title'),
      desc: t('workflow.step4Desc'),
    },
    {
      num: 5,
      title: t('workflow.step5Title'),
      desc: t('workflow.step5Desc'),
    },
    {
      num: 6,
      title: t('workflow.step6Title'),
      desc: t('workflow.step6Desc'),
    }
  ];

  return (
    <section id="workflow" className="bg-gradient-to-br from-[#1a56db] via-[#164ecc] to-[#0f3ea8] text-white py-16 lg:py-24 relative overflow-hidden scroll-mt-24">
      <span id="valuasi-ekonomi" className="absolute -top-24 block pointer-events-none" />
      <span id="valuasi" className="absolute -top-24 block pointer-events-none" />

      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {t('workflow.title')}
          </h2>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed mt-3 max-w-2xl mx-auto">
            {t('workflow.subtitle')}
          </p>
        </div>

        {/* 2-Column Layout: Left Images, Right Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: 3 Images Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4.5">
            <div className="col-span-2 overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl group">
              <img 
                src="/images/coral-reef.jpg" 
                alt="Terumbu Karang" 
                className="col-span-2 rounded-2xl h-48 sm:h-56 md:h-64 object-cover w-full transition-transform duration-500 group-hover:scale-105" 
              />
            </div>
            <div className="overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl group">
              <img 
                src="/images/seagrass-meadow.jpg" 
                alt="Padang Lamun" 
                className="rounded-2xl h-36 sm:h-44 object-cover w-full transition-transform duration-500 group-hover:scale-105" 
              />
            </div>
            <div className="overflow-hidden rounded-2xl border-2 border-white/20 shadow-xl group">
              <img 
                src="/images/tropical-island.jpg" 
                alt="Pulau Tropis" 
                className="rounded-2xl h-36 sm:h-44 object-cover w-full transition-transform duration-500 group-hover:scale-105" 
              />
            </div>
          </div>

          {/* Right Column: 6 Numbered Steps List */}
          <div className="space-y-4.5 sm:space-y-5">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-3.5 sm:gap-4 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center shrink-0 border border-white/30 text-sm sm:text-base shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:bg-white/30">
                  {step.num}
                </div>
                <div className="pt-0.5">
                  <h3 className="font-bold text-white text-base sm:text-lg leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom CTA Banner (from Gambar 3, adapted for the blue theme) */}
        <div className="mt-12 sm:mt-16 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl">
          <div>
            <h4 className="font-bold text-white text-base sm:text-lg">
              {t('workflow.ctaTitle')}
            </h4>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {t('workflow.ctaDesc')}
            </p>
          </div>
          
          <Link
            to="/peneliti/projects"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 shrink-0 group cursor-pointer whitespace-nowrap"
          >
            <span>{t('workflow.startWorkflow')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-700" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default WorkflowSection;
