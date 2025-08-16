import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('about')} - NotionLock</title>
        <meta name="description" content={t('about_page.p1')} />
      </Helmet>

      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('about_page.title')}</h1>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('about_page.p1') }} />
              
              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('about_page.mission_title')}</h2>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('about_page.mission_p1') }} />

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('about_page.why_title')}</h2>
              <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                <li dangerouslySetInnerHTML={{ __html: t('about_page.why_li1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('about_page.why_li2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('about_page.why_li3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('about_page.why_li4') }} />
              </ul>

              <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">{t('about_page.future_title')}</h2>
              <p className="text-lg text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: t('about_page.future_p1') }} />
              <p className="text-lg text-gray-600" dangerouslySetInnerHTML={{ __html: t('about_page.future_p2') }} />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;