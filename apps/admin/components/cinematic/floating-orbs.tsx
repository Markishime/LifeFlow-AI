'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function Orb({ position, color, speed }: { position: [number, number, number]; color: string; speed: number }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.getElapsedTime() * speed;
      mesh.current.rotation.y = state.clock.getElapsedTime() * speed * 0.5;
    }
  });

  return (
    <Sphere ref={mesh} args={[1, 32, 32]} position={position}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.6}
        speed={1.5}
        roughness={0}
        metalness={0.5}
      />
    </Sphere>
  );
}

export default function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Orb position={[-2, 1, 0]} color="#6366f1" speed={0.3} />
        <Orb position={[2, -1, -2]} color="#a855f7" speed={0.4} />
        <Orb position={[0, 2, -1]} color="#ec4899" speed={0.5} />
      </Canvas>
    </div>
  );
}
