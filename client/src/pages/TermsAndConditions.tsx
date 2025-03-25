
import { Link } from 'wouter';

export default function TermsAndConditions() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="text-[#00aff5] hover:underline flex items-center">
          &larr; Înapoi la pagina principală
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Termeni și Condiții</h1>
      
      <div className="w-full h-[800px] border border-gray-300 rounded-lg overflow-hidden">
        <iframe 
          src="/Termeni_Conditii.pdf" 
          className="w-full h-full" 
          title="Termeni și Condiții CARVIZIO"
        ></iframe>
      </div>
    </div>
  );
}
