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
    onSelect: (nodeId: string) => void;
};

export default function MapNode({ node, isCurrent, isSelectable, isActive, isCompleted, onSelect }: MapNodeProps) {
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

    const className = `select-none font-bold text-xl px-2 py-1 rounded ${
        isCurrent
            ? "bg-emerald-900/70"
            : isActive
                ? "bg-yellow-700/70"
                : isCompleted
                    ? "bg-emerald-700/60"
                    : isSelectable
                        ? "cursor-pointer hover:bg-neutral-700"
                        : "opacity-70"
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
