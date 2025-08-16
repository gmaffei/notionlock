import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

const Accessibility = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('accessibility_page.title')} - NotionLock</title>
        <meta name="description" content={t('accessibility_page.p1')} />
      </Helmet>

      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('accessibility_page.title')}</h1>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('accessibility_page.p1') }} />
              
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('accessibility_page.commitment_title')}</h2>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('accessibility_page.commitment_p1') }} />

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('accessibility_page.measures_title')}</h2>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_p1') }} />
              <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                <li dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_li1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_li2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_li3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_li4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('accessibility_page.measures_li5') }} />
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('accessibility_page.feedback_title')}</h2>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('accessibility_page.feedback_p1') }} />

              <p className="text-sm text-gray-500 mt-8">{t('accessibility_page.last_updated')}</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Accessibility;