import * as THREE from 'three';
import Stats from 'stats.js';

import CameraController from './CameraController.js';
import LunarModule from './LunarModule.js';
import { logMessage } from './Utils.js';
import Stars from './Stars.js';
import GUI from './GUI.js';

// --------------------------------------------- V A R I A B L E S ---------------------------------------------
// Parameters for the camera and scene
const fov         = 75;
const aspect      = window.innerWidth / window.innerHeight;
const nearClip    = 0.1;
const farClip     = 2000000; // This is the max viewport so we can see the realism distance from the moon to sun

// Earth parameters
const earthRadius           = 6378;   // Realistic Earth radius in km
const earthDistanceFromMoon = 25000; // Realistic Earth distance from the moon in km (FOR NOW ITS DOWNSCALED DUE TO FAR DISTANCE FROM EARTH)

// Moon Parameters
const moonRadius  = 1737.4; // Realistic Moon radius in km

// Sun Parameters
const sunRadius   = 500064.64;  // (ALMOST) Realistic Sun radius in km
const sunDistance = 1496689.92; // Realistic distance from the center in km

// Light Parameters
const lightColor = 0xFFFFFF;  // White light
const lightIntensity = 1;     // Full intensity for the sun

// Other Parameters
let isGamePaused = false;
let isGuiEnabled = false;
// -------------------------------------------------------------------------------------------------------------

// Scene, Camera & Renderer setup
const scene     = new THREE.Scene();
const camera    = new THREE.PerspectiveCamera(fov, aspect, nearClip, farClip);
const renderer  = new THREE.WebGLRenderer({antialias: true, alpha: true});

renderer.setClearColor(0x000000);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// High res texture load up
const textureLoader         = new THREE.TextureLoader();
const earthTexture          = textureLoader.load('assets/earth/earth.jpg', ()            => {logMessage("Earth texture has loaded successully");});
const moonTexture           = textureLoader.load('assets/moon/moon.png', ()             => {logMessage("Moon texture has loaded successully");});
const sunTexture            = textureLoader.load('assets/sun/sun.jpg', ()               => {logMessage("Sun texture has loaded successully");});
const normalMoonMap         = textureLoader.load('assets/moon/moon_normals.png', ()     => {logMessage("Normal map has loaded successfully");});
const displacementMoonMap   = textureLoader.load('assets/moon/displacement_map.jpg', () => {logMessage("Displacement map has loaded successfully");});
const solarPanelGraphic     = textureLoader.load('assets/lunarModule/solarPanel.jpg', ()=> {logMessage("Solar Panel graphic has loaded successfully");});
const moduleBodyGraphic     = textureLoader.load('assets/lunarModule/moduleBody.jpg', ()=> {logMessage("ModuleBody has loaded successfully");});
const wheelGraphic          = textureLoader.load('assets/lunarModule/wheel.jpg', ()     => {logMessage("Module wheel has loaded successfully");});

// Lights initialization
const directionalLight  = new THREE.DirectionalLight(lightColor, lightIntensity);
const ambientlight      = new THREE.AmbientLight(lightColor, 0.1);
const darkSideMoonLight = new THREE.DirectionalLight(lightColor, 0.05, 100);

// Stats initialization
const stats = new Stats();
document.body.appendChild(stats.dom);

// Earth geometry, material, mesh initialization
const earthGeometry  = new THREE.SphereGeometry(earthRadius, 32, 32);
const earthMaterial  = new THREE.MeshStandardMaterial({ 
  map: earthTexture,
  metalness: 1, // Moon reflectivity
  emissive: 0x000000,
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);

// Moon geometry, material, mesh initialization
const moonGeometry  = new THREE.SphereGeometry(moonRadius, 512, 512);
const moonMaterial  = new THREE.MeshStandardMaterial({ 
  map: moonTexture,
  normalMap: normalMoonMap,
  metalness: 1, // Moon reflectivity
  emissive: 0x000000,
  displacementMap: displacementMoonMap,
  displacementScale: 80, // Terrain height scaling based on the displacement map
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);

// Sun geometry, material, mesh initialization
const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
const sunMaterial = new THREE.MeshStandardMaterial({ 
  emissive: 0xffd700,
  emissiveMap: sunTexture,
  emissiveIntensity: 1
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);

// Whole spaceship group
const spaceshipGroup = new THREE.Group();

// Central modul of spaceship, material, mesh initialization, position set, adding to spaceship group
const centralModuleGeometry = new THREE.CylinderGeometry(50, 50, 200, 320);
const centralModuleMaterial = new THREE.MeshStandardMaterial({
  color: 0xCCCCCC,
  metalness: 0.7,
  roughness: 0.2,
})
const centralModule = new THREE.Mesh(centralModuleGeometry, centralModuleMaterial);
centralModule.position.set(0, 0, 0);
spaceshipGroup.add(centralModule);

// Solar panels geometry, mesh initialization
const solarPanelGeometry = new THREE.BoxGeometry(150, 5, 100);
const solarPanelMaterial = new THREE.MeshStandardMaterial({
  map: solarPanelGraphic,
});

// Left solar panel initialization, position set
const leftSolarPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
leftSolarPanel.position.set(-120, 0, 0);  // Position to the left of the central module

// Right solar panel initialization, position set
const rightSolarPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
rightSolarPanel.position.set(120, 0, 0);  // Position to the right of the central module

// Add solar panels to the spaceship group
spaceshipGroup.add(leftSolarPanel);
spaceshipGroup.add(rightSolarPanel);

// Docking ports geometry, mesh initialization
const dockingPortGeometry = new THREE.CylinderGeometry(20, 20, 40, 160);
const dockingPortMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaaaaa,
  metalness: 0.6,
  roughness: 0.2 });

// Top docking port initialization, position and rotation set
const topDockingPort = new THREE.Mesh(dockingPortGeometry, dockingPortMaterial);
topDockingPort.rotation.x = Math.PI / 2;  // Rotate to face outward
topDockingPort.position.set(0, 120, 0);  // Position at the top of the central module

// Bottom docking port initialization, position and rotation set
const bottomDockingPort = new THREE.Mesh(dockingPortGeometry, dockingPortMaterial);
bottomDockingPort.rotation.x = Math.PI / 2;
bottomDockingPort.position.set(0, -120, 0);  // Position at the bottom of the central module

// Add docking ports to the spaceship group
spaceshipGroup.add(topDockingPort);
spaceshipGroup.add(bottomDockingPort);

// Initialize the Stars
const stars = new Stars();

// Initialize the Player
const lunarModule = new LunarModule(scene, moon, camera, solarPanelGraphic, moduleBodyGraphic, wheelGraphic);

// --------------------------------- R E N D E R ---------------------------------
// Set position of the sun, moon, light and spaceship
earth.position.set(earthDistanceFromMoon, 0, -30000);
moon.position.set(0, 0, 0);
sun.position.set(0, 0, -sunDistance);
spaceshipGroup.position.set(2200, 0, 0);

directionalLight.position.set(0, 0, -sunDistance);
darkSideMoonLight.position.set(0, 0, 3000);
darkSideMoonLight.target = moon

// Add everything to the scene
scene.add(darkSideMoonLight);
scene.add(directionalLight);
scene.add(ambientlight);

scene.add(earth);
scene.add(moon);
scene.add(sun);

scene.add(spaceshipGroup);

//lunarModule.placeOnMoon();
stars.addToScene(scene);

stats.showPanel(0); // 0 For FPS
// --------------------------------------------------------------------------------

// CameraController and GUI initialization
const cameraController  = new CameraController(scene, camera, renderer.domElement, moon, spaceshipGroup, lunarModule);
const gui               = new GUI(scene, camera, cameraController, lunarModule, moon, sun ,earth, directionalLight, spaceshipGroup);

// --------------------------------- F U N C T I O N S ---------------------------------
// Function to render the scene each time
function render() {
  cameraController.update();
  gui.update();
  renderer.render(scene, camera);
}

// Main function for the whole scene rendering
function animate() {
  if (!isGamePaused) {
    stars.animate();
    lunarModule.update();
    requestAnimationFrame(animate);
    render();
    stats.update();
    if (!isGuiEnabled) {
      gui.toggleGUI();
      isGuiEnabled = true;
    }
  }
  else {
    gui.toggleGUI();
    isGuiEnabled = false;
  }
}

function pauseGame() {
  isGamePaused = true;
  document.getElementById('pause-screen').style.visibility = "visible";
}

function resumeGame() {
  document.getElementById('pause-screen').style.visibility = "hidden";
  isGamePaused = false;
  animate();
}

// Function to handle window resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function for error handling for unhandled exceptions on screen
window.onerror = function(message, source, lineno, colno, error) {
  const errorMessage = `Error: ${message} at ${source}:${lineno}:${colno}`;
  logMessage(errorMessage);
  if (error && error.stack) {
      logMessage(`Stack Trace: ${error.stack}`);
  }
};
// --------------------------------------------------------------------------------------
//animate(); // TODO REMOVE THIS LINE LATER


// ----------------------------------- EVENT LISTENERS -----------------------------------
// Event listener for ESC key
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (isGamePaused)
      resumeGame();
    else
      pauseGame();
  }
});

// Event listener for window resizing
window.addEventListener('resize', onWindowResize, false);

// Main event listener for the Lunar Module mode (for the controlling of the module)
window.addEventListener('keydown', (event) => lunarModule.onKeyDown(event));
window.addEventListener('keydown', (event) => lunarModule.handleInput(event));
window.addEventListener('keyup', (event) => lunarModule.handleInput(event));

// Event listeners for the MENU interactions
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById("menu-screen").style.visibility = "hidden";
  document.getElementById("stars").style.visibility = "hidden";
  animate();
  isGuiEnabled = true;
});

document.getElementById('resume-button').addEventListener('click', () => {
  document.getElementById("pause-screen").style.visibility = "hidden";
  isGamePaused = false;
  animate();
});

document.getElementById('exit-button').addEventListener('click', () => {
  window.close();
});

// Disable right-click
document.addEventListener('contextmenu', function(event) {
  event.preventDefault();
});
// ----------------------------------- EVENT LISTENERS -----------------------------------