import {
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  GitBranch,
  History,
  Link2,
  Plus,
  Scissors,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConceptGraphCanvas } from '../graph/ConceptGraphCanvas';
import { ApiError, apiRequest } from '../services/api';

interface GraphNode {
  id: number;
  title: string;
  description: string;
  estimated_duration: number;
  level: number;
}

interface GraphEdge {
  id: number;
  prerequisite_concept_id: number;
  dependent_concept_id: number;
}

interface CurriculumHistoryEntry {
  id: number;
  instructor_name: string;
  change_type: string;
  previous_structure: string;
  updated_structure: string;
  change_description: string;
  affected_concepts: string;
  affected_learners_count: number;
  created_at: string;
}

interface EnrolledLearnerRow {
  id: number;
  name: string;
  email: string;
  target_title: string | null;
  masteredCount: number;
  totalCount: number;
  progressPercentage: number;
}

export function CurriculumRestructuringPage() {
  const { courseId } = useParams();
  const cid = Number(courseId || 1);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [courseTitle, setCourseTitle] = useState('');
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [history, setHistory] = useState<CurriculumHistoryEntry[]>([]);
  const [learners, setLearners] = useState<EnrolledLearnerRow[]>([]);

  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'learners'>('editor');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [fromId, setFromId] = useState<number | ''>('');
  const [toId, setToId] = useState<number | ''>('');

  const [cycleError, setCycleError] = useState<{
    message: string;
    cyclePath: number[];
    cycleTitles: string[];
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Split Concept Modal state
  const [splitTargetNode, setSplitTargetNode] = useState<GraphNode | null>(null);
  const [splitModules, setSplitModules] = useState<
    Array<{ title: string; description: string; estimated_duration: number }>
  >([
    { title: '', description: '', estimated_duration: 15 },
    { title: '', description: '', estimated_duration: 15 },
  ]);
  const [chainSequentially, setChainSequentially] = useState(true);
  const [migrationPolicy, setMigrationPolicy] = useState('');
  const [splitting, setSplitting] = useState(false);

  const loadAll = useCallback(async () => {
    const [courseRes, graphRes, histRes, learnerRes] = await Promise.all([
      apiRequest<{ course: { title: string } }>(`/courses/${cid}`),
      apiRequest<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/courses/${cid}/graph`),
      apiRequest<{ history: CurriculumHistoryEntry[] }>(`/courses/${cid}/history`),
      apiRequest<{ learners: EnrolledLearnerRow[] }>(`/courses/${cid}/enrolled-learners`),
    ]);

    setCourseTitle(courseRes.course.title);
    setNodes(graphRes.nodes);
    setEdges(graphRes.edges);
    setHistory(histRes.history);
    setLearners(learnerRes.learners);

    setSelectedNodeId((prev) =>
      prev && graphRes.nodes.some((n) => n.id === prev) ? prev : graphRes.nodes[0]?.id ?? null
    );
    if (graphRes.nodes.length >= 2) {
      setFromId((prev) => (prev ? prev : graphRes.nodes[0].id));
      setToId((prev) => (prev ? prev : graphRes.nodes[1].id));
    }
  }, [cid]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'instructor') {
      navigate('/auth', { replace: true });
      return;
    }
    loadAll();
  }, [user, authLoading, navigate, loadAll]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) ?? null : null;
  const incomingEdges = useMemo(
    () => edges.filter((e) => e.dependent_concept_id === selectedNodeId),
    [edges, selectedNodeId]
  );
  const outgoingEdges = useMemo(
    () => edges.filter((e) => e.prerequisite_concept_id === selectedNodeId),
    [edges, selectedNodeId]
  );

  const handleAddEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId) return;
    setCycleError(null);
    setSuccessMsg('');

    try {
      await apiRequest('/graph/prerequisites', {
        method: 'POST',
        body: JSON.stringify({
          courseId: cid,
          prerequisiteConceptId: Number(fromId),
          dependentConceptId: Number(toId),
        }),
      });
      setSuccessMsg(t('graphEditor.edgeAddedSuccess'));
      await loadAll();
    } catch (err) {
      if (err instanceof ApiError) {
        const cyclePath = Array.isArray(err.data.cyclePath) ? (err.data.cyclePath as number[]) : [];
        const cycleTitles = Array.isArray(err.data.cycleTitles)
          ? (err.data.cycleTitles as string[])
          : [];
        setCycleError({
          message: err.message,
          cyclePath,
          cycleTitles,
        });
      }
    }
  };

  const handleRemoveEdge = async (edgeId: number) => {
    setCycleError(null);
    setSuccessMsg('');
    await apiRequest(`/graph/prerequisites/${edgeId}`, { method: 'DELETE' });
    setSuccessMsg(t('graphEditor.edgeRemovedSuccess'));
    await loadAll();
  };

  const openSplitModal = (node: GraphNode) => {
    setSplitTargetNode(node);
    setSplitModules([
      {
        title: `${node.title} — Part 1: Foundations`,
        description: `Core concepts extracted from ${node.title}`,
        estimated_duration: Math.max(10, Math.round(node.estimated_duration / 2)),
      },
      {
        title: `${node.title} — Part 2: Applied Practice`,
        description: `Applied patterns and synthesis for ${node.title}`,
        estimated_duration: Math.max(10, Math.round(node.estimated_duration / 2)),
      },
    ]);
    setChainSequentially(true);
    setMigrationPolicy(t('graphEditor.migrationPolicyDefault'));
  };

  const handleConfirmSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitTargetNode) return;
    setSplitting(true);
    setCycleError(null);
    try {
      const internalLinks = chainSequentially
        ? splitModules.slice(0, -1).map((_, idx) => ({ fromIndex: idx, toIndex: idx + 1 }))
        : [];
      const res = await apiRequest<{ affectedLearnersCount: number }>(
        '/curriculum/split-concept',
        {
          method: 'POST',
          body: JSON.stringify({
            conceptId: splitTargetNode.id,
            newConcepts: splitModules,
            internalLinks,
            incomingTargetIndices: [0],
            outgoingSourceIndices: [splitModules.length - 1],
            migrationPolicy,
          }),
        }
      );
      setSplitTargetNode(null);
      setSuccessMsg(t('graphEditor.splitSuccess', { count: res.affectedLearnersCount }));
      await loadAll();
    } catch (err) {
      if (err instanceof ApiError) {
        setCycleError({ message: err.message, cyclePath: [], cycleTitles: [] });
      }
    } finally {
      setSplitting(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/instructor"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('graphEditor.backInstructor')}
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
            {courseTitle} — {t('graphEditor.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">{t('graphEditor.subtitle')}</p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              activeTab === 'editor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t('graphEditor.tabEditor')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t('graphEditor.tabHistory')} ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('learners')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md cursor-pointer ${
              activeTab === 'learners' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t('graphEditor.tabLearners')} ({learners.length})
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {cycleError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 flex-1">
            <h2 className="font-display font-bold text-sm">{t('graphEditor.cycleRejectedTitle')}</h2>
            <p className="text-sm">{cycleError.message}</p>
            {cycleError.cycleTitles.length > 0 && (
              <div className="text-xs font-mono bg-white/80 border border-rose-200 rounded-lg px-3 py-2 mt-1">
                {cycleError.cycleTitles.join(' → ')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCycleError(null)}
            className="text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Graph Canvas */}
          <div className="lg:col-span-8 space-y-3">
            <ConceptGraphCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => {
                setSelectedNodeId(id);
                setCycleError(null);
              }}
              mode="instructor"
              cycleHighlightIds={cycleError?.cyclePath ?? []}
            />
            <p className="text-xs text-slate-500">{t('graphEditor.clickConnectHint')}</p>
          </div>

          {/* Control Deck */}
          <div className="lg:col-span-4 space-y-6">
            {/* Add Prerequisite Edge Card */}
            <form
              onSubmit={handleAddEdge}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-700" aria-hidden="true" />
                <h2 className="font-display font-bold text-base text-slate-900">
                  {t('graphEditor.addEdgeTitle')}
                </h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('graphEditor.fromConcept')}
                </label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('graphEditor.toConcept')}
                </label>
                <select
                  value={toId}
                  onChange={(e) => setToId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer"
              >
                {t('graphEditor.connectBtn')}
              </button>
            </form>

            {/* Selected Node Details & Restructuring */}
            {selectedNode && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <div className="text-xs font-medium text-indigo-700">
                    {t('graphEditor.selectedNode')}
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
                    {selectedNode.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">{selectedNode.description}</p>
                </div>

                {/* Direct Prerequisites */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-amber-800">
                    {t('graphEditor.directPrereqs')}
                  </div>
                  {incomingEdges.length === 0 ? (
                    <p className="text-xs text-slate-500">{t('graphEditor.noLinks')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {incomingEdges.map((edge) => (
                        <div
                          key={edge.id}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs"
                        >
                          <span className="font-medium text-slate-900">
                            {nodeMap.get(edge.prerequisite_concept_id)?.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEdge(edge.id)}
                            className="text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            {t('graphEditor.removeLink')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Dependents */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-indigo-800">
                    {t('graphEditor.directDependents')}
                  </div>
                  {outgoingEdges.length === 0 ? (
                    <p className="text-xs text-slate-500">{t('graphEditor.noLinks')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {outgoingEdges.map((edge) => (
                        <div
                          key={edge.id}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs"
                        >
                          <span className="font-medium text-slate-900">
                            {nodeMap.get(edge.dependent_concept_id)?.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEdge(edge.id)}
                            className="text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            {t('graphEditor.removeLink')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openSplitModal(selectedNode)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('graphEditor.splitConceptBtn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Curriculum Change History Tab */}
      {activeTab === 'history' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              {t('graphEditor.tabHistory')}
            </h2>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-slate-500">{t('graphEditor.historyEmpty')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((h) => {
                let prevStats = { concepts: 0, edges: 0 };
                let nextStats = { concepts: 0, edges: 0 };
                try {
                  const p = JSON.parse(h.previous_structure);
                  const u = JSON.parse(h.updated_structure);
                  prevStats = {
                    concepts: Array.isArray(p.concepts) ? p.concepts.length : p.concepts || 0,
                    edges: Array.isArray(p.edges) ? p.edges.length : p.edges || 0,
                  };
                  nextStats = {
                    concepts: Array.isArray(u.concepts) ? u.concepts.length : u.concepts || 0,
                    edges: Array.isArray(u.edges) ? u.edges.length : u.edges || 0,
                  };
                } catch {
                  // Ignore parse errors
                }

                return (
                  <div key={h.id} className="py-4 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-700">{h.change_type}</span>
                        <span aria-hidden="true">·</span>
                        <span>{h.instructor_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {t('graphEditor.affectedLearnersCount', {
                            count: h.affected_learners_count,
                          })}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{h.change_description}</p>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {prevStats.concepts} concepts / {prevStats.edges} links → {nextStats.concepts}{' '}
                      concepts / {nextStats.edges} links
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Enrolled / Affected Learners Tab */}
      {activeTab === 'learners' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              {t('instructor.enrolledLearners')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Learner</th>
                  <th className="py-2.5 pr-4 font-semibold">Email</th>
                  <th className="py-2.5 pr-4 font-semibold">Target Concept</th>
                  <th className="py-2.5 text-right font-semibold">Mastery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {learners.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{l.name}</td>
                    <td className="py-3 pr-4 text-xs font-mono text-slate-600">{l.email}</td>
                    <td className="py-3 pr-4 text-xs text-slate-700">{l.target_title || '—'}</td>
                    <td className="py-3 text-right font-mono tabular-nums font-semibold text-indigo-700">
                      {l.masteredCount}/{l.totalCount} ({l.progressPercentage}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Split Concept Modal */}
      {splitTargetNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmSplit}
            className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {t('graphEditor.splitModalTitle')}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {t('graphEditor.splitModalDesc', { title: splitTargetNode.title })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSplitTargetNode(null)}
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {splitModules.map((mod, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700">
                      Module {idx + 1}
                    </span>
                    {splitModules.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSplitModules((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder={t('graphEditor.splitModuleTitle')}
                        value={mod.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSplitModules((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, title: val } : m))
                          );
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={mod.estimated_duration}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSplitModules((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, estimated_duration: val } : m))
                          );
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder={t('graphEditor.splitModuleDesc')}
                    value={mod.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSplitModules((prev) =>
                        prev.map((m, i) => (i === idx ? { ...m, description: val } : m))
                      );
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setSplitModules((prev) => [
                    ...prev,
                    { title: '', description: '', estimated_duration: 15 },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('graphEditor.addSplitModule')}
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={chainSequentially}
                onChange={(e) => setChainSequentially(e.target.checked)}
                className="accent-indigo-700"
              />
              {t('graphEditor.chainSequentially')}
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('graphEditor.migrationPolicyLabel')}
              </label>
              <textarea
                rows={2}
                value={migrationPolicy}
                onChange={(e) => setMigrationPolicy(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSplitTargetNode(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={splitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <GitBranch className="w-3.5 h-3.5" />
                {splitting ? t('common.loading') : t('graphEditor.confirmSplit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
