export const coronaVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const coronaFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float rim = 1.0 - abs(dot(vNormal, viewDir));
  float glow = pow(rim, 3.0) * uOpacity;
  
  // Animate with time
  float flicker = 0.9 + 0.1 * sin(uTime * 2.0 + vUv.x * 10.0);
  
  vec3 color = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.9, 0.5), rim);
  
  gl_FragColor = vec4(color, glow * flicker);
}
`;
