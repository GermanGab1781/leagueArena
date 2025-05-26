import ChampionUi from "./championUi";

export default function MainUi({turn,setTurn,player,playerModelData,setPlayer,setPlayerModelAnim,enemy,enemyModelData,setEnemy,setEnemyModelAnim}:MainUiProps) {
    return (
        <div className="w-full">
            <div className="absolute top-0 text-center w-full text-5xl">TURN:{turn.number}</div>
            <div className="absolute left-5 bottom-[20%]">
                <ChampionUi
                    champion={player}
                    setChampion={setPlayer}
                    enemy={enemy}
                    setEnemy={setEnemy}
                    championModelData={playerModelData}
                    setAnimations={setPlayerModelAnim}
                    isPlayer={true}
                    setTurn={setTurn}
                />
            </div>
            <div className="absolute right-5 top-[20%]">
                <ChampionUi
                    champion={enemy}
                    setChampion={setEnemy}
                    enemy={player}
                    setEnemy={setPlayer}
                    championModelData={enemyModelData}
                    setAnimations={setEnemyModelAnim}
                    isPlayer={false}
                    setTurn={setTurn}
                />
            </div>
        </div>
        )
}