
        const SB = 'https://fireuryrmexwmindvqlx.supabase.co';
        const KEY = 'sb_publishable_PMjg2XXVVAChMDzowbDhsg_CuCAGY1C';
        const TBL = 'arizalar';

        // ── Supabase API ──────────────────────────────────────
        async function api(path, method = 'GET', body = null, prefer = '') {
            const opts = {
                method,
                headers: {
                    'apikey': KEY,
                    'Authorization': 'Bearer ' + KEY,
                    'Content-Type': 'application/json',
                    'Prefer': prefer
                }
            };
            if (body) opts.body = JSON.stringify(body);
            const r = await fetch(SB + '/rest/v1/' + path, opts);
            if (!r.ok) throw new Error(await r.text());
            const t = await r.text();
            return t ? JSON.parse(t) : null;
        }

        const DB = {
            getAll: () => api(TBL + '?order=created_at.desc&select=*'),
            insert: (d) => api(TBL, 'POST', d, 'return=minimal'),
            setStatus: async (id, st) => {
                const res = await api(TBL + '?id=eq.' + id + '&select=*', 'PATCH', { status: st }, 'return=representation');
                if (!res || !res.length) throw new Error("Ruxsat yo'q (RLS) — UPDATE policy qo'shilmagan");
                return res;
            },
            delete: async (id) => {
                const res = await api(TBL + '?id=eq.' + id + '&select=*', 'DELETE', null, 'return=representation');
                if (!res || !res.length) throw new Error("Ruxsat yo'q (RLS) — DELETE policy qo'shilmagan");
                return res;
            },
            delByStatus: (st) => api(TBL + '?status=eq.' + st + '&select=*', 'DELETE', null, 'return=representation'),
        };

        const val = (id) => (document.getElementById(id)?.value || '').trim();

        // ── Rozilik darvozasi ─────────────────────────────────
        function toggleConsentBtn() {
            document.getElementById('consentBtn').disabled = !document.getElementById('consentCheck').checked;
        }
        function acceptConsent() {
            if (!document.getElementById('consentCheck').checked) return;
            document.getElementById('consentBox').style.display = 'none';
            document.getElementById('formSwitch').style.display = 'flex';
            switchForm('france');
        }

        // ── Form switcher ─────────────────────────────────────
        function switchForm(type) {
            const isFr = type === 'france';
            document.getElementById('franceForm').style.display = isFr ? 'block' : 'none';
            document.getElementById('canadaForm').style.display = isFr ? 'none' : 'block';
            document.getElementById('fsb_france').classList.toggle('active', isFr);
            document.getElementById('fsb_canada').classList.toggle('active', !isFr);
        }

        // ── France TCF form ───────────────────────────────────
        async function submitFrance(e) {
            e.preventDefault();
            const btn = document.getElementById('frSubmitBtn');
            btn.disabled = true; btn.textContent = 'Yuklanmoqda...';
            try {
                const fullname = val('fr_fullname');
                const parts = fullname.split(' ');
                await DB.insert({
                    fname: parts[0] || fullname,
                    lname: parts.slice(1).join(' ') || '',
                    phone: val('fr_phone'),
                    status: 'new',
                    form_type: 'france',
                    details: {
                        'To\'liq ismi': fullname,
                        'Yashash manzili': val('fr_address'),
                        'Tug\'ilgan sana': val('fr_birthdate'),
                        'Ma\'lumoti': val('fr_education'),
                        'Ish joyi va tajriba': val('fr_work'),
                        'Oilaviy holati': val('fr_family'),
                        'Ingliz tili darajasi': val('fr_english'),
                        'Telefon': val('fr_phone'),
                        'Telegram': val('fr_telegram'),
                        'Fransuz tili maqsadi': val('fr_goal'),
                        'Hozirgi fransuz darajasi': val('fr_frlevel'),
                        'Imtihon vaqti': val('fr_examdate'),
                        'Davlat/maqsad': val('fr_country'),
                        'Kunlik vaqt': val('fr_time'),
                        'Dars formati': val('fr_format'),
                        'Qayerdan eshitdi': val('fr_source'),
                    }
                });
                document.getElementById('franceForm').reset();
                showMsg('msgOk');
            } catch { showMsg('msgErr'); }
            btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish →";
        }

        // ── Kanada immigratsiya form ──────────────────────────
        async function submitCanada(e) {
            e.preventDefault();
            const btn = document.getElementById('caSubmitBtn');
            btn.disabled = true; btn.textContent = 'Yuklanmoqda...';
            try {
                const fullname = val('ca_fullname');
                const parts = fullname.split(' ');
                await DB.insert({
                    fname: parts[0] || fullname,
                    lname: parts.slice(1).join(' ') || '',
                    phone: val('ca_phone'),
                    status: 'new',
                    form_type: 'canada',
                    details: {
                        'To\'liq ismi': fullname,
                        'Yashash manzili': val('ca_address'),
                        'Tug\'ilgan sana': val('ca_birthdate'),
                        'Ma\'lumoti': val('ca_education'),
                        'Ta\'lim muassasasi': val('ca_institution'),
                        'Ish joyi': val('ca_work'),
                        'Ish tajribasi (yil)': val('ca_experience'),
                        'Oilaviy holati': val('ca_marital'),
                        'Farzandlar soni': val('ca_children'),
                        'Ingliz tili darajasi': val('ca_english'),
                        'Ingliz sertifikati': val('ca_engcert'),
                        'Telefon': val('ca_phone'),
                        'Telegram': val('ca_telegram'),
                        'Fransuz tili maqsadi': val('ca_goal'),
                        'Hozirgi fransuz darajasi': val('ca_frlevel'),
                        'Imtihon vaqti': val('ca_examdate'),
                        'Davlat/maqsad': val('ca_country'),
                        'Kunlik vaqt': val('ca_time'),
                        'Dars formati': val('ca_format'),
                        'Qayerdan eshitdi': val('ca_source'),
                        'Qo\'shimcha izoh': val('ca_notes'),
                    }
                });
                document.getElementById('canadaForm').reset();
                showMsg('msgOk');
            } catch { showMsg('msgErr'); }
            btn.disabled = false; btn.textContent = "Baholash uchun yuborish →";
        }

        function showMsg(id) {
            document.getElementById(id).style.display = 'block';
            setTimeout(() => document.getElementById(id).style.display = 'none', 5000);
        }

        // ── Login ─────────────────────────────────────────────
        function openLogin() {
            document.getElementById('passInput').value = '';
            document.getElementById('loginErr').style.display = 'none';
            document.getElementById('loginOverlay').classList.add('open');
            setTimeout(() => document.getElementById('passInput').focus(), 100);
        }
        function closeLogin() { document.getElementById('loginOverlay').classList.remove('open'); }
        function doLogin() {
            if (document.getElementById('passInput').value === 'admin1234') {
                sessionStorage.setItem('adm', '1');
                closeLogin();
                enterAdmin();
            } else {
                document.getElementById('loginErr').style.display = 'block';
            }
        }
        function logout() {
            sessionStorage.removeItem('adm');
            document.getElementById('adminPage').style.display = 'none';
            document.getElementById('mainSite').style.display = 'block';
        }
        function enterAdmin() {
            document.getElementById('mainSite').style.display = 'none';
            document.getElementById('adminPage').style.display = 'block';
            curTab = 'new';
            loadData();
        }

        // ── Admin Data ────────────────────────────────────────
        let data = [];
        let curTab = 'new';
        let sheetId = null;

        async function loadData() {
            showLoading();
            try {
                data = await DB.getAll();
                render();
            } catch (err) {
                setContent('<div class="empty-state"><div class="ei">❌</div><p>Xatolik: ' + err.message + '</p></div>');
            } finally {
                hideLoading();
            }
        }

        function setContent(html) {
            document.getElementById('tblWrap').innerHTML = html;
            document.getElementById('cardsWrap').innerHTML = html;
        }

        function render() {
            const grp = {
                new: data.filter(a => a.status === 'new'),
                checked: data.filter(a => a.status === 'checked'),
                deleted: data.filter(a => a.status === 'deleted'),
            };
            ['new', 'checked', 'deleted'].forEach(s => {
                document.getElementById('cnt_' + s).textContent = grp[s].length;
                document.getElementById('s_' + s).textContent = grp[s].length;
            });
            document.getElementById('s_total').textContent = grp.new.length + grp.checked.length;

            const list = grp[curTab] || [];
            buildTable(list);
            buildCards(list);
        }

        function fullName(a) {
            if (a.details && a.details["To'liq ismi"]) return a.details["To'liq ismi"];
            return ((a.fname || '') + ' ' + (a.lname || '')).trim() || '—';
        }
        function formLabel(a) {
            if (a.form_type === 'canada') return '<span class="badge b-ca">🇨🇦 Kanada</span>';
            if (a.form_type === 'france') return '<span class="badge b-fr">🇫🇷 France TCF</span>';
            return '<span class="badge b-old">Eski</span>';
        }

        function buildTable(list) {
            const wrap = document.getElementById('tblWrap');
            if (!list.length) { wrap.innerHTML = emptyHtml(); return; }

            let h = `<table><thead><tr>
    <th>#</th><th>Ism Familiya</th><th>Forma</th><th>Telefon</th><th>Sana</th><th>Amal</th>
  </tr></thead><tbody>`;

            list.forEach((a, i) => {
                const ds = new Date(a.created_at).toLocaleString('uz-UZ');
                let btns = '';
                if (curTab === 'new') {
                    btns = `<button class="ab ab-view" onclick="openSheet(${a.id})">👁 Ko'rish</button>
              <button class="ab ab-check" onclick="setStatus(${a.id},'checked')">✓</button>
              <button class="ab ab-del"   onclick="setStatus(${a.id},'deleted')">🗑</button>`;
                } else if (curTab === 'checked') {
                    btns = `<button class="ab ab-view" onclick="openSheet(${a.id})">👁 Ko'rish</button>
              <button class="ab ab-back"    onclick="setStatus(${a.id},'new')">↩</button>
              <button class="ab ab-del"      onclick="setStatus(${a.id},'deleted')">🗑</button>`;
                } else {
                    btns = `<button class="ab ab-view" onclick="openSheet(${a.id})">👁 Ko'rish</button>
              <button class="ab ab-restore" onclick="setStatus(${a.id},'new')">↩</button>
              <button class="ab ab-perm"    onclick="permDelete(${a.id})">✕</button>`;
                }
                h += `<tr>
      <td>${i + 1}</td>
      <td><strong>${fullName(a)}</strong></td>
      <td>${formLabel(a)}</td>
      <td><a href="tel:${a.phone}" style="color:var(--navy);font-weight:600;text-decoration:none">${a.phone || '—'}</a></td>
      <td style="color:var(--gray);font-size:.78rem">${ds}</td>
      <td style="white-space:nowrap">${btns}</td>
    </tr>`;
            });
            h += '</tbody></table>';
            wrap.innerHTML = h;
        }

        function buildCards(list) {
            const wrap = document.getElementById('cardsWrap');
            if (!list.length) { wrap.innerHTML = emptyHtml(); return; }
            wrap.innerHTML = list.map(a => {
                const cls = a.form_type === 'canada' ? 'av-ca' : 'av-fr';
                const nm = fullName(a);
                const ini = nm.replace(/[^A-Za-zА-Яа-яЁёʼ' ]/g, '').trim().split(' ').map(x => x[0] || '').slice(0, 2).join('').toUpperCase() || '?';
                const ft = a.form_type === 'canada' ? '🇨🇦 Kanada' : '🇫🇷 France TCF';
                return `<div class="m-card" onclick="openSheet(${a.id})">
      <div class="m-avatar ${cls}">${ini}</div>
      <div class="m-info">
        <div class="m-name">${nm}</div>
        <div class="m-sub">${a.phone || '—'} · ${ft}</div>
      </div>
      <div class="m-arrow">›</div>
    </div>`;
            }).join('');
        }

        function emptyHtml() {
            const icons = { new: '📭', checked: '🗂️', deleted: '🗑' };
            const texts = { new: "Yangi ariza yo'q", checked: "Tekshirilgan ariza yo'q", deleted: "O'chirilgan ariza yo'q" };
            return `<div class="empty-state"><div class="ei">${icons[curTab]}</div><p>${texts[curTab]}</p></div>`;
        }

        function switchTab(tab) {
            curTab = tab;
            ['new', 'checked', 'deleted'].forEach(t =>
                document.getElementById('tab_' + t).classList.toggle('active', t === tab)
            );
            const titles = { new: '📥 Yangi arizalar', checked: '✅ Tekshirilgan arizalar', deleted: "🗑 O'chirilgan arizalar" };
            document.getElementById('tblTitle').textContent = titles[tab];
            render();
        }

        // ── Actions ───────────────────────────────────────────
        async function setStatus(id, status) {
            const item = data.find(a => a.id === id);
            if (item) item.status = status;   // optimistic: darrov o'sha bo'limga o'tadi
            render();
            try {
                await DB.setStatus(id, status);
            } catch (err) {
                alert('Xatolik: ' + err.message);
                data = await DB.getAll();   // xato bo'lsa serverdan tiklash
                render();
            }
        }

        async function permDelete(id) {
            if (!confirm("Butunlay o'chirilsinmi?")) return;
            data = data.filter(a => a.id !== id);   // optimistic
            render();
            try {
                await DB.delete(id);
            } catch (err) {
                alert('Xatolik: ' + err.message);
                data = await DB.getAll();
                render();
            }
        }

        async function clearTab() {
            if (curTab === 'deleted') {
                if (!confirm("O'chirilganlar to'liq tozalansinmi? Bu amalni qaytarib bo'lmaydi!")) return;
                data = data.filter(a => a.status !== 'deleted');
                render();
                try {
                    await DB.delByStatus('deleted');
                } catch (err) { alert('Xatolik: ' + err.message); data = await DB.getAll(); render(); }
            } else {
                const lbl = curTab === 'new' ? 'yangi' : 'tekshirilgan';
                if (!confirm(`Barcha ${lbl} arizalar o'chirilganlar bo'limiga o'tkazilsinmi?`)) return;
                const ids = data.filter(a => a.status === curTab).map(a => a.id);
                data.forEach(a => { if (ids.includes(a.id)) a.status = 'deleted'; });
                render();
                try {
                    for (const id of ids) await DB.setStatus(id, 'deleted');
                } catch (err) { alert('Xatolik: ' + err.message); data = await DB.getAll(); render(); }
            }
        }

        // ── Bottom sheet ──────────────────────────────────────
        function openSheet(id) {
            const a = data.find(x => x.id === id);
            if (!a) return;
            sheetId = id;
            document.getElementById('sh_name').textContent = fullName(a);

            const ds = new Date(a.created_at).toLocaleString('uz-UZ');
            const statusLabel = { new: '🔴 Yangi', checked: '✅ Tekshirilgan', deleted: '🗑 O\'chirilgan' };
            const ft = a.form_type === 'canada' ? '🇨🇦 Kanada immigratsiya' : (a.form_type === 'france' ? '🇫🇷 France TCF' : 'Eski ariza');

            let rows = `<div class="sheet-row"><span class="s-lbl">Forma turi</span><span class="s-val">${ft}</span></div>`;
            rows += `<div class="sheet-row"><span class="s-lbl">Holat</span><span class="s-val">${statusLabel[a.status] || a.status}</span></div>`;

            if (a.details && typeof a.details === 'object') {
                Object.entries(a.details).forEach(([k, v]) => {
                    if (v === null || v === undefined || v === '') return;
                    rows += `<div class="sheet-row"><span class="s-lbl">${k}</span><span class="s-val">${v}</span></div>`;
                });
            } else {
                // eski formatdagi arizalar
                if (a.age) rows += `<div class="sheet-row"><span class="s-lbl">Yosh</span><span class="s-val">${a.age}</span></div>`;
                if (a.gender) rows += `<div class="sheet-row"><span class="s-lbl">Jinsi</span><span class="s-val">${a.gender}</span></div>`;
                rows += `<div class="sheet-row"><span class="s-lbl">Telefon</span><span class="s-val">${a.phone || '—'}</span></div>`;
            }
            rows += `<div class="sheet-row"><span class="s-lbl">Sana</span><span class="s-val" style="font-size:.8rem">${ds}</span></div>`;

            document.getElementById('sh_rows').innerHTML = rows;
            document.getElementById('sh_call').href = 'tel:' + (a.phone || '');

            const act = document.getElementById('sh_action');
            const del = document.getElementById('sh_del');

            if (a.status === 'new') {
                styleBtn(act, '✓ Tekshirildi deb belgilash', 'var(--green-l)', 'var(--green)');
                styleBtn(del, "🗑 O'chirilganlarga o'tkazish", '#fee2e2', '#991b1b');
            } else if (a.status === 'checked') {
                styleBtn(act, '↩ Yangilarga qaytarish', '#fef3c7', '#92400e');
                styleBtn(del, "🗑 O'chirilganlarga o'tkazish", '#fee2e2', '#991b1b');
            } else {
                styleBtn(act, '↩ Yangilarga tiklash', 'var(--green-l)', 'var(--green)');
                styleBtn(del, "✕ Butunlay o'chirish", '#fee2e2', '#991b1b');
            }

            document.getElementById('sheetOverlay').classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function styleBtn(btn, text, bg, color) {
            btn.textContent = text; btn.style.background = bg; btn.style.color = color;
        }

        async function sheetAction() {
            const a = data.find(x => x.id === sheetId); if (!a) return;
            const next = a.status === 'new' ? 'checked' : 'new';
            const id = a.id;
            closeSheetModal();
            setStatus(id, next);
        }

        async function sheetDel() {
            const a = data.find(x => x.id === sheetId); if (!a) return;
            const id = a.id;
            if (a.status === 'deleted') {
                closeSheetModal();
                permDelete(id);
            } else {
                closeSheetModal();
                setStatus(id, 'deleted');
            }
        }

        function closeSheetModal() {
            document.getElementById('sheetOverlay').classList.remove('open');
            document.body.style.overflow = '';
            sheetId = null;
        }
        function closeSheet(e) { if (e.target === document.getElementById('sheetOverlay')) closeSheetModal(); }

        // ── Loading overlay ───────────────────────────────────
        function showLoading() { document.getElementById('loadingOverlay').classList.add('open'); }
        function hideLoading() { document.getElementById('loadingOverlay').classList.remove('open'); }

        // ── Ommaviy oferta modali ─────────────────────────────
        function openOffer() {
            const ov = document.getElementById('offerOverlay');
            ov.classList.add('open');
            document.body.style.overflow = 'hidden';
            const body = document.getElementById('offerBody');
            if (body) body.scrollTop = 0;
        }
        function closeOffer(e) {
            // Faqat fon (overlay) bosilganda yoki tugma orqali yopiladi
            if (e && e.target && e.target.id !== 'offerOverlay') return;
            document.getElementById('offerOverlay').classList.remove('open');
            document.body.style.overflow = '';
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('offerOverlay').classList.contains('open')) {
                document.getElementById('offerOverlay').classList.remove('open');
                document.body.style.overflow = '';
            }
        });

        // ── Init ──────────────────────────────────────────────
        window.addEventListener('DOMContentLoaded', () => {
            if (sessionStorage.getItem('adm') === '1') enterAdmin();
            initReveal();
            initNavScroll();
        });

        // ── Scroll reveal animatsiyasi ────────────────────────
        function initReveal() {
            const els = document.querySelectorAll('[data-reveal]');
            if (!('IntersectionObserver' in window)) {
                els.forEach(e => e.classList.add('in'));
                return;
            }
            const io = new IntersectionObserver((entries) => {
                entries.forEach((en, idx) => {
                    if (en.isIntersecting) {
                        en.target.style.transitionDelay = Math.min(idx * 60, 240) + 'ms';
                        en.target.classList.add('in');
                        io.unobserve(en.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            els.forEach(e => io.observe(e));
        }

        // ── Navbar scroll effekti ─────────────────────────────
        function initNavScroll() {
            const nav = document.querySelector('#mainSite nav');
            if (!nav) return;
            const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }
