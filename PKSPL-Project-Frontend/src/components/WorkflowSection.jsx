import React from 'react';
import { useTranslation } from 'react-i18next';

const WorkflowSection = () => {
  const { t } = useTranslation(['landing']);

  return (
    <section id="workflow" className="bg-gradient-to-br from-blue-600 to-blue-800 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white text-center">
            {t('workflow.title')}
          </h2>
          <p className="text-blue-100 text-lg text-center max-w-2xl mx-auto mt-4">
            {t('workflow.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          {/* Left Column: Images */}
          <div className="grid grid-cols-2 gap-4">
            <img 
              src="/images/coral-reef.jpg" 
              alt="Terumbu Karang" 
              className="col-span-2 rounded-xl h-48 object-cover w-full border-2 border-white/20" 
            />
            <img 
              src="/images/seagrass-meadow.jpg" 
              alt="Padang Lamun" 
              className="rounded-xl h-40 object-cover w-full border-2 border-white/20" 
            />
            <img 
              src="/images/tropical-island.jpg" 
              alt="Pulau Tropis" 
              className="rounded-xl h-40 object-cover w-full border-2 border-white/20" 
            />
          </div>

          {/* Right Column: Steps */}
          <div className="space-y-6">
            <div className="flex flex-row gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-shrink-0 border border-white/30">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{t('workflow.step1Title')}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {t('workflow.step1Desc')}
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-shrink-0 border border-white/30">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{t('workflow.step2Title')}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {t('workflow.step2Desc')}
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-shrink-0 border border-white/30">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{t('workflow.step3Title')}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {t('workflow.step3Desc')}
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-shrink-0 border border-white/30">
                4
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{t('workflow.step4Title')}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {t('workflow.step4Desc')}
                </p>
              </div>
            </div>

            <div className="flex flex-row gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center flex-shrink-0 border border-white/30">
                5
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">{t('workflow.step5Title')}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {t('workflow.step5Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
