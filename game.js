import * as THREE from 'https://unpkg.com/three@0.163.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);
scene.fog = new THREE.Fog(0x020617, 70, 220);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0x8ec5ff, 0x111111, 0.95);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(25, 45, 10);
sun.castShadow = true;
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 140;
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(320, 320, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x052e16, roughness: 0.92, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

for (let i = 0; i < 36; i += 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1 + Math.random() * 1.7, 0),
    new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 1 })
  );
  rock.position.set((Math.random() - 0.5) * 250, 0.8, (Math.random() - 0.5) * 250);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

const tank = new THREE.Group();
scene.add(tank);

const hull = new THREE.Mesh(
  new THREE.BoxGeometry(4.4, 1.3, 6),
  new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.3 })
);
hull.position.y = 0.9;
hull.castShadow = true;
tank.add(hull);

const turretPivot = new THREE.Group();
turretPivot.position.set(0, 1.6, 0);
tank.add(turretPivot);

const turret = new THREE.Mesh(
  new THREE.CylinderGeometry(1.2, 1.4, 1.1, 16),
  new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.45 })
);
turret.rotation.x = Math.PI / 2;
turret.castShadow = true;
turretPivot.add(turret);

const barrel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.17, 0.22, 3.6, 16),
  new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.28 })
);
barrel.rotation.z = Math.PI / 2;
barrel.position.set(1.8, 0.15, 0);
barrel.castShadow = true;
turretPivot.add(barrel);

const wheelGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.45, 12);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
for (let i = -2; i <= 2; i += 1) {
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 2.35, 0.55, i * 1.2);
    wheel.castShadow = true;
    tank.add(wheel);
  }
}

tank.position.set(0, 0, 15);

const tankBounds = 60;
const keys = new Set();
const projectiles = [];
const ufos = [];
const ufoShots = [];
const explosions = [];

const pointerNdc = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();

let score = 0;
let lives = 5;
let gameOver = false;
let fireCooldown = 0;
let spawnCooldown = 0.4;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const gameOverPanel = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart');

function randomUfoColor() {
  const colors = [0x22d3ee, 0xf472b6, 0x34d399, 0xfbbf24, 0xa78bfa];
  return colors[Math.floor(Math.random() * colors.length)];
}

function spawnUfo() {
  const ufo = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 1.65, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: randomUfoColor(), emissive: 0x0f172a, metalness: 0.7, roughness: 0.26 })
  );
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.7, roughness: 0.05 })
  );
  dome.position.y = 0.35;

  const glow = new THREE.PointLight(0x60a5fa, 0.8, 9);
  glow.position.y = -0.2;
  ufo.add(disk, dome, glow);

  const side = Math.random() < 0.5 ? -1 : 1;
  ufo.position.set(side * (35 + Math.random() * 18), 11 + Math.random() * 8, (Math.random() - 0.5) * 78);
  const speed = 5 + Math.random() * 4;
  const dir = new THREE.Vector3(-side, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.35).normalize();

  ufo.userData = {
    velocity: dir.multiplyScalar(speed),
    wobbleOffset: Math.random() * Math.PI * 2,
    fireTimer: 1.2 + Math.random() * 2,
    radius: 1.7
  };

  ufos.push(ufo);
  scene.add(ufo);
}

function spawnExplosion(position, color = 0xf8fafc) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), material);
  mesh.position.copy(position);
  scene.add(mesh);
  explosions.push({ mesh, life: 0.4 });
}

function fireFromTank() {
  if (fireCooldown > 0 || gameOver) return;

  const muzzle = new THREE.Vector3(3.65, 1.7, 0).applyMatrix4(tank.matrixWorld);
  const direction = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(turretPivot.quaternion)
    .add(new THREE.Vector3(0, 0.22, 0))
    .normalize();

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x1e293b })
  );
  bullet.position.copy(muzzle);
  bullet.castShadow = true;
  scene.add(bullet);

  projectiles.push({ mesh: bullet, velocity: direction.multiplyScalar(58), life: 2.2, radius: 0.5 });
  fireCooldown = 0.2;
}

function fireFromUfo(ufo) {
  const shot = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0x9f1239 })
  );
  shot.position.copy(ufo.position);
  shot.position.y -= 0.4;
  scene.add(shot);

  const target = tank.position.clone();
  target.y += 1;
  const velocity = target.sub(shot.position).normalize().multiplyScalar(24);
  ufoShots.push({ mesh: shot, velocity, life: 3.4, radius: 0.45 });
}

function updateHud() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

function endGame() {
  gameOver = true;
  finalScoreEl.textContent = `Final score: ${score}`;
  gameOverPanel.classList.remove('hidden');
}

function resetGame() {
  for (const collection of [projectiles, ufos, ufoShots, explosions]) {
    for (const entity of collection) {
      scene.remove(entity.mesh || entity);
    }
    collection.length = 0;
  }

  score = 0;
  lives = 5;
  fireCooldown = 0;
  spawnCooldown = 0.3;
  gameOver = false;
  tank.position.set(0, 0, 15);
  gameOverPanel.classList.add('hidden');
  updateHud();
}

function handleInput(delta) {
  const speed = 21;
  const move = new THREE.Vector3();

  if (keys.has('w') || keys.has('arrowup')) move.z -= 1;
  if (keys.has('s') || keys.has('arrowdown')) move.z += 1;
  if (keys.has('a') || keys.has('arrowleft')) move.x -= 1;
  if (keys.has('d') || keys.has('arrowright')) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed * delta);
    tank.position.add(move);
    tank.position.x = THREE.MathUtils.clamp(tank.position.x, -tankBounds, tankBounds);
    tank.position.z = THREE.MathUtils.clamp(tank.position.z, -tankBounds, tankBounds);
  }

  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.ray.intersectPlane(groundPlane, aimPoint)) {
    const dx = aimPoint.x - tank.position.x;
    const dz = aimPoint.z - tank.position.z;
    turretPivot.rotation.y = Math.atan2(dz, dx);
  }
}

function collide(aPos, aRadius, bPos, bRadius) {
  return aPos.distanceToSquared(bPos) <= (aRadius + bRadius) ** 2;
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  if (!gameOver) {
    handleInput(delta);

    spawnCooldown -= delta;
    if (spawnCooldown <= 0) {
      spawnUfo();
      spawnCooldown = 0.45 + Math.random() * 0.9;
    }

    fireCooldown = Math.max(0, fireCooldown - delta);
  }

  const camTarget = tank.position.clone().add(new THREE.Vector3(-19, 13, 16));
  camera.position.lerp(camTarget, 0.08);
  camera.lookAt(tank.position.x, tank.position.y + 2.4, tank.position.z);

  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const shot = projectiles[i];
    shot.mesh.position.addScaledVector(shot.velocity, delta);
    shot.life -= delta;

    if (shot.life <= 0) {
      scene.remove(shot.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    for (let u = ufos.length - 1; u >= 0; u -= 1) {
      const ufo = ufos[u];
      if (collide(shot.mesh.position, shot.radius, ufo.position, ufo.userData.radius)) {
        spawnExplosion(ufo.position, 0x67e8f9);
        scene.remove(ufo);
        ufos.splice(u, 1);
        scene.remove(shot.mesh);
        projectiles.splice(i, 1);
        score += 10;
        updateHud();
        break;
      }
    }
  }

  for (let i = ufos.length - 1; i >= 0; i -= 1) {
    const ufo = ufos[i];
    ufo.position.addScaledVector(ufo.userData.velocity, delta);
    ufo.position.y += Math.sin(clock.elapsedTime * 2.6 + ufo.userData.wobbleOffset) * 0.012;
    ufo.rotation.y += delta * 2.2;

    ufo.userData.fireTimer -= delta;
    if (!gameOver && ufo.userData.fireTimer <= 0) {
      fireFromUfo(ufo);
      ufo.userData.fireTimer = 1 + Math.random() * 2.3;
    }

    if (Math.abs(ufo.position.x) > 95 || Math.abs(ufo.position.z) > 95) {
      scene.remove(ufo);
      ufos.splice(i, 1);
    }
  }

  for (let i = ufoShots.length - 1; i >= 0; i -= 1) {
    const shot = ufoShots[i];
    shot.mesh.position.addScaledVector(shot.velocity, delta);
    shot.life -= delta;

    if (shot.life <= 0 || shot.mesh.position.y < 0.2) {
      scene.remove(shot.mesh);
      ufoShots.splice(i, 1);
      continue;
    }

    if (!gameOver && collide(shot.mesh.position, shot.radius, tank.position.clone().setY(1.2), 2.5)) {
      lives -= 1;
      updateHud();
      spawnExplosion(shot.mesh.position, 0xfb7185);
      scene.remove(shot.mesh);
      ufoShots.splice(i, 1);
      if (lives <= 0) endGame();
    }
  }

  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const exp = explosions[i];
    exp.life -= delta;
    exp.mesh.scale.addScalar(delta * 5);
    exp.mesh.material.opacity = Math.max(0, exp.life * 2.5);
    if (exp.life <= 0) {
      scene.remove(exp.mesh);
      explosions.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
  if (event.code === 'Space') {
    event.preventDefault();
    fireFromTank();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

window.addEventListener('pointermove', (event) => {
  pointerNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointerNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('pointerdown', () => {
  fireFromTank();
});

restartBtn.addEventListener('click', resetGame);

updateHud();
animate();
