'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { Group } from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';

export function ChampionModel({ data, position, rotation, currentAnimation,setAnim }: ChampionModelProps) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(data.modelPath);
  const { actions, mixer } = useAnimations(animations, ref);
   console.log('Animations in model:', data.modelPath, animations.map(a => a.name));

  useEffect(() => {
    
    if (!actions || !currentAnimation || !mixer) return;

    Object.values(actions).forEach((action) => action?.fadeOut(0.2));

    const idleAction = actions[data.animations.idle];
    const currentAction = actions[currentAnimation];

    if (!currentAction) {
      console.warn('Animation not found:', currentAnimation);
      return;
    }

    // Handler for finished event on mixer
    const onFinished = (e: THREE.Event) => {
      const finishedEvent = e as any; // cast to known event type
      if (finishedEvent.action === currentAction) {
        if (idleAction) {
          idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
          /* Reset currentAnimation to avoid Clamp */
          setAnim(data.animations.idle)
        }
      }
    };

    currentAction.reset();
    currentAction.fadeIn(0.2);

    if (currentAnimation === data.animations.idle) {
      currentAction.setLoop(THREE.LoopRepeat, Infinity).play();
    } else {
      currentAction.setLoop(THREE.LoopOnce, 1);
      currentAction.clampWhenFinished = true;
      currentAction.play();

      mixer.addEventListener('finished', onFinished);
    }

    return () => {
      if (mixer) {
        mixer.removeEventListener('finished', onFinished);
      }
    };
  }, [actions, currentAnimation, mixer]);

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
