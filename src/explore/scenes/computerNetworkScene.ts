import * as THREE from 'three';
import { tagSelectable } from '../threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
} from '../types';

type FlowProtocol = 'http' | 'dns' | 'tls';

export function buildComputerNetworkScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ExploreSceneController {
  scene.background = new THREE.Color('#0f172a');

  const root = new THREE.Group();
  scene.add(root);

  const hemi = new THREE.HemisphereLight('#e2e8f0', '#1e293b', 0.9);
  const key = new THREE.DirectionalLight('#ffffff', 2.0);
  key.position.set(8, 12, 8);
  const accent = new THREE.PointLight('#38bdf8', 1.4, 30);
  accent.position.set(0, 5, 0);
  root.add(hemi, key, accent);

  const floorGrid = new THREE.GridHelper(20, 20, '#334155', '#1e293b');
  floorGrid.position.y = -0.02;
  root.add(floorGrid);

  const deviceGroups = new Map<string, THREE.Group>();

  // Helper to build a computer workstation
  const makeWorkstation = (x: number, z: number) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.14, 1.0),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.45, metalness: 0.5 })
    );
    base.position.y = 0.07;
    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.92, 0.08),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.6 })
    );
    screenFrame.position.set(0, 0.62, -0.35);
    screenFrame.rotation.x = -0.15;
    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.26, 0.76),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: 0.5,
      })
    );
    screenGlow.position.set(0, 0.62, -0.305);
    screenGlow.rotation.x = -0.15;
    g.add(base, screenFrame, screenGlow);
    g.position.set(x, 0, z);
    return g;
  };

  // Helper to build switch / firewall / router boxes
  const makeSwitch = (x: number, z: number) => {
    const g = new THREE.Group();
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.48, 1.2),
      new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.35, metalness: 0.65 })
    );
    chassis.position.y = 0.24;
    g.add(chassis);
    for (let i = -3; i <= 3; i++) {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.12, 0.06),
        new THREE.MeshStandardMaterial({
          color: '#34d399',
          emissive: '#10b981',
          emissiveIntensity: 0.7,
        })
      );
      port.position.set(i * 0.24, 0.24, 0.61);
      g.add(port);
    }
    g.position.set(x, 0, z);
    return g;
  };

  const makeFirewall = (x: number, z: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.35, 0.6),
      new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.38, metalness: 0.5 })
    );
    body.position.y = 0.68;
    const shieldBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.24, 0.66),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#d97706',
        emissiveIntensity: 0.5,
      })
    );
    shieldBar.position.y = 0.88;
    g.add(body, shieldBar);
    g.position.set(x, 0, z);
    return g;
  };

  const makeRouter = (x: number, z: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: '#4338ca', roughness: 0.35, metalness: 0.65 })
    );
    body.position.y = 0.23;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 10, 28),
      new THREE.MeshStandardMaterial({
        color: '#818cf8',
        emissive: '#6366f1',
        emissiveIntensity: 0.65,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.47;
    g.add(body, ring);

    for (const ax of [-0.55, 0.55]) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.0, 10),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8, roughness: 0.2 })
      );
      antenna.position.set(ax, 0.72, -0.45);
      g.add(antenna);
    }
    g.position.set(x, 0, z);
    return g;
  };

  const makeServerRack = (x: number, z: number, accentHex: string) => {
    const g = new THREE.Group();
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.2, 1.3),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.7 })
    );
    cabinet.position.y = 1.1;
    g.add(cabinet);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.3, 0.08),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.35, metalness: 0.8 })
      );
      blade.position.set(0, 0.48 + b * 0.44, 0.65);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.07, 0.09),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.9,
        })
      );
      led.position.set(-0.38, 0.48 + b * 0.44, 0.66);
      g.add(blade, led);
    }
    g.position.set(x, 0, z);
    return g;
  };

  const clientPc = makeWorkstation(-5.8, 3.2);
  const switchDev = makeSwitch(-2.4, 1.4);
  const firewall = makeFirewall(0.6, 0.2);
  const router = makeRouter(3.5, -0.8);
  const webServer = makeServerRack(5.8, -3.4, '#38bdf8');
  const dbServer = makeServerRack(1.8, -4.4, '#10b981');

  const nodePositions: Record<string, THREE.Vector3> = {
    client_pc: new THREE.Vector3(-5.8, 0.35, 3.2),
    switch: new THREE.Vector3(-2.4, 0.35, 1.4),
    firewall: new THREE.Vector3(0.6, 0.35, 0.2),
    router: new THREE.Vector3(3.5, 0.35, -0.8),
    web_server: new THREE.Vector3(5.8, 0.45, -3.4),
    db_server: new THREE.Vector3(1.8, 0.45, -4.4),
  };

  const registered: Array<[string, THREE.Group]> = [
    ['client_pc', clientPc],
    ['switch', switchDev],
    ['firewall', firewall],
    ['router', router],
    ['web_server', webServer],
    ['db_server', dbServer],
  ];

  for (const [id, grp] of registered) {
    tagSelectable(grp, id);
    deviceGroups.set(id, grp);
    root.add(grp);
  }

  // Build glowing link tubes
  const links: Array<[string, string]> = [
    ['client_pc', 'switch'],
    ['switch', 'firewall'],
    ['firewall', 'router'],
    ['router', 'web_server'],
    ['web_server', 'db_server'],
    ['router', 'db_server'],
  ];

  const linkMat = new THREE.MeshStandardMaterial({
    color: '#0284c7',
    emissive: '#0369a1',
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });

  for (const [a, b] of links) {
    const pA = nodePositions[a];
    const pB = nodePositions[b];
    const dist = pA.distanceTo(pB);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, dist, 10), linkMat);
    tube.position.copy(pA).add(pB).multiplyScalar(0.5);
    tube.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      pB.clone().sub(pA).normalize()
    );
    root.add(tube);
  }

  // Moving packet sphere
  const packetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#facc15',
      emissiveIntensity: 1.2,
    })
  );
  root.add(packetMesh);

  let protocol: FlowProtocol = 'http';
  let selectedId: string | null = 'router';

  const routes: Record<FlowProtocol, string[]> = {
    http: ['client_pc', 'switch', 'firewall', 'router', 'web_server', 'db_server', 'web_server', 'router', 'firewall', 'switch', 'client_pc'],
    dns: ['client_pc', 'switch', 'firewall', 'router', 'web_server', 'router', 'firewall', 'switch', 'client_pc'],
    tls: ['client_pc', 'switch', 'firewall', 'router', 'web_server', 'router', 'firewall', 'switch', 'client_pc'],
  };

  const parts: ExplorePartInfo[] = [
    {
      id: 'client_pc',
      name: 'Client Workstation',
      subtitle: 'Edge Endpoint (192.168.10.24)',
      category: 'Endpoint',
      description:
        'Initiates DNS resolution and HTTPS/TCP requests from the browser, encapsulating application payloads into Ethernet frames.',
      specs: [
        { label: 'OSI Layers', value: 'Layers 7 -> 1' },
        { label: 'Local IP', value: '192.168.10.24/24' },
        { label: 'Default Gateway', value: 'Router Interface' },
      ],
    },
    {
      id: 'switch',
      name: 'Managed Layer-2 Switch',
      subtitle: 'Local LAN Frame Forwarding',
      category: 'Data Link (L2)',
      description:
        'Learns MAC addresses per physical port and forwards Ethernet frames directly to the target device inside the local subnet.',
      specs: [
        { label: 'OSI Layer', value: 'Layer 2 (Data Link)' },
        { label: 'Table Key', value: 'MAC Address' },
        { label: 'Collision Domain', value: 'Isolated per port' },
      ],
    },
    {
      id: 'firewall',
      name: 'Hardware Firewall',
      subtitle: 'Stateful Packet Inspection',
      category: 'Security Perimeter',
      description:
        'Inspects source/destination IPs, ports, and connection state against defensive ACL rules—allowing HTTPS (443) while blocking raw DB ports externally.',
      specs: [
        { label: 'Allowed External', value: 'TCP 443 (TLS)' },
        { label: 'Blocked Publicly', value: 'DB Ports (5432/3306)' },
        { label: 'Inspection', value: 'Stateful ACL' },
      ],
    },
    {
      id: 'router',
      name: 'Core IP Router',
      subtitle: 'Inter-Network Packet Routing',
      category: 'Network Layer (L3)',
      description:
        'Reads destination IP headers, applies NAT and routing table lookups, and forwards packets across distinct LAN/DMZ/cloud subnets.',
      specs: [
        { label: 'OSI Layer', value: 'Layer 3 (Network)' },
        { label: 'Routing Key', value: 'IP Subnet Prefix' },
        { label: 'Services', value: 'NAT & BGP/OSPF' },
      ],
    },
    {
      id: 'web_server',
      name: 'Application & Web Server',
      subtitle: 'Express / Node API Tier',
      category: 'Server Infrastructure',
      description:
        'Terminates TLS encryption, verifies JWT authentication tokens, runs application logic, and queries the isolated database tier.',
      specs: [
        { label: 'Port', value: 'TCP 443 / 3000' },
        { label: 'Security', value: 'Rate Limit + JWT' },
        { label: 'Role', value: 'API & Static Delivery' },
      ],
    },
    {
      id: 'db_server',
      name: 'Database Server',
      subtitle: 'Isolated Persistent Storage Tier',
      category: 'Data Tier',
      description:
        'Stores courses, user accounts, and verified game XP safely behind internal network segmentation using parameterized SQL.',
      specs: [
        { label: 'Access Policy', value: 'Backend Tier Only' },
        { label: 'Query Safety', value: 'Prepared Statements' },
        { label: 'Durability', value: 'WAL Transaction Log' },
      ],
    },
  ];

  const applySelectionHighlight = () => {
    for (const [id, grp] of deviceGroups.entries()) {
      const isSelected = id === selectedId;
      grp.scale.setScalar(isSelected ? 1.09 : 1.0);
    }
  };
  applySelectionHighlight();

  camera.position.set(0, 8.5, 13.5);

  const presets: ExploreCameraPreset[] = [
    { id: 'iso', label: 'Topology Overview', position: [0, 8.5, 13.5], target: [0, 0.5, -0.5] },
    { id: 'edge', label: 'Client -> Firewall', position: [-5, 4.5, 8], target: [-2, 0.5, 1.5] },
    { id: 'datacenter', label: 'Router & Servers', position: [7, 5, 4], target: [3.5, 1, -3] },
  ];

  const getActions = (): ExploreSceneAction[] => [
    {
      id: 'protocol',
      label: 'Packet Simulation',
      activeOptionId: protocol,
      options: [
        { id: 'http', label: 'Full API + DB Flow' },
        { id: 'dns', label: 'DNS / Route Hop' },
        { id: 'tls', label: 'TLS Handshake' },
      ],
    },
  ];

  let packetProgress = 0;

  return {
    parts,
    presets,
    defaultSelectedId: 'router',
    getActions,
    onAction: (actionId, optionId) => {
      if (actionId === 'protocol') {
        protocol = optionId as FlowProtocol;
        packetProgress = 0;
        const color =
          protocol === 'tls' ? '#34d399' : protocol === 'dns' ? '#38bdf8' : '#facc15';
        (packetMesh.material as THREE.MeshStandardMaterial).color.set(color);
        (packetMesh.material as THREE.MeshStandardMaterial).emissive.set(color);
      }
    },
    setSelectedPart: (partId) => {
      selectedId = partId;
      applySelectionHighlight();
    },
    update: (dt, _elapsed, paused) => {
      if (paused) return;
      const seq = routes[protocol];
      packetProgress = (packetProgress + Math.min(dt, 0.05) * 0.85) % (seq.length - 1);
      const segIdx = Math.floor(packetProgress);
      const frac = packetProgress - segIdx;
      const fromPos = nodePositions[seq[segIdx]];
      const toPos = nodePositions[seq[segIdx + 1]];
      if (fromPos && toPos) {
        packetMesh.position.lerpVectors(fromPos, toPos, frac);
        packetMesh.position.y += Math.sin(frac * Math.PI) * 0.45;
      }
    },
    dispose: () => {
      root.clear();
    },
  };
}
