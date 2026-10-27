/*
 * Hlavná slučka hry a spustenie.
 */
function loop(now) {
    const dt = Math.min(2, (now - last) / 16.67 || 1);
    last = now;
    tm += dt;
    if (mode === 'map')
        updMap(dt);
    else if (mode === 'battle')
        updBattle(dt);
    if (G) {
        mode === 'battle' ? drawBattle() : drawMap();
    }
    if (TS && TS.l > 0 && G) {
        TS.l -= dt;
        ctx.font = '15px "IM Fell English",Georgia,serif';
        ctx.textAlign = 'center';
        const w = Math.min(W - 40, ctx.measureText(TS.s).width + 24);
        ctx.globalAlpha = Math.min(1, TS.l / 40);
        ctx.fillStyle = 'rgba(18,14,12,.88)';
        ctx.fillRect(W / 2 - w / 2, 64, w, 26);
        ctx.fillStyle = '#d9a441';
        ctx.fillText(TS.s, W / 2, 82);
        ctx.globalAlpha = 1;
    }
    if (!G) {
        introScene();
    }
    requestAnimationFrame(loop);
}
ov.classList.add('intro');
tb.style.display = 'none';
hud.style.visibility = 'hidden';
buildMap();
requestAnimationFrame(loop);
