// TeamUp - Professional Interactive Landing Page

class TeamUpApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupInteractions();
        this.setupParticles();
        this.setupAnimations();
        this.addClickHandlers();
        this.setupScrollEffects();
    }

    // TeamUp Canvas Animation
    setupCanvas() {
        const canvas = document.getElementById('teamCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        let particles = [];
        let connections = [];
        let animationId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticles = () => {
            particles = [];
            connections = [];
            // Optimized particle count for better performance
            const particleCount = Math.min(window.innerWidth / 40, 20);
            
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5, // Reduced speed for smoother movement
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 3 + 1.5, // Smaller particles
                    color: `hsla(${Math.random() * 30 + 270}, 70%, ${Math.random() * 20 + 60}%, 0.6)`,
                    pulseSpeed: Math.random() * 0.015 + 0.008, // Slower pulse
                    pulse: 0,
                    glowIntensity: Math.random() * 0.4 + 0.1 // Reduced glow
                });
            }
        };

        let lastFrameTime = 0;
        const targetFPS = 30; // Optimized for smooth performance
        const frameInterval = 1000 / targetFPS;
        
        const animateParticles = (currentTime = 0) => {
            animationId = requestAnimationFrame(animateParticles);
            
            // Throttle frame rate for better performance
            if (currentTime - lastFrameTime < frameInterval) {
                return;
            }
            lastFrameTime = currentTime;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update particle positions and pulse
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.pulse += particle.pulseSpeed;
                
                // Smooth boundary handling
                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -0.8;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -0.8;
                
                // Keep particles in bounds
                particle.x = Math.max(0, Math.min(canvas.width, particle.x));
                particle.y = Math.max(0, Math.min(canvas.height, particle.y));
            });
            
            // Draw connections (team connections) - optimized
            particles.forEach((particle, i) => {
                particles.slice(i + 1).forEach(otherParticle => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 80) { // Reduced connection distance
                        const opacity = (80 - distance) / 80 * 0.2; // Reduced opacity
                        
                        ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.stroke();
                    }
                });
            });
            
            // Draw particles (team members)
            particles.forEach(particle => {
                const pulseSize = Math.sin(particle.pulse) * 0.3 + 1;
                const currentRadius = particle.radius * pulseSize;
                
                // Smooth particle rendering
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Subtle inner highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(particle.x - currentRadius * 0.2, particle.y - currentRadius * 0.2, currentRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        resizeCanvas();
        createParticles();
        animateParticles();

        window.addEventListener('resize', () => {
            resizeCanvas();
            createParticles();
        });

        // Pause animation when tab is not visible for better performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animateParticles();
            }
        });
    }

    // Interactive Particles on Mouse Move
    setupParticles() {
        const createInteractiveParticle = (x, y) => {
            const particle = document.createElement('div');
            particle.className = 'interactive-particle';
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: radial-gradient(circle, rgba(139, 92, 246, 0.8), rgba(139, 92, 246, 0.2));
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${x}px;
                top: ${y}px;
                animation: particleFloat 1.5s ease-out forwards;
                box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
            `;
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 1500);
        };

        // Add particle animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes particleFloat {
                0% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.3) translateY(-80px);
                }
            }
        `;
        document.head.appendChild(style);

        let particleTimer;
        document.addEventListener('mousemove', (e) => {
            clearTimeout(particleTimer);
            particleTimer = setTimeout(() => {
                if (Math.random() > 0.85) { // 15% chance for better performance
                    createInteractiveParticle(e.clientX, e.clientY);
                }
            }, 100);
        });
    }

    // Smooth Interactions
    setupInteractions() {
        // Subtle parallax effect for floating team elements
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;
            
            document.querySelectorAll('.team-element').forEach((element, index) => {
                const speed = (index + 1) * 0.3;
                const x = (mouseX - 0.5) * speed * 15;
                const y = (mouseY - 0.5) * speed * 15;
                element.style.transform = `translate(${x}px, ${y}px) rotate(${index * 30}deg)`;
            });
        });

        // Smooth tilt effect for cards
        document.querySelectorAll('.social-link').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / centerY * -5;
                const rotateY = (x - centerX) / centerX * 5;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(5px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            });
        });
    }

    // Smooth Animations
    setupAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        }, observerOptions);

        // Observe animated elements
        document.querySelectorAll('.social-link, .mission-container').forEach(el => {
            observer.observe(el);
        });

        // Staggered animation for social links
        this.staggerAnimation('.social-link', 100);
    }

    staggerAnimation(selector, delay) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * delay}ms`;
        });
    }

    // Click Handlers and Interactions
    addClickHandlers() {
        // Add smooth click effects
        document.querySelectorAll('.social-link').forEach(element => {
            element.addEventListener('click', (e) => {
                this.createClickEffect(e.clientX, e.clientY);
                this.addRippleEffect(element, e);
                
                // Smooth scale animation
                element.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    element.style.transform = '';
                }, 150);
            });
        });

        // TeamUp avatar interaction
        const teamupImg = document.querySelector('.teamup-img');
        if (teamupImg) {
            let clickCount = 0;
            teamupImg.addEventListener('click', () => {
                clickCount++;
                
                if (clickCount === 1) {
                    this.showTeamUpDialog("Welcome to TeamUp! We're building the future of team collaboration for students.");
                } else if (clickCount === 3) {
                    this.showTeamUpDialog("You found the easter egg! TeamUp is all about discovering hidden connections!");
                    this.triggerConfetti();
                } else if (clickCount === 5) {
                    this.showTeamUpDialog("That's enough clicking for now! Stay tuned for our launch!");
                    clickCount = 0;
                }
                
                // Add bounce animation
                teamupImg.style.animation = 'none';
                setTimeout(() => {
                    teamupImg.style.animation = 'avatarPulse 3s ease-in-out infinite';
                }, 10);
            });
        }
    }

    createClickEffect(x, y) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.1));
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
            z-index: 9999;
            left: ${x - 20}px;
            top: ${y - 20}px;
            width: 40px;
            height: 40px;
        `;
        
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    addRippleEffect(element, event) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(139, 92, 246, 0.2);
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    showTeamUpDialog(message) {
        const dialog = document.createElement('div');
        dialog.className = 'teamup-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            color: var(--text-primary);
            padding: 2rem;
            border-radius: 20px;
            border: 1px solid rgba(139, 92, 246, 0.2);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            animation: dialogAppear 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
        `;
        
        dialog.innerHTML = `
            <div style="font-size: 1.1rem; margin-bottom: 1rem; line-height: 1.5;">${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: linear-gradient(135deg, #8B5CF6, #A855F7);
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 25px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            ">Got it!</button>
        `;
        
        document.body.appendChild(dialog);
        
        setTimeout(() => {
            dialog.remove();
        }, 5000);
    }

    triggerConfetti() {
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                this.createConfettiPiece();
            }, i * 30);
        }
    }

    createConfettiPiece() {
        const confetti = document.createElement('div');
        const colors = ['#8B5CF6', '#A855F7', '#7C3AED', '#C084FC', '#F3E8FF'];
        const shapes = ['🚀', '🤝', '⭐', '🌟', '💡', '🏆'];
        
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.cssText = `
            position: fixed;
            font-size: ${Math.random() * 16 + 8}px;
            color: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * window.innerWidth}px;
            top: -50px;
            pointer-events: none;
            z-index: 9999;
            animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
            transform: rotate(${Math.random() * 360}deg);
        `;
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }

    setupScrollEffects() {
        let ticking = false;
        
        const updateScrollEffects = () => {
            const scrollY = window.pageYOffset;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollProgress = scrollY / (documentHeight - windowHeight);
            
            // Subtle parallax effect for background
            const backgroundAnimation = document.querySelector('.background-animation');
            if (backgroundAnimation) {
                backgroundAnimation.style.transform = `translateY(${scrollY * 0.05}px)`;
            }
            
            // Update floating team elements with smooth parallax
            document.querySelectorAll('.team-element').forEach((element, index) => {
                const speed = (index % 3 + 1) * 0.1;
                const yOffset = scrollY * speed;
                const rotationOffset = scrollProgress * 180 * (index % 2 === 0 ? 1 : -1);
                element.style.transform = `translateY(${yOffset}px) rotate(${rotationOffset}deg)`;
            });
            
            ticking = false;
        };
        
        const requestScrollUpdate = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', requestScrollUpdate);
        
        // Initial call to set up the effects
        updateScrollEffects();
    }
}

// Enhanced CSS Animations
const enhancedStyles = `
    @keyframes rippleEffect {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
    }
    
    @keyframes ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
    }
    
    @keyframes dialogAppear {
        0% { transform: translate(-50%, -50%) scale(0); }
        100% { transform: translate(-50%, -50%) scale(1); }
    }
    
    @keyframes confettiFall {
        0% { 
            transform: translateY(-50px) rotate(0deg); 
            opacity: 1; 
        }
        100% { 
            transform: translateY(100vh) rotate(720deg); 
            opacity: 0; 
        }
    }
    
    .teamup-dialog {
        backdrop-filter: blur(12px);
    }
`;

// Add enhanced styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TeamUpApp();
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
    
    Building tomorrow's leaders today! 🤝
`);

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`TeamUp loaded in ${perfData.loadEventEnd - perfData.fetchStart}ms`);
        }, 0);
    });
}
