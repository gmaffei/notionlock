import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdBanner from '../components/AdBanner';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

const Homepage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('homepage.seo_title')}</title>
        <meta name="description" content={t('homepage.seo_description')} />
      </Helmet>

      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                {t('homepage.hero.title_part1')}
                <span className="block text-blue-600 mt-2">{t('homepage.hero.title_part2')}</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                {t('homepage.hero.description')}
              </p>
              <button
                onClick={() => navigate(token ? '/dashboard' : '/auth')}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {t('homepage.hero.button')}
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{t('homepage.features.setup_title')}</h3>
                <p className="text-gray-600">{t('homepage.features.setup_description')}</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{t('homepage.features.free_title')}</h3>
                <p className="text-gray-600">{t('homepage.features.free_description')}</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{t('homepage.features.privacy_title')}</h3>
                <p className="text-gray-600">{t('homepage.features.privacy_description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.how_it_works.title')}</h2>
            
            <div className="max-w-4xl mx-auto">
              <div className="space-y-12">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{t('homepage.how_it_works.step1_title')}</h3>
                    <p className="text-gray-600">{t('homepage.how_it_works.step1_description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{t('homepage.how_it_works.step2_title')}</h3>
                    <p className="text-gray-600">{t('homepage.how_it_works.step2_description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{t('homepage.how_it_works.step3_title')}</h3>
                    <p className="text-gray-600">{t('homepage.how_it_works.step3_description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.testimonials.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial1_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial1_author')}</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial2_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial2_author')}</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial3_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial3_author')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.faq.title')}</h2>
            <div className="max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{t('homepage.faq.question1_title')}</h3>
                  <p className="text-gray-600">{t('homepage.faq.question1_answer')}</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{t('homepage.faq.question2_title')}</h3>
                  <p className="text-gray-600">{t('homepage.faq.question2_answer')}</p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{t('homepage.faq.question3_title')}</h3>
                  <p className="text-gray-600">{t('homepage.faq.question3_answer')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ad Banner */}
        <section className="py-8">
          <AdBanner size="horizontal" />
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">{t('homepage.cta.title')}</h2>
            <p className="text-xl mb-8 opacity-90">{t('homepage.cta.description')}</p>
            <button
              onClick={() => navigate(token ? '/dashboard' : '/auth')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              {t('homepage.cta.button')}
            </button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Homepage; 