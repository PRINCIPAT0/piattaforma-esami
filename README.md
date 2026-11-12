# Piattaforma Gestione Esami Universitari

Progetto accademico (3 CFU) per la simulazione di un sistema informativo universitario.
La piattaforma gestisce tre ruoli distinti (Studente, Docente, Segreteria/Superadmin) per l'erogazione dei corsi, la sottomissione degli elaborati e la valutazione (manuale e supportata da AI).

## Requisiti di Sistema
- Node.js (versione 18 o superiore)
- npm o yarn
- Database supportato da Prisma (es. SQLite locale, PostgreSQL, MySQL)

## 1. Installazione delle dipendenze

Clona il repository e installa le librerie necessarie eseguendo:

```bash
npm install
```

## 2. Configurazione dell'ambiente (.env)

Crea un file `.env` nella root del progetto. Copia il seguente template e compila i campi:

```env
# URL del Database (es. SQLite locale per test)
DATABASE_URL="file:./dev.db"

# Credenziali per il setup della Segreteria
SUPERADMIN_NOME="Nome"
SUPERADMIN_COGNOME="Cognome"
SUPERADMIN_EMAIL="nome.cognome@admin.uni.it"
SUPERADMIN_PASSWORD="AdminPassword123!"

# (FACOLTATIVO) Chiavi API per la correzione automatica degli elaborati
# Se non fornite, il sistema funzionerà unicamente con la valutazione manuale
GROQ_API_KEY=""
GEMINI_API_KEY=""
```

## 3. Inizializzazione del Database

Per allineare lo schema del database ed effettuare la prima migrazione, lanciare il comando:

```bash
npx prisma db push
```

Genera il client Prisma per abilitare l'autocompletamento TypeScript:

```bash
npx prisma generate
```

## 4. Setup dell'Account Amministratore (Segreteria)

Popola il database con il primo amministratore utilizzando lo script di setup (che leggerà le credenziali dal file `.env`):

```bash
npx tsx scripts/init-admin.ts
```

In caso di successo, il terminale confermerà la creazione dell'account. Da questo momento, sarà possibile usare la piattaforma per creare gli account Docente direttamente dall'interfaccia della Segreteria.

## 5. Avvio dell'Applicazione

Avvia il server in modalità sviluppo:

```bash
npm run dev
```

L'applicazione sarà disponibile all'indirizzo: http://localhost:3000

---
