# Configurazione Google AdSense per NotionLock

## Panoramica
NotionLock è già configurato per supportare Google AdSense. I banner pubblicitari sono posizionati in punti strategici dell'applicazione per massimizzare le visualizzazioni mantenendo una buona user experience.

## Posizioni degli Annunci

### 1. **Homepage** (`/`)
- **Formato**: Banner orizzontale (728x90)
- **Posizione**: Dopo la sezione hero, prima del footer

### 2. **Dashboard** (`/dashboard`)
- **Formato**: Banner orizzontale (728x90)
- **Posizione**: Dopo la lista delle pagine protette

### 3. **Password Entry** (`/p/:slug`)
- **Formato**: Banner quadrato (300x250)
- **Posizione**: Prima del form di inserimento password

### 4. **Notion Viewer** (`/v/:slug`)
- **Formato**: 2x Banner orizzontali (728x90)
- **Posizione**: Prima e dopo il contenuto Notion

### 5. **Footer** (tutte le pagine)
- **Formato**: Banner orizzontale (728x90)
- **Posizione**: Nel footer, prima dei link

## Configurazione AdSense

### Step 1: Crea Account AdSense
1. Vai su [Google AdSense](https://adsense.google.com)
2. Registra il sito `notionlock.com`
3. Attendi l'approvazione (può richiedere alcuni giorni)

### Step 2: Crea Unità Pubblicitarie
Nel tuo pannello AdSense, crea 4 unità pubblicitarie:

1. **Banner Orizzontale**
   - Nome: "NotionLock - Horizontal Banner"
   - Tipo: Display ads
   - Formato: Leaderboard (728x90) o Responsive
   
2. **Banner Quadrato**
   - Nome: "NotionLock - Square Banner" 
   - Tipo: Display ads
   - Formato: Medium Rectangle (300x250)

3. **Banner Verticale** (per uso futuro)
   - Nome: "NotionLock - Vertical Banner"
   - Tipo: Display ads
   - Formato: Wide Skyscraper (160x600)

4. **Banner Mobile**
   - Nome: "NotionLock - Mobile Banner"
   - Tipo: Display ads
   - Formato: Mobile Banner (320x50)

### Step 3: Configura le Variabili d'Ambiente

1. **Per lo sviluppo locale**, crea/aggiorna `.env` nella directory root:
```bash
# Google AdSense
REACT_APP_ADSENSE_PUBLISHER_ID=ca-pub-TUO_PUBLISHER_ID
REACT_APP_ADSENSE_SLOT_HORIZONTAL=TUO_SLOT_ID_HORIZONTAL
REACT_APP_ADSENSE_SLOT_SQUARE=TUO_SLOT_ID_SQUARE
REACT_APP_ADSENSE_SLOT_VERTICAL=TUO_SLOT_ID_VERTICAL
REACT_APP_ADSENSE_SLOT_MOBILE=TUO_SLOT_ID_MOBILE
```

2. **Per la produzione**, aggiungi le stesse variabili nel file `.env_prod` del server.

### Step 4: Deploy
Una volta configurate le variabili d'ambiente, fai il deploy:

```bash
git add .
git commit -m "Configure AdSense integration"
git push origin master
```

## Note Importanti

### Privacy e GDPR
- ✅ AdSense gestisce automaticamente il consenso GDPR
- ✅ Gli script sono caricati in modo asincrono per non impattare le performance
- ✅ I banner hanno fallback con placeholder informativi

### Performance
- ✅ Gli script AdSense sono caricati solo una volta
- ✅ I banner sono responsive e si adattano ai dispositivi mobili
- ✅ Utilizziamo `data-ad-format="auto"` per ottimizzazione automatica

### Debugging
- In **sviluppo**: Vengono mostrati i placeholder grafici
- In **produzione**: Se AdSense non è configurato, vengono mostrati i placeholder
- Controlla la console del browser per eventuali errori AdSense

## Monitoraggio
Una volta attivo, monitora le performance su:
- **Google AdSense Dashboard**: Revenue, impressions, CTR
- **Google Analytics**: Impact sulle metriche del sito
- **Console del browser**: Eventuali errori di caricamento

## Supporto
Se hai problemi con la configurazione AdSense:
1. Verifica che il sito sia approvato da AdSense
2. Controlla che i Publisher ID e Slot ID siano corretti
3. Verifica che le variabili d'ambiente siano configurate correttamente sul server
4. Controlla i logs del browser per errori JavaScript

---

**Nota**: I banner pubblicitari possono richiedere 24-48 ore per iniziare a mostrare annunci reali dopo la configurazione.