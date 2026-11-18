import * as THREE from 'three';

export interface WebGLProbeResult {
  supported: boolean;
  isSoftwareGl: boolean;
}

export function probeWebGLSupport(): WebGLProbeResult {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }

  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);

    const loseExt = gl.getExtension('WEBGL_lose_context');
    loseExt?.loseContext();

    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

export function tagSelectable(object: THREE.Object3D, partId: string): void {
  object.userData.partId = partId;
  object.traverse((child) => {
    child.userData.partId = partId;
  });
}

export function findPartIdFromObject(object: THREE.Object3D | null): string | null {
  let curr: THREE.Object3D | null = object;
  while (curr) {
    if (typeof curr.userData?.partId === 'string') {
      return curr.userData.partId;
    }
    curr = curr.parent;
  }
  return null;
}

export function makeCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    draw(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function disposeSceneGraph(scene: THREE.Scene): void {
  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry);
      mesh.geometry.dispose();
    }

    const matProp = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (matProp) {
      const mats = Array.isArray(matProp) ? matProp : [matProp];
      for (const mat of mats) {
        if (!mat || disposedMaterials.has(mat)) continue;
        disposedMaterials.add(mat);

        const record = mat as unknown as Record<string, unknown>;
        for (const val of Object.values(record)) {
          if (val && val instanceof THREE.Texture && !disposedTextures.has(val)) {
            disposedTextures.add(val);
            val.dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}

/**
 * Software WebGL pacing helper: waits for the GPU command queue to complete before
 * scheduling the next frame, keeping software rasterizers responsive.
 */
export function afterDraw(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  tick: () => void,
  registerCancel: (cancelFn: () => void) => void
): void {
  if (!isSoftwareGl) {
    const rafId = window.requestAnimationFrame(tick);
    registerCancel(() => window.cancelAnimationFrame(rafId));
    return;
  }

  const gl = renderer.getContext();
  if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (sync) {
      let timerId: number | null = null;
      let cancelled = false;
      const poll = () => {
        if (cancelled) return;
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          gl.deleteSync(sync);
          timerId = window.setTimeout(tick, 80);
        } else if (status === gl.WAIT_FAILED) {
          gl.deleteSync(sync);
          timerId = window.setTimeout(tick, 100);
        } else {
          timerId = window.setTimeout(poll, 16);
        }
      };
      timerId = window.setTimeout(poll, 16);
      registerCancel(() => {
        cancelled = true;
        if (timerId !== null) window.clearTimeout(timerId);
        try {
          gl.deleteSync(sync);
        } catch {
          // ignore if context lost
        }
      });
      return;
    }
  }

  const fallbackId = window.setTimeout(tick, 90);
  registerCancel(() => window.clearTimeout(fallbackId));
}
