
        // Supabase (ixtiyoriy). Loyiha o'chirilgan bo'lsa ham localStorage ishlayveradi.
        const SB = 'https://fireuryrmexwmindvqlx.supabase.co';
        const KEY = 'sb_publishable_PMjg2XXVVAChMDzowbDhsg_CuCAGY1C';
        const TBL = 'arizalar';
        const LS_KEY = 'france_tcf_arizalar_v1';
        const TG_ADMIN = 'https://t.me/France_TCF';

        let remoteOnline = false;

        // ── localStorage (asosiy zaxira) ───────────────────────
        const Local = {
            all() {
                try {
                    const raw = localStorage.getItem(LS_KEY);
                    const list = raw ? JSON.parse(raw) : [];
                    return Array.isArray(list) ? list : [];
                } catch { return []; }
            },
            saveAll(list) {
                localStorage.setItem(LS_KEY, JSON.stringify(list));
            },
            upsert(row) {
                const list = this.all();
                const i = list.findIndex(x => String(x.id) === String(row.id));
                if (i >= 0) list[i] = { ...list[i], ...row };
                else list.unshift(row);
                this.saveAll(list);
                return row;
            },
            setStatus(id, status) {
                const list = this.all();
                const item = list.find(x => String(x.id) === String(id));
                if (!item) return false;
                item.status = status;
                this.saveAll(list);
                return true;
            },
            remove(id) {
                this.saveAll(this.all().filter(x => String(x.id) !== String(id)));
            },
            removeByStatus(st) {
                this.saveAll(this.all().filter(x => x.status !== st));
            },
            replaceId(oldId, row) {
                const list = this.all().filter(x => String(x.id) !== String(oldId));
                list.unshift(row);
                this.saveAll(list);
            }
        };

        function genLocalId() {
            return 'L' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
        }

        // ── Supabase API (best-effort, hech qachon formani bloklamaydi) ──
        async function api(path, method = 'GET', body = null, prefer = '') {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 2500);
            try {
                const opts = {
                    method,
                    signal: ctrl.signal,
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
            } finally {
                clearTimeout(timer);
            }
        }

        // Remote o'chiqligini oldindan bilib qo'yamiz (forma kutmasin)
        let remoteDisabled = false;
        (async () => {
            try {
                await api(TBL + '?select=id&limit=1');
                remoteOnline = true;
                remoteDisabled = false;
            } catch {
                remoteOnline = false;
                remoteDisabled = true; // Supabase o'chirilgan — faqat localStorage
            }
        })();

        function mergeApps(remote, local) {
            const map = new Map();
            // Avval remote, keyin local — local oxirgi holatni ustun qo'yadi
            (remote || []).forEach(r => map.set(String(r.id), r));
            (local || []).forEach(r => {
                const k = String(r.id);
                const prev = map.get(k);
                map.set(k, prev ? { ...prev, ...r } : r);
            });
            return [...map.values()].sort((a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
        }

        const DB = {
            async getAll() {
                const local = Local.all();
                let remote = [];
                if (!remoteDisabled) {
                    try {
                        remote = await api(TBL + '?order=created_at.desc&select=*') || [];
                        remoteOnline = true;
                    } catch {
                        remoteOnline = false;
                        remoteDisabled = true;
                        remote = [];
                    }
                } else {
                    remoteOnline = false;
                }
                const merged = mergeApps(remote, local);
                Local.saveAll(merged);
                return merged;
            },
            async insert(payload) {
                // 1) Avvalo localStorage — shu bilan ro'yxatdan o'tish HAR DOIM ishlaydi
                const localRow = {
                    id: genLocalId(),
                    created_at: new Date().toISOString(),
                    ...payload
                };
                Local.upsert(localRow);

                // 2) Server bo'lsa fon rejimida yozamiz (formani kutishtirmaymiz)
                if (!remoteDisabled) {
                    api(TBL, 'POST', payload, 'return=representation')
                        .then((res) => {
                            remoteOnline = true;
                            if (res && res[0]) Local.replaceId(localRow.id, res[0]);
                        })
                        .catch(() => {
                            remoteOnline = false;
                            remoteDisabled = true;
                        });
                }
                return { row: localRow, remote: !remoteDisabled && remoteOnline };
            },
            async setStatus(id, st) {
                Local.setStatus(id, st);
                // Faqat server id (raqam) bo'lsa remote'ga yozamiz
                if (String(id).startsWith('L')) return;
                try {
                    const res = await api(TBL + '?id=eq.' + id + '&select=*', 'PATCH', { status: st }, 'return=representation');
                    remoteOnline = true;
                    if (res && res[0]) Local.upsert(res[0]);
                } catch {
                    remoteOnline = false;
                }
            },
            async delete(id) {
                // Faqat qo'lda — localStorage'dan ham o'chadi
                Local.remove(id);
                if (String(id).startsWith('L')) return;
                try {
                    await api(TBL + '?id=eq.' + id + '&select=*', 'DELETE', null, 'return=representation');
                    remoteOnline = true;
                } catch {
                    remoteOnline = false;
                }
            },
            async delByStatus(st) {
                Local.removeByStatus(st);
                try {
                    await api(TBL + '?status=eq.' + st + '&select=*', 'DELETE', null, 'return=representation');
                    remoteOnline = true;
                } catch {
                    remoteOnline = false;
                }
            },
        };

        const val = (id) => (document.getElementById(id)?.value || '').trim();

        // ── Rozilik darvozasi ─────────────────────────────────
        function toggleConsentBtn() {
            document.getElementById('consentBtn').disabled = !document.getElementById('consentCheck').checked;
        }
        function acceptConsent() {
            if (!document.getElementById('consentCheck').checked) return;
            document.getElementById('consentBox').style.display = 'none';
            document.getElementById('franceForm').style.display = 'block';
        }

        // ── France TCF form ───────────────────────────────────
        async function submitFrance(e) {
            e.preventDefault();
            const btn = document.getElementById('frSubmitBtn');
            btn.disabled = true; btn.textContent = 'Yuklanmoqda...';
            hideMsg('msgOk'); hideMsg('msgErr'); hideMsg('msgLocal');
            try {
                const fullname = val('fr_fullname');
                const parts = fullname.split(/\s+/).filter(Boolean);
                const payload = {
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
                };
                const result = await DB.insert(payload);
                document.getElementById('franceForm').reset();
                // Forma ochiq qolsin — qayta ariza topshirish oson bo'lsin
                prepareTelegramFallback(result.row);
                showMsg('msgOk');
                // Server o'chiq bo'lsa qo'shimcha Telegram yo'li
                if (remoteDisabled || !remoteOnline) showMsg('msgLocal');
            } catch (err) {
                console.error(err);
                // localStorage ishlamasa ham Telegram orqali yuborish imkonini beramiz
                try {
                    prepareTelegramFallback({
                        phone: val('fr_phone'),
                        details: {
                            "To'liq ismi": val('fr_fullname'),
                            "Yashash manzili": val('fr_address'),
                            'Dars formati': val('fr_format'),
                            'Fransuz tili maqsadi': val('fr_goal'),
                            'Telefon': val('fr_phone')
                        }
                    });
                    showMsg('msgLocal');
                } catch {
                    showMsg('msgErr');
                }
            }
            btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish →";
        }

        function prepareTelegramFallback(row) {
            const d = row.details || {};
            const lines = [
                '🇫🇷 France TCF — yangi ariza',
                'Ism: ' + (d["To'liq ismi"] || fullName(row)),
                'Tel: ' + (row.phone || d['Telefon'] || ''),
                'Manzil: ' + (d["Yashash manzili"] || ''),
                'Format: ' + (d['Dars formati'] || ''),
                'Maqsad: ' + (d['Fransuz tili maqsadi'] || '')
            ].filter(Boolean);
            const link = TG_ADMIN + '?text=' + encodeURIComponent(lines.join('\n'));
            const a = document.getElementById('msgLocalTg');
            if (a) a.href = link;
        }

        // ── Kanada immigratsiya form (OLIB TASHLANDI) ─────────

        function showMsg(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = 'block';
            if (id !== 'msgLocal') {
                setTimeout(() => { el.style.display = 'none'; }, 6000);
            }
        }
        function hideMsg(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
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
            document.body.classList.remove('admin-mode');
        }
        function enterAdmin() {
            document.getElementById('mainSite').style.display = 'none';
            document.getElementById('adminPage').style.display = 'block';
            document.body.classList.add('admin-mode');
            curTab = 'new';
            loadData();
        }

        // ── Admin Data ────────────────────────────────────────
        let data = [];
        let curTab = 'new';
        let sheetId = null;
        let searchQuery = '';

        async function loadData() {
            showLoading();
            const rb = document.getElementById('refreshBtn');
            if (rb) rb.classList.add('spinning');
            try {
                data = await DB.getAll();
                updateRemoteBadge();
                render();
            } catch (err) {
                // Remote o'chiq bo'lsa ham localStorage'dan ko'rsatamiz
                data = Local.all();
                remoteOnline = false;
                updateRemoteBadge();
                render();
                if (!data.length) {
                    setContent('<div class="empty-state"><div class="ei">❌</div><p>Xatolik: ' + err.message + '</p></div>');
                }
            } finally {
                hideLoading();
                if (rb) setTimeout(() => rb.classList.remove('spinning'), 400);
            }
        }

        function updateRemoteBadge() {
            const el = document.getElementById('remoteBadge');
            if (!el) return;
            if (remoteOnline) {
                el.className = 'remote-badge online';
                el.textContent = '☁ Server ulangan · localStorage zaxira faol';
            } else {
                el.className = 'remote-badge offline';
                el.textContent = '⚠ Server o\'chiq — arizalar shu qurilma localStorage\'ida saqlanmoqda';
            }
        }

        function setContent(html) {
            document.getElementById('tblWrap').innerHTML = html;
            document.getElementById('cardsWrap').innerHTML = html;
        }

        function onSearch(q) {
            searchQuery = (q || '').toLowerCase().trim();
            render();
        }

        function applySearch(list) {
            if (!searchQuery) return list;
            return list.filter(a => {
                const nm = fullName(a).toLowerCase();
                const ph = (a.phone || '').toLowerCase();
                return nm.includes(searchQuery) || ph.includes(searchQuery);
            });
        }

        function animateNum(el, to) {
            const from = parseInt(el.dataset.count || '0', 10) || 0;
            if (from === to) { el.textContent = to; return; }
            el.dataset.count = to;
            const dur = 500;
            const start = performance.now();
            const step = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(from + (to - from) * eased);
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }

        function render() {
            const grp = {
                new: data.filter(a => a.status === 'new'),
                checked: data.filter(a => a.status === 'checked'),
                deleted: data.filter(a => a.status === 'deleted'),
            };
            ['new', 'checked', 'deleted'].forEach(s => {
                document.getElementById('cnt_' + s).textContent = grp[s].length;
                animateNum(document.getElementById('s_' + s), grp[s].length);
            });
            animateNum(document.getElementById('s_total'), grp.new.length + grp.checked.length);

            const list = applySearch(grp[curTab] || []);
            buildTable(list);
            buildCards(list);

            const sub = document.getElementById('adminSub');
            if (sub) {
                const subTexts = {
                    new: 'Yangi kelib tushgan arizalar — tekshirishni kutmoqda',
                    checked: 'Siz tekshirib chiqqan arizalar',
                    deleted: "O'chirilgan arizalar — tiklash yoki butunlay o'chirish mumkin"
                };
                sub.textContent = searchQuery
                    ? `"${searchQuery}" bo'yicha ${list.length} ta natija`
                    : (subTexts[curTab] || '');
            }
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
        function jsId(id) {
            return JSON.stringify(String(id));
        }
        function statusPill(st) {
            const map = {
                new: '<span class="pill pill-new">Yangi</span>',
                checked: '<span class="pill pill-done">Tekshirilgan</span>',
                deleted: '<span class="pill pill-del">O\'chirilgan</span>'
            };
            return map[st] || '';
        }
        function timeAgo(dateStr) {
            const d = new Date(dateStr);
            const diff = (Date.now() - d.getTime()) / 1000;
            if (isNaN(diff)) return '';
            if (diff < 60) return 'hozirgina';
            if (diff < 3600) return Math.floor(diff / 60) + ' daq oldin';
            if (diff < 86400) return Math.floor(diff / 3600) + ' soat oldin';
            if (diff < 604800) return Math.floor(diff / 86400) + ' kun oldin';
            return d.toLocaleDateString('uz-UZ');
        }
        function highlight(text) {
            if (!searchQuery) return text;
            try {
                const re = new RegExp('(' + searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
                return text.replace(re, '<mark>$1</mark>');
            } catch { return text; }
        }

        function buildTable(list) {
            const wrap = document.getElementById('tblWrap');
            if (!list.length) { wrap.innerHTML = emptyHtml(); return; }

            let h = `<table><thead><tr>
    <th>#</th><th>Ism Familiya</th><th>Forma</th><th>Telefon</th><th>Vaqt</th><th>Holat</th><th>Amal</th>
  </tr></thead><tbody>`;

            list.forEach((a, i) => {
                const id = jsId(a.id);
                let btns = '';
                if (curTab === 'new') {
                    btns = `<button class="ab ab-view" onclick="openSheet(${id})">👁 Ko'rish</button>
              <button class="ab ab-check" onclick="setStatus(${id},'checked')" title="Tekshirildi">✓</button>
              <button class="ab ab-del"   onclick="setStatus(${id},'deleted')" title="O'chirish">🗑</button>`;
                } else if (curTab === 'checked') {
                    btns = `<button class="ab ab-view" onclick="openSheet(${id})">👁 Ko'rish</button>
              <button class="ab ab-back"    onclick="setStatus(${id},'new')" title="Yangilarga">↩</button>
              <button class="ab ab-del"      onclick="setStatus(${id},'deleted')" title="O'chirish">🗑</button>`;
                } else {
                    btns = `<button class="ab ab-view" onclick="openSheet(${id})">👁 Ko'rish</button>
              <button class="ab ab-restore" onclick="setStatus(${id},'new')" title="Tiklash">↩</button>
              <button class="ab ab-perm"    onclick="permDelete(${id})" title="Butunlay o'chirish">✕</button>`;
                }
                const nm = fullName(a);
                const ini = initials(nm);
                const cls = a.form_type === 'canada' ? 'av-ca' : 'av-fr';
                h += `<tr>
      <td class="td-idx">${i + 1}</td>
      <td><div class="td-name"><span class="td-av ${cls}">${ini}</span><strong>${highlight(nm)}</strong></div></td>
      <td>${formLabel(a)}</td>
      <td><a href="tel:${a.phone}" class="td-phone">${highlight(a.phone || '—')}</a></td>
      <td class="td-time">${timeAgo(a.created_at)}</td>
      <td>${statusPill(a.status)}</td>
      <td style="white-space:nowrap">${btns}</td>
    </tr>`;
            });
            h += '</tbody></table>';
            wrap.innerHTML = h;
        }

        function initials(nm) {
            return nm.replace(/[^A-Za-zА-Яа-яЁёʼ' ]/g, '').trim().split(' ').map(x => x[0] || '').slice(0, 2).join('').toUpperCase() || '?';
        }

        function buildCards(list) {
            const wrap = document.getElementById('cardsWrap');
            if (!list.length) { wrap.innerHTML = emptyHtml(); return; }
            wrap.innerHTML = list.map(a => {
                const cls = a.form_type === 'canada' ? 'av-ca' : 'av-fr';
                const nm = fullName(a);
                const ini = initials(nm);
                const ft = a.form_type === 'canada' ? '🇨🇦 Kanada' : '🇫🇷 France TCF';
                return `<div class="m-card" onclick="openSheet(${jsId(a.id)})">
      <div class="m-avatar ${cls}">${ini}</div>
      <div class="m-info">
        <div class="m-name">${highlight(nm)}</div>
        <div class="m-sub">${highlight(a.phone || '—')} · ${ft}</div>
        <div class="m-meta">${statusPill(a.status)} <span class="m-time">${timeAgo(a.created_at)}</span></div>
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
            const item = data.find(a => String(a.id) === String(id));
            if (item) item.status = status;
            render();
            await DB.setStatus(id, status);
            data = Local.all();
            updateRemoteBadge();
            render();
        }

        async function permDelete(id) {
            if (!confirm("Butunlay o'chirilsinmi? Bu ariza localStorage'dan ham o'chadi!")) return;
            data = data.filter(a => String(a.id) !== String(id));
            render();
            await DB.delete(id);
            data = Local.all();
            updateRemoteBadge();
            render();
        }

        async function clearTab() {
            if (curTab === 'deleted') {
                if (!confirm("O'chirilganlar to'liq tozalansinmi? Bu amalni qaytarib bo'lmaydi (localStorage'dan ham o'chadi)!")) return;
                data = data.filter(a => a.status !== 'deleted');
                render();
                await DB.delByStatus('deleted');
                data = Local.all();
                updateRemoteBadge();
                render();
            } else {
                const lbl = curTab === 'new' ? 'yangi' : 'tekshirilgan';
                if (!confirm(`Barcha ${lbl} arizalar o'chirilganlar bo'limiga o'tkazilsinmi?`)) return;
                const ids = data.filter(a => a.status === curTab).map(a => a.id);
                data.forEach(a => { if (ids.includes(a.id)) a.status = 'deleted'; });
                render();
                for (const id of ids) await DB.setStatus(id, 'deleted');
                data = Local.all();
                updateRemoteBadge();
                render();
            }
        }

        // ── Export / Import (zaxira) ──────────────────────────
        function exportApps() {
            const list = Local.all();
            const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const d = new Date();
            const stamp = d.toISOString().slice(0, 10);
            a.href = url;
            a.download = 'france-tcf-arizalar-' + stamp + '.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importApps(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(reader.result);
                    if (!Array.isArray(parsed)) throw new Error('JSON massiv emas');
                    const merged = mergeApps(Local.all(), parsed);
                    Local.saveAll(merged);
                    data = merged;
                    render();
                    alert('Import qilindi: jami ' + merged.length + ' ta ariza (localStorage).');
                } catch (err) {
                    alert('Import xato: ' + err.message);
                }
            };
            reader.readAsText(file);
        }

        function triggerImport() {
            const inp = document.getElementById('importFile');
            if (inp) inp.click();
        }

        // ── Bottom sheet ──────────────────────────────────────
        function openSheet(id) {
            const a = data.find(x => String(x.id) === String(id));
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
            const a = data.find(x => String(x.id) === String(sheetId)); if (!a) return;
            const next = a.status === 'new' ? 'checked' : 'new';
            const id = a.id;
            closeSheetModal();
            setStatus(id, next);
        }

        async function sheetDel() {
            const a = data.find(x => String(x.id) === String(sheetId)); if (!a) return;
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

        // Sheet'ni ESC bilan yopish
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('sheetOverlay')?.classList.contains('open')) {
                closeSheetModal();
            }
        });

        // ── Loading overlay ───────────────────────────────────
        function showLoading() { document.getElementById('loadingOverlay').classList.add('open'); }
        function hideLoading() { document.getElementById('loadingOverlay').classList.remove('open'); }

        // ── Init ──────────────────────────────────────────────
        window.addEventListener('DOMContentLoaded', () => {
            if (sessionStorage.getItem('adm') === '1') enterAdmin();
            initReveal();
            initNavScroll();
            initScrollProgress();
            initTilt();
            initMagnetic();
            initBackTop();
            initMobileBar();
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
                        // Sonlarni animatsiya bilan sanash
                        en.target.querySelectorAll('[data-count]').forEach(animateCount);
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

        // ── Scroll progress bar ───────────────────────────────
        function initScrollProgress() {
            const bar = document.getElementById('scrollProgress');
            if (!bar) return;
            const onScroll = () => {
                const h = document.documentElement;
                const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
                bar.style.width = (scrolled * 100).toFixed(2) + '%';
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }

        // ── Raqamlarni sanash animatsiyasi ────────────────────
        function animateCount(el) {
            if (el.dataset.done) return;
            el.dataset.done = '1';
            const target = parseFloat(el.dataset.count);
            if (isNaN(target)) return;
            const prefix = el.dataset.prefix || '';
            const suffix = el.dataset.suffix || '';
            const dur = 1400;
            const start = performance.now();
            const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
            const step = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
                el.textContent = prefix + fmt(target * eased) + suffix;
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }

        // ── 3D tilt + spotlight (faqat pointer: fine) ─────────
        function initTilt() {
            if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const cards = document.querySelectorAll('.course-card, .info-card, .ee-card');
            cards.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    const r = card.getBoundingClientRect();
                    const x = e.clientX - r.left;
                    const y = e.clientY - r.top;
                    const rx = ((y / r.height) - 0.5) * -6;
                    const ry = ((x / r.width) - 0.5) * 6;
                    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
                    card.style.setProperty('--mx', x + 'px');
                    card.style.setProperty('--my', y + 'px');
                });
                card.addEventListener('mouseleave', () => {
                    card.style.transform = '';
                });
            });
        }

        // ── Magnetic CTA tugmalari ────────────────────────────
        function initMagnetic() {
            if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            document.querySelectorAll('.cta-btn, .cta-ghost, .submit-btn, .consent-btn').forEach(btn => {
                btn.addEventListener('mousemove', (e) => {
                    const r = btn.getBoundingClientRect();
                    const mx = e.clientX - r.left - r.width / 2;
                    const my = e.clientY - r.top - r.height / 2;
                    btn.style.transform = `translate(${mx * 0.18}px, ${my * 0.28}px)`;
                });
                btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
            });
        }

        // ── Back to top tugmasi ───────────────────────────────
        function initBackTop() {
            const btn = document.getElementById('backTop');
            if (!btn) return;
            const onScroll = () => btn.classList.toggle('show', window.scrollY > 600);
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }

        // ── Mobil pastki harakat paneli ───────────────────────
        function initMobileBar() {
            const bar = document.getElementById('mobileBar');
            if (!bar) return;
            const reg = document.getElementById('registration');
            const update = () => {
                // Hero'dan o'tgach ko'rsatamiz
                const passedHero = window.scrollY > 400;
                // Ro'yxat formasi ekranda bo'lsa, panelni yashiramiz (takror tugma bo'lmasin)
                let inForm = false;
                if (reg) {
                    const r = reg.getBoundingClientRect();
                    inForm = r.top < window.innerHeight * 0.75 && r.bottom > 0;
                }
                bar.classList.toggle('show', passedHero && !inForm);
            };
            window.addEventListener('scroll', update, { passive: true });
            window.addEventListener('resize', update, { passive: true });
            update();
        }

