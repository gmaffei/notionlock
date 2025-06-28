import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <h1 className="text-4xl font-bold mb-6">Chi Siamo</h1>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                NotionLock nasce da una semplice osservazione: molti utenti Notion vogliono 
                condividere le loro pagine pubbliche ma con un livello base di protezione, 
                senza dover pagare abbonamenti costosi o configurare sistemi complessi.
              </p>
              
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Mentre altri servizi offrono funzionalità avanzate come analytics, custom domains, 
                e membership a pagamento, noi crediamo che la protezione password dovrebbe essere 
                semplice e gratuita per tutti.
              </p>
              
              <h2 className="text-2xl font-bold mb-4 mt-8">La nostra missione</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Fornire il modo più semplice e veloce per proteggere le pagine Notion con una 
                password, mantenendo il servizio 100% gratuito attraverso pubblicità non invasive.
              </p>
              
              <h2 className="text-2xl font-bold mb-4 mt-8">I nostri valori</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">🎯 Semplicità</h3>
                  <p className="text-gray-600">
                    Una sola funzione, fatta bene. Niente feature bloat o opzioni confuse.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🆓 Accessibilità</h3>
                  <p className="text-gray-600">
                    Gratuito per sempre. La protezione base non dovrebbe essere un lusso.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🔒 Privacy</h3>
                  <p className="text-gray-600">
                    I tuoi dati sono tuoi. Nessun tracking invasivo o vendita di informazioni.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">⚡ Velocità</h3>
                  <p className="text-gray-600">
                    Setup in 3 click. Perché il tuo tempo è prezioso.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Unisciti a migliaia di utenti</h2>
              <p className="text-gray-600 mb-6">
                Che proteggono le loro pagine Notion gratuitamente ogni giorno
              </p>
              <a
                href="/auth"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Inizia Ora
              </a>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About; 