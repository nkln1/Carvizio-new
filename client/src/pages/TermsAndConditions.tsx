
import { Link } from 'wouter';

export default function TermsAndConditions() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-[#00aff5] hover:underline flex items-center">
          &larr; Înapoi la pagina principală
        </Link>
      </div>

      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold mb-6">Termeni și Condiții</h1>
        
        <p className="text-gray-700 mb-6">
          Bine ați venit la CARVIZIO®. Vă rugăm să citiți cu atenție acești termeni și condiții de utilizare înainte de a folosi serviciile noastre.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptarea Termenilor</h2>
        <p className="text-gray-700 mb-4">
          Prin accesarea și utilizarea platformei CARVIZIO®, acceptați să respectați acești termeni și condiții. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați serviciile noastre.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Descrierea Serviciilor</h2>
        <p className="text-gray-700 mb-4">
          CARVIZIO® oferă o platformă online care facilitează conectarea proprietarilor de vehicule cu servicii auto. Platforma noastră permite utilizatorilor să solicite oferte pentru diverse servicii auto, să programeze vizite și să evalueze experiențele.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Înregistrarea Contului</h2>
        <p className="text-gray-700 mb-4">
          Pentru a utiliza toate funcționalitățile platformei, trebuie să vă înregistrați și să creați un cont. Sunteți responsabil pentru păstrarea confidențialității informațiilor de autentificare și pentru toate activitățile care au loc sub contul dvs.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Responsabilitățile Utilizatorului</h2>
        <p className="text-gray-700 mb-4">
          Ca utilizator al platformei CARVIZIO®, sunteți de acord:
        </p>
        <ul className="list-disc pl-6 mb-4 text-gray-700">
          <li>Să furnizați informații corecte și complete</li>
          <li>Să nu utilizați platforma în scopuri ilegale sau neautorizate</li>
          <li>Să respectați drepturile altor utilizatori</li>
          <li>Să nu întrerupeți funcționarea normală a platformei</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Servicii și Tranzacții</h2>
        <p className="text-gray-700 mb-4">
          CARVIZIO® facilitează conexiunea dintre clienți și furnizori de servicii auto, dar nu este parte a tranzacțiilor efectuate între utilizatori. Toate contractele și acordurile sunt încheiate direct între client și furnizorul de servicii.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Recenzii și Evaluări</h2>
        <p className="text-gray-700 mb-4">
          Utilizatorii pot lăsa recenzii și evaluări pentru serviciile primite. Aceste recenzii trebuie să fie obiective, bazate pe experiențe reale și să nu conțină limbaj ofensator sau informații false.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Proprietate Intelectuală</h2>
        <p className="text-gray-700 mb-4">
          Toate drepturile de proprietate intelectuală legate de platforma CARVIZIO®, inclusiv dar fără a se limita la logo-uri, mărci comerciale, texte, grafice și software sunt proprietatea exclusivă a CARVIZIO® sau a licențiatorilor săi.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Limitarea Răspunderii</h2>
        <p className="text-gray-700 mb-4">
          CARVIZIO® nu este responsabil pentru calitatea serviciilor oferite de furnizorii de servicii auto listați pe platformă. Utilizăm platforma pe propriul risc și răspundere.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Confidențialitate</h2>
        <p className="text-gray-700 mb-4">
          Utilizarea datelor personale este guvernată de Politica noastră de Confidențialitate, care face parte integrantă din acești Termeni și Condiții.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Modificări ale Termenilor</h2>
        <p className="text-gray-700 mb-4">
          CARVIZIO® își rezervă dreptul de a modifica acești termeni și condiții în orice moment. Modificările vor intra în vigoare imediat după publicarea lor pe site. Continuarea utilizării platformei după publicarea modificărilor constituie acceptarea acestora.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Legea Aplicabilă</h2>
        <p className="text-gray-700 mb-4">
          Acești termeni și condiții sunt guvernați și interpretați în conformitate cu legile României, fără a ține cont de principiile conflictului de legi.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact</h2>
        <p className="text-gray-700">
          Pentru orice întrebări sau preocupări legate de acești termeni și condiții, vă rugăm să ne contactați prin intermediul paginii noastre de <Link href="/contact" className="text-[#00aff5] hover:underline">contact</Link>.
        </p>

        <p className="text-gray-700 mt-8 italic">
          Ultima actualizare: Martie 2025
        </p>
      </div>
    </div>
  );
}
