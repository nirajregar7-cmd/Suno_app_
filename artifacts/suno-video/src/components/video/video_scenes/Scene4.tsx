import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3700), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "linear" }}
    >
      
      {/* Background Image scaling up slowly */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/community.png`}
        className="absolute w-[60vw] h-auto object-contain opacity-40 mix-blend-screen"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1.1, opacity: 0.4 } : { scale: 0.9, opacity: 0 }}
        transition={{ duration: 4, ease: "easeOut" }}
      />

      <div className="relative z-10 text-center">
        <motion.h2 
          className="text-[6vw] font-display text-secondary leading-tight"
          initial={{ opacity: 0, y: 50, rotateX: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Like a friend
          <br/>
          who <span className="text-primary italic">listens.</span>
        </motion.h2>

        <motion.p
          className="text-[2vw] text-text-muted mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Without judgment.
        </motion.p>
      </div>

    </motion.div>
  );
}
