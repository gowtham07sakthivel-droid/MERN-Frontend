import { renderProductCard } from "/components/product-card.js";
import "/pages/auth.js";

const products = [
  {id:1,name:"Nova X Smartphone",category:"Mobiles",price:24999,emoji:"📱",tag:"BESTSELLER",detail:"8GB RAM · 128GB storage"},
  {id:2,name:"AeroBook Pro Laptop",category:"Laptops",price:58999,emoji:"💻",tag:"POPULAR",detail:"16GB RAM · 512GB SSD"},
  {id:3,name:"Pulse Wireless Headphones",category:"Audio",price:3499,emoji:"🎧",tag:"HOT DEAL",detail:"Noise cancellation · 30h battery"},
  {id:4,name:"TimeFit Smart Watch",category:"Wearables",price:4999,emoji:"⌚",tag:"NEW",detail:"Health tracking · AMOLED display"},
  {id:5,name:"BassPods Earbuds",category:"Audio",price:1999,emoji:"🎵",tag:"VALUE PICK",detail:"Clear calls · Compact case"},
  {id:6,name:"TabView Tablet",category:"Mobiles",price:18999,emoji:"📲",tag:"TRENDING",detail:"Large display · All-day battery"},
  {id:7,name:"GamePro Controller",category:"Wearables",price:2799,emoji:"🎮",tag:"GAMING",detail:"Wireless · Ergonomic design"},
  {id:8,name:"SlimCharge Power Bank",category:"Mobiles",price:1499,emoji:"🔋",tag:"ESSENTIAL",detail:"20,000mAh · Fast charging"}
];
let cart = JSON.parse(localStorage.getItem("techkart-cart") || "[]");
let activeFilter = "All";
let searchTerm = "";

const $ = (id) => document.getElementById(id);
const money = (n) => "₹" + n.toLocaleString("en-IN");

function saveCart(){localStorage.setItem("techkart-cart",JSON.stringify(cart));updateCartCount();}
function updateCartCount(){$("cartCount").textContent=cart.reduce((sum,item)=>sum+item.qty,0);}
function showToast(message){const toast=$("toast");toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),1800);}

function renderProducts(){
  const filtered=products.filter(p=>(activeFilter==="All"||p.category===activeFilter)&&(`${p.name} ${p.category} ${p.detail}`).toLowerCase().includes(searchTerm.toLowerCase()));
  $("productGrid").innerHTML=filtered.length?filtered.map(renderProductCard).join(""):`<div class="no-results">No gadgets found. Try another search.</div>`;
}
function addToCart(id){
  const product=products.find(p=>p.id===id);const found=cart.find(i=>i.id===id);
  if(found)found.qty++;else cart.push({...product,qty:1});
  saveCart();showToast(product.name+" added to cart");
}
function showPage(page){
  document.querySelectorAll(".page").forEach(el=>el.classList.remove("active"));
  const target=$(page+"Page");if(target)target.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  if(page==="cart")renderCart();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderCart(){
  const area=$("cartContent");
  if(!cart.length){area.innerHTML=`<div class="empty-cart"><div>🛒</div><h3>Your cart is empty</h3><p>Looks like you haven't added any gadgets yet.</p><button class="primary-btn" id="continueShopping">Explore gadgets →</button></div>`;return;}
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  area.innerHTML=`<div class="cart-layout"><div>${cart.map(i=>`<div class="cart-item"><div class="cart-item-icon">${i.emoji}</div><div class="cart-item-info"><b>${i.name}</b><small>${money(i.price)} each</small></div><div class="qty-controls"><button data-qty="${i.id}" data-change="-1">−</button><b>${i.qty}</b><button data-qty="${i.id}" data-change="1">+</button></div><b>${money(i.price*i.qty)}</b><button class="remove-btn" data-remove="${i.id}">Remove</button></div>`).join("")}</div><aside class="summary"><h3>Price details</h3><div class="summary-line"><span>Subtotal</span><b>${money(subtotal)}</b></div><div class="summary-line"><span>Delivery</span><b style="color:#16834b">FREE</b></div><div class="summary-line summary-total"><span>Total</span><b>${money(subtotal)}</b></div><button class="primary-btn full" id="checkoutBtn">Continue to checkout →</button><small class="form-note">Demo only — checkout and payment are not connected.</small></aside></div>`;
}
document.addEventListener("click",e=>{
  const pageLink=e.target.closest("[data-page]");if(pageLink){e.preventDefault();showPage(pageLink.dataset.page);}
  const add=e.target.closest("[data-add]");if(add)addToCart(Number(add.dataset.add));
  const filter=e.target.closest("[data-filter]");if(filter){activeFilter=filter.dataset.filter;document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("selected",b===filter));renderProducts();}
  const category=e.target.closest("[data-category]");if(category){activeFilter=category.dataset.category;document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter===activeFilter));renderProducts();$("productsSection").scrollIntoView({behavior:"smooth"});}
  const remove=e.target.closest("[data-remove]");if(remove){cart=cart.filter(i=>i.id!==Number(remove.dataset.remove));saveCart();renderCart();}
  const qty=e.target.closest("[data-qty]");if(qty){const item=cart.find(i=>i.id===Number(qty.dataset.qty));item.qty+=Number(qty.dataset.change);if(item.qty<=0)cart=cart.filter(i=>i.id!==item.id);saveCart();renderCart();}
  if(e.target.closest("#cartNav"))showPage("cart");
  if(e.target.closest("#exploreBtn")||e.target.closest("#showAllBtn")){$("productsSection").scrollIntoView({behavior:"smooth"});activeFilter="All";document.querySelectorAll(".filter-chip").forEach(b=>b.classList.toggle("selected",b.dataset.filter==="All"));renderProducts();}
  if(e.target.closest("#continueShopping"))showPage("home");
  if(e.target.closest("#checkoutBtn"))showToast("Demo checkout: payment is not enabled yet.");
});
$("searchForm").addEventListener("submit",e=>{e.preventDefault();searchTerm=$("searchInput").value.trim();showPage("home");renderProducts();$("productsSection").scrollIntoView({behavior:"smooth"});});
$("searchInput").addEventListener("input",()=>{searchTerm=$("searchInput").value.trim();renderProducts();});
if (new URLSearchParams(location.search).has("resetToken")) showPage("signin");
renderProducts();updateCartCount();
