import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdBanner from '../components/AdBanner';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import PayPalButton from '../components/PayPalButton';

const Homepage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useTranslation();

  // Pricing State
  const [pricing, setPricing] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  useEffect(() => {
    // 1. Detect Currency
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.includes('it') || userLang.includes('fr') || userLang.includes('de') || userLang.includes('es')) {
      setCurrency('EUR');
    } else {
      setCurrency('USD');
    }

    // 2. Fetch Pricing
    const fetchPricing = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'https://api.notionlock.com/api';
        const res = await fetch(`${apiUrl}/settings/public/pricing`);
        if (res.ok) {
          const data = await res.json();
          setPricing(data);
        }
      } catch (err) {
        console.error("Failed to load pricing", err);
      }
    };
    fetchPricing();
  }, []);

  const getPrice = (plan) => {
    if (!pricing) return '...';
    const val = currency === 'EUR' ? pricing[plan].eur : pricing[plan].usd;
    return currency === 'EUR' ? `€${val}` : `$${val}`;
  };

  const getFeatures = (listKey) => {
    // Helper to return array from translation resources which might be object or array
    const features = t(listKey, { returnObjects: true });
    return Array.isArray(features) ? features : [];
  };

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        {/* PRICING SECTION - LTD FOCUS */}
        <section id="pricing" className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4">{t('homepage.pricing.title')}</h2>
            <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
              {currency === 'EUR'
                ? "Nessun abbonamento ricorrente. Paga una volta sola e sblocca tutte le funzionalità Pro per sempre."
                : "No recurring subscriptions. Pay once and unlock all Pro features forever."}
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">

              {/* Free Plan */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-6">€0<span className="text-lg font-normal text-gray-500">/forever</span></div>
                <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition mb-8">
                  {t('homepage.pricing.cta_free')}
                </button>
                <ul className="space-y-4">
                  {getFeatures('homepage.pricing.features_free_list').map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600 text-sm">
                      <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Lifetime Plan */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-2xl relative transform md:scale-105 text-white">
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  {t('homepage.pricing.save')}
                </div>
                <h3 className="text-2xl font-bold mb-2">{t('homepage.pricing.lifetime')}</h3>
                <div className="text-5xl font-bold mb-6">
                  {getPrice('lifetime')}
                  <span className="text-lg font-normal opacity-70 block text-sm mt-1">one-time payment</span>
                </div>
                <div className="mb-8 opacity-90 text-sm">
                  {currency === 'EUR' ? "Accesso completo a vita + Tutti gli aggiornamenti futuri." : "Full lifetime access + All future updates included."}
                </div>

                <div className="mb-8">
                  <PayPalButton
                    amount={getPrice('lifetime').replace(/[^0-9.]/g, '')}
                    currency={currency}
                    onSuccess={() => {
                      alert("Payment Successful! Welcome to Pro.");
                      window.location.reload();
                    }}
                    onError={(msg) => alert(msg)}
                  />
                </div>

                <ul className="space-y-4">
                  {getFeatures('homepage.pricing.features_pro_list').map((feature, i) => (
                    <li key={i} className="flex items-center text-blue-100 text-sm">
                      <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.how_it_works.title')}</h2>

            <div className="max-w-4xl mx-auto">
              <div className="space-y-12">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">1</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{t('homepage.how_it_works.step1_title')}</h3>
                    <p className="text-gray-600">{t('homepage.how_it_works.step1_description')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">2</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{t('homepage.how_it_works.step2_title')}</h3>
                    <p className="text-gray-600">{t('homepage.how_it_works.step2_description')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg">3</div>
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
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.testimonials.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial1_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial1_author')}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial2_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial2_author')}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-gray-600 mb-4">{t('homepage.testimonials.testimonial3_text')}</p>
                <p className="font-bold">{t('homepage.testimonials.testimonial3_author')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
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