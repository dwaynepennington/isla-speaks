(function () {
  'use strict';

  var GROUPS = [
    { id: 'signs', name: 'Signs', items: [
      ['more', 'More', 'More!'],
      ['alldone', 'All done', 'All done!']
    ]},
    { id: 'needs', name: 'I need', items: [
      ['hungry', 'Hungry', "I'm hungry!"],
      ['thirsty', 'Thirsty', "I'm thirsty!"],
      ['potty', 'I need to potty', 'I need to go potty!'],
      ['sick', 'I feel sick', 'I feel sick.']
    ]},
    { id: 'feel', name: 'I feel', items: [
      ['happy', "I'm happy", "I'm happy!"],
      ['sad', "I'm sad", "I'm sad."]
    ]},
    { id: 'rest', name: 'Rest', items: [
      ['sleepy', 'Sleepy', "I'm sleepy."],
      ['nap', 'Nap time', 'Nap time.']
    ]},
    { id: 'fun', name: 'Let’s do', items: [
      ['play', 'Play time', 'Play time!'],
      ['bath', 'Bath time', 'Bath time!'],
      ['bluey', 'Watch Bluey', 'I want to watch Bluey!'],
      ['mickey', 'Watch Mickey', 'I want to watch Mickey!']
    ]},
    { id: 'people', name: 'I want', items: [
      ['dada', 'DaDa', 'I want Dada!'],
      ['mama', 'MaMa', 'I want Mama!'],
      ['mamaw', 'Mamaw', 'I want Mamaw!'],
      ['papaw', 'Papaw', 'I want Papaw!'],
      ['luca', 'Luca', 'I want Luca!'],
      ['bryson', 'Bryson', 'I want Bryson!']
    ]}
  ];
  // Spelled for device voices so names sound right
  var SAY_FOR_DEVICE = { 'Mamaw': 'Mam-aw', 'Papaw': 'Pap-aw', 'Luca': 'Looka', 'Dada': 'Da-da' };

  var KEY = 'islaSpeaks.v1';
  var store = null;
  try { store = window.localStorage; store.setItem('__t', '1'); store.removeItem('__t'); } catch (e) { store = null; }

  var defaults = { size: 'medium', rate: 1, chime: false, words: true, voice: 'clip', hidden: {}, log: [], logDay: '' };
  var S = Object.assign({}, defaults);
  try { if (store) Object.assign(S, JSON.parse(store.getItem(KEY) || '{}')); } catch (e) {}
  function save() { try { if (store) store.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  if (S.logDay !== today()) { S.log = []; S.logDay = today(); save(); }

  var $ = function (id) { return document.getElementById(id); };
  var board = $('board');
  var ITEMS = {};
  GROUPS.forEach(function (g) { g.items.forEach(function (it) { ITEMS[it[0]] = { key: it[0], label: it[1], say: it[2], group: g.id }; }); });

  /* ---------- Audio ---------- */
  var CLIPS = window.ISLA_SPEAKS_CLIPS || {};
  var players = {};
  Object.keys(CLIPS).forEach(function (k) {
    var a = new Audio(); a.preload = 'auto'; a.src = CLIPS[k]; players[k] = a;
  });
  var current = null;
  var actx = null;

  function chime(done) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      [880, 1318.5].forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
        o.connect(g); g.connect(actx.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.4);
      });
      setTimeout(done, 380);
    } catch (e) { done(); }
  }

  function stopAll() {
    if (current) { try { current.pause(); current.currentTime = 0; } catch (e) {} current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function deviceSpeak(text) {
    if (!window.speechSynthesis) return;
    var t = text;
    Object.keys(SAY_FOR_DEVICE).forEach(function (n) { t = t.replace(new RegExp('\\b' + n + '\\b', 'g'), SAY_FOR_DEVICE[n]); });
    var u = new SpeechSynthesisUtterance(t);
    u.rate = 0.85 * S.rate; u.pitch = 1.25;
    var vs = window.speechSynthesis.getVoices();
    var v = vs.filter(function (x) { return x.voiceURI === S.voice; })[0];
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  function speak(item) {
    stopAll();
    var go = function () {
      var p = players[item.key];
      if (S.voice === 'clip' && p) {
        current = p;
        try { p.playbackRate = S.rate; p.defaultPlaybackRate = S.rate; } catch (e) {}
        p.currentTime = 0;
        var pr = p.play();
        if (pr && pr.catch) pr.catch(function () { deviceSpeak(item.say); });
      } else {
        deviceSpeak(item.say);
      }
    };
    if (S.chime) chime(go); else go();
  }

  /* ---------- Board ---------- */
  function render() {
    board.className = 'board size-' + S.size + (S.words ? '' : ' no-words');
    board.innerHTML = '';
    var grid = document.createElement('div'); grid.className = 'grid';
    GROUPS.forEach(function (g) {
      g.items.forEach(function (it) {
        if (S.hidden[it[0]]) return;
        var b = document.createElement('button');
        b.className = 'tile c-' + g.id;
        b.dataset.key = it[0];
        b.setAttribute('aria-label', it[2]);
        b.innerHTML = '<img src="img/' + it[0] + '.webp" alt="" width="480" height="480"><span class="lbl">' + it[1] + '</span>';
        grid.appendChild(b);
      });
    });
    board.appendChild(grid);
  }

  var lastTap = { key: '', t: 0 };
  function onTap(key, el) {
    var now = Date.now();
    if (key === lastTap.key && now - lastTap.t < 700) return; // ignore accidental double taps
    lastTap = { key: key, t: now };
    var item = ITEMS[key];
    speak(item);
    if (el) { el.classList.remove('speaking'); void el.offsetWidth; el.classList.add('speaking'); }
    showSaid(item);
    if (S.logDay !== today()) { S.log = []; S.logDay = today(); }
    S.log.unshift({ k: key, t: now }); S.log = S.log.slice(0, 200); save();
  }

  board.addEventListener('click', function (e) {
    var b = e.target.closest('.tile'); if (!b) return;
    onTap(b.dataset.key, b);
  });

  var saidBtn = $('said'), saidImg = $('saidImg'), saidText = $('saidText'), saidAgain = $('saidAgain');
  var lastItem = null;
  function showSaid(item) {
    lastItem = item;
    saidBtn.classList.remove('idle');
    saidImg.src = 'img/' + item.key + '.webp'; saidImg.hidden = false; saidAgain.hidden = false;
    saidText.textContent = item.say;
    saidBtn.classList.remove('pulse'); void saidBtn.offsetWidth; saidBtn.classList.add('pulse');
  }
  saidBtn.classList.add('idle');
  saidBtn.addEventListener('click', function () {
    if (!lastItem) return;
    lastTap = { key: '', t: 0 };
    speak(lastItem);
    var el = board.querySelector('.tile[data-key="' + lastItem.key + '"]');
    if (el) { el.classList.remove('speaking'); void el.offsetWidth; el.classList.add('speaking'); }
  });

  /* ---------- Grown-ups (press and hold) ---------- */
  var gBtn = $('grownBtn'), holdT = null;
  function holdStart(e) { e.preventDefault(); gBtn.classList.add('holding'); holdT = setTimeout(function () { holdEnd(); openGrown(); }, 1400); }
  function holdEnd() { gBtn.classList.remove('holding'); clearTimeout(holdT); }
  gBtn.addEventListener('pointerdown', holdStart);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { gBtn.addEventListener(ev, holdEnd); });
  gBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function fmtTime(t) { return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

  function fillGrown() {
    var log = $('log'); log.innerHTML = '';
    var todays = S.log.filter(function (x) { return ITEMS[x.k]; });
    $('logEmpty').hidden = todays.length > 0;
    todays.forEach(function (x) {
      var li = document.createElement('li');
      li.innerHTML = '<img src="img/' + x.k + '.webp" alt=""><span>' + ITEMS[x.k].say + '</span><time>' + fmtTime(x.t) + '</time>';
      log.appendChild(li);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#sizeSeg button'), function (b) { b.setAttribute('aria-checked', b.dataset.size === S.size ? 'true' : 'false'); });
    $('rate').value = S.rate; $('chime').checked = S.chime; $('words').checked = S.words;
    fillVoices();
    var pl = $('pickList'); pl.innerHTML = '';
    GROUPS.forEach(function (g) { g.items.forEach(function (it) {
      var l = document.createElement('label'); l.className = 'pick';
      l.innerHTML = '<img src="img/' + it[0] + '.webp" alt=""><span>' + it[1] + '</span><input type="checkbox" data-key="' + it[0] + '"' + (S.hidden[it[0]] ? '' : ' checked') + '>';
      pl.appendChild(l);
    }); });
  }
  function fillVoices() {
    var sel = $('voiceSel');
    while (sel.options.length > 1) sel.remove(1);
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); }).forEach(function (v) {
        var o = document.createElement('option'); o.value = v.voiceURI; o.textContent = 'Device: ' + v.name; sel.appendChild(o);
      });
    }
    sel.value = S.voice; if (sel.value !== S.voice) { sel.value = 'clip'; }
  }
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = function () { if (!$('grown').hidden) fillVoices(); };

  function openGrown() { fillGrown(); $('grown').hidden = false; $('grown').scrollTop = 0; }
  function closeGrown() { $('grown').hidden = true; render(); }
  $('grownClose').addEventListener('click', closeGrown);
  $('grown').addEventListener('click', function (e) { if (e.target === $('grown')) closeGrown(); });

  $('sizeSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    S.size = b.dataset.size; save(); fillGrown();
  });
  $('rate').addEventListener('input', function () { S.rate = parseFloat(this.value); save(); });
  $('rate').addEventListener('change', function () { speak(ITEMS.happy); });
  $('chime').addEventListener('change', function () { S.chime = this.checked; save(); });
  $('words').addEventListener('change', function () { S.words = this.checked; save(); });
  $('voiceSel').addEventListener('change', function () { S.voice = this.value; save(); speak(ITEMS.happy); });
  $('pickList').addEventListener('change', function (e) {
    var k = e.target.dataset.key; if (!k) return;
    if (e.target.checked) delete S.hidden[k]; else S.hidden[k] = true;
    save();
  });
  $('clearLog').addEventListener('click', function () { S.log = []; save(); fillGrown(); });

  render();
})();
