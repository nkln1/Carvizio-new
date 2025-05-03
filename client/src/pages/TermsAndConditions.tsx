import React, { useState } from 'react';
import { Link } from 'wouter';
import SEOHeader from '@/components/seo/SEOHeader';
import StructuredData from '@/components/seo/StructuredData';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 border-b pb-4">
      <button
        className="w-full text-left font-semibold text-xl flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <span>{isOpen ? '-' : '+'}</span>
      </button>
      {isOpen && <div className="mt-2 text-gray-700 prose prose-lg max-w-none">{children}</div>}
    </div>
  );
};

export default function TermsAndConditions() {
  // Schema pentru date structurate - Document Legal (Termeni și Condiții)
  const termsSchema = {
    type: 'Document' as const,
    data: {
      name: "Termeni și Condiții CARVIZIO",
      description: "Termenii și condițiile de utilizare a platformei Carvizio.ro pentru conectarea service-urilor auto cu clienții",
      datePublished: "2023-12-01",
      dateModified: "2024-05-01",
      publisher: {
        name: "CARVIZIO",
        logo: "https://auto-service-app.ro/logo.png"
      },
      inLanguage: "ro"
    }
  };

  return (
    <React.Fragment>
      {/* SEO Header cu metadate pentru pagina de Termeni și Condiții */}
      <SEOHeader 
        title="Termeni și Condiții | CARVIZIO - Platformă Service Auto"
        description="Termenii și condițiile de utilizare a platformei Carvizio. Află despre drepturile și obligațiile utilizatorilor, responsabilități, protecția datelor personale și alte aspecte legale."
        keywords="termeni și condiții Carvizio, condiții utilizare platformă service auto, aspecte legale service auto, drepturi utilizatori platformă auto"
        canonicalUrl="https://auto-service-app.ro/terms-and-conditions"
        ogType="article"
      />
      
      {/* Datele structurate pentru pagina de Termeni și Condiții */}
      <StructuredData schema={termsSchema} />
      
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-[#00aff5] hover:underline flex items-center">
            &larr; Înapoi la pagina principală
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Termeni și Condiții</h1>

        <AccordionItem title="1. Introducere">
          <p>Bine ați venit pe Carvizio.ro! Acest document stabilește termenii și condițiile de utilizare a platformei Carvizio.ro. Prin accesarea și utilizarea serviciilor noastre, acceptați și sunteți de acord să respectați acești termeni.</p>
          <p>Carvizio.ro este o platformă digitală care facilitează interacțiunea dintre utilizatori (denumiți în continuare "Clienți") și unități prestatoare de servicii auto (denumite în continuare "Service-uri") prin intermedierea cererilor de ofertă pentru lucrări de întreținere și reparații auto. Accesarea și utilizarea platformei implică acceptarea integrală și necondiționată a prezentelor Termeni și Condiții.</p>
          <p>Carvizio.ro oferă un cadru digital prin care Clienții pot solicita oferte de preț pentru diverse servicii auto, iar Service-urile pot răspunde cu estimări și disponibilitate. Carvizio.ro nu prestează servicii auto și nu intervine în relațiile contractuale dintre Clienți și Service-uri.</p>
          <p>Carvizio.ro este marcă înregistrată și funcționează în conformitate cu legislația din România. Toate drepturile asupra denumirii comerciale, siglei, aplicației și website-ului Carvizio.ro sunt rezervate.</p>
          <p>Accesarea și utilizarea platformei implică acceptarea integrală și necondiționată a prezentelor Termeni și Condiții. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați platforma.</p>
        </AccordionItem>

        <AccordionItem title="2. Definiții">
          <p>În cadrul acestui document, următorii termeni vor avea semnificațiile de mai jos:</p>
          <p>-  "Platformă" – Website-ul și aplicația Carvizio.ro, prin intermediul cărora se realizează conexiunea digitală între Clienți și Service-uri, incluzând toate funcționalitățile, modulele, conținutul și bazele de date asociate.</p>
          <p>-  "Client" – Persoana fizică sau juridică ce utilizează platforma pentru a solicita oferte de preț pentru lucrări de întreținere și reparații auto sau alte servicii auto conexe.</p>
          <p>-  "Service Auto" – Persoana juridică sau întreprinderea individuală înregistrată în platformă, care oferă servicii de reparații, întreținere sau alte lucrări auto ca răspuns la solicitările Clienților.</p>
          <p>-  "Utilizator" – Orice persoană fizică sau juridică ce accesează sau utilizează platforma Carvizio.ro, indiferent dacă are sau nu un cont creat pe platformă.</p>
          <p>-  "Cerere de Ofertă" – Solicitare transmisă prin intermediul platformei de către un Client, prin care se solicită Service-urilor înregistrate prezentarea unei estimări de preț și a condițiilor pentru efectuarea unei lucrări auto.</p>
          <p>-  "Ofertă" – Răspunsul transmis prin platformă de către un Service Auto la o Cerere de Ofertă, conținând detalii privind prețul estimativ, durata lucrării, disponibilitatea și alte condiții relevante.</p>
          <p>-  "Cont Utilizator" – Spațiul virtual asociat fiecărui Utilizator înregistrat pe platformă, accesibil pe baza unui nume de utilizator și a unei parole, care permite gestionarea activității în cadrul platformei.</p>
          <p>-  "Termeni și Condiții" – Prezentul document ce reglementează drepturile și obligațiile părților implicate în utilizarea platformei Carvizio.ro.</p>
          <p>-  "Servicii Auto" – Orice activitate de reparație, întreținere, verificare tehnică, montaj, demontare, vopsitorie, tinichigerie, diagnoză sau alte lucrări conexe asupra autovehiculelor.</p>
          <p>-  "Date cu Caracter Personal" – Orice informație care permite identificarea directă sau indirectă a unui Utilizator, inclusiv, dar fără a se limita la: nume, prenume, adresa de email, număr de telefon, date despre vehicul.</p>
          <p>-  "Politica de Confidențialitate" – Punctul 12 - reglementează modul în care Carvizio.ro colectează, utilizează, procesează și protejează datele personale ale Utilizatorilor.</p>
        </AccordionItem>

        <AccordionItem title="3. Acceptarea Termenilor">
          <p>Prin crearea unui cont pe platforma Carvizio.ro, Utilizatorul declară că a citit, înțeles și acceptat în totalitate și fără rezerve acești Termeni și Condiții. Acceptarea acestor termeni reprezintă o condiție esențială pentru utilizarea platformei.</p>
          <p>Utilizatorul înțelege și acceptă că orice utilizare a platformei, inclusiv, dar fără a se limita la navigare, crearea unui cont, transmiterea unei cereri de ofertă sau furnizarea de informații, constituie o acceptare explicită și necondiționată a prezentului document, având valoarea unui contract valabil încheiat între părți, cu toate drepturile și obligațiile ce decurg din acesta.</p>
          <p>Prin acceptarea termenilor, Utilizatorul consimte expres că înțelege că platforma Carvizio.ro are rol exclusiv de intermediar, nefiind parte în nicio relație contractuală care se poate stabili între Clienți și Service-uri.</p>
          <p>Carvizio.ro își rezervă dreptul de a modifica unilateral și oricând conținutul Termenilor și Condițiilor, fără o notificare prealabilă. Modificările vor fi afișate pe platformă, iar continuarea utilizării după publicarea modificărilor echivalează cu acceptarea integrală a acestora.</p>
          <p>Este responsabilitatea Utilizatorului să verifice periodic conținutul acestor Termeni și Condiții pentru a se asigura că este la curent cu cea mai recentă versiune.</p>
          <p>În cazul în care Utilizatorul nu este de acord cu modificările operate, acesta are obligația de a înceta imediat utilizarea platformei și de a-și închide contul.</p>
          <p>Acceptarea acestor Termeni și Condiții conferă Carvizio.ro dreptul de a utiliza datele furnizate de Utilizator în conformitate cu Politica de Confidențialitate, precum și dreptul de a transmite notificări și comunicări comerciale.</p>
        </AccordionItem>

        <AccordionItem title="4. Descrierea Serviciilor">
          <p>Carvizio.ro pune la dispoziția Utilizatorilor o platformă digitală care facilitează transmiterea cererilor de ofertă pentru lucrări de întreținere, reparații și alte servicii auto către Service-urile înscrise în platformă.</p>
          <p>Carvizio.ro acționează exclusiv ca intermediar digital și nu furnizează, nu prestează și nu garantează în niciun fel serviciile auto solicitate sau oferite prin intermediul platformei. Carvizio.ro nu verifică, nu certifică, nu controlează și nu își asumă nicio responsabilitate cu privire la competențele, autorizările legale, calitatea lucrărilor, prețurile practicate, termenii contractuali sau orice alte aspecte legate de activitatea Service-urilor.</p>
          <p>Platforma Carvizio.ro oferă doar posibilitatea tehnică de a transmite cereri de ofertă și de a primi oferte de la Service-urile înscrise, fără a garanta răspunsuri, prețuri sau termene de execuție.</p>
          <p>Carvizio.ro nu este parte în nicio relație contractuală, comercială sau juridică ce poate lua naștere între Clienți și Service-uri ca urmare a utilizării platformei. Orice înțelegere, angajament sau acord între Client și Service se stabilește exclusiv între aceștia, pe propria lor răspundere, Carvizio.ro neavând nicio obligație și neasumându-și nicio responsabilitate în legătură cu executarea sau neexecutarea acestor înțelegeri.</p>
          <p>Utilizarea platformei nu creează nicio obligație în sarcina Carvizio.ro de a garanta disponibilitatea Service-urilor sau calitatea serviciilor prestate de acestea. Carvizio.ro nu controlează și nu este responsabilă pentru conținutul ofertelor transmise de Service-uri, pentru prețurile estimate sau pentru termenii propuși de aceștia.</p>
          <p>Carvizio.ro nu este implicată în procesul de plată și nu percepe comisioane de la Clienți pentru serviciile prestate de Service-uri, cu excepția situațiilor în care acest lucru este menționat expres în platformă.</p>
          <p>Carvizio.ro nu își asumă nicio răspundere și nu garantează în niciun fel că utilizarea platformei va conduce la încheierea unor contracte sau la realizarea unor lucrări auto. Orice alegere a unui Service Auto, orice contractare a unui serviciu, orice plată sau executare de lucrări se face pe propria răspundere a Clienților și Service-urilor.</p>
          <p>De asemenea, Carvizio.ro nu este responsabilă pentru nicio pierdere de profit, pierdere de oportunitate, daune comerciale, pierderi de date sau alte prejudicii indirecte sau consecvente suferite de Utilizatori ca urmare a utilizării platformei sau a neîndeplinirii obligațiilor de către părțile contractante.</p>
        </AccordionItem>

        <AccordionItem title="5. Obligațiile și Responsabilitățile Utilizatorilor">
          <p>5.1. Clienții se obligă să furnizeze informații corecte, complete și actualizate privind solicitările de ofertă, descriind în mod detaliat serviciile dorite și situația reală a autovehiculului, pentru a permite Service-urilor să emită oferte relevante și corecte.</p>
          <p>5.2. Service-urile se obligă să ofere estimări corecte, oneste și detaliate, cu respectarea legislației în vigoare și a standardelor de calitate aplicabile în domeniu. Service-urile sunt pe deplin responsabile de legalitatea, corectitudinea și veridicitatea informațiilor furnizate în cadrul ofertelor și în relația cu Clienții.</p>
          <p>5.3. Utilizatorii înțeleg și acceptă că orice relație contractuală, inclusiv încheierea și executarea contractului pentru servicii auto, se stabilește direct între Client și Service, pe răspunderea exclusivă a acestora. Carvizio.ro nu garantează și nu este responsabilă pentru îndeplinirea obligațiilor asumate de părți.</p>
          <p>5.4. Utilizatorii se obligă să nu utilizeze platforma Carvizio.ro în scopuri ilegale, frauduloase, pentru a induce în eroare, a denigra, a defăima sau a prejudicia în orice fel alți Utilizatori, Service-uri sau terțe părți.</p>
          <p>5.5. Utilizatorii au obligația să păstreze confidențialitatea datelor de acces la contul de Utilizator și să nu permită accesul neautorizat la contul propriu. Orice activitate desfășurată prin intermediul contului va fi considerată realizată de Utilizatorul respectiv.</p>
          <p>5.6. Utilizatorii sunt responsabili pentru respectarea tuturor prevederilor legale aplicabile în desfășurarea activităților lor prin intermediul platformei, inclusiv, dar fără a se limita la: reglementări fiscale, comerciale, de protecție a consumatorului și de protecție a datelor personale.</p>
          <p>5.7. Utilizatorii se obligă să nu publice sau să transmită prin intermediul platformei conținut ilegal, vulgar, abuziv, defăimător, discriminatoriu, amenințător, care încalcă drepturi de proprietate intelectuală sau care poate aduce prejudicii de orice natură Carvizio.ro, altor Utilizatori sau terților.</p>
          <p>5.8. În cazul în care Utilizatorii constată încălcări ale acestor termeni sau ale legislației aplicabile, aceștia au obligația de a notifica de îndată Carvizio.ro la adresa contact@carvizio.com.</p>
          <p>5.9. Utilizatorii își asumă întreaga responsabilitate pentru verificarea atentă a Service-urilor cu care aleg să colaboreze, inclusiv a existenței legale a acestora, a autorizațiilor necesare, a istoricului profesional și a oricăror alte aspecte relevante care țin de siguranța și legalitatea lucrărilor auto solicitate.</p>
          <p>5.10. Utilizatorii înțeleg și acceptă că utilizarea platformei Carvizio.ro se face pe propriul risc, inclusiv în ceea ce privește încrederea acordată ofertelor, estimărilor de preț sau altor informații furnizate de Service-uri.</p>
          <p>5.11. Clienții se obligă să efectueze plata serviciilor prestate în condițiile și termenele agreate cu Service-urile, Carvizio.ro nefiind în niciun fel responsabilă pentru eventuale întârzieri sau neexecutări ale plăților.</p>
          <p>5.12. Utilizatorii sunt obligați să utilizeze platforma Carvizio.ro într-un mod care să nu afecteze funcționarea normală a acesteia, să nu utilizeze programe automate sau alte metode tehnice care pot perturba sau deteriora funcționalitatea platformei.</p>
        </AccordionItem>

        <p className="text-gray-700 mt-8 italic">Ultima actualizare: 25 Martie 2025</p>
      </div>
    </React.Fragment>
  );
}