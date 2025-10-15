import * as THREE from 'https://cdn.skypack.dev/three';

let scene, camera, renderer;

function init() {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // dark background

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.5);
  document.getElementById('gameCanvas').appendChild(renderer.domElement);

  // Add a cube (placeholder for racer or track)
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0xff0055 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Add light
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  }

  animate();
}

window.addEventListener('load', init);
