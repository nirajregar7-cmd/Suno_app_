import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 4200), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-start pl-[15vw]"
      initial={{ opacity: 0, x: '10vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-10vw', filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      
      <div className="relative z-10 max-w-[40vw]">
        <motion.div 
          className="h-1 w-24 bg-primary mb-8"
          initial={{ width: 0 }}
          animate={phase >= 1 ? { width: 96 } : { width: 0 }}
          transition={{ duration: 0.6, ease: "circOut" }}
        />

        <motion.h2 
          className="text-[5vw] font-display text-text-inverse leading-[1.1] mb-8"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          100% Anonymous.
          <br/>
          <span className="text-secondary italic">No judgments.</span>
        </motion.h2>

        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[
            "No real name needed.",
            "End-to-end encrypted.",
            "Just a nickname and you."
          ].map((text, i) => (
            <motion.div 
              key={i}
              className="flex items-center gap-4 text-[1.8vw] text-text-muted"
              initial={{ opacity: 0, x: -20 }}
              animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: i * 0.2 + 0.2, duration: 0.5 }}
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <p>{text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Decorative abstract elements on the right */}
      <motion.div 
        className="absolute right-[15vw] top-1/2 -translate-y-1/2 w-[30vw] h-[30vw] rounded-full border border-primary/20 flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1, rotate: 180 } : { scale: 0.8, opacity: 0, rotate: 0 }}
        transition={{ duration: 20, ease: "linear" }}
      >
        <motion.div className="w-full h-[1px] bg-primary/20" />
        <motion.div className="absolute w-[1px] h-full bg-primary/20" />
      </motion.div>

    </motion.div>
  );
}
