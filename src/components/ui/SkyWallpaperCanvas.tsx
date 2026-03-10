import { useRef, useEffect, useState, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Cloud, Clouds, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Camera parallax on mouse move ──────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReducedMotion) return;
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((_, delta) => {
    if (prefersReducedMotion) return;
    camera.rotation.y = THREE.MathUtils.lerp(
      camera.rotation.y,
      -(mouse.current.x * Math.PI) / 90,
      0.05
    );
    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      -(mouse.current.y * Math.PI) / 180,
      0.03
    );
  });

  return null;
}

// ─── Cloud group ────────────────────────────────────────────────────────────

const CloudScene = memo(() => (
  <group position={[0, -25, 5.69]}>
    <Clouds material={THREE.MeshBasicMaterial} position={[0, -5, 0]} frustumCulled={false}>
      <Cloud seed={1} segments={1} concentrate="inside" bounds={[10, 10, 10]} growth={3} position={[-1, 0, 0]} smallestVolume={2} scale={1.9} volume={2} speed={0.2} fade={5} />
      <Cloud seed={3} segments={1} concentrate="outside" bounds={[10, 10, 10]} growth={2} position={[2, 0, 2]} smallestVolume={2} scale={1} volume={2} fade={3} speed={0.1} />
      <Cloud seed={4} segments={1} concentrate="outside" bounds={[10, 20, 15]} growth={4} position={[-10, -10, 4]} smallestVolume={2} scale={2} speed={0.2} volume={3} />
      <Cloud seed={5} segments={1} concentrate="outside" bounds={[5, 5, 5]} growth={2} position={[6, -3, 8]} smallestVolume={2} scale={2} volume={2} fade={0.1} speed={0.1} />
    </Clouds>
  </group>
));
CloudScene.displayName = 'CloudScene';

// ─── Loading fade-in controller ─────────────────────────────────────────────

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

// ─── Main desktop canvas ────────────────────────────────────────────────────

interface DesktopCanvasProps {
  isDark: boolean;
}

function DesktopCanvas({ isDark }: DesktopCanvasProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={canvasWrapperRef}
      style={{
        position: 'absolute',
        inset: '1rem',
        width: 'calc(100% - 2rem)',
        height: 'calc(100% - 2rem)',
        opacity: 0,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <LoadingFade canvasRef={canvasWrapperRef} />
        <CameraRig />
        {isDark && (
          <Stars
            radius={200}
            depth={100}
            count={5000}
            factor={10}
            saturation={10}
            fade
            speed={prefersReducedMotion ? 0 : 1}
          />
        )}
        <CloudScene />
      </Canvas>
    </div>
  );
}

export default DesktopCanvas;
