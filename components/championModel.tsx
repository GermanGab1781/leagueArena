'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { Group } from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';

export function ChampionModel({ data, position, rotation, animationsActive, setAnimations }: ChampionModelProps) {
  // State to store animation names array
  const [currentAnimation, setCurrentAnimation] = useState<string[]>(animationsActive);

  // Track the index of the current animation being played
  const [animationIndex, setAnimationIndex] = useState(0);

  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(data.modelPath);
  const { actions, mixer } = useAnimations(animations, ref);

  useEffect(() => {
    if (!actions || !currentAnimation || !mixer) return;
    if (animationIndex >= currentAnimation.length) return; // Defensive

    // Fade out all other actions
    Object.values(actions).forEach((action) => action?.fadeOut(0.2));

    const idleName = data.animations.idle[0];
    const idleAction = actions[idleName];

    const animName = currentAnimation[animationIndex];
    const currentAction = actions[animName];

    if (!currentAction) {
      console.warn('Animation not found:', animName);
      return;
    }

    const isIdle = currentAnimation.length === 1 && animName === idleName;

    // Play current animation
    currentAction.reset();
    currentAction.fadeIn(0.2);

    if (isIdle) {
      // Idle should loop forever and not clamp
      currentAction.setLoop(THREE.LoopRepeat, Infinity);
      currentAction.clampWhenFinished = false;
    } else {
      // Non-idle animations play once and clamp
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
    }

    currentAction.play();

    // Handle animation finish
    const onFinished = (e: THREE.Event) => {
      const finishedEvent = e as any;
      if (finishedEvent.action === currentAction) {
        if (animationIndex + 1 < currentAnimation.length) {
          // Play next animation in array
          setAnimationIndex(animationIndex + 1);
        } else {
          // All animations done, fallback to idle animation loop
          if (idleAction && !idleAction.isRunning()) {
            idleAction.reset()
              .setLoop(THREE.LoopRepeat, Infinity)
              .fadeIn(0.2);
            idleAction.clampWhenFinished = false;
            idleAction.play();
          }
          setAnimationIndex(0);
          setCurrentAnimation(data.animations.idle);
          setAnimations(data.animations.idle); // External sync
        }
      }
    };

    mixer.addEventListener('finished', onFinished);

    // Cleanup listener on effect re-run or unmount
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [actions, currentAnimation, animationIndex, mixer, data.animations.idle, setAnimations]);

  // Sync external animation trigger
  useEffect(() => {
    setCurrentAnimation(animationsActive);
    setAnimationIndex(0);
  }, [animationsActive]);

  return (
    <primitive
      ref={ref}
      object={scene}
      position={position}
      rotation={rotation}
      scale={0.01}
    />
  );
}
