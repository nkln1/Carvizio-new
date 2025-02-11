export default function AppPreview() {
  return (
    <section className="relative py-20 bg-gradient-to-r from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center">
        {/* Imaginea cu telefon */}
        <div className="md:w-1/2 flex justify-center mb-10 md:mb-0 md:pr-10">
          <img
            src="https://i.ibb.co/yYYRCCC/app.png"
            alt="Mobile App Preview"
            className="max-h-96 drop-shadow-lg transform hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Textul explicativ */}
        <div className="md:w-1/2 text-center md:text-left">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Aplicația Mobilă
            <br className="hidden sm:block" />
            <span className="text-[#00aff5]">Vine în Curând!</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 mb-6 leading-relaxed">
            Lucrăm intens la dezvoltarea aplicației noastre mobile, care va fi
            disponibilă în curând atât în App Store, cât și în Google Play. Vei
            putea solicita oferte, programa vizite la service și evalua
            experiența ta direct de pe telefon, într-un mod simplu și rapid.
          </p>
          <div className="flex flex-col sm:flex-row items-center sm:items-start sm:space-x-4 space-y-4 sm:space-y-0">
            <img
              src="https://i.ibb.co/VwQc4DZ/car-service-app-apple-store.png"
              alt="App Store Badge"
              className="h-16 drop-shadow-md transform hover:scale-105 transition-transform duration-300"
            />
            <img
              src="https://i.ibb.co/hHgSnK7/car-service-app-googleplay-store.png"
              alt="Google Play Badge"
              className="h-16 drop-shadow-md transform hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
