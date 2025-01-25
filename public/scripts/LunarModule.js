import * as THREE from 'three';
import { logMessage } from './Utils.js';

class LunarModule {
  constructor(scene, moon, camera, solarPanelGraphic, moduleBodyGraphic, wheelGraphic) {
    this.scene             = scene;
    this.moon              = moon;
    this.camera            = camera;
    this.solarPanelGraphic = solarPanelGraphic;
    this.moduleBodyGraphic = moduleBodyGraphic;
    this.wheelGraphic      = wheelGraphic;

    // Lunar Module initialization
    const lunarModuleGeometry = new THREE.BoxGeometry(8, 8, 8);
    const lunarModuleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3333ff,
      metalness: 0.5,
      roughness: 0.8,
    });
    this.lunarModule = new THREE.Mesh(lunarModuleGeometry, lunarModuleMaterial);

    // Lunar module group
    this.lunarModuleGroup = new THREE.Group();

    // Lunar module body
    const modulBodyGeometry = new THREE.BoxGeometry(10, 10, 5);
    const modulBodyMaterial = new THREE.MeshStandardMaterial({
      map: this.moduleBodyGraphic,
      metalness: 0.5,
      roughness: 0.8,
    });
    const modulBody = new THREE.Mesh(modulBodyGeometry, modulBodyMaterial);
    modulBody.position.set(0, 0, 0);

    // Lunar module solar panels holder
    const holderGeometry = new THREE.BoxGeometry(0.5, 0.5, 13);
    const holderMaterial = new THREE.MeshStandardMaterial({
      color: 'black',
      metalness: 0.5,
      roughness: 0.8,
    })
    const holder = new THREE.Mesh(holderGeometry, holderMaterial);
    holder.position.set(0, 0, -9);

    // Lunar module solar panel
    const solarPanelGeometry = new THREE.BoxGeometry(15, 10, 1);
    const solarPanelMaterial = new THREE.MeshStandardMaterial({
      map: this.solarPanelGraphic
    });
    this.solarPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
    this.solarPanel.position.set(0, 0, -15.2);

    // Lunar module wheels
    const moduleWheelGeometry = new THREE.SphereGeometry(2, 32, 32);
    const moduleWheelMaterial = new THREE.MeshStandardMaterial({
      map: this.wheelGraphic,
      metalness: 0.5,
      roughness: 0.8,
    })
    this.wheel1 = new THREE.Mesh(moduleWheelGeometry, moduleWheelMaterial);
    this.wheel2 = new THREE.Mesh(moduleWheelGeometry, moduleWheelMaterial);
    this.wheel3 = new THREE.Mesh(moduleWheelGeometry, moduleWheelMaterial);
    this.wheel4 = new THREE.Mesh(moduleWheelGeometry, moduleWheelMaterial);
    this.wheel1.position.set(5, 5, 8);
    this.wheel2.position.set(5, -5, 8);
    this.wheel3.position.set(-5, 5, 8);
    this.wheel4.position.set(-5, -5, 8);

    // Lunar module wheels holder
    const wheelHolderGeometry = new THREE.BoxGeometry(0.5, 0.5, 5);
    const wheelHolderMaterial = new THREE.MeshStandardMaterial({
      color: 'black',
      metalness: 0.5,
      roughness: 0.8,
    })
    const wheelHolder1 = new THREE.Mesh(wheelHolderGeometry, wheelHolderMaterial);
    const wheelHolder2 = new THREE.Mesh(wheelHolderGeometry, wheelHolderMaterial);
    const wheelHolder3 = new THREE.Mesh(wheelHolderGeometry, wheelHolderMaterial);
    const wheelHolder4 = new THREE.Mesh(wheelHolderGeometry, wheelHolderMaterial);
    wheelHolder1.position.set(5, 5, 4);
    wheelHolder2.position.set(5, -5, 4);
    wheelHolder3.position.set(-5, 5, 4);
    wheelHolder4.position.set(-5, -5, 4);

    // Add all lunar module parts to Lunar module group
    this.lunarModuleGroup.add(modulBody);
    this.lunarModuleGroup.add(holder);
    this.lunarModuleGroup.add(this.solarPanel);
    this.lunarModuleGroup.add(this.wheel1);
    this.lunarModuleGroup.add(this.wheel2);
    this.lunarModuleGroup.add(this.wheel3);
    this.lunarModuleGroup.add(this.wheel4);
    this.lunarModuleGroup.add(wheelHolder1);
    this.lunarModuleGroup.add(wheelHolder2);
    this.lunarModuleGroup.add(wheelHolder3);
    this.lunarModuleGroup.add(wheelHolder4);

    // Spotlight creation
    this.spotlight = new THREE.SpotLight(0xffffff, 20000);
    this.spotlight.angle = Math.PI / 8; // Narrow beam
    this.spotlight.penumbra = 0.3;
    this.spotlight.decay = 2;
    this.spotlight.distance = 500; // Max distance

    // Position spotlight slightly in front and above the lunar module
    this.spotlight.position.set(0, 0, 0);
    const spotlightTarget = new THREE.Object3D();
    spotlightTarget.position.set(0, 50, 0); // Pointing forward
    this.lunarModuleGroup.add(spotlightTarget);
    this.spotlight.target = spotlightTarget;
    this.lunarModuleGroup.add(this.spotlight);

    this.lunarModule = this.lunarModuleGroup;

    // Lunar Module Settings
    this.heightAboveSurface = 70;

    // Dynamic variables
    this.phi = Math.PI / 4;
    this.theta = 0;
    this.inLunarMode = false;
  }

  // ----------------------- GETTERS FOR THE GUI ----------------------- //
  get lunarPosition() {
    return {
      x: this.lunarModule.position.x,
      y: this.lunarModule.position.y,
      z: this.lunarModule.position.z,
    };
  }
  get lunarRotation() {
    return {
      x: this.lunarModule.rotation.x,
      y: this.lunarModule.rotation.y,
      z: this.lunarModule.rotation.z,
    };
  }
  // ----------------------- GETTERS FOR THE GUI ----------------------- //

  toggleLunarMode(value) {
    this.inLunarMode = value;
  }

  // Function to place the Lunar Module on the specific clicked moons surface and store the calculated phi & theta values for that location
  placeOnMoon(x, y, z, phi, theta) {
    this.lunarModule.position.set(x + this.heightAboveSurface,y + this.heightAboveSurface, z + this.heightAboveSurface);
    this.phi    = phi;
    this.theta  = theta;
    this.scene.add(this.lunarModule);
  }

  // Update the Lunar Module position angle when the module changes its position
  update() {
    const moonCenter = new THREE.Vector3(0, 0, 0); // (0, 0, 0)
    this.lunarModule.lookAt(moonCenter);

    // Set that solar panel will look at sun
    const sunCenter = new THREE.Vector3(0, 0, -10000);
    this.solarPanel.lookAt(sunCenter);

    this.wheel1.lookAt(sunCenter);
    this.wheel2.lookAt(sunCenter);
    this.wheel3.lookAt(sunCenter);
    this.wheel4.lookAt(sunCenter);
  }

  // EventListener for 'P' key (to switch to lunar mode)
  onKeyDown(event){
    if (event.key.toLowerCase() === 'p') {
      if (this.inLunarMode)
        this.exitLunarMode();
      else
        this.goToLunarMode();
    }

    if (event.key.toLowerCase() === 'f') {
      if (this.inLunarMode)
        this.toggleHeadlights();
    }
  }

  goToLunarMode() {
    if (this.inLunarMode == false) {
      this.inLunarMode = true;
      logMessage("Switched to Lunar Mode");
      this.lunarModule.add(this.camera);
      this.camera.position.set(0, -80, -50);          // TODO Need to find best POV cam position
      this.camera.lookAt(this.lunarModule.position);  // Camera always focused on the module
      this.camera.rotation.x = (Math.PI / 2) - 50;    // First person perspective angle
    }
  }

  exitLunarMode() {
    if (this.inLunarMode) {
      this.inLunarMode = false;
      logMessage("Exited Lunar Mode");
      this.lunarModule.remove(this.camera);
      this.camera.position.set(0, 0, 0);
      this.camera.lookAt(0, 0, 0);
      this.camera.rotation.set(0, 0, 0);
    }
  }

  toggleHeadlights() {
    this.spotlight.visible = !this.spotlight.visible;

    if (this.spotlight.visible)
      logMessage(`Lunar Module: Headlights were switched: ON`);
    else
      logMessage(`Lunar Module: Headlights were switched: OFF`);
  }

  // Handle keyboard input movement for the lunar module
  handleInput(event) {

    // Fixed bug when switched from Lunar Mode to Orbit mode (user could move with the camera WASD)
    if (this.inLunarMode == false) return;

    const key = {
      'w': 1,
      's': 2,
      'a': 3,
      'd': 4,
    };

    if (event.type === 'keydown') {
      if (key[event.key.toLowerCase()] === 2){
        this.lunarModule.position.z = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.sin(this.theta);
        this.lunarModule.position.x = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.cos(this.theta);
        this.lunarModule.position.y = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.cos(this.phi);
        this.phi += 0.01;
        if (this.phi >= 6.28) {
          this.phi = 0;
        }
      }
      if (key[event.key.toLowerCase()] === 1){
        this.lunarModule.position.z = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.sin(this.theta);
        this.lunarModule.position.x = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.cos(this.theta);
        this.lunarModule.position.y = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.cos(this.phi);
        this.phi -= 0.01;
        if (this.phi <= 0) {
          this.phi = 6.28;
        }
      }
      if (key[event.key.toLowerCase()] === 3){
        this.lunarModule.position.z = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.sin(this.theta);
        this.lunarModule.position.x = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.cos(this.theta);
        this.lunarModule.position.y = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.cos(this.phi);
        this.theta += 0.02;
        if (this.theta >= 6.28) {
          this.theta = 0;
        }
      }
      if (key[event.key.toLowerCase()] === 4){
        this.lunarModule.position.z = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.sin(this.theta);
        this.lunarModule.position.x = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.sin(this.phi) * Math.cos(this.theta);
        this.lunarModule.position.y = (this.moon.geometry.parameters.radius + this.heightAboveSurface) * Math.cos(this.phi);
        this.theta -= 0.02;
        if (this.theta <= 0) {
          this.theta = 6.28;
        }
      }
    }
  }
}

export default LunarModule;