import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Info,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  afterDraw,
  disposeSceneGraph,
  findPartIdFromObject,
  probeWebGLSupport,
} from './threeUtils';
import type {
  ExploreCameraPreset,
  ExplorePartInfo,
  ExploreSceneAction,
  ExploreSceneController,
  SceneBuilderFn,
} from './types';
import type { ExploreSceneId } from '../services/gamificationClient';

interface ThreeViewportProps {
  sceneId: ExploreSceneId;
  title: string;
  minPartsRequired: number;
  initialInspectedParts: string[];
  onPartsInspected: (sceneId: ExploreSceneId, partIds: string[]) => void;
}

async function loadSceneBuilder(sceneId: ExploreSceneId): Promise<SceneBuilderFn> {
  switch (sceneId) {
    case 'solar_system':
      return (await import('./scenes/solarSystemScene')).buildSolarSystemScene;
    case 'human_anatomy':
      return (await import('./scenes/humanAnatomyScene')).buildHumanAnatomyScene;
    case 'computer_network':
      return (await import('./scenes/computerNetworkScene')).buildComputerNetworkScene;
    case 'chemistry_lab':
      return (await import('./scenes/chemistryLabScene')).buildChemistryLabScene;
    case 'computer_architecture':
      return (await import('./scenes/computerArchitectureScene')).buildComputerArchitectureScene;
  }
}

export function ThreeViewport({
  sceneId,
  title,
  minPartsRequired,
  initialInspectedParts,
  onPartsInspected,
}: ThreeViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ExploreSceneController | null>(null);
  const targetCameraGoalRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const pausedRef = useRef(false);
  const autoRotateRef = useRef(false);

  const [loadingScene, setLoadingScene] = useState(true);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const [parts, setParts] = useState<ExplorePartInfo[]>([]);
  const [presets, setPresets] = useState<ExploreCameraPreset[]>([]);
  const [actions, setActions] = useState<ExploreSceneAction[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [inspectedParts, setInspectedParts] = useState<string[]>(initialInspectedParts);

  useEffect(() => {
    setInspectedParts(initialInspectedParts);
  }, [sceneId, initialInspectedParts]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const markInspected = (partId: string) => {
    setSelectedPartId(partId);
    controllerRef.current?.setSelectedPart(partId);
    setInspectedParts((prev) => {
      if (prev.includes(partId)) return prev;
      const next = [...prev, partId];
      onPartsInspected(sceneId, next);
      return next;
    });
  };

  useEffect(() => {
    let disposed = false;
    let cancelLoop: (() => void) | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let pmremGen: THREE.PMREMGenerator | null = null;
    let envRT: THREE.WebGLRenderTarget | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let scene: THREE.Scene | null = null;

    setLoadingScene(true);
    setWebglUnavailable(false);

    const mount = mountRef.current;
    if (!mount) return undefined;

    const probe = probeWebGLSupport();

    const init = async () => {
      const builder = await loadSceneBuilder(sceneId);
      if (disposed || !mount) return;

      const tempScene = new THREE.Scene();
      const tempCam = new THREE.PerspectiveCamera(48, 16 / 10, 0.1, 200);
      const controller = builder(tempScene, tempCam);

      controllerRef.current = controller;
      setParts([...controller.parts]);
      setPresets([...controller.presets]);
      setActions(controller.getActions ? controller.getActions() : []);
      setSelectedPartId(controller.defaultSelectedId);
      setInspectedParts((prev) => {
        if (prev.includes(controller.defaultSelectedId)) return prev;
        const next = [...prev, controller.defaultSelectedId];
        onPartsInspected(sceneId, next);
        return next;
      });

      if (!probe.supported) {
        controller.dispose();
        disposeSceneGraph(tempScene);
        setWebglUnavailable(true);
        setLoadingScene(false);
        return;
      }

      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !probe.isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        controller.dispose();
        disposeSceneGraph(tempScene);
        setWebglUnavailable(true);
        setLoadingScene(false);
        return;
      }

      scene = tempScene;
      const width = Math.max(300, mount.clientWidth || 640);
      const height = Math.max(320, mount.clientHeight || 440);

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setPixelRatio(probe.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);

      tempCam.aspect = width / height;
      tempCam.updateProjectionMatrix();

      // Procedural environment lighting (zero external HDR files)
      pmremGen = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      envRT = pmremGen.fromScene(roomEnv, 0.04);
      scene.environment = envRT.texture;
      roomEnv.dispose();

      controls = new OrbitControls(tempCam, renderer.domElement);
      controls.enableDamping = !probe.isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.minDistance = 2.2;
      controls.maxDistance = 54;
      controls.maxPolarAngle = Math.PI * 0.92;
      if (controller.presets[0]) {
        controls.target.set(...controller.presets[0].target);
      }
      controls.update();

      // Pointer drag-vs-click raycasting
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let downX = 0;
      let downY = 0;

      const onPointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
        targetCameraGoalRef.current = null;
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!renderer || !scene) return;
        const distMoved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (distMoved > 6) return;

        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, tempCam);

        const hits = raycaster.intersectObjects(scene.children, true);
        for (const hit of hits) {
          const hitId = findPartIdFromObject(hit.object);
          if (hitId) {
            markInspected(hitId);
            break;
          }
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      // Resize handler
      resizeObserver = new ResizeObserver(() => {
        if (!mount || !renderer) return;
        const w = Math.max(280, mount.clientWidth);
        const h = Math.max(300, mount.clientHeight);
        tempCam.aspect = w / h;
        tempCam.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(mount);

      setLoadingScene(false);

      // Animation / Pacing Loop
      let lastTime = performance.now();
      const startTime = lastTime;

      const tick = () => {
        if (disposed || !renderer || !scene || !controls) return;
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        const elapsed = (now - startTime) / 1000;
        lastTime = now;

        if (targetCameraGoalRef.current) {
          const goal = targetCameraGoalRef.current;
          tempCam.position.x = THREE.MathUtils.damp(tempCam.position.x, goal.pos.x, 6, dt);
          tempCam.position.y = THREE.MathUtils.damp(tempCam.position.y, goal.pos.y, 6, dt);
          tempCam.position.z = THREE.MathUtils.damp(tempCam.position.z, goal.pos.z, 6, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, goal.target.x, 6, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, goal.target.y, 6, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, goal.target.z, 6, dt);
          if (tempCam.position.distanceTo(goal.pos) < 0.08) {
            targetCameraGoalRef.current = null;
          }
        }

        controls.autoRotate = !probe.isSoftwareGl && autoRotateRef.current;
        controls.update();
        controller.update(dt, elapsed, pausedRef.current);
        renderer.render(scene, tempCam);

        afterDraw(renderer, probe.isSoftwareGl, tick, (fn) => {
          cancelLoop = fn;
        });
      };

      afterDraw(renderer, probe.isSoftwareGl, tick, (fn) => {
        cancelLoop = fn;
      });
    };

    void init();

    return () => {
      disposed = true;
      cancelLoop?.();
      resizeObserver?.disconnect();
      controllerRef.current?.dispose();
      controllerRef.current = null;
      controls?.dispose();
      if (scene) disposeSceneGraph(scene);
      envRT?.dispose();
      pmremGen?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      if (mount) {
        mount.innerHTML = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId) || parts[0] || null,
    [parts, selectedPartId]
  );

  const handleActionTrigger = (actionId: string, optionId: string) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.onAction?.(actionId, optionId);
    setParts([...ctrl.parts]);
    if (ctrl.getActions) setActions(ctrl.getActions());
    if (ctrl.parts.length > 0 && !ctrl.parts.some((p) => p.id === selectedPartId)) {
      const nextDefault = ctrl.parts[0].id;
      markInspected(nextDefault);
    }
  };

  const handlePresetClick = (preset: ExploreCameraPreset) => {
    targetCameraGoalRef.current = {
      pos: new THREE.Vector3(...preset.position),
      target: new THREE.Vector3(...preset.target),
    };
  };

  const progressPct = Math.min(
    100,
    Math.round((inspectedParts.length / Math.max(1, minPartsRequired)) * 100)
  );
  const completedLab = inspectedParts.length >= minPartsRequired;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left/Center Interactive 3D Viewport */}
      <div className="lg:col-span-8 flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="relative w-full h-[420px] sm:h-[520px] bg-slate-950">
          {webglUnavailable ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-200 space-y-3">
              <Compass className="w-10 h-10 text-indigo-400" />
              <h3 className="font-display text-lg font-bold">
                Interactive Schematic Mode ({title})
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                WebGL hardware rendering is unavailable in this environment. Select any component from the checklist on the right to inspect its full 3D technical specifications.
              </p>
            </div>
          ) : (
            <div
              ref={mountRef}
              aria-label={`Interactive 3D Canvas for ${title}`}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />
          )}

          {loadingScene && !webglUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-200 text-xs font-medium pointer-events-none">
              Initializing 3D Scene...
            </div>
          )}

          {/* Compact Collapsible Bottom Dock — solid surface, zero backdrop-blur over WebGL */}
          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
            <div className="self-start pointer-events-auto bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 flex flex-wrap items-center gap-2 shadow-sm">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium cursor-pointer"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{paused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoRotate((r) => !r)}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                  autoRotate
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                Orbit Spin
              </button>

              {presets[0] && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(presets[0])}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset View
                </button>
              )}

              <button
                type="button"
                onClick={() => setControlsCollapsed((c) => !c)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                {controlsCollapsed ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> More Controls
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Compact
                  </>
                )}
              </button>
            </div>

            {!controlsCollapsed && (presets.length > 1 || actions.length > 0) && (
              <div className="self-start pointer-events-auto bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 flex flex-wrap items-center gap-3 shadow-sm max-w-full">
                {presets.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-semibold">Camera:</span>
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}

                {actions.map((action) => (
                  <div key={action.id} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-400 font-semibold">{action.label}:</span>
                    {action.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleActionTrigger(action.id, opt.id)}
                        className={`px-2 py-1 rounded cursor-pointer font-medium ${
                          action.activeOptionId === opt.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>Drag to rotate · Scroll to zoom · Click any 3D object to inspect</span>
          <span className="font-mono text-slate-300">
            Explored: {inspectedParts.length} / {minPartsRequired} required
          </span>
        </div>
      </div>

      {/* Right Educational Inspector & Component Selector */}
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-5">
        <div className="space-y-5">
          {/* Lab Mastery Bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 inline-flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-700" />
                Lab Inspection Progress
              </span>
              {completedLab ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lab Mastered
                </span>
              ) : (
                <span className="font-mono text-indigo-700">{progressPct}%</span>
              )}
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  completedLab ? 'bg-emerald-600' : 'bg-indigo-700'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Selectable Elements List */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Select Component ({parts.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {parts.map((part) => {
                const isSelected = selectedPart?.id === part.id;
                const isSeen = inspectedParts.includes(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => markInspected(part.id)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : isSeen
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>{part.name.split(' (')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Element Detailed Info */}
          {selectedPart && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  {selectedPart.category}
                </span>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {selectedPart.name}
                </h3>
                <p className="text-xs font-medium text-slate-500">{selectedPart.subtitle}</p>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{selectedPart.description}</p>

              <div className="space-y-2 pt-1">
                {selectedPart.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="text-slate-500 font-medium">{spec.label}</span>
                    <span className="font-mono font-semibold text-slate-900 text-right">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Inspect at least {minPartsRequired} distinct components inside this 3D module to master the lab and earn +75 XP.
          </span>
        </div>
      </aside>
    </div>
  );
}
