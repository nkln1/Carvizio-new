import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export default function injectEnvIntoServiceWorker(): Plugin {
  return {
    name: 'inject-env-into-firebase-sw',
    apply: 'build', // Se aplică doar în timpul build-ului de producție
    writeBundle() {
      // Calea către service worker în directorul public
      const swPath = path.resolve(__dirname, '../../public/firebase-messaging-sw.js');
      const outDir = path.resolve(__dirname, '../../../dist');
      const outputPath = path.resolve(outDir, 'firebase-messaging-sw.js');

      // Verificăm dacă service worker-ul există
      if (!fs.existsSync(swPath)) {
        console.error('Firebase Service Worker nu a fost găsit în directorul public');
        return;
      }

      try {
        // Citim conținutul service worker-ului
        let swContent = fs.readFileSync(swPath, 'utf8');

        // Înlocuim placeholder-ele cu valorile reale din env
        swContent = swContent.replace(/{{VITE_FIREBASE_API_KEY}}/g, process.env.VITE_FIREBASE_API_KEY || '');
        swContent = swContent.replace(/{{VITE_FIREBASE_PROJECT_ID}}/g, process.env.VITE_FIREBASE_PROJECT_ID || '');
        swContent = swContent.replace(/{{VITE_FIREBASE_MESSAGING_SENDER_ID}}/g, process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '');
        swContent = swContent.replace(/{{VITE_FIREBASE_APP_ID}}/g, process.env.VITE_FIREBASE_APP_ID || '');

        // Ne asigurăm că directorul de output există
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        // Scriem service worker-ul procesat în directorul de output
        fs.writeFileSync(outputPath, swContent);
        console.log('Firebase Service Worker procesat și copiat în directorul de build');
      } catch (error) {
        console.error('Eroare la procesarea Firebase Service Worker:', error);
      }
    }
  };
}