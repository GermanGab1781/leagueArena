// Helper to map string[] to AnimationStep[] with optional movement steps
const steps = (
  names: string[],
  movement?: Partial<Record<number, AnimationStep['moveTo']>>
): AnimationStep[] =>
  names.map((name, i) => ({
    name,
    ...(movement?.[i] ? { moveTo: movement[i] } : {}),
  }));


export const championsData: Record<string, ChampionData> = {
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
          0: { x: 3, z: -1, duration: 1.4 }, // Approach
          1: { z: -1, duration: 1.4 },    // Attack in place
          2: { x: -1, z: 2, duration: 1.3 },  // Return
        }
      ),
      W: steps(['garen_2013_channelin.anm']),
      E: steps(['garen_base_spell3_0.anm']),
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
      Q: steps([
        'darius_spell1_in.anm',
        'darius_spell1.anm',
        'darius_run.anm'
      ],
        {
          0: { x: -1, z: 2, duration: 1.4 }, // Approach
          2: { x: 3, z: -1, duration: 3 },  // Return
        }
      ),
      W: steps([
        'darius_spell2_run.anm', 
        'darius_spell2.anm', 
        'darius_run.anm'
      ],
        {
          0: { x: -1, z: 2, duration: 3 },
          2: { x: 3, z: -1, duration: 3 }
        }),
      E: steps(['darius_spell3.anm']),
      R: steps(['darius_spell4.anm']),
      // Optional: add death if needed
    },
  },
};
