import { Link } from 'wouter';

export default function CookiePolicy() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-[#00aff5] hover:underline flex items-center">
          &larr; Înapoi la pagina principală
        </Link>
      </div>

      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold mb-6">Politica de Cookie-uri</h1>
        
        <p className="text-gray-700 mb-6">
          Această Politică de Cookie-uri explică ce sunt cookie-urile, cum le folosim, ce tipuri 
          de cookie-uri folosim și cum puteți gestiona setările cookie-urilor.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Ce sunt cookie-urile?</h2>
        <p className="text-gray-700 mb-4">
          Cookie-urile sunt mici fișiere text care sunt plasate pe dispozitivul dvs. atunci când vizitați 
          un site web. Ele sunt folosite pe scară largă pentru a face site-urile web să funcționeze mai 
          eficient, precum și pentru a oferi informații proprietarilor site-ului.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Cum folosim cookie-urile</h2>
        <p className="text-gray-700 mb-4">
          Folosim cookie-uri esențiale pentru a asigura funcționalitatea de bază a site-ului nostru. 
          Aceste cookie-uri sunt necesare pentru ca site-ul nostru să funcționeze corect și nu pot fi 
          dezactivate în sistemele noastre.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Tipuri de cookie-uri pe care le folosim</h2>
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3">Cookie-uri esențiale</h3>
          <p className="text-gray-700 mb-2">
            Aceste cookie-uri sunt necesare pentru funcționarea de bază a site-ului nostru și nu pot fi 
            dezactivate. Ele includ:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Cookie-uri de sesiune pentru autentificare și menținerea sesiunii utilizatorului</li>
            <li>Cookie-uri pentru preferințele de consimțământ pentru cookie-uri</li>
            <li>Cookie-uri necesare pentru funcționarea formularelor și procesarea cererilor</li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Cum să gestionați cookie-urile</h2>
        <p className="text-gray-700 mb-4">
          Majoritatea browserelor web permit controlul cookie-urilor prin setările browserului. Pentru a 
          afla mai multe despre cookie-uri, inclusiv cum să vedeți ce cookie-uri au fost setate și cum 
          să le gestionați sau să le ștergeți, vizitați <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-[#00aff5] hover:underline">www.allaboutcookies.org</a>.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Modificări ale politicii de cookie-uri</h2>
        <p className="text-gray-700 mb-4">
          Putem actualiza această politică de cookie-uri din când în când pentru a reflecta, de exemplu, 
          modificări ale cookie-urilor pe care le folosim sau din alte motive operaționale, legale sau de 
          reglementare. Vă încurajăm să vizitați periodic această pagină pentru a rămâne informat despre 
          utilizarea cookie-urilor și a tehnologiilor aferente.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
        <p className="text-gray-700">
          Dacă aveți întrebări despre utilizarea cookie-urilor sau a altor tehnologii, vă rugăm să ne 
          contactați prin intermediul paginii noastre de <Link href="/contact" className="text-[#00aff5] hover:underline">contact</Link>.
        </p>
      </div>
    </div>
  );
}