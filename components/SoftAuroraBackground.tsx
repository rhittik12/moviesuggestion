"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution.xy;
    p.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.15;
    float wave1 = sin(p.x * 2.0 + t) * 0.5 + 0.5;
    float wave2 = sin(p.y * 3.0 - t * 1.5 + wave1) * 0.5 + 0.5;
    float wave3 = sin((p.x + p.y) * 2.0 + t + wave2 * 2.0) * 0.5 + 0.5;

    vec3 bg = vec3(0.01, 0.02, 0.04);
    vec3 auroraMain = vec3(0.894, 0.867, 0.941);
    vec3 auroraSec = vec3(0.831, 0.796, 0.898);
    vec3 auroraAccent = vec3(0.612, 0.557, 0.722);

    vec3 currentLayer = mix(auroraMain, auroraSec, wave1);
    currentLayer = mix(currentLayer, auroraAccent, wave2);

    float mask = smoothstep(0.4, 0.6, wave3);
    mask *= sin(p.y * 3.14) * 1.2;
    mask = clamp(mask, 0.0, 1.0);

    vec3 finalColor = mix(bg, currentLayer, mask * 0.4);
    finalColor += auroraMain * smoothstep(0.7, 1.0, wave2) * 0.2;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function SoftAuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl");
    if (!canvas || !gl) return;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ]);
    const buffer = gl.createBuffer();
    const positionLocation = gl.getAttribLocation(program, "position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    if (!buffer || positionLocation < 0 || !timeLocation || !resolutionLocation) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    };

    const startTime = performance.now();
    let animationFrameId = 0;
    const render = (time: number) => {
      gl.uniform1f(timeLocation, (time - startTime) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}