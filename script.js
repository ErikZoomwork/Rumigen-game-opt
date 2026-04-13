// Screen management
let selectedCharacter = 'emma'; // Default character

// Character name mapping: key → display name (also used as folder/file prefix)
const CHARACTER_NAMES = {
    emma: 'Emma', luca: 'Luca', clara: 'Clara', ahmed: 'Ahmed', sofia: 'Sofia'
};

// Build and inject character SVG layers lazily (only when the character is first selected)
function ensureCharacterElement(characterName) {
    const id = `char-${characterName}`;
    if (document.getElementById(id)) return; // already created

    const name = CHARACTER_NAMES[characterName] || (characterName.charAt(0).toUpperCase() + characterName.slice(1));
    const path = `SVG/characters/${name}`;
    // Use <img> instead of <object> — renders in the main document context,
    // properly GPU-composited via will-change:opacity, no per-layer browsing context.
    const o = (file) => `<img src="${path}/${file}" alt="" draggable="false">`;

    const div = document.createElement('div');
    div.id = id;
    div.className = 'character-layers';
    div.style.display = 'none';
    div.innerHTML = `
        <div class="layer layer-base">${o(`layer10-${name}-Hoofd.svg`)}</div>
        <div class="layer layer-eyes active" data-eyes="normal">${o(`layer9-${name}-Ogen-Normaal.svg`)}</div>
        <div class="layer layer-eyes" data-eyes="closed">${o(`layer7-${name}-Ogen-Dicht.svg`)}</div>
        <div class="layer layer-eyes" data-eyes="wide">${o(`layer8-${name}-Ogen-Wijd.svg`)}</div>
        <div class="layer layer-mouth" data-mouth="rest">${o(`layer3-${name}-Mond-Neutraal.svg`)}</div>
        <div class="layer layer-mouth" data-mouth="sip">${o(`layer4-${name}-Mond-Sip.svg`)}</div>
        <div class="layer layer-mouth" data-mouth="AI">${o(`layer5-${name}-Mond-BreedOpen.svg`)}</div>
        <div class="layer layer-mouth" data-mouth="E">${o(`layer6-${name}-Mond-SmalOpen.svg`)}</div>
        <div class="layer layer-mouth active" data-mouth="smile">${o(`layer2-${name}-Mond-Lach.svg`)}</div>
        <div class="layer layer-shirt">${o(`layer1-${name}-Shirt.svg`)}</div>
    `;
    document.getElementById('character-display').appendChild(div);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Prevent character selection when swiping on mobile (iOS fires click after touchmove)
let _touchStartX = 0;
let _touchMoved = false;
document.addEventListener('touchstart', (e) => {
    _touchStartX = e.touches[0].clientX;
    _touchMoved = false;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
    if (Math.abs(e.touches[0].clientX - _touchStartX) > 10) {
        _touchMoved = true;
    }
}, { passive: true });

function showCharacterSelection() {
    showScreen('character-screen');
}

// Wait for all <img> SVG layers of a character to finish loading (4 s timeout fallback)
function waitForCharacterSVGs(characterName) {
    return new Promise((resolve) => {
        const charElement = document.getElementById(`char-${characterName}`);
        if (!charElement) return resolve();

        const imgs = Array.from(charElement.querySelectorAll('img'));
        if (imgs.length === 0) return resolve();

        let remaining = imgs.length;
        let resolved = false;
        const done = () => {
            if (resolved) return;
            if (--remaining <= 0) { resolved = true; clearTimeout(timer); resolve(); }
        };
        // Fallback: never stall the game for more than 4 seconds
        const timer = setTimeout(() => { resolved = true; resolve(); }, 4000);

        imgs.forEach(img => {
            if (img.complete && img.naturalWidth > 0) {
                done();
            } else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
            }
        });
    });
}

// Preload all SVG layers for a single background scene
// Creates DOM elements so their <img> tags start loading immediately via browser cache.
// Returns a promise that resolves when all images in the scene are loaded.
function preloadScene(sceneName) {
    if (!sceneName) return Promise.resolve();
    ensureQuestionBackground(sceneName);
    ensurePayoffBackground(sceneName);

    // Wait for all <img> in both question and payoff containers for this scene
    const imgs = [
        ...document.querySelectorAll(`.question-${sceneName} img`),
        ...document.querySelectorAll(`.payoff-${sceneName} img`)
    ];
    if (imgs.length === 0) return Promise.resolve();

    return new Promise(resolve => {
        let remaining = imgs.length;
        const timer = setTimeout(resolve, 6000); // 6s fallback
        const done = () => { if (--remaining <= 0) { clearTimeout(timer); resolve(); } };
        imgs.forEach(img => {
            if (img.complete && img.naturalWidth > 0) { done(); }
            else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
            }
        });
    });
}

async function selectCharacter(characterName) {
    // Ignore taps that were actually swipes (iOS fires click after touchmove on cards)
    if (_touchMoved) return;

    const displayName = CHARACTER_NAMES[characterName] || characterName;
    selectedCharacter = characterName;

    // Initialize AudioContext immediately in the user gesture handler (required for iOS Safari)
    try {
        if (!audioInitialized) {
            initAudio();
        }
        // Resume audio context within user gesture — iOS Safari requires this
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
    } catch (e) {
        console.warn('Audio init failed (will retry later):', e);
    }

    showLoadingOverlay(`Loading ${displayName}...`);

    // Lazily inject character SVG layers if not yet created
    ensureCharacterElement(characterName);

    // Hide all character layers, show selected one
    document.querySelectorAll('.character-layers').forEach(layer => {
        layer.style.display = 'none';
    });
    const charElement = document.getElementById(`char-${characterName}`);
    if (charElement) {
        charElement.style.display = 'block';
        mouthLayers = charElement.querySelectorAll('.layer-mouth');
        eyeLayers = charElement.querySelectorAll('.layer-eyes');
    }

    // Start loading audio + character data immediately
    loadVoiceAudio(getIntroAudioPath(characterName));
    await loadCharacterData(characterName);

    // Wait for the character's SVG layers to be fully rendered
    showLoadingOverlay(`Loading ${displayName}...`);
    await waitForCharacterSVGs(characterName);

    // Preload the intro background scene before revealing the game
    const introSceneName = (characterData?.intro?.background)
        || Object.values(EXPORT_BACKGROUND_MAP[characterName] || {})[0]
        || null;
    if (introSceneName) {
        showLoadingOverlay(`Loading backgrounds...`);
        await preloadScene(introSceneName);
    }

    // Everything is ready — reveal the game
    showScreen('game-screen');
    showCharacterIntro();
    hideLoadingOverlay();

    // Continue preloading remaining scenes in the background
    preloadCharacterBackgrounds(characterName).catch(err =>
        console.warn(`Background preload failed: ${err.message}`)
    );
}

function selectEmma() {
    selectCharacter('emma');
}

function selectLuca() {
    selectCharacter('luca');
}

function selectClara() {
    selectCharacter('clara');
}

function selectAhmed() {
    selectCharacter('ahmed');
}

function selectSofia() {
    selectCharacter('sofia');
}

// Setup scroll arrows for character selection
function setupScrollArrows() {
    const grid = document.getElementById('character-grid');
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');

    if (!grid || !leftArrow || !rightArrow) return;

    leftArrow.addEventListener('click', () => {
        grid.scrollBy({ left: -400, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        grid.scrollBy({ left: 400, behavior: 'smooth' });
    });

    function updateArrows() {
        leftArrow.disabled = grid.scrollLeft <= 0;
        rightArrow.disabled = grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 1;
    }

    grid.addEventListener('scroll', updateArrows);
    updateArrows();
}

// ===== LOADING OVERLAY =====
function showLoadingOverlay(text = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const label = document.getElementById('loading-text');
    if (overlay) overlay.style.display = 'flex';
    if (label) label.textContent = text;
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = ''; }, 420);
    }
}

// Initialize scroll arrows when character screen is shown
document.addEventListener('DOMContentLoaded', async () => {
    setupScrollArrows();
    showLoadingOverlay('Loading game...');
    // Only load the config JSON – NO DOM elements are created here.
    await initializeBackgrounds();
    hideLoadingOverlay();
});

// Audio and Character animation
let mouthLayers = null;
let eyeLayers = null;

// Dynamic audio objects that will be updated based on character and question
let voiceAudio = new Audio();
let payoffAudio = new Audio();
let musicAudio = new Audio();
musicAudio.volume = 0.07;
musicAudio.loop = true;

// Current audio state
let currentVoicePath = '';
let currentPayoffPath = '';

// Function to get voice over path for character intro
function getIntroAudioPath(characterName) {
    const charUpper = characterName.toUpperCase();
    return `assets/audio/voice-overs/${charUpper}/${charUpper}_INTRO.mp3`;
}

// Function to get voice over path for a specific question
function getQuestionAudioPath(characterName, questionNumber, location) {
    const charUpper = characterName.toUpperCase();
    const qNum = String(questionNumber).padStart(2, '0');
    // Clean location name for filename - replace spaces and special chars with underscore
    const locationClean = location.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    return `assets/audio/voice-overs/${charUpper}/${charUpper}_Q${qNum}_${locationClean}.mp3`;
}

// Function to get payoff audio path for a specific answer
function getPayoffAudioPath(characterName, questionNumber, option) {
    const charUpper = characterName.toUpperCase();
    const qNum = String(questionNumber).padStart(2, '0');
    return `assets/audio/voice-overs/${charUpper}/${charUpper}_Q${qNum}_Payoff_${option}.mp3`;
}

// Promise-safe helpers to avoid AbortError when pause() interrupts a pending play()
let _voicePlayPromise = null;

function playVoice() {
    _voicePlayPromise = voiceAudio.play();
    if (_voicePlayPromise) {
        _voicePlayPromise.catch(err => {
            if (err.name !== 'AbortError') console.error('Voice play error:', err);
        });
    }
    return _voicePlayPromise;
}

function pauseVoice() {
    if (_voicePlayPromise) {
        _voicePlayPromise.then(() => voiceAudio.pause()).catch(() => {});
        _voicePlayPromise = null;
    } else {
        voiceAudio.pause();
    }
}

// Function to load new audio into voiceAudio element
function loadVoiceAudio(audioPath) {
    if (currentVoicePath === audioPath) return; // Already loaded

    // Pause current audio (promise-safe)
    pauseVoice();

    // Update source
    console.log('Loading voice audio:', audioPath);
    voiceAudio.src = audioPath;
    currentVoicePath = audioPath;

    // Reconnect to audio context if initialized
    if (audioInitialized) {
        if (!voiceSource) {
            voiceSource = audioContext.createMediaElementSource(voiceAudio);
            voiceSource.connect(analyser);
            voiceSource.connect(audioContext.destination);
        }
    }

    console.log('Loaded voice audio:', audioPath);
}

// Function to load new audio into payoffAudio element
function loadPayoffAudio(audioPath) {
    if (currentPayoffPath === audioPath) return; // Already loaded

    // Pause current audio
    payoffAudio.pause();

    // Update source (don't touch payoffSource — it stays connected)
    payoffAudio.src = audioPath;
    currentPayoffPath = audioPath;

    console.log('Loaded payoff audio:', audioPath);
}

let audioContext = null;
let analyser = null;        // used for voice lip-sync
let payoffAnalyser = null;  // separate analyser for payoff audio — prevents bleed
let voiceSource = null;
let payoffSource = null;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Voice analyser
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;

    // Payoff analyser — identical settings, completely separate graph
    payoffAnalyser = audioContext.createAnalyser();
    payoffAnalyser.fftSize = 512;
    payoffAnalyser.smoothingTimeConstant = 0.3;

    // Only create source if voiceAudio has a src
    if (voiceAudio.src) {
        voiceSource = audioContext.createMediaElementSource(voiceAudio);
        voiceSource.connect(analyser);
        voiceSource.connect(audioContext.destination);
    }

    audioInitialized = true;
}

const bufferLength = 256;
const dataArray = new Uint8Array(bufferLength);

let isPlaying = false;
let animationFrame = null;
let currentMouth = 'smile';
let currentEyes = 'normal';
let lastBlinkTime = 0;
// Guard against multiple concurrent analyzeAudio loops
let _loopId = 0;

function switchMouth(mouthName) {
    if (currentMouth === mouthName || !mouthLayers) return;
    const charElement = document.getElementById(`char-${selectedCharacter}`);
    if (!charElement) return;
    const selectedLayer = charElement.querySelector(`[data-mouth="${mouthName}"]`);
    // Add new active class first to avoid a blank-frame flash
    if (selectedLayer) {
        selectedLayer.classList.add('active');
    }
    mouthLayers.forEach(layer => {
        if (layer !== selectedLayer) layer.classList.remove('active');
    });
    currentMouth = mouthName;
}

function switchEyes(eyesName) {
    if (currentEyes === eyesName || !eyeLayers) return;
    const charElement = document.getElementById(`char-${selectedCharacter}`);
    if (!charElement) return;
    const selectedLayer = charElement.querySelector(`[data-eyes="${eyesName}"]`);
    // Add new active class first to avoid a blank-frame flash
    if (selectedLayer) {
        selectedLayer.classList.add('active');
    }
    eyeLayers.forEach(layer => {
        if (layer !== selectedLayer) layer.classList.remove('active');
    });
    currentEyes = eyesName;
}

function handleBlinking(now) {
    const timeSinceLastBlink = now - lastBlinkTime;
    const nextBlinkTime = 4000 + Math.random() * 4000;
    
    if (timeSinceLastBlink > nextBlinkTime) {
        switchEyes('closed');
        setTimeout(() => {
            if (isPlaying) {
                switchEyes('normal');
            }
        }, 150);
        lastBlinkTime = now;
    }
}

function analyzeAudio(activeAnalyser) {
    if (!activeAnalyser) return;

    // Capture the loop ID at start — if a newer loop is started, this one exits
    const myLoopId = _loopId;

    activeAnalyser.getByteFrequencyData(dataArray);
    const now = performance.now();

    const midFreq = dataArray.slice(10, 40).reduce((a, b) => a + b) / 30;
    const voiceEnergy = midFreq / 255;

    if (voiceEnergy < 0.12) {
        switchMouth('rest');
    } else if (voiceEnergy < 0.28) {
        switchMouth('E');
    } else if (voiceEnergy < 0.50) {
        switchMouth('AI');
    } else {
        switchMouth('AI');
    }

    handleBlinking(now);

    if (isPlaying && myLoopId === _loopId) {
        animationFrame = requestAnimationFrame(() => analyzeAudio(activeAnalyser));
    }
}

// Helper: stop any running lip-sync loop
function stopLipSync() {
    _loopId++; // invalidates any running loop
    isPlaying = false;
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    switchMouth('smile');
    switchEyes('normal');
}

// Helper: start lip-sync loop on the given analyser node
function startLipSync(activeAnalyser) {
    stopLipSync();   // cancel any previous loop first
    isPlaying = true;
    _loopId++;       // new loop generation
    lastBlinkTime = performance.now();
    analyzeAudio(activeAnalyser);
}

// Audio button
document.getElementById('audioBtn').addEventListener('click', () => {
    if (!isPlaying) {
        if (!audioInitialized) {
            initAudio();
        }
        audioContext.resume().then(() => {
            playVoice();
            musicAudio.play().catch(() => {});
            switchEyes('normal');
            startLipSync(analyser);
            document.getElementById('audioBtn').textContent = '⏸️ Pause';
        });
    } else {
        pauseVoice();
        musicAudio.pause();
        stopLipSync();
        const charDisplayName = characterData ? characterData.character.name : 'Story';
        document.getElementById('audioBtn').textContent = `Play ${charDisplayName}'s Story`;
    }
});

// Question data loaded from JSON
let characterQuestions = [];
let characterData = null;

// Track current question and score
let currentQuestion = 0;
let totalScore = 0;

// Scenario paragraph navigation
let scenarioParagraphs = [];
let currentScenarioParagraph = 0;
let isShowingScenario = false;
let isInIntroModal = false; // Flag to prevent event listener during intro

// ===== DYNAMIC BACKGROUND SYSTEM =====
// Backgrounds are loaded dynamically from SVG/backgrounds/backgrounds.json
let BACKGROUND_CONFIG = {};
let EXPORT_BACKGROUND_MAP = {};
let currentQuestionScene = null; // tracks the last loaded question background for payoff fallback

// Function to load backgrounds configuration from JSON
async function loadBackgroundsConfig() {
    try {
        const config = {};
        const response = await fetch('SVG/backgrounds/backgrounds.json');
        if (!response.ok) {
            throw new Error(`Failed to load backgrounds.json: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validate JSON structure
        if (!data.backgrounds || !Array.isArray(data.backgrounds)) {
            throw new Error('Invalid backgrounds.json format: missing "backgrounds" array');
        }

        // Convert JSON format to internal config format
        data.backgrounds.forEach(bg => {
            if (!bg.name || !bg.layers) {
                console.warn('Skipping invalid background entry:', bg);
                return;
            }

            config[bg.name] = {
                path: `SVG/backgrounds/${bg.name}`,
                displayName: bg.displayName || bg.name,
                layers: bg.layers.map(layer => ({
                    layerClass: layer.layerClass,
                    file: `${bg.name}-layer-${String(layer.number).padStart(2, '0')}-${layer.name}.svg`,
                    duplicateSegments: true
                }))
            };
        });

        try {
            const exportsResponse = await fetch('SVG/backgrounds/exports.json');
            if (exportsResponse.ok) {
                const exportsData = await exportsResponse.json();
                if (exportsData.exports && Array.isArray(exportsData.exports)) {
                    exportsData.exports.forEach(entry => {
                        if (!entry.name || !entry.path || !Array.isArray(entry.files)) {
                            console.warn('Skipping invalid export entry:', entry);
                            return;
                        }

                        const layers = entry.files
                            .map(file => {
                                // Support both plain strings and objects { file, enabled }
                                const fileName = typeof file === 'object' ? file.file : file;
                                const enabled = typeof file === 'object' ? file.enabled !== false : true;
                                if (!enabled) return null;
                                const match = fileName.match(/layer_(\d+)/i);
                                const layerNumber = match ? parseInt(match[1], 10) : 1;
                                return {
                                    layerNumber,
                                    file: fileName,
                                    duplicateSegments: true
                                };
                            })
                            .filter(Boolean);

                        // Reverse layer order so lower numbers render behind higher numbers.
                        const maxLayerNumber = Math.max(...layers.map(layer => layer.layerNumber));
                        layers.forEach(layer => {
                            const reversed = maxLayerNumber - layer.layerNumber + 1;
                            layer.layerClass = `layer-${reversed}`;
                            delete layer.layerNumber;
                        });

                        config[entry.name] = {
                            path: entry.path,
                            displayName: entry.displayName || entry.name,
                            layers
                        };

                        if (entry.character && Array.isArray(entry.questions)) {
                            const characterKey = entry.character.toLowerCase();
                            if (!EXPORT_BACKGROUND_MAP[characterKey]) {
                                EXPORT_BACKGROUND_MAP[characterKey] = {};
                            }
                            entry.questions.forEach(questionNumber => {
                                if (questionNumber != null) {
                                    EXPORT_BACKGROUND_MAP[characterKey][questionNumber] = entry.name;
                                }
                            });
                        }
                    });
                }

                console.log('✅ Export backgrounds loaded:', Object.keys(EXPORT_BACKGROUND_MAP));
            } else if (exportsResponse.status !== 404) {
                console.warn(`Failed to load exports.json: ${exportsResponse.status} ${exportsResponse.statusText}`);
            }
        } catch (error) {
            console.warn('⚠️ Export backgrounds not loaded:', error);
        }

        BACKGROUND_CONFIG = config;
        console.log('✅ Backgrounds loaded from JSON:', Object.keys(BACKGROUND_CONFIG));
        return config;
    } catch (error) {
        console.error('❌ Failed to load backgrounds:', error);
        alert('Could not load background configurations. Please check that SVG/backgrounds/backgrounds.json exists and is valid.');
        throw error;
    }
}

// Function to create background DOM structure dynamically
function createBackgroundElement(sceneName, containerType = 'question') {
    const config = BACKGROUND_CONFIG[sceneName];
    if (!config) {
        console.error(`Background config not found for: ${sceneName}`);
        return null;
    }

    // Create main container
    const container = document.createElement('div');
    // For payoff containers, use 'payoff-container payoff-scenename' format
    // For questions, use 'question-background question-scenename' format
    if (containerType === 'payoff-container') {
        container.className = `payoff-container payoff-${sceneName}`;
    } else {
        container.className = `${containerType}-background ${containerType}-${sceneName}`;
    }
    
    // Generate layers
    config.layers.forEach(layerConfig => {
        const layerDiv = document.createElement('div');
        layerDiv.className = `parallax-layer ${layerConfig.layerClass}`;

        const layerMatch = layerConfig.layerClass.match(/layer-(\d+)/);
        if (layerMatch) {
            const layerNumber = parseInt(layerMatch[1], 10);
            const scrollDuration = Math.min(180, 30 + layerNumber * 10);
            const zoomDuration = Math.min(90, 15 + layerNumber * 4);
            layerDiv.style.setProperty('--parallax-duration', `${scrollDuration}s`);
            layerDiv.style.setProperty('--parallax-zoom-duration', `${zoomDuration}s`);
        }
        
        if (layerConfig.duplicateSegments) {
            // Create two segments for seamless scrolling
            for (let i = 0; i < 2; i++) {
                const segment = document.createElement('div');
                segment.className = 'layer-segment';
                const img = document.createElement('img');
                img.src = `${config.path}/${layerConfig.file}`;
                img.alt = '';
                segment.appendChild(img);
                layerDiv.appendChild(segment);
            }
        } else {
            // Single segment
            const img = document.createElement('img');
            img.src = `${config.path}/${layerConfig.file}`;
            img.alt = '';
            layerDiv.appendChild(img);
        }
        
        container.appendChild(layerDiv);
    });
    
    return container;
}

// Track which background DOM elements have already been created
const _createdBgs = new Set();

// Lazily insert a question-background element the first time it is needed
function ensureQuestionBackground(sceneName) {
    const key = `question-${sceneName}`;
    if (_createdBgs.has(key)) return;
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen) return;
    const el = createBackgroundElement(sceneName, 'question');
    if (!el) return;
    // Insert before the first non-background child so it stays behind all UI
    const anchor = gameScreen.querySelector(
        '.intro-container, .left-column-wrapper, .pilot-badge, .character-display, .questions-panel'
    );
    gameScreen.insertBefore(el, anchor || null);
    _createdBgs.add(key);
}

// Lazily insert a payoff-container element the first time it is needed
function ensurePayoffBackground(sceneName) {
    const key = `payoff-${sceneName}`;
    if (_createdBgs.has(key)) return;
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen) return;
    const el = createBackgroundElement(sceneName, 'payoff-container');
    if (!el) return;
    const anchor = gameScreen.querySelector(
        '.intro-container, .left-column-wrapper, .pilot-badge, .character-display, .questions-panel'
    );
    gameScreen.insertBefore(el, anchor || null);
    _createdBgs.add(key);
}

// Load config only – DOM elements are created lazily when first needed
async function initializeBackgrounds() {
    await loadBackgroundsConfig();
    console.log('Background config loaded for', Object.keys(BACKGROUND_CONFIG).length, 'scenes (DOM created on-demand)');
}

// Preload SVGs for a character – parallel batches, creates DOM lazily first
async function preloadCharacterBackgrounds(characterName) {
    const charKey = characterName.toLowerCase();
    const backgroundScenes = EXPORT_BACKGROUND_MAP[charKey];

    if (!backgroundScenes || typeof backgroundScenes !== 'object') {
        console.log(`No export backgrounds found for ${characterName}`);
        return;
    }

    const scenesToLoad = [...new Set(Object.values(backgroundScenes))];
    console.log(`📥 Pre-creating ${scenesToLoad.length} background scenes for ${characterName}...`);

    // Create DOM elements for every scene this character needs (lazy, all at once)
    scenesToLoad.forEach(scene => {
        ensureQuestionBackground(scene);
        ensurePayoffBackground(scene);
    });

    // Also pre-create the three eindscenario backgrounds so they are ready when the game ends
    ['agro', 'hightech', 'modern'].forEach(scene => {
        if (BACKGROUND_CONFIG[scene]) ensurePayoffBackground(scene);
    });

    // DOM creation above triggers <img> loads via browser HTTP cache — no manual fetch needed.
    console.log(`✅ Background DOM ready for ${scenesToLoad.length} scenes.`);
}

const PARALLAX_CLASSES = [
    'parallax-effect-scroll-left', 'parallax-effect-scroll-right',
    'parallax-effect-zoom-gentle', 'parallax-effect-zoom', 'parallax-effect-static',
    'parallax-effect-mixed', 'parallax-effect-drift', 'parallax-effect-pan'
];

// Load a question background – creates the DOM element lazily on first use
function loadBackground(sceneName, parallaxEffect = 'scroll-left') {
    // Ensure the DOM element exists before trying to activate it
    ensureQuestionBackground(sceneName);
    currentQuestionScene = sceneName; // remember for payoff fallback

    const targetBg = document.querySelector(`.question-${sceneName}`);
    const fallbackBg = (() => {
        if (targetBg) return null;
        console.warn(`Background not found: ${sceneName}`);
        const firstBg = Object.keys(BACKGROUND_CONFIG)[0];
        ensureQuestionBackground(firstBg);
        return document.querySelector(`.question-${firstBg}`);
    })();
    const newBg = targetBg || fallbackBg;

    // Add new active BEFORE removing old ones — prevents blank-frame flash
    if (newBg) {
        PARALLAX_CLASSES.forEach(c => newBg.classList.remove(c));
        newBg.classList.add('active', `parallax-effect-${parallaxEffect}`);
    }
    document.querySelectorAll('.question-background').forEach(bg => {
        if (bg !== newBg) bg.classList.remove('active', ...PARALLAX_CLASSES);
    });
}

// Load a payoff background – creates the DOM element lazily on first use
function loadPayoffBackground(sceneName, parallaxEffect = 'scroll-left') {
    ensurePayoffBackground(sceneName);

    const targetPayoff = document.querySelector(`.payoff-${sceneName}`);
    const fallbackPayoff = (() => {
        if (targetPayoff) return null;
        console.warn(`Payoff scene not found: ${sceneName}`);
        const firstBg = Object.keys(BACKGROUND_CONFIG)[0];
        ensurePayoffBackground(firstBg);
        return document.querySelector(`.payoff-${firstBg}`);
    })();
    const newPayoff = targetPayoff || fallbackPayoff;

    // Add new active BEFORE removing old ones — prevents blank-frame flash
    if (newPayoff) {
        PARALLAX_CLASSES.forEach(c => newPayoff.classList.remove(c));
        newPayoff.classList.add('active', `parallax-effect-${parallaxEffect}`);
    }
    document.querySelectorAll('.payoff-container').forEach(c => {
        if (c !== newPayoff) c.classList.remove('active', ...PARALLAX_CLASSES);
    });
}

// Function to load character data from JSON
async function loadCharacterData(characterName) {
    try {
        const response = await fetch(`data/scenarios/${characterName}_scenario.json?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to load ${characterName} data`);
        
        const data = await response.json();
        // Extract the character data (format: {"Emma": {...}})
        const characterKey = Object.keys(data)[0];
        characterData = data[characterKey];
        characterQuestions = characterData.questions;
        
        // Load character-specific music from JSON
        if (characterData.character && characterData.character.music) {
            musicAudio.src = characterData.character.music;
            console.log('Loading music from JSON:', musicAudio.src);
        } else {
            // Fallback to naming convention if not in JSON
            const characterNameCapitalized = characterName.charAt(0).toUpperCase() + characterName.slice(1);
            musicAudio.src = `assets/audio/music/${characterNameCapitalized}_Song.mp3`;
            console.log('Loading music (fallback):', musicAudio.src);
        }
        
        // Reset game state
        currentQuestion = 0;
        totalScore = 0;

        return characterData;
    } catch (error) {
        console.error('Error loading character data:', error);
        alert(`Could not load character data for ${characterName}. Please check the file path.`);
    }
}

// Question interaction
document.querySelectorAll('.option-button').forEach(button => {
    button.addEventListener('click', function() {
        if (this.classList.contains('clickable')) {
            // Immediately lock ALL option buttons to prevent double-clicks / rapid tapping
            document.querySelectorAll('.option-button').forEach(b => b.classList.remove('clickable'));

            const option = this.dataset.option;
            
            // Add score (A=3, B=2, C=1)
            const scoreMap = { 'A': 3, 'B': 2, 'C': 1 };
            totalScore += scoreMap[option];
            
            // Update tradeoff modal content based on choice
            const currentQ = characterQuestions[currentQuestion];
            
            if (currentQ && currentQ.tradeoffs && currentQ.tradeoffs[option]) {
                const tradeoff = currentQ.tradeoffs[option];
                
                // Support both object format {title, text} and string format
                if (typeof tradeoff === 'object' && tradeoff.title && tradeoff.text) {
                    // Object format with custom title
                    document.getElementById('tradeoffTitle').textContent = tradeoff.title;
                    document.getElementById('tradeoffText').textContent = tradeoff.text;
                } else {
                    // String format - generate title from option
                    const charName = characterData ? characterData.character.name : 'Character';
                    const optionTitle = currentQ.options[option].split(':')[0].trim();
                    document.getElementById('tradeoffTitle').textContent = `${charName}'s Choice: ${optionTitle}`;
                    document.getElementById('tradeoffText').textContent = tradeoff;
                }
            }
            
            // Stop active voice-over
            pauseVoice();
            voiceAudio.currentTime = 0;

            // Stop lip-sync animation
            stopLipSync();

            // Load payoff audio for this choice
            const payoffPath = getPayoffAudioPath(selectedCharacter, currentQ.number, option);
            loadPayoffAudio(payoffPath);
            
            // Start payoff audio
            if (!audioInitialized) {
                initAudio();
            }
            
            // Setup payoff audio with lip-sync on its own analyser (no bleed from voice)
            audioContext.resume().then(() => {
                // Create payoff source once (createMediaElementSource can only be called once per element)
                if (!payoffSource) {
                    payoffSource = audioContext.createMediaElementSource(payoffAudio);
                    payoffSource.connect(payoffAnalyser);
                    payoffSource.connect(audioContext.destination);
                }

                // Wait for audio data before playing to avoid silent/partial playback
                const tryPlay = () => {
                    payoffAudio.play().then(() => {
                        startLipSync(payoffAnalyser);
                    }).catch(err => console.warn('Payoff play failed:', err));
                };

                if (payoffAudio.readyState >= 3) {
                    tryPlay();
                } else {
                    payoffAudio.addEventListener('canplaythrough', tryPlay, { once: true });
                }
            });
            
            document.querySelector('.questions-panel').classList.add('hidden');
            document.querySelector('.character-display').classList.add('answered');
            document.querySelector('.question-background.active').classList.add('fade-out');
            
            // Switch payoff background — add new BEFORE removing old (no blank-frame flash)
            let payoffScene = EXPORT_BACKGROUND_MAP[selectedCharacter]?.[currentQ?.number] || currentQuestionScene || Object.keys(BACKGROUND_CONFIG)[0];
            let payoffEffect = 'scroll-left';
            if (currentQ && currentQ.tradeoffs && currentQ.tradeoffs[option]) {
                const tradeoff = currentQ.tradeoffs[option];
                if (typeof tradeoff === 'object') {
                    if (tradeoff.payoffBackground) payoffScene = tradeoff.payoffBackground;
                    if (tradeoff.payoffParallaxEffect) payoffEffect = tradeoff.payoffParallaxEffect;
                }
            }

            ensurePayoffBackground(payoffScene);
            const newPayoff = document.querySelector(`.payoff-${payoffScene}`);
            if (newPayoff) {
                PARALLAX_CLASSES.forEach(c => newPayoff.classList.remove(c));
                newPayoff.classList.add('active', `parallax-effect-${payoffEffect}`);
            }
            // Deactivate all OTHER payoff containers after activating the new one
            document.querySelectorAll('.payoff-container').forEach(container => {
                if (container !== newPayoff) {
                    container.classList.remove('active', ...PARALLAX_CLASSES);
                }
            });
            setTimeout(() => {
                document.getElementById('tradeoffModal').classList.add('active');
                // Show next button after modal appears
                setTimeout(() => {
                    const btn = document.getElementById('nextBtn');
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                }, 1000);
            }, 500);
        }
    });
});

function showCharacterIntro() {
    isInIntroModal = true; // Prevent event listener from firing during intro
    const charName = characterData ? characterData.character.name : 'Character';
    const introData = characterData ? characterData.intro : { text: 'Welcome to the game!', parallaxEffect: 'scroll-left' };
    
    // Support both old string format and new object format
    const introText = typeof introData === 'string' ? introData : introData.text;
    const introBackground = typeof introData === 'object' ? (introData.background || Object.keys(BACKGROUND_CONFIG)[0] || null) : null;
    const introParallax = typeof introData === 'object' ? (introData.parallaxEffect || 'scroll-left') : 'scroll-left';
    
    document.title = `RUMIGEN Game - ${charName}'s Story`;
    document.getElementById('introTitle').textContent = `${charName}'s Story`;
    document.getElementById('introText').textContent = introText;
    
    // Update restart button for intro
    const restartBtn = document.getElementById('nextBtn');
    restartBtn.textContent = 'Start First Question →';
    restartBtn.onclick = closeIntro;
    // Remove inline styles that hide the button
    restartBtn.style.opacity = '';
    restartBtn.style.pointerEvents = '';
    
    // Show intro modal and container with background
    const introModal = document.getElementById('introModal');
    const introContainer = document.getElementById('introContainer');
    introModal.classList.add('active');
    introContainer.classList.add('active');
    
    // Load background scene for the intro based on JSON
    const introBg = createBackgroundElement(introBackground, 'payoff-container');
    if (introBg) {
        introContainer.innerHTML = '';
        introBg.querySelectorAll('.parallax-layer').forEach(layer => {
            introContainer.appendChild(layer);
        });
        // Add parallax effect class
        introContainer.classList.add(`parallax-effect-${introParallax}`);
    }
    
    // Hide questions panel initially
    const questionsPanel = document.querySelector('.questions-panel');
    questionsPanel.classList.remove('show');
    questionsPanel.classList.add('hidden');
    
    // Auto-play intro audio after a short delay
    // AudioContext was already initialized + resumed in selectCharacter() within the user gesture
    setTimeout(() => {
        if (audioContext) {
            audioContext.resume().then(() => {
                playVoice();
                musicAudio.play().catch(() => {});
                startLipSync(analyser);
            });
        }
    }, 500);
}

function closeIntro() {
    isInIntroModal = false; // Allow event listener to fire again
    document.getElementById('introModal').classList.remove('active');
    const introContainer = document.getElementById('introContainer');
    introContainer.classList.remove('active');
    // Remove parallax effect classes
    introContainer.classList.remove('parallax-effect-scroll-left', 'parallax-effect-scroll-right',
                                     'parallax-effect-zoom-gentle', 'parallax-effect-static', 'parallax-effect-mixed');
    
    // Reset restart button text (will be hidden by CSS until payoff)
    const restartBtn = document.getElementById('nextBtn');
    restartBtn.textContent = 'Next Question →';
    restartBtn.onclick = null; // Reset to use the event listener instead
    
    // Stop intro audio
    pauseVoice();
    voiceAudio.currentTime = 0;
    stopLipSync();

    // Load first question now
    loadQuestion(0);
    
    // Now show questions panel
    const questionsPanel = document.querySelector('.questions-panel');
    questionsPanel.classList.remove('hidden');
    
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            questionsPanel.classList.add('show');
        }, 10000); // Show after 10 seconds on mobile
    } else {
        // On desktop, show immediately
        questionsPanel.classList.add('show');
    }
    
    // Auto-start question audio
    setTimeout(() => {
        if (audioContext) {
            audioContext.resume().then(() => {
                playVoice();
                musicAudio.play().catch(() => {});
                startLipSync(analyser);
            });
        }
    }, 500);
}

function closeTradeoff() {
    document.getElementById('nextBtn').click();
}

// Next question button
document.getElementById('nextBtn').addEventListener('click', () => {
    // Prevent listener from firing during intro modal or scenario display
    if (isInIntroModal || isShowingScenario) {
        return;
    }
    
    currentQuestion++;
    
    if (currentQuestion < characterQuestions.length) {
        // Stop current audio immediately
        payoffAudio.pause();
        payoffAudio.currentTime = 0;
        stopLipSync();

        loadQuestion(currentQuestion);
        document.getElementById('tradeoffModal').classList.remove('active');
        // Hide all payoff containers
        document.querySelectorAll('.payoff-container').forEach(container => {
            container.classList.remove('active');
        });
        document.querySelectorAll('.question-background').forEach(bg => bg.classList.remove('fade-out'));
        document.querySelector('.character-display').classList.remove('answered');
        document.querySelector('.questions-panel').classList.remove('hidden');
        const btn = document.getElementById('nextBtn');
        btn.style.transition = 'none';
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        // Restore transition after instant hide so hover/show animations still work
        requestAnimationFrame(() => { btn.style.transition = ''; });
        
        // Start playing the new question audio automatically
        if (audioContext) {
            audioContext.resume().then(() => {
                playVoice();
                startLipSync(analyser);
            });
        }
    } else {
        // All questions answered - show scenario
        showScenario();
    }
});

// Function to load a question into the UI
function loadQuestion(index) {
    const q = characterQuestions[index];
    const charName = characterData ? characterData.character.name : 'Character';
    
    document.getElementById('questionLocation').textContent = `📍 LOCATION: ${q.location}`;
    document.getElementById('questionContext').innerHTML = `<strong>${charName} says:</strong> ${q.context.replace(charName + ' says: ', '')}`;
    document.getElementById('questionText').textContent = q.text;
    
    // Load voice over for this question
    const questionAudioPath = getQuestionAudioPath(selectedCharacter, q.number, q.location);
    loadVoiceAudio(questionAudioPath);
    
    // Load background - prefer export backgrounds if available for this character/question
    const parallaxEffect = q.parallaxEffect || 'scroll-left';  // Default to scroll-left
    const exportScene = EXPORT_BACKGROUND_MAP[selectedCharacter]?.[q.number];
    const backgroundScene = exportScene || q.background;
    if (backgroundScene) {
        loadBackground(backgroundScene, parallaxEffect);
    }
    
    // Split options into title and description
    const splitOption = (text) => {
        const parts = text.split(':');
        if (parts.length >= 2) {
            return {
                title: parts[0].trim(),
                description: parts.slice(1).join(':').trim()
            };
        }
        return { title: '', description: text };
    };
    
    const optA = splitOption(q.options.A);
    const optB = splitOption(q.options.B);
    const optC = splitOption(q.options.C);
    
    document.getElementById('optionA').querySelector('.option-title').textContent = optA.title;
    document.getElementById('optionA').querySelector('.option-description').textContent = optA.description;
    
    document.getElementById('optionB').querySelector('.option-title').textContent = optB.title;
    document.getElementById('optionB').querySelector('.option-description').textContent = optB.description;
    
    document.getElementById('optionC').querySelector('.option-title').textContent = optC.title;
    document.getElementById('optionC').querySelector('.option-description').textContent = optC.description;

    // Re-enable option buttons for the new question
    document.querySelectorAll('.option-button').forEach(b => b.classList.add('clickable'));
    
    // Update previous button state
    updatePrevButtonState();
}

// Function to show final scenario based on score
function showScenario() {
    const charName = characterData ? characterData.character.name : 'Character';
    let scenarioTitle;
    let scenarioBackground;

    if (totalScore <= 12) {
        scenarioTitle = "The High-Technology Scenario";
        scenarioBackground = 'hightech';
        scenarioParagraphs = [
            "Let us imagine a future without technological limits, where milk and meat are produced on a large scale at low cost. Livestock farming is highly automated and industrialised, prioritising simplicity and uniformity. Animals are treated as production units, with little opportunity to express natural behaviour, while their health and efficiency are strictly controlled and monitored.",
            "Heavy investment in innovation—driven largely by private companies—intensifies competition, allowing large corporations to dominate and pushing smaller farms out of the market. This results in a sector dominated by large-scale, high-tech operations, making Europe the most technologically advanced agricultural region.",
            "Europe supplies a constant flow of meat and dairy to global markets, while other regions struggle to compete with low-cost production and become unable to provide sustainable, locally produced food."
        ];
    } else if (totalScore >= 20) {
        scenarioTitle = "The Nature-Based Scenario";
        scenarioBackground = 'agro';
        scenarioParagraphs = [
            "In this future, EU citizens and policymakers conclude that current livestock production is too harmful to the environment and climate. Strict policies drastically reduce the production and sale of red meat and dairy. Many cattle farms close or shift to pig and poultry farming, or to plant-based production, which requires less land.",
            "With the sector shrinking, there is little incentive to invest in advanced technologies, and only basic breeding methods remain in use. Environmental protection and animal welfare become top priorities, leading to more natural systems like agroforestry, where animals can express natural behaviour.",
            "Only a small number of cattle and sheep farms remain, supplying high-quality, expensive products to niche markets. As a result, many Europeans reduce their meat consumption or turn to plant-based alternatives, while some continue to rely on imports."
        ];
    } else {
        scenarioTitle = "The Precautionary Scenario";
        scenarioBackground = 'modern';
        scenarioParagraphs = [
            "In this future scenario, the main goal is to create an efficient, low-risk agricultural system. Livestock farming emphasises animal welfare, disease resistance, and reducing environmental and climate impacts. Farms and landscapes still appear familiar, with regionally adapted breeds and grazing animals, while strong social ties in rural communities persist.",
            "Animals are bred to meet European market demands with high productivity and limited environmental impact. However, the number of farms declines over time, with large farms outcompeting smaller ones. Advanced breeding technologies are allowed only under strict conditions, and a biobank preserves genetic material to restore older breeds if needed.",
            "European livestock farming supplies meat and dairy across price and quality ranges for EU consumers. Yet stricter regulations and more limited use of technology create a competitive disadvantage globally, reducing the EU's ability to export beyond its borders."
        ];
    }

    // Load the matching eindscenario background
    ensurePayoffBackground(scenarioBackground);
    document.querySelectorAll('.payoff-container').forEach(c => {
        c.classList.remove('active', ...PARALLAX_CLASSES);
    });
    setTimeout(() => {
        const bg = document.querySelector(`.payoff-${scenarioBackground}`);
        if (bg) {
            bg.classList.add('active', 'parallax-effect-pan');
        }
    }, 100);

    // Hide the "Next Question" button — no more questions after the final scenario
    const nextQBtn = document.getElementById('nextBtn');
    if (nextQBtn) { nextQBtn.style.opacity = '0'; nextQBtn.style.pointerEvents = 'none'; }

    document.getElementById('tradeoffModal').classList.remove('active');
    document.getElementById('tradeoffTitle').textContent = `${charName}'s Future: ${scenarioTitle}`;
    document.getElementById('tradeoffModal').classList.add('active');

    isShowingScenario = true;
    currentScenarioParagraph = 0;
    showScenarioParagraph();
}

// Advances through scenario paragraphs one at a time
function showScenarioParagraph() {
    const total = scenarioParagraphs.length;
    const index = currentScenarioParagraph;

    const subtitleEl = document.querySelector('#tradeoffModal .tradeoff-choice');
    if (subtitleEl) subtitleEl.textContent = `Part ${index + 1} of ${total}`;

    document.getElementById('tradeoffText').innerHTML = `<p>${scenarioParagraphs[index]}</p>`;

    // Show the scenario nav button row
    const navButtons = document.getElementById('scenarioNavButtons');
    navButtons.style.display = 'flex';

    const nextBtn = document.getElementById('scenarioNextBtn');
    const prevBtn = document.getElementById('scenarioPrevBtn');

    // Previous button: only visible from part 2 onward
    if (index > 0) {
        prevBtn.style.opacity = '1';
        prevBtn.style.pointerEvents = 'auto';
        prevBtn.onclick = () => {
            currentScenarioParagraph--;
            showScenarioParagraph();
        };
    } else {
        prevBtn.style.opacity = '0';
        prevBtn.style.pointerEvents = 'none';
    }

    // Next button: Next → or Play Again on last paragraph
    if (index < total - 1) {
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => {
            currentScenarioParagraph++;
            showScenarioParagraph();
        };
    } else {
        nextBtn.textContent = 'Play Again';
        nextBtn.onclick = () => location.reload();
    }
}

voiceAudio.addEventListener('ended', () => {
    stopLipSync();
});

payoffAudio.addEventListener('ended', () => {
    stopLipSync();
});

switchMouth('smile');
switchEyes('normal');
// Disclaimer Modal Functions
function closedisclaimer() {
    const disclaimerModal = document.getElementById('disclaimer-modal');
    if (disclaimerModal) {
        disclaimerModal.style.display = 'none';
    }
}

// Navigation Functions
function goHome() {
    // Reset game state
    currentQuestion = 0;
    totalScore = 0;
    selectedCharacter = '';
    characterData = null;
    characterQuestions = [];

    // Remove .active from all fixed overlay elements so they stop blocking touch input
    document.querySelectorAll('.payoff-container, .intro-container, .question-background').forEach(el => {
        el.classList.remove('active', 'fade-out');
    });
    document.querySelector('.character-display')?.classList.remove('answered');
    document.querySelector('.questions-panel')?.classList.remove('hidden');

    // Hide game screen and show character selection
    showScreen('character-screen');

    // Stop all audio
    stopLipSync();
    pauseVoice();
    payoffAudio.pause();
    musicAudio.pause();
}

function gotoPreviousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion(currentQuestion);
        
        // Hide tradeoff modal if visible
        document.getElementById('tradeoffModal').classList.remove('active');
        document.querySelectorAll('.payoff-container').forEach(container => {
            container.classList.remove('active');
        });
        document.querySelectorAll('.question-background').forEach(bg => bg.classList.remove('fade-out'));
        document.querySelector('.character-display').classList.remove('answered');
        document.querySelector('.questions-panel').classList.remove('hidden');
        
        // Reset audio
        pauseVoice();
        payoffAudio.pause();
        
        // Play the previous question audio
        if (audioContext) {
            audioContext.resume().then(() => {
                playVoice();
                startLipSync(analyser);
            });
        }
    }
}

// Update previous button state based on current question
function updatePrevButtonState() {
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        if (currentQuestion > 0) {
            prevBtn.disabled = false;
        } else {
            prevBtn.disabled = true;
        }
    }
}

// Show disclaimer when page loads
window.addEventListener('load', () => {
    const disclaimerModal = document.getElementById('disclaimer-modal');
    if (disclaimerModal) {
        disclaimerModal.style.display = 'flex';
    }
});