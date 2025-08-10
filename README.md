# NotionLock - Guida Completa al Deployment su VPS

Questa guida fornisce istruzioni dettagliate per il deployment completo di NotionLock su una VPS con Docker, Traefik e certificati SSL automatici.

## Panoramica del Progetto

**NotionLock** è un'applicazione web full-stack che permette di proteggere con password le pagine di Notion, aggiungendo un livello di sicurezza ai contenuti condivisi.

### Architettura
- **Frontend**: React (porta 80 in produzione)
- **Backend**: Node.js/Express (porta 3001)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Reverse Proxy**: Traefik (gestione SSL e routing)
- **SSL**: Let's Encrypt tramite DNS Challenge (Cloudflare)

---

## 1. Prerequisiti

### Server
- **VPS Linux** (Ubuntu 22.04 LTS consigliato) con almeno 2GB RAM
- **Dominio registrato** (es. `notionlock.com`)
- **Accesso SSH** al server

### Servizi esterni
- **Account Cloudflare** con dominio configurato
- **Provider SMTP** per invio email (MailerSend, Mailgun, SendGrid, etc.)

---

## 2. Preparazione del Dominio (DNS)

### Su Cloudflare o provider DNS

Configura questi record DNS:

```
Type    Name    Value               TTL
A       @       [IP_DELLA_TUA_VPS]  Auto
A       api     [IP_DELLA_TUA_VPS]  Auto
CNAME   www     @                   Auto
```

**Verifica la propagazione:**
```bash
dig notionlock.com
dig api.notionlock.com
```

---

## 3. Preparazione della VPS

### Connessione e aggiornamento
```bash
ssh root@[IP_DELLA_TUA_VPS]
apt update && apt upgrade -y
```

### Installazione Docker
```bash
# Installa dipendenze
apt install ca-certificates curl gnupg lsb-release -y

# Aggiungi chiave GPG Docker
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Aggiungi repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installa Docker
apt update
apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

### Configurazione Firewall
```bash
apt install ufw -y
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Traefik)
ufw allow 443/tcp  # HTTPS (Traefik)
ufw enable
```

---

## 4. Deployment dell'Infrastruttura Traefik

### Clone del repository Traefik
```bash
cd /opt
git clone https://github.com/gmaffei/traefik-infrastructure.git
cd traefik-infrastructure/traefik
```

### Configurazione Traefik
```bash
# Copia file di configurazione
cp .env.example .env
```

**Modifica il file `.env`:**
```bash
nano .env
```

Inserisci:
```env
BASE_DOMAIN=notionlock.com
ACME_EMAIL=tua_email@esempio.com
TRAEFIK_USER=admin
TRAEFIK_PASSWORD_HASH=[HASH_GENERATO]
CLOUDFLARE_EMAIL=tua_email_cloudflare@esempio.com
CLOUDFLARE_API_KEY=[TUA_API_KEY_CLOUDFLARE]
```

**Genera password hash:**
```bash
# Sul tuo Mac/Linux locale
echo $(htpasswd -nb admin la_tua_password_sicura) | sed -e 's/\$/\$\$/g'
```

### Avvio Traefik
```bash
# Crea file acme.json
touch acme.json
chmod 600 acme.json

# Crea rete Docker
docker network create traefik-public

# Avvia Traefik
docker compose up -d
```

**Verifica:**
```bash
docker compose logs -f traefik
```

---

## 5. Deployment dell'Applicazione NotionLock

### Clone del repository
```bash
cd /opt
git clone https://github.com/gmaffei/notionlock.git
cd notionlock
```

### Configurazione variabili d'ambiente
```bash
# Copia il file di produzione
cp .env_prod .env
```

**Modifica il file `.env`:**
```bash
nano .env
```

**Configurazione minima necessaria:**
```env
# Ambiente
NODE_ENV=production
PORT=3001

# Database
DB_USER=notionlock
DB_PASSWORD=[PASSWORD_SICURA]
DB_NAME=notionlock
DATABASE_URL=postgresql://notionlock:[PASSWORD_SICURA]@postgres:5432/notionlock

# Redis
REDIS_PASSWORD=[PASSWORD_REDIS]
REDIS_URL=redis://:[PASSWORD_REDIS]@redis:6379

# JWT Secret (genera stringa casuale lunga)
JWT_SECRET=[JWT_SECRET_MOLTO_LUNGO]

# Dominio
DOMAIN=notionlock.com
REACT_APP_API_URL=https://api.notionlock.com/api
REACT_APP_SITE_URL=https://notionlock.com
FRONTEND_URL=https://notionlock.com

# Email SMTP
SMTP_HOST=smtp.mailersend.net
SMTP_PORT=587
SMTP_USER=[TUO_SMTP_USER]
SMTP_PASS=[TUA_SMTP_PASSWORD]
FROM_EMAIL=noreply@notionlock.com
```

### Avvio dell'applicazione
```bash
# Avvia tutti i servizi
docker compose -f docker/docker-compose.yml --env-file .env up -d

# Verifica che tutti i servizi siano avviati
docker compose -f docker/docker-compose.yml ps
```

### Inizializzazione Database
```bash
# Crea tabella users se necessario
docker compose -f docker/docker-compose.yml exec postgres psql -U notionlock -d notionlock -c "
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_expires TIMESTAMP,
  reset_token VARCHAR(255),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
"
```

---

## 6. Verifica del Deployment

### Test API
```bash
# Health check
curl https://api.notionlock.com/api/health

# Test registrazione
curl -X POST https://api.notionlock.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

### Test Frontend
1. Apri browser: `https://notionlock.com`
2. Prova registrazione utente
3. Verifica funzionalità

---

## 7. Comandi di Gestione

### Aggiornamento applicazione
```bash
cd /opt/notionlock
git pull
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

### Backup database
```bash
docker compose -f docker/docker-compose.yml exec postgres pg_dump -U notionlock notionlock > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Visualizzazione log
```bash
# Log applicazione
docker compose -f docker/docker-compose.yml logs -f backend
docker compose -f docker/docker-compose.yml logs -f frontend

# Log Traefik
cd /opt/traefik-infrastructure/traefik
docker compose logs -f traefik
```

### Riavvio servizi
```bash
# Riavvio singolo servizio
docker compose -f docker/docker-compose.yml restart backend

# Riavvio completo
docker compose -f docker/docker-compose.yml --env-file .env down
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

---

## 8. Risoluzione Problemi Comuni

### Certificati SSL non generati
```bash
# Verifica DNS
dig api.notionlock.com

# Reset certificati
cd /opt/traefik-infrastructure/traefik
rm acme.json
touch acme.json
chmod 600 acme.json
docker compose restart traefik
```

### Errori di connessione database
```bash
# Reset database
cd /opt/notionlock
docker compose -f docker/docker-compose.yml down postgres
docker volume rm $(docker volume ls -q | grep postgres)
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

### 404 errori API
```bash
# Verifica routing
docker compose -f docker/docker-compose.yml logs traefik | grep api.notionlock

# Ricostruisci frontend
docker compose -f docker/docker-compose.yml --env-file .env up -d --build frontend
```

---

## 9. Sicurezza e Mantenimento

### Aggiornamenti regolari
```bash
# Sistema
apt update && apt upgrade -y

# Docker images
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

### Backup automatico
Configura backup automatici di database e file di configurazione.

### Monitoraggio
- Log di Traefik: `/var/lib/docker/volumes/traefik_traefik-logs`
- Log applicazione: `docker compose logs`
- Monitoraggio certificati SSL: Dashboard Traefik

---

## 10. Note Importanti

### Variabili sensibili
- **Non commitare mai** file `.env` con credenziali reali
- Genera **password e secret** casuali e sicuri
- Usa **chiavi API** dedicate per produzione

### SMTP in produzione
- **MailerSend trial**: invia solo all'email amministratore
- **Upgrade** piano o usa **email di test** uguale all'admin
- Alternative: **SendGrid**, **Mailgun**, **Amazon SES**

### Performance
- **Minimo 2GB RAM** consigliato per VPS
- **SSD storage** per migliori performance database
- **CDN** per asset statici (opzionale)

---

## File di Configurazione Chiave

```
/opt/
   traefik-infrastructure/
      traefik/
          .env                    # Config Traefik
          acme.json              # Certificati SSL
          docker-compose.yml
   notionlock/
       .env                       # Config produzione
       docker/
          docker-compose.yml     # Config app produzione
       backend/src/server.js      # Server configurato per prod
```

---

**Deployment completato!** <‰

L'applicazione sarà accessibile su:
- Frontend: `https://notionlock.com`
- API: `https://api.notionlock.com`
- Dashboard Traefik: `https://traefik.notionlock.com`