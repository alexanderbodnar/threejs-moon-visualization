import * as THREE from 'three';
import * as dat from 'dat.gui';

class GUI {
    constructor(scene, camera, cameraController, lunarModule, moon, sun, earth, light, spaceship) {
        this.scene              = scene;
        this.camera             = camera;
        this.cameraController   = cameraController;
        this.lunarModule        = lunarModule;
        this.moon               = moon;
        this.sun                = sun;
        this.earth              = earth;
        this.light              = light
        this.gui                = new dat.GUI();
        this.spaceship          = spaceship;

        // Settings window
        this.settings = {
            showAxes: false,
            inOrbitMode: true,
            inLunarMode: false,
            isSpaceshipMode: false,
            moonRotationSpeed:  0.0000,
            sunRotationSpeed:   0.0003,
            earthRotationSpeed: 0.0003,
            ambientLightIntensity: 1,
            zoom: cameraController.distance,
            cameraPosition: this.getCameraPosition(),
            spaceshipPosition: this.getSpaceshipPosition(),
            lunarPosition: this.getLunarPosition(),
            lunarRotation: this.getLunarRotation(),
            spaceshipSpeed: 0.001,
            rotateSpaceship: true,
            spacehipOrbitLine: false,
            toggleHeadlights: false,
            toggleGUI: () => this.toggleGUI(),
        };

        // Settings for spaceship rotation and rotation speed
        this.theta = 0;
        this.phi = Math.PI / 4;
        this.thetaSpeed = 0.02;

        // Initialize GUI elements
        this.initGUI();

        // Initialize dashed line paraneters for the spaceship
        this.linePoints         = [];
        this.maxLinePoints      = 1000;
        this.lineColor          = 0xffffff;
        this.dashSize           = 50;
        this.gapSize            = 20;
        this.lineCurve          = null;

        // Create the material for the Orbit line
        this.lineMaterial = new THREE.LineDashedMaterial({
            color:      this.lineColor,
            dashSize:   this.dashSize,
            gapSize:    this.gapSize
        });

        // Create an empty geometry for the tracer line
        this.lineGeometry   = new THREE.BufferGeometry();
        this.tracerLine     = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.tracerLine);

    }

    initGUI() {

        // Axes display
        this.axesHelper = new THREE.AxesHelper(3000);
        this.scene.add(this.axesHelper);
        this.axesHelper.visible = this.settings.showAxes;
        this.gui.add(this.settings, 'showAxes').name('Show Axes').onChange((value) => {
            this.axesHelper.visible = value;
        });

        // Toggles between the camera modes
        this.gui.add(this.settings, 'inOrbitMode').name('Orbit Mode').onChange((value) => {
            if (value) this.setActiveCameraMode('inOrbitMode');
        });

        this.gui.add(this.settings, 'inLunarMode').name('Lunar Mode').onChange((value) => {
            if (value) this.setActiveCameraMode('inLunarMode');
        });

        this.gui.add(this.settings, 'isSpaceshipMode').name('Spaceship Mode').onChange((value) => {
            if (value) this.setActiveCameraMode('isSpaceshipMode');
        });

        // Rotation speed control
        this.gui.add(this.settings, 'moonRotationSpeed', 0, 0.001, 0.00001).name('Moon Rotation Speed');
        this.gui.add(this.settings, 'sunRotationSpeed', 0, 0.001, 0.00001).name('Sun Rotation Speed');
        this.gui.add(this.settings, 'earthRotationSpeed', 0, 0.001, 0.00001).name('Earth Rotation Speed');

        // Ambient light intensity control
        this.gui.add(this.settings, 'ambientLightIntensity', 0, 2, 0.1).name('Light Intensity')
            .onChange((value) => {
                this.light.intensity = value;
            });

        // Zoom control
        this.gui.add(this.settings, 'zoom', this.cameraController.minDistance, this.cameraController.maxDistance, 10)
            .name('Zoom')
            .onChange((value) => {
                this.cameraController.distance = value;
            });
        
        // Spaceship speed dynamic changer slider
        this.gui.add(this.settings, 'spaceshipSpeed', 0, 0.005, 0.001).name('Spaceship speed')
        .onChange((value) => {
            this.spaceshipSpeed = value;
        })

        // Setting for the spaceship rotation around it's own axis
        this.gui.add(this.settings, 'rotateSpaceship').name('Rotate Spaceship').onChange((value) => {
            this.rotateSpaceship = value;
        });

        // Setting for the spaceship orbit line around the moon (removes the line fromm the scene if disabled)
        this.gui.add(this.settings, 'spacehipOrbitLine').name('Spaceship Orbit').onChange((value) => {
            this.spacehipOrbitLine = value;
            if (!value) {
                this.scene.remove(this.tracerLine);
                this.tracerLine.geometry.dispose();
                this.tracerLine.material.dispose();
                this.linePoints = [];
                this.lineCurve = null;
            }
            else
                this.scene.add(this.tracerLine)
        });
        
        // Camera & Lunar Module position display
        this.gui.add(this.settings, 'cameraPosition').name('Camera Position').listen();
        this.gui.add(this.settings, 'spaceshipPosition').name('Spaceship Position').listen();
        this.gui.add(this.settings, 'lunarPosition').name('Lunar Position').listen();
        this.gui.add(this.settings, 'lunarRotation').name('Lunar Rotation').listen();

        // Toggle the headlights on the lunar module
        this.gui.add(this.settings, 'toggleHeadlights').name('Toggle Lunar Headlights').onChange((value) => {
            this.toggleHeadlights = value;
            this.lunarModule.toggleHeadlights();
        });
        
        // Toggle the GUI
        this.toggleGUI();
    }

    addTracerPoint (position) {

        this.linePoints.push(position.clone());

        // Keep the linePoints array within the maximum limit
        if (this.linePoints.length > this.maxLinePoints   ) {
            this.linePoints.shift(); // Remove the oldest point
        }

        // Ensure we have at least two points to create a curve
        if (this.linePoints.length < 2) {
            return false;
        }

        // Recreate the curve using the updated points & generate curve points and update the geometry
        this.lineCurve    = new THREE.CatmullRomCurve3(this.linePoints, false);
        const curvePoints = this.lineCurve.getPoints(this.linePoints.length);
        this.lineGeometry.setFromPoints(curvePoints);
    }

    // Update the orbit line
    updateOrbitLine (spacecraftPosition) {
        var need_update = this.addTracerPoint(spacecraftPosition);
        if (need_update) {
            this.lineGeometry.attributes.position.needsUpdate = true;
            this.tracerLine.computeLineDistances();
        }
    }

    // ---------------------------- GETTERS FOR THE POSITIONS ----------------------------
    getCameraPosition() {
        const pos = this.cameraController.cameraPosition;
        return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
    }
    getSpaceshipPosition() {
        const pos = this.spaceship.position;
        return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
    }
    getLunarPosition() {
        const pos = this.lunarModule.lunarPosition;
        return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
    }
    getLunarRotation() {
        const rot = this.lunarModule.lunarRotation;
        return `X: ${rot.x.toFixed(1)}, Y: ${rot.y.toFixed(1)}, Z: ${rot.z.toFixed(1)}`;
    }
    // ---------------------------- GETTERS FOR THE POSITIONS ----------------------------

    // This will toggle the GUI on the screen
    toggleGUI() {
        if (this.gui.domElement.style.display === 'none') {
            this.gui.show();
        } else {
            this.gui.hide();
        }
    }

    // Update function that is called in the Main.js update function
    update() {
        // Updates the spaceship position
        this.spaceship.position.x = 2200 * Math.sin(this.phi) * Math.cos(this.theta);
        this.spaceship.position.y = 2200 * Math.cos(this.phi);
        this.spaceship.position.z = 2200 * Math.sin(this.phi) * Math.sin(this.theta);

        // Update the spaceship orbit line if enabled
        if (this.spacehipOrbitLine) {
            this.updateOrbitLine(this.spaceship.position);
        }

        // Updates the spaceship rotation around itself if enabled
        if (this.settings.rotateSpaceship) {
            this.spaceship.rotation.x += 0.004;
        }

        // Updates the angle around axis X
        this.phi += this.settings.spaceshipSpeed;

        // If spaceship comes back to start point (top of the moon) it will update rotation around axis Z
        // and set angle phi to start position (means it is at the top of the moon)
        if (this.phi >= 6.28) {
            this.phi = 0;
            this.theta += this.thetaSpeed;
        }

        // If spaceship will go around the whole axis Z it will reset angle to 0 to restart this rotation
        if (this.theta >= 6.28) this.theta = 0;


        // Updates the moon & sun & earth rotation based on GUI rotation speed
        this.moon.rotation.y    += this.settings.moonRotationSpeed;
        this.sun.rotation.y     -= this.settings.sunRotationSpeed;
        this.earth.rotation.y   += this.settings.earthRotationSpeed;

        // Get the newest xyz positions
        this.settings.cameraPosition    = this.getCameraPosition();
        this.settings.lunarPosition     = this.getLunarPosition();
        this.settings.lunarRotation     = this.getLunarRotation();
        this.settings.spaceshipPosition = this.getSpaceshipPosition();
    }

    setActiveCameraMode(activeMode) {
        // Set the active mode to true, and all others to false
        this.settings.inOrbitMode       = activeMode === 'inOrbitMode';
        this.settings.inLunarMode       = activeMode === 'inLunarMode';
        this.settings.isSpaceshipMode   = activeMode === 'isSpaceshipMode';
    
        // Update the camera controller and other components based on the active mode
        this.cameraController.toggleOrbitMode(this.settings.inOrbitMode);
        this.cameraController.toggleLunarMode(this.settings.inLunarMode);
        this.cameraController.toggleSpaceshipMode(this.settings.isSpaceshipMode);

        if (this.lunarModule.inLunarMode) {
            this.lunarModule.exitLunarMode();
        }
        
        this.gui.updateDisplay();
    }
}

export default GUI;
