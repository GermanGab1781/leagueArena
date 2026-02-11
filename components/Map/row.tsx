import MapNode from "./node";

type MapNodeData = {
    id: string;
    row: number;
    order: number;
    kind?: "boss";
};

type MapRowProps = {
    nodes: MapNodeData[];
    currentNodeId: string;
    activeNodeId: string | null;
    completedNodeIds: Set<string>;
    isLocked: boolean;
    canSelectNode: (nodeId: string) => boolean;
    onSelectNode: (nodeId: string) => void;
};

export default function MapRow({
    nodes,
    currentNodeId,
    activeNodeId,
    completedNodeIds,
    isLocked,
    canSelectNode,
    onSelectNode,
}: MapRowProps) {
    return (
        <div>
            <div className="flex flex-row gap-x-20 border place-content-center py-2 px-4">
                {nodes.map((node) => (
                    <MapNode
                        key={node.id}
                        node={node}
                        isCurrent={currentNodeId === node.id}
                        isActive={activeNodeId === node.id}
                        isCompleted={completedNodeIds.has(node.id)}
                        isSelectable={!isLocked && canSelectNode(node.id)}
                        onSelect={onSelectNode}
                    />
                ))}
            </div>
        </div>
    );
}
