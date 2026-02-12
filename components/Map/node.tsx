type MapNodeData = {
    id: string;
    row: number;
    order: number;
    kind: MapNodeKind;
};

type MapNodeProps = {
    node: MapNodeData;
    isCurrent: boolean;
    isSelectable: boolean;
    isActive: boolean;
    isCompleted: boolean;
    isReachableFromCurrent: boolean;
    onSelect: (nodeId: string) => void;
};

export default function MapNode({
    node,
    isCurrent,
    isSelectable,
    isActive,
    isCompleted,
    isReachableFromCurrent,
    onSelect,
}: MapNodeProps) {
    const kindDisplay: Record<MapNodeKind, string> = {
        combat: "C",
        elite: "E",
        event: "?",
        shop: "$",
        rest: "R",
        boss: "B",
    };

    let display = kindDisplay[node.kind];
    if (isCurrent) {
        display = "X";
    } else if (isActive) {
        display = "!";
    } else if (isCompleted) {
        display = "V";
    }

    const className = `select-none font-bold text-xl px-2 py-1 rounded transition-all ${
        isCurrent
            ? "bg-emerald-900/70 text-emerald-100"
            : isActive
                ? "bg-yellow-600/75 text-yellow-100"
                : isCompleted
                    ? "bg-emerald-700/70 text-emerald-100"
                    : isSelectable
                        ? "cursor-pointer text-white hover:bg-neutral-700"
                        : isReachableFromCurrent
                            ? "text-slate-200/85 opacity-80"
                            : "text-slate-500/70 opacity-60"
    }`;

    if (isSelectable) {
        return (
            <button data-map-node-id={node.id} type="button" onClick={() => onSelect(node.id)} className={className}>
                {display}
            </button>
        );
    }

    return <div data-map-node-id={node.id} className={className}>{display}</div>;
}
