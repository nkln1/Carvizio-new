# Sistem de Notificări Email pentru Auto Service App

Acest document descrie sistemul de notificări email implementat pentru aplicația Auto Service App. Sistemul trimite notificări prin email către furnizori de servicii auto (service providers) pentru diverse evenimente importante din platformă.

## Tipuri de Notificări

Sistemul de notificări email acoperă următoarele evenimente:

1. **Cereri Noi** - Când un client creează o cerere nouă în zona de proximitate a service-ului
2. **Oferte Acceptate** - Când un client acceptă o ofertă trimisă de service
3. **Mesaje Noi** - Când un client trimite un mesaj către service
4. **Recenzii Noi** - Când un client lasă o recenzie pentru service

## Configurare Tehnică

Sistemul utilizează serviciul **Elastic Email** pentru trimiterea email-urilor. Configurația este centralizată în clasa `EmailService` în `/server/services/emailService.ts`.

### Parametri de configurare:

- **API Key**: Stocat în variabila de mediu `ELASTIC_EMAIL_API_KEY`
- **Email Expeditor**: notificari@carvizio.ro
- **Nume Expeditor**: Auto Service App

## Preferințe Notificări

Fiecare service provider poate controla ce notificări primește prin email, configurând preferințele în baza de date:

```sql
-- Tabelul notification_preferences stochează preferințele pentru fiecare service provider
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  service_provider_id INTEGER NOT NULL REFERENCES service_providers(id),
  email_notifications_enabled BOOLEAN DEFAULT true,
  new_request_email_enabled BOOLEAN DEFAULT true,
  accepted_offer_email_enabled BOOLEAN DEFAULT true,
  new_message_email_enabled BOOLEAN DEFAULT true,
  new_review_email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Structura Implementării

### EmailService (server/services/emailService.ts)

Clasa centralizată care gestionează toate operațiunile de trimitere de email-uri:

- `sendNewRequestNotification`: Trimite notificare pentru cerere nouă
- `sendOfferAcceptedNotification`: Trimite notificare pentru ofertă acceptată
- `sendNewMessageNotification`: Trimite notificare pentru mesaj nou
- `sendNewReviewNotification`: Trimite notificare pentru recenzie nouă

### Integrare cu API-urile

- Route-uri API în `/server/routes.ts`
- Funcții de stocare în `/server/storage.ts`

## Testare

Am implementat scripturi dedicate de testare pentru a verifica funcționarea corectă a sistemului de notificări:

### 1. Test complet sistem notificări

```bash
npx tsx test-notification-system.js
```

Acest script testează toate tipurile de notificări și verifică configurarea corectă a sistemului.

### 2. Test specific pentru notificări de mesaje noi

```bash
npx tsx test-new-message-notification.js
```

Script dedicat testării notificărilor pentru mesaje noi, inclusiv crearea unui mesaj în baza de date.

### 3. Test general notificări email

```bash
npx tsx test-email-notifications.js
```

Script pentru testare rapidă a tuturor tipurilor de notificări email.

## Șabloane de Email

Toate email-urile folosesc șabloane HTML responsive și mobile-friendly, cu stiluri inline pentru compatibilitate maximă cu clienții de email.

### Exemplu de șablon pentru cerere nouă:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #00AFF5;">Cerere nouă de la ${clientName}</h2>
  <p>Bună ziua,</p>
  <p>Aveți o cerere nouă de la ${clientName} pentru <strong>${requestTitle}</strong>.</p>
  <p>Accesați contul dumneavoastră pentru a vizualiza detaliile cererii și a trimite o ofertă.</p>
  <div style="margin: 20px 0;">
    <a href="https://carvizio.ro/service/dashboard" style="background-color: #00AFF5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Accesează Contul</a>
  </div>
  <p style="color: #666; font-size: 0.9em;">Acest email a fost trimis automat. Vă rugăm să nu răspundeți la acest email.</p>
</div>
```

## Deblocarea Serviciului de Email

Dacă un email nu ajunge la destinație, verificați:

1. Dacă API Key-ul Elastic Email este configurat corect
2. Dacă preferințele de notificări ale utilizatorului sunt activate
3. Logs-urile din API și server pentru erori
4. Folderele de Spam/Junk ale destinatarului

## Îmbunătățiri Viitoare

1. Adăugarea opțiunii de dezabonare în footer-ul email-ului
2. Monitorizare avansată și reîncercarea trimiterii email-urilor eșuate
3. Șabloane personalizabile pentru fiecare service provider
4. Ajustarea frecvenței notificărilor (zilnic, imediat, rezumat săptămânal)