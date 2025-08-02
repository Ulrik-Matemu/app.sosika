import { motion } from "framer-motion";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="w-full h-full"
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1], // easeOutExpo style
      }}
    >
      {children}
    </motion.div>
  );
}
