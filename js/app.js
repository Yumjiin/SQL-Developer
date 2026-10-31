/* SQLD 실전 노트 — 정적 사이트 하나로 동작하는 학습 앱
 * 데이터: data/questions.json, data/labs.json, data/schema.sql, data/guide.md
 * 저장: 브라우저 localStorage (기기·브라우저별)
 */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const D = { questions: [], labs: [], schema: '', guide: '', SQL: null };
  const CHOICE_NO = ['①', '②', '③', '④', '⑤'];
  const MOCK_PLAN = { 1: 10, 2: 40 };
  const MOCK_MINUTES = 90;

  /* ---------------- 저장소 ---------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('sqld.' + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('sqld.' + key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
    },
  };

  const quizLog = () => store.get('quiz', {});          // { qid: { c: 선택, ok: bool } }
  const wrongSet = () => store.get('wrong', { quiz: [], lab: [] });
  const labLog = () => store.get('labs', {});           // { labId: { sql, ok } }

  function markQuiz(id, chosen, ok) {
    const log = quizLog();
    log[id] = { c: chosen, ok };
    store.set('quiz', log);
    setWrong('quiz', id, !ok);
  }
  function setWrong(kind, id, isWrong) {
    const w = wrongSet();
    const list = new Set(w[kind] || []);
    if (isWrong) list.add(id); else list.delete(id);
    w[kind] = [...list];
    store.set('wrong', w);
    updateWrongBadge();
  }
  function updateWrongBadge() {
    const w = wrongSet();
    const n = (w.quiz || []).length + (w.lab || []).length;
    const b = document.getElementById('wrongCount');
    b.hidden = n === 0;
    b.textContent = n;
  }

  /* ---------------- 공통 유틸 ---------------- */
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtInline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const byId = (list, id) => list.find((x) => x.id === id);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const subjectTag = (s) => `<span class="tag s${s}">${s}과목</span>`;
  const h = (html) => { app.innerHTML = html; window.scrollTo(0, 0); };

  /* ---------------- SQL 엔진 ---------------- */
  function fixedArity(n, impl) {
    const params = Array.from({ length: n }, (_, i) => 'a' + i);
    // sql.js는 함수의 매개변수 개수로 SQL 함수 인자 수를 정하므로 인자 수별로 따로 등록
    return new Function('impl', `return function(${params.join(',')}){return impl(${params.join(',')});}`)(impl);
  }
  function registerOracleFunctions(db) {
    db.create_function('NVL', (a, b) => (a === null ? b : a));
    db.create_function('NVL2', (a, b, c) => (a === null ? c : b));
    const decode = (...args) => {
      const v = args[0];
      for (let i = 1; i + 1 < args.length; i += 2) {
        if (args[i] === v || (args[i] !== null && v !== null && String(args[i]) === String(v))) return args[i + 1];
      }
      return args.length % 2 === 0 ? args[args.length - 1] : null;
    };
    for (let n = 3; n <= 15; n++) db.create_function('DECODE', fixedArity(n, decode));
    db.create_function('MOD', (a, b) => (a === null || b === null ? null : (b === 0 ? a : a % b)));
    const trunc = (x, d) => {
      if (x === null) return null;
      const p = Math.pow(10, d || 0);
      return Math.trunc(x * p) / p;
    };
    db.create_function('TRUNC', fixedArity(1, (x) => trunc(x, 0)));
    db.create_function('TRUNC', fixedArity(2, trunc));
    const pad = (left) => (s, n, ch) => {
      if (s === null || n === null) return null;
      s = String(s); ch = ch == null ? ' ' : String(ch);
      if (s.length >= n) return s.slice(0, n);
      let fill = '';
      while (fill.length < n - s.length) fill += ch;
      fill = fill.slice(0, n - s.length);
      return left ? fill + s : s + fill;
    };
    db.create_function('LPAD', fixedArity(2, (s, n) => pad(true)(s, n, ' ')));
    db.create_function('LPAD', fixedArity(3, pad(true)));
    db.create_function('RPAD', fixedArity(2, (s, n) => pad(false)(s, n, ' ')));
    db.create_function('RPAD', fixedArity(3, pad(false)));
    db.create_function('INITCAP', (s) => (s === null ? null : String(s).toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, (m, a, b) => a + b.toUpperCase())));
  }
  function newDB() {
    const db = new D.SQL.Database();
    registerOracleFunctions(db);
    db.exec(D.schema);
    return db;
  }
  // db.exec()는 결과가 0행인 SELECT를 건너뛰므로, 문장을 하나씩 돌려서 빈 결과도 컬럼과 함께 보존
  function run(db, sql) {
    const sets = [];
    let changed = 0;
    for (const st of db.iterateStatements(sql)) {
      try {
        const columns = st.getColumnNames();
        const values = [];
        while (st.step()) values.push(st.get());
        if (columns.length) sets.push({ columns, values });
        else changed += db.getRowsModified();
      } finally { st.free(); }
    }
    return { sets, last: sets.length ? sets[sets.length - 1] : null, changed };
  }

  function normVal(v) {
    if (v === null || v === undefined) return '∅NULL';
    if (typeof v === 'number') return 'n:' + (Math.round(v * 1e6) / 1e6);
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return 'n:' + (Math.round(Number(v) * 1e6) / 1e6);
    return 's:' + String(v);
  }
  function compareResults(mine, expected, ordered) {
    if (!mine) return { ok: false, msg: '조회 결과가 없습니다. SELECT 문으로 결과를 돌려주세요.' };
    if (!expected) return { ok: false, msg: '정답 결과를 만들지 못했습니다.' };
    if (mine.columns.length !== expected.columns.length) {
      return { ok: false, msg: `컬럼 수가 다릅니다. (기대 ${expected.columns.length}개, 내 결과 ${mine.columns.length}개)` };
    }
    if (mine.values.length !== expected.values.length) {
      return { ok: false, msg: `행 수가 다릅니다. (기대 ${expected.values.length}행, 내 결과 ${mine.values.length}행)` };
    }
    const a = mine.values.map((r) => r.map(normVal).join('|'));
    const b = expected.values.map((r) => r.map(normVal).join('|'));
    if (ordered) {
      if (a.every((x, i) => x === b[i])) return { ok: true };
      const sa = a.slice().sort(), sb = b.slice().sort();
      if (sa.every((x, i) => x === sb[i])) return { ok: false, msg: '값은 모두 맞지만 정렬 순서가 다릅니다. ORDER BY를 확인하세요.' };
      return { ok: false, msg: '결과 값이 다릅니다. 아래에서 기대 결과와 비교해 보세요.' };
    }
    const sa = a.slice().sort(), sb = b.slice().sort();
    if (sa.every((x, i) => x === sb[i])) return { ok: true };
    return { ok: false, msg: '결과 값이 다릅니다. 아래에서 기대 결과와 비교해 보세요.' };
  }

  function tableHTML(res, cap) {
    if (!res) return '';
    const head = res.columns.map((c) => `<th>${esc(c)}</th>`).join('');
    const body = res.values.slice(0, 500).map((row) => '<tr>' + row.map((v) => {
      if (v === null) return '<td class="null">NULL</td>';
      if (typeof v === 'number') return `<td class="num">${esc(Number.isInteger(v) ? v : Math.round(v * 1e4) / 1e4)}</td>`;
      if (v instanceof Uint8Array) return '<td class="null">(BLOB)</td>';
      return `<td>${esc(v)}</td>`;
    }).join('') + '</tr>').join('');
    const more = res.values.length > 500 ? ` · 앞의 500행만 표시` : '';
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="tbl-cap">${cap ? esc(cap) + ' · ' : ''}${res.values.length}행${more}</p>`;
  }
  function errorHTML(e) {
    let msg = String(e && e.message ? e.message : e);
    let tip = '';
    if (/no such function: (\w+)/i.test(msg)) tip = '이 실습 엔진(SQLite)에 없는 함수입니다. 개념 탭의 Oracle/SQLite 차이를 참고하세요.';
    else if (/ROWNUM/i.test(msg)) tip = 'ROWNUM 대신 LIMIT N 이나 ROW_NUMBER() OVER (...) 를 써보세요.';
    else if (/CONNECT|PRIOR/i.test(msg)) tip = 'CONNECT BY 대신 WITH RECURSIVE 를 써보세요.';
    else if (/DUAL/i.test(msg)) tip = 'SQLite에는 DUAL이 없어요. FROM 절 없이 SELECT 1+1; 처럼 쓰면 됩니다.';
    return `<div class="result-msg no"><b>오류</b><pre>${esc(msg)}</pre>${tip ? `<div class="small">${esc(tip)}</div>` : ''}</div>`;
  }

  function schemaInfo() {
    const db = newDB();
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0].values.map((r) => r[0]);
    const info = tables.map((t) => ({
      name: t,
      cols: db.exec(`PRAGMA table_info(${t})`)[0].values.map((r) => ({ name: r[1], type: r[2], pk: r[5] })),
      count: db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0],
    }));
    db.close();
    return info;
  }
  function schemaHTML(open) {
    const info = schemaInfo();
    return `<details class="schema" ${open ? 'open' : ''}><summary>테이블 구조 보기 (${info.map((t) => t.name).join(', ')})</summary>
      <div class="schema-grid">${info.map((t) => `
        <div class="schema-tbl">
          <div class="nm">${esc(t.name)} <button class="btn small ghost" data-peek="${esc(t.name)}" type="button">데이터 ${t.count}행</button></div>
          <ul>${t.cols.map((c) => `<li><span>${esc(c.name)}</span> ${esc(c.type)}${c.pk ? ' · PK' : ''}</li>`).join('')}</ul>
        </div>`).join('')}
      </div>
      <p class="note">실습 엔진은 SQLite입니다. NVL·NVL2·DECODE·MOD·TRUNC·LPAD·RPAD·INITCAP은 Oracle처럼 쓸 수 있게 추가했고, ROWNUM·CONNECT BY·ROLLUP·PIVOT은 지원하지 않습니다.</p>
    </details>`;
  }

  function bindEditor(textarea, onRun, onChange) {
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return; }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const s = textarea.selectionStart, en = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, s) + '  ' + textarea.value.slice(en);
        textarea.selectionStart = textarea.selectionEnd = s + 2;
        onChange && onChange();
      }
    });
    if (onChange) textarea.addEventListener('input', onChange);
  }

  /* ---------------- 라우터 ---------------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, '') || 'guide';
    const [page, arg] = hash.split('/');
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === page));
    stopTimer();
    document.onkeydown = null;
    if (page === 'quiz') return renderQuiz();
    if (page === 'lab') return renderLab(arg);
    if (page === 'mock') return renderMock();
    if (page === 'wrong') return renderWrong();
    return renderGuide(arg);
  }

  /* ---------------- 개념 ---------------- */
  function slug(i) { return 'g' + i; }
  function renderGuide(target) {
    const html = window.marked.parse(D.guide);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const heads = [...tmp.querySelectorAll('h1, h2')];
    heads.forEach((el, i) => { el.id = slug(i); });
    let toc = '';
    heads.forEach((el) => {
      if (el.tagName === 'H1') toc += `<h4>${esc(el.textContent)}</h4>`;
      else toc += `<a href="#/guide/${el.id}" data-sec="${el.id}">${esc(el.textContent)}</a>`;
    });
    h(`<div class="page-head"><h1>개념 정리</h1><p>시험 범위 순서대로 정리했어요. 표로 된 부분이 자주 나오는 비교 포인트입니다.</p></div>
      <div class="guide">
        <nav class="toc card pad" aria-label="목차">${toc}</nav>
        <div>
          <details class="toc-mobile card pad"><summary>목차</summary><div class="toc" style="display:block;position:static;max-height:none">${toc}</div></details>
          <article class="prose card">${tmp.innerHTML}</article>
        </div>
      </div>`);
    const links = [...app.querySelectorAll('.toc a')];
    links.forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const el = document.getElementById(a.dataset.sec);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
      history.replaceState(null, '', '#/guide/' + a.dataset.sec);
      const d = app.querySelector('.toc-mobile'); if (d) d.open = false;
    }));
    if (target) {
      const el = document.getElementById(target);
      if (el) setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80 }), 0);
    }
    const secs = heads.filter((x) => x.tagName === 'H2').map((x) => document.getElementById(x.id));
    const onScroll = () => {
      let cur = secs[0] && secs[0].id;
      for (const s of secs) if (s.getBoundingClientRect().top < 120) cur = s.id;
      links.forEach((a) => a.classList.toggle('on', a.dataset.sec === cur));
    };
    window.onscroll = onScroll;
    onScroll();
  }

  /* ---------------- 객관식 문제 ---------------- */
  const quizState = { list: [], idx: 0, key: '', reveal: {} };
  function quizFilter() { return store.get('quizFilter', { subject: 'all', chapter: 'all', mode: 'all', shuffle: false }); }

  function buildQuizList(f) {
    const log = quizLog();
    const wrong = new Set(wrongSet().quiz);
    let list = D.questions.filter((q) =>
      (f.subject === 'all' || String(q.subject) === f.subject) &&
      (f.chapter === 'all' || q.chapter === f.chapter) &&
      (f.mode === 'all' || (f.mode === 'new' && !log[q.id]) || (f.mode === 'wrong' && wrong.has(q.id))));
    if (f.shuffle) list = shuffle(list);
    return list;
  }

  function renderQuiz() {
    window.onscroll = null;
    const f = quizFilter();
    const key = JSON.stringify(f);
    if (quizState.key !== key) {
      quizState.key = key; quizState.list = buildQuizList(f); quizState.idx = 0; quizState.reveal = {};
    }
    const log = quizLog();
    const wrong = new Set(wrongSet().quiz);
    const list = quizState.list;
    const inSubject = D.questions.filter((q) => f.subject === 'all' || String(q.subject) === f.subject);
    const inScope = inSubject.filter((q) => f.chapter === 'all' || q.chapter === f.chapter);
    const chapters = [...new Set(inSubject.map((q) => q.chapter))];
    const cnt = (s) => D.questions.filter((q) => s === 'all' || q.subject === s).length;
    const done = D.questions.filter((q) => log[q.id]);
    const right = done.filter((q) => log[q.id].ok);
    const pill = (attr, val, label, n, on) => `<button class="pill ${on ? 'on' : ''}" ${attr}="${esc(val)}">${esc(label)}<span class="n">${n}</span></button>`;

    let body;
    if (!list.length) {
      body = `<div class="card empty">조건에 맞는 문제가 없어요. ${f.mode === 'wrong' ? '틀린 문제가 없네요!' : '다른 단원이나 범위를 골라 보세요.'}</div>`;
    } else {
      const q = list[quizState.idx];
      const listDone = list.filter((x) => log[x.id]);
      const listRight = listDone.filter((x) => log[x.id].ok);
      const answeredNow = !!quizState.reveal[q.id];
      const last = quizState.idx === list.length - 1;
      const mapOpen = store.get('quizMapOpen', false);
      body = `<div class="card quiz-card">
        <div class="quiz-top">
          <span>문제 <b>${quizState.idx + 1}</b> / ${list.length}</span>
          <span class="quiz-score">맞힌 문제 <b>${listRight.length}</b> / 푼 문제 ${listDone.length}</span>
        </div>
        <div class="progress"><span style="width:${(quizState.idx + 1) / list.length * 100}%"></span></div>
        <div class="quiz-body">${questionCardHTML(q, null, null)}
          <div class="btn-row q-nav">
            <button class="btn" id="prevQ" ${quizState.idx === 0 ? 'disabled' : ''}>← 이전</button>
            <span class="spacer"></span>
            ${answeredNow ? '' : `<button class="btn ghost dashed" id="skipQ" ${last ? 'disabled' : ''}>건너뛰기</button>`}
            <button class="btn primary" id="nextQ" ${!answeredNow || last ? 'disabled' : ''}>다음 문제 →</button>
          </div>
          <p class="kbd-hint">키보드 <kbd>1</kbd>~<kbd>4</kbd> 보기 선택 · <kbd>←</kbd> <kbd>→</kbd> 이동</p>
        </div>
        <details class="q-map" ${mapOpen ? 'open' : ''}>
          <summary><span>문제 목록</span>
            <span class="legend"><i class="dot ok"></i>정답 <i class="dot no"></i>오답 <i class="dot"></i>안 푼 문제</span></summary>
          <div class="dots">${list.map((x, i) => {
        const st = log[x.id] ? (log[x.id].ok ? 'ok' : 'no') : '';
        return `<button data-jump="${i}" class="dot-btn ${st} ${i === quizState.idx ? 'cur' : ''}" title="${i + 1}번 · ${esc(x.chapter)}" aria-label="${i + 1}번 문제">${i + 1}</button>`;
      }).join('')}</div>
        </details>
      </div>`;
    }

    h(`<div class="page-head"><h1>객관식 문제</h1><p>보기를 고르면 바로 정답과 해설이 나와요. 틀린 문제는 오답노트에 자동으로 모입니다. · 전체 정답률 <b>${done.length ? Math.round(right.length / done.length * 100) : 0}%</b> (${done.length}/${D.questions.length} 풀이)</p></div>
      <div class="pillbar">
        ${pill('data-subject', 'all', '전체', cnt('all'), f.subject === 'all')}
        ${pill('data-subject', '1', '1과목 · 데이터 모델링', cnt(1), f.subject === '1')}
        ${pill('data-subject', '2', '2과목 · SQL 기본 및 활용', cnt(2), f.subject === '2')}
      </div>
      <div class="pillbar sub">
        ${pill('data-chapter', 'all', '전체 단원', inSubject.length, f.chapter === 'all')}
        ${chapters.map((c) => pill('data-chapter', c, c, inSubject.filter((q) => q.chapter === c).length, f.chapter === c)).join('')}
      </div>
      <div class="toolbar">
        <div class="segmented" role="group" aria-label="풀이 범위">
          <button data-mode="all" class="${f.mode === 'all' ? 'on' : ''}">모든 문제 ${inScope.length}</button>
          <button data-mode="new" class="${f.mode === 'new' ? 'on' : ''}">안 푼 문제 ${inScope.filter((q) => !log[q.id]).length}</button>
          <button data-mode="wrong" class="${f.mode === 'wrong' ? 'on' : ''}">틀린 문제 ${inScope.filter((q) => wrong.has(q.id)).length}</button>
        </div>
        <label class="switch"><input type="checkbox" id="fShuffle" ${f.shuffle ? 'checked' : ''}><span class="track"></span>순서 섞기</label>
      </div>
      ${body}`);

    const onChip = app.querySelector('.pillbar.sub .pill.on');
    if (onChip) onChip.parentElement.scrollLeft = onChip.offsetLeft - onChip.parentElement.offsetLeft - 16;
    const setF = (patch) => { store.set('quizFilter', Object.assign({}, f, patch)); renderQuiz(); };
    app.querySelectorAll('[data-subject]').forEach((b) => b.onclick = () => setF({ subject: b.dataset.subject, chapter: 'all' }));
    app.querySelectorAll('[data-chapter]').forEach((b) => b.onclick = () => setF({ chapter: b.dataset.chapter }));
    app.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => setF({ mode: b.dataset.mode }));
    document.getElementById('fShuffle').onchange = (e) => setF({ shuffle: e.target.checked });
    if (!list.length) return;

    const go = (i) => { if (i < 0 || i >= list.length) return; quizState.idx = i; renderQuiz(); };
    document.getElementById('prevQ').onclick = () => go(quizState.idx - 1);
    document.getElementById('nextQ').onclick = () => go(quizState.idx + 1);
    const skip = document.getElementById('skipQ');
    if (skip) skip.onclick = () => go(quizState.idx + 1);
    app.querySelectorAll('[data-jump]').forEach((b) => b.onclick = () => go(+b.dataset.jump));
    const map = app.querySelector('.q-map');
    map.addEventListener('toggle', () => store.set('quizMapOpen', map.open));
    const q = list[quizState.idx];
    bindQuestionCard(app, q, () => renderQuizKeepScroll());
    document.onkeydown = (e) => {
      if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key) && !quizState.reveal[q.id]) {
        const b = app.querySelector(`.choices[data-q="${q.id}"] [data-pick="${e.key}"]`);
        if (b) b.click();
      } else if (e.key === 'ArrowRight') go(quizState.idx + 1);
      else if (e.key === 'ArrowLeft') go(quizState.idx - 1);
    };
  }
  // 보기를 고른 직후에는 스크롤을 유지해서 해설이 바로 보이게
  function renderQuizKeepScroll() {
    const y = window.scrollY;
    renderQuiz();
    window.scrollTo(0, y);
  }

  // 한 문제 카드 (문제 탭, 오답노트 공용)
  function questionCardHTML(q, n, total, opts = {}) {
    const shown = opts.forceFresh ? null : quizState.reveal[q.id];
    const chosen = shown ? shown.c : null;
    const choices = q.choices.map((c, i) => {
      const no = i + 1;
      let cls = '';
      if (chosen != null) {
        if (no === q.answer) cls = 'right';
        else if (no === chosen) cls = 'wrong';
      }
      return `<button class="choice ${cls}" data-pick="${no}" ${chosen != null ? 'disabled' : ''}><span class="no">${no}</span><span>${fmtInline(c)}</span></button>`;
    }).join('');
    const exp = chosen != null ? `<div class="explain ${chosen === q.answer ? 'ok' : 'no'}">
        <div class="verdict">${chosen === q.answer ? '정답이에요' : `오답 · 정답은 ${CHOICE_NO[q.answer - 1]}`}</div>
        <p>${fmtInline(q.explanation)}</p></div>` : '';
    return `<div class="q-head">${n ? `<span class="q-num">${n}${total ? ' / ' + total : ''}</span>` : ''}${subjectTag(q.subject)}<span class="tag">${esc(q.chapter)}</span></div>
      <p class="q-text">${fmtInline(q.question)}</p>
      ${q.code ? `<pre class="q-code">${esc(q.code)}</pre>` : ''}
      <div class="choices" data-q="${q.id}">${choices}</div>${exp}`;
  }
  function bindQuestionCard(root, q, rerender) {
    root.querySelectorAll(`.choices[data-q="${q.id}"] [data-pick]`).forEach((b) => b.onclick = () => {
      const c = +b.dataset.pick;
      quizState.reveal[q.id] = { c };
      markQuiz(q.id, c, c === q.answer);
      rerender();
    });
  }

  /* ---------------- SQL 실습 ---------------- */
  let freeDB = null;
  function renderLab(arg) {
    window.onscroll = null;
    const log = labLog();
    const wrong = new Set(wrongSet().lab);
    const id = arg || 'free';
    const lab = byId(D.labs, id);
    const status = (l) => log[l.id] && log[l.id].ok ? '<span class="st ok">✓</span>' : (wrong.has(l.id) ? '<span class="st no">✕</span>' : '<span class="st"></span>');
    const solved = D.labs.filter((l) => log[l.id] && log[l.id].ok).length;
    const listHTML = `<a href="#/lab/free" class="${id === 'free' ? 'on' : ''}"><span class="id">▶</span><span class="ttl">자유 실습 콘솔</span></a><hr>` +
      D.labs.map((l) => `<a href="#/lab/${l.id}" class="${l.id === id ? 'on' : ''}"><span class="id">${l.id}</span><span class="ttl">${esc(l.title)}</span>${status(l)}</a>`).join('');
    const pick = `<select class="select lab-pick" id="labPick"><option value="free">자유 실습 콘솔</option>${D.labs.map((l) => `<option value="${l.id}">${l.id} · ${esc(l.title)}${log[l.id] && log[l.id].ok ? ' ✓' : ''}</option>`).join('')}</select>`;

    const main = lab ? labDetailHTML(lab, log) : freeConsoleHTML();
    h(`<div class="page-head"><h1>SQL 실습</h1><p>브라우저 안에서 진짜 SQL이 실행돼요. 문제를 풀고 채점하거나, 자유 콘솔에서 마음대로 쿼리를 돌려보세요. 해결 ${solved} / ${D.labs.length}</p></div>
      <div class="lab"><nav class="lab-list card" aria-label="실습 목록">${listHTML}</nav><div>${pick}${main}</div></div>`);
    const lp = document.getElementById('labPick');
    lp.value = id;
    lp.onchange = () => { location.hash = '#/lab/' + lp.value; };
    if (lab) bindLab(lab); else bindFree();
    bindPeek();
  }

  function labDetailHTML(lab, log) {
    const saved = log[lab.id] && log[lab.id].sql;
    return `<div class="card pad">
      <div class="q-head"><span class="q-num">${lab.id}</span><span class="tag">${esc(lab.chapter)}</span><span class="level" title="난이도">${'●'.repeat(lab.level)}${'○'.repeat(3 - lab.level)}</span></div>
      <h2 class="lab-title">${esc(lab.title)}</h2>
      <p class="lab-prompt">${fmtInline(lab.prompt)}</p>
      <div class="btn-row">
        <button class="btn small" id="hintBtn">힌트</button>
        <button class="btn small" id="expBtn">기대 결과 보기</button>
        <button class="btn small ghost" id="ansBtn">정답 SQL 보기</button>
      </div>
      <div id="extra"></div>
      <div class="editor-wrap">
        <div class="editor-bar"><span>SQL</span><span class="spacer"></span><span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 실행</span></div>
        <textarea class="editor" id="sql" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="여기에 SQL을 작성하세요">${esc(saved || '')}</textarea>
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn" id="runBtn">실행</button>
        <button class="btn primary" id="gradeBtn">채점하기</button>
        <span class="spacer"></span>
        <button class="btn ghost small" id="clearBtn">지우기</button>
      </div>
      <div class="result" id="out"></div>
      ${schemaHTML(false)}
    </div>`;
  }

  function expectedFor(lab) {
    const db = newDB();
    try {
      const r = run(db, lab.answer);
      return lab.check ? run(db, lab.check).last : r.last;
    } finally { db.close(); }
  }

  function bindLab(lab) {
    const ta = document.getElementById('sql');
    const out = document.getElementById('out');
    const extra = document.getElementById('extra');
    const save = () => { const log = labLog(); log[lab.id] = Object.assign({}, log[lab.id], { sql: ta.value }); store.set('labs', log); };
    const exec = () => {
      if (!ta.value.trim()) { out.innerHTML = '<div class="result-msg info">SQL을 먼저 작성하세요.</div>'; return; }
      const db = newDB();
      try {
        const r = run(db, ta.value);
        let html = '';
        if (lab.check) {
          html += `<div class="result-msg info">실행 완료 · 변경된 행 ${r.changed}개. 아래는 채점용 확인 쿼리 결과예요.</div>`;
          html += tableHTML(run(db, lab.check).last, lab.check.replace(/;$/, ''));
        } else if (r.last) html += tableHTML(r.last, '내 결과');
        else html += `<div class="result-msg info">실행 완료 · 변경된 행 ${r.changed}개</div>`;
        out.innerHTML = html;
      } catch (e) { out.innerHTML = errorHTML(e); } finally { db.close(); }
    };
    const grade = () => {
      if (!ta.value.trim()) { out.innerHTML = '<div class="result-msg info">SQL을 먼저 작성하세요.</div>'; return; }
      save();
      const expected = expectedFor(lab);
      const db = newDB();
      let mine;
      try {
        const r = run(db, ta.value);
        mine = lab.check ? run(db, lab.check).last : r.last;
      } catch (e) { out.innerHTML = errorHTML(e); setLabResult(lab.id, false); db.close(); return; }
      db.close();
      const cmp = compareResults(mine, expected, lab.orderMatters);
      setLabResult(lab.id, cmp.ok);
      if (cmp.ok) {
        out.innerHTML = `<div class="result-msg ok">정답이에요! ${lab.orderMatters ? '' : '(행 순서는 채점하지 않아요)'}</div>${tableHTML(mine, '내 결과')}`;
      } else {
        out.innerHTML = `<div class="result-msg no">${esc(cmp.msg)}</div>
          <div class="compare"><div><h5>내 결과</h5>${mine ? tableHTML(mine) : '<p class="muted small">결과 없음</p>'}</div><div><h5>기대 결과</h5>${tableHTML(expected)}</div></div>
          <p class="note">컬럼 이름(별칭)은 채점하지 않고, 컬럼 순서와 값${lab.orderMatters ? ', 행 순서' : ''}를 비교합니다.</p>`;
      }
      refreshLabList();
    };
    bindEditor(ta, exec, save);
    document.getElementById('runBtn').onclick = exec;
    document.getElementById('gradeBtn').onclick = grade;
    document.getElementById('clearBtn').onclick = () => { ta.value = ''; save(); out.innerHTML = ''; ta.focus(); };
    document.getElementById('hintBtn').onclick = () => { extra.innerHTML = `<div class="hint">💡 ${fmtInline(lab.hint)}</div>`; };
    document.getElementById('expBtn').onclick = () => {
      try { extra.innerHTML = `<div style="margin-top:10px">${tableHTML(expectedFor(lab), '기대 결과')}</div>`; } catch (e) { extra.innerHTML = errorHTML(e); }
    };
    document.getElementById('ansBtn').onclick = () => {
      extra.innerHTML = `<div class="hint"><b>정답 예시</b> (다른 방법으로 풀어도 결과가 같으면 정답이에요)
        <pre class="q-code" style="margin:8px 0">${esc(lab.answer)}</pre>
        <button class="btn small" id="useAns">에디터에 넣기</button></div>`;
      document.getElementById('useAns').onclick = () => { ta.value = lab.answer; save(); ta.focus(); };
    };
  }
  function setLabResult(id, ok) {
    const log = labLog();
    log[id] = Object.assign({}, log[id]);
    if (ok) log[id].ok = true;   // 한 번 맞힌 문제는 해결로 유지
    store.set('labs', log);
    setWrong('lab', id, !ok);    // 오답노트는 마지막 채점 결과를 따름
  }
  function refreshLabList() {
    const log = labLog();
    const wrong = new Set(wrongSet().lab);
    app.querySelectorAll('.lab-list a').forEach((a) => {
      const m = a.getAttribute('href').match(/lab\/(L\d+)/);
      if (!m) return;
      const st = a.querySelector('.st');
      st.className = 'st' + (log[m[1]] && log[m[1]].ok ? ' ok' : (wrong.has(m[1]) ? ' no' : ''));
      st.textContent = log[m[1]] && log[m[1]].ok ? '✓' : (wrong.has(m[1]) ? '✕' : '');
    });
  }

  function freeConsoleHTML() {
    const saved = store.get('free', 'SELECT D.DNAME, COUNT(E.EMPNO) AS CNT, ROUND(AVG(E.SAL)) AS AVG_SAL\nFROM DEPT D\nLEFT JOIN EMP E ON D.DEPTNO = E.DEPTNO\nGROUP BY D.DNAME\nORDER BY CNT DESC;');
    return `<div class="card pad">
      <h2 class="lab-title">자유 실습 콘솔</h2>
      <p class="lab-prompt">여기서 실행한 INSERT·UPDATE·DELETE는 <b>DB 초기화</b>를 누르기 전까지 유지돼요. 여러 문장을 세미콜론으로 이어 쓰면 마지막 결과가 표시됩니다.</p>
      <div class="editor-wrap">
        <div class="editor-bar"><span>SQL</span><span class="spacer"></span><span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> 실행</span></div>
        <textarea class="editor" id="sql" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(saved)}</textarea>
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn primary" id="runBtn">실행</button>
        <button class="btn" id="resetBtn">DB 초기화</button>
        <span class="spacer"></span>
        <select class="select" id="samples" aria-label="예제 쿼리">
          <option value="">예제 불러오기…</option>
          <option value="SELECT DEPTNO, JOB, SUM(SAL) FROM EMP GROUP BY DEPTNO, JOB\nUNION ALL\nSELECT DEPTNO, NULL, SUM(SAL) FROM EMP GROUP BY DEPTNO\nUNION ALL\nSELECT NULL, NULL, SUM(SAL) FROM EMP\nORDER BY 1, 2;">ROLLUP 흉내 내기 (UNION ALL)</option>
          <option value="SELECT ENAME, SAL,\n  RANK() OVER (ORDER BY SAL DESC) AS RNK,\n  DENSE_RANK() OVER (ORDER BY SAL DESC) AS DRNK,\n  ROW_NUMBER() OVER (ORDER BY SAL DESC) AS RN\nFROM EMP;">RANK · DENSE_RANK · ROW_NUMBER 비교</option>
          <option value="SELECT ENAME, SAL,\n  LAG(SAL) OVER (ORDER BY HIREDATE) AS PREV_SAL,\n  LEAD(SAL) OVER (ORDER BY HIREDATE) AS NEXT_SAL\nFROM EMP ORDER BY HIREDATE;">LAG · LEAD</option>
          <option value="SELECT SAL, SUM(SAL) OVER (ORDER BY SAL) AS RANGE_SUM,\n  SUM(SAL) OVER (ORDER BY SAL ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ROWS_SUM\nFROM EMP ORDER BY SAL;">RANGE vs ROWS 누적합 차이</option>
          <option value="SELECT * FROM EMP WHERE DEPTNO NOT IN (10, NULL);">NOT IN 과 NULL 함정</option>
          <option value="SELECT COUNT(*), SUM(SAL) FROM EMP WHERE 1 = 2;">대상 행이 없을 때 집계</option>
          <option value="SELECT NVL(COMM, 0), NVL2(COMM, 'Y', 'N'), DECODE(DEPTNO, 10, 'A', 20, 'B', 'C'), NULLIF(SAL, 3000), COALESCE(COMM, MGR, 0) FROM EMP;">NULL 함수 모음</option>
        </select>
      </div>
      <div class="result" id="out"></div>
      ${schemaHTML(true)}
    </div>`;
  }
  function bindFree() {
    if (!freeDB) freeDB = newDB();
    const ta = document.getElementById('sql');
    const out = document.getElementById('out');
    const exec = () => {
      if (!ta.value.trim()) return;
      try {
        const r = run(freeDB, ta.value);
        out.innerHTML = r.last ? (r.sets.length > 1 ? `<p class="tbl-cap">결과 집합 ${r.sets.length}개 중 마지막</p>` : '') + tableHTML(r.last)
          : `<div class="result-msg info">실행 완료 · 변경된 행 ${r.changed}개</div>`;
      } catch (e) { out.innerHTML = errorHTML(e); }
    };
    bindEditor(ta, exec, () => store.set('free', ta.value));
    document.getElementById('runBtn').onclick = exec;
    document.getElementById('resetBtn').onclick = () => {
      freeDB.close(); freeDB = newDB();
      out.innerHTML = '<div class="result-msg info">샘플 데이터로 초기화했어요.</div>';
    };
    document.getElementById('samples').onchange = (e) => {
      if (!e.target.value) return;
      ta.value = e.target.value; store.set('free', ta.value); e.target.value = ''; exec();
    };
  }
  function bindPeek() {
    app.querySelectorAll('[data-peek]').forEach((b) => b.onclick = () => {
      const db = newDB();
      const res = run(db, `SELECT * FROM ${b.dataset.peek}`).last;
      db.close();
      const out = document.getElementById('out');
      out.innerHTML = tableHTML(res, b.dataset.peek + ' 원본 데이터');
      out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ---------------- 모의고사 ---------------- */
  let timerHandle = null;
  function stopTimer() { if (timerHandle) { clearInterval(timerHandle); timerHandle = null; } }

  function renderMock() {
    window.onscroll = null;
    const cur = store.get('mock', null);
    if (cur && !cur.done) return renderMockRun(cur);
    if (cur && cur.done && cur.showResult) return renderMockResult(cur);
    renderMockStart();
  }
  function renderMockStart() {
    const n1 = D.questions.filter((q) => q.subject === 1).length;
    const n2 = D.questions.filter((q) => q.subject === 2).length;
    const t1 = Math.min(MOCK_PLAN[1], n1), t2 = Math.min(MOCK_PLAN[2], n2);
    const hist = store.get('mockHistory', []);
    const last = store.get('mock', null);
    h(`<div class="page-head"><h1>모의고사</h1><p>실제 시험처럼 풀고 마지막에 한 번에 채점해요.</p></div>
      <div class="card pad stack">
        <div class="result-grid" style="margin-top:0">
          <div class="metric"><div class="k">1과목 · 데이터 모델링</div><div class="v">${t1}문항</div></div>
          <div class="metric"><div class="k">2과목 · SQL 기본 및 활용</div><div class="v">${t2}문항</div></div>
          <div class="metric"><div class="k">합격 기준</div><div class="v">60점 · 과목별 40%</div></div>
        </div>
        ${t1 < MOCK_PLAN[1] || t2 < MOCK_PLAN[2] ? `<p class="note">문제은행이 실제 시험 문항 수보다 적어서 있는 만큼만 출제돼요. data/questions.json에 문제를 추가하면 자동으로 늘어납니다.</p>` : ''}
        <label class="check"><input type="checkbox" id="useTimer" checked> ${MOCK_MINUTES}분 타이머 사용 (시간이 끝나면 자동 제출)</label>
        <div class="btn-row"><button class="btn primary" id="startMock">시작하기</button>
        ${last && last.done ? '<button class="btn" id="lastResult">지난 결과 다시 보기</button>' : ''}</div>
      </div>
      ${hist.length ? `<h2 class="section-title">응시 기록</h2><div class="card pad"><table class="history"><thead><tr><th>날짜</th><th>점수</th><th>1과목</th><th>2과목</th><th>결과</th></tr></thead><tbody>
        ${hist.slice().reverse().map((r) => `<tr><td>${esc(r.date)}</td><td><b>${r.score}</b></td><td>${r.s1}</td><td>${r.s2}</td><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? '합격' : '불합격'}</td></tr>`).join('')}
      </tbody></table></div>` : ''}`);
    document.getElementById('startMock').onclick = () => {
      const pick = (s, n) => shuffle(D.questions.filter((q) => q.subject === s)).slice(0, n).map((q) => q.id);
      const ids = [...pick(1, t1), ...pick(2, t2)];
      const timed = document.getElementById('useTimer').checked;
      store.set('mock', { ids, answers: {}, start: Date.now(), timed, done: false });
      renderMock();
    };
    const lr = document.getElementById('lastResult');
    if (lr) lr.onclick = () => { const m = store.get('mock'); m.showResult = true; store.set('mock', m); renderMockResult(m); };
  }

  function renderMockRun(m) {
    const qs = m.ids.map((id) => byId(D.questions, id)).filter(Boolean);
    h(`<div class="page-head"><h1>모의고사 진행 중</h1><p>정답은 제출한 뒤에 공개돼요. 중간에 다른 탭으로 가도 이어서 풀 수 있어요.</p></div>
      <div class="card mock-bar">
        ${m.timed ? '<span class="timer" id="timer">--:--</span>' : '<span class="muted small">타이머 없음</span>'}
        <span class="small"><b id="answered">0</b> / ${qs.length} 답안 작성</span>
        <span class="spacer"></span>
        <button class="btn ghost small" id="quitMock">그만두기</button>
        <button class="btn primary" id="submitMock">제출하기</button>
      </div>
      ${qs.map((q, i) => `<div class="card pad mock-q" id="mq${i}">
        <div class="q-head"><span class="q-num">${i + 1}</span>${subjectTag(q.subject)}</div>
        <p class="q-text">${fmtInline(q.question)}</p>
        ${q.code ? `<pre class="q-code">${esc(q.code)}</pre>` : ''}
        <div class="choices">${q.choices.map((c, k) => `<button class="choice ${m.answers[q.id] === k + 1 ? 'picked' : ''}" data-q="${q.id}" data-pick="${k + 1}"><span class="no">${k + 1}</span><span>${fmtInline(c)}</span></button>`).join('')}</div>
      </div>`).join('')}
      <div class="btn-row"><span class="spacer"></span><button class="btn primary" id="submitMock2">제출하기</button></div>`);
    const countAnswered = () => { document.getElementById('answered').textContent = Object.keys(m.answers).length; };
    countAnswered();
    app.querySelectorAll('.choice[data-q]').forEach((b) => b.onclick = () => {
      m.answers[b.dataset.q] = +b.dataset.pick;
      store.set('mock', m);
      b.parentElement.querySelectorAll('.choice').forEach((x) => x.classList.toggle('picked', x === b));
      countAnswered();
    });
    const submit = (force) => {
      const left = qs.length - Object.keys(m.answers).length;
      if (!force && left > 0 && !confirm(`아직 ${left}문항이 비어 있어요. 제출할까요?`)) return;
      finishMock(m, qs);
    };
    document.getElementById('submitMock').onclick = () => submit(false);
    document.getElementById('submitMock2').onclick = () => submit(false);
    document.getElementById('quitMock').onclick = () => {
      if (!confirm('지금까지 고른 답이 사라져요. 그만둘까요?')) return;
      store.set('mock', null); renderMock();
    };
    if (m.timed) {
      const tEl = document.getElementById('timer');
      const tick = () => {
        const left = m.start + MOCK_MINUTES * 60000 - Date.now();
        if (left <= 0) { stopTimer(); alert('시간이 끝나서 자동으로 제출합니다.'); finishMock(m, qs); return; }
        const mm = Math.floor(left / 60000), ss = Math.floor(left % 60000 / 1000);
        tEl.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        tEl.classList.toggle('low', left < 10 * 60000);
      };
      tick(); timerHandle = setInterval(tick, 1000);
    }
  }

  function finishMock(m, qs) {
    stopTimer();
    const per = 100 / qs.length;
    let score = 0;
    const by = { 1: { n: 0, ok: 0 }, 2: { n: 0, ok: 0 } };
    qs.forEach((q) => {
      const ok = m.answers[q.id] === q.answer;
      by[q.subject].n++; if (ok) { by[q.subject].ok++; score += per; }
      markQuiz(q.id, m.answers[q.id] || 0, ok);
    });
    score = Math.round(score);
    const rate = (s) => (by[s].n ? by[s].ok / by[s].n : 1);
    const pass = score >= 60 && rate(1) >= 0.4 && rate(2) >= 0.4;
    m.done = true; m.showResult = true;
    m.result = { score, by, pass, sec: Math.round((Date.now() - m.start) / 1000) };
    store.set('mock', m);
    const hist = store.get('mockHistory', []);
    const d = new Date();
    hist.push({
      date: `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      score, s1: `${by[1].ok}/${by[1].n}`, s2: `${by[2].ok}/${by[2].n}`, pass
    });
    store.set('mockHistory', hist.slice(-30));
    renderMockResult(m);
  }

  function renderMockResult(m) {
    const qs = m.ids.map((id) => byId(D.questions, id)).filter(Boolean);
    const r = m.result;
    const pct = (s) => (r.by[s].n ? Math.round(r.by[s].ok / r.by[s].n * 100) : 0);
    const reason = !r.pass ? (r.score < 60 ? '총점이 60점에 못 미쳤어요.' : '과목별 40% 기준(과락)에 걸렸어요.') : '';
    // 단원별 정답률
    const ch = {};
    qs.forEach((q) => { ch[q.chapter] = ch[q.chapter] || { n: 0, ok: 0 }; ch[q.chapter].n++; if (m.answers[q.id] === q.answer) ch[q.chapter].ok++; });
    const weak = Object.entries(ch).filter(([, v]) => v.ok < v.n).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 5);
    h(`<div class="page-head"><h1>모의고사 결과</h1><p>틀린 문제는 오답노트에 추가됐어요.</p></div>
      <div class="card pad">
        <div class="btn-row"><div><div class="score-big ${r.pass ? 'pass' : 'fail'}">${r.score}점</div>
          <div class="${r.pass ? 'pass' : 'fail'}" style="font-weight:700;margin-top:6px">${r.pass ? '합격' : '불합격'} <span class="muted small" style="font-weight:400">${esc(reason)}</span></div></div>
          <span class="spacer"></span><button class="btn primary" id="again">새 모의고사</button></div>
        <div class="result-grid">
          <div class="metric"><div class="k">1과목 정답</div><div class="v">${r.by[1].ok} / ${r.by[1].n} <span class="small ${pct(1) >= 40 ? 'pass' : 'fail'}">${pct(1)}%</span></div></div>
          <div class="metric"><div class="k">2과목 정답</div><div class="v">${r.by[2].ok} / ${r.by[2].n} <span class="small ${pct(2) >= 40 ? 'pass' : 'fail'}">${pct(2)}%</span></div></div>
          <div class="metric"><div class="k">걸린 시간</div><div class="v">${Math.floor(r.sec / 60)}분 ${r.sec % 60}초</div></div>
        </div>
        ${weak.length ? `<p class="note" style="margin-top:14px">약한 단원: ${weak.map(([k, v]) => `${esc(k)} (${v.ok}/${v.n})`).join(' · ')}</p>` : ''}
      </div>
      <h2 class="section-title">문항별 해설</h2>
      <div class="card pad review">${qs.map((q, i) => {
      const a = m.answers[q.id]; const ok = a === q.answer;
      return `<details ${ok ? '' : 'open'}><summary><span class="mark ${ok ? 'ok' : 'no'}">${ok ? 'O' : 'X'}</span><span><b>${i + 1}.</b> ${fmtInline(q.question)}</span></summary>
          <div style="padding:10px 0 4px 26px">
            ${q.code ? `<pre class="q-code">${esc(q.code)}</pre>` : ''}
            <div class="choices">${q.choices.map((c, k) => `<div class="choice ${k + 1 === q.answer ? 'right' : (k + 1 === a ? 'wrong' : '')}"><span class="no">${k + 1}</span><span>${fmtInline(c)}</span></div>`).join('')}</div>
            <div class="explain ${ok ? 'ok' : 'no'}"><div class="verdict">${a ? (ok ? '정답' : `내 답 ${CHOICE_NO[a - 1]} · 정답 ${CHOICE_NO[q.answer - 1]}`) : `미응답 · 정답 ${CHOICE_NO[q.answer - 1]}`}</div><p>${fmtInline(q.explanation)}</p></div>
          </div></details>`;
    }).join('')}</div>`);
    document.getElementById('again').onclick = () => { store.set('mock', Object.assign(m, { showResult: false })); renderMockStart(); };
  }

  /* ---------------- 오답노트 ---------------- */
  function renderWrong() {
    window.onscroll = null;
    const w = wrongSet();
    const qs = (w.quiz || []).map((id) => byId(D.questions, id)).filter(Boolean)
      .sort((a, b) => a.subject - b.subject || a.id.localeCompare(b.id));
    const labs = (w.lab || []).map((id) => byId(D.labs, id)).filter(Boolean);
    if (!qs.length && !labs.length) {
      h(`<div class="page-head"><h1>오답노트</h1></div><div class="card empty">틀린 문제가 없어요. 문제를 풀거나 모의고사를 보면 여기에 쌓입니다.</div>`);
      return;
    }
    qs.forEach((q) => { delete quizState.reveal[q.id]; });
    const groups = {};
    qs.forEach((q) => { const k = `${q.subject}과목 · ${q.chapter}`; (groups[k] = groups[k] || []).push(q); });
    h(`<div class="page-head"><h1>오답노트</h1><p>다시 풀어서 맞히면 목록에서 빠져요. 객관식 ${qs.length}문제 · SQL 실습 ${labs.length}문제</p></div>
      ${labs.length ? `<h2 class="section-title">SQL 실습</h2><div class="card pad"><div class="btn-row">${labs.map((l) => `<a class="btn" href="#/lab/${l.id}">${l.id} · ${esc(l.title)}</a>`).join('')}</div></div>` : ''}
      ${Object.entries(groups).map(([k, list]) => `<h2 class="section-title">${esc(k)}</h2>
        <div class="stack">${list.map((q) => `<div class="card pad" data-card="${q.id}">${questionCardHTML(q, null, null, { forceFresh: true })}</div>`).join('')}</div>`).join('')}`);
    qs.forEach((q) => {
      const card = app.querySelector(`[data-card="${q.id}"]`);
      bindQuestionCard(card, q, () => {
        card.innerHTML = questionCardHTML(q);
        bindQuestionCard(card, q, () => { });
      });
    });
  }

  /* ---------------- 테마 ---------------- */
  function initTheme() {
    const saved = store.get('theme', null);
    if (saved) document.documentElement.dataset.theme = saved;
    document.getElementById('themeBtn').onclick = () => {
      const isDark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      store.set('theme', next);
    };
  }

  /* ---------------- 시작 ---------------- */
  async function boot() {
    initTheme();
    try {
      const get = (p, type) => fetch(p, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return type === 'json' ? r.json() : r.text(); });
      const [questions, labs, schema, guide, SQL] = await Promise.all([
        get('data/questions.json', 'json'), get('data/labs.json', 'json'), get('data/schema.sql'), get('data/guide.md'),
        window.initSqlJs({ locateFile: (f) => 'vendor/' + f }),
      ]);
      Object.assign(D, { questions, labs, schema, guide, SQL });
    } catch (e) {
      const local = location.protocol === 'file:';
      app.innerHTML = `<div class="fatal card pad">데이터를 불러오지 못했어요.<br><span class="small muted">${local
        ? 'index.html을 파일로 직접 열면 브라우저 보안 때문에 동작하지 않아요. 폴더에서 <code>python3 -m http.server</code> 를 실행하고 http://localhost:8000 으로 열어 주세요.'
        : esc(e.message)}</span></div>`;
      return;
    }
    updateWrongBadge();
    window.addEventListener('hashchange', route);
    route();
  }
  boot();
})();
