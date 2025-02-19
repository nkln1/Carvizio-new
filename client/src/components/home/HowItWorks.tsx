import { Users, Wrench, Clock, Star } from "lucide-react";

const steps = [
  {
    icon: Users,
    title: "Create Account",
    desc: "Create an account in a minute or login with your Google account",
  },
  {
    icon: Wrench,
    title: "Send Request",
    desc: "Fill in your car details and describe the type of repair needed/revision/inspection",
  },
  {
    icon: Clock,
    title: "Receive Offers",
    desc: "Get offers from auto services in your area",
  },
  {
    icon: Star,
    title: "Choose, Schedule and Review",
    desc: "Choose the offer that suits you, schedule the visit and later leave a review for the auto service",
  },
];

export default function HowItWorks() {
  return (
    <div id="how-it-works" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            How it works:
          </h2>
          <p className="mt-4 text-lg text-gray-600 font-sans">
            Follow these simple steps to find the best offers.
          </p>
        </div>
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative text-center p-6 bg-white rounded-lg shadow-md 
                          hover:shadow-xl hover:scale-105 hover:-translate-y-1
                          transition-all duration-300 ease-in-out
                          group cursor-pointer"
              >
                <div className="flex items-center justify-center h-16 w-16 rounded-full 
                              bg-blue-100 mx-auto
                              group-hover:bg-[#00aff5] transition-colors duration-300">
                  <step.icon className="h-8 w-8 text-[#00aff5] 
                                      group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900 
                              group-hover:text-[#00aff5] transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="mt-4 text-base text-gray-600 font-sans 
                              group-hover:text-gray-800 transition-colors duration-300">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}