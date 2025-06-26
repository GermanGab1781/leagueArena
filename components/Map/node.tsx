export default function MapNode({ playerCords,setPlayerCords, x, y }: mapNodeProps) {
    return (
        <div>
            {/* {(playerCords.x === x && playerCords.y === y)
                ? (<div>⚪</div>)
                : (<div>⚫</div>)
            } */}
            {playerCords.y+1 === y
                ? (<div onClick={()=>setPlayerCords({x:x,y:y})}>⚪</div>)
                : (<div>⚫</div>)
            } 
        </div>
    )
}