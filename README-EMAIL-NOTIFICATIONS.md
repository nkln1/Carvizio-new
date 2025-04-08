# Sistem Notificări Email - Carvizio Auto Service

## Prezentare generală

Sistemul de notificări prin email pentru aplicația Carvizio Auto Service permite transmiterea automată a emailurilor către furnizorii de servicii atunci când:

1. Un client creează o nouă cerere de service
2. Un client acceptă o ofertă de service
3. Un client trimite un mesaj nou
4. Un client lasă o recenzie nouă

Emailurile sunt trimise prin intermediul API-ului [Elastic Email](https://elasticemail.com/) către adresa de email cu care service provider-ul s-a înregistrat în platformă.

## Configurare

### Variabile de mediu necesare

Pentru funcționarea corectă a sistemului, următoarea variabilă de mediu trebuie să fie setată:

- `ELASTIC_EMAIL_API_KEY`: Cheia API pentru serviciul Elastic Email

### Configurare adițională

Sistemul folosește adresa `notificari@carvizio.ro` ca adresă de expeditor pentru toate emailurile.

## Preferințe notificări

Fiecare furnizor de servicii își poate configura preferințele de notificare prin intermediul interfeței aplicației. Preferințele sunt stocate în tabela `notification_preferences` și includ următoarele:

- `emailNotificationsEnabled`: Activarea/dezactivarea tuturor notificărilor prin email
- `newRequestEmailEnabled`: Notificări pentru cereri noi
- `acceptedOfferEmailEnabled`: Notificări pentru oferte acceptate
- `newMessageEmailEnabled`: Notificări pentru mesaje noi
- `newReviewEmailEnabled`: Notificări pentru recenzii noi

## Implementare tehnică

Sistemul este implementat în următoarele fișiere:

- `server/services/emailService.ts`: Serviciul principal care gestionează trimiterea emailurilor
- `server/routes.ts`: Endpoint-urile API care verifică preferințele de notificare și declanșează trimiterea emailurilor
- `server/storage.ts`: Funcționalitatea de stocare a preferințelor de notificare

## Script-uri de testare

Pentru a testa funcționarea sistemului de notificări, sunt disponibile mai multe script-uri:

- `test-notification-flow.js`: Testează fluxul complet de trimitere a notificărilor pentru mesaje noi
- `test-specific-service-provider-v3.js`: Testează toate tipurile de notificări pentru un furnizor de servicii specific
- `direct-test-notifications-v2.js`: O versiune simplificată pentru testarea notificărilor

### Exemplu de utilizare

```bash
# Testează toate tipurile de notificări pentru service provider-ul cu ID 1
node test-specific-service-provider-v3.js

# Testează fluxul de notificare pentru un mesaj nou
node test-notification-flow.js
```

## Structura email-urilor

Fiecare tip de notificare are un șablon HTML personalizat care include:

- Logo-ul Carvizio
- Salutul personalizat cu numele companiei furnizorului de servicii
- Detalii despre evenimentul specific (cerere nouă, ofertă acceptată, mesaj nou, recenzie)
- Un buton/link pentru a vizualiza detaliile în aplicație
- Footer cu informații de contact și posibilitatea de dezabonare

## Monitorizare și loguri

Toate email-urile trimise sunt logate în consolă cu următorul format:

```
EmailService.send[TipNotificare]Notification - Email trimis cu succes către [email] pentru [tipConținut] [id]
```

## Notificări browser

Pe lângă notificările prin email, sistemul suportă și notificări browser prin:

1. Firebase Cloud Messaging (FCM)
2. Service Worker-ul propriu al aplicației (`sw.js` - versiunea 1.0.8)

Preferințele pentru notificările browser sunt de asemenea configurabile prin interfața aplicației.