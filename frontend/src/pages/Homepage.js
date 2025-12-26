import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdBanner from '../components/AdBanner';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import LemonSqueezyButton from '../components/LemonSqueezyButton';

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
              {(() => {
                // Custom Admin Override
                if (pricing?.subtitle) return pricing.subtitle;

                // Smart Fallback Logic
                const subEnabled = pricing?.monthly?.enabled || pricing?.yearly?.enabled;
                const lifeEnabled = pricing?.lifetime?.enabled;

                if (subEnabled && lifeEnabled) return t('homepage.pricing.subtitle_hybrid', "Scegli tra la flessibilità dell'abbonamento o la convenienza del pagamento unico.");
                if (lifeEnabled && !subEnabled) return t('homepage.pricing.subtitle_lifetime_only', "Nessun abbonamento ricorrente. Paga una volta sola e sblocca tutte le funzionalità Pro per sempre.");
                if (subEnabled && !lifeEnabled) return t('homepage.pricing.subtitle_sub_only', "Abbonamenti flessibili. Disdici quando vuoi, nessun vincolo.");

                return t('homepage.pricing.subtitle', "Scegli il piano adatto alle tue esigenze.");
              })()}
            </p>

            {/* Billing Toggle - Only show if monthly OR yearly is enabled */}
            {(pricing?.monthly?.enabled || pricing?.yearly?.enabled) && (
              <div className="flex justify-center mb-12">
                <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm inline-flex relative">
                  {pricing?.monthly?.enabled && (
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-6 py-2 rounded-full text-sm font-bold transition relative z-10 ${billingCycle === 'monthly' ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {t('homepage.pricing.toggle_monthly', 'Monthly')}
                    </button>
                  )}
                  {pricing?.yearly?.enabled && (
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-6 py-2 rounded-full text-sm font-bold transition relative z-10 ${billingCycle === 'yearly' ? 'text-blue-600 bg-blue-50 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      {t('homepage.pricing.toggle_yearly', 'Yearly')}
                      {/* Dynamic Discount Badge */
                        pricing?.monthly?.enabled && billingCycle === 'yearly' && (
                          <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                            -{Math.round(((pricing.monthly.usd * 12 - pricing.yearly.usd) / (pricing.monthly.usd * 12)) * 100)}%
                          </span>
                        )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Grid - Use Flex to center items automatically */}
            <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto items-stretch">

              {/* Free Plan */}
              <div className="w-full md:w-[350px] bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('homepage.pricing.plan_free')}</h3>
                <div className="text-4xl font-bold text-gray-900 mb-6">€0<span className="text-lg font-normal text-gray-500">{t('homepage.pricing.suffix_forever')}</span></div>
                <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition mb-8">
                  {t('homepage.pricing.cta_free')}
                </button>
                <ul className="space-y-4 flex-1">
                  {getFeatures('homepage.pricing.features_free_list').map((feature, i) => (
                    <li key={i} className="flex items-start text-gray-600 text-sm">
                      <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Subscription (Monthly/Yearly) */}
              {((billingCycle === 'monthly' && pricing?.monthly?.enabled) || (billingCycle === 'yearly' && pricing?.yearly?.enabled)) && (
                <div className="w-full md:w-[350px] bg-white p-8 rounded-2xl shadow-lg border-2 border-blue-600 relative flex flex-col transform md:-translate-y-4">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                    {t('homepage.pricing.badge_popular')}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {billingCycle === 'monthly' ? t('homepage.pricing.plan_pro_monthly') : t('homepage.pricing.plan_pro_yearly')}
                  </h3>
                  <div className="text-4xl font-bold text-gray-900 mb-6">
                    {getPrice(billingCycle)}
                    <span className="text-lg font-normal text-gray-500">
                      {billingCycle === 'monthly' ? t('homepage.pricing.suffix_mo') : t('homepage.pricing.suffix_yr')}
                    </span>
                  </div>

                  <div className="mb-8">
                    <LemonSqueezyButton
                      variantId={billingCycle === 'monthly' ? pricing?.monthly?.variant_id : pricing?.yearly?.variant_id}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg w-full"
                    >
                      {t('homepage.pricing.cta_subscribe', 'Subscribe Now')}
                    </LemonSqueezyButton>
                    <p className="text-xs text-center mt-2 text-gray-400">{t('homepage.pricing.cancel_anytime')}</p>
                  </div>

                  <ul className="space-y-4 flex-1">
                    {getFeatures('homepage.pricing.features_pro_list').map((feature, i) => (
                      <li key={i} className="flex items-start text-gray-700 text-sm">
                        <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pro Lifetime Plan */}
              {pricing?.lifetime?.enabled && (
                <div className="w-full md:w-[350px] bg-gradient-to-br from-indigo-900 to-gray-900 p-8 rounded-2xl shadow-sm border border-gray-800 text-white flex flex-col">
                  <h3 className="text-xl font-bold mb-2">{t('homepage.pricing.plan_lifetime')}</h3>
                  <div className="text-4xl font-bold mb-6">
                    {getPrice('lifetime')}
                    <span className="text-lg font-normal opacity-70 block text-sm mt-1">{t('homepage.pricing.suffix_onetime')}</span>
                  </div>

                  <div className="mb-8">
                    <LemonSqueezyButton
                      variantId={process.env.REACT_APP_LEMON_SQUEEZY_LIFETIME_VARIANT_ID}
                      className="bg-gray-700 text-white border border-gray-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-600 transition shadow-lg w-full"
                    >
                      {t('homepage.pricing.cta_lifetime', 'Get Lifetime')}
                    </LemonSqueezyButton>
                  </div>

                  <ul className="space-y-4 flex-1">
                    {getFeatures('homepage.pricing.features_pro_list').map((feature, i) => (
                      <li key={i} className="flex items-start text-gray-300 text-sm">
                        <svg className="w-5 h-5 text-indigo-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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

        {/* Testimonials Section (Auto-Scrolling Carousel) */}
        <section className="py-24 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4 mb-16">
            <h2 className="text-4xl font-bold text-center">{t('homepage.testimonials.title')}</h2>
          </div>

          <div className="relative w-full">
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>

            {/* Scrolling Track */}
            <div className="flex animate-scroll hover:pause space-x-8 w-max">
              {[...Array(2)].map((_, setIndex) => (
                <React.Fragment key={setIndex}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="w-[400px] bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex-shrink-0 flex flex-col">
                      <div className="flex items-center mb-6">
                        <img
                          src={`${process.env.PUBLIC_URL}/avatars/${['alex', 'sarah', 'marco', 'elena', 'david', 'sophia', 'luca', 'emma'][i - 1]}.png`}
                          alt={t(`homepage.testimonials.testimonial${i}_author`)}
                          className="w-14 h-14 rounded-full object-cover mr-4 border-2 border-white shadow-sm"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{t(`homepage.testimonials.testimonial${i}_author`)}</p>
                          <p className="text-sm text-gray-500">{t(`homepage.testimonials.testimonial${i}_role`)}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 italic flex-1">"{t(`homepage.testimonials.testimonial${i}_text`)}"</p>

                      {/* Star Rating decoration */}
                      <div className="flex text-yellow-400 mt-4">
                        {[...Array(5)].map((_, star) => (
                          <svg key={star} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16">{t('homepage.faq.title')}</h2>
            <div className="max-w-2xl mx-auto">
              <div className="space-y-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <div key={num}>
                    <h3 className="text-xl font-bold mb-2">{t(`homepage.faq.question${num}_title`)}</h3>
                    <p className="text-gray-600">{t(`homepage.faq.question${num}_answer`)}</p>
                  </div>
                ))}
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