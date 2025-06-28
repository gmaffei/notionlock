import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
            
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 mb-6">
                Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Informazioni che raccogliamo</h2>
              <p className="text-gray-600 mb-4">
                NotionLock raccoglie solo le informazioni strettamente necessarie per fornire il servizio:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Email e password per la creazione dell'account</li>
                <li>URL delle pagine Notion che decidi di proteggere</li>
                <li>Password che scegli per proteggere le tue pagine</li>
                <li>Conteggio delle visite alle pagine protette (senza tracciamento dei visitatori)</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Come utilizziamo le informazioni</h2>
              <p className="text-gray-600 mb-6">
                Le informazioni raccolte sono utilizzate esclusivamente per:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Fornire il servizio di protezione password</li>
                <li>Autenticare gli utenti</li>
                <li>Migliorare la sicurezza del servizio</li>
                <li>Fornire supporto tecnico quando richiesto</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">3. Sicurezza dei dati</h2>
              <p className="text-gray-600 mb-6">
                La sicurezza dei tuoi dati è la nostra priorità:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Tutte le password sono criptate con algoritmi sicuri (bcrypt)</li>
                <li>Utilizziamo HTTPS per tutte le comunicazioni</li>
                <li>Non memorizziamo il contenuto delle tue pagine Notion</li>
                <li>I dati sono conservati su server sicuri con accesso limitato</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Condivisione dei dati</h2>
              <p className="text-gray-600 mb-6">
                NON vendiamo, scambiamo o trasmettiamo a terzi le tue informazioni personali. 
                Questo non include partner affidabili che ci assistono nel gestire il nostro sito web, 
                a condizione che tali parti accettino di mantenere riservate queste informazioni.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookie e pubblicità</h2>
              <p className="text-gray-600 mb-6">
                NotionLock utilizza cookie tecnici essenziali per il funzionamento del servizio. 
                Le pubblicità mostrate sul sito possono utilizzare cookie di terze parti per 
                personalizzare gli annunci, ma non hanno accesso ai tuoi dati personali.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">6. I tuoi diritti</h2>
              <p className="text-gray-600 mb-6">
                Hai il diritto di:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Accedere ai tuoi dati personali</li>
                <li>Correggere dati inesatti</li>
                <li>Richiedere la cancellazione del tuo account</li>
                <li>Opporti al trattamento dei tuoi dati</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contatti</h2>
              <p className="text-gray-600 mb-6">
                Per qualsiasi domanda sulla privacy, contattaci a:{' '}
                <a href="mailto:privacy@notionlock.com" className="text-blue-600 hover:underline">
                  privacy@notionlock.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy; 