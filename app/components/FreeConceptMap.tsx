"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import {
  pronunciationComponentDefinitions,
  type PronunciationComponentKey,
} from "./PronunciationDragDrop";

const kitNodeMimeType = "application/x-elps-j-concept-node";

export const correctConceptMapConnections: Array<
  readonly [PronunciationComponentKey, PronunciationComponentKey]
> = [
  ["symbol", "classificationLink"],
  ["classificationLink", "soundType"],
  ["soundType", "tongueLink"],
  ["tongueLink", "height"],
  ["tongueLink", "backness"],
  ["soundType", "roundingLink"],
  ["roundingLink", "rounding"],
  ["soundType", "tensenessLink"],
  ["tensenessLink", "tenseness"],
];

type KitNodeKind = "concept" | "relation";

type KitNodeData = {
  componentKey: PronunciationComponentKey;
  value: string;
  label: string;
  kind: KitNodeKind;
};

type KitFlowNode = Node<KitNodeData, "kitNode">;

type KitPart = KitNodeData;

export type ConceptMapSnapshot = {
  values: Partial<Record<PronunciationComponentKey, string>>;
  connections: Array<{
    source: PronunciationComponentKey;
    target: PronunciationComponentKey;
  }>;
};

export const emptyConceptMapSnapshot: ConceptMapSnapshot = {
  values: {},
  connections: [],
};

export function assessConceptMap(
  snapshot: ConceptMapSnapshot,
  correctValues: Record<PronunciationComponentKey, string>,
) {
  const correctNodeCount = pronunciationComponentDefinitions.filter(
    ({ key }) => snapshot.values[key] === correctValues[key],
  ).length;
  const connectionSet = new Set(
    snapshot.connections.map(({ source, target }) => `${source}->${target}`),
  );
  const correctConnectionCount = correctConceptMapConnections.filter(
    ([source, target]) => connectionSet.has(`${source}->${target}`),
  ).length;
  const isReady =
    Object.keys(snapshot.values).length ===
      pronunciationComponentDefinitions.length &&
    snapshot.connections.length >= correctConceptMapConnections.length;
  const isCorrect =
    correctNodeCount === pronunciationComponentDefinitions.length &&
    correctConnectionCount === correctConceptMapConnections.length &&
    snapshot.connections.length === correctConceptMapConnections.length;

  return {
    correctNodeCount,
    correctConnectionCount,
    isReady,
    isCorrect,
  };
}

function nodeKind(componentKey: PronunciationComponentKey): KitNodeKind {
  return componentKey.endsWith("Link") ? "relation" : "concept";
}

function KitConceptNode({ data, selected }: NodeProps<KitFlowNode>) {
  const isRelation = data.kind === "relation";

  return (
    <div
      className={`min-w-32 border px-4 py-3 text-center shadow-sm ${
        isRelation
          ? "rounded-full border-blue-500 bg-blue-50 text-blue-950"
          : "rounded-md border-emerald-600 bg-white text-slate-950"
      } ${selected ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        title="このノードへ接続"
        className="!size-3 !border-2 !border-white !bg-slate-700"
      />
      <p className="max-w-48 text-sm font-bold leading-5">{data.label}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        title="このノードから接続"
        className="!size-3 !border-2 !border-white !bg-emerald-700"
      />
    </div>
  );
}

const nodeTypes = {
  kitNode: KitConceptNode,
};

function snapshotFrom(nodes: KitFlowNode[], edges: Edge[]): ConceptMapSnapshot {
  return {
    values: Object.fromEntries(
      nodes.map(({ data }) => [data.componentKey, data.value]),
    ),
    connections: edges.map(({ source, target }) => ({
      source: source as PronunciationComponentKey,
      target: target as PronunciationComponentKey,
    })),
  };
}

export default function FreeConceptMap({
  mapLabel,
  onChange,
}: {
  mapLabel: string;
  onChange: (snapshot: ConceptMapSnapshot) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<KitFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<KitFlowNode, Edge> | null>(null);

  useEffect(() => {
    onChange(snapshotFrom(nodes, edges));
  }, [edges, nodes, onChange]);

  const addPart = useCallback(
    (part: KitPart, position?: { x: number; y: number }) => {
      setNodes((currentNodes) => {
        const existing = currentNodes.find(
          ({ id }) => id === part.componentKey,
        );

        if (existing !== undefined) {
          return currentNodes.map((node) =>
            node.id === part.componentKey
              ? { ...node, data: part, selected: true }
              : { ...node, selected: false },
          );
        }

        const index = currentNodes.length;
        return [
          ...currentNodes.map((node) => ({ ...node, selected: false })),
          {
            id: part.componentKey,
            type: "kitNode",
            position: position ?? {
              x: 40 + (index % 2) * 260,
              y: 40 + Math.floor(index / 2) * 110,
            },
            data: part,
            selected: true,
          },
        ];
      });
    },
    [setNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source === connection.target ||
        edges.some(
          ({ source, target }) =>
            source === connection.source && target === connection.target,
        )
      ) {
        return;
      }

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges,
        ),
      );
    },
    [edges, setEdges],
  );

  function handleDragStart(
    event: React.DragEvent<HTMLButtonElement>,
    part: KitPart,
  ) {
    event.dataTransfer.setData(kitNodeMimeType, JSON.stringify(part));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (flowInstance === null) {
      return;
    }

    const serializedPart = event.dataTransfer.getData(kitNodeMimeType);
    if (serializedPart === "") {
      return;
    }

    const part = JSON.parse(serializedPart) as KitPart;
    addPart(
      part,
      flowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0">
        <p className="text-sm font-bold text-emerald-700">キット</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
          {pronunciationComponentDefinitions.map((definition) => (
            <fieldset
              key={definition.key}
              className={
                definition.key === "classificationLink" ? "col-span-2" : ""
              }
            >
              <legend className="text-sm font-bold text-slate-700">
                {definition.label}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {definition.options.map(([value, label]) => {
                  const part: KitPart = {
                    componentKey: definition.key,
                    value,
                    label,
                    kind: nodeKind(definition.key),
                  };
                  const isPlaced = nodes.some(
                    ({ id, data }) =>
                      id === definition.key && data.value === value,
                  );

                  return (
                    <button
                      key={value}
                      type="button"
                      draggable
                      onDragStart={(event) => handleDragStart(event, part)}
                      onClick={() => addPart(part)}
                      aria-pressed={isPlaced}
                      className={`min-h-11 cursor-grab border px-4 py-2 text-sm font-semibold transition active:cursor-grabbing ${
                        part.kind === "relation"
                          ? "rounded-full border-blue-400 bg-blue-50 text-blue-950"
                          : "rounded-md border-slate-300 bg-white text-slate-800"
                      } ${
                        isPlaced
                          ? "ring-2 ring-emerald-500 ring-offset-1"
                          : "hover:border-emerald-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="mt-7 min-w-0 lg:mt-0">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-sm font-bold text-emerald-700">概念マップ</p>
          <p className="text-xs font-semibold text-slate-500">
            {nodes.length} ノード・{edges.length} 接続
          </p>
        </div>
        <div
          aria-label={mapLabel}
          className="h-[36rem] overflow-hidden border border-slate-300 bg-white sm:h-[42rem]"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={handleDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={setFlowInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            deleteKeyCode={["Backspace", "Delete"]}
            minZoom={0.4}
            maxZoom={1.6}
          >
            <Controls showInteractive={false} />
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.3}
              color="#cbd5e1"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
