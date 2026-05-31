# DBC Dashboard — ASISD

Dashboard per il monitoraggio dei dental business coach.

## Deploy su Vercel (passo per passo)

### 1. Crea un account GitHub (se non ce l'hai)
Vai su github.com e crea un account gratuito.

### 2. Carica il progetto su GitHub
1. Vai su github.com/new
2. Chiama il repository `dental-dashboard`
3. Lascia tutto il resto come default e clicca "Create repository"
4. Carica tutti i file di questa cartella nel repository

### 3. Configura le variabili d'ambiente su Vercel
Su Vercel, quando importi il progetto, aggiungi queste variabili:

**GOOGLE_SERVICE_ACCOUNT_KEY**
Incolla il contenuto COMPLETO del file JSON scaricato da Google Cloud (tutto su una riga)

**DRIVE_ROOT_FOLDER_ID**
`1WsN8SPQ1zMn9RpQdjciJ8lTKVkPTXPC6`

### 4. Struttura cartelle Google Drive
```
📁 DBC - Dashboard  (cartella condivisa con il service account)
  📁 DBC - [Nome Coach]
    📁 [Nome Cliente] - base
    📁 [Nome Cliente] - avanzato
    📁 [Nome Cliente] - quantico
      📄 Profit_Monday.ods  (file settimanale del coach)
      📄 Cruscotto_Trimestrale.xlsx
```

Il livello del cliente (base/avanzato/quantico) viene rilevato automaticamente
dal nome della cartella. Se il nome contiene "avanzato" → Avanzato, "quantico" → Quantico, altrimenti → Base.

## Come aggiungere un nuovo cliente
1. Crea una nuova cartella dentro la cartella del coach su Drive
2. I coach caricano i loro file ODS/Excel nella cartella del cliente
3. Premi "Aggiorna" sulla dashboard

## KPI monitorati
- Prime visite / poltrona / settimana
- Saturazione studio e titolare
- Fatturato annuo / poltrona
- Pazienti attivi / poltrona
- Valore medio paziente
- Accettazione nuovi e storici
- Indice di incasso
- Incidenza MOL
- Crediti scaduti
- Riserva liquidità
- Preventivi emessi
- % Chiusura nuovi pazienti
