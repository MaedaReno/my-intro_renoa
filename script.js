document.addEventListener('DOMContentLoaded', () => {
    // --- Common: Reveal Animation ---
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // --- 1. Particle Background ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resizeCanvas = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
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
            this.x += this.speedX; this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0; if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0; if (this.y < 0) this.y = canvas.height;
        }
        draw() {
            ctx.fillStyle = `rgba(56, 189, 248, ${this.opacity})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    function initParticles() { particles = []; for (let i = 0; i < 80; i++) particles.push(new Particle()); }
    initParticles();
    const animateParticles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    };
    animateParticles();

    // --- 2. Interactive Piano & Recording ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = {
        "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13,
        "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00,
        "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88, "C5": 523.25
    };

    let isRecording = false, recordingStartTime = 0, recordedNotes = [], bgmTimeouts = [], isPlayingBGM = false, recordingTimer = null;
    const recordBtn = document.getElementById('record-btn'), playBgmBtn = document.getElementById('play-bgm-btn');

    function playNote(frequency, volume = 0.5) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
        osc.frequency.setTargetAtTime(frequency, audioCtx.currentTime, 0.01);
        gain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 1);
    }

    function handleNotePress(note) {
        playNote(notes[note]);
        if (isRecording) recordedNotes.push({ note, time: audioCtx.currentTime - recordingStartTime });
    }

    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', () => { handleNotePress(key.getAttribute('data-note')); key.classList.add('active'); });
        key.addEventListener('mouseup', () => key.classList.remove('active'));
        key.addEventListener('mouseleave', () => key.classList.remove('active'));
    });

    window.addEventListener('keydown', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl && !e.repeat) { handleNotePress(keyEl.getAttribute('data-note')); keyEl.classList.add('active'); }
    });
    window.addEventListener('keyup', (e) => {
        const keyEl = document.querySelector(`.key[data-key="${e.key.toLowerCase()}"]`);
        if (keyEl) keyEl.classList.remove('active');
    });

    recordBtn.addEventListener('click', () => isRecording ? stopRecording() : startRecording());
    function startRecording() {
        isRecording = true; recordedNotes = []; recordingStartTime = audioCtx.currentTime;
        recordBtn.textContent = '録音停止...'; recordBtn.classList.add('btn-primary');
        playBgmBtn.disabled = true; recordingTimer = setTimeout(stopRecording, 30000);
    }
    function stopRecording() {
        isRecording = false; clearTimeout(recordingTimer);
        recordBtn.textContent = '録音開始 (最大30秒)'; recordBtn.classList.remove('btn-primary');
        if (recordedNotes.length > 0) playBgmBtn.disabled = false;
    }

    playBgmBtn.addEventListener('click', () => isPlayingBGM ? stopBGM() : startBGM());
    function startBGM() { isPlayingBGM = true; playBgmBtn.textContent = 'BGM停止'; playBgmBtn.classList.add('btn-primary'); playLoop(); }
    function stopBGM() { isPlayingBGM = false; playBgmBtn.textContent = 'BGMとして再生'; playBgmBtn.classList.remove('btn-primary'); bgmTimeouts.forEach(clearTimeout); bgmTimeouts = []; }
    function playLoop() {
        if (!isPlayingBGM || recordedNotes.length === 0) return;
        const maxTime = Math.max(...recordedNotes.map(n => n.time)) + 1;
        recordedNotes.forEach(item => {
            bgmTimeouts.push(setTimeout(() => playNote(notes[item.note], 0.15), item.time * 1000));
        });
        bgmTimeouts.push(setTimeout(playLoop, maxTime * 1000));
    }

    // --- 3. Creative Canvas & Smart Gallery Slider ---
    const dCanvas = document.getElementById('drawing-canvas'), dCtx = dCanvas.getContext('2d');
    const colorPicker = document.getElementById('color-picker'), brushSize = document.getElementById('brush-size');
    const clearBtn = document.getElementById('clear-btn'), saveBtn = document.getElementById('save-btn');
    const gallery = document.getElementById('drawing-gallery'), galleryContainer = document.getElementById('gallery-container');

    let painting = false, isPaused = false;
    const getPos = (e) => {
        const rect = dCanvas.getBoundingClientRect(), scaleX = dCanvas.width / rect.width, scaleY = dCanvas.height / rect.height;
        const cX = e.clientX || (e.touches && e.touches[0].clientX), cY = e.clientY || (e.touches && e.touches[0].clientY);
        return { x: (cX - rect.left) * scaleX, y: (cY - rect.top) * scaleY };
    };
    const draw = (e) => {
        if (!painting) return; const pos = getPos(e);
        dCtx.lineWidth = brushSize.value; dCtx.lineCap = 'round'; dCtx.strokeStyle = colorPicker.value;
        dCtx.lineTo(pos.x, pos.y); dCtx.stroke(); dCtx.beginPath(); dCtx.moveTo(pos.x, pos.y);
    };
    dCanvas.addEventListener('mousedown', (e) => { painting = true; draw(e); });
    dCanvas.addEventListener('mouseup', () => { painting = false; dCtx.beginPath(); });
    dCanvas.addEventListener('mousemove', draw);
    dCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); painting = true; draw(e); }, {passive: false});
    dCanvas.addEventListener('touchend', () => { painting = false; dCtx.beginPath(); });
    dCanvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, {passive: false});
    clearBtn.addEventListener('click', () => dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height));

    function loadGallery() {
        gallery.innerHTML = '';
        gallery.classList.remove('no-scroll');
        const saved = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        if (saved.length === 0) { originalWidth = 0; currentX = 0; updateSliderUI(); return; }

        const containerWidth = galleryContainer.offsetWidth;
        const itemWidth = 200 + 24; // Width + Margin (0.75rem * 2)
        const itemsPerSet = saved.length;
        const setWidth = itemsPerSet * itemWidth;

        const renderSet = () => {
            saved.forEach((data, index) => {
                const item = document.createElement('div'); item.className = 'gallery-item';
                const img = document.createElement('img'); img.src = data;
                const delBtn = document.createElement('button'); delBtn.className = 'delete-btn'; delBtn.innerHTML = '×';
                delBtn.onclick = (e) => { e.stopPropagation(); deleteDrawing(index); };
                item.appendChild(img); item.appendChild(delBtn); gallery.appendChild(item);
            });
        };

        if (setWidth <= containerWidth) {
            // No need to scroll
            renderSet();
            gallery.classList.add('no-scroll');
            originalWidth = 0;
            currentX = 0;
            updateSliderUI();
        } else {
            // Infinity scroll needed
            const repeatCount = Math.max(3, Math.ceil((containerWidth * 2) / setWidth) + 1);
            for (let i = 0; i < repeatCount; i++) renderSet();

            setTimeout(() => {
                const items = gallery.children;
                if (items.length >= itemsPerSet * 2) {
                    const rectA = items[0].getBoundingClientRect();
                    const rectB = items[itemsPerSet].getBoundingClientRect();
                    originalWidth = rectB.left - rectA.left;
                    if (currentX === 0 || Math.abs(currentX) > originalWidth * (repeatCount - 1)) {
                        currentX = -originalWidth;
                    }
                    updateSliderUI();
                }
            }, 100);
        }
    }

    function deleteDrawing(index) {
        let saved = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('reno-drawings', JSON.stringify(saved));
        loadGallery();
    }
    saveBtn.addEventListener('click', () => {
        const saved = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        saved.push(dCanvas.toDataURL());
        localStorage.setItem('reno-drawings', JSON.stringify(saved));
        loadGallery();
    });

    // --- High-Precision Slider Logic ---
    let originalWidth = 0, currentX = 0, velocity = 0, isDown = false, lastX = 0, lastTime = 0, isInteracting = false;
    const friction = 0.96;

    const updateSliderUI = () => {
        if (originalWidth <= 0) {
            gallery.style.transform = `translateX(0px)`;
            return;
        }
        while (currentX < -originalWidth * 2) currentX += originalWidth;
        while (currentX > -originalWidth) currentX -= originalWidth;
        gallery.style.transform = `translateX(${currentX}px)`;
    };

    const loop = () => {
        if (originalWidth > 0 && !isDown) {
            if (isInteracting) {
                currentX += velocity; velocity *= friction;
                if (Math.abs(velocity) < 0.1) { velocity = 0; isInteracting = false; }
            } else if (!isPaused) {
                currentX -= 0.6;
            }
        }
        if (originalWidth > 0) updateSliderUI();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const onPointerDown = (e) => {
        if (originalWidth <= 0) return;
        // Bug fix: Do not setPointerCapture if we clicked a delete button
        if (e.target.classList.contains('delete-btn')) return;
        
        isDown = true; isInteracting = true;
        lastX = e.clientX; lastTime = performance.now();
        velocity = 0;
        galleryContainer.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isDown) return;
        const now = performance.now();
        const dx = e.clientX - lastX;
        const dt = now - lastTime;
        if (dt > 0) velocity = dx;
        currentX += dx;
        lastX = e.clientX;
        lastTime = now;
    };

    const onPointerUp = (e) => {
        if (!isDown) return;
        isDown = false;
        velocity = Math.max(Math.min(velocity, 35), -35);
        galleryContainer.releasePointerCapture(e.pointerId);
    };

    galleryContainer.addEventListener('pointerdown', onPointerDown);
    galleryContainer.addEventListener('pointermove', onPointerMove);
    galleryContainer.addEventListener('pointerup', onPointerUp);
    galleryContainer.addEventListener('pointercancel', onPointerUp);

    galleryContainer.addEventListener('mouseenter', () => isPaused = true);
    galleryContainer.addEventListener('mouseleave', () => isPaused = false);

    window.addEventListener('resize', () => { loadGallery(); });
    loadGallery();
});
