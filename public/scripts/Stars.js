import * as THREE from 'three';

export default class Stars {
    constructor() {
        this.starsCount    = 5000;     // Number of stars
        this.minStarSize   = 0.5;      // Minimum star size
        this.maxStarSize   = 3;        // Maximun star size
        this.minDistance   = 1900000;  // Minimum distance from the Sun
        this.maxDistance   = 2000000;  // Maximum distance for the stars
        this.flashingSpeed = 0.02      // Flashing speed for the stars in the galaxy

        this.starColors = [
            [1.0, 0.9, 0.9], // Warm white
            [1.0, 1.0, 0.8], // Yellow-white
            [0.9, 0.9, 1.0], // Cool white
            [0.8, 0.8, 1.0], // Light blue
            [1.0, 0.7, 0.7], // Reddish
        ];
  
        // Create geometry and material for stars
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.ShaderMaterial({
            uniforms: {
            time: { value: this.time },
            },
            vertexShader: `
            uniform float time;
            attribute float size;
            attribute vec3 starColor; // Star color for each vertex
            varying float vOpacity;
            varying vec3 vColor;
    
            void main() {
                // Add a twinkling effect based on time
                vOpacity = abs(sin(time + position.x * 0.01 + position.y * 0.01));
                
                // Pass the color to the fragment shader
                vColor = starColor;
    
                // Set the star size
                gl_PointSize = size * (1.0 + vOpacity * 0.5); 
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
            `,
            fragmentShader: `
            varying float vOpacity;
            varying vec3 vColor;
    
            void main() {
                // Render the star with its individual color and dynamic opacity
                gl_FragColor = vec4(vColor, vOpacity);
            }
            `,
            transparent: true,
        });
  
        this._generateStars();
        this.points = new THREE.Points(this.geometry, this.material);
    }
  
    _generateStars() {
        const positions = new Float32Array(this.starsCount * 3);
        const sizes = new Float32Array(this.starsCount);
        const colors = new Float32Array(this.starsCount * 3); // RGB for each star
  
        for (let i = 0; i < this.starsCount; i++) {
            const distance = this.minDistance + Math.random() * this.maxDistance;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);

            // Convert spherical coordinates to Cartesian coordinates
            const x = distance * Math.sin(phi) * Math.cos(theta);
            const y = distance * Math.sin(phi) * Math.sin(theta);
            const z = distance * Math.cos(phi);

            positions[i * 3] = x;     // x
            positions[i * 3 + 1] = y; // y
            positions[i * 3 + 2] = z; // z

            // Assign a random size for each star
            sizes[i] = this.minStarSize * (this.minStarSize + Math.random() * this.maxStarSize);

            // Assign a realistic star color
            const starColor = this._getStarLikeColor();
            colors[i * 3]       = starColor[0]; // Red
            colors[i * 3 + 1]   = starColor[1]; // Green
            colors[i * 3 + 2]   = starColor[2]; // Blue
        }
  
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.geometry.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
    }
  
    _getStarLikeColor() {
        // Generate a realistic star color
        const color = this.starColors[Math.floor(Math.random() * this.starColors.length)];
        return color;
    }
  
    addToScene(scene) {
        scene.add(this.points);
    }
  
    animate() {
        this.flashingSpeed += 0.02;
        this.material.uniforms.time.value = this.flashingSpeed;
    }
  }