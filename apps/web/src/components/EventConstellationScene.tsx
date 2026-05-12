import type { EventConstellationView } from "@risk-map/shared";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  view: EventConstellationView;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

type SceneNode = EventConstellationView["nodes"][number] & {
  x: number;
  y: number;
  z: number;
};

const kindColors = {
  focusEvent: 0xff3b8d,
  relatedEvent: 0xc084fc,
  chainNode: 0x60a5fa,
  source: 0xa78bfa
};

const relationColors = {
  sharedTheme: 0xf0abfc,
  sharedSource: 0xa78bfa,
  temporalLag: 0xfb7185,
  eventToNode: 0x7dd3fc,
  sourceEvidence: 0xc4b5fd
};

export function EventConstellationScene({ view, selectedNodeId, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef(selectedNodeId);
  selectedRef.current = selectedNodeId;

  const sceneNodes = useMemo(() => layoutNodes(view), [view]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement: HTMLDivElement = host;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012);

    const camera = new THREE.PerspectiveCamera(39, hostElement.clientWidth / Math.max(1, hostElement.clientHeight), 0.1, 280);
    camera.position.set(0, 48, 96);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x0a0a0f, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(hostElement.clientWidth, hostElement.clientHeight);
    renderer.domElement.className = "constellation-canvas";
    hostElement.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 50;
    controls.maxDistance = 132;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.12;
    controls.enablePan = false;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xfce7f3, 0x111118, 1.05));
    const roseLight = new THREE.PointLight(0xff3b8d, 2.9, 160);
    roseLight.position.set(-28, 36, 38);
    scene.add(roseLight);
    const violetLight = new THREE.PointLight(0x8b5cf6, 2.2, 180);
    violetLight.position.set(44, 28, -34);
    scene.add(violetLight);
    const blueLight = new THREE.PointLight(0x60a5fa, 1.4, 150);
    blueLight.position.set(0, 54, 52);
    scene.add(blueLight);

    addNebulaSprites(scene);
    addGuideRings(scene);
    const starField = addTwinklingStars(scene);

    const visibleIds = new Set(sceneNodes.map((node) => node.id));
    const nodeMeshes = new Map<string, THREE.Mesh>();
    const labelSprites: THREE.Sprite[] = [];
    const animatedMaterials: THREE.Material[] = [];

    for (const relation of view.relations) {
      if (!visibleIds.has(relation.sourceId) || !visibleIds.has(relation.targetId)) continue;
      const source = sceneNodes.find((node) => node.id === relation.sourceId);
      const target = sceneNodes.find((node) => node.id === relation.targetId);
      if (!source || !target) continue;

      const curve = makeRelationCurve(source, target, relation.kind);
      const glowGeometry = new THREE.TubeGeometry(curve, 56, tubeRadius(relation.kind), 8, false);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: relationColors[relation.kind],
        transparent: true,
        opacity: relationOpacity(relation.kind),
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glowLine = new THREE.Mesh(glowGeometry, glowMaterial);
      scene.add(glowLine);
    }

    for (const node of sceneNodes) {
      const radius = nodeRadius(node);
      const color = kindColors[node.kind];
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(node.x, node.y, node.z);
      scene.add(nodeGroup);

      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(radius * auraScale(node.kind), 32, 16),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: node.kind === "focusEvent" ? 0.18 : 0.09,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      nodeGroup.add(aura);
      animatedMaterials.push(aura.material);

      const geometry = node.kind === "source" ? new THREE.OctahedronGeometry(radius, 1) : new THREE.SphereGeometry(radius, 48, 28);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: node.kind === "focusEvent" ? 1.15 : node.kind === "relatedEvent" ? 0.58 : 0.42,
        roughness: node.kind === "chainNode" ? 0.36 : 0.24,
        metalness: node.kind === "source" ? 0.42 : 0.22
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { nodeId: node.id, baseRadius: radius, kind: node.kind, aura, nodeGroup };
      nodeMeshes.set(node.id, mesh);
      nodeGroup.add(mesh);

      if (node.kind === "focusEvent") {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(radius + 1.35, 0.06, 12, 120),
          new THREE.MeshBasicMaterial({ color: 0xff8ab8, transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        halo.rotation.x = Math.PI / 2;
        nodeGroup.add(halo);
      }

      if (node.kind === "focusEvent" || node.kind === "relatedEvent" || node.kind === "source") {
        const label = makeLabelSprite(node.label, node.kind);
        label.position.set(node.x, node.y + radius + 2.2, node.z);
        labelSprites.push(label);
        scene.add(label);
      }
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerUp(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...nodeMeshes.values()], false);
      const nodeId = hits[0]?.object.userData.nodeId as string | undefined;
      if (nodeId) onSelect(nodeId);
    }

    function onResize() {
      const width = hostElement.clientWidth;
      const height = Math.max(1, hostElement.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    renderer.domElement.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const clock = new THREE.Clock();
    function render() {
      const elapsed = clock.getElapsedTime();
      starField.rotation.y = elapsed * 0.006;
      const starMaterial = starField.material as THREE.PointsMaterial;
      starMaterial.opacity = 0.28 + Math.sin(elapsed * 1.6) * 0.08;

      for (const [nodeId, mesh] of nodeMeshes.entries()) {
        const selectedBoost = selectedRef.current === nodeId ? 1.34 : 1;
        const pulse = mesh.userData.kind === "focusEvent" ? 1 + Math.sin(elapsed * 1.8) * 0.045 : 1;
        mesh.scale.setScalar(selectedBoost * pulse);
        mesh.rotation.y += mesh.userData.kind === "source" ? 0.006 : 0.003;
        const aura = mesh.userData.aura as THREE.Mesh;
        aura.scale.setScalar((selectedRef.current === nodeId ? 1.2 : 1) * (1 + Math.sin(elapsed * 1.4 + mesh.userData.baseRadius) * 0.035));
      }
      for (const material of animatedMaterials) {
        if ("opacity" in material) material.opacity = Math.max(0.05, material.opacity as number);
      }
      for (const label of labelSprites) label.lookAt(camera.position);
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
      hostElement.removeChild(renderer.domElement);
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          const material = object.material;
          const disposeMaterial = (item: THREE.Material) => {
            const maybeMapped = item as THREE.Material & { map?: THREE.Texture };
            maybeMapped.map?.dispose();
            item.dispose();
          };
          if (Array.isArray(material)) material.forEach(disposeMaterial);
          else disposeMaterial(material);
        }
      });
    };
  }, [onSelect, sceneNodes, view.relations]);

  return <div ref={hostRef} className="constellation-stage" data-testid="constellation-stage" />;
}

function layoutNodes(view: EventConstellationView): SceneNode[] {
  const eventNodes = view.nodes.filter((node) => node.kind === "focusEvent" || node.kind === "relatedEvent");
  const chainNodes = view.nodes.filter((node) => node.kind === "chainNode");
  const sourceNodes = view.nodes.filter((node) => node.kind === "source");

  const placedEvents = eventNodes.map((node, index) => {
    if (node.kind === "focusEvent") return { ...node, x: 0, y: 4, z: 0 };
    const ringIndex = Math.max(0, index - 1);
    const angle = (ringIndex / Math.max(1, eventNodes.length - 1)) * Math.PI * 2;
    return { ...node, x: Math.cos(angle) * 24, y: 2 + Math.sin(angle * 2) * 1.8, z: Math.sin(angle) * 24 };
  });

  const placedChains = chainNodes.map((node, index) => {
    const angle = (index / Math.max(1, chainNodes.length)) * Math.PI * 2 + 0.22;
    const band = index % 3;
    return { ...node, x: Math.cos(angle) * (41 + band * 3.4), y: -2.5 + band * 2.2, z: Math.sin(angle) * (41 + band * 3.4) };
  });

  const placedSources = sourceNodes.map((node, index) => {
    const angle = (index / Math.max(1, sourceNodes.length)) * Math.PI * 2 + 0.5;
    return { ...node, x: Math.cos(angle) * 61, y: -8, z: Math.sin(angle) * 61 };
  });

  return [...placedEvents, ...placedChains, ...placedSources];
}

function nodeRadius(node: EventConstellationView["nodes"][number]): number {
  const heatRadius = 0.86 + Math.sqrt(Math.max(0, node.heatScore)) * 0.12;
  if (node.kind === "focusEvent") return heatRadius + 1.42;
  if (node.kind === "source") return 1.36;
  if (node.kind === "chainNode") return Math.max(0.72, heatRadius * 0.55);
  return heatRadius * 0.92;
}

function auraScale(kind: string): number {
  if (kind === "focusEvent") return 3.3;
  if (kind === "relatedEvent") return 2.5;
  return 2.2;
}

function tubeRadius(kind: string): number {
  if (kind === "sharedTheme" || kind === "temporalLag") return 0.042;
  if (kind === "eventToNode") return 0.03;
  return 0.022;
}

function makeRelationCurve(source: SceneNode, target: SceneNode, kind: string): THREE.CatmullRomCurve3 {
  const start = new THREE.Vector3(source.x, source.y, source.z);
  const end = new THREE.Vector3(target.x, target.y, target.z);
  const mid = start.clone().lerp(end, 0.5);
  const lift = kind === "sourceEvidence" ? 3.6 : kind === "eventToNode" ? 5.4 : 8.2;
  const radial = mid.clone().setY(0).normalize().multiplyScalar(kind === "sourceEvidence" ? 3 : 1.5);
  mid.add(radial);
  mid.y += lift;
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function relationOpacity(kind: string): number {
  if (kind === "eventToNode") return 0.26;
  if (kind === "sourceEvidence") return 0.18;
  if (kind === "sharedSource") return 0.24;
  return 0.42;
}

function addGuideRings(scene: THREE.Scene) {
  const rings = [
    { radius: 24, color: 0xff3b8d, opacity: 0.16 },
    { radius: 43, color: 0x60a5fa, opacity: 0.13 },
    { radius: 61, color: 0xa78bfa, opacity: 0.1 }
  ];
  for (const ring of rings) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ring.radius, 0.026, 8, 180),
      new THREE.MeshBasicMaterial({ color: ring.color, transparent: true, opacity: ring.opacity, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);
  }
}

function addTwinklingStars(scene: THREE.Scene): THREE.Points {
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(780);
  for (let index = 0; index < starPositions.length; index += 3) {
    const spread = index % 9 === 0 ? 230 : 170;
    starPositions[index] = (Math.random() - 0.5) * spread;
    starPositions[index + 1] = (Math.random() - 0.5) * 98;
    starPositions[index + 2] = (Math.random() - 0.5) * spread;
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xf5d0fe, size: 0.34, transparent: true, opacity: 0.3, depthWrite: false })
  );
  scene.add(stars);
  return stars;
}

function addNebulaSprites(scene: THREE.Scene) {
  const texture = makeRadialGlowTexture();
  const washes = [
    { color: 0xff3b8d, x: -42, y: 18, z: -46, scale: 72, opacity: 0.13 },
    { color: 0x8b5cf6, x: 46, y: 2, z: -58, scale: 96, opacity: 0.12 },
    { color: 0x60a5fa, x: 0, y: -22, z: -68, scale: 82, opacity: 0.09 }
  ];
  for (const wash of washes) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, color: wash.color, transparent: true, opacity: wash.opacity, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    sprite.position.set(wash.x, wash.y, wash.z);
    sprite.scale.set(wash.scale, wash.scale, 1);
    scene.add(sprite);
  }
}

function makeRadialGlowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

function makeLabelSprite(label: string, kind: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 126;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(18, 0, 482, 0);
    gradient.addColorStop(0, kind === "focusEvent" ? "rgba(255, 59, 141, 0.32)" : "rgba(167, 139, 250, 0.2)");
    gradient.addColorStop(1, "rgba(96, 165, 250, 0.16)");
    context.fillStyle = "rgba(10, 10, 15, 0.78)";
    roundRect(context, 8, 22, 484, 72, 18);
    context.fill();
    context.strokeStyle = gradient;
    context.lineWidth = 3;
    context.stroke();
    context.font = "700 24px Inter, system-ui, sans-serif";
    context.fillStyle = kind === "focusEvent" ? "#fff1f8" : "#f4e8ff";
    context.textBaseline = "middle";
    context.fillText(trimLabel(label), 26, 58, 448);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(kind === "focusEvent" ? 18 : 13.8, kind === "focusEvent" ? 4.5 : 3.55, 1);
  return sprite;
}

function trimLabel(label: string): string {
  return label.length > 30 ? `${label.slice(0, 29)}…` : label;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.closePath();
}
