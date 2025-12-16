/**
 * Circuit Grid Animation
 * - Edge-to-edge signal paths on a precise grid
 * - Constant speed, purple-only, no randomness in motion
 * - Hover interaction: grid nodes expand + whiten near cursor
 */
(function() {
    'use strict';

    const canvas = document.getElementById('circuit-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // Configuration
    const CONFIG = {
        GRID_SIZE: 30,              // Spacing between grid intersections
        SIGNAL_SPEED: 120,          // Pixels per second (constant for all signals)
        SIGNAL_COUNT: 5,            // Number of concurrent signals
        SIGNAL_LENGTH: 120,         // Visual length of signal trail
        TURN_PROBABILITY: 0.15,     // Chance to turn at each intersection
        MIN_SEGMENTS: 8,            // Minimum path segments before allowing exit
        
        // Colors
        GRID_COLOR: 'rgba(128, 128, 128, 0.08)',
        GRID_DOT_COLOR: 'rgba(128, 128, 128, 0.15)',
        SIGNAL_CORE: 'rgba(126, 58, 183, 0.85)',
        SIGNAL_GLOW: 'rgba(88, 28, 135, 0.25)',
        
        // Hover effect
        HOVER_RADIUS: 120,          // Effect radius in pixels
        HOVER_SCALE_MAX: 1.4,       // Max scale multiplier
        HOVER_BRIGHTEN: 0.6         // Max brightness addition
    };

    // State
    let width, height, cols, rows;
    let signals = [];
    let mouseX = -1000, mouseY = -1000; // Start offscreen
    let targetMouseX = -1000, targetMouseY = -1000;
    let lastTime = 0;

    // Directions: 0=up, 1=right, 2=down, 3=left
    const DIRS = [
        { dx: 0, dy: -1 },  // up
        { dx: 1, dy: 0 },   // right
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 }   // left
    ];

    /**
     * Initialize canvas dimensions
     */
    function initCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * devicePixelRatio;
        canvas.height = height * devicePixelRatio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        cols = Math.ceil(width / CONFIG.GRID_SIZE) + 1;
        rows = Math.ceil(height / CONFIG.GRID_SIZE) + 1;
    }

    /**
     * Generate a path that starts from one edge and exits at another
     * Returns array of grid points: [{col, row}, ...]
     */
    function generateEdgeToEdgePath() {
        const path = [];
        
        // Pick random starting edge (0=top, 1=right, 2=bottom, 3=left)
        const startEdge = Math.floor(Math.random() * 4);
        let col, row, dir;
        
        // Start at random position on the chosen edge, direction pointing inward
        switch (startEdge) {
            case 0: // Top edge
                col = Math.floor(Math.random() * cols);
                row = 0;
                dir = 2; // Going down
                break;
            case 1: // Right edge
                col = cols - 1;
                row = Math.floor(Math.random() * rows);
                dir = 3; // Going left
                break;
            case 2: // Bottom edge
                col = Math.floor(Math.random() * cols);
                row = rows - 1;
                dir = 0; // Going up
                break;
            case 3: // Left edge
                col = 0;
                row = Math.floor(Math.random() * rows);
                dir = 1; // Going right
                break;
        }
        
        path.push({ col, row });
        let segments = 0;
        
        // Build path until we exit at an edge
        while (true) {
            // Decide if we turn at this intersection
            if (segments >= CONFIG.MIN_SEGMENTS / 2 && Math.random() < CONFIG.TURN_PROBABILITY) {
                // Turn 90 degrees (left or right, never reverse)
                const turnDir = Math.random() < 0.5 ? 1 : -1;
                dir = (dir + turnDir + 4) % 4;
            }
            
            // Move to next grid point
            col += DIRS[dir].dx;
            row += DIRS[dir].dy;
            segments++;
            
            // Check if we've exited the screen
            if (col < 0 || col >= cols || row < 0 || row >= rows) {
                // Clamp to edge for clean exit
                col = Math.max(0, Math.min(cols - 1, col));
                row = Math.max(0, Math.min(rows - 1, row));
                path.push({ col, row });
                break;
            }
            
            path.push({ col, row });
            
            // Safety: prevent infinite loops
            if (segments > 200) break;
        }
        
        return path;
    }

    /**
     * Create a signal object with a full path
     */
    function createSignal() {
        const gridPath = generateEdgeToEdgePath();
        
        // Convert grid points to pixel coordinates
        const points = gridPath.map(p => ({
            x: p.col * CONFIG.GRID_SIZE,
            y: p.row * CONFIG.GRID_SIZE
        }));
        
        // Calculate total path length
        let totalLength = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            totalLength += Math.abs(dx) + Math.abs(dy);
        }
        
        return {
            points,
            totalLength,
            progress: 0, // Distance traveled along path
            active: true
        };
    }

    /**
     * Get position along path at given distance
     */
    function getPositionAtDistance(signal, distance) {
        if (distance <= 0) return signal.points[0];
        if (distance >= signal.totalLength) return signal.points[signal.points.length - 1];
        
        let traveled = 0;
        for (let i = 1; i < signal.points.length; i++) {
            const p1 = signal.points[i - 1];
            const p2 = signal.points[i];
            const segmentLength = Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
            
            if (traveled + segmentLength >= distance) {
                const t = (distance - traveled) / segmentLength;
                return {
                    x: p1.x + (p2.x - p1.x) * t,
                    y: p1.y + (p2.y - p1.y) * t
                };
            }
            traveled += segmentLength;
        }
        return signal.points[signal.points.length - 1];
    }

    /**
     * Draw the grid with hover effect
     */
    function drawGrid() {
        // Draw grid lines
        ctx.strokeStyle = CONFIG.GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Vertical lines
        for (let x = 0; x <= width; x += CONFIG.GRID_SIZE) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += CONFIG.GRID_SIZE) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
        
        // Draw intersection dots with hover effect
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const x = c * CONFIG.GRID_SIZE;
                const y = r * CONFIG.GRID_SIZE;
                
                // Calculate distance to mouse
                const dx = x - mouseX;
                const dy = y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Hover effect: scale and brighten based on distance
                let scale = 1;
                let brighten = 0;
                
                if (dist < CONFIG.HOVER_RADIUS) {
                    // Smooth falloff using cosine easing
                    const t = 1 - (dist / CONFIG.HOVER_RADIUS);
                    const ease = (1 - Math.cos(t * Math.PI)) / 2;
                    scale = 1 + (CONFIG.HOVER_SCALE_MAX - 1) * ease;
                    brighten = CONFIG.HOVER_BRIGHTEN * ease;
                }
                
                // Base dot
                const baseRadius = 1.5;
                const radius = baseRadius * scale;
                
                // Color: blend from grey to white based on brighten
                const r_val = Math.round(128 + (255 - 128) * brighten);
                const g_val = Math.round(128 + (255 - 128) * brighten);
                const b_val = Math.round(128 + (255 - 128) * brighten);
                const alpha = 0.15 + 0.35 * brighten;
                
                ctx.fillStyle = `rgba(${r_val}, ${g_val}, ${b_val}, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Draw a signal on its path
     */
    function drawSignal(signal) {
        const headPos = getPositionAtDistance(signal, signal.progress);
        const tailStart = Math.max(0, signal.progress - CONFIG.SIGNAL_LENGTH);
        
        // Draw the signal trail
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Glow layer
        ctx.strokeStyle = CONFIG.SIGNAL_GLOW;
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(88, 28, 135, 0.35)';
        ctx.shadowBlur = 6;
        drawSignalPath(signal, tailStart, signal.progress);
        
        // Core layer
        ctx.strokeStyle = CONFIG.SIGNAL_CORE;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        drawSignalPath(signal, tailStart, signal.progress);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
    }

    /**
     * Draw path segment between two distances
     */
    function drawSignalPath(signal, startDist, endDist) {
        if (startDist >= endDist) return;
        
        ctx.beginPath();
        let isFirst = true;
        let traveled = 0;
        
        for (let i = 1; i < signal.points.length; i++) {
            const p1 = signal.points[i - 1];
            const p2 = signal.points[i];
            const segLen = Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
            const segEnd = traveled + segLen;
            
            // Check if this segment overlaps with our range
            if (segEnd > startDist && traveled < endDist) {
                const t1 = Math.max(0, (startDist - traveled) / segLen);
                const t2 = Math.min(1, (endDist - traveled) / segLen);
                
                const x1 = p1.x + (p2.x - p1.x) * t1;
                const y1 = p1.y + (p2.y - p1.y) * t1;
                const x2 = p1.x + (p2.x - p1.x) * t2;
                const y2 = p1.y + (p2.y - p1.y) * t2;
                
                if (isFirst) {
                    ctx.moveTo(x1, y1);
                    isFirst = false;
                }
                ctx.lineTo(x2, y2);
            }
            
            traveled = segEnd;
            if (traveled >= endDist) break;
        }
        
        ctx.stroke();
    }

    /**
     * Update signal positions
     */
    function updateSignals(deltaTime) {
        const moveDistance = CONFIG.SIGNAL_SPEED * deltaTime;
        
        for (let i = signals.length - 1; i >= 0; i--) {
            const signal = signals[i];
            signal.progress += moveDistance;
            
            // Remove signal when it has fully exited
            if (signal.progress > signal.totalLength + CONFIG.SIGNAL_LENGTH) {
                signals.splice(i, 1);
            }
        }
        
        // Maintain signal count
        while (signals.length < CONFIG.SIGNAL_COUNT) {
            signals.push(createSignal());
        }
    }

    /**
     * Smooth mouse tracking with easing
     */
    function updateMouse() {
        const ease = 0.08;
        mouseX += (targetMouseX - mouseX) * ease;
        mouseY += (targetMouseY - mouseY) * ease;
    }

    /**
     * Main render loop
     */
    function render(currentTime) {
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Update state
        updateMouse();
        updateSignals(deltaTime);
        
        // Draw
        drawGrid();
        signals.forEach(drawSignal);
        
        requestAnimationFrame(render);
    }

    /**
     * Initialize and start
     */
    function init() {
        initCanvas();
        
        // Create initial signals
        for (let i = 0; i < CONFIG.SIGNAL_COUNT; i++) {
            const signal = createSignal();
            // Stagger initial positions for visual variety
            signal.progress = Math.random() * signal.totalLength * 0.5;
            signals.push(signal);
        }
        
        // Mouse tracking
        document.addEventListener('mousemove', (e) => {
            targetMouseX = e.clientX;
            targetMouseY = e.clientY;
        });
        
        document.addEventListener('mouseleave', () => {
            targetMouseX = -1000;
            targetMouseY = -1000;
        });
        
        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initCanvas();
                signals = [];
                for (let i = 0; i < CONFIG.SIGNAL_COUNT; i++) {
                    signals.push(createSignal());
                }
            }, 150);
        });
        
        // Start animation
        requestAnimationFrame(render);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll behavior for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for any fixed headers
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Console welcome message
console.log(`
🚀 Welcome to TeamUp! 🚀
    
    ████████╗███████╗ █████╗ ███╗   ███╗    ██╗   ██╗██████╗ 
    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║    ██║   ██║██╔══██╗
       ██║   █████╗  ███████║██╔████╔██║    ██║   ██║██████╔╝
       ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║    ██║   ██║██╔═══╝ 
       ██║   ███████╗██║  ██║██║ ╚═╝ ██║    ╚██████╔╝██║     
       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═════╝ ╚═╝     
    
    Find the perfect teammates in seconds! 🤝
`);
