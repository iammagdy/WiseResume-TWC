export const sunFragmentShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simple hash-based noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float limb = dot(vNormal, viewDir);
  float limbDarken = smoothstep(0.0, 1.0, limb);

  // Granulation cells
  float cells = snoise(vUv * 15.0 + uTime * 0.02);

  // Turbulence
  float turbulence = fbm(vUv * 8.0 + uTime * 0.05, 5) * 0.5 + 0.5;

  // Sunspots
  float spotNoise = snoise(vUv * 20.0 + vec2(uTime * 0.01));
  float spots = smoothstep(0.65, 0.75, spotNoise);

  // Color gradient
  vec3 coreColor = vec3(1.0, 0.973, 0.882);
  vec3 midColor = vec3(1.0, 0.718, 0.314);
  vec3 edgeColor = vec3(1.0, 0.427, 0.0);

  vec3 color = mix(coreColor, midColor, 1.0 - limbDarken);
  color = mix(color, edgeColor, pow(1.0 - limbDarken, 2.0));
  color *= mix(0.85, 1.0, turbulence);
  color *= mix(1.0, 0.5, spots);
  color += cells * 0.03;

  gl_FragColor = vec4(color, 1.0);
}
`;
