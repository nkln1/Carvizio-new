import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Cătălin A.",
    testimonial: "CARVIZIO mi-a economisit timp și bani! Am primit rapid cotații de preț și am ales cel mai bun service.",
    rating: 5,
    image: "https://i.ibb.co/kST9nRv/Catalin.jpg"
  },
  {
    name: "Alina A.",
    testimonial: "Aplicatia este super simplu de folosit și am găsit un service foarte bun în zona mea.",
    rating: 5,
    image: "https://i.ibb.co/1rhxnQ6/Alina.jpg"
  },
  {
    name: "Alexandru I.",
    testimonial: "Recomand CARVIZIO tuturor! Am găsit un service de încredere și am programat rapid o revizie.",
    rating: 5,
    image: "https://i.ibb.co/TgnCb33/Alexandru.jpg"
  },
  {
    name: "Maria D.",
    testimonial: "Am găsit rapid un service care m-a ajutat cu problema la mașină, la un preț corect. Serviciile sunt excelente și totul a fost transparent.",
    rating: 5,
    image: "https://i.ibb.co/Mgp43wv/Maria.jpg"
  }
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) return testimonials.length - 1;
      if (nextIndex >= testimonials.length) return 0;
      return nextIndex;
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-center text-gray-900 sm:text-5xl mb-12">
          Ce spun utilizatorii <span className="text-[#00aff5]">CARVIZIO</span>
        </h2>
        <div className="relative h-[400px] overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);

                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
              className="absolute w-full"
            >
              <div className="flex justify-center items-center h-full">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto transform transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-4">
                    <img
                      src={testimonials[currentIndex].image}
                      alt={testimonials[currentIndex].name}
                      className="h-16 w-16 rounded-full object-cover ring-4 ring-[#00aff5]"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {testimonials[currentIndex].name}
                      </h3>
                      <div className="flex items-center mt-1">
                        {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                          <svg
                            key={i}
                            className="h-5 w-5 text-yellow-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 15l-5.402 3.24 1.033-5.876L.61 6.83l5.977-.535L10 1l2.413 4.77 5.977.535-4.021 5.534 1.033 5.876L10 15z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-lg text-gray-600 italic">
                    "{testimonials[currentIndex].testimonial}"
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-all duration-200"
            onClick={() => paginate(-1)}
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 rounded-full p-2 hover:bg-white transition-all duration-200"
            onClick={() => paginate(1)}
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Dots Navigation */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex ? "bg-[#00aff5] w-4" : "bg-gray-300"
                }`}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1);
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
