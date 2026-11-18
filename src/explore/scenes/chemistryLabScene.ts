import * as THREE from 'three';
import { tagSelectable } from '../threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
} from '../types';

type MoleculeId = 'h2o' | 'co2' | 'ch4' | 'nh3' | 'c2h5oh';

interface AtomDef {
  id: string;
  element: string;
  symbol: string;
  atomicNumber: number;
  atomicMass: string;
  valence: string;
  electronegativity: string;
  radius: number;
  color: string;
  pos: [number, number, number];
}

interface BondDef {
  from: number;
  to: number;
  order: 1 | 2;
}

interface MoleculeSpec {
  id: MoleculeId;
  name: string;
  formula: string;
  geometryName: string;
  bondAngle: string;
  atoms: AtomDef[];
  bonds: BondDef[];
}

const MOLECULES: Record<MoleculeId, MoleculeSpec> = {
  h2o: {
    id: 'h2o',
    name: 'Water (H₂O)',
    formula: 'H2O',
    geometryName: 'Bent (Angular)',
    bondAngle: '104.5°',
    atoms: [
      {
        id: 'oxygen_o1',
        element: 'Oxygen',
        symbol: 'O',
        atomicNumber: 8,
        atomicMass: '15.999 u',
        valence: '6 valence electrons (2 lone pairs)',
        electronegativity: '3.44',
        radius: 0.72,
        color: '#dc2626',
        pos: [0, 0.35, 0],
      },
      {
        id: 'hydrogen_h1',
        element: 'Hydrogen (Left)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.42,
        color: '#f8fafc',
        pos: [-1.45, -0.78, 0],
      },
      {
        id: 'hydrogen_h2',
        element: 'Hydrogen (Right)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.42,
        color: '#f8fafc',
        pos: [1.45, -0.78, 0],
      },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
  },
  co2: {
    id: 'co2',
    name: 'Carbon Dioxide (CO₂)',
    formula: 'CO2',
    geometryName: 'Linear',
    bondAngle: '180°',
    atoms: [
      {
        id: 'carbon_c1',
        element: 'Carbon',
        symbol: 'C',
        atomicNumber: 6,
        atomicMass: '12.011 u',
        valence: '4 valence electrons (sp hybridized)',
        electronegativity: '2.55',
        radius: 0.72,
        color: '#334155',
        pos: [0, 0, 0],
      },
      {
        id: 'oxygen_o1',
        element: 'Oxygen (Left)',
        symbol: 'O',
        atomicNumber: 8,
        atomicMass: '15.999 u',
        valence: '6 valence electrons (double bonded)',
        electronegativity: '3.44',
        radius: 0.65,
        color: '#dc2626',
        pos: [-2.15, 0, 0],
      },
      {
        id: 'oxygen_o2',
        element: 'Oxygen (Right)',
        symbol: 'O',
        atomicNumber: 8,
        atomicMass: '15.999 u',
        valence: '6 valence electrons (double bonded)',
        electronegativity: '3.44',
        radius: 0.65,
        color: '#dc2626',
        pos: [2.15, 0, 0],
      },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 2, order: 2 },
    ],
  },
  ch4: {
    id: 'ch4',
    name: 'Methane (CH₄)',
    formula: 'CH4',
    geometryName: 'Tetrahedral',
    bondAngle: '109.5°',
    atoms: [
      {
        id: 'carbon_c1',
        element: 'Carbon',
        symbol: 'C',
        atomicNumber: 6,
        atomicMass: '12.011 u',
        valence: '4 valence electrons (sp³ hybridized)',
        electronegativity: '2.55',
        radius: 0.72,
        color: '#334155',
        pos: [0, 0, 0],
      },
      {
        id: 'hydrogen_h1',
        element: 'Hydrogen (Top)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [0, 1.75, 0],
      },
      {
        id: 'hydrogen_h2',
        element: 'Hydrogen (Front-Left)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [-1.52, -0.58, 0.88],
      },
      {
        id: 'hydrogen_h3',
        element: 'Hydrogen (Front-Right)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [1.52, -0.58, 0.88],
      },
      {
        id: 'hydrogen_h4',
        element: 'Hydrogen (Back)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [0, -0.58, -1.65],
      },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
    ],
  },
  nh3: {
    id: 'nh3',
    name: 'Ammonia (NH₃)',
    formula: 'NH3',
    geometryName: 'Trigonal Pyramidal',
    bondAngle: '107°',
    atoms: [
      {
        id: 'nitrogen_n1',
        element: 'Nitrogen',
        symbol: 'N',
        atomicNumber: 7,
        atomicMass: '14.007 u',
        valence: '5 valence electrons (1 lone pair)',
        electronegativity: '3.04',
        radius: 0.72,
        color: '#2563eb',
        pos: [0, 0.45, 0],
      },
      {
        id: 'hydrogen_h1',
        element: 'Hydrogen (1)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [1.45, -0.55, 0],
      },
      {
        id: 'hydrogen_h2',
        element: 'Hydrogen (2)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [-0.72, -0.55, 1.25],
      },
      {
        id: 'hydrogen_h3',
        element: 'Hydrogen (3)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.4,
        color: '#f8fafc',
        pos: [-0.72, -0.55, -1.25],
      },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
      { from: 0, to: 3, order: 1 },
    ],
  },
  c2h5oh: {
    id: 'c2h5oh',
    name: 'Ethanol (C₂H₅OH)',
    formula: 'C2H5OH',
    geometryName: 'Tetrahedral Carbons + Bent Hydroxyl',
    bondAngle: '109.5° / 104.5°',
    atoms: [
      {
        id: 'carbon_c1',
        element: 'Methyl Carbon (C1)',
        symbol: 'C',
        atomicNumber: 6,
        atomicMass: '12.011 u',
        valence: '4 valence electrons',
        electronegativity: '2.55',
        radius: 0.68,
        color: '#334155',
        pos: [-1.55, 0.1, 0],
      },
      {
        id: 'carbon_c2',
        element: 'Methylene Carbon (C2)',
        symbol: 'C',
        atomicNumber: 6,
        atomicMass: '12.011 u',
        valence: '4 valence electrons',
        electronegativity: '2.55',
        radius: 0.68,
        color: '#334155',
        pos: [0.25, -0.25, 0],
      },
      {
        id: 'oxygen_o1',
        element: 'Hydroxyl Oxygen',
        symbol: 'O',
        atomicNumber: 8,
        atomicMass: '15.999 u',
        valence: '6 valence electrons (polar -OH group)',
        electronegativity: '3.44',
        radius: 0.64,
        color: '#dc2626',
        pos: [1.75, 0.55, 0.25],
      },
      {
        id: 'hydrogen_ho',
        element: 'Hydroxyl Hydrogen',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron (acidic/H-bonding)',
        electronegativity: '2.20',
        radius: 0.36,
        color: '#f8fafc',
        pos: [2.65, 0.05, 0.45],
      },
      {
        id: 'hydrogen_h1',
        element: 'Hydrogen (C1-a)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.36,
        color: '#f8fafc',
        pos: [-2.1, 1.18, 0.3],
      },
      {
        id: 'hydrogen_h2',
        element: 'Hydrogen (C1-b)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.36,
        color: '#f8fafc',
        pos: [-2.1, -0.45, 0.95],
      },
      {
        id: 'hydrogen_h3',
        element: 'Hydrogen (C1-c)',
        symbol: 'H',
        atomicNumber: 1,
        atomicMass: '1.008 u',
        valence: '1 valence electron',
        electronegativity: '2.20',
        radius: 0.36,
        color: '#f8fafc',
        pos: [-2.05, -0.4, -0.98],
      },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 0, to: 4, order: 1 },
      { from: 0, to: 5, order: 1 },
      { from: 0, to: 6, order: 1 },
    ],
  },
};

export function buildChemistryLabScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ExploreSceneController {
  scene.background = new THREE.Color('#eef2ff');

  const root = new THREE.Group();
  scene.add(root);

  const hemi = new THREE.HemisphereLight('#ffffff', '#c7d2fe', 0.95);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(6, 9, 7);
  const rim = new THREE.DirectionalLight('#818cf8', 1.1);
  rim.position.set(-6, -3, -5);
  root.add(hemi, key, rim);

  const moleculePivot = new THREE.Group();
  root.add(moleculePivot);

  let currentMolId: MoleculeId = 'h2o';
  let selectedAtomId: string | null = 'oxygen_o1';
  const atomMeshes = new Map<string, THREE.Group>();

  const partsList: ExplorePartInfo[] = [];

  const rebuildMolecule = (molId: MoleculeId) => {
    currentMolId = molId;
    moleculePivot.clear();
    atomMeshes.clear();
    partsList.length = 0;

    const spec = MOLECULES[molId];

    // Add atoms
    spec.atoms.forEach((atom) => {
      const grp = new THREE.Group();
      grp.position.set(...atom.pos);

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(atom.radius, 28, 22),
        new THREE.MeshPhysicalMaterial({
          color: atom.color,
          roughness: 0.18,
          metalness: 0.08,
          clearcoat: 0.8,
          clearcoatRoughness: 0.12,
        })
      );
      const orbitalRing = new THREE.Mesh(
        new THREE.TorusGeometry(atom.radius * 1.32, 0.02, 8, 36),
        new THREE.MeshBasicMaterial({
          color: '#6366f1',
          transparent: true,
          opacity: 0.45,
        })
      );
      orbitalRing.rotation.x = Math.PI / 2.4;
      grp.add(sphere, orbitalRing);

      tagSelectable(grp, atom.id);
      atomMeshes.set(atom.id, grp);
      moleculePivot.add(grp);

      partsList.push({
        id: atom.id,
        name: `${atom.element} (${atom.symbol})`,
        subtitle: `${spec.name} · ${spec.geometryName}`,
        category: `Atomic #${atom.atomicNumber}`,
        description: `Bonded inside ${spec.name} (${spec.bondAngle} bond angle). Valence state: ${atom.valence}.`,
        specs: [
          { label: 'Atomic Mass', value: atom.atomicMass },
          { label: 'Electronegativity', value: atom.electronegativity },
          { label: 'Molecular Geometry', value: spec.geometryName },
        ],
      });
    });

    // Add covalent bonds
    const bondMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.32,
      metalness: 0.45,
    });

    spec.bonds.forEach((bond) => {
      const a = new THREE.Vector3(...spec.atoms[bond.from].pos);
      const b = new THREE.Vector3(...spec.atoms[bond.to].pos);
      const dir = b.clone().sub(a);
      const dist = dir.length();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );

      if (bond.order === 1) {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, dist, 14), bondMat);
        cyl.position.copy(a).add(b).multiplyScalar(0.5);
        cyl.quaternion.copy(quat);
        moleculePivot.add(cyl);
      } else {
        for (const offset of [-0.14, 0.14]) {
          const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, dist, 12), bondMat);
          cyl.position.copy(a).add(b).multiplyScalar(0.5);
          cyl.position.z += offset;
          cyl.quaternion.copy(quat);
          moleculePivot.add(cyl);
        }
      }
    });

    if (!atomMeshes.has(selectedAtomId || '')) {
      selectedAtomId = spec.atoms[0]?.id ?? null;
    }
    applyHighlight();
  };

  const applyHighlight = () => {
    for (const [id, grp] of atomMeshes.entries()) {
      const isSelected = id === selectedAtomId;
      grp.scale.setScalar(isSelected ? 1.15 : 1.0);
    }
  };

  rebuildMolecule('h2o');
  camera.position.set(0, 1.5, 6.2);

  const presets: ExploreCameraPreset[] = [
    { id: 'front', label: 'Molecule Front', position: [0, 1.5, 6.2], target: [0, 0, 0] },
    { id: 'angle', label: '3/4 Perspective', position: [4.2, 3.2, 4.6], target: [0, 0, 0] },
    { id: 'top', label: 'Top-Down Bond Angle', position: [0, 6.4, 0.5], target: [0, 0, 0] },
  ];

  const getActions = (): ExploreSceneAction[] => [
    {
      id: 'molecule',
      label: 'Select Molecule',
      activeOptionId: currentMolId,
      options: [
        { id: 'h2o', label: 'H₂O (Water)' },
        { id: 'co2', label: 'CO₂ (Carbon Dioxide)' },
        { id: 'ch4', label: 'CH₄ (Methane)' },
        { id: 'nh3', label: 'NH₃ (Ammonia)' },
        { id: 'c2h5oh', label: 'C₂H₅OH (Ethanol)' },
      ],
    },
  ];

  return {
    parts: partsList,
    presets,
    defaultSelectedId: 'oxygen_o1',
    getActions,
    onAction: (actionId, optionId) => {
      if (actionId === 'molecule' && optionId in MOLECULES) {
        rebuildMolecule(optionId as MoleculeId);
      }
    },
    setSelectedPart: (partId) => {
      selectedAtomId = partId;
      applyHighlight();
    },
    update: (dt, _elapsed, paused) => {
      if (paused) return;
      moleculePivot.rotation.y += Math.min(dt, 0.05) * 0.45;
    },
    dispose: () => {
      root.clear();
    },
  };
}
