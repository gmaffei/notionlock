import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const FAQ = () => {
  const faqs = [
    {
      question: "Come funziona NotionLock?",
      answer: "NotionLock crea un link protetto da password per la tua pagina Notion pubblica. Quando qualcuno accede al link, deve inserire la password corretta per essere reindirizzato alla pagina Notion originale."
    },
    {
      question: "È davvero gratuito?",
      answer: "Sì, NotionLock è completamente gratuito. Il servizio è supportato da pubblicità discrete che non interferiscono con l'esperienza utente."
    },
    {
      question: "I miei dati sono al sicuro?",
      answer: "Assolutamente sì. Le password sono criptate con bcrypt, non tracciamo gli utenti che accedono alle tue pagine e non memorizziamo il contenuto delle tue pagine Notion."
    },
    {
      question: "Posso cambiare la password dopo averla impostata?",
      answer: "Al momento puoi eliminare la protezione e ricrearla con una nuova password. Stiamo lavorando per aggiungere la funzione di modifica password."
    },
    {
      question: "Cosa succede se qualcuno ha il link diretto di Notion?",
      answer: "NotionLock protegge solo il link generato dal nostro servizio. Se qualcuno ha il link diretto di Notion, potrà comunque accedere alla pagina. Per questo è importante condividere solo il link NotionLock."
    },
    {
      question: "Quante pagine posso proteggere?",
      answer: "Non c'è limite al numero di pagine che puoi proteggere. Il servizio è completamente gratuito e illimitato."
    },
    {
      question: "Supportate le pagine Notion private?",
      answer: "No, NotionLock funziona solo con pagine Notion che sono già pubbliche. Devi prima rendere pubblica la tua pagina su Notion, poi potrai proteggerla con una password tramite il nostro servizio."
    },
    {
      question: "Per quanto tempo rimane attiva la protezione?",
      answer: "La protezione rimane attiva finché non la rimuovi manualmente. Non ci sono scadenze o limiti di tempo."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-12">Domande Frequenti</h1>
            
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Hai altre domande?</h2>
              <p className="text-gray-600 mb-6">
                Siamo qui per aiutarti. Contattaci per qualsiasi dubbio.
              </p>
              <a
                href="mailto:support@notionlock.com"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Contattaci
              </a>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ; 