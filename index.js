
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
            setStatus: (id, st) => api(TBL + '?id=eq.' + id, 'PATCH', { status: st }, 'return=minimal'),
            delete: (id) => api(TBL + '?id=eq.' + id, 'DELETE'),
            delByStatus: (st) => api(TBL + '?status=eq.' + st, 'DELETE'),
        };

        // ── Form ──────────────────────────────────────────────
        async function submitForm(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.disabled = true; btn.textContent = 'Yuklanmoqda...';
            try {
                await DB.insert({
                    fname: document.getElementById('f_fname').value.trim(),
                    lname: document.getElementById('f_lname').value.trim(),
                    age: +document.getElementById('f_age').value,
                    gender: document.getElementById('f_gender').value,
                    phone: document.getElementById('f_phone').value.trim(),
                    status: 'new'
                });
                document.getElementById('regForm').reset();
                showMsg('msgOk');
            } catch { showMsg('msgErr'); }
            btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish →";
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
            // Counts
            ['new', 'checked', 'deleted'].forEach(s => {
                document.getElementById('cnt_' + s).textContent = grp[s].length;
                document.getElementById('s_' + s).textContent = grp[s].length;
            });
            document.getElementById('s_total').textContent = grp.new.length + grp.checked.length;

            const list = grp[curTab] || [];
            buildTable(list);
            buildCards(list);
        }

        function buildTable(list) {
            const wrap = document.getElementById('tblWrap');
            if (!list.length) { wrap.innerHTML = emptyHtml(); return; }

            let h = `<table><thead><tr>
    <th>#</th><th>Ism Familiya</th><th>Yosh</th><th>Jinsi</th><th>Telefon</th><th>Sana</th><th>Amal</th>
  </tr></thead><tbody>`;

            list.forEach((a, i) => {
                const gb = a.gender === 'Erkak' ? `<span class="badge b-m">Erkak</span>` : `<span class="badge b-f">Ayol</span>`;
                const ds = new Date(a.created_at).toLocaleString('uz-UZ');
                let btns = '';
                if (curTab === 'new') {
                    btns = `<button class="ab ab-check" onclick="setStatus(${a.id},'checked')">✓ Tekshirildi</button>
              <button class="ab ab-del"   onclick="setStatus(${a.id},'deleted')">🗑</button>`;
                } else if (curTab === 'checked') {
                    btns = `<button class="ab ab-back"    onclick="setStatus(${a.id},'new')">↩ Qaytarish</button>
              <button class="ab ab-del"      onclick="setStatus(${a.id},'deleted')">🗑</button>`;
                } else {
                    btns = `<button class="ab ab-restore" onclick="setStatus(${a.id},'new')">↩ Tiklash</button>
              <button class="ab ab-perm"    onclick="permDelete(${a.id})">✕ O'chirish</button>`;
                }
                h += `<tr>
      <td>${i + 1}</td>
      <td><strong>${a.fname} ${a.lname}</strong></td>
      <td>${a.age}</td><td>${gb}</td>
      <td><a href="tel:${a.phone}" style="color:var(--navy);font-weight:600;text-decoration:none">${a.phone}</a></td>
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
                const cls = a.gender === 'Erkak' ? 'av-m' : 'av-f';
                const ini = (a.fname[0] || '') + (a.lname[0] || '');
                return `<div class="m-card" onclick="openSheet(${a.id})">
      <div class="m-avatar ${cls}">${ini}</div>
      <div class="m-info">
        <div class="m-name">${a.fname} ${a.lname}</div>
        <div class="m-sub">${a.phone} · ${a.age} yosh · ${a.gender}</div>
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
            data = data.filter(a => a.id !== id);   // optimistic: ro'yxatdan olib tashlash
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
            document.getElementById('sh_name').textContent = a.fname + ' ' + a.lname;
            const ds = new Date(a.created_at).toLocaleString('uz-UZ');
            const statusLabel = { new: '🔴 Yangi', checked: '✅ Tekshirilgan', deleted: '🗑 O\'chirilgan' };
            document.getElementById('sh_rows').innerHTML = `
    <div class="sheet-row"><span class="s-lbl">Telefon</span><span class="s-val">${a.phone}</span></div>
    <div class="sheet-row"><span class="s-lbl">Yosh</span><span class="s-val">${a.age}</span></div>
    <div class="sheet-row"><span class="s-lbl">Jinsi</span><span class="s-val">${a.gender}</span></div>
    <div class="sheet-row"><span class="s-lbl">Holat</span><span class="s-val">${statusLabel[a.status] || a.status}</span></div>
    <div class="sheet-row"><span class="s-lbl">Sana</span><span class="s-val" style="font-size:.8rem">${ds}</span></div>
  `;
            document.getElementById('sh_call').href = 'tel:' + a.phone;

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

        // ── Init ──────────────────────────────────────────────
        window.addEventListener('DOMContentLoaded', () => {
            if (sessionStorage.getItem('adm') === '1') enterAdmin();
        });
