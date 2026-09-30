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
} from "./PronunciationDragDrop";

import {
  assessStructure,
  type ComponentDefinition,
  type ConceptConnection,
  type ConceptMapSnapshot,
} from "../data/concept-map";
export { emptyConceptMapSnapshot, type ConceptMapSnapshot } from "../data/concept-map";

const kitNodeMimeType = "application/x-elps-j-concept-node";

export const correctConceptMapConnections: Array<
  ConceptConnection
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
  componentKey: string;
  value: string;
  label: string;
  kind: KitNodeKind;
};

type KitFlowNode = Node<KitNodeData, "kitNode">;

type KitPart = KitNodeData;

export function assessConceptMap(
  snapshot: ConceptMapSnapshot,
  correctValues: Record<string, string>,
  connections: ReadonlyArray<ConceptConnection> = correctConceptMapConnections,
) {
  return assessStructure(snapshot, correctValues, connections);
}

function nodeKind(componentKey: string): KitNodeKind {
  return componentKey.endsWith("Link") ? "relation" : "concept";
}

function KitConceptNode({ data, selected }: NodeProps<KitFlowNode>) {
  const isRelation = data.kind === "relation";

  return (
    <div
      className={`min-w-32 border px-4 py-3 text-center shadow-sm ${
        isRelation
          ? "rounded-full border-blue-500 bg-blue-50 text-blue-700"
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
      source,
      target,
    })),
  };
}

export default function FreeConceptMap({
  mapLabel,
  onChange,
  definitions = pronunciationComponentDefinitions,
}: {
  mapLabel: string;
  definitions?: ReadonlyArray<ComponentDefinition>;
  onChange: (snapshot: ConceptMapSnapshot) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<KitFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flowInstance, setFlowInstance] =
    useState<ReactFlowInstance<KitFlowNode, Edge> | null>(null);

  const [sourceNode, setSourceNode] = useState("");
  const [targetNode, setTargetNode] = useState("");

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

    let part: KitPart;
    try {
      part = JSON.parse(serializedPart) as KitPart;
      if (!part || !definitions.some((definition) => definition.key === part.componentKey && definition.options.some(([value]) => value === part.value))) return;
    } catch {
      return;
    }
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
        <p className="mt-2 text-sm leading-6 text-slate-600">部品はクリックまたはドラッグで追加できます。同じ項目の別の部品を選ぶと置き換わります。</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
          {definitions.map((definition) => (
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
                          ? "rounded-full border-blue-400 bg-blue-50 text-blue-700"
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
        <p className="mb-3 text-sm leading-6 text-slate-600">下の接続点から別の部品の上の接続点へ線を引きます。画面下の選択欄からも接続・削除できます。「全体を表示」で全ての部品を見渡せます。</p>
        <button type="button" onClick={() => flowInstance?.fitView({ padding: 0.2 })} className="mb-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">全体を表示</button>
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
        <fieldset className="mt-4 min-w-0 rounded-2xl border border-slate-200 p-4">
          <legend className="font-bold text-slate-700">選択して接続する</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0 text-sm text-slate-700">接続元
              <select aria-label="接続元" value={sourceNode} onChange={(event) => setSourceNode(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2">
                <option value="">部品を選ぶ</option>
                {nodes.map((node) => <option key={node.id} value={node.id}>{definitions.find((item) => item.key === node.id)?.label}：{node.data.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm text-slate-700">接続先
              <select aria-label="接続先" value={targetNode} onChange={(event) => setTargetNode(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2">
                <option value="">部品を選ぶ</option>
                {nodes.map((node) => <option key={node.id} value={node.id}>{definitions.find((item) => item.key === node.id)?.label}：{node.data.label}</option>)}
              </select>
            </label>
          </div>
          <button type="button" disabled={!nodes.some((node) => node.id === sourceNode) || !nodes.some((node) => node.id === targetNode) || sourceNode === targetNode || edges.some((edge) => edge.source === sourceNode && edge.target === targetNode)} onClick={() => onConnect({ source: sourceNode, target: targetNode, sourceHandle: null, targetHandle: null })} className="mt-3 min-h-11 rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:opacity-40">接続を追加</button>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {edges.map((edge) => <li key={edge.id} className="flex items-center justify-between gap-3"><span className="min-w-0">{nodes.find((node) => node.id === edge.source)?.data.label} → {nodes.find((node) => node.id === edge.target)?.data.label}</span><button type="button" aria-label={`${nodes.find((node) => node.id === edge.source)?.data.label}から${nodes.find((node) => node.id === edge.target)?.data.label}への接続を削除`} onClick={() => setEdges((current) => current.filter((item) => item.id !== edge.id))} className="min-h-11 shrink-0 px-2 text-blue-700 underline">削除</button></li>)}
          </ul>
        </fieldset>
      </div>
    </div>
  );
}
