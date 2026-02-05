export const MyceliumShaders = {
    vertex: `
    precision highp float;
    
    // Instanced attributes
    attribute vec3 instancePosition;
    attribute vec3 instanceColor;
    attribute float instanceScale;
    attribute float instancePhase;
    
    // Uniforms
    uniform float uTime;
    uniform float uHoverId; // ID of hovered instance (-1 if none)
    uniform float uSelectedId; // ID of selected instance (-1 if none)
    
    varying vec3 vColor;
    varying float vAlpha;
    varying vec2 vUv;
    varying float vIsHovered;
    
    void main() {
      vUv = uv;
      vColor = instanceColor;
      
      // Instance ID is strictly the instance index in the buffer
      float instanceId = float(gl_InstanceID);
      
      // Interaction State
      float hovered = (abs(uHoverId - instanceId) < 0.5) ? 1.0 : 0.0;
      float selected = (abs(uSelectedId - instanceId) < 0.5) ? 1.0 : 0.0;
      vIsHovered = max(hovered, selected);
      
      // Organic Breathing Animation
      // Use instancePhase to desynchronize the breathing
      float breath = sin(uTime * 1.5 + instancePhase) * 0.1 + 1.0;
      
      // Scale Calculation
      // If hovered/selected, scale up significantly
      float targetScale = instanceScale * breath;
      if (hovered > 0.5) targetScale *= 1.5;
      if (selected > 0.5) targetScale *= 1.8;
      
      // Position Calculation
      // Add subtle floating movement
      vec3 pos = position * targetScale;
      vec3 offset = instancePosition;
      
      // Dynamic Float
      offset.y += sin(uTime * 0.5 + instancePhase) * 0.2;
      offset.x += cos(uTime * 0.3 + instancePhase) * 0.1;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(offset + pos, 1.0);
      
      // Alpha/Opacity logic
      // Fade out distant nodes slightly
      vAlpha = 0.8 + hovered * 0.2;
    }
  `,

    fragment: `
    precision highp float;
    
    varying vec3 vColor;
    varying float vAlpha;
    varying vec2 vUv;
    varying float vIsHovered;
    
    uniform float uTime;
    
    void main() {
      // Circular Shape with Soft Edge
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      
      // Base circle mask
      // Smoothstep for soft anti-aliased edge
      float mask = 1.0 - smoothstep(0.4, 0.5, dist);
      
      if (mask < 0.01) discard;
      
      // Core Glow (The "Nucleus")
      float core = 1.0 - smoothstep(0.1, 0.3, dist);
      
      // Outer Glow Halo
      float halo = (1.0 - smoothstep(0.3, 0.5, dist)) * 0.5;
      
      // Combine
      vec3 finalColor = vColor;
      
      // Add "Magical" rim light if hovered
      if (vIsHovered > 0.5) {
        float rim = smoothstep(0.4, 0.5, dist) * smoothstep(0.5, 0.4, dist) * 10.0; // Rim effect
        finalColor += vec3(1.0, 1.0, 0.8) * rim * 0.5; // Gold rim
        finalColor = mix(finalColor, vec3(1.0), core * 0.5); // Brighter core
      } else {
        // Normal breathing glow
        finalColor += vColor * core * 0.5; // Add light to core
      }
      
      // Opacity calculation
      float alpha = mask * vAlpha;
      
      // Pulse alpha slightly over time
      alpha *= 0.9 + sin(uTime * 2.0) * 0.1;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};
