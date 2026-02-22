export const milkyWayVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const milkyWayFragmentShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

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
  m = m * m; m = m * m;
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
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    v += a * snoise(p); p *= 2.0; a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  // Galactic plane band
  float galacticPlane = smoothstep(0.3, 0.5, 1.0 - abs(uv.y - 0.5) * 2.0);

  // Spiral structure
  float angle = atan(uv.x - 0.5, uv.y - 0.5);
  float radius = length(uv - 0.5);
  float spiral = fbm(vec2(angle * 2.0 + radius * 10.0, radius * 5.0), 3);

  // Galactic bulge
  float bulge = exp(-length(uv - 0.5) * 8.0) * 0.2;

  // Dust
  float dust = fbm(uv * 10.0, 4) * galacticPlane;

  // Emission nebulae
  float emission = step(0.75, fbm(uv * 15.0, 3)) * 0.3;
  vec3 emissionColor = vec3(1.0, 0.3, 0.5);

  // Reflection nebulae
  float reflection = step(0.8, fbm(uv * 12.0, 3)) * 0.2;
  vec3 reflectionColor = vec3(0.3, 0.5, 1.0);

  // Background stars
  float bgStars = step(0.98, fbm(uv * 200.0, 1)) * 0.5;

  vec3 color = vec3(0.005, 0.005, 0.012);
  color += vec3(0.15, 0.15, 0.2) * galacticPlane * (spiral * 0.2 + 0.08);
  color += vec3(0.4, 0.35, 0.25) * bulge * 0.4;
  color *= mix(1.0, 0.5, dust);
  color += emissionColor * emission * 0.4;
  color += reflectionColor * reflection * 0.3;
  color += vec3(1.0) * bgStars * 0.6;

  gl_FragColor = vec4(color, 1.0);
}
`;
