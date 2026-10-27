/*
 * Portréty veliteľov a snímky obrázkov pre encyklopédiu.
 */
function snap(w, h, fn) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try {
        fn();
    }
    catch (e) { }
    ctx.restore();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(cv, 0, 0, w, h, 0, 0, w, h);
    return c.toDataURL();
}
function portrait(e) {
    const f = e.f, ev = bloc(f) && f !== 4 && f !== 7 && !e.kr, h = ((e.id || 1) * 2654435761) >>> 0;
    const g = ctx.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, BF[f]);
    g.addColorStop(1, '#0c0907');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 84, 96);
    ctx.globalAlpha = .2;
    emb(42, 38, 28, f);
    ctx.globalAlpha = 1;
    if (e.nz) {
        ctx.fillStyle = 'rgba(160,0,0,.45)';
        ctx.beginPath();
        ctx.arc(42, 46, 40, 0, 7);
        ctx.fill();
    }
    ctx.fillStyle = e.nz ? '#08080a' : TB[f];
    ctx.beginPath();
    ctx.moveTo(4, 96);
    ctx.quadraticCurveTo(8, 62, 42, 59);
    ctx.quadraticCurveTo(76, 62, 80, 96);
    ctx.fill();
    if (e.nz) {
        ctx.fillStyle = '#050507';
        ctx.beginPath();
        ctx.moveTo(20, 66);
        ctx.quadraticCurveTo(42, 2, 64, 66);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(42, 44, 10, 13, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#ff3a2a';
        ctx.fillRect(36, 41, 3, 2);
        ctx.fillRect(45, 41, 3, 2);
        ctx.fillStyle = '#9aa0a8';
        ctx.beginPath();
        ctx.moveTo(26, 22);
        ctx.lineTo(42, 10);
        ctx.lineTo(58, 22);
        ctx.lineTo(54, 28);
        ctx.lineTo(30, 28);
        ctx.fill();
        return;
    }
    ctx.fillStyle = '#8a8e94';
    ctx.beginPath();
    ctx.ellipse(16, 70, 12, 7, -.4, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(68, 70, 12, 7, .4, 0, 7);
    ctx.fill();
    ctx.fillStyle = BF[f];
    ctx.fillRect(32, 67, 20, 29);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 67, 20, 29);
    emb(42, 80, 7, f);
    const skin = ev ? ['#6a7a4a', '#5a6a3a', '#7a7a5a'][h % 3] : f === 4 ? ['#8a5a3a', '#7a4a2a'][h % 2] : ['#e8c9a0', '#d8b088', '#c89870'][h % 3];
    ctx.fillStyle = skin;
    ctx.fillRect(37, 50, 10, 12);
    ctx.beginPath();
    ctx.ellipse(42, 40, f === 5 ? 14 : 12, 15, 0, 0, 7);
    ctx.fill();
    const hc = ['#3a2a1a', '#6a4a2a', '#a88a5a', '#d8d0c0', '#1a1a1a'][h % 5];
    if (f === 8) {
        ctx.fillStyle = '#e8d890';
        ctx.fillRect(28, 30, 5, 30);
        ctx.fillRect(51, 30, 5, 30);
    }
    if (f === 5 || (!ev && h % 3 === 0)) {
        ctx.fillStyle = f === 5 ? ['#8a3a1a', '#5a3a2a', '#c8c0b0'][h % 3] : hc;
        ctx.beginPath();
        ctx.moveTo(29, 42);
        ctx.quadraticCurveTo(42, f === 5 ? 76 : 62, 55, 42);
        ctx.fill();
    }
    ctx.fillStyle = ev ? '#ff3a2a' : '#2a1a10';
    ctx.fillRect(35, 37, 3.5, 2.5);
    ctx.fillRect(45.5, 37, 3.5, 2.5);
    if (ev) {
        ctx.fillStyle = '#e8e0c0';
        ctx.fillRect(37, 48, 2, 3);
        ctx.fillRect(45, 48, 2, 3);
    }
    ctx.strokeStyle = 'rgba(60,20,10,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(38, 47);
    ctx.lineTo(46, 47);
    ctx.stroke();
    ctx.fillStyle = HM[f];
    if (f === 0) {
        ctx.beginPath();
        ctx.arc(42, 35, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(28, 33, 28, 4);
        ctx.beginPath();
        ctx.moveTo(28, 32);
        ctx.lineTo(18, 16);
        ctx.lineTo(31, 26);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(56, 32);
        ctx.lineTo(66, 16);
        ctx.lineTo(53, 26);
        ctx.fill();
    }
    else if (f === 1) {
        ctx.beginPath();
        ctx.arc(42, 35, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#e8e0c0';
        ctx.beginPath();
        ctx.moveTo(42, 20);
        ctx.quadraticCurveTo(60, 18, 64, 40);
        ctx.lineTo(60, 40);
        ctx.quadraticCurveTo(56, 26, 42, 24);
        ctx.fill();
    }
    else if (f === 2 || f === 3) {
        ctx.beginPath();
        ctx.arc(42, 35, 14, Math.PI, 0);
        ctx.fill();
        for (let k = 0; k < 5; k++) {
            const a = Math.PI + (k + .5) * Math.PI / 5;
            ctx.beginPath();
            ctx.moveTo(42 + Math.cos(a - .2) * 13, 35 + Math.sin(a - .2) * 13);
            ctx.lineTo(42 + Math.cos(a) * 22, 35 + Math.sin(a) * 22);
            ctx.lineTo(42 + Math.cos(a + .2) * 13, 35 + Math.sin(a + .2) * 13);
            ctx.fill();
        }
        if (f === 3) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(40, 22, 4, 6);
        }
    }
    else if (f === 4) {
        ctx.beginPath();
        ctx.ellipse(42, 28, 15, 9, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#b02a1a';
        ctx.fillRect(28, 30, 28, 3);
    }
    else if (f === 5) {
        ctx.beginPath();
        ctx.arc(42, 34, 15, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(40, 34, 4, 9);
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(27, 32, 30, 3);
    }
    else if (f === 7) {
        ctx.beginPath();
        ctx.moveTo(26, 36);
        ctx.lineTo(42, 12);
        ctx.lineTo(58, 36);
        ctx.fill();
        ctx.fillStyle = '#5a1f4a';
        ctx.fillRect(28, 33, 28, 3);
    }
    else if (f === 8) {
        ctx.strokeStyle = '#e8d870';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(30, 30);
        ctx.quadraticCurveTo(42, 26, 54, 30);
        ctx.stroke();
        ctx.fillStyle = '#9fe0ff';
        ctx.beginPath();
        ctx.arc(42, 27.5, 1.8, 0, 7);
        ctx.fill();
    }
    else {
        ctx.beginPath();
        ctx.moveTo(24, 50);
        ctx.quadraticCurveTo(42, 8, 60, 50);
        ctx.lineTo(54, 50);
        ctx.quadraticCurveTo(42, 24, 30, 50);
        ctx.fill();
    }
    if (e.kr)
        crown(42, 14);
}
