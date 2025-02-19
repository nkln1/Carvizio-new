export default function AppPreview() {
  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-r from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center">
        {/* Imaginea cu telefon - optimizată pentru mobile */}
        <div className="md:w-1/2 flex justify-center mb-8 md:mb-0 md:pr-10">
          <img
            src="https://i.ibb.co/yYYRCCC/app.png"
            alt="Previzualizare Aplicație Mobilă"
            className="w-[280px] sm:w-[320px] md:max-h-96 object-contain drop-shadow-lg transform hover:scale-105 transition-transform duration-300"
            loading="lazy"
            width={320}
            height={640}
          />
        </div>

        {/* Textul explicativ - optimizat pentru contrast și lizibilitate */}
        <div className="md:w-1/2 text-center md:text-left space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Aplicația Mobilă
            <br className="hidden sm:block" />
            <span className="text-[#0077cc]" aria-label="mesaj important">Vine în Curând!</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-800 leading-relaxed max-w-xl mx-auto md:mx-0">
            Lucrăm intens la dezvoltarea aplicației noastre mobile, care va fi
            disponibilă în curând atât în App Store, cât și în Google Play. Vei
            putea solicita oferte, programa vizite la service și evalua
            experiența ta direct de pe telefon, într-un mod simplu și rapid.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
            <a 
              href="#"
              aria-label="Descarcă din App Store"
              className="w-48 sm:w-auto transform hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <img
                src="https://i.ibb.co/VwQc4DZ/car-service-app-apple-store.png"
                alt="Buton App Store"
                className="h-14 sm:h-16 w-auto drop-shadow-md"
                loading="lazy"
                width={180}
                height={60}
              />
            </a>
            <a 
              href="#"
              aria-label="Descarcă din Google Play"
              className="w-48 sm:w-auto transform hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <img
                src="https://i.ibb.co/hHgSnK7/car-service-app-googleplay-store.png"
                alt="Buton Google Play"
                className="h-14 sm:h-16 w-auto drop-shadow-md"
                loading="lazy"
                width={180}
                height={60}
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}