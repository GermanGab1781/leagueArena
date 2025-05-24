'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { Group } from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function ChampionModel({ data, position = [0, 0, 0], rotation = [0, 0, 0], animationsActive, setAnimations }: ChampionModelProps) {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationStep[]>(animationsActive);
  const [animationIndex, setAnimationIndex] = useState(0);

  const ref = useRef<Group>(null);
  const currentPos = useRef(new THREE.Vector3(...position));
  const movementStartTime = useRef<number | null>(null);
  const movementStartPos = useRef<THREE.Vector3 | null>(null);

  const rotationStartTime = useRef<number | null>(null);
  const rotationStartRot = useRef<THREE.Euler | null>(null);

  const { scene, animations } = useGLTF(data.modelPath);
  const { actions, mixer } = useAnimations(animations, ref);
  const idleName = data.animations.idle[0];

  useEffect(() => {
    setCurrentAnimation(animationsActive);
    setAnimationIndex(0);
  }, [animationsActive]);

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...position);
      currentPos.current.set(...position);
    }
  }, []);

  useEffect(() => {
    currentPos.current.set(...position);
  }, [position]);

  useEffect(() => {
    if (!actions || !currentAnimation || !mixer) return;
    if (animationIndex >= currentAnimation.length) return;

    Object.values(actions).forEach(action => action?.fadeOut(0.2));

    const animStep = currentAnimation[animationIndex];
    const currentAction = actions[animStep.name];
    const idleAction = actions[idleName.name];
    const clip = animations.find(a => a.name === animStep.name);

    if (!currentAction || !clip) {
      console.warn('Animation not found:', animStep.name);
      return;
    }

    currentAction.reset();
    currentAction.fadeIn(0.2);
    const isIdle = currentAnimation.length === 1 && animStep.name === idleName.name;

    if (isIdle) {
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
      currentAction.clampWhenFinished = false;
    } else {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    }

    if (animStep.moveTo?.duration && clip.duration > 0) {
      const playbackSpeed = clip.duration / animStep.moveTo.duration;
      currentAction.setEffectiveTimeScale(playbackSpeed);
    } else {
      currentAction.setEffectiveTimeScale(1);
    }

    currentAction.play();

    if (animStep.moveTo && ref.current) {
      movementStartPos.current = ref.current.position.clone();
      movementStartTime.current = performance.now();
    } else {
      movementStartPos.current = null;
      movementStartTime.current = null;
    }

    if (animStep.rotateTo && ref.current) {
      rotationStartRot.current = ref.current.rotation.clone();
      rotationStartTime.current = performance.now();
    } else {
      rotationStartRot.current = null;
      rotationStartTime.current = null;
    }

    const onFinished = (e: THREE.Event) => {
      const finishedEvent = e as any;
      if (finishedEvent.action === currentAction) {
        if (animationIndex + 1 < currentAnimation.length) {
          setAnimationIndex(prev => prev + 1);
        } else {
          if (idleAction && !idleAction.isRunning()) {
            idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2);
            idleAction.clampWhenFinished = false;
            idleAction.play();
          }
          setAnimationIndex(0);
          setCurrentAnimation(data.animations.idle);
          setAnimations(data.animations.idle);
        }
      }
    };

    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [actions, animationIndex, currentAnimation, mixer, data.animations.idle, setAnimations, animations]);

  useFrame(() => {
    if (!ref.current) return;

    if (movementStartPos.current && movementStartTime.current !== null) {
      const now = performance.now();
      const animStep = currentAnimation[animationIndex];
      if (!animStep.moveTo) return;

      const elapsed = (now - movementStartTime.current) / 1000;
      const duration = animStep.moveTo.duration;
      const progress = Math.min(elapsed / duration, 1);

      const startPos = movementStartPos.current;
      const targetPos = new THREE.Vector3(
        animStep.moveTo.x ?? startPos.x,
        animStep.moveTo.y ?? startPos.y,
        animStep.moveTo.z ?? startPos.z
      );

      const newPos = startPos.clone().lerp(targetPos, progress);
      ref.current.position.copy(newPos);
      currentPos.current.copy(newPos);

      if (progress >= 1) {
        movementStartTime.current = null;
        movementStartPos.current = null;
      }
    } else {
      ref.current.position.copy(currentPos.current);
    }

    if (rotationStartRot.current && rotationStartTime.current !== null) {
      const now = performance.now();
      const animStep = currentAnimation[animationIndex];
      if (!animStep.rotateTo) return;

      const elapsed = (now - rotationStartTime.current) / 1000;
      const duration = animStep.rotateTo.duration;
      const progress = Math.min(elapsed / duration, 1);

      const startRot = rotationStartRot.current;
      const targetRot = new THREE.Euler(
        THREE.MathUtils.degToRad(animStep.rotateTo.x ?? THREE.MathUtils.radToDeg(startRot.x)),
        THREE.MathUtils.degToRad(animStep.rotateTo.y ?? THREE.MathUtils.radToDeg(startRot.y)),
        THREE.MathUtils.degToRad(animStep.rotateTo.z ?? THREE.MathUtils.radToDeg(startRot.z))
      );

      const newRot = new THREE.Euler(
        THREE.MathUtils.lerp(startRot.x, targetRot.x, progress),
        THREE.MathUtils.lerp(startRot.y, targetRot.y, progress),
        THREE.MathUtils.lerp(startRot.z, targetRot.z, progress)
      );

      ref.current.rotation.copy(newRot);

      if (progress >= 1) {
        rotationStartTime.current = null;
        rotationStartRot.current = null;
      }
    }
  });

  return (
    <primitive
      ref={ref}
      object={scene}
      rotation={new THREE.Euler(...rotation.map(r => THREE.MathUtils.degToRad(r)))}
      scale={0.01}
    />
  );
}
