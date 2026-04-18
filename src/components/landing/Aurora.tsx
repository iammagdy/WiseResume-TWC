import { useEffect, useMemo, useRef, useState } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import './Aurora.css';

/* Phase 2: feature-detect WebGL once before instantiating ogl's Renderer
   so we can render a CSS gradient fallback instead of letting the browser
   log "unable to create webgl context" on devices without WebGL2. */
let _webglSupportCache: boolean | null = null;
const detectWebGL = (): boolean => {
  if (_webglSupportCache !== null) return _webglSupportCache;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    /* Renderer is created with `webgl: 2`, so we must probe WebGL2
       specifically — a WebGL1-only device must use the CSS fallback. */
    const gl = canvas.getContext('webgl2');
    _webglSupportCache = !!gl;
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    _webglSupportCache = false;
  }
  return _webglSupportCache;
};

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [1, 1, 1];
};

interface AuroraProps {
  colorStops?: string[];
  blend?: number;
  amplitude?: number;
  speed?: number;
}

export default function Aurora(props: AuroraProps) {
  const {
    colorStops = ['#5227FF', '#7cff67', '#5227FF'],
    amplitude = 1.0,
    blend = 0.5,
  } = props;

  const propsRef = useRef(props);
  propsRef.current = props;

  const ctnDom = useRef<HTMLDivElement>(null);
  const [hasWebGL] = useState(detectWebGL);

  /* CSS gradient fallback when WebGL is unavailable. Uses the same
     colorStops so the visual brand still reads. */
  const fallbackBg = useMemo(() => {
    const [a = '#5227FF', b = '#7cff67', c = '#5227FF'] = colorStops;
    return `radial-gradient(ellipse 80% 60% at 20% 30%, ${a}26 0%, transparent 60%),
            radial-gradient(ellipse 70% 50% at 80% 70%, ${c}26 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 50% 50%, ${b}1f 0%, transparent 70%)`;
  }, [colorStops]);

  useEffect(() => {
    if (!hasWebGL) return;
    const ctn = ctnDom.current;
    if (!ctn) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        webgl: 2,
      } as ConstructorParameters<typeof Renderer>[0]);
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    (gl.canvas as HTMLCanvasElement).style.backgroundColor = 'transparent';

    let program: Program;

    const resize = () => {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        (program.uniforms as Record<string, { value: unknown }>).uResolution.value = [width, height];
      }
    };
    window.addEventListener('resize', resize);

    const geometry = new Triangle(gl);
    if ((geometry.attributes as Record<string, unknown>).uv) {
      delete (geometry.attributes as Record<string, unknown>).uv;
    }

    const colorStopsArray = colorStops.map(hexToRgb);

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      const { time = t * 0.01, speed = 1.0 } = propsRef.current as AuroraProps & { time?: number };
      const uniforms = program.uniforms as Record<string, { value: unknown }>;
      uniforms.uTime.value = time * speed * 0.1;
      uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
      uniforms.uBlend.value = propsRef.current.blend ?? blend;
      const stops = propsRef.current.colorStops ?? colorStops;
      uniforms.uColorStops.value = stops.map(hexToRgb);
      renderer.render({ scene: mesh });
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener('resize', resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amplitude, hasWebGL]);

  if (!hasWebGL) {
    return (
      <div
        className="aurora-container"
        aria-hidden="true"
        style={{ background: fallbackBg }}
      />
    );
  }
  return <div ref={ctnDom} className="aurora-container" />;
}
