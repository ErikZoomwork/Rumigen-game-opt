// Screen management
let selectedCharacter = 'emma'; // Default character

// Cache-busting version — increment when deploying new assets
const ASSET_VERSION = Date.now();

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
    const o = (file) => `<object data="${path}/${file}" type="image/svg+xml"></object>`;

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

function showCharacterSelection() {
    showScreen('character-screen');
}

// Wait for all <object> SVG layers of a character to finish loading (4 s timeout fallback)
function waitForCharacterSVGs(characterName) {
    return new Promise((resolve) => {
        const charElement = document.getElementById(`char-${characterName}`);
        if (!charElement) return resolve();

        const objects = Array.from(charElement.querySelectorAll('object'));
        if (objects.length === 0) return resolve();

        let remaining = objects.length;
        let resolved = false;
        const done = () => {
            if (resolved) return;
            if (--remaining <= 0) { resolved = true; clearTimeout(timer); resolve(); }
        };
        // Fallback: never stall the game for more than 4 seconds
        const timer = setTimeout(() => { resolved = true; resolve(); }, 4000);

        objects.forEach(obj => {
            // contentDocument is already set when the object is fully parsed
            if (obj.contentDocument && obj.contentDocument.documentElement) {
                done();
            } else {
                obj.addEventListener('load', done, { once: true });
                obj.addEventListener('error', done, { once: true });
            }
        });
    });
}

// Preload all SVG layers for a single background scene
async function preloadScene(sceneName) {
    if (!sceneName) return;
    ensureQuestionBackground(sceneName);
    ensurePayoffBackground(sceneName);

    const config = BACKGROUND_CONFIG[sceneName];
    if (!config?.layers) return;

    const paths = config.layers
        .map(layer => `${config.path}/${layer.file}`)
        .filter(p => !SVG_PRELOAD_CACHE[p]);

    const BATCH = 8;
    for (let i = 0; i < paths.length; i += BATCH) {
        await Promise.all(
            paths.slice(i, i + BATCH).map(async (p) => {
                try {
                    const res = await fetch(`${p}?v=${ASSET_VERSION}`);
                    if (res.ok) SVG_PRELOAD_CACHE[p] = await res.blob();
                } catch (e) { /* ignore — not critical */ }
            })
        );
    }
}

async function selectCharacter(characterName) {
    const displayName = CHARACTER_NAMES[characterName] || characterName;
    selectedCharacter = characterName;
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
            // Source node doesn't exist yet (initAudio ran before first src was set) — create it now
            voiceSource = audioContext.createMediaElementSource(voiceAudio);
            voiceSource.connect(analyser);
            voiceSource.connect(audioContext.destination);
        }
        // If voiceSource already exists, it automatically tracks the new src — no action needed
    }
    
    console.log('Loaded voice audio:', audioPath);
}

// Function to load new audio into payoffAudio element
function loadPayoffAudio(audioPath) {
    if (currentPayoffPath === audioPath) return; // Already loaded
    
    // Pause current audio
    payoffAudio.pause();
    
    // Disconnect existing source if it exists
    if (payoffSource) {
        try {
            payoffSource.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
        payoffSource = null;
    }
    
    // Update source
    payoffAudio.src = audioPath;
    currentPayoffPath = audioPath;
    
    console.log('Loaded payoff audio:', audioPath);
}

let audioContext = null;
let analyser = null;
let voiceSource = null;
let payoffSource = null;
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    
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

function switchMouth(mouthName) {
    if (currentMouth === mouthName || !mouthLayers) return;
    mouthLayers.forEach(layer => layer.classList.remove('active'));
    const charElement = document.getElementById(`char-${selectedCharacter}`);
    if (!charElement) return;
    const selectedLayer = charElement.querySelector(`[data-mouth="${mouthName}"]`);
    if (selectedLayer) {
        selectedLayer.classList.add('active');
    }
    currentMouth = mouthName;
}

function switchEyes(eyesName) {
    if (currentEyes === eyesName || !eyeLayers) return;
    eyeLayers.forEach(layer => layer.classList.remove('active'));
    const charElement = document.getElementById(`char-${selectedCharacter}`);
    if (!charElement) return;
    const selectedLayer = charElement.querySelector(`[data-eyes="${eyesName}"]`);
    if (selectedLayer) {
        selectedLayer.classList.add('active');
    }
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

function analyzeAudio() {
    if (!analyser) return;
    
    analyser.getByteFrequencyData(dataArray);
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
    
    if (isPlaying) {
        animationFrame = requestAnimationFrame(analyzeAudio);
    }
}

// Audio button
document.getElementById('audioBtn').addEventListener('click', () => {
    if (!isPlaying) {
        if (!audioInitialized) {
            initAudio();
        }
        audioContext.resume().then(() => {
            playVoice();
            musicAudio.play();
            
            isPlaying = true;
            document.getElementById('audioBtn').textContent = '⏸️ Pause';
            switchEyes('normal');
            lastBlinkTime = performance.now();
            analyzeAudio();
        });
    } else {
        pauseVoice();
        musicAudio.pause();
        isPlaying = false;
            const charDisplayName = characterData ? characterData.character.name : 'Story';
            document.getElementById('audioBtn').textContent = `Play ${charDisplayName}'s Story`;
        switchMouth('smile');
        switchEyes('normal');
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    }
});

// Question data loaded from JSON
let characterQuestions = [];
let characterData = null;

// Track current question and score
let currentQuestion = 0;
let totalScore = 0;
let isInIntroModal = false; // Flag to prevent event listener during intro

// ===== DYNAMIC BACKGROUND SYSTEM =====
// Backgrounds are loaded dynamically from SVG/backgrounds/backgrounds.json
let BACKGROUND_CONFIG = {};
let EXPORT_BACKGROUND_MAP = {};
let SVG_PRELOAD_CACHE = {};
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

    // Collect unique SVG paths not yet cached
    const allPaths = [];
    for (const sceneName of scenesToLoad) {
        const config = BACKGROUND_CONFIG[sceneName];
        if (!config?.layers) continue;
        for (const layer of config.layers) {
            const p = `${config.path}/${layer.file}`;
            if (!SVG_PRELOAD_CACHE[p]) allPaths.push(p);
        }
    }

    // Fetch in parallel batches of 8 so we don't overwhelm the browser
    const BATCH = 8;
    for (let i = 0; i < allPaths.length; i += BATCH) {
        await Promise.all(
            allPaths.slice(i, i + BATCH).map(async (svgPath) => {
                try {
                    const res = await fetch(`${svgPath}?v=${ASSET_VERSION}`, { priority: 'low' });
                    if (res.ok) SVG_PRELOAD_CACHE[svgPath] = await res.blob();
                } catch (e) {
                    console.warn(`Failed to preload: ${svgPath}`);
                }
            })
        );
    }

    console.log(`✅ Preloading complete. ${Object.keys(SVG_PRELOAD_CACHE).length} SVGs cached.`);
}

const PARALLAX_CLASSES = [
    'parallax-effect-scroll-left', 'parallax-effect-scroll-right',
    'parallax-effect-zoom-gentle', 'parallax-effect-zoom', 'parallax-effect-static',
    'parallax-effect-mixed', 'parallax-effect-drift'
];

// Load a question background – creates the DOM element lazily on first use
function loadBackground(sceneName, parallaxEffect = 'scroll-left') {
    // Ensure the DOM element exists before trying to activate it
    ensureQuestionBackground(sceneName);
    currentQuestionScene = sceneName; // remember for payoff fallback

    document.querySelectorAll('.question-background').forEach(bg => {
        bg.classList.remove('active', ...PARALLAX_CLASSES);
    });

    const targetBg = document.querySelector(`.question-${sceneName}`);
    if (targetBg) {
        targetBg.classList.add('active', `parallax-effect-${parallaxEffect}`);
    } else {
        console.warn(`Background not found: ${sceneName}`);
        const firstBg = Object.keys(BACKGROUND_CONFIG)[0];
        ensureQuestionBackground(firstBg);
        const fallback = document.querySelector(`.question-${firstBg}`);
        if (fallback) fallback.classList.add('active', `parallax-effect-${parallaxEffect}`);
    }
}

// Load a payoff background – creates the DOM element lazily on first use
function loadPayoffBackground(sceneName, parallaxEffect = 'scroll-left') {
    ensurePayoffBackground(sceneName);

    document.querySelectorAll('.payoff-container').forEach(c => {
        c.classList.remove('active', ...PARALLAX_CLASSES);
    });

    const activePayoff = document.querySelector(`.payoff-${sceneName}`);
    if (activePayoff) {
        activePayoff.classList.add('active', `parallax-effect-${parallaxEffect}`);
    } else {
        console.warn(`Payoff scene not found: ${sceneName}`);
        const firstBg = Object.keys(BACKGROUND_CONFIG)[0];
        ensurePayoffBackground(firstBg);
        const fallback = document.querySelector(`.payoff-${firstBg}`);
        if (fallback) fallback.classList.add('active', `parallax-effect-${parallaxEffect}`);
    }
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
            isPlaying = false;
            switchMouth('smile');
            switchEyes('normal');
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            
            // Load payoff audio for this choice
            const payoffPath = getPayoffAudioPath(selectedCharacter, currentQ.number, option);
            loadPayoffAudio(payoffPath);
            
            // Start payoff audio
            if (!audioInitialized) {
                initAudio();
            }
            
            // Setup payoff audio with lip-sync
            audioContext.resume().then(() => {
                // Create new media element source for payoff only if not exists
                if (!payoffSource) {
                    payoffSource = audioContext.createMediaElementSource(payoffAudio);
                    payoffSource.connect(analyser);
                    payoffSource.connect(audioContext.destination);
                }
                
                payoffAudio.play();
                isPlaying = true;
                lastBlinkTime = performance.now();
                analyzeAudio();
            });
            
            document.querySelector('.questions-panel').classList.add('hidden');
            document.querySelector('.character-display').classList.add('answered');
            document.querySelector('.question-background.active').classList.add('fade-out');
            
            // Switch payoff background based on JSON
            // Default: same scene as the current question background
            let payoffScene = EXPORT_BACKGROUND_MAP[selectedCharacter]?.[currentQ?.number] || currentQuestionScene || Object.keys(BACKGROUND_CONFIG)[0];
            let payoffEffect = 'scroll-left'; // default
            if (currentQ && currentQ.tradeoffs && currentQ.tradeoffs[option]) {
                const tradeoff = currentQ.tradeoffs[option];
                if (typeof tradeoff === 'object') {
                    if (tradeoff.payoffBackground) {
                        payoffScene = tradeoff.payoffBackground;
                    }
                    if (tradeoff.payoffParallaxEffect) {
                        payoffEffect = tradeoff.payoffParallaxEffect;
                    }
                }
            }
            
            // Hide all payoff containers and show the selected one
            document.querySelectorAll('.payoff-container').forEach(container => {
                container.classList.remove('active');
                // Remove all parallax effect classes
                container.classList.remove('parallax-effect-scroll-left', 'parallax-effect-scroll-right',
                                          'parallax-effect-zoom-gentle', 'parallax-effect-static', 'parallax-effect-mixed');
            });
            
            setTimeout(() => {
                const activePayoff = document.querySelector(`.payoff-${payoffScene}`);
                if (activePayoff) {
                    activePayoff.classList.add('active');
                    activePayoff.classList.add(`parallax-effect-${payoffEffect}`);
                } else {
                    console.warn(`Payoff scene not found: ${payoffScene}. Available:`, Object.keys(BACKGROUND_CONFIG));
                    const firstBg = Object.keys(BACKGROUND_CONFIG)[0];
                    const fallback = document.querySelector(`.payoff-${firstBg}`);
                    if (fallback) {
                        fallback.classList.add('active');
                        fallback.classList.add(`parallax-effect-${payoffEffect}`);
                    }
                }
            }, 200);
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
    setTimeout(() => {
        if (!audioInitialized) {
            initAudio();
        }
        audioContext.resume().then(() => {
            playVoice();
            musicAudio.play();
            isPlaying = true;
            lastBlinkTime = performance.now();
            analyzeAudio();
        });
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
    isPlaying = false;
    switchMouth('smile');
    switchEyes('normal');
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    
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
                musicAudio.play();
                isPlaying = true;
                lastBlinkTime = performance.now();
                analyzeAudio();
            });
        }
    }, 500);
}

function closeTradeoff() {
    document.getElementById('nextBtn').click();
}

// Next question button
document.getElementById('nextBtn').addEventListener('click', () => {
    // Prevent listener from firing during intro modal
    if (isInIntroModal) {
        return;
    }
    
    currentQuestion++;
    
    if (currentQuestion < characterQuestions.length) {
        // Stop current audio immediately
        payoffAudio.pause();
        payoffAudio.currentTime = 0;
        isPlaying = false;
        switchMouth('smile');
        switchEyes('normal');
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
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
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        
        // Start playing the new question audio automatically
        if (audioContext) {
            audioContext.resume().then(() => {
                playVoice();
                isPlaying = true;
                lastBlinkTime = performance.now();
                analyzeAudio();
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
    
    // Update previous button state
    updatePrevButtonState();
}

// Function to show final scenario based on score
function showScenario() {
    const charName = characterData ? characterData.character.name : 'Character';
    let scenario;
    let scenarioTitle;
    let scenarioText;
    
    if (totalScore <= 12) {
        scenario = 1;
        scenarioTitle = "The High-Technology Scenario";
        scenarioText = "<p>Let us imagine a future with no technological limits in order to ensure large-scale production of milk and meat at low cost. Animal production is largely automated and highly industrialised, similar to factory systems. Simplicity and uniformity are prioritised.</p><p>This means that animals are treated as objects serving a profitability goal, and they find it difficult to express their natural behaviour. In this system, livestock control is strict, and it is possible to monitor their health and efficiency through statistical measurements.</p><p>Significant financial resources are invested in research, innovation, and the development of new technologies. Funding comes from the European Union and national governments, but also—and above all—from private companies. Competition in the development of new technologies is fierce, and large companies with substantial budgets dominate the market.</p><p>Large-scale farms have a competitive advantage, leading to the disappearance of smaller farms. The European Union has now become the most technologically advanced agricultural region in the world, thanks to these very large farms and their high-tech infrastructure.</p><p>Europe provides a constant and reliable supply of red meat and dairy products to the EU and to international markets. Southern regions are unable to compete with the EU in the production of low-cost meat and become incapable of providing their populations with sustainably and locally produced food.</p><p>In the long term, large companies in other regions of the world will also gain access to new technologies, although not at the same pace as European companies.</p>";
    } else if (totalScore >= 20) {
        scenario = 3;
        scenarioTitle = "The Nature-Based Scenario";
        scenarioText = "<p>In this scenario, EU citizens and policymakers have decided that current methods of animal production are too harmful to the environment and the climate. New European policies have been introduced, requiring farmers, processing industries, and retailers to drastically limit their production, processing, and sale of red meat and dairy products.</p><p>Many cattle farms have closed or converted their animal production to other activities. Some cattle farms have been converted to pig and poultry farming, which emit fewer greenhouse gases and require less agricultural land for feed. Others have been converted to plant-based production, which requires even less land.</p><p>Within the livestock sector, there is little funding or incentive to invest in new cutting-edge technologies, as the economic scale is too small to be profitable. Basic breeding technologies, such as crossbreeding cattle with desired traits, continue to be used.</p><p>The preservation of the natural environment and animal welfare are absolute priorities. Farming systems such as agroforestry, where animals graze in more natural landscapes, become widespread. These systems allow animals to behave more in line with their natural instincts and help address various health and welfare issues.</p><p>Very little European cattle and sheep farming remains. These systems supply high-quality meat at high prices to affluent consumers in niche markets. At the same time, European citizens with low or middle incomes must significantly reduce their meat consumption or seek alternative sources of animal protein.</p><p>Some people have shifted towards more plant-based diets, but not everyone is willing to give up red meat and dairy products and rely on imported products.</p>";
    } else {
        scenario = 2;
        scenarioTitle = "The Precautionary Scenario";
        scenarioText = "<p>In this future scenario, the main objective is to create an efficient and low-risk agricultural production system. Livestock farming focuses on animal welfare, disease resistance, and reducing the environmental and climate impact of animal production.</p><p>At first glance, agriculture and landscapes resemble what we know today. When travelling through the countryside, you would pass farms and fields that look familiar, sometimes with cows and sheep grazing. Animal breeds are adapted to regional climates and geographical conditions.</p><p>Social ties between farmers and other rural communities are strong, and even stronger than they are today. Animals are bred and selected to meet the requirements of the European market, while ensuring high productivity with a limited impact on the environment.</p><p>In line with current trends, the number of farms in Europe will decrease over time, and large farms will be more competitive than small ones. Advanced breeding technologies, such as genome editing and laboratory breeding, are permitted in the EU, but only after thorough assessment and on the condition that they improve animal health or reduce environmental and climate footprints.</p><p>Within the EU, a biobank exists containing samples of eggs and sperm from different breeds, so that older breeds can be restored in case certain characteristics of new breeds are later regretted.</p><p>European livestock farming offers red meat and dairy products across different price and quality ranges to meet consumer demand within the EU. However, the limited use of technology by European farmers represents a competitive disadvantage compared to other regions of the world, which may have more liberal regulations.</p><p>As a result, EU animal production is no longer sufficient to export to countries outside the EU, as is the case today.</p>";
    }
    
    // Hide tradeoff modal and show scenario result
    document.getElementById('tradeoffModal').classList.remove('active');
    document.getElementById('tradeoffTitle').textContent = `${charName}'s Future: ${scenarioTitle}`;
    document.getElementById('tradeoffText').innerHTML = `${scenarioText}`;
    document.getElementById('tradeoffModal').classList.add('active');
    const btn = document.getElementById('nextBtn');
    btn.textContent = 'Play Again';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.onclick = () => location.reload();
}

voiceAudio.addEventListener('ended', () => {
    isPlaying = false;
    switchMouth('smile');
    switchEyes('normal');
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});

payoffAudio.addEventListener('ended', () => {
    isPlaying = false;
    switchMouth('smile');
    switchEyes('normal');
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
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
    
    // Hide game screen and show character selection
    showScreen('character-screen');
    
    // Stop all audio
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
                isPlaying = true;
                lastBlinkTime = performance.now();
                analyzeAudio();
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