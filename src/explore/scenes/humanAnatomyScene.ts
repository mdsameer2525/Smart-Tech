import * as THREE from 'three';
import { tagSelectable } from '../threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
} from '../types';

type BodySystem = 'ALL' | 'Skeletal' | 'Cardiovascular' | 'Nervous' | 'Respiratory' | 'Digestive';

export function buildHumanAnatomyScene(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): ExploreSceneController {
  scene.background = new THREE.Color('#f1f5f9');

  const root = new THREE.Group();
  scene.add(root);

  const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
  keyLight.position.set(5, 8, 7);
  const rimLight = new THREE.DirectionalLight('#93c5fd', 1.1);
  rimLight.position.set(-6, 4, -5);
  const hemi = new THREE.HemisphereLight('#f8fafc', '#cbd5e1', 0.9);
  root.add(keyLight, rimLight, hemi);

  // Translucent torso + head silhouette frame (glassy anatomical shell)
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.16,
    roughness: 0.25,
    metalness: 0.05,
    depthWrite: false,
  });
  const torsoShell = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.25, 4.3, 28), shellMat);
  torsoShell.scale.set(1.2, 1, 0.72);
  torsoShell.position.set(0, -0.2, 0);
  const neckShell = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.65, 20), shellMat);
  neckShell.position.set(0, 2.25, 0);
  const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.86, 24, 20), shellMat);
  headShell.scale.set(0.88, 1.08, 0.96);
  headShell.position.set(0, 3.2, 0);
  root.add(torsoShell, neckShell, headShell);

  const systemGroups = new Map<Exclude<BodySystem, 'ALL'>, THREE.Group>();
  const selectableGroups = new Map<string, { group: THREE.Group; system: Exclude<BodySystem, 'ALL'> }>();

  // 1. Nervous System (Brain + Spinal Cord)
  const nervousGroup = new THREE.Group();
  const brainGroup = new THREE.Group();
  const brainMat = new THREE.MeshStandardMaterial({
    color: '#f472b6',
    roughness: 0.45,
    metalness: 0.05,
  });
  const leftLobe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), brainMat);
  leftLobe.scale.set(0.85, 0.85, 1.12);
  leftLobe.position.set(-0.22, 3.32, 0.02);
  const rightLobe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 16), brainMat.clone());
  rightLobe.scale.set(0.85, 0.85, 1.12);
  rightLobe.position.set(0.22, 3.32, 0.02);
  const cerebellum = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), brainMat.clone());
  cerebellum.position.set(0, 2.9, -0.22);
  const spinalCord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 4.1, 14),
    new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.4 })
  );
  spinalCord.position.set(0, 0.75, -0.34);
  brainGroup.add(leftLobe, rightLobe, cerebellum, spinalCord);
  tagSelectable(brainGroup, 'brain');
  nervousGroup.add(brainGroup);
  root.add(nervousGroup);
  systemGroups.set('Nervous', nervousGroup);
  selectableGroups.set('brain', { group: brainGroup, system: 'Nervous' });

  // 2. Skeletal System (Ribcage & Vertebral Column)
  const skeletalGroup = new THREE.Group();
  const boneGroup = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.52, metalness: 0.05 });
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.45, 0.12), boneMat);
  sternum.position.set(0, 0.85, 0.68);
  boneGroup.add(sternum);

  for (let i = 0; i < 6; i++) {
    const y = 1.42 - i * 0.25;
    const radius = 0.88 + Math.sin((i / 5) * Math.PI) * 0.22;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 10, 28, Math.PI * 1.45), boneMat);
    rib.rotation.x = Math.PI / 2;
    rib.rotation.z = -Math.PI * 0.22;
    rib.scale.set(1.12, 0.66, 1);
    rib.position.set(0, y, 0.05);
    boneGroup.add(rib);
  }
  for (let v = 0; v < 11; v++) {
    const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), boneMat);
    vertebra.position.set(0, 1.75 - v * 0.34, -0.42);
    boneGroup.add(vertebra);
  }
  tagSelectable(boneGroup, 'skeleton');
  skeletalGroup.add(boneGroup);
  root.add(skeletalGroup);
  systemGroups.set('Skeletal', skeletalGroup);
  selectableGroups.set('skeleton', { group: boneGroup, system: 'Skeletal' });

  // 3. Respiratory System (Trachea + Dual Lungs)
  const respGroup = new THREE.Group();
  const lungsGroup = new THREE.Group();
  const lungMat = new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.6, metalness: 0.04 });
  const trachea = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 1.2, 16),
    new THREE.MeshStandardMaterial({ color: '#fda4af', roughness: 0.5 })
  );
  trachea.position.set(0, 1.85, 0.1);
  const leftLung = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 16), lungMat);
  leftLung.scale.set(0.75, 1.35, 0.72);
  leftLung.position.set(-0.56, 0.92, 0.12);
  const rightLung = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 16), lungMat.clone());
  rightLung.scale.set(0.78, 1.38, 0.72);
  rightLung.position.set(0.56, 0.92, 0.12);
  lungsGroup.add(trachea, leftLung, rightLung);
  tagSelectable(lungsGroup, 'lungs');
  respGroup.add(lungsGroup);
  root.add(respGroup);
  systemGroups.set('Respiratory', respGroup);
  selectableGroups.set('lungs', { group: lungsGroup, system: 'Respiratory' });

  // 4. Cardiovascular System (Heart + Aorta)
  const cardioGroup = new THREE.Group();
  const heartGroup = new THREE.Group();
  const heartMat = new THREE.MeshStandardMaterial({
    color: '#dc2626',
    roughness: 0.36,
    metalness: 0.08,
  });
  const heartCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), heartMat);
  heartCore.scale.set(0.92, 1.18, 0.85);
  heartCore.position.set(0.16, 0.85, 0.34);
  const aorta = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.06, 12, 24, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.35 })
  );
  aorta.position.set(0.08, 1.15, 0.28);
  const venaCava = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 1.1, 12),
    new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.4 })
  );
  venaCava.position.set(-0.14, 0.95, 0.25);
  heartGroup.add(heartCore, aorta, venaCava);
  tagSelectable(heartGroup, 'heart');
  cardioGroup.add(heartGroup);
  root.add(cardioGroup);
  systemGroups.set('Cardiovascular', cardioGroup);
  selectableGroups.set('heart', { group: heartGroup, system: 'Cardiovascular' });

  // 5. Digestive System (Liver, Stomach, Intestines)
  const digestiveGroup = new THREE.Group();
  const digestOrgans = new THREE.Group();
  const liver = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 18, 14),
    new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.45 })
  );
  liver.scale.set(1.15, 0.62, 0.72);
  liver.position.set(-0.38, -0.05, 0.22);

  const stomach = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 18, 14),
    new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.52 })
  );
  stomach.scale.set(0.95, 1.15, 0.78);
  stomach.position.set(0.34, -0.15, 0.24);

  const intestines = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.14, 14, 28),
    new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.58 })
  );
  intestines.scale.set(1.15, 0.95, 0.65);
  intestines.position.set(0, -1.05, 0.18);

  digestOrgans.add(liver, stomach, intestines);
  tagSelectable(digestOrgans, 'digestive');
  digestiveGroup.add(digestOrgans);
  root.add(digestiveGroup);
  systemGroups.set('Digestive', digestiveGroup);
  selectableGroups.set('digestive', { group: digestOrgans, system: 'Digestive' });

  camera.position.set(0, 1.2, 7.2);

  let activeSystem: BodySystem = 'ALL';
  let selectedId: string | null = 'heart';

  const parts: ExplorePartInfo[] = [
    {
      id: 'brain',
      name: 'Brain & Spinal Cord',
      subtitle: 'Central Nervous System',
      category: 'Nervous System',
      description:
        'Processes sensory input, coordinates motor signals, and governs cognition via billions of interconnected neurons descending through the spinal column.',
      specs: [
        { label: 'Neurons', value: '~86 Billion' },
        { label: 'Major Lobes', value: 'Frontal, Parietal, Temporal, Occipital' },
        { label: 'Protection', value: 'Cranium & Vertebrae' },
      ],
    },
    {
      id: 'heart',
      name: 'Heart & Great Vessels',
      subtitle: 'Cardiovascular Pump',
      category: 'Cardiovascular System',
      description:
        'A four-chamber muscular organ pumping oxygen-poor blood to the lungs (pulmonary circuit) and oxygen-rich blood through the aorta to the entire body.',
      specs: [
        { label: 'Chambers', value: '2 Atria, 2 Ventricles' },
        { label: 'Resting Rate', value: '60–100 bpm' },
        { label: 'Main Artery', value: 'Aorta' },
      ],
    },
    {
      id: 'lungs',
      name: 'Trachea & Lungs',
      subtitle: 'Gas Exchange System',
      category: 'Respiratory System',
      description:
        'Air travels down the trachea into branching bronchi and millions of alveoli, where oxygen diffuses into capillaries and carbon dioxide is exhaled.',
      specs: [
        { label: 'Alveoli', value: '~480 Million' },
        { label: 'Right / Left Lobes', value: '3 Right · 2 Left' },
        { label: 'Primary Muscle', value: 'Diaphragm' },
      ],
    },
    {
      id: 'skeleton',
      name: 'Ribcage & Spine',
      subtitle: 'Thoracic Skeletal Framework',
      category: 'Skeletal System',
      description:
        'Curved ribs anchored to the sternum and thoracic vertebrae shield the heart and lungs while flexing outward during inhalation.',
      specs: [
        { label: 'Rib Pairs', value: '12 Pairs' },
        { label: 'Spine Segments', value: 'Cervical, Thoracic, Lumbar' },
        { label: 'Role', value: 'Protection & Support' },
      ],
    },
    {
      id: 'digestive',
      name: 'Liver, Stomach & Intestines',
      subtitle: 'Nutrient Processing Tract',
      category: 'Digestive System',
      description:
        'Enzymes and stomach acid break down macromolecules while the liver produces bile and the small intestine absorbs nutrients into the bloodstream.',
      specs: [
        { label: 'Stomach pH', value: '1.5 – 3.5' },
        { label: 'Bile Synthesis', value: 'Liver' },
        { label: 'Absorption', value: 'Intestinal Villi' },
      ],
    },
  ];

  const applyVisibilityAndHighlight = () => {
    for (const [sysName, grp] of systemGroups.entries()) {
      const visible = activeSystem === 'ALL' || activeSystem === sysName;
      grp.visible = visible;
    }

    for (const [partId, entry] of selectableGroups.entries()) {
      const isSelected = partId === selectedId;
      entry.group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.material || !(mesh.material instanceof THREE.MeshStandardMaterial)) return;
        mesh.material.emissive.set(isSelected ? '#4f46e5' : '#000000');
        mesh.material.emissiveIntensity = isSelected ? 0.35 : 0;
      });
    }
  };

  applyVisibilityAndHighlight();

  const presets: ExploreCameraPreset[] = [
    { id: 'front', label: 'Full Torso', position: [0, 1.2, 7.2], target: [0, 0.8, 0] },
    { id: 'head', label: 'Head & Brain', position: [1.6, 3.3, 3.6], target: [0, 3.1, 0] },
    { id: 'thorax', label: 'Heart & Lungs', position: [2.2, 1.0, 4.2], target: [0, 0.85, 0] },
  ];

  const getActions = (): ExploreSceneAction[] => [
    {
      id: 'system',
      label: 'Body System',
      activeOptionId: activeSystem,
      options: [
        { id: 'ALL', label: 'All Systems' },
        { id: 'Cardiovascular', label: 'Cardiovascular' },
        { id: 'Respiratory', label: 'Respiratory' },
        { id: 'Nervous', label: 'Nervous' },
        { id: 'Skeletal', label: 'Skeletal' },
        { id: 'Digestive', label: 'Digestive' },
      ],
    },
  ];

  return {
    parts,
    presets,
    defaultSelectedId: 'heart',
    getActions,
    onAction: (actionId, optionId) => {
      if (actionId === 'system') {
        activeSystem = optionId as BodySystem;
        applyVisibilityAndHighlight();
      }
    },
    setSelectedPart: (partId) => {
      selectedId = partId;
      applyVisibilityAndHighlight();
    },
    update: (_dt, elapsed, paused) => {
      if (paused) return;
      // Gentle rhythmic heartbeat + respiratory lung cycle
      const pulse = 1 + Math.sin(elapsed * 5.2) * 0.045;
      heartCore.scale.set(0.92 * pulse, 1.18 * pulse, 0.85 * pulse);

      const breath = 1 + Math.sin(elapsed * 1.8) * 0.035;
      leftLung.scale.set(0.75 * breath, 1.35, 0.72 * breath);
      rightLung.scale.set(0.78 * breath, 1.38, 0.72 * breath);
    },
    dispose: () => {
      root.clear();
    },
  };
}
