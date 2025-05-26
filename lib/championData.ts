// Helper to map string[] to AnimationStep[] with optional movement and rotation
const steps = (
  names: string[],
  movement?: Partial<Record<number, AnimationStep['moveTo']>>,
  rotation?: Partial<Record<number, AnimationStep['rotateTo']>>
): AnimationStep[] =>
  names.map((name, i) => ({
    name,
    ...(movement?.[i] ? { moveTo: movement[i] } : {}),
    ...(rotation?.[i] ? { rotateTo: rotation[i] } : {}),
  }));

/* Player euler : position={[-1, -1, 2]} rotation={[0, 140, 0]} */
/* Enemy euler : position={[3, -1, -1]} rotation={[0, -50, 0]}*/

export const championsData: Record<string, ChampionModelData> = {
  garen: {
    name: 'Garen',
    modelPath: '/models/Garen/Garen.glb',
    animations: {
      idle: steps(['garen_2013_idle1.anm']),
      attack: steps(['garen_2013_attack_02.anm']),
      Q: steps(
        [
          'garen_2013_run_spell1.anm',
          'garen_2013_spell1.anm',
          'garen_2013_run_spell1.anm',
        ],
        {
          0: { x: 2.4, z: -0.5, duration: 1.4 },
          1: { z: -1, duration: 1.4 },
          2: { x: -1, z: 2, duration: 1 },
        },
        {
          2: { y: -80, duration: 0.7 },
        }
      ),
      W: steps(['garen_2013_channelin.anm']),
      E: steps(
        [
          'garen_base_spell3_0.anm'
          , 'garen_2013_run.anm'
        ]
        , {
          0: { x: 2.4, z: -0.5, duration: 3 },
          1: { x: -1, z: 2, duration: 1.4 },
        },
        {
          1: { y: -80, duration: 0.7 }
        }
      ),
      R: steps(['garen_2013_spell4.anm']),
      death: steps(['garen_2013_death1.anm']),
    },
  },
  darius: {
    name: 'Darius',
    modelPath: '/models/Darius/Darius.glb',
    animations: {
      idle: steps(['darius_idle1.anm']),
      attack: steps(['darius_attack1.anm']),
      Q: steps(
        [
          'darius_spell1_in.anm',
          'darius_spell1.anm',
          'darius_run.anm'
        ],
        {
          0: { x: 0.6, z: 0.5, duration: 1 },
          2: { x: 3, z: -1, duration: 1.5 },
        },
        {

          2: { y: -240, duration: 0.2 },
        }
      ),
      W: steps(
        [
          'darius_spell2_run.anm',
          'darius_spell2.anm',
          'darius_run.anm'
        ],
        {
          0: { x: 0.6, z: 0.5, duration: 2 },
          2: { x: 3, z: -1, duration: 1.7 },
        },
        {
          2: { y: -230, duration: 0.5 },
        }
      ),
      E: steps(['darius_spell3.anm']),
      R: steps(['darius_spell4.anm']),
    },
  },
};
