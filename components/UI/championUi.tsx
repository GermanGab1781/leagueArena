export default function ChampionUi(
    { champion, setChampion, isPlayer, championData, setAnimations }:
        {
            champion: champion,
            setChampion: React.Dispatch<React.SetStateAction<champion>>,
            isPlayer: boolean,
            championData:ChampionData,
            setAnimations: React.Dispatch<React.SetStateAction<AnimationStep[]>>
        }
) {
    function getHealthColor(ratio: number) {
        if (ratio <= 0.24) return 'bg-red-500';
        if (ratio <= 0.49) return 'bg-yellow-500';
        return 'bg-green-500';
    }
    const healthChampion = champion.currentHealth / champion.maxHealth;
    return (
        <div className="">
            {/* Hp Bar */}
            <div className={` border flex flex-col`}>
                <div>{champion.name}</div>
                <div className={`${getHealthColor(healthChampion)}`}>
                    {champion.maxHealth}/{champion.currentHealth}
                </div>
            </div>
            {/* Skills */}
            {/* isPlayer && */}
            <div className="flex">
                <div onClick={() => setAnimations(championData.animations.attack)} className="border bg-red-600 p-2 cursor-pointer">Attack</div>
                <div onClick={() => setAnimations(championData.animations.Q)} className="border bg-red-600 p-2 cursor-pointer">Q</div>
                <div onClick={() => setAnimations(championData.animations.W)} className="border bg-red-600 p-2 cursor-pointer">W</div>
                <div onClick={() => setAnimations(championData.animations.E)} className="border bg-red-600 p-2 cursor-pointer">E</div>
                <div onClick={() => setAnimations(championData.animations.R)} className="border bg-red-600 p-2 cursor-pointer">R</div>
            </div>


        </div>
    )
}