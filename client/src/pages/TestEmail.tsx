import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TestEmailButton from '@/components/TestEmailButton';

export default function TestEmail() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Testare Serviciu Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Folosiți butonul de mai jos pentru a testa serviciul de notificări prin email.
            Veți primi un răspuns care indică dacă email-ul a fost trimis cu succes sau nu.
          </p>
          <p className="mb-4">
            Acest test folosește API-ul Elastic Email prin serviciul EmailService implementat
            pe server. Email-ul va fi trimis la adresa "test@example.com".
          </p>
          
          <TestEmailButton />
          
          <div className="mt-6 text-sm text-gray-500">
            <h3 className="font-medium mb-2">Serviciul EmailService:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Folosește Elastic Email API</li>
              <li>Trimite email-uri pentru: cereri noi, oferte acceptate, mesaje noi și recenzii</li>
              <li>Respectă preferințele de notificare ale utilizatorilor</li>
              <li>Include conținut HTML formatat pentru o experiență mai bună</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}