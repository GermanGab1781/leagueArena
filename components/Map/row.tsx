import MapNode from "./node";

export default function MapRow({playerCords,setPlayerCords,rowY}:mapRowProps) {
    return (
        <div>
            <div className="flex flex-row gap-x-20 border">
                <MapNode playerCords={playerCords} setPlayerCords={setPlayerCords} x={1} y={rowY}/>
                <MapNode playerCords={playerCords} setPlayerCords={setPlayerCords} x={2} y={rowY}/>
                <MapNode playerCords={playerCords} setPlayerCords={setPlayerCords} x={3} y={rowY}/>
                <MapNode playerCords={playerCords} setPlayerCords={setPlayerCords} x={4} y={rowY}/>
            </div>
        </div>
    )
}