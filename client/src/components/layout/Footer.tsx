import { useLocation } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [, setLocation] = useLocation();

  const handleContactClick = () => {
    setLocation("/contact");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  const handleLogoClick = () => {
    setLocation("/");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap justify-center space-x-6 md:space-x-12">
          <button
            onClick={handleContactClick}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Contactează-ne
          </button>
          <a
            href="#"
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Termeni și condiții
          </a>
        </nav>
        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
          >
            <img
              src="https://i.ibb.co/njmjGNW/Logo.png"
              alt="CARVIZIO Logo"
              className="h-6 sm:h-8 w-auto"
            />
            <span className="text-lg sm:text-xl font-bold text-white font-gugi">
              CARVIZIO
            </span>
          </button>
          <p className="mt-4 text-center text-sm sm:text-base text-gray-400">
            © {currentYear} CARVIZIO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
