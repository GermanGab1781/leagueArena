import ChampionUi from "./championUi";

export default function MainUi({turn,setTurn,player,playerModelData,setPlayer,setPlayerModelAnim,enemy,enemyModelData,setEnemy,setEnemyModelAnim}:MainUiProps) {
    return (
        <div className="w-full">
            <div className="absolute left-5 bottom-[20%]">
                <ChampionUi
                    champion={player}
                    setChampion={setPlayer}
                    enemy={enemy}
                    setEnemy={setEnemy}
                    championData={playerModelData}
                    setAnimations={setPlayerModelAnim}
                    isPlayer={true}
                />
            </div>

            <div className="absolute right-5 top-[20%]">
                <ChampionUi
                    champion={enemy}
                    setChampion={setEnemy}
                    enemy={player}
                    setEnemy={setPlayer}
                    championData={enemyModelData}
                    setAnimations={setEnemyModelAnim}
                    isPlayer={false}
                />
            </div>
        </div>
        )
}