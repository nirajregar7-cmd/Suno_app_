import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  open: 4000,
  concept: 5000,
  features: 6000,
  emotion: 4500,
  close: 5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  concept: Scene2,
  features: Scene3,
  emotion: Scene4,
  close: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-dark text-text-inverse">
      {/* Background layer - persistent */}
      <div className="absolute inset-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          src={`${import.meta.env.BASE_URL}videos/bg-warm-light.mp4`}
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{ background: 'linear-gradient(to right, #D96C4A, #F2B04E)' }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
            x: ['-5%', '5%', '-5%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating texture elements */}
        <motion.div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/texture.png)`,
            backgroundSize: '400px',
            backgroundPosition: 'center',
          }}
          animate={{
            y: ['0%', '-10%', '0%'],
            rotate: [0, 2, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Foreground / Scene content */}
      <AnimatePresence mode="sync">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
