'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const STAR_COUNT = 10000;

function generateStarPositions() {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    const radius = Math.random() * 1000 + 200;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos((Math.random() * 2 - 1));
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function Stars() {
  const ref = useRef<THREE.Points>(null);
  const positions = generateStarPositions();

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.01;
      ref.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#a78bfa"
        size={1.5}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function GlowingOrbs() {
  const orb1 = useRef<THREE.Mesh>(null);
  const orb2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (orb1.current) {
      orb1.current.position.x = Math.sin(t * 0.3) * 80;
      orb1.current.position.y = Math.cos(t * 0.2) * 40;
      orb1.current.position.z = Math.sin(t * 0.4) * 60;
      orb1.current.rotation.x = t * 0.1;
      orb1.current.rotation.y = t * 0.15;
    }
    if (orb2.current) {
      orb2.current.position.x = Math.cos(t * 0.25) * -60;
      orb2.current.position.y = Math.sin(t * 0.35) * 50;
      orb2.current.position.z = Math.cos(t * 0.3) * 40;
      orb2.current.rotation.x = -t * 0.12;
      orb2.current.rotation.y = -t * 0.08;
    }
  });

  return (
    <>
      <mesh ref={orb1} position={[80, 40, 60]}>
        <icosahedronGeometry args={[12, 1]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
      <mesh ref={orb2} position={[-60, 50, 40]}>
        <dodecahedronGeometry args={[10, 1]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.25}
          wireframe
        />
      </mesh>
    </>
  );
}

function AnimatedGrid() {
  const gridRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (gridRef.current) {
      gridRef.current.rotation.z += delta * 0.005;
    }
  });

  return (
    <group ref={gridRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -100, -200]}>
      <mesh>
        <circleGeometry args={[500, 64]} />
        <meshBasicMaterial
          color="#4c1d95"
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>
    </group>
  );
}

export default function StarField() {
  return (
    <div className="fixed inset-0 -z-50 h-screen w-screen">
      <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
        <ambientLight intensity={0.1} />
        <Stars />
        <GlowingOrbs />
        <AnimatedGrid />
        <Sphere args={[100, 32, 32]} position={[0, 0, -400]}>
          <meshBasicMaterial
            color="#0c0a1e"
            transparent
            opacity={0.8}
          />
        </Sphere>
      </Canvas>
    </div>
  );
}
