import React, { useRef } from "react";
import { useScroll, motion, useTransform } from "framer-motion";

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
    <div ref={ref} style={{ position: "relative" }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}