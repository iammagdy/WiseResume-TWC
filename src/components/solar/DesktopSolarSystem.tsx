import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import {
  Vector3,
  Color,
  ShaderMaterial,
  SphereGeometry,
  IcosahedronGeometry,
  BackSide,
  AdditiveBlending,
  DoubleSide,
  TorusGeometry,
  InstancedMesh,
  Matrix4 as ThreeMatrix4,
  Float32BufferAttribute,
  BufferGeometry,
  PointsMaterial,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import wiseAiLogo from '@/assets/wise-ai-logo.png';
import { WiseAIModal } from './WiseAIModal';
import { sunVertexShader } from './shaders/sunVertex.glsl';
import { sunFragmentShader } from './shaders/sunFragment.glsl';
import { coronaVertexShader, coronaFragmentShader } from './shaders/corona.glsl';
import { milkyWayVertexShader, milkyWayFragmentShader } from './shaders/milkyWay.glsl';

// ────── Sun ──────
function Sun({ onClick }: { onClick: () => void }) {
  const meshRef = useRef<any>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const sunMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sunVertexShader,
        fragmentShader: sunFragmentShader,
        uniforms: { uTime: { value: 0 } },
      }),
    []
  );

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group onClick={onClick}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <primitive object={sunMaterial} ref={materialRef} attach="material" />
      </mesh>
      {/* Corona shells */}
      {[1.7, 1.85, 2.0].map((scale, i) => (
        <CoronaShell key={i} scale={scale} opacity={0.15 - i * 0.03} />
      ))}
      {/* Point light from sun */}
      <pointLight intensity={3} color="#ffb74d" distance={50} />
    </group>
  );
}

function CoronaShell({ scale, opacity }: { scale: number; opacity: number }) {
  const matRef = useRef<ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: opacity } },
        transparent: true,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      }),
    [opacity]
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}

// ────── Orbit Ring ──────
function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.005, 8, 128]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
    </mesh>
  );
}

// ────── Planet ──────
interface PlanetConfig {
  name: string;
  orbitRadius: number;
  speed: number;
  size: number;
  color: string;
  locked: boolean;
}

const PLANETS: PlanetConfig[] = [
  { name: 'WiseResume', orbitRadius: 4, speed: 0.2, size: 0.5, color: '#4a9eff', locked: false },
  { name: 'PDF Tools', orbitRadius: 6, speed: 0.12, size: 0.35, color: '#666666', locked: true },
  { name: 'Finance', orbitRadius: 8, speed: 0.08, size: 0.35, color: '#666666', locked: true },
];

function Planet({
  config,
  onClick,
}: {
  config: PlanetConfig;
  onClick: () => void;
}) {
  const groupRef = useRef<any>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    angleRef.current += delta * config.speed;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * config.orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * config.orbitRadius;
    }
  });

  return (
    <group ref={groupRef} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[config.size, 32, 32]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.locked ? '#000000' : config.color}
          emissiveIntensity={config.locked ? 0 : 0.3}
          roughness={config.locked ? 0.9 : 0.5}
          metalness={config.locked ? 0.2 : 0.4}
        />
      </mesh>
      {/* Atmosphere rim for unlocked */}
      {!config.locked && (
        <mesh scale={1.15}>
          <sphereGeometry args={[config.size, 16, 16]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.1} side={BackSide} />
        </mesh>
      )}
    </group>
  );
}

// ────── Starfield ──────
function Starfield() {
  const geo = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const spectralColors = [
      { threshold: 0.03, color: new Color('#9bb0ff') },
      { threshold: 0.10, color: new Color('#cad7ff') },
      { threshold: 0.20, color: new Color('#f8f7ff') },
      { threshold: 0.45, color: new Color('#fff4e8') },
      { threshold: 0.65, color: new Color('#ffd2a1') },
      { threshold: 1.0, color: new Color('#ffcc6f') },
    ];

    for (let i = 0; i < count; i++) {
      const radius = 50 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const rand = Math.random();
      const sc = spectralColors.find((s) => rand < s.threshold)!;
      colors[i * 3] = sc.color.r;
      colors[i * 3 + 1] = sc.color.g;
      colors[i * 3 + 2] = sc.color.b;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geometry;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.25} vertexColors transparent opacity={1.0} sizeAttenuation />
    </points>
  );
}

// ────── Milky Way Background ──────
function MilkyWayBackground() {
  const matRef = useRef<ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: milkyWayVertexShader,
        fragmentShader: milkyWayFragmentShader,
        uniforms: { uTime: { value: 0 } },
        side: BackSide,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh>
      <sphereGeometry args={[150, 32, 32]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}

// ────── Asteroid Belt ──────
function AsteroidBelt() {
  const meshRef = useRef<InstancedMesh>(null);
  const count = 250;

  const geometry = useMemo(() => {
    const geo = new IcosahedronGeometry(0.04, 0);
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const scale = 0.7 + Math.random() * 0.6;
      pos[i] *= scale;
      pos[i + 1] *= scale;
      pos[i + 2] *= scale;
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const matrix = new ThreeMatrix4();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 9.5 + (Math.random() - 0.5) * 1.5;
      const y = (Math.random() - 0.5) * 0.3;
      matrix.makeTranslation(Math.cos(angle) * r, y, Math.sin(angle) * r);
      meshRef.current.setMatrixAt(i, matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial color="#888888" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

// ────── Camera fly-to controller ──────
function CameraController({ target }: { target: Vector3 | null }) {
  const controlsRef = useRef<any>(null);

  useFrame(({ camera }, delta) => {
    if (!target || !controlsRef.current) return;
    const t = 1 - Math.pow(0.001, delta * 0.5);
    camera.position.lerp(target, t);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom
      minDistance={3}
      maxDistance={30}
      dampingFactor={0.04}
      rotateSpeed={0.4}
      zoomSpeed={0.6}
      makeDefault
    />
  );
}

// ────── Labels (HTML overlay) ──────
function PlanetLabels({ planets }: { planets: PlanetConfig[] }) {
  // We'll render labels via HTML overlay instead of drei Html to avoid bundle issues
  return null;
}

// ────── Scene ──────
function Scene({
  onSunClick,
  onPlanetClick,
}: {
  onSunClick: () => void;
  onPlanetClick: (name: string) => void;
}) {
  const [cameraTarget, setCameraTarget] = useState<Vector3 | null>(null);

  const handleSunClick = useCallback(() => {
    setCameraTarget(new Vector3(0, 2, 5));
    onSunClick();
  }, [onSunClick]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <Sun onClick={handleSunClick} />
      {PLANETS.map((p) => (
        <Planet
          key={p.name}
          config={p}
          onClick={() => {
            onPlanetClick(p.name);
          }}
        />
      ))}
      {PLANETS.map((p) => (
        <OrbitRing key={`ring-${p.name}`} radius={p.orbitRadius} />
      ))}
      <Starfield />
      <MilkyWayBackground />
      <AsteroidBelt />
      <CameraController target={cameraTarget} />
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette darkness={0.5} offset={0.3} />
      </EffectComposer>
    </>
  );
}

// ────── Main Desktop Component ──────
export default function DesktopSolarSystem() {
  const navigate = useNavigate();
  const [wiseAIOpen, setWiseAIOpen] = useState(false);
  const [frameloop, setFrameloop] = useState<'always' | 'demand'>('always');
  const [contextLost, setContextLost] = useState(false);

  // Frame throttling after idle
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      setFrameloop('always');
      clearTimeout(timeout);
      timeout = setTimeout(() => setFrameloop('demand'), 5000);
    };
    window.addEventListener('pointermove', resetIdle);
    window.addEventListener('pointerdown', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('pointermove', resetIdle);
      window.removeEventListener('pointerdown', resetIdle);
      clearTimeout(timeout);
    };
  }, []);

  // Visibility API
  useEffect(() => {
    const handle = () => setFrameloop(document.hidden ? 'demand' : 'always');
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  const handlePlanetClick = useCallback(
    (name: string) => {
      if (name === 'WiseResume') {
        navigate('/home');
      } else {
        toast('Coming Soon', { description: `${name} is still in development` });
      }
    },
    [navigate]
  );

  return (
    <div className="fixed inset-0" style={{ background: 'hsl(240 20% 2%)' }}>
      {!contextLost && (
        <Canvas
          frameloop={frameloop}
          dpr={[1, 1.5]}
          camera={{ position: [0, 5, 15], fov: 50, near: 0.1, far: 200 }}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.outputColorSpace = SRGBColorSpace;

            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            canvas.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <Scene onSunClick={() => setWiseAIOpen(true)} onPlanetClick={handlePlanetClick} />
        </Canvas>
      )}

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
          WebGL context lost. Move your mouse to restore.
        </div>
      )}

      {/* Header overlay */}
      <div className="absolute top-0 left-0 z-20 flex items-center gap-3 p-6">
        <img src={wiseAiLogo} alt="Wise AI" className="w-10 h-10 object-contain" />
        <div>
          <p className="text-white/90 text-base font-display font-bold tracking-wider">WISE AI</p>
          <p className="text-white/40 text-xs tracking-wide">Your universe of intelligent tools</p>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-6 left-0 right-0 z-20 text-center">
        <p className="text-white/25 text-xs tracking-wider">
          Click the sun or planets to explore
        </p>
      </div>

      <WiseAIModal open={wiseAIOpen} onOpenChange={setWiseAIOpen} />
    </div>
  );
}
