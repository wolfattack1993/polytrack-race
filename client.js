// public/client.js

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// --- Global Variables ---
const socket = io();
let myId = '';
const players = {};
let player, controls;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a192f);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- UI Elements ---
const authUI = document.getElementById('auth-ui');
const usernameInput = document.getElementById('username-input');
playButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        authUI.style.display = 'none';
        socket.emit('login', username);
        setupControls(); // <-- Call this before initGame
        initGame();
    } else {
        alert('Please enter a username!');
    }
});
insertCodeBtn.addEventListener('click', () => {
    const code = prompt("Enter Admin Code:");
    if (code) {
        socket.emit('adminCodeAttempt', code);
    }
});

// Listen for admin access granted
socket.on('adminAccessGranted', () => {
    alert("Admin mode activated for this session.");
    adminBar.classList.remove('hidden');
});

// Listen for admin access denied
socket.on('adminAccessDenied', () => {
    alert("Wrong code. Access denied.");
});
const adminBar = document.getElementById('admin-broadcast-bar');
const adminInput = document.getElementById('admin-broadcast-input');
const adminSendBtn = document.getElementById('admin-broadcast-btn');
const globalMessageDiv = document.getElementById('global-message');


// --- Game Setup ---
function initGame() {
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x172a45 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    
    // Some "buildings" for collision
    createBox(5, 2, 2, -10, 1, 0, 0x5691c8);
    createBox(2, 2, 8, 10, 1, 5, 0x5691c8);
    createBox(3, 2, 3, 0, 1, -8, 0x5691c8);

    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    animate();
}

function createBox(width, height, depth, x, y, z, color) {
    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const boxMat = new THREE.MeshStandardMaterial({ color });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(x, y, z);
    box.userData.isCollidable = true; // Flag for collision detection
    box.userData.bb = new THREE.Box3().setFromObject(box); // Pre-calculate bounding box
    scene.add(box);
}

// --- Player Class ---
class Player {
    constructor(id, isMe = false, username = 'Guest') {
        this.id = id;
        this.isMe = isMe;
        const color = isMe ? 0x00b8ff : 0xff4136;
        
        const geometry = new THREE.BoxGeometry(1, 0.5, 2);
        const material = new THREE.MeshStandardMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        scene.add(this.mesh);

        // Add a simple "front" indicator
        const frontGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const frontMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const front = new THREE.Mesh(frontGeo, frontMat);
        front.position.z = -1; // Position it at the front of the car
        this.mesh.add(front);

        this.speed = 0;
        this.maxSpeed = 0.15;
        this.acceleration = 0.005;
        this.friction = 0.97;
        this.turnSpeed = 0.05;

        // Bounding box for collisions
        this.mesh.userData.bb = new THREE.Box3().setFromObject(this.mesh);
    }

    update() {
        // Apply friction
        this.speed *= this.friction;

        // Basic keyboard controls
        if (controls['w']) this.speed += this.acceleration;
        if (controls['s']) this.speed -= this.acceleration;
        if (Math.abs(this.speed) > 0.01) { // Only turn when moving
             if (controls['a']) this.mesh.rotation.y += this.turnSpeed;
             if (controls['d']) this.mesh.rotation.y -= this.turnSpeed;
        }

        // Clamp speed
        this.speed = Math.max(-this.maxSpeed / 2, Math.min(this.maxSpeed, this.speed));
        
        // Calculate new position
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const delta = forward.multiplyScalar(this.speed);
        const newPos = this.mesh.position.clone().add(delta);

        // --- Collision Detection ---
        const playerBB = this.mesh.userData.bb.clone().translate(delta);
        let collision = false;
        scene.children.forEach(obj => {
            if (obj.userData.isCollidable && playerBB.intersectsBox(obj.userData.bb)) {
                collision = true;
            }
        });

        if (!collision) {
             this.mesh.position.add(delta);
        } else {
             this.speed = 0; // Stop on collision
        }
        
        // Camera follows player
        const offset = new THREE.Vector3(0, 5, 8).applyQuaternion(this.mesh.quaternion);
        camera.position.copy(this.mesh.position).add(offset);
        camera.lookAt(this.mesh.position);
    }
}

// --- Keyboard Input ---
function setupControls() {
    controls = {};
    document.addEventListener('keydown', (e) => controls[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => controls[e.key.toLowerCase()] = false);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
if (player) {
    player.update();
    // Send our position to the server periodically
    socket.emit('playerMove', { 
        position: {
            x: player.mesh.position.x,
            y: player.mesh.position.y,
            z: player.mesh.position.z
        }, 
        rotation: {
            x: player.mesh.rotation.x,
            y: player.mesh.rotation.y,
            z: player.mesh.rotation.z
        }
    });
}
    renderer.render(scene, camera);
}


// --- Socket.IO Event Handlers ---
socket.on('init', (data) => {
    myId = data.id;
    // Create my player
    player = new Player(myId, true);
    players[myId] = player;
    
    // Create other players already in the game
    for (const id in data.players) {
        if (id !== myId) {
            const pData = data.players[id];
            players[id] = new Player(id, false, pData.username);
            players[id].mesh.position.copy(pData.position);
            players[id].mesh.rotation.set(pData.rotation.x, pData.rotation.y, pData.rotation.z);
        }
    }
});

socket.on('playerJoined', (pData) => {
    console.log('Player joined:', pData.username);
    players[pData.id] = new Player(pData.id, false, pData.username);
});

socket.on('playerLeft', (id) => {
    if (players[id]) {
        scene.remove(players[id].mesh);
        delete players[id];
    }
});

socket.on('playerUpdate', (pData) => {
    if (players[pData.id]) {
        players[pData.id].mesh.position.lerp(pData.position, 0.3); // Lerp for smooth movement
        players[pData.id].mesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(pData.rotation.x, pData.rotation.y, pData.rotation.z)), 0.3);
    }
});

socket.on('broadcastMessage', (message) => {
    globalMessageDiv.textContent = message;
    globalMessageDiv.classList.add('show');
    
    // Hide the message after 5 seconds
    setTimeout(() => {
        globalMessageDiv.classList.remove('show');
    }, 5000);
});


// --- UI Event Listeners ---
playButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        authUI.style.display = 'none';
        socket.emit('login', username);
        initGame();
        setupControls();
    } else {
        alert('Please enter a username!');
    }
});

insertCodeBtn.addEventListener('click', () => {
    const code = prompt("Enter Admin Code:");
    if (code === "Schdfm5083") { // Your secret code
        alert("Admin mode activated for this session.");
        adminBar.classList.remove('hidden');
    } else if (code) {
        alert("Wrong code. Access denied.");
    }
});

adminSendBtn.addEventListener('click', () => {
    const message = adminInput.value.trim();
    if (message) {
        socket.emit('adminBroadcast', message);
        adminInput.value = '';
    }
});
adminInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminSendBtn.click();
});

