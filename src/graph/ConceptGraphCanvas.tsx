import { CheckCircle2, Lock, PlayCircle, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CanvasConceptNode {
  id: number;
  title: string;
  estimated_duration: number;
  level?: number;
  status?: 'mastered' | 'unlocked' | 'locked' | string;
}

export interface CanvasEdge {
  id?: number;
  prerequisite_concept_id: number;
  dependent_concept_id: number;
}

interface ConceptGraphCanvasProps {
  nodes: CanvasConceptNode[];
  edges: CanvasEdge[];
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
  mode: 'learner' | 'instructor';
  highlightedPathIds?: number[];
  cycleHighlightIds?: number[];
  onEdgeClick?: (edge: CanvasEdge) => void;
}

const NODE_WIDTH = 208;
const NODE_HEIGHT = 76;
const COL_GAP = 86;
const ROW_GAP = 32;
const PADDING = 40;

export function ConceptGraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  mode,
  highlightedPathIds = [],
  cycleHighlightIds = [],
  onEdgeClick,
}: ConceptGraphCanvasProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(0.88);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ startX: number; startY: number } | null>(null);

  // Compute deterministic topological layers if level is missing
  const layout = useMemo(() => {
    const levelMap = new Map<number, number>();
    const hasLevels = nodes.every((n) => typeof n.level === 'number');

    if (hasLevels) {
      for (const n of nodes) levelMap.set(n.id, n.level ?? 0);
    } else {
      const inDeg = new Map<number, number>();
      const adj = new Map<number, number[]>();
      for (const n of nodes) {
        inDeg.set(n.id, 0);
        adj.set(n.id, []);
        levelMap.set(n.id, 0);
      }
      for (const e of edges) {
        adj.get(e.prerequisite_concept_id)?.push(e.dependent_concept_id);
        inDeg.set(e.dependent_concept_id, (inDeg.get(e.dependent_concept_id) ?? 0) + 1);
      }
      const q = nodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id);
      while (q.length > 0) {
        const u = q.shift()!;
        for (const v of adj.get(u) ?? []) {
          levelMap.set(v, Math.max(levelMap.get(v) ?? 0, (levelMap.get(u) ?? 0) + 1));
          const next = (inDeg.get(v) ?? 0) - 1;
          inDeg.set(v, next);
          if (next === 0) q.push(v);
        }
      }
    }

    const columns = new Map<number, CanvasConceptNode[]>();
    for (const n of nodes) {
      const lvl = levelMap.get(n.id) ?? 0;
      if (!columns.has(lvl)) columns.set(lvl, []);
      columns.get(lvl)!.push(n);
    }

    const sortedLevels = Array.from(columns.keys()).sort((a, b) => a - b);
    const maxRows = Math.max(1, ...sortedLevels.map((l) => columns.get(l)!.length));
    const totalHeight = Math.max(460, maxRows * (NODE_HEIGHT + ROW_GAP) + PADDING * 2);
    const totalWidth = Math.max(
      760,
      sortedLevels.length * (NODE_WIDTH + COL_GAP) - COL_GAP + PADDING * 2
    );

    const positions = new Map<number, { x: number; y: number }>();
    sortedLevels.forEach((lvl, colIdx) => {
      const colNodes = columns.get(lvl)!;
      const colContentHeight = colNodes.length * NODE_HEIGHT + (colNodes.length - 1) * ROW_GAP;
      const startY = (totalHeight - colContentHeight) / 2;
      colNodes.forEach((n, rowIdx) => {
        positions.set(n.id, {
          x: PADDING + colIdx * (NODE_WIDTH + COL_GAP),
          y: startY + rowIdx * (NODE_HEIGHT + ROW_GAP),
        });
      });
    });

    return { positions, totalWidth, totalHeight };
  }, [nodes, edges]);

  const highlightedPathSet = useMemo(() => new Set(highlightedPathIds), [highlightedPathIds]);
  const cycleSet = useMemo(() => new Set(cycleHighlightIds), [cycleHighlightIds]);

  const selectedIncoming = useMemo(() => {
    if (!selectedNodeId) return new Set<number>();
    return new Set(
      edges
        .filter((e) => e.dependent_concept_id === selectedNodeId)
        .map((e) => e.prerequisite_concept_id)
    );
  }, [edges, selectedNodeId]);

  const selectedOutgoing = useMemo(() => {
    if (!selectedNodeId) return new Set<number>();
    return new Set(
      edges
        .filter((e) => e.prerequisite_concept_id === selectedNodeId)
        .map((e) => e.dependent_concept_id)
    );
  }, [edges, selectedNodeId]);

  const isEdgeInCycle = (e: CanvasEdge) => {
    if (cycleHighlightIds.length < 2) return false;
    for (let i = 0; i < cycleHighlightIds.length - 1; i++) {
      if (
        cycleHighlightIds[i] === e.prerequisite_concept_id &&
        cycleHighlightIds[i + 1] === e.dependent_concept_id
      ) {
        return true;
      }
    }
    return false;
  };

  const getNodeStyle = (node: CanvasConceptNode) => {
    const isSelected = node.id === selectedNodeId;
    const inCycle = cycleSet.has(node.id);
    const inPath = highlightedPathSet.has(node.id);
    const isPrereqOfSelected = selectedIncoming.has(node.id);
    const isDependentOfSelected = selectedOutgoing.has(node.id);

    if (inCycle) {
      return 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-200';
    }
    if (isSelected) {
      return 'bg-indigo-50 border-indigo-700 text-slate-900 ring-2 ring-indigo-200';
    }
    if (mode === 'learner') {
      if (node.status === 'mastered') {
        return 'bg-emerald-50/70 border-emerald-400 text-slate-900 hover:border-emerald-600';
      }
      if (node.status === 'unlocked') {
        return inPath
          ? 'bg-indigo-50/80 border-indigo-500 text-slate-900 ring-1 ring-indigo-300'
          : 'bg-white border-indigo-300 text-slate-900 hover:border-indigo-500';
      }
      return inPath
        ? 'bg-amber-50/60 border-amber-400 text-slate-800'
        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300';
    }

    if (isPrereqOfSelected) {
      return 'bg-amber-50/70 border-amber-500 text-slate-900';
    }
    if (isDependentOfSelected) {
      return 'bg-indigo-50/70 border-indigo-400 text-slate-900';
    }
    return 'bg-white border-slate-200 text-slate-900 hover:border-slate-400';
  };

  if (nodes.length === 0) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-12 text-center text-sm text-slate-500">
        No concepts in this graph yet.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          {mode === 'learner' ? (
            <>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t('status.mastered')}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
                <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {t('status.unlocked')}
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                {t('status.locked')}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium text-slate-700">{t('graphEditor.dagValidBadge')}</span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="text-amber-700 font-medium">{t('graphEditor.directPrereqs')}</span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="text-indigo-700 font-medium">{t('graphEditor.directDependents')}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono tabular-nums text-slate-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(0.88);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Pannable Viewport */}
      <div
        className="relative h-[470px] overflow-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:18px_18px] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button[data-node-id]')) return;
          setDragging({ startX: e.clientX - pan.x, startY: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          setPan({ x: e.clientX - dragging.startX, y: e.clientY - dragging.startY });
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        <div
          style={{
            width: layout.totalWidth,
            height: layout.totalHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          className="relative transition-transform duration-75"
        >
          {/* Directed Edges SVG */}
          <svg
            width={layout.totalWidth}
            height={layout.totalHeight}
            className="absolute inset-0 pointer-events-none"
          >
            <defs>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-indigo"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#4338ca" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#d97706" />
              </marker>
              <marker
                id="arrow-crimson"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#dc2626" />
              </marker>
            </defs>

            {edges.map((edge, idx) => {
              const fromPos = layout.positions.get(edge.prerequisite_concept_id);
              const toPos = layout.positions.get(edge.dependent_concept_id);
              if (!fromPos || !toPos) return null;

              const x1 = fromPos.x + NODE_WIDTH;
              const y1 = fromPos.y + NODE_HEIGHT / 2;
              const x2 = toPos.x - 4;
              const y2 = toPos.y + NODE_HEIGHT / 2;
              const dx = Math.max(40, Math.abs(x2 - x1) * 0.48);
              const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              const isCycle = isEdgeInCycle(edge);
              const isRelatedToSelected =
                selectedNodeId !== null &&
                (edge.prerequisite_concept_id === selectedNodeId ||
                  edge.dependent_concept_id === selectedNodeId);
              const isPathEdge =
                highlightedPathSet.has(edge.prerequisite_concept_id) &&
                highlightedPathSet.has(edge.dependent_concept_id);

              let stroke = '#cbd5e1';
              let strokeWidth = 1.75;
              let markerEnd = 'url(#arrow-default)';

              if (isCycle) {
                stroke = '#dc2626';
                strokeWidth = 3;
                markerEnd = 'url(#arrow-crimson)';
              } else if (edge.dependent_concept_id === selectedNodeId) {
                stroke = '#d97706';
                strokeWidth = 2.5;
                markerEnd = 'url(#arrow-amber)';
              } else if (edge.prerequisite_concept_id === selectedNodeId || isPathEdge) {
                stroke = '#4338ca';
                strokeWidth = 2.5;
                markerEnd = 'url(#arrow-indigo)';
              } else if (isRelatedToSelected) {
                stroke = '#4338ca';
                strokeWidth = 2.25;
                markerEnd = 'url(#arrow-indigo)';
              }

              return (
                <g
                  key={edge.id ?? `${edge.prerequisite_concept_id}-${edge.dependent_concept_id}-${idx}`}
                  className={onEdgeClick ? 'pointer-events-auto cursor-pointer' : ''}
                  onClick={() => onEdgeClick?.(edge)}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    markerEnd={markerEnd}
                  />
                </g>
              );
            })}
          </svg>

          {/* Concept Nodes */}
          {nodes.map((node) => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;

            const statusLabel =
              node.status === 'mastered'
                ? t('status.mastered')
                : node.status === 'unlocked'
                ? t('status.unlocked')
                : node.status === 'locked'
                ? t('status.locked')
                : `${node.estimated_duration}m`;

            return (
              <button
                key={node.id}
                type="button"
                data-node-id={node.id}
                onClick={() => onSelectNode(node.id)}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                className={`absolute text-left rounded-lg border px-3.5 py-2.5 transition-colors cursor-pointer flex flex-col justify-between ${getNodeStyle(
                  node
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-semibold leading-tight line-clamp-2 text-slate-900">
                    {node.title}
                  </span>
                  {mode === 'learner' && node.status === 'mastered' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  {mode === 'learner' && node.status === 'unlocked' && (
                    <PlayCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  {mode === 'learner' && node.status === 'locked' && (
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                  <span>{statusLabel}</span>
                  <span>{node.estimated_duration}m</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
