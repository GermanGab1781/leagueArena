'use client'
import { useState } from "react";
import MapRow from "./row";

export default function Map() {
    const [playerCords,setPlayerCords] = useState<mapCords>({x:0,y:0})
    return (
        <div className="flex place-content-center place-items-center w-full h-full border">
            <div className="flex flex-col gap-y-20">
                <MapRow playerCords={playerCords} setPlayerCords={setPlayerCords} rowY={4}/>
                <MapRow playerCords={playerCords} setPlayerCords={setPlayerCords} rowY={3}/>
                <MapRow playerCords={playerCords} setPlayerCords={setPlayerCords} rowY={2}/>
                <MapRow playerCords={playerCords} setPlayerCords={setPlayerCords} rowY={1}/>
                {/* Starting point */}
                <div className="border place-self-center">
                    ⚪
                </div>
            </div>
        </div>
    )
}