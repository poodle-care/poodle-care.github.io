/* Poodle grooming planner. Runs in the browser, sends nothing anywhere.
   Routines are the ones written out in the site's guides (matting hotspots, coat change). */
(function (root) {
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_MS = 86400000;

  // Rows of the clip-by-clip table in the matting hotspots guide.
  var CLIPS = {
    short: { name: 'Short all-over pet clip', stays: 'Topknot, ears, tail pompon', first: 'Behind the ears, tail base', rhythm: 'Ears 2-3 times a week, the rest on bath day' },
    lamb: { name: 'Lamb clip (short body, fuller legs)', stays: 'Legs, ears, topknot, tail', first: 'Armpits, groin, back of rear legs, ears', rhythm: 'Legs and armpits every 2-3 days' },
    teddy: { name: 'Teddy or puppy clip (even, medium)', stays: 'Everything at one length', first: 'Ears, collar, armpits, chest, groin, tail base', rhythm: 'Two or three hotspots a day in rotation' },
    show: { name: 'Continental or long show coat', stays: 'Mane, chest, ears, topknot, bracelets, pompon', first: 'Ears, mane underside, armpits, collar line', rhythm: 'Daily hotspot checks plus a weekly full line-brush' }
  };
  // Weekly hotspot routine from the same guide (written for a teddy or lamb clip), Mon=0.
  var ROTATION = [
    'Armpits, elbows and chest, line-combed with spray',
    'Groin, inner thighs and the back of the rear legs, hock to hip',
    'Tail base, pompon, feet and the flank your dog sleeps on'
  ];
  // Body zones from the coat change brushing plan.
  var ZONES = ['Ears, behind the ears and neck', 'Armpits, elbows and chest', 'Shoulders and the top of the back', 'Sides and belly', 'Hind legs and rear', 'Front legs and feet', 'Tail and topknot'];
  var BATH = 'Bath day: full line-brush before the bath, then dry and comb the whole coat to the skin';
  var FULL = 'Full line-brush with a comb check on every layer';
  var GROOMER = 'Groomer visit: ask which zone they found tangled and move it up your list';

  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return new Date(t).getUTCDate() === +m[3] ? t : null; // rejects 2026-02-31
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function dow(t) { return (new Date(t).getUTCDay() + 6) % 7; } // Mon=0
  function label(t) { var d = new Date(t); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }

  function buildPlan(o) {
    var clip = CLIPS[o.clip] ? o.clip : 'teddy';
    var stage = o.stage || 'adult';
    var fullDay = Math.min(6, Math.max(0, o.fullDay | 0));
    var bathEvery = Math.min(8, Math.max(1, o.bathEvery | 0 || 1));
    var groomEvery = Math.min(12, Math.max(1, o.groomEvery | 0 || 6));
    var start = parse(o.start);
    if (start === null) throw new Error('start date must be YYYY-MM-DD');
    var last = parse(o.lastGroom);
    var groomDates = {}, nextGroom = null;
    if (last !== null) {
      var g = last + groomEvery * 7 * DAY_MS;
      while (g < start) g += groomEvery * 7 * DAY_MS;
      nextGroom = g;
      for (; g < start + 28 * DAY_MS; g += groomEvery * 7 * DAY_MS) groomDates[g] = true;
    }
    // In the coat change plan the six non-full days share the seven zones.
    var zoneDays = [];
    for (var z = 0; z < 7; z++) if (z !== fullDay) zoneDays.push(z);

    var days = [], fullSeen = 0;
    for (var i = 0; i < 28; i++) {
      var t = start + i * DAY_MS, d = dow(t), tasks = [];
      var isFull = d === fullDay;
      var isBath = isFull && fullSeen % bathEvery === 0;
      if (isFull) fullSeen++;
      if (stage === 'change') {
        tasks.push({ text: 'Hotspot sweep: ears, neck, shoulders, under the elbows' });
        if (!isFull) {
          var k = zoneDays.indexOf(d);
          tasks.push({ text: 'Line-brush: ' + ZONES[k] });
          if (k === 5) tasks.push({ text: 'Line-brush: ' + ZONES[6] });
        } else if (!isBath) tasks.push({ text: FULL, key: true });
      } else if (clip === 'short') {
        if (d === 0 || d === 2 || d === 5) tasks.push({ text: 'Line-comb behind the ears' });
      } else if (clip === 'show') {
        tasks.push({ text: 'Hotspot check: ears, mane underside, armpits, collar line' });
        if (isFull && !isBath) tasks.push({ text: FULL, key: true });
      } else {
        tasks.push({ text: 'About 3 minutes: comb behind both ears and through the collar line, collar or harness off' });
        if (d < 6) tasks.push({ text: ROTATION[d % 3] });
      }
      if (isBath) tasks.push({ text: BATH, key: true });
      if (groomDates[t]) tasks.push({ text: GROOMER, key: true });
      days.push({ date: iso(t), dow: d, day: DAYS[d], label: label(t), tasks: tasks, mark: isBath || !!groomDates[t] });
    }
    var notes = [];
    if (stage === 'change') notes.push('Coat change: mats can form almost overnight, so this plan is daily. When two or three weekly comb-throughs in a row find one knot or none, switch the coat stage to adult.');
    if (stage === 'puppy') notes.push('Puppy coat: use these months to teach calm grooming. Switch to the coat change plan as soon as the roots tighten.');
    if (stage !== 'change' && clip !== 'show') notes.push('Check rhythm for this clip: ' + CLIPS[clip].rhythm + '.');
    if (stage === 'change' && clip === 'short') notes.push('A short clip leaves less coat to tangle. Keep the daily sweep and drop a zone once its comb check stays clean.');
    notes.push(nextGroom === null ? 'Add the date of the last groomer visit to put the next one on the calendar.' : 'Next groomer visit: ' + DAYS[dow(nextGroom)] + ' ' + label(nextGroom) + ' ' + new Date(nextGroom).getUTCFullYear() + ' (every ' + groomEvery + ' weeks).');
    return { clip: CLIPS[clip], stage: stage, days: days, notes: notes, nextGroom: nextGroom === null ? null : iso(nextGroom) };
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render(out, plan, name) {
    while (out.firstChild) out.removeChild(out.firstChild);
    var facts = el('dl', 'gp-facts');
    [['Stays long', plan.clip.stays], ['Check first', plan.clip.first], ['Clip', plan.clip.name]].forEach(function (f) {
      var d = el('div'); d.appendChild(el('dt', '', f[0])); d.appendChild(el('dd', '', f[1])); facts.appendChild(d);
    });
    out.appendChild(facts);
    var notes = el('ul', 'gp-notes');
    plan.notes.forEach(function (n) { notes.appendChild(el('li', '', n)); });
    out.appendChild(notes);
    for (var w = 0; w < 4; w++) {
      var week = el('section', 'gp-week');
      var slice = plan.days.slice(w * 7, w * 7 + 7);
      week.appendChild(el('h3', '', 'Week ' + (w + 1) + ' · ' + slice[0].label + ' to ' + slice[6].label));
      var grid = el('div', 'gp-days');
      slice.forEach(function (day) {
        var cell = el('div', 'gp-day' + (day.mark ? ' mark' : ''));
        var h = el('h4', '', day.label); h.appendChild(el('span', '', day.day)); cell.appendChild(h);
        day.tasks.forEach(function (task) {
          var l = el('label', 'gp-task' + (task.key ? ' key' : ''));
          var c = el('input'); c.type = 'checkbox';
          l.appendChild(c); l.appendChild(el('span', '', task.text)); cell.appendChild(l);
        });
        grid.appendChild(cell);
      });
      week.appendChild(grid); out.appendChild(week);
    }
    document.getElementById('gp-title').textContent = name ? name + '’s grooming plan' : 'Your four-week grooming plan';
  }

  function init() {
    var form = document.getElementById('gp-form'), out = document.getElementById('gp-plan');
    if (!form || !out) return;
    var f = form.elements, today = iso(Date.now());
    f.start.value = today;
    function run() {
      var plan;
      try {
        plan = buildPlan({ clip: f.clip.value, stage: f.stage.value, fullDay: +f.fullDay.value, bathEvery: +f.bathEvery.value, groomEvery: +f.groomEvery.value, start: f.start.value || today, lastGroom: f.lastGroom.value });
      } catch (e) { return; } // half-typed date: keep the last good plan on screen
      render(out, plan, f.dog.value.trim().slice(0, 40));
    }
    form.addEventListener('input', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    document.getElementById('gp-print').addEventListener('click', function () { window.print(); });
    document.getElementById('gp-clear').addEventListener('click', function () {
      Array.prototype.forEach.call(out.querySelectorAll('input:checked'), function (c) { c.checked = false; });
    });
    run();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { buildPlan: buildPlan, CLIPS: CLIPS };
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(this);
