(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const EB = 5, FB = 10, BIAS = 15;

  /* ============ 変換の中身 ============ */
  function intToBin(n) { return n === 0 ? '0' : n.toString(2); }
  // 小数部を「×2をくり返す」方法で展開（途中経過つき）
  function fracExpand(f, max) {
    const rows = []; let x = f, bits = '';
    for (let i = 0; i < max && x > 0; i++) {
      const y = x * 2, b = y >= 1 ? 1 : 0;
      rows.push({ from: x, to: y, bit: b });
      bits += b; x = y - b;
    }
    return { bits: bits || '0', rows, exact: x === 0 };
  }
  // 実数 → {s,E,M,bits,value,state}
  function encode(x, eb, fb) {
    eb = eb || EB; fb = fb === undefined ? FB : fb;
    const bias = Math.pow(2, eb - 1) - 1;
    const s = (x < 0 || Object.is(x, -0)) ? 1 : 0;
    let a = Math.abs(x);
    if (a === 0) return { s: s, E: 0, M: 0, e: null, state: 'zero', value: 0, bias: bias, eb: eb, fb: fb };
    let e = Math.floor(Math.log2(a));
    if (a / Math.pow(2, e) >= 2) e++;
    if (a / Math.pow(2, e) < 1) e--;
    let frac = a / Math.pow(2, e) - 1;
    let M = Math.round(frac * Math.pow(2, fb));
    if (M === Math.pow(2, fb)) { M = 0; e++; }          // 繰り上がり
    let E = e + bias, state = 'ok';
    if (E >= Math.pow(2, eb) - 1) state = 'over';
    if (E <= 0) state = 'under';
    const value = state === 'ok' ? (s ? -1 : 1) * Math.pow(2, e) * (1 + M / Math.pow(2, fb)) : (state === 'under' ? 0 : Infinity * (s ? -1 : 1));
    return { s: s, E: E, M: M, e: e, state: state, value: value, bias: bias, eb: eb, fb: fb, frac: frac };
  }
  function bitsOf(r) {
    return String(r.s) + r.E.toString(2).padStart(r.eb, '0') + r.M.toString(2).padStart(r.fb, '0');
  }
  function decode(bits) {
    const s = +bits[0], E = parseInt(bits.slice(1, 1 + EB), 2), M = parseInt(bits.slice(1 + EB), 2);
    const sign = s ? -1 : 1;
    if (E === 0) return { s: s, E: E, M: M, e: null, value: sign * M / Math.pow(2, FB) * Math.pow(2, 1 - BIAS), kind: M === 0 ? 'zero' : 'sub' };
    if (E === 31) return { s: s, E: E, M: M, e: null, value: M === 0 ? sign * Infinity : NaN, kind: M === 0 ? 'inf' : 'nan' };
    const e = E - BIAS;
    return { s: s, E: E, M: M, e: e, value: sign * Math.pow(2, e) * (1 + M / Math.pow(2, FB)), kind: 'ok' };
  }
  const num = v => {
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e7 || a < 1e-4) {
      const ex = Math.floor(Math.log10(a));
      return (v / Math.pow(10, ex)).toFixed(2) + ' × 10<sup>' + ex + '</sup>';
    }
    return String(Math.round(v * 1e10) / 1e10);
  };

  /* ============ STEP 1 ============ */
  function drawEnc() {
    const raw = $('decIn').value.trim().replace(/[－−ー]/g, '-').replace(/[０-９．]/g, c => '０１２３４５６７８９．'.indexOf(c) < 10 ? '０１２３４５６７８９'.indexOf(c) : '.');
    const x = Number(raw);
    const box = $('encSteps'), note = $('encNote'), split = $('encSplit');
    if (!isFinite(x)) { box.innerHTML = '<div>数を入力してください。</div>'; split.innerHTML = ''; note.className = 'note ng'; note.textContent = '「' + $('decIn').value + '」は数として読み取れませんでした。'; return; }
    const a = Math.abs(x), ip = Math.floor(a), fp = a - ip;
    const fe = fracExpand(fp, 20);
    const r = encode(x);
    const ibin = intToBin(ip);
    const whole = ibin + (fp > 0 ? '.' + fe.bits : '');
    let rows = [];
    rows.push('<div><span class="lbl">① 符号部 S</span>' + (x < 0 ? '負の数なので <strong class="mono">1</strong>' : '正の数なので <strong class="mono">0</strong>') + '</div>');
    rows.push('<div><span class="lbl">② 整数部分</span><span class="mono">' + ip + '</span>（10） ＝ <strong class="mono">' + ibin + '</strong>（2）</div>');
    if (fp > 0) {
      const detail = fe.rows.slice(0, 8).map(t => '<span class="mono">' + (Math.round(t.from * 1e8) / 1e8) + ' × 2 ＝ ' + (Math.round(t.to * 1e8) / 1e8) + ' → ' + t.bit + '</span>').join('<br>');
      rows.push('<div><span class="lbl">② 小数部分</span><span class="mono">0.' + (Math.round(fp * 1e8) / 1e8).toString().slice(2) + '</span>（10） ＝ <strong class="mono">0.' + fe.bits + '</strong>（2）' +
        (fe.exact ? '' : '<span class="small">（割り切れないので途中で打ち切り）</span>') +
        '<br><span class="small" style="color:var(--muted)">2をかけて整数部分を取り出すことをくり返す：<br>' + detail + (fe.rows.length > 8 ? '<br>…' : '') + '</span></div>');
    }
    rows.push('<div><span class="lbl">③ 2進法で</span><strong class="mono">' + (x < 0 ? '−' : '') + whole + '</strong>（2）</div>');
    if (r.state === 'zero') {
      rows.push('<div>0 は特別扱いで、すべてのビットを 0 にします。</div>');
    } else {
      rows.push('<div><span class="lbl">④ 正規化</span>小数点を' + (r.e >= 0 ? '左' : '右') + 'に <strong>' + Math.abs(r.e) + '</strong> つ動かして　<strong class="mono">' + (x < 0 ? '−' : '') + '1.' +
        r.M.toString(2).padStart(FB, '0').replace(/0+$/, '') + '</strong>（2） × 2<sup>' + r.e + '</sup></div>');
      rows.push('<div><span class="lbl">⑤ 指数部 E</span>' + r.e + ' ＋ 15（バイアス値） ＝ <strong>' + r.E + '</strong> → <strong class="mono">' + r.E.toString(2).padStart(EB, '0') + '</strong>（2）</div>');
      rows.push('<div><span class="lbl">⑥ 仮数部 M</span>小数部分を左詰めにして残りを0で補い <strong class="mono">' + r.M.toString(2).padStart(FB, '0') + '</strong></div>');
    }
    box.innerHTML = rows.join('');
    const b = bitsOf(r);
    split.innerHTML =
      '<div class="seg" style="border-color:#8a2f1f;color:#8a2f1f"><span class="cap">符号部 S</span>' + b[0] + '</div>' +
      '<div class="seg" style="border-color:#123a6b;color:#123a6b;border-left:0"><span class="cap">指数部 E（5）</span>' + b.slice(1, 6) + '</div>' +
      '<div class="seg" style="border-color:#1f7a3d;color:#1f7a3d;border-left:0"><span class="cap">仮数部 M（10）</span>' + b.slice(6) + '</div>';
    if (r.state === 'over') { note.className = 'note ng'; note.innerHTML = 'この数は16ビットでは大きすぎて表せません（オーバーフロー）。'; }
    else if (r.state === 'under') { note.className = 'note ng'; note.innerHTML = 'この数は16ビットでは小さすぎて 0 に丸められます（アンダーフロー）。'; }
    else {
      const err = r.value - x;
      note.className = 'note ' + (err === 0 ? 'ok' : 'warn');
      note.innerHTML = '16ビットの浮動小数点数：<strong class="mono">' + b.replace(/(.{4})/g, '$1 ').trim() + '</strong>（2）<br>' +
        'これを10進法に戻すと <strong>' + num(r.value) + '</strong>。' +
        (err === 0 ? 'もとの数とぴったり一致します。' : '<strong>もとの数とは ' + num(Math.abs(err)) + ' ずれています</strong>（丸め誤差）。2進法で割り切れないためです。');
    }
    window.__encBits = b;
  }

  /* ============ STEP 2 ============ */
  let bits = '0011101100000000'.split('');
  function drawBits() {
    const box = $('bitBox'); box.innerHTML = '';
    bits.forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'b ' + (i === 0 ? 's' : i <= 5 ? 'e' : 'm');
      b.textContent = v;
      b.setAttribute('aria-label', (i === 0 ? '符号部' : i <= 5 ? '指数部' : '仮数部') + ' 第' + i + 'ビット');
      b.addEventListener('click', () => { bits[i] = bits[i] === '0' ? '1' : '0'; drawBits(); });
      box.appendChild(b);
      if (i === 0 || i === 5) { const g = document.createElement('span'); g.className = 'gap'; box.appendChild(g); }
    });
    const str = bits.join(''), d = decode(str);
    const rows = [];
    rows.push('<div><span class="lbl">符号部 S</span><span class="mono">' + d.s + '</span> → ' + (d.s ? '負の数' : '正の数') + '</div>');
    rows.push('<div><span class="lbl">指数部 E</span><span class="mono">' + str.slice(1, 6) + '</span>（2） ＝ ' + d.E +
      (d.kind === 'ok' ? '　→ バイアス値15を引いて 2<sup>' + d.e + '</sup>' : '') + '</div>');
    rows.push('<div><span class="lbl">仮数部 M</span><span class="mono">' + str.slice(6) + '</span> → 先頭に整数部分の 1 を付けて <span class="mono">1.' + str.slice(6) + '</span>（2） ＝ ' +
      (1 + d.M / 1024) + '</div>');
    $('decSteps').innerHTML = rows.join('');
    const n = $('decNote');
    if (d.kind === 'ok') {
      $('decVal').innerHTML = num(d.value);
      const gap = Math.pow(2, d.e - FB);
      $('decGap').innerHTML = num(gap);
      n.className = 'note info';
      n.innerHTML = '計算式は <span class="mono">（−1）<sup>' + d.s + '</sup> × 2<sup>' + d.E + '－15</sup> × ' + (1 + d.M / 1024) + ' ＝ ' + num(d.value) + '</span>。<br>' +
        'この付近では <strong>' + num(gap) + ' きざみ</strong>でしか数を表せません。指数部が大きい（数が大きい）ほど、きざみも粗くなります。';
    } else if (d.kind === 'zero') {
      $('decVal').textContent = '0'; $('decGap').textContent = '—';
      n.className = 'note info'; n.textContent = '指数部・仮数部ともに0のときは 0 を表します（特別扱い）。';
    } else if (d.kind === 'sub') {
      $('decVal').innerHTML = num(d.value); $('decGap').innerHTML = num(Math.pow(2, 1 - BIAS - FB));
      n.className = 'note warn'; n.innerHTML = '指数部がすべて0のときは「1.M」ではなく「0.M」として扱う決まりです（非正規化数）。とても小さい数を表すための仕組みです。';
    } else {
      $('decVal').textContent = d.kind === 'inf' ? '∞' : '数ではない値'; $('decGap').textContent = '—';
      n.className = 'note warn'; n.textContent = '指数部がすべて1のときは、無限大や「数ではない値」を表す特別なビット列として使われます。';
    }
  }

  /* ============ STEP 3 ============ */
  const BLANKS = [
    { k: 'ア', q: '14（10）を2進法で表すと', ch: ['1110', '1100', '1010', '1001'], a: '1110',
      why: '14 ＝ 8＋4＋2 ＝ 1×2³＋1×2²＋1×2¹＋0×2⁰ なので 1110（2）です。' },
    { k: 'イ', q: '0.625（10）を2進法で表すと 0.', ch: ['011', '100', '110', '101'], a: '101',
      why: '0.625 ＝ 0.5＋0.125 ＝ 1×2⁻¹＋0×2⁻²＋1×2⁻³ なので 0.101（2）です。' },
    { k: 'ウ', q: '−1110.101（2）を最上位が1になるように表すと −1.', ch: ['010101', '110101', '101010', '110001'], a: '110101',
      why: '小数点を左に3つ動かすと −1.110101（2）×2³。小数点より下の部分が 110101 です。' },
    { k: 'エ', q: '仮数部 M（10ビット）は', ch: ['0101010000', '1101010000', '1001010000', '1101000000'], a: '1101010000',
      why: '小数部分 110101 を左詰めにし、10ビットになるよう右を0で埋めて 1101010000 です。' },
    { k: 'オ', q: '0011 1011 0000 0000（2）を10進法に直すと', ch: ['0.25', '0.75', '0.5', '0.875', '1.5'], a: '0.875',
      why: 'S＝0（正）、E＝01110（2）＝14 なので 14−15＝−1、M＝1100000000 より 1.11（2）＝1.75。1.75×2⁻¹ ＝ 0.875 です。' }
  ];
  let bAns = {};
  function drawBlanks() {
    $('blankBox').innerHTML = BLANKS.map((b, i) =>
      '<div' + (i ? ' style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"' : '') + '>' +
      '<p class="pq">【' + b.k + '】　' + b.q + '</p>' +
      '<div class="choice4" data-i="' + i + '">' + b.ch.map((c, j) =>
        '<button class="btn" data-i="' + i + '" data-c="' + c + '" style="text-align:center">' + '⓪①②③④'[j] + '　' + c + '</button>').join('') + '</div>' +
      '<div class="note" id="bfb' + i + '" hidden></div></div>').join('');
    $('blankBox').querySelectorAll('button[data-c]').forEach(btn => btn.addEventListener('click', () => {
      const i = +btn.dataset.i, b = BLANKS[i], ok = btn.dataset.c === b.a;
      const row = $('blankBox').querySelector('.choice4[data-i="' + i + '"]');
      row.classList.add('locked');
      [...row.children].forEach(x => {
        if (x.dataset.c === b.a) x.classList.add('correct');
        else if (x === btn) x.classList.add('wrong');
      });
      const fb = $('bfb' + i);
      fb.hidden = false; fb.className = 'note ' + (ok ? 'ok' : 'ng');
      fb.innerHTML = (ok ? '正解。' : '正解は <strong>' + b.a + '</strong>。') + b.why;
      bAns[i] = ok;
      const done = Object.keys(bAns).length, right = Object.values(bAns).filter(Boolean).length;
      const n = $('blankNote');
      n.className = 'note ' + (done === BLANKS.length ? (right === done ? 'ok' : 'warn') : 'info');
      n.innerHTML = done + ' / ' + BLANKS.length + ' 問解答（正解 ' + right + ' 問）' +
        (done === BLANKS.length ? '<br>本文の答えは【ア】⓪　【イ】③　【ウ】①　【エ】①　【オ】③ です。' : '');
    }));
    $('blankNote').className = 'note info';
    $('blankNote').textContent = '0 / ' + BLANKS.length + ' 問解答';
  }

  /* ============ STEP 4 ============ */
  function specs(eb) {
    const fb = 15 - eb, bias = Math.pow(2, eb - 1) - 1;
    const emax = (Math.pow(2, eb) - 2) - bias, emin = 1 - bias;
    return {
      eb: eb, fb: fb, bias: bias,
      max: Math.pow(2, emax) * (2 - Math.pow(2, -fb)),
      min: Math.pow(2, emin),
      dig: (fb + 1) * Math.log10(2)
    };
  }
  function drawPQ() {
    const eb = +$('expBits').value, s = specs(eb);
    $('expBitsV').textContent = eb; $('fracBitsV').textContent = s.fb;
    $('fMax').innerHTML = num(s.max); $('fMin').innerHTML = num(s.min);
    $('fDig').textContent = '約 ' + s.dig.toFixed(1) + ' 桁';
    const P = specs(6), Q = specs(9);
    $('pqTable').innerHTML = '<thead><tr><th></th><th>指数部</th><th>仮数部</th><th>最大の絶対値</th><th>有効桁数</th></tr></thead><tbody>' +
      [['P', P], ['Q', Q]].map(t => '<tr><td><strong>' + t[0] + '</strong></td><td class="mono">' + t[1].eb + '</td><td class="mono">' + t[1].fb +
        '</td><td class="mono">' + num(t[1].max) + '</td><td class="mono">約' + t[1].dig.toFixed(1) + '桁</td></tr>').join('') +
      '<tr style="background:var(--warn-bg)"><td><strong>いま</strong></td><td class="mono">' + eb + '</td><td class="mono">' + s.fb +
      '</td><td class="mono">' + num(s.max) + '</td><td class="mono">約' + s.dig.toFixed(1) + '桁</td></tr></tbody>';
    const n = $('fNote');
    n.className = 'note info';
    n.innerHTML = '指数部を1ビット増やすと表せる範囲は<strong>けた違いに広がり</strong>ますが、そのぶん仮数部が減って<strong>有効桁数は落ちます</strong>。' +
      '合計16ビットのままなので、範囲と精度は同時には得られません。';
  }
  const Q2 = [
    { c: '浮動小数点数 P と Q はどちらも16ビットであるため、表現できる数の範囲や精度はまったく同じである。', ok: false,
      why: '合計ビット数が同じでも、指数部と仮数部の配分が違えば範囲も精度も変わります。' },
    { c: '浮動小数点数 P は仮数部のビット数が多いため、浮動小数点数 Q よりも絶対値の大きい数を表すことができる。', ok: false,
      why: '<strong>絶対値の大きさを決めるのは指数部</strong>です。仮数部が多い P は「細かく（精度よく）表せる」だけで、大きな数まで届くわけではありません。STEP 4 の表で、指数部を増やしたときだけ最大値が跳ね上がることを確かめてください。' },
    { c: '浮動小数点数 P は仮数部のビット数が多いため、非常に小さい数（0 に近い値）も表現しやすい。', ok: false,
      why: '0 に近い値を表せるかどうかも<strong>指数部</strong>が決めます（2 のマイナス乗をどこまで小さくできるか）。仮数部が多いと「きざみが細かい」だけで、表せる範囲そのものは広がりません。' },
    { c: '浮動小数点数 Q は指数部のビット数が多いため、浮動小数点数 P よりも絶対値の大きな値を表すことができる。', ok: true,
      why: '指数部が 6ビット→9ビット と増えると、2 のべき数の範囲が大きく広がり、絶対値の大きな数まで表せるようになります。' }
  ];
  function drawQ2() {
    const box = $('q2Choices'); box.className = 'choice4 v'; box.innerHTML = '';
    Q2.forEach((q, i) => {
      const b = document.createElement('button');
      b.className = 'btn'; b.style.textAlign = 'left'; b.dataset.i = i;
      b.innerHTML = '⓪①②③'[i] + '　' + q.c;
      b.addEventListener('click', () => {
        box.classList.add('locked');
        [...box.children].forEach(x => { if (Q2[+x.dataset.i].ok) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
        const fb = $('q2Fb'); fb.hidden = false;
        fb.className = 'note ' + (q.ok ? 'ok' : 'ng');
        fb.innerHTML = (q.ok ? '正解（③）。' : '正解は <strong>③</strong>。') + q.why;
      });
      box.appendChild(b);
    });
  }

  /* ============ STEP 5 ============ */
  function drawErr() {
    const x = Number($('errIn').value.trim().replace(/[－−ー]/g, '-'));
    const t = $('errTable'), n = $('errNote');
    if (!isFinite(x)) { t.innerHTML = ''; n.className = 'note ng'; n.textContent = '数を入力してください。'; return; }
    const r16 = encode(x), v16 = r16.state === 'ok' ? r16.value : (r16.state === 'under' ? 0 : Infinity);
    const v32 = Math.fround(x);
    const rows = [
      ['入力した数（10進法）', String(x), '—'],
      ['16ビットで記録される値', num(v16), num(Math.abs(v16 - x))],
      ['32ビット（単精度）で記録される値', String(v32), num(Math.abs(v32 - x))],
      ['64ビット（倍精度）で記録される値', String(x), '（ほぼ0）']
    ];
    t.innerHTML = '<thead><tr><th>項目</th><th>値</th><th>もとの数とのずれ</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + r[0] + '</td><td class="mono">' + r[1] + '</td><td class="mono">' + r[2] + '</td></tr>').join('') + '</tbody>';
    const exact = v16 === x;
    n.className = 'note ' + (exact ? 'ok' : 'warn');
    n.innerHTML = exact
      ? 'この数は2進法できっちり表せるので、誤差は出ません。<strong>0.5・0.25・0.125 のように「2のべき乗の和」で書ける小数</strong>はぴったり表せます。'
      : 'この数は2進法にすると <span class="mono">0.' + fracExpand(Math.abs(x) - Math.floor(Math.abs(x)), 16).bits + '…</span> のように<strong>循環して終わりません</strong>。' +
        '決められたビット数で打ち切るため、記録された値はもとの数と <strong>' + num(Math.abs(v16 - x)) + '</strong> ずれます。ビット数が多いほどずれは小さくなります。';
  }
  function add16(a, b) { const r = encode(a + b); return r.state === 'ok' ? r.value : a; }
  function runSum() {
    let acc = 0; const log = [];
    for (let i = 1; i <= 10; i++) { acc = add16(acc, 0.1); log.push(i + '回目：' + (Math.round(acc * 1e8) / 1e8)); }
    const n = $('sumNote');
    n.className = 'note warn';
    n.innerHTML = log.join('　／　') + '<br><strong>結果：' + (Math.round(acc * 1e8) / 1e8) + '</strong><br>' +
      '注目したいのは<strong>途中の値</strong>です。0.1・0.2・0.3… とはならず、どの段階でも少しずつずれています。' +
      'このずれた値をさらに大小比較や条件分岐に使うと、思ったとおりに動かないことがあります。' +
      'プログラムで小数を「＝」で比べてはいけないのは、このためです。';
  }
  function runLoss() {
    let acc = 1000; const marks = [];
    for (let i = 1; i <= 100; i++) { acc = add16(acc, 0.1); if (i === 1 || i === 10 || i === 50 || i === 100) marks.push(i + '回後：' + acc); }
    const n = $('sumNote');
    const stuck = acc === 1000;
    n.className = 'note ' + (stuck ? 'ng' : 'warn');
    n.innerHTML = marks.join('　／　') + '<br><strong>結果：' + acc + '</strong>（正しくは 1010）<br>' +
      (stuck
        ? '1000 の付近では <strong>' + num(Math.pow(2, encode(1000).e - FB)) + ' きざみ</strong>でしか数を表せません。' +
          '0.1 はそのきざみよりずっと小さいので、たしても<strong>まったく変化しません</strong>。何回たしても 1000 のままです。' +
          'これを<strong>情報落ち</strong>といいます。'
        : '大きな数に小さな数をたすと、小さいほうが切り捨てられて反映されにくくなります（情報落ち）。');
  }

  /* ============ init ============ */
  function init() {
    $('decIn').addEventListener('input', drawEnc);
    document.querySelectorAll('button[data-dec]').forEach(b => b.addEventListener('click', () => { $('decIn').value = b.dataset.dec; drawEnc(); }));
    $('loadBook').addEventListener('click', () => { bits = '0011101100000000'.split(''); drawBits(); });
    $('loadFromEnc').addEventListener('click', () => { if (window.__encBits) { bits = window.__encBits.split(''); drawBits(); } });
    $('clrBits').addEventListener('click', () => { bits = '0000000000000000'.split(''); drawBits(); });
    $('expBits').addEventListener('input', drawPQ);
    $('setP').addEventListener('click', () => { $('expBits').value = 6; drawPQ(); });
    $('setQ').addEventListener('click', () => { $('expBits').value = 9; drawPQ(); });
    $('errIn').addEventListener('input', drawErr);
    document.querySelectorAll('button[data-err]').forEach(b => b.addEventListener('click', () => { $('errIn').value = b.dataset.err; drawErr(); }));
    $('sumRun').addEventListener('click', runSum);
    $('lossRun').addEventListener('click', runLoss);
    window.Terms.glossary($('glossBox'), ['浮動小数点数', '符号部', '指数部', '仮数部', 'バイアス値', '正規化', '丸め誤差', '情報落ち', 'オーバーフロー', 'アンダーフロー', '基数変換', '2進法', 'ビット']);
    drawEnc(); drawBits(); drawBlanks(); drawPQ(); drawQ2(); drawErr();
    window.Terms.attach();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
