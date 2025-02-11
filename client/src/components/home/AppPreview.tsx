import { motion } from "framer-motion";

export default function AppPreview() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
              Descarcă aplicația CARVIZIO
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Ai toate funcționalitățile în buzunar. Gestionează programările,
              primește notificări și găsește service-uri auto oriunde te-ai afla.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                href="#"
                className="inline-block transform transition-transform hover:scale-105"
              >
                <img
                  src="https://i.ibb.co/q7Pt0Hh/google-play.png"
                  alt="Get it on Google Play"
                  className="h-14"
                />
              </a>
              <a
                href="#"
                className="inline-block transform transition-transform hover:scale-105"
              >
                <img
                  src="https://i.ibb.co/tY4qnqX/app-store.png"
                  alt="Download on the App Store"
                  className="h-14"
                />
              </a>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img
              src="https://i.ibb.co/C2Bzt95/mockup.png"
              alt="CARVIZIO App Preview"
              className="w-full h-auto rounded-lg shadow-xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
