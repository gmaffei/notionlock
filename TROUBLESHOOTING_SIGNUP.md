# Troubleshooting Sign Up NotionLock - Sessione del 09/07/2025

## Problema Identificato
L'utente riceve errore 404 quando tenta di registrarsi: `POST https://api.notionlock.com/auth/register 404 (Not Found)`

## Analisi Effettuata

### 1. Struttura del Progetto
- **Frontend**: React app su porta 3000 (localhost) / 80 (produzione)
- **Backend**: Node.js/Express su porta 3001
- **Database**: PostgreSQL
- **Cache**: Redis
- **Reverse Proxy**: Traefik per gestione SSL e routing

### 2. Configurazione Routing
Il backend espone le API con prefisso `/api`:
- `/api/auth/register` - Registrazione
- `/api/auth/login` - Login
- `/api/health` - Health check

### 3. Problema DNS Identificato
- Il frontend chiama `https://api.notionlock.com/api/auth/register`
- Il sottodominio `api.notionlock.com` non aveva record DNS inizialmente
- DNS ora configurato correttamente (verificato con dig: IP 168.231.107.139)

### 4. Problema Certificato SSL
- Traefik non ha potuto generare certificato SSL per api.notionlock.com quando DNS non esisteva
- Errore nei log: "DNS problem: NXDOMAIN looking up A for api.notionlock.com"

## Soluzioni Applicate

### 1. Configurazione DNS (COMPLETATA)
Record A aggiunto su Hostinger:
- Host: `api`
- Type: `A`
- Value: `168.231.107.139`
- TTL: 14400

### 2. Tentativo Rinnovo Certificato SSL (IN CORSO)
```bash
cd /opt/traefik-infrastructure/traefik
rm acme.json
touch acme.json
chmod 600 acme.json
docker compose restart traefik
```

## Prossimi Passi
1. Verificare che Traefik ottenga il certificato SSL per api.notionlock.com
2. Testare endpoint: `curl https://api.notionlock.com/api/health`
3. Se necessario, verificare configurazione Cloudflare per DNS challenge

## Update 09/07/2025 - 10:33
- Traefik riavviato con successo dopo reset acme.json
- In attesa di verifica generazione certificato SSL per api.notionlock.com

## Update 09/07/2025 - 10:36
- ✅ Certificato SSL generato con successo per api.notionlock.com
- ✅ API risponde correttamente: `curl https://api.notionlock.com/api/health` ritorna 200 OK
- ✅ Il problema DNS/SSL è stato risolto
- ⏳ Da verificare: se il frontend sta usando l'URL corretto nelle chiamate API

## Update 09/07/2025 - 10:52
- ❌ Errore 500 quando si tenta la registrazione
- L'endpoint risponde ma c'è un errore interno del server
- Possibili cause:
  - Problema di connessione al database PostgreSQL
  - Configurazione SMTP non valida
  - Variabili d'ambiente mancanti o errate

## Update 09/07/2025 - 10:56
- **Problema identificato**: "The server does not support SSL connections"
- Il backend cerca di connettersi a PostgreSQL con SSL ma il database Docker non lo supporta
- **Soluzione**: Aggiungere `?sslmode=disable` alla DATABASE_URL
- **Problema secondario**: Express non è configurato per trust proxy (Traefik)

## Update 09/07/2025 - 11:10
- **Nuovo problema**: Le variabili SMTP non vengono caricate correttamente
- Docker Compose mostra valori di default invece di quelli nel file .env
- **Soluzione applicata**: Usare flag --env-file esplicitamente con docker compose

## Update 09/07/2025 - 11:07
- **Problema identificato**: "password authentication failed for user 'notionlock'"
- Le credenziali del database PostgreSQL non corrispondono tra backend e database
- Il database potrebbe essere stato creato con credenziali diverse

## Update 09/07/2025 - 11:15 - ✅ RISOLTO!
- **Sign Up API ora funziona correttamente!**
- ✅ Status 201: "Registration completed successfully"
- ✅ Database connection funzionante
- ⚠️ MailerSend in modalità trial (invia solo all'email admin)
- ⏳ Frontend da ricostruire per usare URL API corretto

## File Configurazione Chiave
- `/opt/notionlock/.env` - Variabili ambiente produzione
- `/opt/traefik-infrastructure/traefik/docker-compose.yml` - Config Traefik
- `/opt/notionlock/docker/docker-compose.yml` - Config app produzione

## Comandi Utili
```bash
# Verifica DNS
dig api.notionlock.com

# Logs Traefik
docker compose logs --tail=50 --since=5m traefik

# Test API
curl https://api.notionlock.com/api/health

# Restart servizi
cd /opt/notionlock && docker compose -f docker/docker-compose.yml restart backend
```