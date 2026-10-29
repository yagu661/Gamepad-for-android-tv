import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as THREE from 'three';
import {
  Tv,
  Gamepad2,
  Wifi,
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  RotateCcw,
  HelpCircle,
  Trophy,
  Activity,
  Layers,
  Download,
  MousePointer,
  Search,
  MessageSquare,
  Lock,
  Lightbulb,
  Crosshair,
  CheckCircle2
} from 'lucide-react';
import { GamepadPacket, RoomConnectionStatus } from '../types/gamepad';
import { connectionManager } from '../utils/connection';
import { AirtelSetupModal } from './AirtelSetupModal';
import { ApkReleaseModal } from './ApkReleaseModal';
import { playButtonSound } from '../utils/audio';

interface TVReceiverProps {
  roomCode: string;
  onSwitchToPhone: () => void;
}

export const TVReceiver: React.FC<TVReceiverProps> = ({
  roomCode: initialRoomCode,
  onSwitchToPhone
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [status, setStatus] = useState<RoomConnectionStatus>(connectionManager.getStatus());
  const [lastPacket, setLastPacket] = useState<GamepadPacket | null>(null);
  const [isAirtelModalOpen, setIsAirtelModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeEmoteText, setActiveEmoteText] = useState<string | null>(null);
  const [activeSearchBanner, setActiveSearchBanner] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; time: string }[]>([]);
  const [viewMode, setViewMode] = useState<'3d-game' | 'telemetry'>('3d-game');

  // Mouse Cursor State for TV screen
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [cursorClicking, setCursorClicking] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [activeSlot, setActiveSlot] = useState(1);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [shiftLockOn, setShiftLockOn] = useState(false);

  // Canvas ref for 3D Roblox arena
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const flashLightObjRef = useRef<THREE.SpotLight | null>(null);
  const toolMeshRef = useRef<THREE.Mesh | null>(null);

  // Character physics state
  const charState = useRef({
    x: 0,
    y: 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    isGrounded: false,
    rotationY: 0,
    cameraAngleH: 0,
    cameraAngleV: 0.35,
    cameraDistance: 9,
    coinsCollected: 0,
    runAnimTime: 0,
    isDancing: false,
    danceTime: 0,
  });

  // Current inputs buffer
  const inputsRef = useRef({
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    jump: false,
    sprint: false,
    action: false,
    interact: false,
    zoomIn: false,
    zoomOut: false,
  });

  // Generate or join room on TV
  useEffect(() => {
    let code = roomCode;
    if (!code) {
      code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomCode(code);
    }
    connectionManager.connect('tv', code);

    const unsubStatus = connectionManager.subscribeStatus(setStatus);

    const unsubMsg = connectionManager.subscribe((data) => {
      if (data.type === 'input') {
        setLastPacket(data);
        inputsRef.current.lx = data.axes.lx;
        inputsRef.current.ly = data.axes.ly;
        inputsRef.current.rx = data.axes.rx;
        inputsRef.current.ry = data.axes.ry;
        inputsRef.current.jump = data.buttons.jump || data.buttons.a;
        inputsRef.current.sprint = data.buttons.l1 || data.buttons.sprint;
        inputsRef.current.action = data.buttons.r1;
        inputsRef.current.interact = data.buttons.x;
        inputsRef.current.zoomIn = data.buttons.zoomIn;
        inputsRef.current.zoomOut = data.buttons.zoomOut;

        if (data.buttons.selectedSlot) {
          setActiveSlot(data.buttons.selectedSlot);
        }
        if (data.buttons.flashlight !== undefined) {
          setFlashlightOn(data.buttons.flashlight);
          if (flashLightObjRef.current) {
            flashLightObjRef.current.visible = data.buttons.flashlight;
          }
        }
        if (data.buttons.shiftLock !== undefined) {
          setShiftLockOn(data.buttons.shiftLock);
        }

        // Handle Mouse Cursor packets from phone
        if (data.cursor && data.cursor.active) {
          setCursorVisible(true);
          setCursorPos((prev) => {
            const nextX = Math.max(10, Math.min(window.innerWidth - 10, prev.x + (data.cursor?.dx || 0)));
            const nextY = Math.max(10, Math.min(window.innerHeight - 10, prev.y + (data.cursor?.dy || 0)));
            return { x: nextX, y: nextY };
          });

          if (data.cursor.leftClick) {
            setCursorClicking(true);
            setTimeout(() => setCursorClicking(false), 200);
            if (soundEnabled) playButtonSound('click', 0.5);
          }
        }

        // Handle Search and Chat Keypad packets
        if (data.keyboard && data.keyboard.text) {
          if (data.keyboard.action === 'search') {
            setActiveSearchBanner(data.keyboard.text);
            setTimeout(() => setActiveSearchBanner(null), 5000);
            if (soundEnabled) playButtonSound('menu', 0.6);
          } else {
            // In-game Chat message
            const newMsg = {
              id: Math.random().toString(36).substring(7),
              text: data.keyboard.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages((prev) => [...prev.slice(-4), newMsg]);
            if (soundEnabled) playButtonSound('bumper', 0.4);
          }
        }

        // Emotes
        if (data.buttons.emote) {
          handleEmoteTrigger(data.buttons.emote);
        }
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
      connectionManager.disconnect();
    };
  }, [roomCode, soundEnabled]);

  const handleEmoteTrigger = (cmd: string) => {
    setActiveEmoteText(cmd);
    setTimeout(() => setActiveEmoteText(null), 3500);

    if (cmd === '/reset') {
      charState.current.x = 0;
      charState.current.y = 3;
      charState.current.z = 0;
      charState.current.vx = 0;
      charState.current.vy = 0;
      charState.current.vz = 0;
      connectionManager.sendRumble([100, 50, 100]);
    } else if (cmd.includes('dance')) {
      charState.current.isDancing = true;
      charState.current.danceTime = 0;
      setTimeout(() => {
        charState.current.isDancing = false;
      }, 5000);
    }
  };

  // Build the 3D Roblox Obby Playground with Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Floating Clouds
    for (let i = 0; i < 18; i++) {
      const cloudGeo = new THREE.BoxGeometry(10 + Math.random() * 8, 3, 6 + Math.random() * 4);
      const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set((Math.random() - 0.5) * 120, 25 + Math.random() * 10, (Math.random() - 0.5) * 120);
      scene.add(cloud);
    }

    // Platforms
    const platforms: { box: THREE.Box3; type: 'safe' | 'lava' | 'bounce' | 'coin'; mesh: THREE.Mesh }[] = [];

    const addPlatform = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number,
      type: 'safe' | 'lava' | 'bounce' = 'safe'
    ) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1,
        emissive: type === 'lava' ? 0xff2200 : type === 'bounce' ? 0x00ff88 : 0x000000,
        emissiveIntensity: type === 'lava' ? 0.6 : type === 'bounce' ? 0.3 : 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      platforms.push({ box, type, mesh });
      return mesh;
    };

    // Spawn platform
    addPlatform(0, 0, 0, 14, 2, 14, 0x4ade80, 'safe');

    // Rainbow stepping stones
    const rainbowColors = [0xef4444, 0xf97316, 0xeab308, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];
    rainbowColors.forEach((col, idx) => {
      addPlatform(0, 0.5 + idx * 0.7, -10 - idx * 5, 4, 1, 3.5, col, 'safe');
    });

    // Checkpoint 1
    addPlatform(0, 5.5, -50, 12, 1.5, 12, 0x38bdf8, 'safe');

    // Lava hazards
    for (let i = 0; i < 5; i++) {
      addPlatform(0, 6 + i * 0.5, -60 - i * 6, 5, 0.8, 3, 0xffffff, 'safe');
      addPlatform(0, 6.2 + i * 0.5, -63 - i * 6, 6, 0.5, 1.5, 0xef4444, 'lava');
    }

    // Checkpoint 2 with Bounce Pad
    addPlatform(0, 9, -95, 14, 1.5, 14, 0xfacc15, 'safe');
    addPlatform(0, 9.8, -95, 4, 0.4, 4, 0x10b981, 'bounce');

    // Summit Trophy Island
    addPlatform(0, 24, -120, 16, 2, 16, 0xffffff, 'safe');

    const trophyGeo = new THREE.CylinderGeometry(1.5, 0.8, 3, 8);
    const trophyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const trophy = new THREE.Mesh(trophyGeo, trophyMat);
    trophy.position.set(0, 26.5, -120);
    scene.add(trophy);

    // Coins
    const coins: THREE.Mesh[] = [];
    const coinPositions = [
      [0, 2, -15],
      [0, 4, -30],
      [0, 7.5, -50],
      [0, 8, -75],
      [0, 12, -95],
      [0, 27, -120],
    ];

    coinPositions.forEach(([cx, cy, cz]) => {
      const coinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.25, 16);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xaa7700,
        emissiveIntensity: 0.5,
      });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(cx, cy, cz);
      coin.rotation.x = Math.PI / 2;
      scene.add(coin);
      coins.push(coin);
    });

    // Classic Blocky Roblox Avatar
    const charGroup = new THREE.Group();
    characterGroupRef.current = charGroup;

    // Torso (Blue block)
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.8, 0.9);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.9;
    torso.castShadow = true;
    charGroup.add(torso);

    // Head (Yellow cube)
    const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.3;
    head.castShadow = true;
    charGroup.add(head);

    // Face eyes and smile
    const eyeGeo = new THREE.BoxGeometry(0.18, 0.22, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 3.4, 0.52);
    charGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 3.4, 0.52);
    charGroup.add(rightEye);

    const smileGeo = new THREE.BoxGeometry(0.45, 0.1, 0.05);
    const smile = new THREE.Mesh(smileGeo, eyeMat);
    smile.position.set(0, 3.15, 0.52);
    charGroup.add(smile);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.65, 1.6, 0.65);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-1.25, 1.9, 0);
    leftArm.castShadow = true;
    charGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(1.25, 1.9, 0);
    rightArm.castShadow = true;
    charGroup.add(rightArm);

    // Equipped Tool in Right Hand (Roblox Golden Sword)
    const toolGeo = new THREE.BoxGeometry(0.2, 1.4, 0.2);
    const toolMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const toolMesh = new THREE.Mesh(toolGeo, toolMat);
    toolMesh.position.set(0, -0.6, 0.4);
    toolMesh.rotation.x = Math.PI / 4;
    rightArm.add(toolMesh);
    toolMeshRef.current = toolMesh;

    // Flashlight SpotLight attached to Head
    const spotLight = new THREE.SpotLight(0xffffff, 4, 30, Math.PI / 6, 0.3);
    spotLight.position.set(0, 3.3, 0.6);
    spotLight.target.position.set(0, 3.3, 10);
    charGroup.add(spotLight);
    charGroup.add(spotLight.target);
    spotLight.visible = false;
    flashLightObjRef.current = spotLight;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.7, 1.6, 0.7);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.45, 0.8, 0);
    leftLeg.castShadow = true;
    charGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.45, 0.8, 0);
    rightLeg.castShadow = true;
    charGroup.add(rightLeg);

    scene.add(charGroup);

    let lastTime = performance.now();
    let animId: number;

    const gameLoop = () => {
      animId = requestAnimationFrame(gameLoop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const cs = charState.current;
      const inp = inputsRef.current;

      // Handle Zoom In / Zoom Out
      if (inp.zoomIn) {
        cs.cameraDistance = Math.max(3.5, cs.cameraDistance - 8 * dt);
      }
      if (inp.zoomOut) {
        cs.cameraDistance = Math.min(18, cs.cameraDistance + 8 * dt);
      }

      // Camera Orbit via Right Stick
      if (Math.abs(inp.rx) > 0.05) {
        cs.cameraAngleH -= inp.rx * dt * 2.8;
      }
      if (Math.abs(inp.ry) > 0.05) {
        cs.cameraAngleV = Math.max(0.1, Math.min(1.2, cs.cameraAngleV - inp.ry * dt * 1.8));
      }

      const camForward = new THREE.Vector3(-Math.sin(cs.cameraAngleH), 0, -Math.cos(cs.cameraAngleH)).normalize();
      const camRight = new THREE.Vector3(Math.cos(cs.cameraAngleH), 0, -Math.sin(cs.cameraAngleH)).normalize();

      const moveSpeed = inp.sprint ? 14 : 9;
      let targetVx = (camRight.x * inp.lx + camForward.x * -inp.ly) * moveSpeed;
      let targetVz = (camRight.z * inp.lx + camForward.z * -inp.ly) * moveSpeed;

      cs.vx += (targetVx - cs.vx) * (cs.isGrounded ? 14 : 4) * dt;
      cs.vz += (targetVz - cs.vz) * (cs.isGrounded ? 14 : 4) * dt;
      cs.vy -= 26 * dt;

      if (inp.jump && cs.isGrounded) {
        cs.vy = 12.5;
        cs.isGrounded = false;
        if (soundEnabled) playButtonSound('jump', 0.5);
      }

      cs.x += cs.vx * dt;
      cs.y += cs.vy * dt;
      cs.z += cs.vz * dt;

      const moveMagnitude = Math.sqrt(cs.vx * cs.vx + cs.vz * cs.vz);
      if (moveMagnitude > 0.5) {
        cs.rotationY = Math.atan2(cs.vx, cs.vz);
      }

      cs.isGrounded = false;
      const charRadius = 0.8;

      platforms.forEach((p) => {
        const minX = p.box.min.x;
        const maxX = p.box.max.x;
        const minZ = p.box.min.z;
        const maxZ = p.box.max.z;
        const topY = p.box.max.y;

        if (
          cs.x >= minX - charRadius &&
          cs.x <= maxX + charRadius &&
          cs.z >= minZ - charRadius &&
          cs.z <= maxZ + charRadius
        ) {
          if (cs.y <= topY && cs.y >= topY - 1.2 && cs.vy <= 0) {
            if (p.type === 'lava') {
              cs.x = 0;
              cs.y = 3;
              cs.z = 0;
              cs.vx = 0;
              cs.vy = 0;
              cs.vz = 0;
              connectionManager.sendRumble([150, 80, 200]);
              return;
            } else if (p.type === 'bounce') {
              cs.vy = 24;
              cs.isGrounded = false;
              connectionManager.sendRumble([40, 40]);
              if (soundEnabled) playButtonSound('jump', 0.8);
              return;
            } else {
              cs.y = topY;
              cs.vy = 0;
              cs.isGrounded = true;
            }
          }
        }
      });

      if (cs.y < -15) {
        cs.x = 0;
        cs.y = 3;
        cs.z = 0;
        cs.vx = 0;
        cs.vy = 0;
        cs.vz = 0;
        connectionManager.sendRumble([100, 50, 100]);
      }

      coins.forEach((coin) => {
        if (coin.visible) {
          coin.rotation.z += 2.5 * dt;
          const dist = Math.hypot(cs.x - coin.position.x, cs.y - coin.position.y, cs.z - coin.position.z);
          if (dist < 2.0) {
            coin.visible = false;
            setScore((s) => s + 100);
            connectionManager.sendRumble([30, 20, 50]);
            if (soundEnabled) playButtonSound('bumper', 0.6);
          }
        }
      });

      charGroup.position.set(cs.x, cs.y, cs.z);
      charGroup.rotation.y = cs.rotationY;

      if (!cs.isGrounded) {
        leftArm.rotation.x = -2.4;
        rightArm.rotation.x = -2.4;
        leftLeg.rotation.x = 0.5;
        rightLeg.rotation.x = -0.4;
      } else if (cs.isDancing) {
        cs.danceTime += dt * 8;
        charGroup.rotation.y += Math.sin(cs.danceTime) * 0.15;
        leftArm.rotation.x = Math.sin(cs.danceTime) * 1.5;
        rightArm.rotation.x = -Math.sin(cs.danceTime) * 1.5;
        leftLeg.rotation.x = Math.sin(cs.danceTime * 0.5) * 0.4;
      } else if (moveMagnitude > 0.5) {
        cs.runAnimTime += dt * (inp.sprint ? 16 : 10);
        const swing = Math.sin(cs.runAnimTime) * 0.8;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
        leftArm.rotation.x = -swing;
        rightArm.rotation.x = swing;
      } else {
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
      }

      const targetCamX = cs.x + Math.sin(cs.cameraAngleH) * Math.cos(cs.cameraAngleV) * cs.cameraDistance;
      const targetCamY = cs.y + Math.sin(cs.cameraAngleV) * cs.cameraDistance + 1.5;
      const targetCamZ = cs.z + Math.cos(cs.cameraAngleH) * Math.cos(cs.cameraAngleV) * cs.cameraDistance;

      camera.position.set(targetCamX, targetCamY, targetCamZ);
      camera.lookAt(cs.x, cs.y + 1.8, cs.z);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(gameLoop);

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [soundEnabled]);

  const controllerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomCode}`
    : `https://...?room=${roomCode}`;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-zinc-950 text-white flex flex-col overflow-hidden select-none">
      {/* TOP TV HEADER */}
      <header className="px-6 py-2.5 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/30">
            <Tv className="w-5 h-5 text-red-500" />
            <span className="font-black text-sm tracking-wider uppercase">AIRTEL XSTREAM TV RECEIVER</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/60 text-xs">
            {status.connected && status.controllerCount > 0 ? (
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Xbox Gamepad Active ({status.ping}ms • {status.transport.toUpperCase()})
              </span>
            ) : (
              <span className="flex items-center gap-2 text-amber-400 font-medium">
                <Wifi className="w-4 h-4 animate-bounce" />
                Waiting for Phone to Connect...
              </span>
            )}
          </div>
        </div>

        {/* TV Header Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-1 rounded-xl bg-red-950/80 border-2 border-red-500">
            <span className="text-xs uppercase text-zinc-300 font-bold">TV PIN:</span>
            <span className="text-xl font-black font-mono tracking-widest text-white">{roomCode}</span>
          </div>

          <button
            onClick={() => setViewMode(viewMode === '3d-game' ? 'telemetry' : '3d-game')}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{viewMode === '3d-game' ? 'HUD Telemetry' : '3D Roblox Game'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:text-white text-zinc-400"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Download APK Button */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-md"
            title="Download Android APK from GitHub Release"
          >
            <Download className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>Get APK</span>
          </button>

          {/* Airtel Setup Guide */}
          <button
            onClick={() => setIsAirtelModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Setup Guide</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={onSwitchToPhone}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
          >
            Phone Mode
          </button>
        </div>
      </header>

      {/* MAIN SCREEN AREA */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* 3D Roblox Arena */}
        <div ref={mountRef} className="w-full h-full relative" />

        {/* TV MOUSE CURSOR (Rendered right on TV screen like a real connected mouse) */}
        {cursorVisible && (
          <div
            style={{
              position: 'absolute',
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              transform: 'translate(-2px, -2px)',
              pointerEvents: 'none',
              zIndex: 9999,
              transition: 'transform 0.05s ease-out'
            }}
          >
            {/* SVG Gaming Cursor Arrow */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
            >
              <path
                d="M3 3L10.5 21L13.5 13.5L21 10.5L3 3Z"
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Click Ripple Effect */}
            {cursorClicking && (
              <span className="absolute -left-2 -top-2 w-8 h-8 rounded-full border-2 border-cyan-400 animate-ping opacity-90" />
            )}
          </div>
        )}

        {/* Top Floating Game HUD */}
        <div className="absolute top-4 left-6 z-10 flex items-center gap-4 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-2xl">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase text-zinc-300 font-bold">Obby Score:</span>
            <span className="text-xl font-black font-mono text-amber-400">{score}</span>
          </div>

          {/* Active Slot Indicator */}
          <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-emerald-500/30 flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-400">EQUIPPED:</span>
            <span className="text-emerald-400 font-bold">SLOT #{activeSlot}</span>
          </div>

          {/* Flashlight Indicator */}
          {flashlightOn && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 animate-pulse" />
              <span>Flashlight ON</span>
            </div>
          )}

          {/* Shift Lock Crosshair Indicator */}
          {shiftLockOn && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Shift Lock</span>
            </div>
          )}

          {/* Emote notification */}
          {activeEmoteText && (
            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-sm uppercase tracking-wider animate-bounce shadow-2xl">
              Roblox Action: {activeEmoteText}
            </div>
          )}
        </div>

        {/* TV SEARCH BANNER (When phone user searches using the keypad) */}
        {activeSearchBanner && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/90 backdrop-blur-md border-2 border-emerald-500 rounded-2xl px-6 py-3 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-3 animate-in slide-in-from-top-6">
            <Search className="w-5 h-5 text-emerald-400 animate-spin" />
            <div>
              <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                Roblox TV Catalog & Game Search:
              </div>
              <div className="text-base font-black text-white font-mono">
                "{activeSearchBanner}"
              </div>
            </div>
            <span className="text-xs bg-emerald-500 text-black px-2 py-0.5 rounded font-bold ml-2">
              Searching...
            </span>
          </div>
        )}

        {/* TV IN-GAME CHAT FEED (Top Right) */}
        {chatMessages.length > 0 && (
          <div className="absolute top-4 right-6 z-20 max-w-sm w-full space-y-1.5 pointer-events-none">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white shadow-xl animate-in fade-in"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-0.5">
                  <span className="text-emerald-400 font-bold">[Phone Controller]</span>
                  <span>{msg.time}</span>
                </div>
                <div className="font-medium">{msg.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* TV Quick Pairing QR Card (Bottom Right) */}
        <div className="absolute bottom-6 right-6 z-20 bg-black/85 backdrop-blur-md border-2 border-red-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4 max-w-sm">
          <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
            <QRCodeSVG value={controllerUrl} size={90} level="M" />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
              Scan with Phone Camera
            </div>
            <div className="text-xs text-zinc-300 font-medium">
              Instant link to this Airtel TV screen
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              PIN: <strong className="text-white font-bold">{roomCode}</strong>
            </div>
          </div>
        </div>

        {/* Real-time Gamepad Telemetry Overlay (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-20 bg-black/85 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-4 shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2 font-bold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Live Xbox Controller & Mouse Telemetry</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              Seq #{lastPacket?.seq || 0}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-zinc-300">
                <span>Left Stick (Move)</span>
                <span className="font-mono text-emerald-400">
                  {inputsRef.current.lx.toFixed(2)}, {inputsRef.current.ly.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-10 bg-black/60 rounded-lg relative flex items-center justify-center overflow-hidden border border-zinc-800">
                <div
                  className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-transform"
                  style={{
                    transform: `translate(${inputsRef.current.lx * 30}px, ${inputsRef.current.ly * 15}px)`
                  }}
                />
              </div>
            </div>

            <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-zinc-300">
                <span>Right Stick (Camera/Aim)</span>
                <span className="font-mono text-cyan-400">
                  {inputsRef.current.rx.toFixed(2)}, {inputsRef.current.ry.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-10 bg-black/60 rounded-lg relative flex items-center justify-center overflow-hidden border border-zinc-800">
                <div
                  className="w-4 h-4 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-transform"
                  style={{
                    transform: `translate(${inputsRef.current.rx * 30}px, ${inputsRef.current.ry * 15}px)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Real-time Xbox Buttons & Actions HUD */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-zinc-800/80 text-[10px] font-bold">
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.a || lastPacket?.buttons.jump ? 'bg-emerald-500 text-black font-black shadow-[0_0_10px_#10b981]' : 'bg-zinc-800 text-zinc-500'}`}>
              A (JUMP)
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.b ? 'bg-rose-500 text-white shadow-[0_0_10px_#f43f5e]' : 'bg-zinc-800 text-zinc-500'}`}>
              B (CROUCH)
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.x ? 'bg-sky-500 text-black shadow-[0_0_10px_#0284c7]' : 'bg-zinc-800 text-zinc-500'}`}>
              X (ACT E)
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.y ? 'bg-amber-400 text-black shadow-[0_0_10px_#facc15]' : 'bg-zinc-800 text-zinc-500'}`}>
              Y (INV)
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.l1 ? 'bg-purple-500 text-white shadow-[0_0_10px_#a855f7]' : 'bg-zinc-800 text-zinc-500'}`}>
              LB SPRINT
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.r1 ? 'bg-purple-500 text-white shadow-[0_0_10px_#a855f7]' : 'bg-zinc-800 text-zinc-500'}`}>
              RB CLICK
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.flashlight ? 'bg-amber-400 text-black shadow-[0_0_10px_#facc15]' : 'bg-zinc-800 text-zinc-500'}`}>
              F LIGHT
            </span>
            <span className={`px-2 py-0.5 rounded ${lastPacket?.buttons.reload ? 'bg-sky-400 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
              R RELOAD
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AirtelSetupModal
        isOpen={isAirtelModalOpen}
        onClose={() => setIsAirtelModalOpen(false)}
        roomCode={roomCode}
      />
      <ApkReleaseModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
};
