import { useRef, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Cloud, Clouds, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Camera setup: position above + behind, look down at cloud layer ────────

function CameraSetup({ isMobile }: { isMobile: boolean }) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const baseY = 8;

  useEffect(() => {
    camera.position.set(0, baseY, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Scroll parallax — clouds rise as user scrolls
  useEffect(() => {
    if (prefersReducedMotion) return;
    const onScroll = () => {
      const offset = window.scrollY * 0.005;
      camera.position.y = baseY - offset;
      camera.lookAt(0, 0, 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [camera]);

  // Mouse parallax (desktop only)
  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isMobile]);

  useFrame(() => {
    if (prefersReducedMotion || isMobile) return;
    const targetRotY = -(mouse.current.x * Math.PI) / 90;
    const targetRotX = camera.rotation.x; // preserve lookAt tilt
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.05);
  });

  return null;
}

// ─── Cloud layer — flat at Y=0, spread on X/Z ──────────────────────────────

const CloudScene = memo(() => (
  <group position={[0, 0, 0]}>
    <Clouds material={THREE.MeshBasicMaterial} frustumCulled={false} opacity={0.6}>
      <Cloud seed={1} segments={40} bounds={[15, 1, 8]} volume={6} color="white" fade={30} speed={0.2} growth={4} />
      <Cloud seed={2} segments={30} bounds={[12, 1, 6]} volume={5} color="white" fade={25} speed={0.15} growth={3} position={[5, 0, 2]} />
      <Cloud seed={3} segments={35} bounds={[10, 1, 7]} volume={5} color="white" fade={20} speed={0.18} growth={3} position={[-6, 0, 1]} />
    </Clouds>
  </group>
));
CloudScene.displayName = 'CloudScene';

// ─── Loading fade-in ────────────────────────────────────────────────────────

function LoadingFade({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const { progress } = useProgress();
  const faded = useRef(false);

  useEffect(() => {
    if (progress >= 100 && !faded.current && canvasRef.current) {
      faded.current = true;
      gsap.to(canvasRef.current, {
        opacity: 1,
        duration: 3,
        delay: 1,
        ease: 'power2.out',
      });
    }
  }, [progress, canvasRef]);

  return null;
}

// ─── Main component ─────────────────────────────────────────────────────────

interface DesktopCanvasProps {
  isDark: boolean;
  isMobile: boolean;
}

function DesktopCanvas({ isDark, isMobile }: DesktopCanvasProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={canvasWrapperRef}
      style={{
        position: 'absolute',
        inset: isMobile ? 0 : '1rem',
        width: isMobile ? '100%' : 'calc(100% - 2rem)',
        height: isMobile ? '100%' : 'calc(100% - 2rem)',
        opacity: 0,
        borderRadius: isMobile ? 0 : '8px',
        overflow: 'hidden',
      }}
    >
      {/* Bottom shadow overlay for readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      <Canvas
        camera={{ position: [0, 8, 12], fov: 60 }}
        dpr={isMobile ? [1, 1] : [1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <LoadingFade canvasRef={canvasWrapperRef} />
        <CameraSetup isMobile={isMobile} />
        <Stars
          radius={200}
          depth={60}
          count={isDark ? 4000 : 0}
          factor={6}
          saturation={0}
          fade
          speed={prefersReducedMotion ? 0 : 0.5}
        />
        <CloudScene />
      </Canvas>
    </div>
  );
}

export default DesktopCanvas;
