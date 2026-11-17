export interface GraphConceptNode {
  id: number;
  title: string;
  estimated_duration: number;
  status?: string;
}

export interface GraphPrerequisiteEdge {
  id?: number;
  prerequisite_concept_id: number;
  dependent_concept_id: number;
}

export interface ConceptGraph {
  nodes: GraphConceptNode[];
  edges: GraphPrerequisiteEdge[];
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath: number[];
  cycleTitles: string[];
  message: string;
}

export interface AddEdgeResult {
  valid: boolean;
  graph: ConceptGraph;
  cyclePath: number[];
  cycleTitles: string[];
  reason: string;
}

export interface TopologicalOrderResult {
  valid: boolean;
  order: number[];
  levels: Record<number, number>;
}

export interface UnlockEvaluation {
  conceptId: number;
  title: string;
  isMastered: boolean;
  isUnlocked: boolean;
  status: 'mastered' | 'unlocked' | 'locked';
  missingPrerequisiteIds: number[];
  missingPrerequisiteTitles: string[];
  needsPrerequisiteReview: boolean;
}

export interface LearningPathStep {
  conceptId: number;
  title: string;
  estimatedDuration: number;
  status: 'mastered' | 'unlocked' | 'locked';
  prerequisites: string[];
  stepNumber: number;
}

export interface LearningPathResult {
  targetConceptId: number;
  targetTitle: string;
  alreadyMasteredTarget: boolean;
  totalRequiredCount: number;
  completedPrerequisites: Array<{ conceptId: number; title: string }>;
  remainingSteps: LearningPathStep[];
  estimatedTotalMinutes: number;
  currentPositionConceptId: number | null;
  branchExplanation: string;
}

export interface AffectedLearnerReport {
  learnerId: number;
  newlyLockedConceptIds: number[];
  newlyUnlockedConceptIds: number[];
  pathChanged: boolean;
  previousPathIds: number[];
  updatedPathIds: number[];
  reason: string;
}

/**
 * 1. Add concept node to an in-memory graph representation.
 */
export function addConceptNode(graph: ConceptGraph, concept: GraphConceptNode): ConceptGraph {
  const exists = graph.nodes.some((n) => n.id === concept.id);
  if (exists) {
    return {
      nodes: graph.nodes.map((n) => (n.id === concept.id ? { ...n, ...concept } : n)),
      edges: [...graph.edges],
    };
  }
  return {
    nodes: [...graph.nodes, { ...concept }],
    edges: [...graph.edges],
  };
}

/**
 * 2. Remove concept safely from an in-memory graph, cleaning up incident edges.
 */
export function removeConceptSafely(graph: ConceptGraph, conceptId: number): ConceptGraph {
  return {
    nodes: graph.nodes.filter((n) => n.id !== conceptId),
    edges: graph.edges.filter(
      (e) => e.prerequisite_concept_id !== conceptId && e.dependent_concept_id !== conceptId
    ),
  };
}

/**
 * 3. Add prerequisite edge (prerequisiteId -> dependentId) after cycle validation.
 */
export function addPrerequisiteEdge(
  graph: ConceptGraph,
  prerequisiteId: number,
  dependentId: number
): AddEdgeResult {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  if (!nodeMap.has(prerequisiteId) || !nodeMap.has(dependentId)) {
    return {
      valid: false,
      graph,
      cyclePath: [],
      cycleTitles: [],
      reason: 'Both prerequisite and dependent concepts must exist in the course.',
    };
  }

  if (prerequisiteId === dependentId) {
    const title = nodeMap.get(prerequisiteId)?.title ?? String(prerequisiteId);
    return {
      valid: false,
      graph,
      cyclePath: [prerequisiteId, dependentId],
      cycleTitles: [title, title],
      reason: `Self-dependency detected: "${title}" cannot depend on itself.`,
    };
  }

  const duplicate = graph.edges.some(
    (e) => e.prerequisite_concept_id === prerequisiteId && e.dependent_concept_id === dependentId
  );
  if (duplicate) {
    return {
      valid: false,
      graph,
      cyclePath: [],
      cycleTitles: [],
      reason: 'This prerequisite relationship already exists.',
    };
  }

  const candidateEdges: GraphPrerequisiteEdge[] = [
    ...graph.edges,
    { prerequisite_concept_id: prerequisiteId, dependent_concept_id: dependentId },
  ];

  const cycleResult = detectCycles(graph.nodes, candidateEdges);
  if (cycleResult.hasCycle) {
    return {
      valid: false,
      graph,
      cyclePath: cycleResult.cyclePath,
      cycleTitles: cycleResult.cycleTitles,
      reason: cycleResult.message,
    };
  }

  return {
    valid: true,
    graph: {
      nodes: [...graph.nodes],
      edges: candidateEdges,
    },
    cyclePath: [],
    cycleTitles: [],
    reason: 'Valid prerequisite link added.',
  };
}

/**
 * 4. Remove prerequisite edge.
 */
export function removePrerequisiteEdge(
  graph: ConceptGraph,
  prerequisiteId: number,
  dependentId: number
): ConceptGraph {
  return {
    nodes: [...graph.nodes],
    edges: graph.edges.filter(
      (e) => !(e.prerequisite_concept_id === prerequisiteId && e.dependent_concept_id === dependentId)
    ),
  };
}

/**
 * 5. Detect cycles using 3-color Depth-First Search (DFS) and reconstruct exact cycle path.
 * Colors: 0 = unvisited (WHITE), 1 = visiting (GRAY), 2 = visited (BLACK)
 */
export function detectCycles(
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[]
): CycleDetectionResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<number, number[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    if (adj.has(edge.prerequisite_concept_id) && nodeMap.has(edge.dependent_concept_id)) {
      adj.get(edge.prerequisite_concept_id)!.push(edge.dependent_concept_id);
    }
  }

  const color = new Map<number, number>();
  const parent = new Map<number, number | null>();
  for (const node of nodes) {
    color.set(node.id, 0);
    parent.set(node.id, null);
  }

  let foundCycle: number[] = [];

  const dfs = (u: number): boolean => {
    color.set(u, 1);
    const neighbors = adj.get(u) ?? [];
    for (const v of neighbors) {
      const vColor = color.get(v) ?? 0;
      if (vColor === 1) {
        // Back edge u -> v found; reconstruct cycle v -> ... -> u -> v
        const path: number[] = [v];
        let curr: number | null = u;
        while (curr !== null && curr !== v) {
          path.push(curr);
          curr = parent.get(curr) ?? null;
        }
        path.push(v);
        path.reverse();
        foundCycle = path;
        return true;
      }
      if (vColor === 0) {
        parent.set(v, u);
        if (dfs(v)) {
          return true;
        }
      }
    }
    color.set(u, 2);
    return false;
  };

  for (const node of nodes) {
    if ((color.get(node.id) ?? 0) === 0) {
      if (dfs(node.id)) {
        const cycleTitles = foundCycle.map((id) => nodeMap.get(id)?.title ?? `Concept #${id}`);
        return {
          hasCycle: true,
          cyclePath: foundCycle,
          cycleTitles,
          message: `Circular dependency detected: ${cycleTitles.join(' -> ')}`,
        };
      }
    }
  }

  return {
    hasCycle: false,
    cyclePath: [],
    cycleTitles: [],
    message: 'Graph is a valid Directed Acyclic Graph (DAG).',
  };
}

/**
 * 6. Validate DAG structure.
 */
export function validateDAG(
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[]
): { isValid: boolean; cyclePath: number[]; cycleTitles: string[]; message: string } {
  const res = detectCycles(nodes, edges);
  return {
    isValid: !res.hasCycle,
    cyclePath: res.cyclePath,
    cycleTitles: res.cycleTitles,
    message: res.message,
  };
}

/**
 * 7. Generate topological ordering and topological depth levels using Kahn's algorithm.
 */
export function topologicalSort(
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[]
): TopologicalOrderResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();
  const levels: Record<number, number> = {};

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
    levels[n.id] = 0;
  }

  for (const e of edges) {
    if (nodeIds.has(e.prerequisite_concept_id) && nodeIds.has(e.dependent_concept_id)) {
      adj.get(e.prerequisite_concept_id)!.push(e.dependent_concept_id);
      inDegree.set(e.dependent_concept_id, (inDegree.get(e.dependent_concept_id) ?? 0) + 1);
    }
  }

  const queue: number[] = [];
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
    }
  }

  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      levels[v] = Math.max(levels[v] ?? 0, (levels[u] ?? 0) + 1);
      const nextDeg = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, nextDeg);
      if (nextDeg === 0) {
        queue.push(v);
      }
    }
  }

  return {
    valid: order.length === nodes.length,
    order,
    levels,
  };
}

/**
 * 8. Identify all direct and transitive prerequisite ancestors of a concept via BFS.
 */
export function getPrerequisiteAncestors(
  conceptId: number,
  edges: GraphPrerequisiteEdge[]
): number[] {
  const reverseAdj = new Map<number, number[]>();
  for (const e of edges) {
    if (!reverseAdj.has(e.dependent_concept_id)) {
      reverseAdj.set(e.dependent_concept_id, []);
    }
    reverseAdj.get(e.dependent_concept_id)!.push(e.prerequisite_concept_id);
  }

  const visited = new Set<number>();
  const queue: number[] = [...(reverseAdj.get(conceptId) ?? [])];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const parentId of reverseAdj.get(curr) ?? []) {
      if (!visited.has(parentId)) {
        queue.push(parentId);
      }
    }
  }

  return Array.from(visited);
}

/**
 * 9. Identify all direct and transitive dependent concepts downstream of a concept via BFS.
 */
export function getDependentConcepts(
  conceptId: number,
  edges: GraphPrerequisiteEdge[]
): number[] {
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    if (!adj.has(e.prerequisite_concept_id)) {
      adj.set(e.prerequisite_concept_id, []);
    }
    adj.get(e.prerequisite_concept_id)!.push(e.dependent_concept_id);
  }

  const visited = new Set<number>();
  const queue: number[] = [...(adj.get(conceptId) ?? [])];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    for (const childId of adj.get(curr) ?? []) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return Array.from(visited);
}

/**
 * 10 & 11. Determine concept unlocking & missing prerequisites.
 * A concept unlocks only when ALL its direct prerequisites have been mastered.
 * If a concept was already mastered before a new prerequisite was inserted upstream,
 * its mastery record is preserved and flagged with needsPrerequisiteReview = true.
 */
export function determineConceptUnlocking(
  conceptId: number,
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[],
  masteredSet: Set<number>
): UnlockEvaluation {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const concept = nodeMap.get(conceptId);
  const directPrereqs = edges
    .filter((e) => e.dependent_concept_id === conceptId)
    .map((e) => e.prerequisite_concept_id)
    .filter((id) => nodeMap.has(id));

  const missingIds = directPrereqs.filter((id) => !masteredSet.has(id));
  const missingTitles = missingIds.map((id) => nodeMap.get(id)?.title ?? `Concept #${id}`);
  const isMastered = masteredSet.has(conceptId);
  const allPrereqsMastered = missingIds.length === 0;

  if (isMastered) {
    return {
      conceptId,
      title: concept?.title ?? `Concept #${conceptId}`,
      isMastered: true,
      isUnlocked: true,
      status: 'mastered',
      missingPrerequisiteIds: missingIds,
      missingPrerequisiteTitles: missingTitles,
      needsPrerequisiteReview: missingIds.length > 0,
    };
  }

  return {
    conceptId,
    title: concept?.title ?? `Concept #${conceptId}`,
    isMastered: false,
    isUnlocked: allPrereqsMastered,
    status: allPrereqsMastered ? 'unlocked' : 'locked',
    missingPrerequisiteIds: missingIds,
    missingPrerequisiteTitles: missingTitles,
    needsPrerequisiteReview: false,
  };
}

export function getMissingPrerequisites(
  conceptId: number,
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[],
  masteredSet: Set<number>
): Array<{ id: number; title: string }> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return edges
    .filter((e) => e.dependent_concept_id === conceptId)
    .map((e) => e.prerequisite_concept_id)
    .filter((id) => nodeMap.has(id) && !masteredSet.has(id))
    .map((id) => ({ id, title: nodeMap.get(id)!.title }));
}

/**
 * 12. Calculate personalized shortest valid learning path to reach targetConceptId.
 * Finds all required prerequisite ancestors + targetConceptId, skips already mastered concepts,
 * and returns the remaining concepts in valid topological order across all required branches.
 */
export function calculatePersonalizedLearningPath(
  targetConceptId: number,
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[],
  masteredSet: Set<number>
): LearningPathResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const targetNode = nodeMap.get(targetConceptId);
  if (!targetNode) {
    throw new Error(`Target concept ${targetConceptId} not found in graph.`);
  }

  const ancestorIds = getPrerequisiteAncestors(targetConceptId, edges);
  const requiredSet = new Set<number>([...ancestorIds, targetConceptId]);

  const subNodes = nodes.filter((n) => requiredSet.has(n.id));
  const subEdges = edges.filter(
    (e) => requiredSet.has(e.prerequisite_concept_id) && requiredSet.has(e.dependent_concept_id)
  );

  const topo = topologicalSort(subNodes, subEdges);
  const completedPrerequisites: Array<{ conceptId: number; title: string }> = [];
  const remainingIds: number[] = [];

  for (const id of topo.order) {
    if (masteredSet.has(id)) {
      if (id !== targetConceptId) {
        completedPrerequisites.push({
          conceptId: id,
          title: nodeMap.get(id)?.title ?? `Concept #${id}`,
        });
      }
    } else {
      remainingIds.push(id);
    }
  }

  const remainingSteps: LearningPathStep[] = remainingIds.map((id, idx) => {
    const evalState = determineConceptUnlocking(id, nodes, edges, masteredSet);
    const directPrereqTitles = edges
      .filter((e) => e.dependent_concept_id === id && nodeMap.has(e.prerequisite_concept_id))
      .map((e) => nodeMap.get(e.prerequisite_concept_id)!.title);

    return {
      conceptId: id,
      title: nodeMap.get(id)?.title ?? `Concept #${id}`,
      estimatedDuration: nodeMap.get(id)?.estimated_duration ?? 0,
      status: evalState.status,
      prerequisites: directPrereqTitles,
      stepNumber: idx + 1,
    };
  });

  const estimatedTotalMinutes = calculateEstimatedLearningTime(remainingIds, nodeMap);
  const firstAvailable = remainingSteps.find((s) => s.status === 'unlocked');

  const alreadyMasteredTarget = masteredSet.has(targetConceptId);
  let branchExplanation = '';
  if (alreadyMasteredTarget && remainingSteps.length === 0) {
    branchExplanation = `You have already mastered "${targetNode.title}" and all of its prerequisites.`;
  } else if (remainingSteps.length === 1 && remainingSteps[0].conceptId === targetConceptId) {
    branchExplanation = `All prerequisites for "${targetNode.title}" are complete. You can start "${targetNode.title}" immediately.`;
  } else {
    branchExplanation = `To reach "${targetNode.title}", ${remainingSteps.length} remaining concepts are ordered so every foundational branch is mastered before its dependents (${completedPrerequisites.length} prerequisites already mastered).`;
  }

  return {
    targetConceptId,
    targetTitle: targetNode.title,
    alreadyMasteredTarget,
    totalRequiredCount: requiredSet.size,
    completedPrerequisites,
    remainingSteps,
    estimatedTotalMinutes,
    currentPositionConceptId: firstAvailable?.conceptId ?? remainingSteps[0]?.conceptId ?? null,
    branchExplanation,
  };
}

/**
 * 13. Calculate total estimated learning time (minutes) for a list of concepts.
 */
export function calculateEstimatedLearningTime(
  conceptIds: number[],
  conceptMap: Map<number, GraphConceptNode>
): number {
  return conceptIds.reduce((sum, id) => sum + (conceptMap.get(id)?.estimated_duration ?? 0), 0);
}

/**
 * 14. Recalculate progress and unlock status for every concept in a course.
 */
export function recalculateCourseProgress(
  nodes: GraphConceptNode[],
  edges: GraphPrerequisiteEdge[],
  masteredSet: Set<number>,
  completedLessonSet: Set<number>
) {
  const topo = topologicalSort(nodes, edges);
  const orderedNodes = topo.valid
    ? topo.order.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean)
    : nodes;

  const evaluations = orderedNodes.map((node) => ({
    ...determineConceptUnlocking(node.id, nodes, edges, masteredSet),
    lessonCompleted: completedLessonSet.has(node.id),
    estimatedDuration: node.estimated_duration,
    level: topo.levels[node.id] ?? 0,
  }));

  const masteredCount = evaluations.filter((e) => e.isMastered).length;
  const totalCount = evaluations.length;
  const progressPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return {
    evaluations,
    masteredCount,
    totalCount,
    progressPercentage,
    levels: topo.levels,
    topologicalOrder: topo.order,
  };
}

/**
 * 15. Identify enrolled learners affected by a curriculum restructuring change.
 */
export function identifyAffectedLearners(
  nodes: GraphConceptNode[],
  oldEdges: GraphPrerequisiteEdge[],
  newEdges: GraphPrerequisiteEdge[],
  learnerStates: Array<{
    learnerId: number;
    masteredConceptIds: number[];
    targetConceptId: number | null;
  }>
): AffectedLearnerReport[] {
  const reports: AffectedLearnerReport[] = [];

  for (const learner of learnerStates) {
    const masteredSet = new Set(learner.masteredConceptIds);
    const newlyLockedConceptIds: number[] = [];
    const newlyUnlockedConceptIds: number[] = [];

    for (const node of nodes) {
      const beforeEval = determineConceptUnlocking(node.id, nodes, oldEdges, masteredSet);
      const afterEval = determineConceptUnlocking(node.id, nodes, newEdges, masteredSet);

      if (beforeEval.isUnlocked && !afterEval.isUnlocked) {
        newlyLockedConceptIds.push(node.id);
      } else if (!beforeEval.isUnlocked && afterEval.isUnlocked) {
        newlyUnlockedConceptIds.push(node.id);
      }
    }

    let pathChanged = false;
    let previousPathIds: number[] = [];
    let updatedPathIds: number[] = [];

    if (learner.targetConceptId && nodes.some((n) => n.id === learner.targetConceptId)) {
      const oldPath = calculatePersonalizedLearningPath(
        learner.targetConceptId,
        nodes,
        oldEdges,
        masteredSet
      );
      const newPath = calculatePersonalizedLearningPath(
        learner.targetConceptId,
        nodes,
        newEdges,
        masteredSet
      );
      previousPathIds = oldPath.remainingSteps.map((s) => s.conceptId);
      updatedPathIds = newPath.remainingSteps.map((s) => s.conceptId);
      pathChanged =
        previousPathIds.length !== updatedPathIds.length ||
        previousPathIds.some((id, idx) => id !== updatedPathIds[idx]);
    }

    if (newlyLockedConceptIds.length > 0 || newlyUnlockedConceptIds.length > 0 || pathChanged) {
      const reasons: string[] = [];
      if (newlyLockedConceptIds.length > 0) reasons.push('new prerequisites added');
      if (newlyUnlockedConceptIds.length > 0) reasons.push('prerequisites relaxed');
      if (pathChanged) reasons.push('learning path updated');

      reports.push({
        learnerId: learner.learnerId,
        newlyLockedConceptIds,
        newlyUnlockedConceptIds,
        pathChanged,
        previousPathIds,
        updatedPathIds,
        reason: reasons.join(', '),
      });
    }
  }

  return reports;
}
