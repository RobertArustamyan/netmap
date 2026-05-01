"use client";

import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge as RFEdge,
  type Connection,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { createClient } from "@/lib/supabase";
import { contactsApi, edgesApi, pathsApi } from "@/lib/api";

// ─── API types ───────────────────────────────────────────────────────────────

interface ContactRead {
  id: string;
  name: string;
  job_title: string | null;
  company: string | null;
  is_self: boolean;
}

interface EdgeRead {
  id: string;
  workspace_id: string;
  source_contact_id: string;
  target_contact_id: string;
  label: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PathStep {
  contact: ContactRead;
  via_edge: EdgeRead | null;
}

interface PathResult {
  found: boolean;
  paths: PathStep[][];
  from_contact: ContactRead;
  to_contact: ContactRead;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function randomPosition(): { x: number; y: number } {
  return {
    x: Math.random() * 600,
    y: Math.random() * 400,
  };
}

// ─── Custom node ─────────────────────────────────────────────────────────────

interface ContactNodeData {
  label: string;
  subtitle: string;
  is_self: boolean;
}

function ContactNode({ data }: NodeProps<ContactNodeData>) {
  if (data.is_self) {
    return (
      <div className="bg-indigo-600 border border-indigo-700 rounded-lg shadow-sm px-4 py-3 min-w-[140px] max-w-[200px] cursor-default">
        <Handle type="target" position={Position.Top} className="!bg-indigo-300" />
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-indigo-200 bg-indigo-500 rounded-full px-1.5 py-0.5 mb-1">
          Member
        </span>
        <p className="text-sm font-semibold text-white truncate">{data.label}</p>
        {data.subtitle && (
          <p className="text-xs text-indigo-200 mt-0.5 truncate">{data.subtitle}</p>
        )}
        <Handle type="source" position={Position.Bottom} className="!bg-indigo-300" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[140px] max-w-[200px] cursor-default">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <p className="text-sm font-semibold text-gray-900 truncate">{data.label}</p>
      {data.subtitle && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{data.subtitle}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

const nodeTypes = { contactNode: ContactNode };

// ─── Inner canvas (needs ReactFlowProvider context) ───────────────────────────

interface InnerGraphProps {
  workspaceId: string;
  contacts: ContactRead[];
  initialRFNodes: Node<ContactNodeData>[];
  initialRFEdges: RFEdge[];
  onEdgeCreated: (edge: RFEdge) => void;
  onEdgeDeleted: (edgeId: string) => void;
}

function InnerGraph({
  workspaceId,
  contacts,
  initialRFNodes,
  initialRFEdges,
  onEdgeCreated,
  onEdgeDeleted,
}: InnerGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialRFNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialRFEdges);
  const [search, setSearch] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  // ── Path-find state ────────────────────────────────────────────────────────
  const [pathMode, setPathMode] = useState(false);
  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [pathTo, setPathTo] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  // Keep nodes in sync when initialRFNodes changes (e.g. after data load)
  useEffect(() => {
    setNodes(initialRFNodes);
  }, [initialRFNodes, setNodes]);

  useEffect(() => {
    setEdges(initialRFEdges);
  }, [initialRFEdges, setEdges]);

  // ── Search / filter: dim non-matching nodes ─────────────────────────────
  useEffect(() => {
    // Don't apply search highlighting when path mode is active
    if (pathMode) return;

    const q = search.trim().toLowerCase();
    setNodes((prev) =>
      prev.map((node) => {
        const matches =
          !q ||
          node.data.label.toLowerCase().includes(q) ||
          node.data.subtitle.toLowerCase().includes(q);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: matches ? 1 : 0.2,
          },
        };
      })
    );
  }, [search, setNodes, pathMode]);

  // ── Path-find: fetch path from API ─────────────────────────────────────────
  useEffect(() => {
    if (!pathFrom || !pathTo) return;

    let cancelled = false;

    async function fetchPath() {
      setPathLoading(true);
      setPathResult(null);

      try {
        const token = await getAccessToken();
        const result: PathResult = await pathsApi.find(
          token,
          workspaceId,
          pathFrom!,
          pathTo!,
        ) as PathResult;

        if (cancelled) return;

        setPathResult(result);

        // Apply highlighting
        if (result.found && result.paths.length > 0) {
          const pathNodes = new Set(result.paths[0].map((s) => s.contact.id));
          const pathEdgeIds = new Set(
            result.paths[0]
              .map((s) => s.via_edge?.id)
              .filter((id): id is string => Boolean(id))
          );

          setNodes((prev) =>
            prev.map((node) => ({
              ...node,
              style: {
                ...node.style,
                opacity: pathNodes.has(node.id) ? 1 : 0.25,
                outline: pathNodes.has(node.id)
                  ? "2px solid #22c55e"
                  : undefined,
                outlineOffset: pathNodes.has(node.id) ? "2px" : undefined,
                borderRadius: pathNodes.has(node.id) ? "10px" : undefined,
                boxShadow: pathNodes.has(node.id)
                  ? "0 0 0 4px rgba(134,239,172,0.5)"
                  : undefined,
              },
            }))
          );

          setEdges((prev) =>
            prev.map((edge) => ({
              ...edge,
              style: pathEdgeIds.has(edge.id)
                ? { stroke: "#22c55e", strokeWidth: 3 }
                : { opacity: 0.15 },
              animated: pathEdgeIds.has(edge.id),
            }))
          );
        } else {
          // No path: reset styles
          setNodes((prev) =>
            prev.map((node) => ({
              ...node,
              style: {
                ...node.style,
                opacity: 1,
                outline: undefined,
                outlineOffset: undefined,
                borderRadius: undefined,
                boxShadow: undefined,
              },
            }))
          );
          setEdges((prev) =>
            prev.map((edge) => ({
              ...edge,
              style: {},
              animated: false,
            }))
          );
        }
      } catch {
        // silently ignore network errors
      } finally {
        if (!cancelled) setPathLoading(false);
      }
    }

    fetchPath();
    return () => {
      cancelled = true;
    };
  }, [pathFrom, pathTo, workspaceId, setNodes, setEdges]);

  // ── Clear path mode ─────────────────────────────────────────────────────────
  const clearPath = useCallback(() => {
    setPathMode(false);
    setPathFrom(null);
    setPathTo(null);
    setPathResult(null);
    setPathLoading(false);

    // Restore all nodes and edges to default appearance
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        style: {
          opacity: 1,
          outline: undefined,
          outlineOffset: undefined,
          borderRadius: undefined,
          boxShadow: undefined,
        },
      }))
    );
    setEdges((prev) =>
      prev.map((edge) => ({
        ...edge,
        style: {},
        animated: false,
      }))
    );
  }, [setNodes, setEdges]);

  // ── Toggle path mode ────────────────────────────────────────────────────────
  const togglePathMode = useCallback(() => {
    if (pathMode) {
      clearPath();
    } else {
      setPathMode(true);
      setPathFrom(null);
      setPathTo(null);
      setPathResult(null);
    }
  }, [pathMode, clearPath]);

  // ── Connect handler: POST edge to API ────────────────────────────────────
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        const token = await getAccessToken();
        const created: EdgeRead = await edgesApi.create(token, workspaceId, {
          source_contact_id: connection.source,
          target_contact_id: connection.target,
        }) as EdgeRead;
        const newRFEdge: RFEdge = {
          id: created.id,
          source: created.source_contact_id,
          target: created.target_contact_id,
          label: created.label ?? "",
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        };

        setEdges((prev) => addEdge(newRFEdge, prev));
        onEdgeCreated(newRFEdge);
      } catch {
        // silently ignore network errors — the connection simply won't appear
      }
    },
    [workspaceId, setEdges, onEdgeCreated]
  );

  // ── Node click: path-find mode handler ───────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!pathMode) return;
      if (pathLoading) return;

      if (!pathFrom) {
        setPathFrom(node.id);
        // Add green ring to the selected "from" node immediately
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            style:
              n.id === node.id
                ? {
                    ...n.style,
                    outline: "2px solid #22c55e",
                    outlineOffset: "2px",
                    borderRadius: "10px",
                    boxShadow: "0 0 0 4px rgba(134,239,172,0.5)",
                  }
                : n.style,
          }))
        );
        return;
      }

      // Same node as from — ignore
      if (node.id === pathFrom) return;

      setPathTo(node.id);
    },
    [pathMode, pathLoading, pathFrom, setNodes]
  );

  // ── Edge click: select / highlight ───────────────────────────────────────
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: RFEdge) => {
      if (pathMode) return; // ignore edge clicks in path mode
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
    },
    [pathMode]
  );

  // ── Delete selected edge ──────────────────────────────────────────────────
  const handleDeleteEdge = useCallback(async () => {
    if (!selectedEdgeId) return;

    try {
      const token = await getAccessToken();
      await edgesApi.remove(token, workspaceId, selectedEdgeId);
      setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
      onEdgeDeleted(selectedEdgeId);
      setSelectedEdgeId(null);
    } catch {
      // silently ignore
    }
  }, [selectedEdgeId, workspaceId, setEdges, onEdgeDeleted]);

  // ── Deselect edge when clicking the pane ─────────────────────────────────
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  // ── Path panel display helpers ─────────────────────────────────────────────
  const fromContact = pathFrom
    ? contacts.find((c) => c.id === pathFrom)
    : null;

  const pathPanelStatus = (() => {
    if (!pathFrom) return "Select start contact";
    if (!pathTo && !pathLoading) return "Select end contact";
    if (pathLoading) return null; // spinner shown separately
    return null;
  })();

  const firstPath = pathResult?.found && pathResult.paths.length > 0
    ? pathResult.paths[0]
    : null;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (contacts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center h-full text-sm text-gray-400">
        No contacts yet. Add contacts first to build your graph.
      </div>
    );
  }

  return (
    <div className="relative flex-1 h-full">
      {/* Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background gap={20} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.05)"
          className="!border-gray-200 !rounded-lg"
        />
      </ReactFlow>

      {/* Floating overlay: search + toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          disabled={pathMode}
          className="rounded-md border border-gray-200 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52 disabled:opacity-40"
        />
        <button
          onClick={() => fitView({ duration: 400 })}
          className="rounded-md border border-gray-200 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-white transition-colors"
        >
          Fit view
        </button>
        <button
          onClick={togglePathMode}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
            pathMode
              ? "bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700"
              : "border-gray-200 bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white"
          }`}
        >
          Find path
        </button>
      </div>

      {/* Path-find panel */}
      {pathMode && (
        <div className="absolute top-3 right-3 z-10 w-72 rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Path finder</h3>
            <button
              onClick={clearPath}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Status / instructions */}
          {pathPanelStatus && !pathLoading && (
            <p className="text-sm text-gray-600 mb-3">
              {pathPanelStatus}
            </p>
          )}

          {/* From contact chip */}
          {fromContact && (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">From</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-medium text-green-800 truncate max-w-[180px]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {fromContact.name}
              </span>
            </div>
          )}

          {/* Loading spinner */}
          {pathLoading && (
            <div className="flex items-center gap-2 my-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 shrink-0" />
              <span className="text-sm text-gray-500">Finding path…</span>
            </div>
          )}

          {/* Result: path found */}
          {!pathLoading && pathResult && pathResult.found && firstPath && (
            <div className="mt-2">
              <p className="text-xs font-medium text-green-700 mb-1.5">
                Path found: {firstPath.length - 1} hop{firstPath.length - 1 !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-gray-800 leading-relaxed break-words">
                {firstPath.map((s) => s.contact.name).join(" → ")}
              </p>
              <button
                onClick={clearPath}
                className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Result: no path found */}
          {!pathLoading && pathResult && !pathResult.found && (
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                No connection found between these contacts.
              </p>
              <button
                onClick={() => {
                  setPathFrom(null);
                  setPathTo(null);
                  setPathResult(null);
                  // Reset node/edge styles
                  setNodes((prev) =>
                    prev.map((node) => ({
                      ...node,
                      style: { opacity: 1 },
                    }))
                  );
                  setEdges((prev) =>
                    prev.map((edge) => ({
                      ...edge,
                      style: {},
                      animated: false,
                    }))
                  );
                }}
                className="mt-3 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edge action bar: shown when an edge is selected */}
      {selectedEdge && !pathMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-lg border border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-2.5 shadow-lg">
          <span className="text-sm text-gray-600">
            {selectedEdge.label
              ? `Edge: "${selectedEdge.label}"`
              : "Relationship selected"}
          </span>
          <button
            onClick={handleDeleteEdge}
            className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedEdgeId(null)}
            className="rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

interface GraphClientProps {
  workspaceId: string;
}

export default function GraphClient({ workspaceId }: GraphClientProps) {
  const [contacts, setContacts] = useState<ContactRead[]>([]);
  const [rfNodes, setRFNodes] = useState<Node<ContactNodeData>[]>([]);
  const [rfEdges, setRFEdges] = useState<RFEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();

        const [contactsData, edgesData] = await Promise.all([
          contactsApi.list(token, workspaceId) as Promise<ContactRead[]>,
          edgesApi.list(token, workspaceId) as Promise<EdgeRead[]>,
        ]);

        if (cancelled) return;

        const nodes: Node<ContactNodeData>[] = contactsData.map((c) => ({
          id: c.id,
          type: "contactNode",
          position: randomPosition(),
          data: {
            label: c.name,
            subtitle: c.job_title ?? c.company ?? "",
            is_self: c.is_self,
          },
        }));

        const edges: RFEdge[] = edgesData.map((e) => ({
          id: e.id,
          source: e.source_contact_id,
          target: e.target_contact_id,
          label: e.label ?? "",
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        }));

        setContacts(contactsData);
        setRFNodes(nodes);
        setRFEdges(edges);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load graph.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
          <p className="text-sm text-gray-400">Loading graph…</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-md bg-red-100 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <InnerGraph
        workspaceId={workspaceId}
        contacts={contacts}
        initialRFNodes={rfNodes}
        initialRFEdges={rfEdges}
        onEdgeCreated={(edge) => setRFEdges((prev) => [...prev, edge])}
        onEdgeDeleted={(id) =>
          setRFEdges((prev) => prev.filter((e) => e.id !== id))
        }
      />
    </ReactFlowProvider>
  );
}
