import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface ParallaxWrapperProps {
  children: React.ReactNode;
  offset?: number;
}

export function ParallaxWrapper({ children, offset = 50 }: ParallaxWrapperProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <motion.div ref={ref} style={{ y }}>
      {children}
    </motion.div>
  );
}
