document.addEventListener('DOMContentLoaded', () => {
    // --- Common: Reveal Animation ---
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                if (entry.target.id === 'skills') animateSkillBars();
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
        for (let i = 0; i < 80; i++) particles.push(new Particle());
    }
    initParticles();

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // --- 2. Interactive Piano & Recording ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = {
        "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13,
        "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00,
        "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88, "C5": 523.25
    };

    let isRecording = false;
    let recordingStartTime = 0;
    let recordedNotes = [];
    let bgmTimeouts = [];
    let isPlayingBGM = false;
    let recordingTimer = null;

    const recordBtn = document.getElementById('record-btn');
    const playBgmBtn = document.getElementById('play-bgm-btn');

    function playNote(frequency, volume = 0.5) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1);
    }

    function handleNotePress(note) {
        playNote(notes[note]);
        if (isRecording) {
            recordedNotes.push({
                note: note,
                time: audioCtx.currentTime - recordingStartTime
            });
        }
    }

    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', () => {
            handleNotePress(key.getAttribute('data-note'));
            key.classList.add('active');
        });
        key.addEventListener('mouseup', () => key.classList.remove('active'));
        key.addEventListener('mouseleave', () => key.classList.remove('active'));
    });

    window.addEventListener('keydown', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl && !e.repeat) {
            handleNotePress(keyEl.getAttribute('data-note'));
            keyEl.classList.add('active');
        }
    });
    window.addEventListener('keyup', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl) keyEl.classList.remove('active');
    });

    // Recording Logic
    recordBtn.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });

    function startRecording() {
        isRecording = true;
        recordedNotes = [];
        recordingStartTime = audioCtx.currentTime;
        recordBtn.textContent = '録音停止...';
        recordBtn.classList.add('btn-primary');
        playBgmBtn.disabled = true;
        
        // 30s limit
        recordingTimer = setTimeout(stopRecording, 30000);
    }

    function stopRecording() {
        isRecording = false;
        clearTimeout(recordingTimer);
        recordBtn.textContent = '録音開始 (最大30秒)';
        recordBtn.classList.remove('btn-primary');
        if (recordedNotes.length > 0) {
            playBgmBtn.disabled = false;
        }
    }

    playBgmBtn.addEventListener('click', () => {
        if (!isPlayingBGM) {
            startBGM();
        } else {
            stopBGM();
        }
    });

    function startBGM() {
        isPlayingBGM = true;
        playBgmBtn.textContent = 'BGM停止';
        playBgmBtn.classList.add('btn-primary');
        playLoop();
    }

    function stopBGM() {
        isPlayingBGM = false;
        playBgmBtn.textContent = 'BGMとして再生';
        playBgmBtn.classList.remove('btn-primary');
        bgmTimeouts.forEach(t => clearTimeout(t));
        bgmTimeouts = [];
    }

    function playLoop() {
        if (!isPlayingBGM || recordedNotes.length === 0) return;
        
        const loopDuration = 30000; // Fixed loop or based on last note? Let's use 30s max or max note time + 1s
        const maxTime = Math.max(...recordedNotes.map(n => n.time)) + 1;
        
        recordedNotes.forEach(item => {
            const t = setTimeout(() => {
                playNote(notes[item.note], 0.15); // Lower volume for BGM
            }, item.time * 1000);
            bgmTimeouts.push(t);
        });

        // Schedule next loop
        const loopTimeout = setTimeout(playLoop, maxTime * 1000);
        bgmTimeouts.push(loopTimeout);
    }

    // --- 3. Creative Canvas ---
    const dCanvas = document.getElementById('drawing-canvas');
    const dCtx = dCanvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker');
    const brushSize = document.getElementById('brush-size');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const gallery = document.getElementById('drawing-gallery');

    let painting = false;

    // Helper to get correct coordinates for PC and Mobile
    function getPos(e) {
        const rect = dCanvas.getBoundingClientRect();
        const scaleX = dCanvas.width / rect.width;
        const scaleY = dCanvas.height / rect.height;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

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
        const pos = getPos(e);
        dCtx.lineWidth = brushSize.value;
        dCtx.lineCap = 'round';
        dCtx.strokeStyle = colorPicker.value;
        dCtx.lineTo(pos.x, pos.y);
        dCtx.stroke();
        dCtx.beginPath();
        dCtx.moveTo(pos.x, pos.y);
    }

    dCanvas.addEventListener('mousedown', startPosition);
    dCanvas.addEventListener('mouseup', finishedPosition);
    dCanvas.addEventListener('mousemove', draw);
    dCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPosition(e); }, {passive: false});
    dCanvas.addEventListener('touchend', finishedPosition);
    dCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, {passive: false});

    clearBtn.addEventListener('click', () => dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height));

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
