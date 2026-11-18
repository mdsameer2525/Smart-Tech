import * as THREE from 'three';
import { makeCanvasTexture, tagSelectable } from '../threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
} from '../types';

type PipelineStage = 'auto' | 'fetch' | 'decode' | 'execute' | 'memory' | 'writeback';

function makePcbTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.25;
    for (let i = 24; i < w; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}

export function buildComputerArchitectureScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ExploreSceneController {
  scene.background = new THREE.Color('#0f172a');

  const root = new THREE.Group();
  scene.add(root);

  const hemi = new THREE.HemisphereLight('#f8fafc', '#1e293b', 0.9);
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(6, 10, 8);
  const cool = new THREE.DirectionalLight('#38bdf8', 1.0);
  cool.position.set(-7, 5, -6);
  root.add(hemi, key, cool);

  // Motherboard PCB base
  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(11.6, 0.28, 8.2),
    new THREE.MeshStandardMaterial({
      map: makePcbTexture(),
      roughness: 0.45,
      metalness: 0.2,
    })
  );
  pcb.position.y = -0.14;
  root.add(pcb);

  const unitGroups = new Map<string, THREE.Group>();

  const buildUnitBlock = (
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    colorHex: string,
    withPins = true
  ) => {
    const g = new THREE.Group();
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.65 })
    );
    block.position.y = h / 2;
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.78, 0.08, d * 0.78),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25, metalness: 0.85 })
    );
    cap.position.y = h + 0.04;
    g.add(block, cap);

    if (withPins) {
      const pinMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2 });
      const count = 4;
      for (let i = 0; i < count; i++) {
        const px = -w * 0.35 + (i / (count - 1)) * w * 0.7;
        const pinF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), pinMat);
        pinF.position.set(px, 0.06, d / 2 + 0.08);
        const pinB = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), pinMat);
        pinB.position.set(px, 0.06, -d / 2 - 0.08);
        g.add(pinF, pinB);
      }
    }

    g.position.set(x, 0, z);
    tagSelectable(g, id);
    unitGroups.set(id, g);
    root.add(g);
    return g;
  };

  // CPU Package units & system components
  buildUnitBlock('control_unit', -2.8, -1.6, 2.3, 0.85, 2.0, '#4338ca');
  buildUnitBlock('alu', -2.8, 1.5, 2.3, 0.95, 2.0, '#0369a1');
  buildUnitBlock('registers', 0.2, -1.6, 1.8, 0.72, 1.8, '#0f766e');
  buildUnitBlock('l1_cache', 0.2, 1.5, 1.8, 0.72, 1.8, '#047857');
  buildUnitBlock('ram', 3.6, -1.4, 2.4, 1.15, 2.4, '#b45309');
  buildUnitBlock('storage_bus', 3.6, 1.8, 2.4, 0.65, 1.8, '#7c3aed');

  const unitPositions: Record<string, THREE.Vector3> = {
    control_unit: new THREE.Vector3(-2.8, 0.5, -1.6),
    alu: new THREE.Vector3(-2.8, 0.5, 1.5),
    registers: new THREE.Vector3(0.2, 0.5, -1.6),
    l1_cache: new THREE.Vector3(0.2, 0.5, 1.5),
    ram: new THREE.Vector3(3.6, 0.5, -1.4),
    storage_bus: new THREE.Vector3(3.6, 0.5, 1.8),
  };

  // Glowing copper/gold bus traces between units
  const traces: Array<[string, string]> = [
    ['ram', 'l1_cache'],
    ['l1_cache', 'control_unit'],
    ['control_unit', 'registers'],
    ['registers', 'alu'],
    ['alu', 'registers'],
    ['l1_cache', 'alu'],
    ['ram', 'storage_bus'],
  ];

  const traceMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    emissive: '#d97706',
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.25,
  });

  for (const [a, b] of traces) {
    const pA = unitPositions[a];
    const pB = unitPositions[b];
    const dist = pA.distanceTo(pB);
    const bus = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, dist), traceMat);
    bus.position.set((pA.x + pB.x) / 2, 0.04, (pA.z + pB.z) / 2);
    bus.lookAt(pB.x, 0.04, pB.z);
    root.add(bus);
  }

  // Animated instruction/data pulse traveling across bus
  const pulseOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12),
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 1.4,
    })
  );
  root.add(pulseOrb);

  let stage: PipelineStage = 'auto';
  let selectedId: string | null = 'control_unit';

  const stagePaths: Record<Exclude<PipelineStage, 'auto'>, [string, string]> = {
    fetch: ['ram', 'control_unit'],
    decode: ['control_unit', 'registers'],
    execute: ['registers', 'alu'],
    memory: ['alu', 'l1_cache'],
    writeback: ['l1_cache', 'registers'],
  };

  const parts: ExplorePartInfo[] = [
    {
      id: 'control_unit',
      name: 'Control Unit (CU)',
      subtitle: 'Instruction Fetch & Decode Sequencer',
      category: 'CPU Core',
      description:
        'Coordinates the Fetch-Decode-Execute cycle, updates the Program Counter (PC), and issues control signals across ALU, registers, and memory.',
      specs: [
        { label: 'Primary Role', value: 'Fetch & Decode' },
        { label: 'Key Register', value: 'Program Counter (PC)' },
        { label: 'Control Signals', value: 'Clocked Bus Timing' },
      ],
    },
    {
      id: 'alu',
      name: 'Arithmetic Logic Unit (ALU)',
      subtitle: 'Integer Math & Bitwise Engine',
      category: 'Execution Unit',
      description:
        'Performs addition, subtraction, comparisons, and bitwise AND/OR/XOR operations on register operands and sets CPU status flags.',
      specs: [
        { label: 'Operations', value: 'ADD, SUB, AND, OR, CMP' },
        { label: 'Status Flags', value: 'Zero, Carry, Overflow' },
        { label: 'Pipeline Stage', value: '3. Execute' },
      ],
    },
    {
      id: 'registers',
      name: 'CPU Register File',
      subtitle: 'Fastest On-Die Storage (R0–R15)',
      category: 'Processor State',
      description:
        'Ultra-fast flip-flop storage inside the core holding active instruction operands and intermediate results in single-cycle latency.',
      specs: [
        { label: 'Access Latency', value: '< 1 Clock Cycle' },
        { label: 'Width', value: '64-bit General Purpose' },
        { label: 'Pipeline Stage', value: '2. Decode & 5. Writeback' },
      ],
    },
    {
      id: 'l1_cache',
      name: 'L1 Instruction & Data Cache',
      subtitle: 'SRAM High-Speed Buffer',
      category: 'Cache Hierarchy',
      description:
        'Stores recently used instructions and memory lines directly on the CPU die using SRAM so cores avoid waiting hundreds of cycles on DRAM.',
      specs: [
        { label: 'Latency', value: '~1–4 Cycles' },
        { label: 'Technology', value: '6-Transistor SRAM' },
        { label: 'Locality', value: 'Temporal & Spatial' },
      ],
    },
    {
      id: 'ram',
      name: 'Main Memory (RAM)',
      subtitle: 'Volatile System DRAM Modules',
      category: 'Primary Memory',
      description:
        'Holds running application code, OS kernels, and active heap/stack frames accessed over the memory controller address & data buses.',
      specs: [
        { label: 'Latency', value: '~60–100 ns' },
        { label: 'Volatility', value: 'Requires Power' },
        { label: 'Bus', value: 'Address + Data Bus' },
      ],
    },
    {
      id: 'storage_bus',
      name: 'System I/O & NVMe Bus',
      subtitle: 'Non-Volatile Storage Controller',
      category: 'Storage & I/O',
      description:
        'Transfers persistent files and database pages (like Smart-Tech’s SQLite WAL records) over PCIe/DMA lanes into RAM.',
      specs: [
        { label: 'Persistence', value: 'Non-Volatile Flash' },
        { label: 'Transfer Mode', value: 'DMA / PCIe Lanes' },
        { label: 'Throughput', value: 'Multi-GB/s' },
      ],
    },
  ];

  const applyHighlight = () => {
    const activeStageUnits: string[] =
      stage === 'auto' ? [] : stagePaths[stage];
    for (const [id, grp] of unitGroups.entries()) {
      const isSelected = id === selectedId;
      const isActiveStage = activeStageUnits.includes(id);
      grp.scale.setScalar(isSelected ? 1.1 : isActiveStage ? 1.06 : 1.0);
    }
  };
  applyHighlight();

  camera.position.set(0, 7.8, 10.2);

  const presets: ExploreCameraPreset[] = [
    { id: 'board', label: 'Full Motherboard', position: [0, 7.8, 10.2], target: [0, 0, 0] },
    { id: 'cpu', label: 'CPU Core Focus', position: [-2.5, 4.6, 5.2], target: [-1.4, 0.4, 0] },
    { id: 'mem', label: 'Cache & RAM Bus', position: [3.2, 4.8, 5.8], target: [2.2, 0.4, 0] },
  ];

  const getActions = (): ExploreSceneAction[] => [
    {
      id: 'stage',
      label: 'Instruction Cycle',
      activeOptionId: stage,
      options: [
        { id: 'auto', label: 'Continuous Cycle' },
        { id: 'fetch', label: '1. Fetch' },
        { id: 'decode', label: '2. Decode' },
        { id: 'execute', label: '3. Execute' },
        { id: 'memory', label: '4. Memory' },
        { id: 'writeback', label: '5. Writeback' },
      ],
    },
  ];

  const stageOrder: Array<Exclude<PipelineStage, 'auto'>> = [
    'fetch',
    'decode',
    'execute',
    'memory',
    'writeback',
  ];
  let phaseT = 0;

  return {
    parts,
    presets,
    defaultSelectedId: 'control_unit',
    getActions,
    onAction: (actionId, optionId) => {
      if (actionId === 'stage') {
        stage = optionId as PipelineStage;
        phaseT = 0;
        applyHighlight();
      }
    },
    setSelectedPart: (partId) => {
      selectedId = partId;
      applyHighlight();
    },
    update: (dt, _elapsed, paused) => {
      if (paused) return;
      phaseT += Math.min(dt, 0.05) * 0.9;
      let pair: [string, string];
      let frac: number;
      if (stage === 'auto') {
        const idx = Math.floor(phaseT) % stageOrder.length;
        pair = stagePaths[stageOrder[idx]];
        frac = phaseT - Math.floor(phaseT);
      } else {
        pair = stagePaths[stage];
        frac = phaseT - Math.floor(phaseT);
      }
      const pA = unitPositions[pair[0]];
      const pB = unitPositions[pair[1]];
      if (pA && pB) {
        pulseOrb.position.lerpVectors(pA, pB, frac);
        pulseOrb.position.y += 0.35 + Math.sin(frac * Math.PI) * 0.3;
      }
    },
    dispose: () => {
      root.clear();
    },
  };
}
