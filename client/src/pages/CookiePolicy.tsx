import { Link } from 'wouter';

export default function CookiePolicy() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">Politica de Cookie-uri</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
          </p>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Ce sunt cookie-urile?</h2>
          <p className="mb-3">
            Cookie-urile sunt fișiere text de mici dimensiuni care sunt stocate pe dispozitivul dvs. (computer, tabletă, 
            telefon mobil) atunci când vizitați un site web. Acestea permit site-ului să vă recunoască dispozitivul și să 
            rețină anumite informații despre vizita dvs., cum ar fi preferințele de limbă, dimensiunea fontului, și alte 
            preferințe de afișare.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Ce tipuri de cookie-uri folosim?</h2>
          <p className="mb-3">
            Site-ul nostru folosește <strong>doar cookie-uri esențiale</strong>. Acestea sunt strict necesare pentru 
            funcționarea corectă a site-ului și nu pot fi dezactivate.
          </p>
          
          <h3 className="text-xl font-semibold mt-4 mb-2">Cookie-uri esențiale</h3>
          <p className="mb-3">
            Aceste cookie-uri sunt necesare pentru funcționarea site-ului web și nu pot fi dezactivate în sistemele noastre. 
            Ele sunt de obicei setate doar ca răspuns la acțiunile efectuate de dvs., cum ar fi setarea preferințelor de 
            confidențialitate, autentificarea sau completarea formularelor. Acestea nu stochează informații personale 
            identificabile.
          </p>
          
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-4">
            <h4 className="font-semibold mb-2">Cookie-uri esențiale utilizate:</h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>essential-cookie-consent</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scop: Memorează dacă ați acceptat utilizarea cookie-urilor pe site.
                  <br />
                  Durata: 1 an
                </p>
              </li>
              <li>
                <strong>session</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scop: Menține sesiunea dvs. activă în timpul vizitei pe site.
                  <br />
                  Durata: Sesiune (dispare la închiderea browserului)
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Ce NU facem cu cookie-urile</h2>
          <div className="space-y-2">
            <p>
              <strong>Nu folosim cookie-uri pentru marketing sau publicitate</strong> - Nu utilizăm cookie-uri pentru a vă urmări 
              activitatea online în scopuri de marketing sau pentru a vă prezenta reclame personalizate.
            </p>
            <p>
              <strong>Nu vindem datele dvs.</strong> - Nu colectăm și nu vindem informațiile dvs. personale unor terțe părți.
            </p>
            <p>
              <strong>Nu folosim cookie-uri de analiză</strong> - Nu utilizăm cookie-uri pentru a analiza comportamentul utilizatorilor 
              pe site-ul nostru.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Cum puteți gestiona cookie-urile?</h2>
          <p className="mb-3">
            Majoritatea browserelor web permit controlul cookie-urilor prin setările de preferințe. Limitarea capacității site-urilor 
            web de a seta cookie-uri vă poate diminua experiența generală de utilizare, întrucât site-ul nostru folosește doar cookie-uri esențiale.
          </p>
          <p className="mb-3">
            Pentru a afla mai multe despre cum să gestionați și să ștergeți cookie-urile, vizitați{' '}
            <a 
              href="https://aboutcookies.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              aboutcookies.org
            </a>
            {' '}sau{' '}
            <a 
              href="https://www.allaboutcookies.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              allaboutcookies.org
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Modificări ale Politicii de Cookie-uri</h2>
          <p className="mb-3">
            Ne rezervăm dreptul de a modifica această politică de cookie-uri în orice moment. Orice modificări vor fi publicate pe această pagină. 
            Vă încurajăm să consultați periodic această pagină pentru a fi la curent cu orice modificări.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p className="mb-3">
            Dacă aveți întrebări despre politica noastră de cookie-uri, vă rugăm să ne contactați la:{' '}
            <Link to="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
              pagina de contact
            </Link>
            .
          </p>
        </section>

        <div className="mt-8 pt-4 border-t">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            &larr; Înapoi la pagina principală
          </Link>
        </div>
      </div>
    </div>
  );
}