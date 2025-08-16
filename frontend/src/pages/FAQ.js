import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

const FAQ = () => {
  const { t } = useTranslation();

  const faqs = [
    {
      question: t('faq_page.q1_title'),
      answer: t('faq_page.q1_answer'),
    },
    {
      question: t('faq_page.q2_title'),
      answer: t('faq_page.q2_answer'),
    },
    {
      question: t('faq_page.q3_title'),
      answer: t('faq_page.q3_answer'),
    },
    {
      question: t('faq_page.q4_title'),
      answer: t('faq_page.q4_answer'),
    },
    {
      question: t('faq_page.q5_title'),
      answer: t('faq_page.q5_answer'),
    },
    {
      question: t('faq_page.q6_title'),
      answer: t('faq_page.q6_answer'),
    },
    {
      question: t('faq_page.q7_title'),
      answer: t('faq_page.q7_answer'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('faq_page.title')} - NotionLock</title>
        <meta name="description" content={t('faq_page.q1_answer')} />
      </Helmet>

      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">{t('faq_page.title')}</h1>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b pb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">{faq.question}</h2>
                    <p className="text-lg text-gray-700" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;