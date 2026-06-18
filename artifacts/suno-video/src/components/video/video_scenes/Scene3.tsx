import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 5200), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      
      <div className="relative z-10 w-full px-[15vw] flex items-center justify-between">
        
        {/* Left side visuals */}
        <div className="relative w-[30vw] h-[40vw]">
          <motion.div 
            className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/30 backdrop-blur-sm flex flex-col p-8 justify-center gap-6"
            initial={{ opacity: 0, x: -50, rotateY: 20 }}
            animate={phase >= 1 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -50, rotateY: 20 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
             {['Relationships', 'Career Stress', 'Mental Health'].map((topic, i) => (
                <motion.div 
                  key={topic}
                  className="bg-bg-dark/50 px-6 py-4 rounded-xl border border-white/5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ delay: i * 0.15 + 0.2 }}
                >
                  <p className="text-[1.5vw] text-secondary">{topic}</p>
                </motion.div>
             ))}
          </motion.div>
        </div>

        {/* Right side content */}
        <div className="max-w-[40vw]">
          <motion.h2 
            className="text-[4.5vw] font-display text-text-inverse leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 40 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Real humans.
            <br/>
            <span className="text-primary italic">No bots.</span>
          </motion.h2>

          <motion.p
            className="text-[2vw] text-text-muted leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            Voice-verified peer matching ensures you talk to someone real. AI-moderated rooms keep the space safe.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
