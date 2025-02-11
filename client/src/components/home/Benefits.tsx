
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900">
            De ce să alegi CARVIZIO?
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Platforma care conectează șoferii cu service-urile auto de încredere
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
              <ArrowRight className="h-8 w-8 text-[#00aff5]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Economisești timp
            </h3>
            <p className="text-gray-600">
              Nu mai pierde timp căutând și sunând la service-uri. Trimite o
              singură solicitare și primești rapid mai multe oferte.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
              <ArrowRight className="h-8 w-8 text-[#00aff5]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Service-uri verificate
            </h3>
            <p className="text-gray-600">
              Colaborăm doar cu service-uri auto verificate și cu recenzii bune,
              pentru a-ți oferi cele mai bune servicii.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6">
              <ArrowRight className="h-8 w-8 text-[#00aff5]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Prețuri competitive
            </h3>
            <p className="text-gray-600">
              Compară mai multe oferte și alege cea mai bună variantă pentru tine,
              în funcție de preț și recenzii.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
