import * as THREE from 'three';
import { makeCanvasTexture, tagSelectable } from '../threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
} from '../types';

interface PlanetSpec {
  id: string;
  name: string;
  subtitle: string;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  baseColor: string;
  accentColor: string;
  hasRing?: boolean;
  hasMoon?: boolean;
  description: string;
  specs: Array<{ label: string; value: string }>;
}

const SOLAR_BODIES: PlanetSpec[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    subtitle: 'Innermost Terrestrial Planet',
    radius: 0.42,
    orbitRadius: 4.4,
    orbitSpeed: 1.55,
    spinSpeed: 0.4,
    baseColor: '#9ca3af',
    accentColor: '#6b7280',
    description:
      'Mercury is the smallest and closest planet to the Sun, with an heavily cratered silicate crust and almost no atmosphere to retain heat.',
    specs: [
      { label: 'Orbit Period', value: '88 Earth days' },
      { label: 'Diameter', value: '4,879 km' },
      { label: 'Moons', value: '0' },
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    subtitle: 'Dense Greenhouse Atmosphere',
    radius: 0.65,
    orbitRadius: 6.2,
    orbitSpeed: 1.15,
    spinSpeed: -0.25,
    baseColor: '#eab308',
    accentColor: '#ca8a04',
    description:
      'Venus rotates backward (retrograde) beneath thick sulfuric acid clouds and a runaway carbon-dioxide greenhouse atmosphere.',
    specs: [
      { label: 'Orbit Period', value: '225 Earth days' },
      { label: 'Surface Temp', value: '~464 °C' },
      { label: 'Rotation', value: 'Retrograde' },
    ],
  },
  {
    id: 'earth',
    name: 'Earth',
    subtitle: 'Liquid Water Biosphere & Moon',
    radius: 0.72,
    orbitRadius: 8.4,
    orbitSpeed: 0.92,
    spinSpeed: 1.2,
    baseColor: '#2563eb',
    accentColor: '#16a34a',
    hasMoon: true,
    description:
      'Earth supports liquid oceans, plate tectonics, a protective magnetosphere, and a stabilizing natural satellite (the Moon).',
    specs: [
      { label: 'Orbit Period', value: '365.25 days' },
      { label: 'Axial Tilt', value: '23.4°' },
      { label: 'Moons', value: '1 (Luna)' },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    subtitle: 'The Iron-Oxide Red Planet',
    radius: 0.54,
    orbitRadius: 10.6,
    orbitSpeed: 0.74,
    spinSpeed: 1.15,
    baseColor: '#dc2626',
    accentColor: '#991b1b',
    description:
      'Mars hosts Olympus Mons (the tallest known volcano) and polar water/dry-ice caps above iron-rich basaltic plains.',
    specs: [
      { label: 'Orbit Period', value: '687 Earth days' },
      { label: 'Day Length', value: '24.6 hours' },
      { label: 'Moons', value: '2 (Phobos, Deimos)' },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    subtitle: 'Largest Gas Giant',
    radius: 1.45,
    orbitRadius: 14.0,
    orbitSpeed: 0.45,
    spinSpeed: 2.1,
    baseColor: '#d97706',
    accentColor: '#fef3c7',
    description:
      'Jupiter is a rapidly spinning hydrogen-helium gas giant featuring banded jet streams and the Great Red Spot anticyclonic storm.',
    specs: [
      { label: 'Orbit Period', value: '11.86 years' },
      { label: 'Day Length', value: '9.9 hours' },
      { label: 'Known Moons', value: '95+' },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    subtitle: 'Ringed Gas Giant',
    radius: 1.2,
    orbitRadius: 18.2,
    orbitSpeed: 0.34,
    spinSpeed: 1.9,
    baseColor: '#f59e0b',
    accentColor: '#fde68a',
    hasRing: true,
    description:
      'Saturn is renowned for its expansive ring system composed of billions of water-ice particles and shepherd moons.',
    specs: [
      { label: 'Orbit Period', value: '29.5 years' },
      { label: 'Ring Span', value: '282,000 km' },
      { label: 'Density', value: '0.687 g/cm³' },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    subtitle: 'Tilted Ice Giant',
    radius: 0.9,
    orbitRadius: 21.8,
    orbitSpeed: 0.25,
    spinSpeed: -1.4,
    baseColor: '#06b6d4',
    accentColor: '#a5f3fc',
    description:
      'Uranus rotates nearly sideways at an axial tilt of 98 degrees, glowing cyan due to methane absorption in its upper atmosphere.',
    specs: [
      { label: 'Orbit Period', value: '84 years' },
      { label: 'Axial Tilt', value: '97.8°' },
      { label: 'Class', value: 'Ice Giant' },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    subtitle: 'Supersonic Ice Giant',
    radius: 0.86,
    orbitRadius: 24.8,
    orbitSpeed: 0.19,
    spinSpeed: 1.5,
    baseColor: '#1d4ed8',
    accentColor: '#60a5fa',
    description:
      'Neptune orbits in the deep outer Solar System and sustains the fastest planetary winds in the Solar System.',
    specs: [
      { label: 'Orbit Period', value: '164.8 years' },
      { label: 'Peak Winds', value: '>2,000 km/h' },
      { label: 'Distance', value: '30.1 AU' },
    ],
  },
];

function createPlanetTexture(base: string, accent: string, seed: number): THREE.CanvasTexture {
  return makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = accent;
    for (let y = 0; y < h; y += 10) {
      if ((y + seed * 7) % 20 < 10) {
        ctx.globalAlpha = 0.25;
        ctx.fillRect(0, y, w, 6);
      }
    }
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 16; i++) {
      const rx = ((i * 53 + seed * 29) % (w - 20)) + 10;
      const ry = ((i * 37 + seed * 17) % (h - 20)) + 10;
      const r = 4 + ((i + seed) % 10);
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, 32, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(254, 243, 199, 0.05)');
    grad.addColorStop(0.25, 'rgba(253, 230, 138, 0.78)');
    grad.addColorStop(0.45, 'rgba(217, 119, 6, 0.25)');
    grad.addColorStop(0.65, 'rgba(254, 243, 199, 0.88)');
    grad.addColorStop(1, 'rgba(254, 243, 199, 0.05)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

export function buildSolarSystemScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ExploreSceneController {
  scene.background = new THREE.Color('#060916');

  const root = new THREE.Group();
  scene.add(root);

  // Procedural starfield particles
  const starCount = 900;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 45 + (i % 25) * 1.4;
    const theta = i * 2.39996;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: '#e2e8f0', size: 0.22, sizeAttenuation: true });
  root.add(new THREE.Points(starGeo, starMat));

  // Lighting tailored for space readability
  const sunLight = new THREE.PointLight('#fff7ed', 2.8, 120, 0.35);
  sunLight.position.set(0, 0, 0);
  root.add(sunLight);

  const fillLight = new THREE.HemisphereLight('#93c5fd', '#1e1b4b', 0.55);
  root.add(fillLight);

  // Composite Sun group
  const sunGroup = new THREE.Group();
  const sunTex = createPlanetTexture('#f59e0b', '#fef08a', 1);
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 36, 24),
    new THREE.MeshStandardMaterial({
      map: sunTex,
      emissive: new THREE.Color('#f97316'),
      emissiveIntensity: 1.15,
      roughness: 0.4,
    })
  );
  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(2.75, 28, 20),
    new THREE.MeshBasicMaterial({
      color: '#fdba74',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  sunGroup.add(sunCore, sunCorona);
  tagSelectable(sunGroup, 'sun');
  root.add(sunGroup);

  const selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.045, 12, 48),
    new THREE.MeshBasicMaterial({ color: '#38bdf8' })
  );
  selectionRing.rotation.x = Math.PI / 2;
  selectionRing.visible = false;
  root.add(selectionRing);

  const bodyEntries: Array<{
    spec: PlanetSpec;
    orbitPivot: THREE.Group;
    planetGroup: THREE.Group;
    mesh: THREE.Mesh;
    moonPivot?: THREE.Group;
    angle: number;
  }> = [];

  SOLAR_BODIES.forEach((spec, idx) => {
    const orbitRing = new THREE.Mesh(
      new THREE.RingGeometry(spec.orbitRadius - 0.03, spec.orbitRadius + 0.03, 96),
      new THREE.MeshBasicMaterial({
        color: '#334155',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      })
    );
    orbitRing.rotation.x = -Math.PI / 2;
    root.add(orbitRing);

    const orbitPivot = new THREE.Group();
    const startAngle = idx * 0.95;
    orbitPivot.rotation.y = startAngle;
    root.add(orbitPivot);

    const planetGroup = new THREE.Group();
    planetGroup.position.set(spec.orbitRadius, 0, 0);
    orbitPivot.add(planetGroup);

    const tex = createPlanetTexture(spec.baseColor, spec.accentColor, idx + 3);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius, 28, 20),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.72,
        metalness: 0.08,
      })
    );
    planetGroup.add(mesh);

    if (spec.hasRing) {
      const ringGeo = new THREE.RingGeometry(spec.radius * 1.45, spec.radius * 2.35, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        map: createSaturnRingTexture(),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.65,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.4;
      planetGroup.add(ringMesh);
    }

    let moonPivot: THREE.Group | undefined;
    if (spec.hasMoon) {
      moonPivot = new THREE.Group();
      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.88 })
      );
      moonMesh.position.set(1.35, 0.12, 0);
      moonPivot.add(moonMesh);
      planetGroup.add(moonPivot);
    }

    tagSelectable(planetGroup, spec.id);
    bodyEntries.push({
      spec,
      orbitPivot,
      planetGroup,
      mesh,
      moonPivot,
      angle: startAngle,
    });
  });

  camera.position.set(0, 17, 30);

  let selectedId: string | null = 'earth';
  let speedScale = 1;
  const tempWorldPos = new THREE.Vector3();

  const parts: ExplorePartInfo[] = [
    {
      id: 'sun',
      name: 'The Sun',
      subtitle: 'G-Type Main-Sequence Star',
      category: 'Star Core',
      description:
        'Containing 99.86% of the Solar System’s mass, the Sun fuses ~600 million tons of hydrogen into helium every second, radiating light and gravitational pull.',
      specs: [
        { label: 'Core Temp', value: '~15M °C' },
        { label: 'Surface Temp', value: '~5,500 °C' },
        { label: 'Radius', value: '696,340 km' },
      ],
    },
    ...SOLAR_BODIES.map((b) => ({
      id: b.id,
      name: b.name,
      subtitle: b.subtitle,
      category: 'Planet',
      description: b.description,
      specs: b.specs,
    })),
  ];

  const presets: ExploreCameraPreset[] = [
    { id: 'overview', label: 'Full System', position: [0, 18, 32], target: [0, 0, 0] },
    { id: 'inner', label: 'Inner Planets', position: [0, 9, 15], target: [0, 0, 0] },
    { id: 'outer', label: 'Gas & Ice Giants', position: [14, 16, 26], target: [0, 0, 0] },
  ];

  const getActions = (): ExploreSceneAction[] => [
    {
      id: 'speed',
      label: 'Orbit Speed',
      activeOptionId: String(speedScale),
      options: [
        { id: '0.4', label: '0.4x Slow' },
        { id: '1', label: '1x Normal' },
        { id: '2.5', label: '2.5x Fast' },
      ],
    },
  ];

  return {
    parts,
    presets,
    defaultSelectedId: 'earth',
    getActions,
    onAction: (actionId, optionId) => {
      if (actionId === 'speed') {
        const parsed = Number(optionId);
        if (Number.isFinite(parsed) && parsed > 0) speedScale = parsed;
      }
    },
    setSelectedPart: (partId) => {
      selectedId = partId;
    },
    update: (dt, _elapsed, paused) => {
      const effDt = paused ? 0 : Math.min(dt, 0.05) * speedScale;
      sunCore.rotation.y += effDt * 0.18;

      for (const entry of bodyEntries) {
        entry.angle += effDt * entry.spec.orbitSpeed * 0.35;
        entry.orbitPivot.rotation.y = entry.angle;
        entry.mesh.rotation.y += effDt * entry.spec.spinSpeed;
        if (entry.moonPivot) {
          entry.moonPivot.rotation.y += effDt * 2.2;
        }
      }

      if (selectedId === 'sun') {
        selectionRing.visible = true;
        selectionRing.position.set(0, 0, 0);
        selectionRing.scale.setScalar(2.9);
      } else {
        const found = bodyEntries.find((e) => e.spec.id === selectedId);
        if (found) {
          found.planetGroup.getWorldPosition(tempWorldPos);
          selectionRing.visible = true;
          selectionRing.position.copy(tempWorldPos);
          selectionRing.scale.setScalar(found.spec.radius * 1.45);
        } else {
          selectionRing.visible = false;
        }
      }
    },
    dispose: () => {
      root.clear();
    },
  };
}
