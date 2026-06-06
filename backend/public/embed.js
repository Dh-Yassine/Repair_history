(function () {
  const script = document.currentScript;
  const token = script?.dataset?.token || document.querySelector('.autohistory-badge')?.dataset?.token;
  const animated = (script?.dataset?.animated ?? 'true') !== 'false';
  if (!token) return;

  const apiBase = script?.src ? new URL(script.src).origin : window.location.origin;

  function track(eventType) {
    fetch(apiBase + '/api/partners/badge-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken: token, eventType, referrer: document.referrer || null }),
    }).catch(function () {});
  }

  track('embed_load');

  function mountBadge(data) {
    const targets = document.querySelectorAll('.autohistory-badge[data-token="' + token + '"]');
    const nodes = targets.length ? targets : [createDefaultMount()];

    nodes.forEach(function (el) {
      el.innerHTML = '';
      el.style.cssText = 'display:inline-block;font-family:Inter,system-ui,sans-serif;cursor:pointer;';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText =
        'display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(232,255,71,.45);border-radius:999px;padding:10px 14px;font-weight:800;font-size:13px;color:#0a0b0d;background:linear-gradient(135deg,#e8ff47,#b8cc35);box-shadow:0 10px 28px rgba(232,255,71,.25);cursor:pointer;font-family:Inter,system-ui,sans-serif;';
      if (animated) btn.style.animation = 'ah-pulse 2s ease-in-out infinite';
      btn.innerHTML =
        '<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#0a0b0d;color:#e8ff47;font-weight:900">A</span>' +
        '<span>AutoHistory</span>' +
        '<span style="font-family:monospace">' +
        data.trustScore +
        '% trusted</span>';
      btn.title = data.vehicle.year + ' ' + data.vehicle.make + ' ' + data.vehicle.model;
      btn.onclick = function () {
        track('click');
        openModal(data);
      };
      el.appendChild(btn);
    });

    if (animated && !document.getElementById('ah-badge-style')) {
      var style = document.createElement('style');
      style.id = 'ah-badge-style';
      style.textContent = '@keyframes ah-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}';
      document.head.appendChild(style);
    }
  }

  function createDefaultMount() {
    var el = document.createElement('div');
    el.className = 'autohistory-badge';
    el.dataset.token = token;
    script.parentNode.insertBefore(el, script);
    return el;
  }

  function openModal(data) {
    var appBase = script?.dataset?.appBase || 'http://localhost:5173';
    var overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(10,11,13,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
    var box = document.createElement('div');
    box.style.cssText =
      'background:#111318;border:1px solid #252932;border-radius:8px;max-width:480px;width:100%;max-height:80vh;overflow:auto;padding:20px;color:#f0f2f5;font-family:Instrument Sans,sans-serif;';
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">' +
      '<div><p style="margin:0 0 6px;color:#e8ff47;font:700 11px monospace;letter-spacing:.08em;text-transform:uppercase">Verified Vehicle History</p>' +
      '<h2 style="margin:0 0 8px;font-size:28px;letter-spacing:.04em">AUTOHISTORY TRUST BADGE</h2></div>' +
      '<div style="min-width:86px;text-align:center;border:1px solid #252932;border-radius:12px;padding:10px;background:#1a1d24"><strong style="font:700 26px monospace;color:#22d47a">' +
      data.trustScore +
      '%</strong><br><span style="font-size:11px;color:#6b7280">trusted</span></div></div>' +
      '<p style="color:#6b7280;margin:0 0 12px">' +
      data.vehicle.year +
      ' ' +
      data.vehicle.make +
      ' ' +
      data.vehicle.model +
      '</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0">' +
      '<div style="border:1px solid #252932;border-radius:10px;padding:10px;background:#1a1d24"><strong style="color:#22d47a">' +
      data.verifiedCount +
      '</strong><br><span style="font-size:12px;color:#6b7280">verified records</span></div>' +
      '<div style="border:1px solid #252932;border-radius:10px;padding:10px;background:#1a1d24"><strong style="color:#e8ff47">' +
      data.totalEvents +
      '</strong><br><span style="font-size:12px;color:#6b7280">total records</span></div>' +
      '</div>' +
      '<p style="font-size:13px;color:#6b7280">Shop-created or shop-certified records are counted in the trust score. Self-reported records may still include owner proof.</p>' +
      '<p style="font-size:14px"><a href="' +
      appBase +
      '/history/' +
      token +
      '" target="_blank" rel="noopener" style="color:#e8ff47">View buyer-ready history →</a></p>' +
      '<p style="font-size:12px;color:#6b7280">' +
      data.verifiedCount +
      '/' +
      data.totalEvents +
      ' records verified by AutoHistory partners.</p>' +
      '<button type="button" style="margin-top:12px;padding:8px 12px;border-radius:4px;border:1px solid #e8ff47;background:transparent;color:#e8ff47;cursor:pointer">Close</button>';
    box.querySelector('button').onclick = function () {
      overlay.remove();
    };
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  fetch(apiBase + '/api/public/history/' + token + '/badge')
    .then(function (r) {
      return r.json();
    })
    .then(mountBadge)
    .catch(function () {
      var el = document.querySelector('.autohistory-badge[data-token="' + token + '"]');
      if (el) el.textContent = 'AutoHistory badge unavailable';
    });
})();
