import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calea către fișierul server/vite.ts
const filePath = path.join(__dirname, 'server', 'vite.ts');

// Citim conținutul fișierului
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Eroare la citirea fișierului:', err);
    return;
  }

  // Corectăm indentarea de la începutul funcțiilor
  let fixedContent = data.replace(/^\s{2}(export function|export async function)/gm, '$1');
  
  // Verificăm dacă lipsește acolada de închidere la sfârșit pentru function serveStatic
  // Căutăm ultima acoladă de închidere în fișier și verificăm dacă mai este nevoie de una
  const lastClosingPos = fixedContent.lastIndexOf('}');
  const lastFuncPos = fixedContent.lastIndexOf('function');
  
  // Dacă ultima funcție nu are o acoladă de închidere la sfârșitul fișierului
  if (lastFuncPos > lastClosingPos || !fixedContent.trim().endsWith('}')) {
    // Adăugăm acolada lipsă la finalul fișierului
    fixedContent = fixedContent.trim() + "\n}";
  }

  // Salvăm fișierul corectat
  fs.writeFile(filePath, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('Eroare la salvarea fișierului:', err);
      return;
    }
    console.log('Fișierul server/vite.ts a fost corectat cu succes!');
  });
});