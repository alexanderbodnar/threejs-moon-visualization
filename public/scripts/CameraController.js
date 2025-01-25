import * as THREE from 'three';
import { gsap } from 'gsap';
import { logMessage } from './Utils.js';

class CameraController {
    constructor(scene, camera, domElement, moon, spaceship, lunarModule) {

        // Init parameters
        this.scene          = scene
        this.camera         = camera;
        this.domElement     = domElement;
        this.moon           = moon;
        this.spaceship      = spaceship;
        this.lunarModule    = lunarModule;

        // Orbit parameters
        this.distance               = 4000;
        this.minDistance            = 2000;
        this.maxDistance            = 10000;
        this.zoomSpeed              = 300;
        this.isRotating             = false;
        this.previousMousePosition  = { x: 0, y: 0 };

        // Rotation parameters
        this.rotationSpeed  = 0.005;
        this.smoothFactor   = 0.1;
        this.phi            = Math.PI / 2;  // Vertical angle
        this.theta          = 0;            // Horizontal angle

        // Marker parameters
        this.markerDuration = 300;
        this.markerMaxScale = 10;

        // Zoom parameters (when the user clicks on the moons surface)
        this.targetDistance = 300;

        // Raycaster and click parameters
        this.raycaster      = new THREE.Raycaster();
        this.mouse          = new THREE.Vector2();
        this.zoomingToPoint = false;
        this.zoomTarget     = null;

        // Save the initial camera orientation and up vector (fixed bug where the rotation of the moon would change when going back to orbit)
        this.savedPhi       = this.phi;
        this.savedTheta     = this.theta;
        this.savedUpVector  = this.camera.up.clone();

        // Spaceship camera view parameters
        this.spaceshipZoomThirdPerson   = 1000;
        this.spaceshipViewAnglePosition = -500;

        // Camera Modes parameters
        this.inOrbitMode        = true;  // Defaultly this is the default mode
        this.inLunarMode        = false;
        this.inSpaceshipMode    = false;

        // Initialize event listeners
        this.initEventListeners();
    }

    // Getter for the GUI so it could print out the xyz for the camera
    get cameraPosition() {
        return {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
        };
    }

    toggleOrbitMode(value) {
        this.inOrbitMode = value
    }
    toggleSpaceshipMode(value) {
        this.inSpaceshipMode = value;
    }
    toggleLunarMode(value) {
        this.inLunarMode = value;
    }


    // All the event listeners used in the project
    initEventListeners() {
        this.domElement.addEventListener('mousedown', (event)   => this.onMouseDown(event), false);
        this.domElement.addEventListener('mouseup', (event)     => this.onMouseUp(event), false);
        this.domElement.addEventListener('mousemove', (event)   => this.onMouseMove(event), false);
        this.domElement.addEventListener('wheel', (event)       => this.onMouseWheel(event), false);
        this.domElement.addEventListener('click', (event)       => this.onMouseClick(event), false);
        document.addEventListener('keydown', (event)            => this.onKeyDown(event), false);
        this.domElement.addEventListener('mousemove', (event)   => this.onMouseMove(event), false);
    }

    // All the KeyEvents
    onKeyDown(event) {
        // Restore orbit orientation and up vector
        if (event.key.toLowerCase() === 'o') {
            logMessage("Switched to Orbit Mode");
            this.inLunarMode        = false;
            this.inSpaceshipMode    = false;
            this.inOrbitMode        = true;
            this.phi            = this.savedPhi;
            this.theta          = this.savedTheta;
            this.camera.up.copy(this.savedUpVector);
        }

        // Toggle LunarModule state. This checking needs to be done because of the camera usage overlap within this class and the LunarModule.js class
        if (event.key.toLowerCase() === 'p') {
            if (this.inLunarMode) {
                this.inLunarMode        = false;
                this.inSpaceshipMode    = false;
                this.inOrbitMode        = true;
            }
            else {
                this.inLunarMode        = true;
                this.inSpaceshipMode    = false;
                this.inOrbitMode        = false;
            }
        }
    }

    // Handle mouse movements when in Orbit mode and rotating
    onMouseMove(event) {
        if (this.isRotating) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;

            // Adjust angles based on mouse movement
            this.theta  -= deltaX * this.rotationSpeed;
            this.phi    -= deltaY * this.rotationSpeed;

            // Clamp phi to avoid flipping at the poles
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
        }
        // Store the current mouse position for the next frame
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    // Zoom in/out of the moon based on scroll direction
    onMouseWheel(event) {
        const zoomAmount = event.deltaY * this.zoomSpeed * 0.01;
        this.distance = THREE.MathUtils.clamp(
            this.distance + zoomAmount,
            this.minDistance,
            this.maxDistance
        );
    }

    // Rotating around the moon if the scroll wheel is held
    onMouseDown(event) {
        if (event.button === 2) {
            this.isRotating = true;
            this.previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }

    // Remove the rotating when the scroll wheel is unheld
    onMouseUp(event) {
        if (event.button === 2) {
            this.isRotating = false;
        }
    }

    // Mouse click events
    // Moon Surface click       ->  it will moves him to that given point and gives him the Lunar Mode
    // Spaceship Object click   ->  Will set the camera to the spaceship. It gives spaceship POV camera
    onMouseClick(event) {
        if (this.inLunarMode == false && this.inSpaceshipMode == false) {
            // Save the current orientation and up vector
            this.savedPhi = this.phi;
            this.savedTheta = this.theta;
            this.savedUpVector.copy(this.camera.up);

            // Convert mouse position to normalized device coordinates (-1 to +1) for raycasting
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
            // Perform raycasting to detect click on the moon or spaceship
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersectsMoon = this.raycaster.intersectObject(this.moon);
            const intersectsSpaceship = this.raycaster.intersectObject(this.spaceship);
        
            if (intersectsMoon.length > 0) {
                // Get the intersection point
                const intersectionPoint = intersectsMoon[0].point;
                const surfaceNormal = intersectionPoint.clone().sub(this.moon.position).normalize();
        
                // Create a temporary marker at the intersection point
                const markerGeometry = new THREE.SphereGeometry(5, 10, 10);
                const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const marker         = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.copy(intersectionPoint);
                this.scene.add(marker);
        
                // Set up the animation
                gsap.to(marker.scale, {
                    x: this.markerMaxScale,
                    y: this.markerMaxScale,
                    z: this.markerMaxScale,
                    duration: this.markerDuration / 1000,
                    onComplete: () => {
                        // Remove marker after the animation
                        this.scene.remove(marker);
                        marker.geometry.dispose();
                        marker.material.dispose();
        
                        // Set the variables & start zooming after the marker effect ends
                        this.zoomTarget     = intersectionPoint;
                        this.surfaceNormal  = surfaceNormal;
                        this.zoomingToPoint = true;              
                    },
                });
            }
            if (intersectsSpaceship.length > 0) {
                const targetPosition = this.spaceship.position.clone()

                // Move the camera smoothly to the current spaceship position
                gsap.to(this.camera.position, {
                    x: targetPosition.x + (this.spaceship.position.x < 0 ? -this.spaceshipZoomThirdPerson : this.spaceshipZoomThirdPerson),
                    y: targetPosition.y + (this.spaceship.position.y < 0 ? -this.spaceshipZoomThirdPerson : this.spaceshipZoomThirdPerson),
                    z: targetPosition.z,
                    duration: 1.5,
                    onComplete: () => {
                        this.inSpaceshipMode = true;
                        logMessage("Switched to Spaceship view");
                    },
                });
            }
        }
    }
    
    // Full loop system of the camera controls
    update() {
        // If it's not in lunar mode we can enable the Orbit controls
        if (this.inLunarMode == false) {
            this.initialCameraPosition = this.camera.position.clone();

            // Spaceship view mode
            if (this.inSpaceshipMode) {
                this.camera.position.x = this.spaceship.position.x + (this.spaceship.position.x < 0 ? -this.spaceshipZoomThirdPerson : this.spaceshipZoomThirdPerson);
                this.camera.position.y = this.spaceship.position.y + (this.spaceship.position.y < 0 ? -this.spaceshipZoomThirdPerson : this.spaceshipZoomThirdPerson);
                this.camera.position.z = this.spaceship.position.z + (this.spaceship.position.z < 0 ? 0 : -this.spaceshipViewAnglePosition);
                this.camera.lookAt(this.moon.position);
            }

            // Orbit mode
            if (this.inOrbitMode) {
                if (this.lunarModule.inLunarMode)
                    this.lunarModule.exitLunarMode();

                const x = this.moon.position.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
                const y = this.moon.position.y + this.distance * Math.cos(this.phi);
                const z = this.moon.position.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);
        
                // Smoothly update the camera position
                this.camera.position.lerp(new THREE.Vector3(x, y, z), this.smoothFactor);
                this.camera.lookAt(this.moon.position);
                
                // Detect if the user clicked on the moons surface (means that we need to move to first person)
                this.zoomIfClicked.call(this);
            }        
        }
        else{
            this.lunarModule.goToLunarMode();
        }
    }

    // Function to detect if the user clicked on the moons surface and zoom to that point if possible
    zoomIfClicked() {
        if (this.zoomingToPoint && this.zoomTarget) {

            // Calculate the direction towards the zoom target
            var direction = this.zoomTarget.clone().sub(this.camera.position).normalize();
    
            // Check if the camera is still far enough from the zoom target, then zooms in
            if (this.camera.position.distanceTo(this.zoomTarget) > this.targetDistance) {
                this.camera.position.add(direction.multiplyScalar(this.zoomSpeed * 0.05));
                requestAnimationFrame(this.zoomIfClicked.bind(this));
            } else {
                // Stop zooming and switch to Lunar mode once close enough
                this.zoomingToPoint = false;
                this.inLunarMode    = true;

                // Calculate initial phi and theta for Lunar mode
                const relativePosition = this.zoomTarget.clone().sub(this.moon.position);
                const radius    = relativePosition.length();
                const phi       = Math.acos(relativePosition.y / radius);               // Angle from the Y-axis
                const theta     = Math.atan2(relativePosition.z, relativePosition.x);   // Angle in the XZ-plane

                // Place the camera on the clicked position
                this.lunarModule.placeOnMoon(this.zoomTarget.x, this.zoomTarget.y, this.zoomTarget.z, phi, theta);
                logMessage("Switched to Lunar Mode");
            }
        }
    }
}

export default CameraController;