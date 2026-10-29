/*
 * Generovanie mapy sveta a bojiska (stromy, hory, rieky, cesty).
 */
function tree(c, x, y, s, d) {
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath();
    c.ellipse(x + 3, y + 2, 8 * s, 3 * s, 0, 0, 7);
    c.fill();
    c.fillStyle = '#4a3420';
    c.fillRect(x - 1.5 * s, y - 4 * s, 3 * s, 6 * s);
    for (let i = 0; i < 3; i++) {
        c.fillStyle = d ? '#2c2420' : ['#1f4a26', '#2a5c2e', '#357038'][i];
        c.beginPath();
        c.moveTo(x, y - (22 - i * 5) * s);
        c.lineTo(x + (10 - i * 2) * s, y - (4 - i * 5) * s + 2);
        c.lineTo(x - (10 - i * 2) * s, y - (4 - i * 5) * s + 2);
        c.fill();
    }
}
function mtn(c, x, y, s, snow, dark) {
    c.fillStyle = dark ? '#4a3a34' : '#8a8078';
    c.beginPath();
    c.moveTo(x, y - s);
    c.lineTo(x - s, y + s * .6);
    c.lineTo(x + s * .1, y + s * .6);
    c.fill();
    c.fillStyle = dark ? '#241814' : '#5a524c';
    c.beginPath();
    c.moveTo(x, y - s);
    c.lineTo(x + s, y + s * .6);
    c.lineTo(x + s * .1, y + s * .6);
    c.fill();
    if (snow) {
        c.fillStyle = '#f0f0f4';
        c.beginPath();
        c.moveTo(x, y - s);
        c.lineTo(x - s * .25, y - s * .6);
        c.lineTo(x + s * .1, y - s * .7);
        c.lineTo(x + s * .28, y - s * .58);
        c.fill();
    }
}
function buildMap() {
    const m = document.createElement('canvas');
    m.width = 5400;
    m.height = 3600;
    const c = m.getContext('2d');
    const g = c.createLinearGradient(0, 0, 1800, 0);
    g.addColorStop(0, '#40602f');
    g.addColorStop(.55, '#586334');
    g.addColorStop(.78, '#4a3a2a');
    g.addColorStop(1, '#26120c');
    c.scale(3, 3);
    c.fillStyle = g;
    c.fillRect(0, 0, 1800, 1200);
    for (let i = 0; i < 500; i++) {
        c.fillStyle = R() < .5 ? 'rgba(255,255,200,.05)' : 'rgba(0,0,0,.07)';
        c.beginPath();
        c.arc(R() * 1800, R() * 1200, 15 + R() * 40, 0, 7);
        c.fill();
    }
    c.strokeStyle = '#2c5b73';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(640, 0);
    c.bezierCurveTo(600, 300, 820, 420, 780, 640);
    c.bezierCurveTo(760, 800, 900, 880, 860, 1200);
    c.stroke();
    c.strokeStyle = '#4a86a0';
    c.lineWidth = 6;
    c.stroke();
    c.fillStyle = '#2c5b73';
    c.beginPath();
    c.ellipse(1200, 330, 120, 70, .2, 0, 7);
    c.fill();
    c.fillStyle = '#4a86a0';
    c.beginPath();
    c.ellipse(1190, 322, 100, 52, .2, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(190,165,110,.65)';
    c.lineWidth = 5;
    (typeof MAPDATA !== 'undefined' ? MAPDATA.roads : [[0, 1], [1, 11], [1, 2], [1, 9], [9, 5], [5, 4], [4, 3], [4, 6], [6, 8], [6, 7], [7, 14], [14, 12], [12, 15], [15, 13], [3, 10], [2, 3], [3, 20], [20, 19], [19, 21], [7, 16], [16, 18], [18, 17], [17, 13], [6, 22], [22, 23], [22, 24], [24, 14], [4, 25], [25, 5], [26, 1], [26, 9], [9, 27], [1, 28], [28, 11], [13, 29], [29, 30], [16, 31], [20, 32], [33, 34], [34, 19], [0, 35], [3, 36], [36, 10], [22, 37], [37, 25], [3, 38], [38, 4], [38, 39], [39, 3], [15, 40], [40, 13], [14, 41], [9, 42], [42, 2], [2, 43], [16, 44], [44, 7], [35, 45], [45, 0], [33, 46], [46, 47], [47, 13], [35, 48]]).forEach(([a, b]) => { c.beginPath(); c.moveTo(TW[a].x / K, TW[a].y / K); c.quadraticCurveTo((TW[a].x + TW[b].x) / 2 / K + 30, (TW[a].y + TW[b].y) / 2 / K - 25, TW[b].x / K, TW[b].y / K); c.stroke(); });
    c.strokeStyle = 'rgba(224,102,43,.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
        const x = 1480 + R() * 320, y = R() * 1200;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + R() * 40 - 20, y + R() * 40 - 20);
        c.lineTo(x + R() * 60 - 30, y + R() * 60 - 10);
        c.stroke();
    }
    const gl = c.createRadialGradient(1690, 600, 10, 1690, 600, 170);
    gl.addColorStop(0, 'rgba(255,120,30,.75)');
    gl.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = gl;
    c.fillRect(1500, 430, 300, 340);
    c.strokeStyle = 'rgba(30,70,30,.4)';
    c.lineWidth = 1;
    for (let i = 0; i < 6000; i++) {
        const x = R() * 1800, y = R() * 1200;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 1, y - 3);
        c.moveTo(x, y);
        c.lineTo(x + 1, y - 3);
        c.stroke();
    }
    c.fillStyle = '#24526a';
    c.fillRect(0, 0, 30, 1200);
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.fillRect(30, 0, 3, 1200);
    const tr = [];
    for (let i = 0; i < 1900; i++) {
        const x = R() * 1450, y = 40 + R() * 1150;
        if (TW.some(t => Math.hypot(t.x / K - x, t.y / K - y) < 50))
            continue;
        tr.push([x, y]);
    }
    tr.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => tree(c, x, y, .55 + R() * .3, 0));
    const ms = [];
    for (let i = 0; i < 22; i++)
        ms.push([i * 68 + R() * 30, 30 + R() * 60, 28 + R() * 26, 1, 0]);
    for (let i = 0; i < 46; i++)
        ms.push([1480 + R() * 300, 50 + R() * 1100, 24 + R() * 26, 0, 1]);
    ms.sort((a, b) => a[1] - b[1]).forEach(a => mtn(c, ...a));
    mtn(c, 1690, 600, 95, 0, 1);
    c.fillStyle = '#ff7a22';
    c.beginPath();
    c.moveTo(1690, 505);
    c.lineTo(1672, 528);
    c.lineTo(1708, 528);
    c.fill();
    MAP = m;
    const b = document.createElement('canvas');
    b.width = BW;
    b.height = BH;
    const d = b.getContext('2d');
    const q = d.createLinearGradient(0, 0, 0, BH);
    q.addColorStop(0, '#46683a');
    q.addColorStop(1, '#37522b');
    d.fillStyle = q;
    d.fillRect(0, 0, BW, BH);
    for (let i = 0; i < 640; i++) {
        d.fillStyle = R() < .5 ? 'rgba(255,255,170,.06)' : 'rgba(0,0,0,.08)';
        d.beginPath();
        d.arc(R() * BW, R() * BH, 10 + R() * 30, 0, 7);
        d.fill();
    }
    d.strokeStyle = 'rgba(20,50,20,.45)';
    d.lineWidth = 1.5;
    for (let i = 0; i < 1000; i++) {
        const x = R() * BW, y = R() * BH;
        d.beginPath();
        d.moveTo(x, y);
        d.lineTo(x - 2, y - 6);
        d.moveTo(x, y);
        d.lineTo(x + 2, y - 6);
        d.stroke();
    }
    d.fillStyle = '#2c5b73';
    d.fillRect(690, 0, 60, BH);
    d.fillStyle = '#4a86a0';
    d.fillRect(700, 0, 40, BH);
    d.fillStyle = '#8a7a58';
    d.fillRect(690, 440, 60, 80);
    for (let i = 0; i < 5; i++) {
        const cx = 200 + R() * 1000, cy = 100 + R() * 760;
        if (Math.abs(cx - 720) > 90)
            for (let j = 0; j < 12; j++)
                tree(d, cx + R() * 90 - 45, cy + R() * 70 - 35, 1.1, 0);
    }
    for (let i = 0; i < 30; i++) {
        d.fillStyle = '#6a6a62';
        d.beginPath();
        d.ellipse(R() * BW, R() * BH, 6 + R() * 8, 4 + R() * 5, 0, 0, 7);
        d.fill();
    }
    for (let i = 0; i < 40; i++) {
        tree(d, R() * BW, 30 + R() * 40, 1.3, 0);
        tree(d, R() * BW, BH - 6 - R() * 30, 1.3, 0);
    }
    for (let i = 0; i < 24; i++) {
        tree(d, 10 + R() * 40, R() * BH, 1.3, 0);
        tree(d, BW - 10 - R() * 40, R() * BH, 1.3, 0);
    }
    BG = b;
    const v = document.createElement('canvas');
    v.width = W;
    v.height = H;
    const e = v.getContext('2d'), r = e.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62);
    r.addColorStop(0, 'rgba(0,0,0,0)');
    r.addColorStop(1, 'rgba(0,0,0,.5)');
    e.fillStyle = r;
    e.fillRect(0, 0, W, H);
    VG = v;
}
