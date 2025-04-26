import { motion } from "framer-motion";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
    return (
      <motion.div
        className="w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    );
  }