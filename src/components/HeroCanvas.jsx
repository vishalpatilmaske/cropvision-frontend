import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroCanvas() {
  const canvasRef = useRef(null);
  const visualRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const visual = canvas?.closest(".visual");
    if (!canvas || !visual) return undefined;

    visualRef.current = visual;

    let cancelled = false;
    let teardown = null;

    // Deferred by one animation frame and cancellable: React 18 StrictMode
    // double-invokes this effect synchronously in dev (mount -> cleanup ->
    // mount again, same canvas element), and creating a WebGLRenderer
    // immediately on mount races with the context teardown from that first
    // cleanup, intermittently leaving the canvas blank. Deferring means the
    // first (StrictMode-only) mount's setup never actually runs -- its
    // cleanup cancels the pending frame before the canvas is ever touched.
    const setupFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      teardown = setupScene();
    });

    function setupScene() {
      let width = visual.clientWidth;
      let height = visual.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 22;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      } catch {
        return undefined;
      }
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const group = new THREE.Group();
      scene.add(group);

      const palette = [0x66bb6a, 0xa5d6a7, 0x1b5e20, 0xe8f5e9];
      const particles = [];
      const COUNT = 34;

      for (let i = 0; i < COUNT; i++) {
        const pick = Math.random();
        let geometry;
        if (pick < 0.4) geometry = new THREE.IcosahedronGeometry(0.5 + Math.random() * 0.6, 0);
        else if (pick < 0.75) geometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.45, 12, 12);
        else geometry = new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.55, 0);

        const material = new THREE.MeshStandardMaterial({
          color: palette[Math.floor(Math.random() * palette.length)],
          roughness: 0.55,
          metalness: 0.05,
          transparent: true,
          opacity: 0.5 + Math.random() * 0.35,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        group.add(mesh);

        particles.push({
          mesh,
          baseY: mesh.position.y,
          speed: 0.2 + Math.random() * 0.5,
          offset: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.01,
        });
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(5, 8, 10);
      scene.add(dirLight);

      let mouseX = 0;
      let mouseY = 0;
      function onMouseMove(e) {
        const rect = visual.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
      visual.addEventListener("mousemove", onMouseMove);

      function onResize() {
        width = visual.clientWidth;
        height = visual.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      let frameId;
      function animate() {
        frameId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        particles.forEach((p) => {
          p.mesh.position.y = p.baseY + Math.sin(t * p.speed + p.offset) * 0.9;
          p.mesh.rotation.x += p.rotSpeed;
          p.mesh.rotation.y += p.rotSpeed * 1.3;
        });

        group.rotation.y += (mouseX * 0.18 - group.rotation.y) * 0.03;
        group.rotation.x += (mouseY * 0.1 - group.rotation.x) * 0.03;

        renderer.render(scene, camera);
      }
      animate();

      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", onResize);
        visual.removeEventListener("mousemove", onMouseMove);
        particles.forEach((p) => {
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        });
        renderer.dispose();
        renderer.forceContextLoss();
      };
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(setupFrame);
      teardown?.();
    };
  }, []);

  return <canvas id="heroCanvas" ref={canvasRef} />;
}
