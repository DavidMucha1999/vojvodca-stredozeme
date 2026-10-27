/*
 * Ovládanie myšou, dotykom a klávesnicou.
 */
function pos(e) { const r = cv.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width * W; ptr.y = (e.clientY - r.top) / r.height * H; }
cv.addEventListener('pointerdown', e => {
    pos(e);
    ptr.down = true;
    if (mode === 'map') {
        if (ptr.x > W - 186 && ptr.y > H - 126) {
            G.tx = (ptr.x - W + 186) / 180 * WW;
            G.ty = (ptr.y - H + 126) / 120 * WH;
            G.dest = -1;
            G.vd = -1;
            G.chase = null;
            G.talk = null;
            return;
        }
        const wx = ptr.x / Z + cam.x, wy = ptr.y / Z + cam.y;
        G.tx = wx;
        G.ty = wy;
        G.dest = -1;
        G.chase = null;
        G.talk = null;
        E.forEach(e => {
            const d = Math.hypot(e.x - wx, e.y - wy);
            if (d < 34) {
                if (hos(e.f, G.fac))
                    G.chase = e;
                else
                    G.talk = e;
            }
        });
        G.vd = -1;
        VL.forEach((v, i) => {
            if (Math.hypot(v.x - wx, v.y - wy) < 26) {
                G.tx = v.x;
                G.ty = v.y;
                G.vd = i;
            }
        });
        TW.forEach((t, i) => {
            if (Math.hypot(t.x - wx, t.y - wy) < 30) {
                G.tx = t.x;
                G.ty = t.y;
                G.dest = i;
            }
        });
        if (G.chase || G.talk) {
            G.vd = -1;
            G.dest = -1;
        }
    }
});
cv.addEventListener('pointermove', pos);
addEventListener('pointerup', () => ptr.down = false);
addEventListener('keydown', e => {
    if (mode === 'battle' && e.key >= '1' && e.key <= '4')
        setOrd('ahrf'[e.key - 1]);
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    if ((e.key.startsWith('Arrow') || e.key === ' ') && e.target.tagName !== 'INPUT')
        e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key] = false; keys[e.key.toLowerCase()] = false; });
cv.addEventListener('wheel', e => {
    if (mode === 'map') {
        Z = Math.max(.45, Math.min(1.5, Z - Math.sign(e.deltaY) * .1));
        e.preventDefault();
    }
}, { passive: false });
cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); MP.x = (e.clientX - r.left) / r.width * W; MP.y = (e.clientY - r.top) / r.height * H; });
cv.addEventListener('pointerdown', () => { if (G && mode === 'map' && G.camp) {
    G.camp = 0;
    const b = [...tb.children].find(x => /tábor/i.test(x.textContent));
    if (b)
        b.textContent = 'Tábor';
    upd();
} });
