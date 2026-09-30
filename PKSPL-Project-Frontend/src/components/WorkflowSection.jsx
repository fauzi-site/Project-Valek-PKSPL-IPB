import React from 'react';
import { 
  FolderPlus, 
  MapPin, 
  SlidersHorizontal, 
  Leaf, 
  Calculator, 
  FileCheck, 
  ArrowRight,
  Workflow
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WorkflowSection = () => {
  const { t } = useTranslation(['landing']);

  const steps = [
    {
      num: '01',
      icon: FolderPlus,
      title: t('workflow.step1Title'),
      desc: t('workflow.step1Desc'),
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      num: '02',
      icon: MapPin,
      title: t('workflow.step2Title'),
      desc: t('workflow.step2Desc'),
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      num: '03',
      icon: SlidersHorizontal,
      title: t('workflow.step3Title'),
      desc: t('workflow.step3Desc'),
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      num: '04',
      icon: Leaf,
      title: t('workflow.step4Title'),
      desc: t('workflow.step4Desc'),
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
    },
    {
      num: '05',
      icon: Calculator,
      title: t('workflow.step5Title'),
      desc: t('workflow.step5Desc'),
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      num: '06',
      icon: FileCheck,
      title: t('workflow.step6Title'),
      desc: t('workflow.step6Desc'),
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    }
  ];

  return (
    <section id="workflow" className="bg-[#0b1f38] text-white py-16 lg:py-24 border-t border-b border-slate-800 relative overflow-hidden scroll-mt-24">
      <span id="valuasi-ekonomi" className="absolute -top-24 block pointer-events-none" />
      <span id="valuasi" className="absolute -top-24 block pointer-events-none" />
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wider uppercase mb-3">
            <Workflow className="w-3.5 h-3.5" />
            <span>{t('workflow.tag')}</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {t('workflow.title')}
          </h2>
          
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mt-3 max-w-2xl mx-auto">
            {t('workflow.subtitle')}
          </p>
        </div>

        {/* 6 Structured Workflow Steps Grid (3 cols desktop, 2 cols tablet, 1 col mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm border border-white/10 hover:border-blue-400/30 rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-black/20"
              >
                <div>
                  {/* Card Top: Number & Icon */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-extrabold font-mono text-slate-400 tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                      LANGKAH {step.num}
                    </span>
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${step.color} transition-transform group-hover:scale-110`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Action Prompt to Access Workflow */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] p-6 rounded-2xl border">
          <div>
            <h4 className="font-bold text-white text-base sm:text-lg">
              Siap Melakukan Analisis Valuasi?
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Akses modul peneliti PKSPL IPB untuk memulai pencatatan proyek dan perhitungan TEV.
            </p>
          </div>
          
          <Link
            to="/peneliti/projects"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 shrink-0 group cursor-pointer"
          >
            <span>{t('workflow.startWorkflow')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default WorkflowSection;
