import { motion } from "framer-motion";
import React from "react";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="w-full h-full min-h-screen bg-[#0a0a0b]"
      initial={{ opacity: 0.98 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.98 }}
      transition={{
        duration: 0.12,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
