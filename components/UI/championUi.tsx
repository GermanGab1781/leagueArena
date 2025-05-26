export default function ChampionUi({ champion, setChampion, enemy, setEnemy, isPlayer, championModelData, setAnimations }: ChampionUiProps) {
    function getHealthColor(ratio: number) {
        if (ratio <= 0.24) return 'bg-red-500';
        if (ratio <= 0.49) return 'bg-yellow-500';
        return 'bg-green-500';
    }
    const healthChampion = champion.currentHealth / champion.maxHealth;
    /* make a single skill function that takes the type then it process it */

    const useSkill = (skillName:string,info:champion,animation:AnimationStep[]) => {
        // Set the animation
        setAnimations(animation);
        console.log(info.skills[skillName])

        // Apply damage
         if (info.skills[skillName].damage && enemy) {
            const damageDealt = info.skills[skillName].damage / (enemy.armor || 1);
            const newEnemyHealth = Math.max(enemy.currentHealth - damageDealt, 0);
            setEnemy(prev => ({ ...prev, currentHealth: newEnemyHealth }));
        }

        // Heal self
        if (info.skills[skillName].heal) {
            const newHealth = Math.min(champion.currentHealth + info.skills[skillName].heal, champion.maxHealth);
            setChampion(prev => ({ ...prev, currentHealth: newHealth }));
        }

        // Armor self
        if (info.skills[skillName].armorBoost){
            const newArmor = Math.min(champion.armor + info.skills[skillName].armorBoost)
            setChampion(prev => ({ ...prev, armor: newArmor }));
        }


        // TODO: Buffs, debuffs, etc.
    };

    return (
        <div className="">
            {/* Hp Bar */}
            <div className={` border flex flex-col`}>
                <div>{champion.name}</div>
                <div className={`${getHealthColor(healthChampion)}`}>
                    {champion.maxHealth}/{champion.currentHealth}
                </div>
                <div>
                    Armor:{champion.armor}
                </div>
            </div>
            {/* Skills */}
            {/* isPlayer && */}
            <div className="flex">
                <div onClick={() => useSkill("Attack",champion,championModelData.animations.attack)}
                    className="border bg-red-600 p-2 cursor-pointer">
                    Attack
                </div>
                <div onClick={() => useSkill("Q",champion,championModelData.animations.Q)}
                    className="border bg-red-600 p-2 cursor-pointer">
                    Q
                </div>
                <div onClick={() => useSkill("W",champion,championModelData.animations.W)}
                    className="border bg-red-600 p-2 cursor-pointer">
                    W
                </div>
                <div onClick={() => useSkill("E",champion,championModelData.animations.E)}
                    className="border bg-red-600 p-2 cursor-pointer">
                    E
                </div>
                <div onClick={() => useSkill("R",champion,championModelData.animations.R)}
                    className="border bg-red-600 p-2 cursor-pointer">
                    R
                </div>
            </div>


        </div>
    )
}