let U = null, reg = false, PD = 0, code = "";
let cart = DB.get("cart", {});
const F = {cat: "Tất cả", q: "", sort: "", stock: false, fav: false, n: 8};
const wish = () => DB.get("wish", []);
const rate = id => { const r = DB.get("reviews", []).filter(x => x.pid === id); return {n: r.length, avg: r.length ? r.reduce((a, x) => a + x.stars, 0) / r.length : 0}; };
const stars = a => a ? "★".repeat(Math.round(a)) + "☆".repeat(5 - Math.round(a)) : "Chưa có đánh giá";
const thumb = p => `background:${esc(p.color)}${p.img ? ` center/cover url(${esc(p.img)})` : ""}`;
const drawer = o => { $("#drawer").classList.toggle("on", o); $("#overlay").classList.toggle("on", o); };

/* ---------- Danh sách sản phẩm ---------- */
function chips() {
  const cs = ["Tất cả", ...new Set(products().map(p => p.cat))];
  $("#chips").innerHTML = cs.map(c => `<button class="chip" aria-pressed="${!F.fav && c === F.cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")
    + `<button class="chip" aria-pressed="${F.fav}" data-favview>♥ Yêu thích (${wish().length})</button>`;
}
function grid() {
  let l = products().filter(p => (F.fav ? wish().includes(p.id) : (F.cat === "Tất cả" || p.cat === F.cat))
    && p.name.toLowerCase().includes(F.q.toLowerCase()) && (!F.stock || p.stock > 0));
  if (F.sort === "asc") l.sort((a, b) => a.price - b.price);
  if (F.sort === "desc") l.sort((a, b) => b.price - a.price);
  if (F.sort === "rate") l.sort((a, b) => rate(b.id).avg - rate(a.id).avg);
  const shown = l.slice(0, F.n);
  $("#grid").innerHTML = shown.length ? shown.map(p => { const r = rate(p.id); return `
    <article class="card">
      <button class="thumb" style="${thumb(p)}" data-open="${p.id}" aria-label="Xem ${esc(p.name)}">${esc(p.cat)}</button>
      <button class="heart" data-fav="${p.id}" aria-label="Yêu thích">${wish().includes(p.id) ? "♥" : "♡"}</button>
      <div class="info"><h3 data-open="${p.id}">${esc(p.name)}</h3><small>${esc(p.note)}</small>
        <span class="stars">${stars(r.avg)} ${r.n ? `<small>(${r.n})</small>` : ""}</span>
        <div class="price">${fmt(p.price)}</div>
        <button class="add" data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Hết hàng" : "Thêm vào giỏ"}</button>
      </div></article>`; }).join("") : `<p class="empty">Không tìm thấy sản phẩm phù hợp.</p>`;
  $("#more").hidden = l.length <= F.n;
}

/* ---------- Chi tiết sản phẩm + đánh giá ---------- */
function openPD(id) {
  const p = products().find(x => x.id === id); if (!p) return; PD = id;
  const r = rate(id), rv = DB.get("reviews", []).filter(x => x.pid === id).reverse();
  const rel = products().filter(x => x.cat === p.cat && x.id !== id).slice(0, 3);
  $("#pdb").innerHTML = `<div class="pd"><div class="pdimg" style="${thumb(p)}"></div><div>
    <h2>${esc(p.name)}</h2><p class="muted">${esc(p.cat)} · ${esc(p.note)}</p>
    <p class="stars">${stars(r.avg)} <small>(${r.n})</small></p>
    <div class="price big">${fmt(p.price)}</div><p>${esc(p.desc)}</p>
    <p class="muted">${p.stock > 0 ? "Còn " + p.stock + " sản phẩm" : "Hết hàng"}</p>
    <div class="pdact"><input type="number" id="pdq" min="1" max="${p.stock}" value="1" aria-label="Số lượng">
      <button class="btn" data-pdadd="${p.id}" ${p.stock < 1 ? "disabled" : ""}>Thêm vào giỏ</button>
      <button class="chip" data-fav="${p.id}">${wish().includes(p.id) ? "♥ Đã thích" : "♡ Yêu thích"}</button></div></div></div>
    <h3>Đánh giá</h3>
    ${U ? `<form id="rf"><div class="pdact"><select name="stars" aria-label="Số sao"><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select>
      <input name="text" placeholder="Chia sẻ cảm nhận của bạn" maxlength="300" required style="flex:1;min-width:180px"><button class="btn">Gửi</button></div></form>`
      : `<p class="muted">Đăng nhập để viết đánh giá.</p>`}
    ${rv.length ? rv.map(x => `<div class="rev"><b>${esc(x.name)}</b> <span class="stars">${"★".repeat(x.stars)}</span><br>${esc(x.text)}</div>`).join("") : `<p class="muted">Chưa có đánh giá nào.</p>`}
    ${rel.length ? `<h3>Sản phẩm cùng loại</h3><div class="mini-grid">${rel.map(x => `<button data-open="${x.id}"><b>${esc(x.name)}</b><br>${fmt(x.price)}</button>`).join("")}</div>` : ""}`;
  if (!$("#pd").open) $("#pd").showModal();
}

/* ---------- Giỏ hàng ---------- */
function cartUI() {
  const P = products();
  for (const id in cart) if (!P.some(p => p.id == id)) delete cart[id];
  const ids = Object.keys(cart);
  $("#items").innerHTML = ids.length ? ids.map(id => {
    const p = P.find(x => x.id == id), q = cart[id];
    return `<div class="item"><strong>${esc(p.name)}</strong><span>${fmt(p.price * q)}</span>
      <div class="qty"><button data-dec="${id}" aria-label="Giảm">−</button><span>${q}</span><button data-inc="${id}" aria-label="Tăng">+</button></div>
      <button class="rm" data-rm="${id}">Xóa</button></div>`;
  }).join("") : `<p class="empty">Giỏ hàng đang trống.</p>`;
  const t = calc(cart, code); const m = $("#cmsg");
  if (code) { m.className = "msg" + (t.err ? "" : " ok"); m.textContent = t.err || "Đã áp dụng mã " + code; } else m.textContent = "";
  $("#sum").innerHTML = `<div class="row"><span>Tạm tính</span><span>${fmt(t.sub)}</span></div>
    <div class="row"><span>Giảm giá</span><span>−${fmt(t.d)}</span></div>
    <div class="row"><span>Phí giao hàng</span><span>${fmt(t.ship)}</span></div>
    <div class="total"><span>Tổng cộng</span><span>${fmt(t.total)}</span></div>`;
  $("#count").textContent = ids.reduce((a, id) => a + cart[id], 0);
  $("#checkout").disabled = !ids.length || !!t.err;
  DB.set("cart", cart);
}
function setQty(id, d) {
  const p = products().find(x => x.id == id), n = (cart[id] || 0) + d;
  if (n > p.stock) return toast("Chỉ còn " + p.stock + " sản phẩm");
  n <= 0 ? delete cart[id] : cart[id] = n; cartUI();
}

/* ---------- Tài khoản ---------- */
function acct() {
  U = me();
  $("#acct").textContent = U ? `Xin chào, ${U.name}` : "Đăng nhập";
  $("#myOrders").hidden = !U; $("#adm").hidden = !(U && U.role === "admin");
}
function openAuth(msg = "") { $("#aerr").textContent = msg; $("#auth").showModal(); }
function refresh() { grid(); chips(); cartUI(); if ($("#pd").open) openPD(PD); }

function ordersUI() {
  const l = orders().filter(o => o.uid === U.id);
  $("#olist").innerHTML = l.length ? l.map(o => `<div class="item">
    <strong>#${o.id} · ${esc(o.status)}</strong><span>${fmt(o.total)}</span>
    <small>${o.items.map(i => esc(i.name) + " ×" + i.qty).join(", ")}</small>
    <small>${dt(o.at)} · ${esc(o.pay)}</small>
    <small class="tl">${o.log.map(x => esc(x.s)).join(" → ")}</small>
    <span><button class="rm" data-inv="${o.id}">Hóa đơn</button><button class="rm" data-again="${o.id}">Mua lại</button>${o.status === "Mới" ? `<button class="rm" data-cancel="${o.id}">Hủy đơn</button>` : ""}</span></div>`).join("")
    : `<p class="empty">Bạn chưa có đơn hàng nào.</p>`;
}

/* ---------- Sự kiện ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button,h3") || e.target, d = t.dataset || {};
  if (d.cat) { F.cat = d.cat; F.fav = false; F.n = 8; chips(); grid(); }
  if ("favview" in d) { F.fav = !F.fav; F.n = 8; chips(); grid(); }
  if (d.open) openPD(+d.open);
  if (d.add) { setQty(+d.add, 1); toast("Đã thêm vào giỏ hàng"); }
  if (d.pdadd) { const q = Math.max(1, +$("#pdq").value || 1); setQty(+d.pdadd, q); toast("Đã thêm vào giỏ hàng"); }
  if (d.inc) setQty(+d.inc, 1);
  if (d.dec) setQty(+d.dec, -1);
  if (d.rm) { delete cart[d.rm]; cartUI(); }
  if (d.fav) { const w = wish(), id = +d.fav; DB.set("wish", w.includes(id) ? w.filter(x => x !== id) : [...w, id]); refresh(); }
  if (d.inv) invoice(orders().find(o => o.id === +d.inv));
  if (d.again) {
    const o = orders().find(x => x.id === +d.again);
    o.items.forEach(i => { const p = products().find(x => x.id === i.id); if (p && p.stock > 0) cart[i.id] = Math.min(p.stock, (cart[i.id] || 0) + i.qty); });
    cartUI(); $("#ord").close(); drawer(true); toast("Đã thêm lại vào giỏ");
  }
  if (d.cancel && confirm("Hủy đơn hàng này?")) {
    const o = orders().find(x => x.id === +d.cancel);
    if (o && o.uid === U.id && o.status === "Mới") { setStatus(o.id, "Đã hủy"); toast("Đã hủy đơn"); ordersUI(); refresh(); }
  }
  if (t.hasAttribute && t.hasAttribute("data-close")) t.closest("dialog").close();
});
$("#more").onclick = () => { F.n += 8; grid(); };
$("#q").oninput = e => { F.q = e.target.value; F.n = 8; grid(); };
$("#sort").onchange = e => { F.sort = e.target.value; grid(); };
$("#instock").onchange = e => { F.stock = e.target.checked; grid(); };
$("#openCart").onclick = () => drawer(true);
$("#closeCart").onclick = $("#overlay").onclick = () => drawer(false);
document.addEventListener("keydown", e => e.key === "Escape" && drawer(false));
$("#theme").onclick = () => { DB.set("theme", DB.get("theme", "light") === "dark" ? "light" : "dark"); applyTheme(); };
$("#cp").onchange = e => { code = e.target.value.trim().toUpperCase(); cartUI(); };

$("#acct").onclick = () => {
  if (!U) return openAuth();
  const f = $("#pf"); f.name.value = U.name; f.phone.value = U.phone || ""; f.addr.value = U.addr || ""; f.npass.value = ""; $("#perr").textContent = ""; $("#prof").showModal();
};
$("#logout").onclick = () => { DB.set("session", 0); $("#prof").close(); acct(); refresh(); toast("Đã đăng xuất"); };
$("#swap").onclick = () => {
  reg = !reg; $("#nm").hidden = !reg; $("#at").textContent = reg ? "Đăng ký" : "Đăng nhập";
  $("#swap").textContent = reg ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký";
};
$("#af").onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), email = f.email.trim().toLowerCase(), h = await sha(f.pass), US = users();
  if (reg) {
    if (!f.name.trim()) return $("#aerr").textContent = "Vui lòng nhập họ tên";
    if (US.some(u => u.email === email)) return $("#aerr").textContent = "Email đã được đăng ký";
    const u = {id: Date.now(), name: f.name.trim(), email, pass: h, role: "user", phone: "", addr: ""};
    DB.set("users", [...US, u]); DB.set("session", u.id);
  } else {
    const u = US.find(x => x.email === email && x.pass === h);
    if (!u) return $("#aerr").textContent = "Sai email hoặc mật khẩu";
    DB.set("session", u.id);
  }
  $("#auth").close(); e.target.reset(); acct(); refresh(); toast("Xin chào " + U.name);
};
$("#pf").onsubmit = async e => {
  e.preventDefault(); const f = e.target, US = users(), u = US.find(x => x.id === U.id);
  u.name = f.name.value.trim(); u.phone = f.phone.value.trim(); u.addr = f.addr.value.trim();
  if (f.npass.value) u.pass = await sha(f.npass.value);
  DB.set("users", US); acct(); $("#prof").close(); toast("Đã lưu thông tin");
};

$("#checkout").onclick = () => {
  drawer(false); if (!U) return openAuth("Vui lòng đăng nhập để đặt hàng");
  const f = $("#of"); f.name.value = U.name; f.phone.value = U.phone || ""; f.addr.value = U.addr || "";
  $("#pay").innerHTML = PAY.map(p => `<option>${p}</option>`).join(""); $("#oerr").textContent = ""; $("#dlg").showModal();
};
$("#of").onsubmit = e => {
  e.preventDefault();
  try {
    const f = Object.fromEntries(new FormData(e.target)), o = placeOrder(U, f, cart, code);
    if (!U.phone || !U.addr) { const US = users(), u = US.find(x => x.id === U.id); u.phone ||= f.phone; u.addr ||= f.addr; DB.set("users", US); acct(); }
    cart = {}; code = ""; $("#cp").value = ""; $("#dlg").close(); e.target.reset(); refresh();
    $("#doneb").innerHTML = `<h2>Đặt hàng thành công</h2><p style="margin:12px 0">Mã đơn <b>#${o.id}</b> · Tổng ${fmt(o.total)}</p>
      ${o.pay === PAY[1] ? `<p>Vui lòng chuyển khoản tới: <b>${esc(cfg().bank)}</b><br>Nội dung: <b>DH${o.id}</b></p>` : o.pay === PAY[2] ? `<p>Chuyển tiền MoMo với nội dung <b>DH${o.id}</b>. Chúng tôi sẽ liên hệ xác nhận.</p>` : `<p>Bạn thanh toán khi nhận hàng.</p>`}
      <p style="margin-top:16px"><button class="btn" data-inv="${o.id}">Xem hóa đơn</button> <button class="lnk" data-close>Đóng</button></p>`;
    $("#done").showModal();
  } catch (x) { $("#oerr").textContent = x.message; }
};
$("#myOrders").onclick = () => { ordersUI(); $("#ord").showModal(); };
document.addEventListener("submit", e => {
  if (e.target.id !== "rf") return; e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), R = DB.get("reviews", []).filter(x => !(x.pid === PD && x.uid === U.id));
  R.push({pid: PD, uid: U.id, name: U.name, stars: +f.stars, text: f.text.trim(), at: new Date().toISOString()});
  DB.set("reviews", R); refresh(); toast("Cảm ơn bạn đã đánh giá");
});
window.addEventListener("storage", () => { acct(); refresh(); });

/* ---------- Khởi tạo ---------- */
(async () => { await ready; $("#logo").textContent = cfg().name; document.title = cfg().name + " – Cà phê rang tươi"; acct(); refresh(); })();
