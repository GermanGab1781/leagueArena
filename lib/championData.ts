// Helper to map string[] to AnimationStep[] with optional movement and rotation
const steps = (
  names: string[],
  skillName:string,
  movement?: Partial<Record<number, AnimationStep['moveTo']>>,
  rotation?: Partial<Record<number, AnimationStep['rotateTo']>>,
  sfx?: Partial<Record<number, AnimationStep['sfx']>>
): AnimationStep[] =>
  names.map((name, i) => ({
    name,skillName,
    ...(movement?.[i] ? { moveTo: movement[i] } : {}),
    ...(rotation?.[i] ? { rotateTo: rotation[i] } : {}),
    ...(sfx?.[i] ? { sfx: sfx[i] } : {}),
  }));


/* Player euler : position={[-1, -1, 2]} rotation={[0, 140, 0]} */
/* Enemy euler : position={[3, -1, -1]} rotation={[0, -50, 0]}*/

export const championsData: Record<string, ChampionModelData> = {
  garen: {
    name: 'Garen',
    modelPath: '/models/Garen/Garen.glb',
    animations: {
      idle: steps(['garen_2013_idle1.anm'], 'idle',{},{},{}),
      Attack: steps(
        ['garen_2013_attack_02.anm'],
        'Attack',
        {},
        {},
        {
          0: { audios: ['/models/Garen/audios/Attack1.mp3', '/models/Garen/audios/Attack2.mp3'] }
        }
      ),
      Q: steps(
        [
          'garen_2013_run_spell1.anm',
          'garen_2013_spell1.anm',
          'garen_2013_run_spell1.anm',
        ],
        'Q',
        {
          0: { x: 2.4, z: -0.5, duration: 1.4 },
          1: { z: -1, duration: 1.4 },
          2: { x: -1, z: 2, duration: 1 },
        },
        {
          2: { y: -80, duration: 0.7 },
        },
        {
          0: { audios: ['/models/Garen/audios/Q1.mp3'] },
          1: { audios: ['/models/Garen/audios/Attack1.mp3'] }
        }
      ),
      W: steps(
        ['garen_2013_channelin.anm'],
        'W',
        {},
        {},
        {
          0: {
            audios: [
              '/models/Garen/audios/W1.mp3',
              '/models/Garen/audios/W2.mp3',
              '/models/Garen/audios/W3.mp3',
              '/models/Garen/audios/W4.mp3',
              '/models/Garen/audios/W5.mp3',
            ],
          },
        }
      ),
      E: steps(
        ['garen_base_spell3_0.anm', 'garen_2013_run.anm'],
        'E',
        {
          0: { x: 2.4, z: -0.5, duration: 3 },
          1: { x: -1, z: 2, duration: 1.4 },
        },
        {
          1: { y: -80, duration: 0.7 },
        },
        {
          0: { audios: ['/models/Garen/audios/E1.mp3', '/models/Garen/audios/E2.mp3'] },
        }
      ),
      R: steps(
        ['garen_2013_spell4.anm'],
        'R',
        {},
        {},
        {
          0: { audios: ['/models/Garen/audios/R.mp3'] },
        }
      ),
      death: steps(['garen_2013_death1.anm'], 'death'),
    },
  },

  darius: {
    name: 'Darius',
    modelPath: '/models/Darius/Darius.glb',
    animations: {
      idle: steps(['darius_idle1.anm'], 'idle'),
      Attack: steps(['darius_attack1.anm'], 'Attack'),
      Q: steps(
        ['darius_spell1_in.anm', 'darius_spell1.anm', 'darius_run.anm'],
        'Q',
        {
          0: { x: 0.6, z: 0.5, duration: 1 },
          2: { x: 3, z: -1, duration: 1.5 },
        },
        {
          2: { y: -240, duration: 0.2 },
        },{
          1: { audios: ['/models/Darius/audios/Q1.mp3'] }
        }
      ),
      W: steps(
        ['darius_spell2_run.anm', 'darius_spell2.anm', 'darius_run.anm'],
        'W',
        {
          0: { x: 0.6, z: 0.5, duration: 2 },
          2: { x: 3, z: -1, duration: 1.7 },
        },
        {
          2: { y: -230, duration: 0.5 },
        }
      ),
      E: steps(['darius_spell3.anm'], 'E'),
      R: steps(['darius_spell4.anm'], 'R'),
      death: steps(['darius_death1.anm'], 'death'),
    },
  },
};