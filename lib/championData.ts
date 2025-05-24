export const championsData: Record<string, ChampionData> = {
  garen: {
    name: 'Garen',
    modelPath: '/models/Garen/Garen.glb',
    animations: {
      idle: ['garen_2013_idle1.anm'],
      attack: ['garen_2013_attack_02.anm'],
      Q: ['garen_2013_spell1.anm'],
      W: ['garen_2013_channelin.anm'],
      E: ['garen_base_spell3_0.anm'],
      R: ['garen_2013_spell4.anm'],
      death: ['garen_2013_death1.anm'],
    },
  },
  darius: {
    name: 'Darius',
    modelPath: '/models/Darius/Darius.glb',
    animations: {
      idle: ['darius_idle1.anm'],
      attack: ['darius_attack1.anm'],
      Q: ['darius_spell1_in.anm',"darius_spell1.anm"],
      W: ['darius_spell2.anm'],
      E: ['darius_spell3.anm'],
      R: ['darius_spell4.anm'],
    },
  },
};