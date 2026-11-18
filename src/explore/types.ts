import type * as THREE from 'three';

export interface ExplorePartInfo {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  specs: Array<{ label: string; value: string }>;
}

export interface ExploreCameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ExploreSceneAction {
  id: string;
  label: string;
  options: Array<{ id: string; label: string }>;
  activeOptionId: string;
}

export interface ExploreSceneController {
  parts: ExplorePartInfo[];
  presets: ExploreCameraPreset[];
  defaultSelectedId: string;
  getActions?: () => ExploreSceneAction[];
  onAction?: (actionId: string, optionId: string) => void;
  setSelectedPart: (partId: string | null) => void;
  update: (dt: number, elapsed: number, paused: boolean) => void;
  dispose: () => void;
}

export type SceneBuilderFn = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => ExploreSceneController;
