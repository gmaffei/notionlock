import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Accessibility = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('accessibility.title')} - NotionLock</title>
        <meta name="description" content={t('accessibility.description')} />
      </Helmet>

      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">{t('accessibility.title')}</h1>
          
          <p className="text-lg text-gray-700 mb-4">
            {t('accessibility.description')}
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">{t('accessibility.commitment_title')}</h2>
          <p className="text-gray-700 mb-4">
            {t('accessibility.commitment_text')}
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">{t('accessibility.measures_title')}</h2>
          <p className="text-gray-700 mb-4">
            {t('accessibility.measures_text')}
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
            <li>{t('accessibility.measure_1')}</li>
            <li>{t('accessibility.measure_2')}</li>
            <li>{t('accessibility.measure_3')}</li>
            <li>{t('accessibility.measure_4')}</li>
            <li>{t('accessibility.measure_5')}</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">{t('accessibility.feedback_title')}</h2>
          <p className="text-gray-700 mb-4">
            {t('accessibility.feedback_text')}
          </p>

          <p className="text-sm text-gray-500 mt-8">
            {t('accessibility.last_updated')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Accessibility;
