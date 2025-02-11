import { motion } from "framer-motion";
import { Shield, Search, Clock, CreditCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Smart Search",
    description:
      "Advanced filters and AI-powered recommendations to find your perfect car match.",
  },
  {
    icon: Shield,
    title: "Secure Transactions",
    description:
      "End-to-end encrypted payments and verified sellers for your peace of mind.",
  },
  {
    icon: Clock,
    title: "Time Saving",
    description:
      "Compare cars, prices, and dealers all in one place - saving you valuable time.",
  },
  {
    icon: CreditCard,
    title: "Flexible Financing",
    description:
      "Multiple financing options and instant approval for qualified buyers.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose Carvizio?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We provide the most comprehensive and reliable car buying platform with
            features designed for your success.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
