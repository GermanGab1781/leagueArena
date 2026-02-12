import { useState } from "react";
import ChampionUi from "./championUi";

export default function MainUi({
    turn,
    player,
    playerModelData,
    setPlayerModelAnim,
    enemy,
    enemyModelData,
    setEnemyModelAnim,
    playerCooldowns,
    enemyCooldowns,
    isResolvingAction,
    combatStatus,
    onPlayerSkillSelect,
}: MainUiProps) {
    const [previewSkillKey, setPreviewSkillKey] = useState<SkillKey | null>(null);

    const combatLabel =
        combatStatus === "playerWon"
            ? "VICTORY"
            : combatStatus === "playerLost"
                ? "DEFEAT"
                : turn.playerTurn
                    ? "YOUR TURN"
                    : "ENEMY TURN";

    return (
        <div className="w-full">
            <div className="absolute top-0 text-center w-full text-4xl md:text-5xl">
                TURN:{turn.number} - {combatLabel}
            </div>
            <div className="absolute left-5 bottom-[20%]">
                <ChampionUi
                    champion={player}
                    enemy={enemy}
                    championModelData={playerModelData}
                    setAnimations={setPlayerModelAnim}
                    turn={turn}
                    cooldowns={playerCooldowns}
                    isResolvingAction={isResolvingAction}
                    combatStatus={combatStatus}
                    isPlayer={true}
                    onSkillSelect={(skillKey) => {
                        setPreviewSkillKey(null);
                        onPlayerSkillSelect(skillKey);
                    }}
                    onSkillHover={setPreviewSkillKey}
                />
            </div>
            <div className="absolute right-5 top-[20%]">
                <ChampionUi
                    champion={enemy}
                    enemy={player}
                    championModelData={enemyModelData}
                    setAnimations={setEnemyModelAnim}
                    turn={turn}
                    cooldowns={enemyCooldowns}
                    isResolvingAction={isResolvingAction}
                    combatStatus={combatStatus}
                    isPlayer={false}
                    previewSkillKey={previewSkillKey}
                />
            </div>
        </div>
    );
}
