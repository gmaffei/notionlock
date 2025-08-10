import React, { useEffect } from 'react';

const AdBanner = ({ size = 'horizontal', className = '' }) => {
  // Configurazione AdSense
  const ADSENSE_CONFIG = {
    publisherId: process.env.REACT_APP_ADSENSE_PUBLISHER_ID || 'ca-pub-1183785075708669', // Il tuo Publisher ID
    slots: {
      horizontal: process.env.REACT_APP_ADSENSE_SLOT_HORIZONTAL || '1234567890', // SOSTITUISCI
      square: process.env.REACT_APP_ADSENSE_SLOT_SQUARE || '1234567891',        // SOSTITUISCI
      vertical: process.env.REACT_APP_ADSENSE_SLOT_VERTICAL || '1234567892',    // SOSTITUISCI
      mobile: process.env.REACT_APP_ADSENSE_SLOT_MOBILE || '1234567893'         // SOSTITUISCI
    }
  };

  const sizes = {
    horizontal: { width: 728, height: 90, class: 'w-full max-w-3xl h-24', slot: ADSENSE_CONFIG.slots.horizontal },
    square: { width: 300, height: 250, class: 'w-72 h-64', slot: ADSENSE_CONFIG.slots.square },
    vertical: { width: 160, height: 600, class: 'w-40 h-[600px]', slot: ADSENSE_CONFIG.slots.vertical },
    mobile: { width: 320, height: 50, class: 'w-full max-w-xs h-14', slot: ADSENSE_CONFIG.slots.mobile }
  };

  const { width, height, class: sizeClass, slot } = sizes[size];

  useEffect(() => {
    // Carica AdSense script se non è già presente
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Inizializza l'annuncio dopo un breve delay per assicurarsi che il DOM sia pronto
    const timer = setTimeout(() => {
      try {
        if (window.adsbygoogle && window.adsbygoogle.loaded) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (error) {
        console.error('Errore nel caricamento AdSense:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ADSENSE_CONFIG.publisherId]);

  // Se AdSense non è configurato o è in sviluppo, mostra il placeholder
  const isConfigured = ADSENSE_CONFIG.publisherId !== 'ca-pub-XXXXXXXXXX' && 
                       process.env.NODE_ENV !== 'development';

  if (!isConfigured) {
    return (
      <div className={`${sizeClass} bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto my-4 ${className}`}>
        <div className="text-center text-gray-500 p-4">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <p className="text-sm font-medium">Spazio pubblicitario {width}x{height}</p>
          <p className="text-xs mt-1 opacity-75">Il servizio rimane gratuito grazie agli sponsor</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClass} mx-auto my-4 ${className}`}>
      <ins 
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner; 