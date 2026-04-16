document.addEventListener('DOMContentLoaded', () => {
    // --- Common: Reveal Animation ---
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Trigger Skill Bars if visible
                if (entry.target.id === 'skills') {
                    animateSkillBars();
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    function animateSkillBars() {
        document.querySelectorAll('.skill-bar-fill').forEach(bar => {
            const percent = bar.getAttribute('data-percent');
            bar.style.width = percent + '%';
        });
    }

    // --- 1. Particle Background ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        draw() {
            ctx.fillStyle = `rgba(56, 189, 248, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 80; i++) {
            particles.push(new Particle());
        }
    }
    initParticles();

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // --- 2. Interactive Piano ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = {
        "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13,
        "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00,
        "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88, "C5": 523.25
    };

    function playNote(frequency) {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1);
    }

    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', () => {
            const note = key.getAttribute('data-note');
            playNote(notes[note]);
            key.classList.add('active');
        });
        key.addEventListener('mouseup', () => key.classList.remove('active'));
        key.addEventListener('mouseleave', () => key.classList.remove('active'));
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl && !e.repeat) {
            const note = keyEl.getAttribute('data-note');
            playNote(notes[note]);
            keyEl.classList.add('active');
        }
    });
    window.addEventListener('keyup', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl) keyEl.classList.remove('active');
    });

    // --- 3. Creative Canvas ---
    const dCanvas = document.getElementById('drawing-canvas');
    const dCtx = dCanvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const brushSize = document.getElementById('brush-size');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const gallery = document.getElementById('drawing-gallery');

    let painting = false;

    function startPosition(e) {
        painting = true;
        draw(e);
    }
    function finishedPosition() {
        painting = false;
        dCtx.beginPath();
    }
    function draw(e) {
        if (!painting) return;
        const rect = dCanvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        dCtx.lineWidth = brushSize.value;
        dCtx.lineCap = 'round';
        dCtx.strokeStyle = colorPicker.value;

        dCtx.lineTo(x, y);
        dCtx.stroke();
        dCtx.beginPath();
        dCtx.moveTo(x, y);
    }

    dCanvas.addEventListener('mousedown', startPosition);
    dCanvas.addEventListener('mouseup', finishedPosition);
    dCanvas.addEventListener('mousemove', draw);
    dCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e.touches[0]); });
    dCanvas.addEventListener('touchend', finishedPosition);
    dCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });

    clearBtn.addEventListener('click', () => {
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
    });

    // Gallery Logic (LocalStorage)
    function saveToGallery() {
        const dataURL = dCanvas.toDataURL();
        let savedDrawings = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        savedDrawings.push(dataURL);
        localStorage.setItem('reno-drawings', JSON.stringify(savedDrawings));
        loadGallery();
    }

    function loadGallery() {
        gallery.innerHTML = '';
        const savedDrawings = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        savedDrawings.slice().reverse().forEach(data => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const img = document.createElement('img');
            img.src = data;
            item.appendChild(img);
            gallery.appendChild(item);
        });
    }

    saveBtn.addEventListener('click', saveToGallery);
    loadGallery();
});
