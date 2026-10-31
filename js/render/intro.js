/*
 * Animovaná bojová scéna na úvodnej obrazovke.
 */
function silh(x, y, s, side, i) {
    const c = '#0d0806', b = Math.sin(tm / 6 + i) * 1.5 * s;
    ctx.save();
    ctx.translate(x, y + b);
    ctx.scale(side ? -s : s, s);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0, -14, 6, 11, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -29, 5, 0, 7);
    ctx.fill();
    ctx.fillRect(-5, -6, 4, 12);
    ctx.fillRect(1, -6, 4, 12);
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(16, -44 + Math.sin(tm / 9 + i) * 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(7, -14, 4, 8, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = side ? 'rgba(255,90,30,.55)' : 'rgba(255,170,90,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -29, 5, -1.2, .6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -14, 6, 11, 0, -1.2, .4);
    ctx.stroke();
    ctx.restore();
    if (i % 9 === 0) {
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 62 * s);
        ctx.stroke();
        bnr(side ? x - 18 * s : x, y - 62 * s, side ? 2 : 0, 18 * s, 24 * s);
    }
}
function introScene() {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#140a18');
    g.addColorStop(.35, '#4a1a1a');
    g.addColorStop(.58, '#c85a22');
    g.addColorStop(.66, '#f0a050');
    g.addColorStop(.67, '#2a120c');
    g.addColorStop(1, '#0a0605');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) {
        ctx.fillStyle = 'rgba(255,240,220,' + (.3 + .3 * Math.sin(tm / 20 + k)) + ')';
        ctx.fillRect((k * 137) % W, (k * 53) % 120, 1.5, 1.5);
    }
    const md = 575, pul = .5 + .5 * Math.sin(tm / 14);
    let rg = ctx.createRadialGradient(md, 175, 5, md, 175, 260);
    rg.addColorStop(0, 'rgba(255,120,30,' + (.55 + .2 * pul) + ')');
    rg.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 7; k++) {
        const s = (tm * .3 + k * 30) % 210;
        ctx.fillStyle = 'rgba(40,20,18,' + (.55 - s / 420) + ')';
        ctx.beginPath();
        ctx.arc(md + Math.sin(s * .03 + k) * 30 + s * .4, 170 - s, 18 + s * .25, 0, 7);
        ctx.fill();
    }
    ctx.fillStyle = '#2a1410';
    ctx.beginPath();
    ctx.moveTo(0, 320);
    for (let x = 0; x <= W; x += 16)
        ctx.lineTo(x, 292 - Math.abs(Math.sin(x * .012)) * 55 - Math.sin(x * .043) * 12);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = '#140806';
    ctx.beginPath();
    ctx.moveTo(470, 318);
    ctx.lineTo(560, 172);
    ctx.lineTo(590, 172);
    ctx.lineTo(690, 318);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,20,' + (.6 + .3 * pul) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(575, 175);
    ctx.quadraticCurveTo(565, 240, 540, 300);
    ctx.stroke();
    ctx.fillStyle = '#0c0504';
    ctx.fillRect(660, 120, 16, 200);
    ctx.beginPath();
    ctx.moveTo(652, 128);
    ctx.lineTo(660, 96);
    ctx.lineTo(668, 120);
    ctx.lineTo(676, 96);
    ctx.lineTo(684, 128);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,90,20,' + (.7 + .3 * pul) + ')';
    ctx.beginPath();
    ctx.ellipse(668, 108, 9, 4, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(668, 108, 1.5, 4, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#1e100c';
    ctx.beginPath();
    ctx.moveTo(0, 330);
    ctx.quadraticCurveTo(80, 230, 210, 330);
    ctx.fill();
    ctx.fillStyle = '#2c1c16';
    [[30, 270, 130, 30], [48, 248, 94, 24], [64, 228, 62, 22], [80, 210, 30, 20]].forEach(([a, b, w, h]) => { ctx.fillRect(a, b, w, h); for (let k = a; k < a + w; k += 10)
        ctx.fillRect(k, b - 5, 5, 5); });
    ctx.fillRect(92, 168, 6, 44);
    ctx.fillStyle = 'rgba(255,200,120,.75)';
    [[52, 280], [84, 280], [118, 280], [70, 256], [100, 256], [86, 236]].forEach(([a, b]) => ctx.fillRect(a, b, 3, 4));
    ctx.fillStyle = '#160c09';
    ctx.fillRect(0, 330, W, H - 330);
    for (let k = 0; k < 6; k++) {
        const p = ((tm * .9 + k * 70) % 420) / 420, sx = 140 + p * 440, sy = 300 - Math.sin(p * Math.PI) * 140;
        ctx.strokeStyle = 'rgba(30,18,14,.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 9, sy + (p - .5) * 10);
        ctx.stroke();
    }
    for (let row = 0; row < 5; row++)
        for (let i = 0; i < 16; i++) {
            const side = i % 2, col = i >> 1, s = .85 + row * .16, adv = Math.sin(tm / 40) * 6;
            const x = side ? W / 2 + 26 + col * 40 + row * 10 - adv : W / 2 - 26 - col * 40 - row * 10 + adv;
            silh(x, 352 + row * 26, s, side, row * 16 + i);
        }
    for (let k = 0; k < 14; k++) {
        if (Math.random() < .5) {
            ctx.fillStyle = 'rgba(255,' + (180 + Math.random() * 70 | 0) + ',80,.9)';
            ctx.fillRect(W / 2 - 20 + Math.random() * 40, 330 + Math.random() * 120, 2, 2);
        }
    }
    for (let k = 0; k < 30; k++) {
        const s = (tm * .6 + k * 40) % 480;
        ctx.fillStyle = 'rgba(255,140,40,' + (.7 - s / 700) + ')';
        ctx.fillRect((k * 97 + Math.sin(s / 30 + k) * 20) % W, H - s, 2, 2);
    }
    ctx.drawImage(introVignette(), 0, 0);
}

/** Vinetácia úvodnej scény (tmavé okraje), kreslí sa raz. */
let VG0 = null;
function introVignette() {
    if (VG0) return VG0;
    const v = document.createElement('canvas'); v.width = W; v.height = H;
    const e = v.getContext('2d'), r = e.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.5)');
    e.fillStyle = r; e.fillRect(0, 0, W, H);
    return VG0 = v;
}
