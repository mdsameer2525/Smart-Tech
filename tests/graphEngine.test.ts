import { describe, expect, it } from 'vitest';
import {
  addConceptNode,
  addPrerequisiteEdge,
  calculateEstimatedLearningTime,
  calculatePersonalizedLearningPath,
  detectCycles,
  determineConceptUnlocking,
  getDependentConcepts,
  getMissingPrerequisites,
  getPrerequisiteAncestors,
  identifyAffectedLearners,
  recalculateCourseProgress,
  removeConceptSafely,
  removePrerequisiteEdge,
  topologicalSort,
  validateDAG,
  type ConceptGraph,
} from '../server/graph/graphEngine.ts';

const sampleGraph: ConceptGraph = {
  nodes: [
    { id: 1, title: 'Variables', estimated_duration: 15 },
    { id: 2, title: 'Conditions', estimated_duration: 20 },
    { id: 3, title: 'Loops', estimated_duration: 25 },
    { id: 4, title: 'Functions', estimated_duration: 30 },
    { id: 5, title: 'Recursion', estimated_duration: 35 },
  ],
  edges: [
    { prerequisite_concept_id: 1, dependent_concept_id: 2 },
    { prerequisite_concept_id: 2, dependent_concept_id: 3 },
    { prerequisite_concept_id: 3, dependent_concept_id: 4 },
    { prerequisite_concept_id: 4, dependent_concept_id: 5 },
  ],
};

describe('Graph Engine — Core DAG & Cycle Detection', () => {
  it('adds and removes concept nodes cleanly', () => {
    const g1 = addConceptNode(sampleGraph, { id: 6, title: 'Trees', estimated_duration: 40 });
    expect(g1.nodes).toHaveLength(6);

    const g2 = removeConceptSafely(g1, 3);
    expect(g2.nodes).toHaveLength(5);
    expect(
      g2.edges.some((e) => e.prerequisite_concept_id === 3 || e.dependent_concept_id === 3)
    ).toBe(false);
  });

  it('accepts valid prerequisite edges and removes edges', () => {
    const res = addPrerequisiteEdge(sampleGraph, 1, 4);
    expect(res.valid).toBe(true);
    expect(res.graph.edges).toHaveLength(5);

    const afterRemove = removePrerequisiteEdge(res.graph, 1, 4);
    expect(afterRemove.edges).toHaveLength(4);
  });

  it('rejects self-loops and multi-hop cycles with exact cycle path', () => {
    const selfLoop = addPrerequisiteEdge(sampleGraph, 2, 2);
    expect(selfLoop.valid).toBe(false);
    expect(selfLoop.cyclePath).toEqual([2, 2]);

    const cycleRes = addPrerequisiteEdge(sampleGraph, 5, 1);
    expect(cycleRes.valid).toBe(false);
    expect(cycleRes.cyclePath).toEqual([1, 2, 3, 4, 5, 1]);
    expect(cycleRes.cycleTitles).toEqual([
      'Variables',
      'Conditions',
      'Loops',
      'Functions',
      'Recursion',
      'Variables',
    ]);
  });

  it('validates DAG and computes topological order', () => {
    const valid = validateDAG(sampleGraph.nodes, sampleGraph.edges);
    expect(valid.isValid).toBe(true);

    const invalid = detectCycles(sampleGraph.nodes, [
      ...sampleGraph.edges,
      { prerequisite_concept_id: 4, dependent_concept_id: 2 },
    ]);
    expect(invalid.hasCycle).toBe(true);

    const topo = topologicalSort(sampleGraph.nodes, sampleGraph.edges);
    expect(topo.valid).toBe(true);
    expect(topo.order).toEqual([1, 2, 3, 4, 5]);
  });

  it('discovers prerequisite ancestors and dependent concepts via BFS', () => {
    const ancestors = getPrerequisiteAncestors(4, sampleGraph.edges);
    expect(ancestors.sort()).toEqual([1, 2, 3]);

    const dependents = getDependentConcepts(2, sampleGraph.edges);
    expect(dependents.sort()).toEqual([3, 4, 5]);
  });
});

describe('Graph Engine — Mastery Unlocking & Personalized Learning Paths', () => {
  it('enforces mastery of all direct prerequisites before unlocking', () => {
    const mastered = new Set([1, 2]); // Loops (3) not mastered
    const evalFunctions = determineConceptUnlocking(4, sampleGraph.nodes, sampleGraph.edges, mastered);
    expect(evalFunctions.isUnlocked).toBe(false);
    expect(evalFunctions.status).toBe('locked');
    expect(evalFunctions.missingPrerequisiteTitles).toEqual(['Loops']);

    const missing = getMissingPrerequisites(3, sampleGraph.nodes, sampleGraph.edges, mastered);
    expect(missing).toEqual([]);
    const evalLoops = determineConceptUnlocking(3, sampleGraph.nodes, sampleGraph.edges, mastered);
    expect(evalLoops.isUnlocked).toBe(true);
  });

  it('calculates minimal personalized learning path skipping mastered concepts and sums time', () => {
    const mastered = new Set([1, 2]);
    const path = calculatePersonalizedLearningPath(
      5,
      sampleGraph.nodes,
      sampleGraph.edges,
      mastered
    );

    expect(path.completedPrerequisites.map((p) => p.title)).toEqual(['Variables', 'Conditions']);
    expect(path.remainingSteps.map((s) => s.title)).toEqual(['Loops', 'Functions', 'Recursion']);
    expect(path.estimatedTotalMinutes).toBe(25 + 30 + 35);

    const map = new Map(sampleGraph.nodes.map((n) => [n.id, n]));
    expect(calculateEstimatedLearningTime([3, 4, 5], map)).toBe(90);
  });

  it('handles multi-branch prerequisite ordering properly', () => {
    const multiBranch: ConceptGraph = {
      nodes: [
        { id: 1, title: 'Variables', estimated_duration: 10 },
        { id: 2, title: 'Loops', estimated_duration: 20 },
        { id: 3, title: 'Pointers', estimated_duration: 20 },
        { id: 4, title: 'Data Structures', estimated_duration: 30 },
      ],
      edges: [
        { prerequisite_concept_id: 1, dependent_concept_id: 2 },
        { prerequisite_concept_id: 1, dependent_concept_id: 3 },
        { prerequisite_concept_id: 2, dependent_concept_id: 4 },
        { prerequisite_concept_id: 3, dependent_concept_id: 4 },
      ],
    };

    const path = calculatePersonalizedLearningPath(
      4,
      multiBranch.nodes,
      multiBranch.edges,
      new Set([1])
    );
    const titles = path.remainingSteps.map((s) => s.title);
    expect(titles).toContain('Loops');
    expect(titles).toContain('Pointers');
    expect(titles[titles.length - 1]).toBe('Data Structures');
    expect(path.estimatedTotalMinutes).toBe(70);
  });

  it('recalculates course progress and identifies affected learners when edges change', () => {
    const prog = recalculateCourseProgress(
      sampleGraph.nodes,
      sampleGraph.edges,
      new Set([1, 2]),
      new Set([1, 2, 3])
    );
    expect(prog.masteredCount).toBe(2);
    expect(prog.progressPercentage).toBe(40);

    const newEdges = [
      ...sampleGraph.edges,
      { prerequisite_concept_id: 1, dependent_concept_id: 5 },
    ];
    const reports = identifyAffectedLearners(sampleGraph.nodes, sampleGraph.edges, newEdges, [
      { learnerId: 10, masteredConceptIds: [1, 2], targetConceptId: 5 },
      { learnerId: 11, masteredConceptIds: [1, 2, 3, 4], targetConceptId: 5 },
    ]);
    // Both have mastered 1 so edge 1->5 doesn't lock 5 or change remaining steps
    expect(reports).toHaveLength(0);

    // Adding unmastered prereq 3 -> 4 when learner mastered [1,2] vs removing 3->4
    const relaxedEdges = sampleGraph.edges.filter(
      (e) => !(e.prerequisite_concept_id === 3 && e.dependent_concept_id === 4)
    );
    const affected = identifyAffectedLearners(sampleGraph.nodes, sampleGraph.edges, relaxedEdges, [
      { learnerId: 10, masteredConceptIds: [1, 2], targetConceptId: 5 },
    ]);
    expect(affected).toHaveLength(1);
    expect(affected[0].newlyUnlockedConceptIds).toContain(4);
    expect(affected[0].pathChanged).toBe(true);
  });
});
