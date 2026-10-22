// WIZARD CHESS 3D - Main Application File
// This file initializes the game and ties all modules together

// ============================================
// GLOBAL STATE AND CONFIGURATION
// ============================================

const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    FREE_CAMERA: 'free_camera',
    GAME_OVER: 'game_over'
};

const CameraMode = {
    ROYAL: 'royal',
    TACTICAL: 'tactical',
    TOP_DOWN: 'topdown'
};

const GameMode = {
    AI: 'ai',
    LOCAL: 'local',
    FREE_CAMERA: 'free_camera'
};

const Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

const Quality = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

const CONFIG = {
    BOARD_SIZE: 8,
    SQUARE_SIZE: 1.0,
    PIECE_HEIGHT: 0.8,
    ANIMATION_DURATION: 300,
    AI_THINK_TIME: 1000,
    DEFAULT_CAMERA: CameraMode.ROYAL,
    DEFAULT_DIFFICULTY: Difficulty.MEDIUM,
    DEFAULT_QUALITY: Quality.MEDIUM
};

// Global state
let gameState = GameState.LOADING;
let gameMode = GameMode.AI;
let currentDifficulty = CONFIG.DEFAULT_DIFFICULTY;
let currentQuality = CONFIG.DEFAULT_QUALITY;
let currentPlayer = 'w';
let selectedSquare = null;
let legalMoves = [];
let isAnimating = false;
let cameraMode = CONFIG.DEFAULT_CAMERA;
let cameraPresets = {};
let chess = null;
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let boardGroup = null;
let piecesGroup = null;
let environmentGroup = null;
let pieceMeshes = {};
let squareMeshes = {};
let moveHistory = [];
let capturedPieces = { w: [], b: [] };
let pendingPromotion = null;
let aiThinking = false;
let soundEnabled = true;
let musicEnabled = true;
let audioContext = null;

// ============================================
// INITIALIZATION
// ============================================

function init() {
    console.log('Initializing WIZARD CHESS 3D...');
    
    // Load settings first
    loadSettings();
    
    // Initialize Three.js components
    initScene();
    initCamera();
    initRenderer();
    initControls();
    initLighting();
    
    // Create game world
    createEnvironment();
    createChessBoard();
    createChessPieces();
    
    // Initialize chess logic
    initChess();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start loading animation
    startLoading();
    
    // Start animation loop
    animate();
}

// ============================================
// THREE.JS SETUP
// ============================================

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
}

function initCamera() {
    const container = document.getElementById('container');
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(8, 6, 8);
    camera.lookAt(4, 0, 4);
    setupCameraPresets();
    applyCameraPreset(cameraMode);
}

function setupCameraPresets() {
    cameraPresets = {
        [CameraMode.ROYAL]: { position: new THREE.Vector3(8, 3, 8), target: new THREE.Vector3(4, 0, 4), name: 'ROYAL VIEW' },
        [CameraMode.TACTICAL]: { position: new THREE.Vector3(8, 12, 8), target: new THREE.Vector3(4, 0, 4), name: 'TACTICAL VIEW' },
        [CameraMode.TOP_DOWN]: { position: new THREE.Vector3(4, 20, 4), target: new THREE.Vector3(4, 0, 4), name: 'TOP-DOWN VIEW' }
    };
}

function initRenderer() {
    const container = document.getElementById('container');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize);
}

function initControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minPolarAngle = Math.PI / 6;
    controls.enabled = false;
}

function initLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);
    
    // Warm firelight (left)
    const fireLight1 = new THREE.PointLight(0xff8844, 1.0);
    fireLight1.position.set(0, 2, 0);
    fireLight1.castShadow = false;
    fireLight1.distance = 15;
    fireLight1.decay = 2;
    scene.add(fireLight1);
    
    // Warm firelight (right)
    const fireLight2 = new THREE.PointLight(0xff8844, 1.0);
    fireLight2.position.set(8, 2, 8);
    fireLight2.castShadow = false;
    fireLight2.distance = 15;
    fireLight2.decay = 2;
    scene.add(fireLight2);
    
    // Cool fill light
    const fillLight = new THREE.HemisphereLight(0x4488ff, 0x444488, 0.3);
    fillLight.position.set(0, 10, 0);
    scene.add(fillLight);
}

// ============================================
// ENVIRONMENT CREATION
// ============================================

function createEnvironment() {
    environmentGroup = new THREE.Group();
    scene.add(environmentGroup);
    createCastleWalls();
    createBraziers();
    createDecorations();
}

function createCastleWalls() {
    const wallGeometry = new THREE.BoxGeometry(10, 6, 0.5);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.1 });
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-1, 3, 4);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    environmentGroup.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(9, 3, 4);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    environmentGroup.add(rightWall);
    
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(4, 3, -1);
    backWall.rotation.y = Math.PI / 2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    environmentGroup.add(backWall);
    
    const frontWallGeometry = new THREE.BoxGeometry(10, 3, 0.5);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(4, 1.5, 9);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    environmentGroup.add(frontWall);
    
    createArchedWindows();
}

function createArchedWindows() {
    const archMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.05 });
    const archShape = new THREE.Shape();
    archShape.absarc(0, 0, 1.5, 0, Math.PI, false);
    archShape.lineTo(1.5, -2);
    archShape.lineTo(-1.5, -2);
    archShape.lineTo(-1.5, 0);
    const archGeometry = new THREE.ExtrudeGeometry(archShape, { depth: 0.3, bevelEnabled: false });
    
    for (let i = 0; i < 3; i++) {
        const arch = new THREE.Mesh(archGeometry, archMaterial);
        arch.position.set(-1, 2 + i * 1.5, 4);
        arch.rotation.y = Math.PI / 2;
        arch.castShadow = true;
        environmentGroup.add(arch);
        
        const arch2 = new THREE.Mesh(archGeometry, archMaterial);
        arch2.position.set(9, 2 + i * 1.5, 4);
        arch2.rotation.y = Math.PI / 2;
        arch2.castShadow = true;
        environmentGroup.add(arch2);
    }
}

function createBraziers() {
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 });
    const bowlGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.5, 16);
    const bowlMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.2 });
    const fireGeometry = new THREE.ConeGeometry(0.3, 0.8, 16);
    const fireMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff6600, 
        emissive: 0xff4400, 
        emissiveIntensity: 0.8, 
        roughness: 0.1, 
        metalness: 0.0 
    });
    
    const leftBrazier = new THREE.Group();
    leftBrazier.add(new THREE.Mesh(baseGeometry, baseMaterial));
    const leftBowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    leftBowl.position.y = 0.4;
    leftBrazier.add(leftBowl);
    const leftFire = new THREE.Mesh(fireGeometry, fireMaterial);
    leftFire.position.y = 1.1;
    leftBrazier.add(leftFire);
    leftBrazier.position.set(1, 0, 1);
    environmentGroup.add(leftBrazier);
    
    const rightBrazier = new THREE.Group();
    rightBrazier.add(new THREE.Mesh(baseGeometry, baseMaterial));
    const rightBowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    rightBowl.position.y = 0.4;
    rightBrazier.add(rightBowl);
    const rightFire = new THREE.Mesh(fireGeometry, fireMaterial);
    rightFire.position.y = 1.1;
    rightBrazier.add(rightFire);
    rightBrazier.position.set(7, 0, 7);
    environmentGroup.add(rightBrazier);
    
    animateFires(leftFire, rightFire);
}

function animateFires(leftFire, rightFire) {
    const fires = [leftFire, rightFire];
    setInterval(() => {
        fires.forEach(fire => {
            fire.scale.set(1 + Math.random() * 0.1, 1 + Math.random() * 0.2, 1 + Math.random() * 0.1);
            fire.position.y = 1.1 + Math.random() * 0.1;
            const hue = 0.05 + Math.random() * 0.05;
            const saturation = 0.8 + Math.random() * 0.2;
            const lightness = 0.4 + Math.random() * 0.2;
            fire.material.color.setHSL(hue, saturation, lightness);
            fire.material.emissiveIntensity = 0.6 + Math.random() * 0.4;
        });
    }, 100);
}

function createDecorations() {
    const trimGeometry = new THREE.BoxGeometry(8.5, 0.1, 8.5);
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.set(4, -0.05, 4);
    trim.receiveShadow = true;
    environmentGroup.add(trim);
    
    const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
    const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.1 });
    const pillarPositions = [[0, 1.5, 0], [0, 1.5, 8], [8, 1.5, 0], [8, 1.5, 8]];
    
    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(pos[0], pos[1], pos[2]);
        pillar.castShadow = true;
        environmentGroup.add(pillar);
        
        const capitalGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8);
        const capitalMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });
        const capital = new THREE.Mesh(capitalGeometry, capitalMaterial);
        capital.position.set(pos[0], pos[1] + 1.7, pos[2]);
        capital.castShadow = true;
        environmentGroup.add(capital);
    });
}

// ============================================
// CHESS BOARD CREATION
// ============================================

function createChessBoard() {
    boardGroup = new THREE.Group();
    scene.add(boardGroup);
    
    const squareSize = CONFIG.SQUARE_SIZE;
    const boardSize = CONFIG.BOARD_SIZE * squareSize;
    
    // Board base
    const baseGeometry = new THREE.BoxGeometry(boardSize + 0.2, 0.2, boardSize + 0.2);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(boardSize / 2, -0.1, boardSize / 2);
    base.receiveShadow = true;
    boardGroup.add(base);
    
    // Create squares
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const squareKey = `${String.fromCharCode(97 + col)}${8 - row}`;
            const isBlack = (row + col) % 2 === 1;
            const color = isBlack ? 0x000000 : 0xffffff;
            
            const squareGeometry = new THREE.BoxGeometry(squareSize * 0.98, 0.1, squareSize * 0.98);
            const squareMaterial = new THREE.MeshStandardMaterial({
                color: color,
                roughness: isBlack ? 0.7 : 0.5,
                metalness: isBlack ? 0.05 : 0.02
            });
            
            const square = new THREE.Mesh(squareGeometry, squareMaterial);
            square.position.set(col * squareSize + squareSize / 2, 0.05, row * squareSize + squareSize / 2);
            square.receiveShadow = true;
            square.userData = { key: squareKey, row: 7 - row, col: col, isBlack: isBlack };
            squareMeshes[squareKey] = square;
            boardGroup.add(square);
        }
    }
}

// ============================================
// CHESS PIECES CREATION
// ============================================

function createChessPieces() {
    piecesGroup = new THREE.Group();
    scene.add(piecesGroup);
    createPieceGeometries();
    positionPieces();
}

function createPieceGeometries() {
    const ivoryMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.3, metalness: 0.1 });
    const shadowMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.1 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.8 });
    const bronzeMaterial = new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.3, metalness: 0.6 });
    
    createKingGeometry(ivoryMaterial, shadowMaterial, goldMaterial);
    createQueenGeometry(ivoryMaterial, shadowMaterial, goldMaterial);
    createRookGeometry(ivoryMaterial, shadowMaterial, goldMaterial);
    createBishopGeometry(ivoryMaterial, shadowMaterial, goldMaterial);
    createKnightGeometry(ivoryMaterial, shadowMaterial, bronzeMaterial);
    createPawnGeometry(ivoryMaterial, shadowMaterial, goldMaterial);
}

function createKingGeometry(ivoryMat, shadowMat, goldMat) {
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.6, 16);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.3;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.3;
    const crownGeometry = new THREE.ConeGeometry(0.4, 0.3, 16);
    const crownGold = new THREE.Mesh(crownGeometry, goldMat);
    crownGold.position.y = 0.7;
    crownGold.rotation.y = Math.PI / 4;
    const crownShadow = new THREE.Mesh(crownGeometry, bronzeMaterial);
    crownShadow.position.y = 0.7;
    crownShadow.rotation.y = Math.PI / 4;
    const detailGeometry = new THREE.TorusGeometry(0.2, 0.03, 8, 32);
    const detail1 = new THREE.Mesh(detailGeometry, goldMat);
    detail1.position.y = 0.65;
    detail1.rotation.x = Math.PI / 2;
    const detail2 = new THREE.Mesh(detailGeometry, goldMat);
    detail2.position.y = 0.75;
    detail2.rotation.x = Math.PI / 2;
    const detailShadow1 = new THREE.Mesh(detailGeometry, bronzeMaterial);
    detailShadow1.position.y = 0.65;
    detailShadow1.rotation.x = Math.PI / 2;
    const detailShadow2 = new THREE.Mesh(detailGeometry, bronzeMaterial);
    detailShadow2.position.y = 0.75;
    detailShadow2.rotation.x = Math.PI / 2;
    
    const kingIvory = new THREE.Group();
    kingIvory.add(baseIvory);
    kingIvory.add(bodyIvory);
    kingIvory.add(crownGold);
    kingIvory.add(detail1);
    kingIvory.add(detail2);
    kingIvory.castShadow = true;
    kingIvory.receiveShadow = true;
    
    const kingShadow = new THREE.Group();
    kingShadow.add(baseShadow);
    kingShadow.add(bodyShadow);
    kingShadow.add(crownShadow);
    kingShadow.add(detailShadow1);
    kingShadow.add(detailShadow2);
    kingShadow.castShadow = true;
    kingShadow.receiveShadow = true;
    
    pieceMeshes['K'] = kingIvory;
    pieceMeshes['k'] = kingShadow;
}

function createQueenGeometry(ivoryMat, shadowMat, goldMat) {
    const baseGeometry = new THREE.CylinderGeometry(0.35, 0.4, 0.2, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 16);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.25;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.25;
    const crownGeometry = new THREE.ConeGeometry(0.3, 0.25, 16);
    const crownGold = new THREE.Mesh(crownGeometry, goldMat);
    crownGold.position.y = 0.6;
    crownGold.rotation.y = Math.PI / 4;
    const crownShadow = new THREE.Mesh(crownGeometry, bronzeMaterial);
    crownShadow.position.y = 0.6;
    crownShadow.rotation.y = Math.PI / 4;
    const detailGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 24);
    const detail1 = new THREE.Mesh(detailGeometry, goldMat);
    detail1.position.y = 0.35;
    detail1.rotation.x = Math.PI / 2;
    const detail2 = new THREE.Mesh(detailGeometry, goldMat);
    detail2.position.y = 0.5;
    detail2.rotation.x = Math.PI / 2;
    const detailShadow1 = new THREE.Mesh(detailGeometry, bronzeMaterial);
    detailShadow1.position.y = 0.35;
    detailShadow1.rotation.x = Math.PI / 2;
    const detailShadow2 = new THREE.Mesh(detailGeometry, bronzeMaterial);
    detailShadow2.position.y = 0.5;
    detailShadow2.rotation.x = Math.PI / 2;
    
    const queenIvory = new THREE.Group();
    queenIvory.add(baseIvory);
    queenIvory.add(bodyIvory);
    queenIvory.add(crownGold);
    queenIvory.add(detail1);
    queenIvory.add(detail2);
    queenIvory.castShadow = true;
    queenIvory.receiveShadow = true;
    
    const queenShadow = new THREE.Group();
    queenShadow.add(baseShadow);
    queenShadow.add(bodyShadow);
    queenShadow.add(crownShadow);
    queenShadow.add(detailShadow1);
    queenShadow.add(detailShadow2);
    queenShadow.castShadow = true;
    queenShadow.receiveShadow = true;
    
    pieceMeshes['Q'] = queenIvory;
    pieceMeshes['q'] = queenShadow;
}

function createRookGeometry(ivoryMat, shadowMat, goldMat) {
    const baseGeometry = new THREE.CylinderGeometry(0.35, 0.4, 0.2, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.25;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.25;
    const crenellationGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.35);
    const crenellationIvory = new THREE.Mesh(crenellationGeometry, ivoryMat);
    crenellationIvory.position.y = 0.6;
    const crenellationShadow = new THREE.Mesh(crenellationGeometry, shadowMat);
    crenellationShadow.position.y = 0.6;
    
    for (let i = 0; i < 4; i++) {
        const crenel = new THREE.BoxGeometry(0.08, 0.15, 0.3);
        const crenelIvory = new THREE.Mesh(crenel, ivoryMat);
        crenelIvory.position.set(-0.12 + i * 0.08, 0.7, 0);
        crenelIvory.castShadow = true;
        bodyIvory.add(crenelIvory);
        const crenelShadow = new THREE.Mesh(crenel, shadowMat);
        crenelShadow.position.set(-0.12 + i * 0.08, 0.7, 0);
        crenelShadow.castShadow = true;
        bodyShadow.add(crenelShadow);
    }
    
    const rookIvory = new THREE.Group();
    rookIvory.add(baseIvory);
    rookIvory.add(bodyIvory);
    rookIvory.add(crenellationIvory);
    rookIvory.castShadow = true;
    rookIvory.receiveShadow = true;
    
    const rookShadow = new THREE.Group();
    rookShadow.add(baseShadow);
    rookShadow.add(bodyShadow);
    rookShadow.add(crenellationShadow);
    rookShadow.castShadow = true;
    rookShadow.receiveShadow = true;
    
    pieceMeshes['R'] = rookIvory;
    pieceMeshes['r'] = rookShadow;
}

function createBishopGeometry(ivoryMat, shadowMat, goldMat) {
    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 16);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.2;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.2;
    const mitreGeometry = new THREE.ConeGeometry(0.3, 0.3, 16);
    const mitreIvory = new THREE.Mesh(mitreGeometry, ivoryMat);
    mitreIvory.position.y = 0.5;
    mitreIvory.rotation.y = Math.PI / 4;
    const mitreShadow = new THREE.Mesh(mitreGeometry, shadowMat);
    mitreShadow.position.y = 0.5;
    mitreShadow.rotation.y = Math.PI / 4;
    const crossGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.05);
    const crossGold = new THREE.Mesh(crossGeometry, goldMat);
    crossGold.position.set(0, 0.65, 0);
    const crossShadow = new THREE.Mesh(crossGeometry, bronzeMaterial);
    crossShadow.position.set(0, 0.65, 0);
    
    const bishopIvory = new THREE.Group();
    bishopIvory.add(baseIvory);
    bishopIvory.add(bodyIvory);
    bishopIvory.add(mitreIvory);
    bishopIvory.add(crossGold);
    bishopIvory.castShadow = true;
    bishopIvory.receiveShadow = true;
    
    const bishopShadow = new THREE.Group();
    bishopShadow.add(baseShadow);
    bishopShadow.add(bodyShadow);
    bishopShadow.add(mitreShadow);
    bishopShadow.add(crossShadow);
    bishopShadow.castShadow = true;
    bishopShadow.receiveShadow = true;
    
    pieceMeshes['B'] = bishopIvory;
    pieceMeshes['b'] = bishopShadow;
}

function createKnightGeometry(ivoryMat, shadowMat, bronzeMat) {
    const headGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.3);
    const headIvory = new THREE.Mesh(headGeometry, ivoryMat);
    headIvory.position.y = 0.4;
    const headShadow = new THREE.Mesh(headGeometry, shadowMat);
    headShadow.position.y = 0.4;
    const neckGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8);
    const neckIvory = new THREE.Mesh(neckGeometry, ivoryMat);
    neckIvory.position.y = 0.25;
    neckIvory.rotation.x = 0.3;
    const neckShadow = new THREE.Mesh(neckGeometry, shadowMat);
    neckShadow.position.y = 0.25;
    neckShadow.rotation.x = 0.3;
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.25);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.1;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.1;
    const baseGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const maneGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.05);
    const maneBronze = new THREE.Mesh(maneGeometry, bronzeMat);
    maneBronze.position.set(0, 0.35, 0.15);
    maneBronze.rotation.x = -0.2;
    const maneShadow = new THREE.Mesh(maneGeometry, bronzeMaterial);
    maneShadow.position.set(0, 0.35, 0.15);
    maneShadow.rotation.x = -0.2;
    
    const knightIvory = new THREE.Group();
    knightIvory.add(baseIvory);
    knightIvory.add(bodyIvory);
    knightIvory.add(neckIvory);
    knightIvory.add(headIvory);
    knightIvory.add(maneBronze);
    knightIvory.castShadow = true;
    knightIvory.receiveShadow = true;
    
    const knightShadow = new THREE.Group();
    knightShadow.add(baseShadow);
    knightShadow.add(bodyShadow);
    knightShadow.add(neckShadow);
    knightShadow.add(headShadow);
    knightShadow.add(maneShadow);
    knightShadow.castShadow = true;
    knightShadow.receiveShadow = true;
    
    pieceMeshes['N'] = knightIvory;
    pieceMeshes['n'] = knightShadow;
}

function createPawnGeometry(ivoryMat, shadowMat, goldMat) {
    const baseGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
    const baseIvory = new THREE.Mesh(baseGeometry, ivoryMat);
    const baseShadow = new THREE.Mesh(baseGeometry, shadowMat);
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 16);
    const bodyIvory = new THREE.Mesh(bodyGeometry, ivoryMat);
    bodyIvory.position.y = 0.225;
    const bodyShadow = new THREE.Mesh(bodyGeometry, shadowMat);
    bodyShadow.position.y = 0.225;
    const helmetGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const helmetIvory = new THREE.Mesh(helmetGeometry, ivoryMat);
    helmetIvory.position.y = 0.45;
    const helmetShadow = new THREE.Mesh(helmetGeometry, shadowMat);
    helmetShadow.position.y = 0.45;
    const plumeGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8);
    const plumeGold = new THREE.Mesh(plumeGeometry, goldMat);
    plumeGold.position.y = 0.55;
    const plumeShadow = new THREE.Mesh(plumeGeometry, bronzeMaterial);
    plumeShadow.position.y = 0.55;
    
    const pawnIvory = new THREE.Group();
    pawnIvory.add(baseIvory);
    pawnIvory.add(bodyIvory);
    pawnIvory.add(helmetIvory);
    pawnIvory.add(plumeGold);
    pawnIvory.castShadow = true;
    pawnIvory.receiveShadow = true;
    
    const pawnShadow = new THREE.Group();
    pawnShadow.add(baseShadow);
    pawnShadow.add(bodyShadow);
    pawnShadow.add(helmetShadow);
    pawnShadow.add(plumeShadow);
    pawnShadow.castShadow = true;
    pawnShadow.receiveShadow = true;
    
    pieceMeshes['P'] = pawnIvory;
    pieceMeshes['p'] = pawnShadow;
}

function positionPieces() {
    while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
    }
    
    const startingPosition = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    
    const squareSize = CONFIG.SQUARE_SIZE;
    
    for (let row = 0; row < CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < CONFIG.BOARD_SIZE; col++) {
            const piece = startingPosition[row][col];
            if (piece) {
                const squareKey = `${String.fromCharCode(97 + col)}${8 - row}`;
                const pieceMesh = pieceMeshes[piece].clone();
                pieceMesh.position.set(col * squareSize + squareSize / 2, 0, row * squareSize + squareSize / 2);
                pieceMesh.userData = { piece: piece, square: squareKey, row: row, col: col };
                piecesGroup.add(pieceMesh);
            }
        }
    }
}

// ============================================
// CHESS LOGIC
// ============================================

function initChess() {
    chess = new Chess();
    console.log('Chess.js initialized:', chess.fen());
}

function resetChess() {
    chess.reset();
    moveHistory = [];
    capturedPieces = { w: [], b: [] };
    selectedSquare = null;
    legalMoves = [];
    pendingPromotion = null;
    updateMoveHistory();
    updateCapturedPieces();
    updateTurnIndicator();
    positionPieces();
    clearHighlights();
}

function getSquareFromPosition(x, y) {
    const squareSize = CONFIG.SQUARE_SIZE;
    const col = Math.floor(x / squareSize);
    const row = Math.floor(y / squareSize);
    if (col >= 0 && col < CONFIG.BOARD_SIZE && row >= 0 && row < CONFIG.BOARD_SIZE) {
        return `${String.fromCharCode(97 + col)}${8 - row}`;
    }
    return null;
}

function getSquarePosition(square) {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1]);
    const squareSize = CONFIG.SQUARE_SIZE;
    return { x: col * squareSize + squareSize / 2, y: 0, z: row * squareSize + squareSize / 2 };
}

function getPieceAtSquare(square) {
    return chess.get(square);
}

function getPieceMeshAtSquare(square) {
    for (let i = 0; i < piecesGroup.children.length; i++) {
        const pieceMesh = piecesGroup.children[i];
        if (pieceMesh.userData.square === square) return pieceMesh;
    }
    return null;
}

function selectPiece(square) {
    const piece = chess.get(square);
    if (!piece || piece.color !== currentPlayer) return false;
    clearHighlights();
    selectedSquare = square;
    legalMoves = chess.moves({ square: square, verbose: true });
    highlightPiece(square);
    highlightLegalMoves();
    return true;
}

function highlightPiece(square) {
    const pieceMesh = getPieceMeshAtSquare(square);
    if (pieceMesh) {
        const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(pieceMesh.position);
        glow.position.y = pieceMesh.position.y + 0.1;
        glow.userData = { type: 'selection-glow' };
        piecesGroup.add(glow);
        const originalY = pieceMesh.position.y;
        pieceMesh.position.y = originalY + 0.2;
        pieceMesh.userData.originalY = originalY;
        pieceMesh.userData.isSelected = true;
    }
}

function highlightLegalMoves() {
    legalMoves.forEach(move => {
        const targetSquare = move.to;
        const squareMesh = squareMeshes[targetSquare];
        if (squareMesh) {
            const glowGeometry = new THREE.PlaneGeometry(CONFIG.SQUARE_SIZE * 0.8, CONFIG.SQUARE_SIZE * 0.8);
            const glowMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(squareMesh.position);
            glow.position.y = 0.06;
            glow.rotation.x = Math.PI / 2;
            glow.userData = { type: 'legal-move-glow' };
            boardGroup.add(glow);
            const markerGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.05, 16);
            const markerMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.3
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(squareMesh.position);
            marker.position.y = 0.06;
            marker.userData = { type: 'legal-move-marker' };
            boardGroup.add(marker);
        }
    });
}

function clearHighlights() {
    for (let i = piecesGroup.children.length - 1; i >= 0; i--) {
        const child = piecesGroup.children[i];
        if (child.userData.type === 'selection-glow') piecesGroup.remove(child);
    }
    for (let i = boardGroup.children.length - 1; i >= 0; i--) {
        const child = boardGroup.children[i];
        if (child.userData.type === 'legal-move-glow' || child.userData.type === 'legal-move-marker') {
            boardGroup.remove(child);
        }
    }
    for (let i = 0; i < piecesGroup.children.length; i++) {
        const pieceMesh = piecesGroup.children[i];
        if (pieceMesh.userData.isSelected) {
            pieceMesh.position.y = pieceMesh.userData.originalY || 0;
            pieceMesh.userData.isSelected = false;
        }
    }
    selectedSquare = null;
    legalMoves = [];
}

function movePiece(from, to) {
    if (isAnimating) return;
    const move = chess.move({ from: from, to: to, promotion: 'q' });
    if (!move) return false;
    if (move.flags.indexOf('p') !== -1) {
        pendingPromotion = { from: from, to: to, move: move };
        showPromotionModal(move.color);
        return true;
    }
    executeMove(move);
    return true;
}

function executeMove(move) {
    isAnimating = true;
    const from = move.from;
    const to = move.to;
    const pieceMesh = getPieceMeshAtSquare(from);
    if (!pieceMesh) { isAnimating = false; return; }
    const toPos = getSquarePosition(to);
    const capturedPiece = chess.get(to);
    if (capturedPiece) {
        const capturedMesh = getPieceMeshAtSquare(to);
        if (capturedMesh) animateCapture(capturedMesh);
    }
    animatePieceMovement(pieceMesh, toPos, () => {
        pieceMesh.userData.square = to;
        pieceMesh.position.set(toPos.x, toPos.y, toPos.z);
        updateBoardState(move);
        checkGameStatus();
        switchPlayer();
        if (gameMode === GameMode.AI && currentPlayer === 'b') setTimeout(makeAIMove, 500);
        isAnimating = false;
    });
}

function animatePieceMovement(pieceMesh, targetPos, onComplete) {
    const startPos = pieceMesh.position.clone();
    const startTime = Date.now();
    const duration = CONFIG.ANIMATION_DURATION;
    function updatePosition() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        pieceMesh.position.x = startPos.x + (targetPos.x - startPos.x) * easeOut;
        pieceMesh.position.z = startPos.z + (targetPos.z - startPos.z) * easeOut;
        pieceMesh.position.y = startPos.y + (targetPos.y - startPos.y + 0.3) * easeOut;
        if (progress < 1) requestAnimationFrame(updatePosition);
        else { pieceMesh.position.copy(targetPos); pieceMesh.position.y = targetPos.y; onComplete(); }
    }
    updatePosition();
}

function animateCapture(capturedMesh) {
    const startTime = Date.now();
    const duration = CONFIG.ANIMATION_DURATION;
    const startY = capturedMesh.position.y;
    function updateCapture() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        capturedMesh.position.y = startY + 5 * progress;
        capturedMesh.scale.set(1 - progress, 1 - progress, 1 - progress);
        if (progress < 1) requestAnimationFrame(updateCapture);
        else piecesGroup.remove(capturedMesh);
    }
    updateCapture();
}

function updateBoardState(move) {
    moveHistory.push(move);
    updateMoveHistory();
    if (move.captured) {
        capturedPieces[move.color].push(move.captured);
        updateCapturedPieces();
    }
    saveGameState();
}

function updateMoveHistory() {
    const moveHistoryElement = document.getElementById('move-history');
    let html = '';
    for (let i = 0; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        const colorClass = move.color === 'w' ? 'white' : 'black';
        const moveNumber = Math.floor(i / 2) + 1;
        const movePrefix = i % 2 === 0 ? `${moveNumber}. ` : '';
        html += `<div class="move-entry ${colorClass}">${movePrefix}${move.san}</div>`;
    }
    moveHistoryElement.innerHTML = html;
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
}

function updateCapturedPieces() {
    const capturedElement = document.getElementById('captured-pieces');
    capturedElement.innerHTML = '';
    capturedPieces.b.forEach(piece => {
        const pieceMesh = pieceMeshes[piece.toUpperCase()].clone();
        pieceMesh.scale.set(0.5, 0.5, 0.5);
        pieceMesh.position.x = capturedElement.children.length * 35;
        pieceMesh.userData.type = 'captured-piece';
        capturedElement.appendChild(pieceMesh);
    });
    capturedPieces.w.forEach(piece => {
        const pieceMesh = pieceMeshes[piece.toLowerCase()].clone();
        pieceMesh.scale.set(0.5, 0.5, 0.5);
        pieceMesh.position.x = capturedElement.children.length * 35;
        pieceMesh.userData.type = 'captured-piece';
        capturedElement.appendChild(pieceMesh);
    });
}

function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    const colorClass = currentPlayer === 'w' ? 'white' : 'black';
    const text = currentPlayer === 'w' ? "WHITE'S TURN" : "BLACK'S TURN";
    indicator.className = `turn-indicator ${colorClass}`;
    indicator.textContent = text;
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    updateTurnIndicator();
    clearHighlights();
}

function checkGameStatus() {
    if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'BLACK' : 'WHITE';
        showEndGame(`CHECKMATE! ${winner} WINS!`);
    } else if (chess.isDraw()) {
        showEndGame('DRAW!');
    } else if (chess.isCheck()) {
        highlightKingInCheck();
    }
}

function highlightKingInCheck() {
    const kingSquare = chess.king(currentPlayer);
    const kingMesh = getPieceMeshAtSquare(kingSquare);
    if (kingMesh) {
        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8,
            transparent: true, opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(kingMesh.position);
        glow.position.y = kingMesh.position.y + 0.1;
        glow.userData = { type: 'check-glow' };
        piecesGroup.add(glow);
        setTimeout(() => { piecesGroup.remove(glow); }, 2000);
    }
}

function positionPiecesFromFEN() {
    while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
    }
    const squareSize = CONFIG.SQUARE_SIZE;
    const board = chess.board();
    for (const [square, piece] of Object.entries(board)) {
        if (piece) {
            const col = square.charCodeAt(0) - 97;
            const row = 8 - parseInt(square[1]);
            const pieceChar = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
            const pieceMesh = pieceMeshes[pieceChar].clone();
            pieceMesh.position.set(col * squareSize + squareSize / 2, 0, row * squareSize + squareSize / 2);
            pieceMesh.userData = { piece: pieceChar, square: square, row: row, col: col };
            piecesGroup.add(pieceMesh);
        }
    }
}

// ============================================
// AI OPPONENT
// ============================================

function makeAIMove() {
    if (aiThinking) return;
    aiThinking = true;
    document.getElementById('turn-indicator').textContent = 'AI IS THINKING...';
    setTimeout(() => {
        const moves = chess.moves();
        let move;
        switch (currentDifficulty) {
            case Difficulty.EASY: move = moves[Math.floor(Math.random() * moves.length)]; break;
            case Difficulty.MEDIUM: move = findBestMoveMedium(moves); break;
            case Difficulty.HARD: move = findBestMoveHard(); break;
        }
        if (move) {
            const moveObj = chess.move(move);
            if (moveObj) executeMove(moveObj);
        }
        aiThinking = false;
        updateTurnIndicator();
    }, CONFIG.AI_THINK_TIME);
}

function findBestMoveMedium(moves) {
    let bestMove = moves[0];
    let bestScore = -Infinity;
    moves.forEach(move => {
        const chessCopy = new Chess(chess.fen());
        chessCopy.move(move);
        let score = 0;
        if (chessCopy.isCheck()) score += 50;
        if (move.includes('x')) {
            score += 10;
            if (move.includes('Q')) score += 5;
            if (move.includes('R')) score += 3;
            if (move.includes('B') || move.includes('N')) score += 2;
        }
        if (chessCopy.isCheckmate()) score += 1000;
        score += Math.random() * 5;
        if (score > bestScore) { bestScore = score; bestMove = move; }
    });
    return bestMove;
}

function findBestMoveHard() {
    const depth = 3;
    let bestMove = null;
    let bestValue = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;
    const moves = chess.moves();
    moves.forEach(move => {
        const chessCopy = new Chess(chess.fen());
        chessCopy.move(move);
        const value = minimax(chessCopy, depth - 1, alpha, beta, false);
        if (value > bestValue) { bestValue = value; bestMove = move; }
        if (value > alpha) alpha = value;
    });
    return bestMove || moves[0];
}

function minimax(chess, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || chess.isGameOver()) return evaluatePosition(chess);
    const moves = chess.moves();
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            const chessCopy = new Chess(chess.fen());
            chessCopy.move(moves[i]);
            const eval = minimax(chessCopy, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let i = 0; i < moves.length; i++) {
            const chessCopy = new Chess(chess.fen());
            chessCopy.move(moves[i]);
            const eval = minimax(chessCopy, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluatePosition(chess) {
    let score = 0;
    const pieceValues = { 'p': -1, 'P': 1, 'n': -3, 'N': 3, 'b': -3, 'B': 3, 'r': -5, 'R': 5, 'q': -9, 'Q': 9, 'k': -100, 'K': 100 };
    for (const [square, piece] of Object.entries(chess.board())) {
        if (piece) score += pieceValues[piece.type] || 0;
    }
    const centerSquares = ['d4', 'e4', 'd5', 'e5'];
    centerSquares.forEach(square => {
        const piece = chess.get(square);
        if (piece && piece.color === 'w') score += 0.1;
        else if (piece && piece.color === 'b') score -= 0.1;
    });
    if (chess.isCheck()) score += chess.turn() === 'w' ? -50 : 50;
    if (chess.isCheckmate()) score += chess.turn() === 'w' ? -1000 : 1000;
    return score;
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

function saveSettings() {
    const settings = { difficulty: currentDifficulty, quality: currentQuality, sound: soundEnabled, music: musicEnabled, camera: cameraMode };
    localStorage.setItem('wizardChessSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('wizardChessSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            currentDifficulty = settings.difficulty || CONFIG.DEFAULT_DIFFICULTY;
            currentQuality = settings.quality || CONFIG.DEFAULT_QUALITY;
            soundEnabled = settings.sound !== undefined ? settings.sound : true;
            musicEnabled = settings.music !== undefined ? settings.music : true;
            cameraMode = settings.camera || CONFIG.DEFAULT_CAMERA;
            updateDifficultyUI();
            updateQualityUI();
            updateSoundToggle();
            document.getElementById('music-toggle').classList.toggle('active', musicEnabled);
        } catch (e) { console.error('Failed to load settings:', e); }
    }
}

function saveGameState() {
    if (gameMode === GameMode.FREE_CAMERA) return;
    const gameState = { fen: chess.fen(), mode: gameMode, difficulty: currentDifficulty, player: currentPlayer, moveHistory: moveHistory, capturedPieces: capturedPieces, timestamp: Date.now() };
    localStorage.setItem('wizardChessSave', JSON.stringify(gameState));
    document.getElementById('resume-button').style.display = 'block';
}

function loadGameState() {
    const savedGame = localStorage.getItem('wizardChessSave');
    if (savedGame) {
        try {
            const gameState = JSON.parse(savedGame);
            if (!gameState.fen || !gameState.mode) return false;
            chess.load(gameState.fen);
            gameMode = gameState.mode;
            currentDifficulty = gameState.difficulty || currentDifficulty;
            currentPlayer = gameState.player || 'w';
            moveHistory = gameState.moveHistory || [];
            capturedPieces = gameState.capturedPieces || { w: [], b: [] };
            updateMoveHistory();
            updateCapturedPieces();
            updateTurnIndicator();
            updateDifficultyUI();
            positionPiecesFromFEN();
            return true;
        } catch (e) { console.error('Failed to load game:', e); return false; }
    }
    return false;
}

function clearSave() {
    localStorage.removeItem('wizardChessSave');
    document.getElementById('resume-button').style.display = 'none';
}

// ============================================
// UI FUNCTIONS
// ============================================

function startLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar-fill');
    const loadingPercent = document.getElementById('loading-percent');
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            loadingBar.style.width = '100%';
            loadingPercent.textContent = '100%';
            setTimeout(() => { loadingScreen.classList.add('hidden'); clearInterval(interval); showMenu(); }, 300);
        } else {
            loadingBar.style.width = `${progress}%`;
            loadingPercent.textContent = `${Math.floor(progress)}%`;
        }
    }, 100);
}

function showMenu() {
    gameState = GameState.MENU;
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('game-hud').style.display = 'none';
    controls.enabled = false;
    const savedGame = localStorage.getItem('wizardChessSave');
    if (savedGame) document.getElementById('resume-button').style.display = 'block';
}

function hideMenu() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-hud').style.display = 'block';
}

function startGame(mode) {
    gameMode = mode;
    gameState = GameState.PLAYING;
    resetChess();
    hideMenu();
    controls.enabled = (mode === GameMode.FREE_CAMERA);
    applyCameraPreset(cameraMode);
    if (mode === GameMode.AI && currentPlayer === 'b') setTimeout(makeAIMove, 1000);
    if (mode !== GameMode.FREE_CAMERA) clearSave();
}

function resumeGame() {
    if (loadGameState()) {
        gameState = GameState.PLAYING;
        hideMenu();
        applyCameraPreset(cameraMode);
        if (gameMode === GameMode.AI && currentPlayer === 'b') setTimeout(makeAIMove, 1000);
    } else startGame(GameMode.AI);
}

function showFreeCamera() {
    gameMode = GameMode.FREE_CAMERA;
    gameState = GameState.FREE_CAMERA;
    hideMenu();
    controls.enabled = true;
    applyCameraPreset(cameraMode);
}

function setDifficulty(diff) {
    currentDifficulty = diff;
    updateDifficultyUI();
    saveSettings();
}

function updateDifficultyUI() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === currentDifficulty) btn.classList.add('selected');
    });
}

function setQuality(quality) {
    currentQuality = quality;
    updateQualityUI();
    saveSettings();
    applyQualitySettings();
}

function updateQualityUI() {
    document.querySelectorAll('.quality-btn[data-quality]').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.quality === currentQuality) btn.classList.add('selected');
    });
}

function applyQualitySettings() {
    switch (currentQuality) {
        case Quality.LOW: renderer.shadowMap.enabled = false; renderer.setPixelRatio(1); break;
        case Quality.MEDIUM: renderer.shadowMap.enabled = true; renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); break;
        case Quality.HIGH: renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); break;
    }
}

function showSettings() { document.getElementById('settings-modal').classList.add('active'); }
function closeSettings() { document.getElementById('settings-modal').classList.remove('active'); }
function showTutorial() { document.getElementById('tutorial-modal').classList.add('active'); }
function closeTutorial() { document.getElementById('tutorial-modal').classList.remove('active'); }

function showPromotionModal(color) {
    const modal = document.getElementById('promotion-modal');
    const options = document.getElementById('promotion-options');
    options.innerHTML = '';
    const pieces = ['Q', 'R', 'B', 'N'];
    const pieceNames = ['Queen', 'Rook', 'Bishop', 'Knight'];
    pieces.forEach((piece, index) => {
        const pieceChar = color === 'w' ? piece : piece.toLowerCase();
        const pieceMesh = pieceMeshes[pieceChar].clone();
        pieceMesh.scale.set(0.8, 0.8, 0.8);
        pieceMesh.position.y = -10;
        const button = document.createElement('button');
        button.className = 'promotion-option';
        button.appendChild(pieceMesh);
        button.onclick = () => selectPromotion(piece.toLowerCase());
        const label = document.createElement('div');
        label.textContent = pieceNames[index];
        label.style.marginTop = '0.5rem';
        label.style.color = '#d4af37';
        label.style.fontSize = '0.8rem';
        button.appendChild(label);
        options.appendChild(button);
    });
    modal.classList.add('active');
}

function selectPromotion(piece) {
    if (!pendingPromotion) return;
    const { from, to, move } = pendingPromotion;
    const pawnMesh = getPieceMeshAtSquare(from);
    if (pawnMesh) piecesGroup.remove(pawnMesh);
    const promotedPieceChar = move.color === 'w' ? piece.toUpperCase() : piece;
    const promotedMesh = pieceMeshes[promotedPieceChar].clone();
    const toPos = getSquarePosition(to);
    promotedMesh.position.set(toPos.x, toPos.y, toPos.z);
    promotedMesh.userData = { piece: promotedPieceChar, square: to, row: 8 - parseInt(to[1]), col: to.charCodeAt(0) - 97 };
    piecesGroup.add(promotedMesh);
    const fullMove = chess.move({ from: from, to: to, promotion: piece });
    if (fullMove) {
        updateBoardState(fullMove);
        checkGameStatus();
        switchPlayer();
        if (gameMode === GameMode.AI && currentPlayer === 'b') setTimeout(makeAIMove, 1000);
    }
    pendingPromotion = null;
    document.getElementById('promotion-modal').classList.remove('active');
}

function showEndGame(message) {
    gameState = GameState.GAME_OVER;
    const modal = document.getElementById('endgame-modal');
    document.getElementById('endgame-title').textContent = message;
    document.getElementById('endgame-subtitle').textContent = '';
    modal.classList.add('active');
}

function playAgain() { document.getElementById('endgame-modal').classList.remove('active'); startGame(gameMode); }
function reviewBoard() { document.getElementById('endgame-modal').classList.remove('active'); startGame(gameMode); }
function returnToMenu() { document.getElementById('endgame-modal').classList.remove('active'); showMenu(); }

function toggleCamera() {
    const modes = [CameraMode.ROYAL, CameraMode.TACTICAL, CameraMode.TOP_DOWN];
    const currentIndex = modes.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    applyCameraPreset(modes[nextIndex]);
}

function applyCameraPreset(mode) {
    const preset = cameraPresets[mode];
    if (!preset) return;
    camera.position.copy(preset.position);
    camera.lookAt(preset.target);
    document.getElementById('camera-indicator').textContent = preset.name;
    cameraMode = mode;
}

function setDefaultCamera(mode) {
    cameraMode = mode;
    applyCameraPreset(mode);
    document.querySelectorAll('.quality-btn[data-camera]').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.camera === mode) btn.classList.add('selected');
    });
    saveSettings();
}

function toggleSound() { soundEnabled = !soundEnabled; updateSoundToggle(); saveSettings(); }
function toggleSoundSettings() { soundEnabled = !soundEnabled; updateSoundToggle(); saveSettings(); }
function toggleMusicSettings() { musicEnabled = !musicEnabled; document.getElementById('music-toggle').classList.toggle('active', musicEnabled); saveSettings(); }
function updateSoundToggle() { document.getElementById('sound-toggle').classList.toggle('active', soundEnabled); }

function restartGame() {
    showConfirmModal('RESTART GAME', 'Are you sure you want to restart the current game?', () => { resetChess(); clearSave(); });
}

function showConfirmModal(title, text, onYes) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent = text;
    const yesBtn = document.getElementById('confirm-yes');
    yesBtn.onclick = null;
    yesBtn.onclick = () => { onYes(); confirmNo(); };
    modal.classList.add('active');
}

function confirmYes() { const modal = document.getElementById('confirm-modal'); const yesBtn = document.getElementById('confirm-yes'); if (yesBtn.onclick) yesBtn.onclick(); modal.classList.remove('active'); }
function confirmNo() { document.getElementById('confirm-modal').classList.remove('active'); }

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    const container = document.getElementById('container');
    container.addEventListener('click', onContainerClick);
    container.addEventListener('touchstart', onContainerTouchStart, { passive: false });
    container.addEventListener('touchend', onContainerTouchEnd, { passive: false });
    document.addEventListener('keydown', onKeyDown);
    container.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onContainerClick(event) {
    if (gameState !== GameState.PLAYING || gameMode === GameMode.FREE_CAMERA) return;
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const pieceIntersects = checkPieceIntersection(raycaster);
    if (pieceIntersects) { handlePieceSelection(pieceIntersects); return; }
    const squareIntersects = checkSquareIntersection(raycaster);
    if (squareIntersects) handleSquareSelection(squareIntersects);
}

function onContainerTouchStart(event) {
    if (gameState !== GameState.PLAYING || gameMode === GameMode.FREE_CAMERA) return;
    event.preventDefault();
    const touch = event.touches[0];
    const rect = event.target.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const pieceIntersects = checkPieceIntersection(raycaster);
    if (pieceIntersects) handlePieceSelection(pieceIntersects);
    else { const squareIntersects = checkSquareIntersection(raycaster); if (squareIntersects) handleSquareSelection(squareIntersects); }
}

function onContainerTouchEnd(event) { event.preventDefault(); }

function checkPieceIntersection(raycaster) {
    const intersects = raycaster.intersectObjects(piecesGroup.children);
    for (let i = 0; i < intersects.length; i++) {
        const intersect = intersects[i];
        const pieceMesh = intersect.object;
        if (!pieceMesh.userData.piece) continue;
        return pieceMesh;
    }
    return null;
}

function checkSquareIntersection(raycaster) {
    const intersects = raycaster.intersectObjects(boardGroup.children);
    for (let i = 0; i < intersects.length; i++) {
        const intersect = intersects[i];
        const squareMesh = intersect.object;
        if (!squareMesh.userData.key) continue;
        return squareMesh;
    }
    return null;
}

function handlePieceSelection(pieceMesh) {
    const square = pieceMesh.userData.square;
    const piece = chess.get(square);
    if (!piece) return;
    if (piece.color === currentPlayer) { selectPiece(square); playSound('select'); }
}

function handleSquareSelection(squareMesh) {
    const square = squareMesh.userData.key;
    if (selectedSquare && legalMoves.some(move => move.to === square)) {
        if (movePiece(selectedSquare, square)) { playSound('move'); clearHighlights(); }
    } else if (selectedSquare === square) { clearHighlights(); }
    else {
        const piece = chess.get(square);
        if (piece && piece.color === currentPlayer) { selectPiece(square); playSound('select'); }
        else clearHighlights();
    }
}

function onKeyDown(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.active').forEach(modal => { if (modal.id && modal.id.endsWith('-modal')) modal.classList.remove('active'); });
        if (gameState === GameState.PLAYING) showMenu();
    }
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); undoMove(); }
    if (gameState === GameState.PLAYING && gameMode !== GameMode.FREE_CAMERA) { if (event.key === 'c' || event.key === 'C') toggleCamera(); }
}

function onWindowResize() {
    const container = document.getElementById('container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    applyQualitySettings();
}

function animate() {
    requestAnimationFrame(animate);
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
}

function playSound(name) { if (!soundEnabled) return; console.log('Playing sound:', name); }

function undoMove() {
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop();
    chess.undo();
    if (lastMove.captured) {
        const color = lastMove.color;
        const index = capturedPieces[color].indexOf(lastMove.captured);
        if (index !== -1) capturedPieces[color].splice(index, 1);
    }
    positionPiecesFromFEN();
    updateMoveHistory();
    updateCapturedPieces();
    updateTurnIndicator();
    currentPlayer = lastMove.color;
    clearHighlights();
    saveGameState();
}

// ============================================
// START THE GAME
// ============================================

window.onload = init;
if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 1);
