/* ===== Kho dữ liệu dùng chung (localStorage) + nghiệp vụ ===== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Number(n || 0).toLocaleString("vi-VN") + " ₫";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dt = s => new Date(s).toLocaleString("vi-VN");
const STATUS = ["Mới", "Đang giao", "Hoàn tất", "Đã hủy"];
const PAY = ["Thanh toán khi nhận hàng (COD)", "Chuyển khoản ngân hàng", "Ví MoMo"];

const DB = {
  get(k, d) { try { const v = localStorage.getItem("hr_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("hr_" + k, JSON.stringify(v)); return true; } catch (e) { toast("Bộ nhớ trình duyệt đã đầy"); return false; } },
  nextId() { const n = this.get("seq", 1000) + 1; this.set("seq", n); return n; }
};
function toast(m) {
  const t = $("#toast"); if (!t) return;
  t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2200);
}
async function sha(s) {
  try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
  catch (e) { let h = 5381; for (const c of s) h = (h * 33) ^ c.charCodeAt(0); return "x" + (h >>> 0).toString(16); }
}

/* ----- Dữ liệu mẫu (chỉ chạy lần đầu) ----- */
const ready = (async () => {
  if (DB.get("init")) return;
  const P = [
    ["Robusta Đắk Lắk", "Hạt", 145000, 50, "#2B1A10", "Rang đậm · 500g", "Robusta thuần từ Đắk Lắk, rang đậm cho vị đắng sâu, hậu vị cacao. Hợp pha phin và cà phê sữa đá."],
    ["Arabica Cầu Đất", "Hạt", 210000, 30, "#C79A5B", "Rang nhạt · 500g", "Arabica trồng ở độ cao 1.500 m, hương hoa, vị chua thanh. Hợp pha phễu và cold brew."],
    ["Culi Buôn Ma Thuột", "Hạt", 165000, 40, "#5A3720", "Rang vừa · 500g", "Hạt culi tròn, rang vừa, vị đậm và ít chua, body dày."],
    ["Blend Sài Gòn", "Bột", 120000, 60, "#7A4B2A", "Xay sẵn cho phin · 500g", "Phối Robusta và Arabica, xay sẵn độ thô vừa cho phin truyền thống."],
    ["Arabica Sơn La xay", "Bột", 185000, 25, "#A3703C", "Xay vừa · 250g", "Arabica Sơn La xay vừa, vị ngọt hậu, ít đắng."],
    ["Túi lọc Robusta", "Túi lọc", 98000, 80, "#3C2515", "Hộp 15 túi", "Pha nhanh trong 3 phút, tiện cho văn phòng và đi du lịch."],
    ["Phin nhôm inox", "Dụng cụ", 75000, 25, "#8A8F8C", "Size 8", "Phin inox dày, kèm nắp và đĩa lót, dùng bền."],
    ["Máy xay tay", "Dụng cụ", 480000, 10, "#4A5A55", "Lưỡi thép · chỉnh độ mịn", "Máy xay tay lưỡi thép, 5 mức độ mịn từ espresso tới cold brew."]
  ].map((r, i) => ({id: i + 1, name: r[0], cat: r[1], price: r[2], stock: r[3], color: r[4], note: r[5], desc: r[6], img: ""}));
  DB.set("products", P);
  DB.set("users", [{id: 1, name: "Quản trị", email: "admin@shop.local", pass: await sha("admin123"), role: "admin", phone: "", addr: ""}]);
  DB.set("coupons", [{code: "GIAM10", type: "pct", value: 10, min: 0, active: true}, {code: "GIAM30K", type: "amt", value: 30000, min: 200000, active: true}]);
  DB.set("settings", {name: "Hạt Rang", ship: 30000, free: 300000, bank: "Vietcombank 0123456789 – CÔNG TY HẠT RANG"});
  DB.set("orders", []); DB.set("reviews", []); DB.set("init", 1);
})();

/* ----- Truy cập nhanh ----- */
const products = () => DB.get("products", []);
const orders = () => DB.get("orders", []);
const users = () => DB.get("users", []);
const cfg = () => DB.get("settings", {name: "Hạt Rang", ship: 30000, free: 300000, bank: ""});
const me = () => users().find(u => u.id === DB.get("session")) || null;

/* ----- Mã giảm giá & tổng tiền ----- */
function coupon(code, sub) {
  code = (code || "").trim().toUpperCase(); if (!code) return {d: 0};
  const c = DB.get("coupons", []).find(x => x.code === code && x.active);
  if (!c) return {d: 0, err: "Mã giảm giá không hợp lệ"};
  if (sub < c.min) return {d: 0, err: "Đơn tối thiểu " + fmt(c.min) + " để dùng mã này"};
  return {d: c.type === "pct" ? Math.floor(sub * c.value / 100) : Math.min(c.value, sub)};
}
function calc(cart, code) {
  const P = products(); let sub = 0;
  for (const id in cart) { const p = P.find(x => x.id == id); if (p) sub += p.price * cart[id]; }
  const c = coupon(code, sub), s = cfg(), ship = sub && sub - c.d < s.free ? s.ship : 0;
  return {sub, d: c.d, ship, total: sub - c.d + ship, err: c.err};
}

/* ----- Đơn hàng ----- */
function placeOrder(u, info, cart, code) {
  const P = products(), items = [];
  for (const id in cart) {
    const p = P.find(x => x.id == id), q = cart[id];
    if (!p || q < 1 || p.stock < q) throw new Error("Không đủ hàng: " + (p ? p.name : "#" + id));
    items.push({id: p.id, name: p.name, price: p.price, qty: q});
  }
  if (!items.length) throw new Error("Giỏ hàng trống");
  const t = calc(cart, code); if (t.err) throw new Error(t.err);
  items.forEach(i => P.find(p => p.id === i.id).stock -= i.qty);
  const now = new Date().toISOString();
  const o = {id: DB.nextId(), uid: u.id, ...info, items, sub: t.sub, d: t.d, ship: t.ship, total: t.total,
             coupon: t.d ? code.trim().toUpperCase() : "", status: "Mới", at: now, log: [{s: "Mới", at: now}]};
  DB.set("products", P); DB.set("orders", [o, ...orders()]);
  return o;
}
function setStatus(id, st) {
  const O = orders(), o = O.find(x => x.id === id);
  if (!o) throw new Error("Không thấy đơn");
  if (o.status === "Đã hủy") throw new Error("Đơn đã hủy không thể mở lại");
  if (st === "Đã hủy") { const P = products(); o.items.forEach(i => { const p = P.find(x => x.id === i.id); if (p) p.stock += i.qty; }); DB.set("products", P); }
  o.status = st; o.log.push({s: st, at: new Date().toISOString()}); DB.set("orders", O);
}
function invoice(o) {
  const w = open("", "_blank"); if (!w) return toast("Trình duyệt đang chặn cửa sổ mới");
  w.document.write(`<!DOCTYPE html><meta charset="utf-8"><title>Hóa đơn #${o.id}</title>
  <style>body{font:14px system-ui,sans-serif;max-width:640px;margin:30px auto;padding:0 16px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #ccc;text-align:left}.r{text-align:right}</style>
  <h2>${esc(cfg().name)} – Hóa đơn #${o.id}</h2><p>${dt(o.at)}<br>${esc(o.name)} · ${esc(o.phone)}<br>${esc(o.addr)}</p>
  <table><tr><th>Sản phẩm</th><th class="r">SL</th><th class="r">Thành tiền</th></tr>
  ${o.items.map(i => `<tr><td>${esc(i.name)}</td><td class="r">${i.qty}</td><td class="r">${fmt(i.price * i.qty)}</td></tr>`).join("")}</table>
  <p class="r">Tạm tính: ${fmt(o.sub)}<br>Giảm giá: −${fmt(o.d)}<br>Phí giao hàng: ${fmt(o.ship)}<br><b>Tổng cộng: ${fmt(o.total)}</b></p>
  <p>Thanh toán: ${esc(o.pay)}${o.note ? "<br>Ghi chú: " + esc(o.note) : ""}</p>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
function applyTheme() { document.documentElement.dataset.theme = DB.get("theme", "light"); }
applyTheme();
