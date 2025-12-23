import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('privacy_page.title')} - NotionLock</title>
        <meta name="description" content={t('privacy_page.intro_p1')} />
      </Helmet>

      <Header />

      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('privacy_page.title')}</h1>
              <p className="text-sm text-gray-500 mb-6">{t('privacy_page.last_updated')}</p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.intro_title')}</h2>
              <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('privacy_page.intro_p1') }} />

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.data_title')}</h2>
              <p className="text-lg text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t('privacy_page.data_p1') }} />
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.data_li1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.data_li2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.data_li3') }} />
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.usage_title')}</h2>
              <p className="text-lg text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_p1') }} />
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-2">
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_li1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_li2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_li3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_li4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('privacy_page.usage_li5') }} />
              </ul>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.security_title')}</h2>
              <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('privacy_page.security_p1') }} />

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.sharing_title')}</h2>
              <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('privacy_page.sharing_p1') }} />

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.rights_title')}</h2>
              <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('privacy_page.rights_p1') }} />

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.changes_title')}</h2>
              <p className="text-lg text-gray-700 mb-6" dangerouslySetInnerHTML={{ __html: t('privacy_page.changes_p1') }} />

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('privacy_page.contact_title')}</h2>
              <p className="text-lg text-gray-700" dangerouslySetInnerHTML={{ __html: t('privacy_page.contact_p1') }} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;