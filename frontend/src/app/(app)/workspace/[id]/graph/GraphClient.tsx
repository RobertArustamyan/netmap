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

// ─── API types ───────────────────────────────────────────────────────────────

interface ContactRead {
  id: string;
  name: string;
  job_title: string | null;
  company: string | null;
}

interface EdgeRead {
  id: string;
  workspace_id: string;
  source_contact_id: string;
  target_contact_id: string;
  label: string | null;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
}

function ContactNode({ data }: NodeProps<ContactNodeData>) {
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

  // Keep nodes in sync when initialRFNodes changes (e.g. after data load)
  useEffect(() => {
    setNodes(initialRFNodes);
  }, [initialRFNodes, setNodes]);

  useEffect(() => {
    setEdges(initialRFEdges);
  }, [initialRFEdges, setEdges]);

  // ── Search / filter: dim non-matching nodes ─────────────────────────────
  useEffect(() => {
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
  }, [search, setNodes]);

  // ── Connect handler: POST edge to API ────────────────────────────────────
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      try {
        const token = await getAccessToken();
        const res = await fetch(
          `${API}/api/v1/workspaces/${workspaceId}/edges`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              source_contact_id: connection.source,
              target_contact_id: connection.target,
            }),
          }
        );

        if (!res.ok) return;

        const created: EdgeRead = await res.json();
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

  // ── Edge click: select / highlight ───────────────────────────────────────
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: RFEdge) => {
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
    },
    []
  );

  // ── Delete selected edge ──────────────────────────────────────────────────
  const handleDeleteEdge = useCallback(async () => {
    if (!selectedEdgeId) return;

    try {
      const token = await getAccessToken();
      const res = await fetch(
        `${API}/api/v1/workspaces/${workspaceId}/edges/${selectedEdgeId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok || res.status === 204) {
        setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
        onEdgeDeleted(selectedEdgeId);
        setSelectedEdgeId(null);
      }
    } catch {
      // silently ignore
    }
  }, [selectedEdgeId, workspaceId, setEdges, onEdgeDeleted]);

  // ── Deselect edge when clicking the pane ─────────────────────────────────
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

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
          className="rounded-md border border-gray-200 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
        />
        <button
          onClick={() => fitView({ duration: 400 })}
          className="rounded-md border border-gray-200 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-white transition-colors"
        >
          Fit view
        </button>
      </div>

      {/* Edge action bar: shown when an edge is selected */}
      {selectedEdge && (
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
        const headers = { Authorization: `Bearer ${token}` };

        const [contactsRes, edgesRes] = await Promise.all([
          fetch(`${API}/api/v1/workspaces/${workspaceId}/contacts`, {
            headers,
          }),
          fetch(`${API}/api/v1/workspaces/${workspaceId}/edges`, { headers }),
        ]);

        if (!contactsRes.ok) throw new Error("Failed to load contacts.");
        if (!edgesRes.ok) throw new Error("Failed to load relationships.");

        const contactsData: ContactRead[] = await contactsRes.json();
        const edgesData: EdgeRead[] = await edgesRes.json();

        if (cancelled) return;

        const nodes: Node<ContactNodeData>[] = contactsData.map((c) => ({
          id: c.id,
          type: "contactNode",
          position: randomPosition(),
          data: {
            label: c.name,
            subtitle: c.job_title ?? c.company ?? "",
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
