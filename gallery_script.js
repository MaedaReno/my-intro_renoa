document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('gallery-grid');
    const countEl = document.getElementById('gallery-count');

    // --- 1. Particle Background (Shared Logic) ---
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

    function initParticles() { particles = []; for (let i = 0; i < 60; i++) particles.push(new Particle()); }
    initParticles();
    const animateParticles = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animateParticles);
    };
    animateParticles();

    // --- 2. Gallery Loading & Deletion ---
    function renderGallery() {
        grid.innerHTML = '';
        const saved = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        countEl.textContent = `${saved.length} items`;

        saved.forEach((data, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-page-item';
            
            const img = document.createElement('img');
            img.src = data;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '×';
            delBtn.title = '削除'; // Added for accessibility
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteItem(index);
            };

            item.appendChild(img);
            item.appendChild(delBtn);
            grid.appendChild(item);
        });
    }

    function deleteItem(index) {
        let saved = JSON.parse(localStorage.getItem('reno-drawings') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('reno-drawings', JSON.stringify(saved));
        renderGallery();
    }

    renderGallery();
});
