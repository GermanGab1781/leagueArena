import IconSlot from "../UI/iconSlot";

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

const NODE_VISUALS: Record<MapNodeKind, { code: string; label: string; src: string }> = {
    combat: { code: "CB", label: "Combat", src: "/icons/map/map_node_combat.png" },
    elite: { code: "EL", label: "Elite", src: "/icons/map/map_node_elite.png" },
    event: { code: "EV", label: "Event", src: "/icons/map/map_node_event.png" },
    shop: { code: "SH", label: "Shop", src: "/icons/map/map_node_shop.png" },
    rest: { code: "RS", label: "Rest", src: "/icons/map/map_node_rest.png" },
    boss: { code: "BS", label: "Boss", src: "/icons/map/map_node_boss.png" },
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
    const nodeVisual = NODE_VISUALS[node.kind];

    const stateLabel = isCurrent
        ? "Current"
        : isActive
            ? "Active"
            : isCompleted
                ? "Cleared"
                : isSelectable
                    ? "Next"
                    : isReachableFromCurrent
                        ? "Open"
                        : "Locked";

    const className = `select-none rounded-md border min-w-[86px] px-2 py-2.5 flex flex-col items-center gap-y-1 transition-all ${
        isCurrent
            ? "bg-emerald-900/70 border-emerald-400/80 text-emerald-100"
            : isActive
                ? "bg-yellow-700/65 border-yellow-300/85 text-yellow-100"
                : isCompleted
                    ? "bg-emerald-800/65 border-emerald-300/80 text-emerald-100"
                    : isSelectable
                        ? "cursor-pointer border-slate-300/70 text-white hover:bg-neutral-700/80"
                        : isReachableFromCurrent
                            ? "border-slate-500/70 text-slate-200/85 opacity-80"
                            : "border-slate-700/70 text-slate-500/70 opacity-60"
    }`;

    const slotClassName = `h-10 w-10 ${
        isCurrent
            ? "border-emerald-300/90 text-emerald-100"
            : isActive
                ? "border-yellow-200/90 text-yellow-100"
                : isCompleted
                    ? "border-emerald-200/90 text-emerald-100"
                    : isSelectable
                        ? "border-slate-200/90 text-slate-100"
                        : isReachableFromCurrent
                            ? "border-slate-300/70 text-slate-200"
                            : "border-slate-600/70 text-slate-500"
    }`;
    const slotImageClassName = isSelectable || isCurrent || isActive || isCompleted
        ? ""
        : isReachableFromCurrent
            ? "opacity-85"
            : "opacity-55 grayscale";

    const content = (
        <>
            <IconSlot
                code={nodeVisual.code}
                label={`${nodeVisual.label} icon`}
                src={nodeVisual.src}
                className={slotClassName}
                imageClassName={slotImageClassName}
            />
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase leading-none">{nodeVisual.label}</div>
            <div className="text-[9px] tracking-[0.12em] uppercase opacity-85 leading-none">{stateLabel}</div>
        </>
    );

    if (isSelectable) {
        return (
            <button data-map-node-id={node.id} type="button" onClick={() => onSelect(node.id)} className={className}>
                {content}
            </button>
        );
    }

    return <div data-map-node-id={node.id} className={className}>{content}</div>;
}
