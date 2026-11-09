let TAB = "dash", OF = {st: "", q: ""};
const TABS = {dash: "Tổng quan", orders: "Đơn hàng", prods: "Sản phẩm", coupons: "Mã giảm giá", custs: "Khách hàng", settings: "Cài đặt"};
const live = () => orders().filter(o => o.status !== "Đã hủy");
const day = d => new Date(d).toLocaleDateString("sv-SE");   // YYYY-MM-DD theo giờ máy

function dl(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function resize(file) {   // thu nhỏ ảnh để không đầy bộ nhớ trình duyệt
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, 600 / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", .8)); }; im.onerror = rej; im.src = r.result; };
    r.onerror = rej; r.readAsDataURL(file);
  });
}

/* ---------- Các tab ---------- */
function dash() {
  const L = live(), rev = L.reduce((a, o) => a + o.total, 0), O = orders();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const by = days.map(d => L.filter(o => day(o.at) === day(d)).reduce((a, o) => a + o.total, 0)), mx = Math.max(...by, 1);
  const top = {}; L.forEach(o => o.items.forEach(i => top[i.name] = (top[i.name] || 0) + i.qty));
  const tp = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), low = products().filter(p => p.stock <= 5);
  return `<div class="stats">
    <div><b>${O.length}</b><span>Tổng đơn</span></div><div><b>${O.filter(o => o.status === "Mới").length}</b><span>Đơn mới</span></div>
    <div><b>${fmt(rev)}</b><span>Doanh thu (không tính đơn hủy)</span></div><div><b>${users().filter(u => u.role !== "admin").length}</b><span>Khách hàng</span></div></div>
    <div class="two"><div class="box"><h3 style="margin-top:0">Doanh thu 7 ngày</h3>
      <div class="bars">${by.map((v, i) => `<div title="${fmt(v)}"><i style="height:${Math.round(v / mx * 130)}px"></i>${days[i].getDate()}/${days[i].getMonth() + 1}</div>`).join("")}</div></div>
    <div class="box"><h3 style="margin-top:0">Bán chạy</h3>${tp.length ? tp.map(t => `<div class="row"><span>${esc(t[0])}</span><b>${t[1]}</b></div>`).join("") : `<p class="muted">Chưa có dữ liệu.</p>`}
      <h3>Sắp hết hàng</h3>${low.length ? low.map(p => `<div class="row"><span>${esc(p.name)}</span><b class="low">${p.stock}</b></div>`).join("") : `<p class="muted">Tồn kho ổn.</p>`}</div></div>`;
}
function ordersTable() {
  const q = OF.q.toLowerCase(), l = orders().filter(o => (!OF.st || o.status === OF.st) && (!q || String(o.id).includes(q) || (o.name + o.phone).toLowerCase().includes(q)));
  return `<table><tr><th>#</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th></th></tr>` + (l.length ? l.map(o => `<tr>
    <td>${o.id}<br><small>${dt(o.at)}</small></td><td>${esc(o.name)}<br><small>${esc(o.phone)} · ${esc(o.addr)}</small></td>
    <td>${o.items.map(i => esc(i.name) + " ×" + i.qty).join("<br>")}${o.coupon ? `<br><small>Mã: ${esc(o.coupon)}</small>` : ""}${o.note ? `<br><small>Ghi chú: ${esc(o.note)}</small>` : ""}</td>
    <td>${fmt(o.total)}<br><small>${esc(o.pay)}</small></td>
    <td><select data-st="${o.id}" ${o.status === "Đã hủy" ? "disabled" : ""}>${STATUS.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
    <td><button class="lnk" data-inv="${o.id}">Hóa đơn</button></td></tr>`).join("") : `<tr><td colspan="6" class="muted">Không có đơn phù hợp.</td></tr>`) + `</table>`;
}
function ordersTab() {
  return `<div class="tools"><input id="oq" placeholder="Tìm mã đơn, tên, SĐT" value="${esc(OF.q)}"><select id="fst"><option value="">Mọi trạng thái</option>${STATUS.map(s => `<option ${s === OF.st ? "selected" : ""}>${s}</option>`).join("")}</select>
    <button class="chip" data-exp>Xuất CSV</button></div><div class="tbl" id="otbl">${ordersTable()}</div>`;
}
function prods() {
  return `<form id="pform" class="pform">
    <input type="hidden" name="pid"><input type="hidden" name="img">
    <input name="name" placeholder="Tên sản phẩm" required><input name="cat" placeholder="Danh mục" required>
    <input name="price" type="number" min="0" placeholder="Giá (₫)" required><input name="stock" type="number" min="0" placeholder="Tồn kho" required>
    <input name="color" type="color" value="#7a4b2a" aria-label="Màu thẻ"><input name="note" placeholder="Mô tả ngắn">
    <textarea name="desc" rows="2" placeholder="Mô tả chi tiết" style="grid-column:1/-1"></textarea>
    <label class="filebtn">Chọn ảnh<input type="file" id="file" accept="image/*" hidden></label><span id="prev"></span>
    <button class="btn">Lưu sản phẩm</button><button type="button" class="chip" data-clear>Nhập mới</button></form>
    <div class="tbl"><table><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn</th><th></th></tr>${products().map(p => `<tr>
    <td><span class="mini" style="background:${esc(p.color)}${p.img ? ` center/cover url(${esc(p.img)})` : ""}"></span>${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${fmt(p.price)}</td>
    <td class="${p.stock <= 5 ? "low" : ""}">${p.stock}</td><td><button class="lnk" data-edit="${p.id}">Sửa</button><button class="lnk" data-del="${p.id}">Xóa</button></td></tr>`).join("")}</table></div>`;
}
function coupons() {
  return `<form id="cform" class="pform"><input name="code" placeholder="Mã (VD: SALE20)" required>
    <select name="type"><option value="pct">Giảm theo %</option><option value="amt">Giảm số tiền (₫)</option></select>
    <input name="value" type="number" min="1" placeholder="Giá trị" required><input name="min" type="number" min="0" placeholder="Đơn tối thiểu (₫)" value="0">
    <button class="btn">Thêm / cập nhật mã</button></form>
    <div class="tbl"><table><tr><th>Mã</th><th>Giảm</th><th>Đơn tối thiểu</th><th>Trạng thái</th><th></th></tr>${DB.get("coupons", []).map(c => `<tr>
    <td><b>${esc(c.code)}</b></td><td>${c.type === "pct" ? c.value + "%" : fmt(c.value)}</td><td>${fmt(c.min)}</td><td>${c.active ? "Đang bật" : "Đã tắt"}</td>
    <td><button class="lnk" data-tgl="${esc(c.code)}">${c.active ? "Tắt" : "Bật"}</button><button class="lnk" data-cdel="${esc(c.code)}">Xóa</button></td></tr>`).join("")}</table></div>`;
}
function custs() {
  const O = orders().filter(o => o.status !== "Đã hủy");
  return `<div class="tbl"><table><tr><th>Khách</th><th>Email</th><th>SĐT</th><th>Số đơn</th><th>Đã chi</th></tr>${users().filter(u => u.role !== "admin").map(u => {
    const m = O.filter(o => o.uid === u.id); return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${m.length}</td><td>${fmt(m.reduce((a, o) => a + o.total, 0))}</td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Chưa có khách đăng ký.</td></tr>`}</table></div>`;
}
function settings() {
  const s = cfg();
  return `<form id="sform" class="box"><h3 style="margin-top:0">Thông tin cửa hàng</h3>
    <label class="field">Tên cửa hàng<input name="name" value="${esc(s.name)}" required></label>
    <label class="field">Phí giao hàng (₫)<input name="ship" type="number" min="0" value="${s.ship}"></label>
    <label class="field">Miễn phí giao hàng từ (₫)<input name="free" type="number" min="0" value="${s.free}"></label>
    <label class="field">Thông tin chuyển khoản<input name="bank" value="${esc(s.bank)}"></label>
    <button class="btn">Lưu cài đặt</button></form>
    <div class="box" style="margin-top:16px"><h3 style="margin-top:0">Sao lưu dữ liệu</h3>
    <p class="muted">Dữ liệu nằm trong trình duyệt này. Hãy xuất file sao lưu định kỳ.</p>
    <p class="pdact"><button class="chip" data-bak>Xuất sao lưu (JSON)</button><label class="filebtn">Nhập sao lưu<input type="file" id="imp" accept=".json" hidden></label><button class="chip" data-rst>Xóa toàn bộ dữ liệu</button></p></div>`;
}
const VIEWS = {dash, orders: ordersTab, prods, coupons, custs, settings};
function render() {
  $("#tabs").innerHTML = Object.entries(TABS).map(([k, v]) => `<button class="chip" aria-pressed="${k === TAB}" data-tab="${k}">${v}</button>`).join("");
  $("#view").innerHTML = VIEWS[TAB]();
}

/* ---------- Sự kiện ---------- */
document.addEventListener("click", e => {
  const d = e.target.dataset;
  if (d.tab) { TAB = d.tab; render(); }
  if (d.inv) invoice(orders().find(o => o.id === +d.inv));
  if ("exp" in d) {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    dl("don-hang.csv", "\ufeff" + ["Mã đơn,Ngày,Khách,SĐT,Địa chỉ,Sản phẩm,Mã giảm,Tổng,Thanh toán,Trạng thái"].concat(orders().map(o =>
      [o.id, dt(o.at), o.name, o.phone, o.addr, o.items.map(i => i.name + " x" + i.qty).join("; "), o.coupon, o.total, o.pay, o.status].map(q).join(","))).join("\n"), "text/csv");
  }
  if ("clear" in d) { const f = $("#pform"); f.reset(); f.elements.pid.value = ""; f.elements.img.value = ""; $("#prev").innerHTML = ""; }
  if (d.edit) {
    const p = products().find(x => x.id === +d.edit), f = $("#pform").elements; f.pid.value = p.id;
    ["name", "cat", "price", "stock", "color", "note", "desc", "img"].forEach(k => f[k].value = p[k] ?? "");
    $("#prev").innerHTML = p.img ? `<img src="${esc(p.img)}" alt="" height="42">` : ""; $("#pform").scrollIntoView({behavior: "smooth", block: "center"});
  }
  if (d.del && confirm("Xóa sản phẩm này?")) { DB.set("products", products().filter(p => p.id !== +d.del)); render(); }
  if (d.tgl) { DB.set("coupons", DB.get("coupons", []).map(c => c.code === d.tgl ? {...c, active: !c.active} : c)); render(); }
  if (d.cdel && confirm("Xóa mã giảm giá?")) { DB.set("coupons", DB.get("coupons", []).filter(c => c.code !== d.cdel)); render(); }
  if ("bak" in d) { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("hr_")) o[k] = localStorage.getItem(k); } dl("sao-luu-" + day(new Date()) + ".json", JSON.stringify(o), "application/json"); }
  if ("rst" in d && confirm("Xóa TOÀN BỘ dữ liệu (sản phẩm, đơn hàng, khách hàng)? Không thể hoàn tác.")) {
    Object.keys(localStorage).filter(k => k.startsWith("hr_")).forEach(k => localStorage.removeItem(k)); location.reload();
  }
});
document.addEventListener("input", e => { if (e.target.id === "oq") { OF.q = e.target.value; $("#otbl").innerHTML = ordersTable(); } });
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "fst") { OF.st = t.value; $("#otbl").innerHTML = ordersTable(); }
  if (t.dataset.st) { try { setStatus(+t.dataset.st, t.value); } catch (x) { toast(x.message); } $("#otbl").innerHTML = ordersTable(); }
  if (t.id === "file" && t.files[0]) { try { const u = await resize(t.files[0]); $("#pform").elements.img.value = u; $("#prev").innerHTML = `<img src="${u}" alt="" height="42">`; } catch (x) { toast("Không đọc được ảnh"); } t.value = ""; }
  if (t.id === "imp" && t.files[0]) {
    try {
      const o = JSON.parse(await t.files[0].text());
      if (!Object.keys(o).length || !Object.keys(o).every(k => k.startsWith("hr_"))) throw 0;
      if (!confirm("Nhập sao lưu sẽ ghi đè dữ liệu hiện tại. Tiếp tục?")) return;
      Object.keys(localStorage).filter(k => k.startsWith("hr_")).forEach(k => localStorage.removeItem(k));
      Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, v)); location.reload();
    } catch (x) { toast("File sao lưu không hợp lệ"); }
  }
});
document.addEventListener("submit", e => {
  const f = e.target, id = f.id; if (!["pform", "cform", "sform"].includes(id)) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f));
  if (id === "pform") {
    const P = products(), p = {id: +v.pid || Math.max(0, ...P.map(x => x.id)) + 1, name: v.name.trim(), cat: v.cat.trim(), price: +v.price, stock: +v.stock, color: v.color, note: v.note.trim(), desc: v.desc.trim(), img: v.img};
    const i = P.findIndex(x => x.id === p.id); i >= 0 ? P[i] = p : P.push(p); if (DB.set("products", P)) { toast("Đã lưu sản phẩm"); render(); }
  }
  if (id === "cform") {
    const c = {code: v.code.trim().toUpperCase(), type: v.type, value: +v.value, min: +v.min || 0, active: true};
    if (c.type === "pct" && c.value > 100) return toast("Phần trăm tối đa là 100");
    DB.set("coupons", [...DB.get("coupons", []).filter(x => x.code !== c.code), c]); toast("Đã lưu mã giảm giá"); render();
  }
  if (id === "sform") { DB.set("settings", {...cfg(), name: v.name.trim(), ship: +v.ship, free: +v.free, bank: v.bank.trim()}); toast("Đã lưu cài đặt"); }
});

async function start() {
  await ready; const u = me(), ok = u && u.role === "admin";
  $("#gate").hidden = ok; $("#panel").hidden = !ok; $("#out").hidden = !ok; if (ok) render();
}
$("#gate").onsubmit = async e => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), h = await sha(f.pass);
  const u = users().find(x => x.email === f.email.trim().toLowerCase() && x.pass === h);
  if (!u) return $("#gerr").textContent = "Sai email hoặc mật khẩu";
  if (u.role !== "admin") return $("#gerr").textContent = "Tài khoản này không có quyền quản trị";
  DB.set("session", u.id); start();
};
$("#out").onclick = () => { DB.set("session", 0); start(); };
start();
