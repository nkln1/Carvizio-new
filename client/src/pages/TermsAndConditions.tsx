import { useState } from 'react';
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
    <>
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
            <p>-        "Client" – Persoana fizică sau juridică ce utilizează platforma pentru a solicita oferte de preț pentru lucrări de întreținere și reparații auto sau alte servicii auto conexe.</p>
            <p>-        "Service Auto" – Persoana juridică sau întreprinderea individuală înregistrată în platformă, care oferă servicii de reparații, întreținere sau alte lucrări auto ca răspuns la solicitările Clienților.</p>
            <p>-        "Utilizator" – Orice persoană fizică sau juridică ce accesează sau utilizează platforma Carvizio.ro, indiferent dacă are sau nu un cont creat pe platformă.</p>
            <p>-        "Cerere de Ofertă" – Solicitare transmisă prin intermediul platformei de către un Client, prin care se solicită Service-urilor înregistrate prezentarea unei estimări de preț și a condițiilor pentru efectuarea unei lucrări auto.</p>
            <p>-        "Ofertă" – Răspunsul transmis prin platformă de către un Service Auto la o Cerere de Ofertă, conținând detalii privind prețul estimativ, durata lucrării, disponibilitatea și alte condiții relevante.</p>
            <p>-        "Cont Utilizator" – Spațiul virtual asociat fiecărui Utilizator înregistrat pe platformă, accesibil pe baza unui nume de utilizator și a unei parole, care permite gestionarea activității în cadrul platformei.</p>
            <p>-        "Termeni și Condiții" – Prezentul document ce reglementează drepturile și obligațiile părților implicate în utilizarea platformei Carvizio.ro.</p>
            <p>-        "Servicii Auto" – Orice activitate de reparație, întreținere, verificare tehnică, montaj, demontare, vopsitorie, tinichigerie, diagnoză sau alte lucrări conexe asupra autovehiculelor.</p>
            <p>-        "Date cu Caracter Personal" – Orice informație care permite identificarea directă sau indirectă a unui Utilizator, inclusiv, dar fără a se limita la: nume, prenume, adresa de email, număr de telefon, date despre vehicul.</p>
            <p>-        "Politica de Confidențialitate" – Punctul 12 - reglementează modul în care Carvizio.ro colectează, utilizează, procesează și protejează datele personale ale Utilizatorilor.
</p>
        
      </AccordionItem>

      <AccordionItem title="3. Acceptarea Termenilor">
        <p>Prin crearea unui cont pe platforma Carvizio.ro, Utilizatorul declară că a citit, înțeles și acceptat în totalitate și fără rezerve acești Termeni și Condiții. Acceptarea acestor termeni reprezintă o condiție esențială pentru utilizarea platformei.</p>
        <p>Utilizatorul înțelege și acceptă că orice utilizare a platformei, inclusiv, dar fără a se limita la navigare, crearea unui cont, transmiterea unei cereri de ofertă sau furnizarea de informații, constituie o acceptare explicită și necondiționată a prezentului document, având valoarea unui contract valabil încheiat între părți, cu toate drepturile și obligațiile ce decurg din acesta.</p>
        <p>Prin acceptarea termenilor, Utilizatorul consimte expres că înțelege că platforma Carvizio.ro are rol exclusiv de intermediar, nefiind parte în nicio relație contractuală care se poate stabili între Clienți și Service-uri.</p>
        <p>Carvizio.ro își rezervă dreptul de a modifica unilateral și oricând conținutul Termenilor și Condițiilor, fără o notificare prealabilă. Modificările vor fi afișate pe platformă, iar continuarea utilizării după publicarea modificărilor echivalează cu acceptarea integrală a acestora.</p>
        <p>Este responsabilitatea Utilizatorului să verifice periodic conținutul acestor Termeni și Condiții pentru a se asigura că este la curent cu cea mai recentă versiune.</p>
        <p>În cazul în care Utilizatorul nu este de acord cu modificările operate, acesta are obligația de a înceta imediat utilizarea platformei și de a-și închide contul.</p>
        <p>Acceptarea acestor Termeni și Condiții conferă Carvizio.ro dreptul de a utiliza datele furnizate de Utilizator în conformitate cu Politica de Confidențialitate, precum și dreptul de a transmite notificări și comunicări comerciale.
</p>
        
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
        <p>5.1. Clienții se obligă să furnizeze informații corecte, complete și actualizate privind solicitările de ofertă, descriind în mod detaliat serviciile dorite și situația reală a autovehiculului, pentru a permite Service-urilor să emită oferte relevante și corecte. </p>
        <p>5.2. Service-urile se obligă să ofere estimări corecte, oneste și detaliate, cu respectarea legislației în vigoare și a standardelor de calitate aplicabile în domeniu. Service-urile sunt pe deplin responsabile de legalitatea, corectitudinea și veridicitatea informațiilor furnizate în cadrul ofertelor și în relația cu Clienții. </p>
        <p>5.3. Utilizatorii înțeleg și acceptă că orice relație contractuală, inclusiv încheierea și executarea contractului pentru servicii auto, se stabilește direct între Client și Service, pe răspunderea exclusivă a acestora. Carvizio.ro nu garantează și nu este responsabilă pentru îndeplinirea obligațiilor asumate de părți. </p>
        <p>5.4. Utilizatorii se obligă să nu utilizeze platforma Carvizio.ro în scopuri ilegale, frauduloase, pentru a induce în eroare, a denigra, a defăima sau a prejudicia în orice fel alți Utilizatori, Service-uri sau terțe părți. </p>
        <p>5.5. Utilizatorii au obligația să păstreze confidențialitatea datelor de acces la contul de Utilizator și să nu permită accesul neautorizat la contul propriu. Orice activitate desfășurată prin intermediul contului va fi considerată realizată de Utilizatorul respectiv. </p>
        <p>5.6. Utilizatorii sunt responsabili pentru respectarea tuturor prevederilor legale aplicabile în desfășurarea activităților lor prin intermediul platformei, inclusiv, dar fără a se limita la: reglementări fiscale, comerciale, de protecție a consumatorului și de protecție a datelor personale. </p>
        <p>5.7. Utilizatorii se obligă să nu publice sau să transmită prin intermediul platformei conținut ilegal, vulgar, abuziv, defăimător, discriminatoriu, amenințător, care încalcă drepturi de proprietate intelectuală sau care poate aduce prejudicii de orice natură Carvizio.ro, altor Utilizatori sau terților. </p>
        <p>5.8. În cazul în care Utilizatorii constată încălcări ale acestor termeni sau ale legislației aplicabile, aceștia au obligația de a notifica de îndată Carvizio.ro la adresa contact@carvizio.com. </p>
        <p>5.9. Utilizatorii își asumă întreaga responsabilitate pentru verificarea atentă a Service-urilor cu care aleg să colaboreze, inclusiv a existenței legale a acestora, a autorizațiilor necesare, a istoricului profesional și a oricăror alte aspecte relevante care țin de siguranța și legalitatea lucrărilor auto solicitate. </p>
        <p>5.10. Utilizatorii înțeleg și acceptă că utilizarea platformei Carvizio.ro se face pe propriul risc, inclusiv în ceea ce privește încrederea acordată ofertelor, estimărilor de preț sau altor informații furnizate de Service-uri. </p>
        <p>5.11. Clienții se obligă să efectueze plata serviciilor prestate în condițiile și termenele agreate cu Service-urile, Carvizio.ro nefiind în niciun fel responsabilă pentru eventuale întârzieri sau neexecutări ale plăților. </p>
        <p>5.12. Utilizatorii sunt obligați să utilizeze platforma Carvizio.ro într-un mod care să nu afecteze funcționarea normală a acesteia, să nu utilizeze programe automate sau alte metode tehnice care pot perturba sau deteriora funcționalitatea platformei.
</p>
        
      </AccordionItem>

      <AccordionItem title="6. Limitarea Răspunderii Carvizio.ro">
        <p>6.1. Carvizio.ro nu își asumă nicio răspundere pentru daune directe, indirecte, incidentale, speciale, punitive sau de orice altă natură rezultate din: </p>
        <p>- utilizarea sau imposibilitatea utilizării platformei; </p>
        <p>- înțelegeri, acorduri sau lucrări efectuate între Client și Service; </p>
        <p>- informații eronate, incomplete sau înșelătoare furnizate de Utilizatori sau Service-uri; </p>
        <p>- orice prejudiciu adus de Service-uri Clienților sau terților; </p>
        <p>- întârzieri, anulări, reprogramări sau neexecutări ale lucrărilor de către Service-uri; </p>
        <p>- pierderi de date, pierderi de profit sau alte pierderi comerciale suferite de Utilizatori în legătură cu utilizarea platformei; </p>
        <p>- viruși, atacuri informatice, erori de sistem sau alte disfuncționalități tehnice apărute în funcționarea platformei; </p>
        <p>- forță majoră sau alte cauze independente de voința Carvizio.ro. </p>
        <p>6.2. Carvizio.ro nu garantează: </p>
        <p>- disponibilitatea continuă, neîntreruptă și lipsită de erori a platformei; </p>
        <p>- veridicitatea, actualitatea, acuratețea sau legalitatea ofertelor și informațiilor postate de Service-uri; </p>
        <p>- calitatea, siguranța, legalitatea sau conformitatea cu standardele profesionale a serviciilor prestate de Service-uri; </p>
        <p>- încheierea efectivă a unui contract între Client și Service sau realizarea efectivă a lucrărilor solicitate. </p>
        <p>6.3. Carvizio.ro nu este responsabilă pentru orice acțiuni, omisiuni, erori sau neglijențe ale Service-urilor ori ale Utilizatorilor și nu intervine în gestionarea sau soluționarea eventualelor conflicte apărute între aceștia. </p>
        <p>6.4. Utilizatorii înțeleg și acceptă că folosesc platforma pe propria răspundere și își asumă în totalitate riscurile legate de alegerea unui Service, acceptarea unei oferte sau contractarea unui serviciu auto prin intermediul platformei. </p>
        <p>6.5. Carvizio.ro nu este parte în niciun contract încheiat între Client și Service și nu poate fi trasă la răspundere în nicio situație pentru neexecutarea, executarea necorespunzătoare sau întârziată a obligațiilor asumate de către aceștia. </p>
        <p>6.6. Carvizio.ro nu își asumă nicio obligație de garanție, de verificare sau de monitorizare a activității Service-urilor și nu poate fi trasă la răspundere pentru lipsa de profesionalism, încălcări ale legii, fraudă sau alte fapte ilicite ale acestora. </p>
        <p>6.7. Carvizio.ro nu își asumă nicio obligație de a media, soluționa sau interveni în litigiile apărute între Clienți și Service-uri, aceștia fiind singurii responsabili de soluționarea pe cale amiabilă sau prin instanță a eventualelor conflicte. </p>
        <p>6.8. Utilizatorii înțeleg și acceptă că toate informațiile și materialele afișate în cadrul platformei sunt furnizate exclusiv în scop informativ și nu reprezintă recomandări, garanții sau angajamente ale Carvizio.ro privind calitatea sau adecvarea serviciilor ofertate.
</p>
        
      </AccordionItem>

      <AccordionItem title="7. Politica de Plăți și Comisioane">
        <p>7.1. În funcție de modelul de business, Carvizio.ro poate percepe comisioane pentru anumite servicii oferite pe platformă. Valoarea, condițiile de aplicare și modalitatea de calcul a acestor comisioane vor fi afișate în mod clar și transparent în cadrul platformei, înainte de finalizarea oricărei tranzacții care generează obligația de plată. </p>
        <p>7.2. Carvizio.ro poate oferi anumite servicii sau funcționalități suplimentare contra cost, care vor fi accesibile utilizatorilor doar în baza achitării prealabile a taxelor stabilite în platformă. Utilizatorii care aleg să acceseze astfel de servicii plătite își asumă în totalitate obligația de a achita contravaloarea acestora. </p>
        <p>7.3. Toate tranzacțiile financiare, plățile pentru serviciile auto prestate efectiv de Service-uri, precum și eventualele rambursări sau compensații se realizează în afara platformei, în mod direct între Client și Service. Carvizio.ro nu este parte în procesul de plată și nu gestionează sume de bani între părți. </p>
        <p>7.4. Carvizio.ro nu percepe comisioane, taxe sau alte costuri ascunse suplimentare din partea Clienților pentru facilitarea comunicării între aceștia și Service-uri, cu excepția situațiilor în care acest lucru este menționat expres și vizibil în platformă. </p>
        <p>7.5. Utilizatorii înțeleg și acceptă că sunt singurii responsabili pentru achitarea oricăror taxe, impozite sau obligații fiscale aferente tranzacțiilor derulate în afara platformei între Client și Service. </p>
        <p>7.6. În cazul în care Carvizio.ro identifică tranzacții suspecte, tentative de fraudă sau neconcordanțe în privința plăților, își rezervă dreptul de a suspenda temporar sau definitiv accesul la platformă al utilizatorilor implicați și de a notifica autoritățile competente.
</p>
        
      </AccordionItem>

      <AccordionItem title="8. Confidențialitate și Protecția Datelor">
        <p>8.1. Carvizio.ro prelucrează datele personale conform legislației aplicabile în România și Politicii de Confidențialitate disponibile pe platformă. Datele colectate sunt utilizate strict în scopul furnizării serviciilor platformei, pentru comunicarea cu Utilizatorii, pentru îmbunătățirea serviciilor și în scopuri legale. </p>
        <p>8.2. Utilizatorii au obligația să păstreze confidențialitatea datelor de acces la cont, să nu le divulge terților și să își asume întreaga responsabilitate pentru activitatea desfășurată prin contul propriu. </p>
        <p>8.3. Carvizio.ro nu va înstrăina, vinde, închiria sau divulga în alte scopuri comerciale datele personale ale Utilizatorilor către terți fără consimțământul expres al acestora, cu excepția cazurilor prevăzute de lege sau solicitate de autoritățile competente. </p>
        <p>8.4. Carvizio.ro poate transmite datele personale către terți doar în scopul îndeplinirii serviciilor oferite (ex: transmiterea cererii de ofertă către Service-uri), cu respectarea principiilor de minimizare și protecție a datelor. </p>
        <p>8.5. Utilizatorii beneficiază de toate drepturile prevăzute de legislația aplicabilă privind protecția datelor cu caracter personal, inclusiv, dar fără a se limita la: dreptul de acces, rectificare, ștergere, restricționare a prelucrării, opoziție și portabilitate a datelor. </p>
        <p>8.6. În cazul în care Utilizatorul solicită ștergerea datelor personale sau a contului, Carvizio.ro va respecta această solicitare în condițiile prevăzute de legislația aplicabilă, cu mențiunea că anumite date pot fi păstrate în scopuri legale sau pentru apărarea drepturilor Carvizio.ro. </p>
        <p>8.7. Carvizio.ro se obligă să implementeze măsuri tehnice și organizatorice adecvate pentru protecția datelor personale împotriva accesului neautorizat, pierderii, distrugerii sau alterării neautorizate. </p>
        <p>8.8. Carvizio.ro nu este responsabilă pentru eventualele breșe de securitate apărute ca urmare a utilizării necorespunzătoare de către Utilizatori a contului propriu sau a dispozitivelor personale de pe care accesează platforma. </p>
        <p>8.9. Utilizatorii înțeleg și acceptă că în cadrul platformei pot fi folosite tehnologii de tip cookie sau tehnologii similare pentru îmbunătățirea experienței de utilizare și pentru analize statistice, în conformitate cu Politica de Cookies disponibilă pe site. </p>
        <p>8.10. Orice solicitare privind protecția datelor, inclusiv exercitarea drepturilor prevăzute de Regulamentul (UE) 2016/679 (GDPR), poate fi transmisă la adresa: contact@carvizio.com.
</p>
        
      </AccordionItem>

      <AccordionItem title="9. Drepturi de Proprietate Intelectuală">
        <p>9.1. Toate elementele grafice, software-ul, modulele, textele, bazele de date, imaginile,     logo-urile, denumirea comercială, marca înregistrată Carvizio.ro, precum și orice alte materiale disponibile în cadrul platformei sunt proprietatea exclusivă a Carvizio.ro sau a partenerilor săi și sunt protejate de legislația privind drepturile de autor, mărcile comerciale și alte reglementări aplicabile. </p>
        <p>9.2. Utilizatorilor le este strict interzis să copieze, reproducă, distribuie, publice, transmită, modifice, creeze lucrări derivate, afișeze sau să exploateze în orice mod, total sau parțial, platforma sau conținutul acesteia fără acordul prealabil scris al Carvizio.ro. </p>
        <p>9.3. Dreptul de utilizare acordat Utilizatorilor asupra platformei este unul limitat, neexclusiv, netransferabil și revocabil, având ca unic scop accesarea și utilizarea platformei conform acestor Termeni și Condiții. </p>
        <p>9.4. Orice utilizare neautorizată a conținutului platformei, inclusiv dar fără a se limita la copiere, redistribuire, vânzare sau exploatare în scop comercial, constituie o încălcare gravă a drepturilor de proprietate intelectuală ale Carvizio.ro și poate atrage răspunderea civilă, contravențională sau penală, conform legislației în vigoare. </p>
        <p>9.5. În cazul în care un Utilizator sau o terță parte consideră că în cadrul platformei au fost încălcate drepturi de proprietate intelectuală, aceștia au obligația de a notifica în scris Carvizio.ro la adresa contact@carvizio.com, cu furnizarea tuturor informațiilor relevante pentru identificarea dreptului încălcat. </p>
        <p>9.6. Carvizio.ro își rezervă dreptul de a acționa în justiție orice persoană fizică sau juridică ce încalcă drepturile de proprietate intelectuală asupra platformei, conținutului sau oricăror materiale asociate. </p>
        <p>9.7. Nicio prevedere a acestor Termeni și Condiții nu conferă Utilizatorilor sau terților vreun drept, titlu sau interes asupra mărcii Carvizio.ro sau asupra oricărui alt drept de proprietate intelectuală deținut de Carvizio.ro. </p>
        <p>9.8. Este interzisă orice utilizare a mărcii Carvizio.ro sau a elementelor distinctive ale platformei în scopuri comerciale, publicitare sau de promovare fără acordul scris al Carvizio.ro.
</p>
        
      </AccordionItem>

      <AccordionItem title="10. Suspendarea și Încetarea Accesului">
        <p>Carvizio.ro își rezervă dreptul de a suspenda temporar sau de a închide definitiv conturile Utilizatorilor în următoarele situații, fără a fi necesară o notificare prealabilă și fără nicio despăgubire: </p>
        <p>10.1. Încălcarea oricărei prevederi din acești Termeni și Condiții; </p>
        <p>10.2. Utilizarea platformei în scopuri ilegale, frauduloase, defăimătoare sau pentru a prejudicia Carvizio.ro, alți Utilizatori sau terți; </p>
        <p>10.3. Tentative de fraudare a sistemului de recenzii, prin postarea de recenzii false, multiple, utilizarea de conturi false sau prin orice altă acțiune menită să influențeze în mod nejustificat imaginea Service-urilor, a platformei sau a altor Utilizatori; </p>
        <p>10.4. Utilizarea unor metode tehnice, programe sau alte procedee care afectează funcționarea normală a platformei sau pun în pericol securitatea acesteia; </p>
        <p>10.5. Transmiterea de informații false, calomnioase, denigratoare sau de natură să afecteze reputația Carvizio.ro, a Service-urilor sau a altor Utilizatori; </p>
        <p>10.6. Orice comportament abuziv, ofensator, agresiv sau dăunător față de platformă, Service-uri, Utilizatori sau față de angajații Carvizio.ro; </p>
        <p>10.7. Repetarea unor practici neloiale, frauduloase sau ilegale în utilizarea platformei; </p>
        <p>10.8. Refuzul repetat de a respecta obligațiile asumate prin intermediul platformei, inclusiv neplata serviciilor contractate; </p>
        <p>10.9. Utilizarea contului pentru a derula activități care contravin legii, bunelor moravuri sau ordinii publice. </p>
        <p>În caz de suspendare sau închidere a contului, toate drepturile de utilizare a platformei încetează de îndată, iar Carvizio.ro nu va fi ținută răspunzătoare pentru nicio pierdere, de orice natură, suferită de Utilizator. </p>
        <p>Carvizio.ro își rezervă dreptul de a acționa în justiție Utilizatorii care încalcă în mod grav și repetat prevederile acestor Termeni și Condiții sau care aduc prejudicii materiale sau de imagine platformei.
</p>
        
      </AccordionItem>

      <AccordionItem title="11. Legea Aplicabilă și Jurisdicția">
        <p>11.1. Acești Termeni și Condiții sunt guvernați de legea română în vigoare la data utilizării platformei Carvizio.ro, inclusiv, dar fără a se limita la, dispozițiile legale privind protecția consumatorului, comerțul electronic, drepturile de autor, protecția datelor cu caracter personal și reglementările specifice sectorului auto. </p>
        <p>11.2. Orice litigiu, neînțelegere sau pretenție apărută între Utilizatori și Carvizio.ro cu privire la interpretarea, executarea sau încetarea prezentelor Termeni și Condiții, inclusiv cele referitoare la validitatea, interpretarea, executarea ori încetarea oricărui contract încheiat prin intermediul platformei, va fi soluționat pe cale amiabilă. </p>
        <p>11.3. În situația în care soluționarea pe cale amiabilă nu este posibilă, părțile se vor adresa exclusiv instanțelor judecătorești competente din raza sediului Carvizio.ro. Utilizatorii înțeleg și acceptă în mod expres că aceasta reprezintă clauză de atribuire de competență teritorială. </p>
        <p>11.4. În cazul în care oricare dintre prevederile acestor Termeni și Condiții este considerată nulă, nelegală sau inaplicabilă de către o instanță sau autoritate competentă, aceasta nu va afecta valabilitatea și aplicabilitatea celorlalte dispoziții, care vor continua să producă efecte depline. </p>
        <p>11.5. Utilizatorii înțeleg și acceptă că legislația aplicabilă acoperă inclusiv, dar fără a se limita la, toate reglementările aplicabile la nivel național și european în vigoare la momentul utilizării platformei. </p>
        <p>11.6. Prezentul document reprezintă un contract cu valoare juridică deplină între părți și produce efecte pe toată durata utilizării platformei, precum și ulterior, pentru orice drepturi și obligații nascute din utilizarea acesteia. </p>
        <p>11.7. Carvizio.ro își rezervă dreptul de a coopera cu autoritățile competente și de a furniza acestora orice informații necesare pentru investigarea unor posibile încălcări ale legii sau ale prezentelor Termeni și Condiții.
</p>
        
      </AccordionItem>

      <AccordionItem title="12. Politica de Cookie-uri">
        <p>12.1. Platforma Carvizio.ro utilizează doar cookie-uri esențiale, necesare pentru funcționarea corectă și securizată a site-ului. Aceste cookie-uri sunt esențiale pentru funcționalități precum autentificarea utilizatorilor, menținerea sesiunii active și memorarea preferințelor de bază. </p>
        <p>12.2. Cookie-urile esențiale utilizate în cadrul platformei NU colectează date personale identificabile și NU sunt utilizate în scopuri de marketing, analiză sau publicitate. Carvizio.ro nu utilizează cookie-uri de analiză, de urmărire sau terțe în scop comercial. </p>
        <p>12.3. Exemple de cookie-uri esențiale utilizate: </p>
        <p>- essential-cookie-consent: reține acordul utilizatorului privind politica de cookie-uri (durată: 1 an); </p>
        <p>- session: menține sesiunea activă în timpul vizitei (durată: sesiune, până la închiderea browserului). </p>
        <p>12.4. Prin continuarea navigării pe platformă, Utilizatorul își exprimă acordul pentru utilizarea exclusivă a cookie-urilor esențiale, în condițiile prezentei Politici de Cookie-uri. </p>
        <p>12.5. Utilizatorii pot gestiona sau dezactiva cookie-urile esențiale prin setările browserului, însă acest lucru poate afecta funcționarea corectă a platformei. </p>
        <p>12.6. Carvizio.ro nu vinde, nu închiriază și nu transmite datele colectate prin cookie-uri către terțe părți. </p>
        <p>12.7. Pentru mai multe informații despre cookie-uri, Utilizatorii pot accesa resurse externe precum www.aboutcookies.org sau www.allaboutcookies.org. </p>
        <p>12.8. Carvizio.ro își rezervă dreptul de a modifica această Politică de Cookie-uri, orice modificare urmând a fi afișată în platformă.
</p>
       
      </AccordionItem>

      <AccordionItem title="13. Contact">
        <p>Pentru orice întrebări, sesizări, clarificări sau solicitări privind funcționarea platformei, termeni și condiții, date cu caracter personal sau alte aspecte legate de utilizarea Carvizio.ro, vă rugăm să ne contactați folosind următoarele date de contact: </p>
        <p>Email oficial: contact@carvizio.com </p>
        <p>Suport tehnic: support@carvizio.com </p>
        <p>Marketing: marketing@carvizio.com </p>
        <p>Program de lucru pentru soluționarea sesizărilor: Luni - Vineri, între orele 09:00 - 17:00 </p>
        <p>Orice notificare sau solicitare transmisă prin email se consideră primită în prima zi lucrătoare de la data expedierii. </p>
        <p>Carvizio.ro își rezervă dreptul de a solicita informații suplimentare în vederea soluționării sesizărilor sau cererilor primite. </p>
        <p>De asemenea, Utilizatorii pot transmite sesizări către autoritățile competente dacă apreciază că le-au fost încălcate drepturile. </p>
        <p>Carvizio.ro recomandă parcurgerea cu atenție a acestor termeni. Utilizarea platformei presupune acceptarea integrală a acestora. 
</p>
       
      </AccordionItem>

      <p className="text-gray-700 mt-8 italic">Ultima actualizare: 25 Martie 2025</p>
    </div>
  );
}
