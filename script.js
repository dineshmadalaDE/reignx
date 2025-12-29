const INVENTORY_URL = "https://script.google.com/macros/s/AKfycbwyReM1duXlXyYXKqB6SEgETBLp22sV4Y6lQx_R76wQRgWY7ZHm1PMSZxdDf554hbBs/exec";
let INVENTORY = [];

document.addEventListener("DOMContentLoaded", () => {
  const fadeElements = document.querySelectorAll(".fade-in");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  fadeElements.forEach(el => observer.observe(el));
});

// function changeImage(src) {
//   const mainImage = document.getElementById("currentImage");
//   mainImage.src = src;

//   document.querySelectorAll(".thumbnails img")
//     .forEach(img => img.classList.remove("active"));

//   event.target.classList.add("active");
// }

function changeImage(src, index) {
  const mainImage = document.getElementById("currentImage");
  mainImage.src = src;

  // track selected image index for lightbox
  currentIndex = index;

  // active thumbnail highlight
  document.querySelectorAll(".thumbnails img")
    .forEach(img => img.classList.remove("active"));

  // use the clicked thumbnail (event is available from inline onclick)
  if (typeof event !== "undefined" && event?.target) {
    event.target.classList.add("active");
  }
}


// ---------- PRODUCT LIGHTBOX (GLOBAL) ----------
let galleryImages = [];
let currentIndex = 0;

function openLightbox(index, images) {
  galleryImages = images;
  currentIndex = index;

  document.getElementById("lightbox-img").src = galleryImages[currentIndex];
  document.getElementById("lightbox").style.display = "flex";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
}

function nextImage() {
  currentIndex = (currentIndex + 1) % galleryImages.length;
  document.getElementById("lightbox-img").src = galleryImages[currentIndex];
}

function prevImage() {
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  document.getElementById("lightbox-img").src = galleryImages[currentIndex];
}

function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('active');
}

function handleInterest(event) {
  const value = document.getElementById("interestInput").value.trim();

  // EMAIL → allow form POST
  if (value.includes("@") && value.includes(".")) {
    return true; // FormSubmit handles it
  }

  // INSTAGRAM → stop form + redirect
  event.preventDefault();

  const username = value.replace("@", "");
  const message = encodeURIComponent(
    `Hey REIGNX 👋 I’m @${username} and I’m interested in the launch`
  );

  window.open(
    `https://www.instagram.com/direct/new/?text=${message}`,
    "_blank"
  );

  return false;
}

/* ================================
   SIZE SELECTION + ADD TO CART
================================ */

let selectedSize = null;

const sizeButtons = document.querySelectorAll('.size-btn');
const addBagBtn = document.querySelector('.add-bag');

sizeButtons.forEach(btn => {
  btn.addEventListener('click', () => {

    // If clicking the already-selected size → deselect
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      selectedSize = null;

      addBagBtn.disabled = true;
      addBagBtn.classList.remove("active");
      return;
    }

    // Otherwise select new size
    sizeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    selectedSize = btn.dataset.size;

    addBagBtn.disabled = false;
    addBagBtn.classList.add("active");
  });
});


async function loadInventory() {
  try {
    const res = await fetch(
      `${INVENTORY_URL}?_=${Date.now()}`,
      { cache: "no-store" }
    );
    INVENTORY = await res.json();
  } catch (e) {
    console.warn("Inventory load failed:", e);
    INVENTORY = [];
  }
}


function normalizeKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// Finds matching row in sheet for current product page
function getInventoryRowForProduct(productId) {
  return INVENTORY.find(r => normalizeKey(r.ITEM_NAME) === normalizeKey(productId));
}

function applyInventoryToProductPage() {
  const productInfo = document.querySelector(".product-info");
  if (!productInfo) return;

  const productId = productInfo.dataset.id;
  const row = getInventoryRowForProduct(productId);
  if (!row) return;

  // Update price
  if (row.PRICE_PER_PIECE != null && row.PRICE_PER_PIECE !== "") {
    productInfo.dataset.price = Number(row.PRICE_PER_PIECE);
    const priceEl = document.querySelector(".price");
    if (priceEl) priceEl.textContent = `₹${Number(row.PRICE_PER_PIECE)}`;
  }

  // Sizes + low-stock text
  document.querySelectorAll(".size-btn").forEach(btn => {
    const size = btn.dataset.size;              // XS/S/M/L/XL/XXL
    const stock = Number(row[size] ?? 0);

    // remove badge placed after button (if any)
    if (btn.nextElementSibling && btn.nextElementSibling.classList.contains("stock-badge")) {
      btn.nextElementSibling.remove();
    }

    if (stock <= 0) {
      btn.disabled = true;
      btn.classList.add("disabled");
      return;
    }

    btn.disabled = false;
    btn.classList.remove("disabled");

    if (stock < 10) {
      const badge = document.createElement("div");
      badge.className = "stock-badge";
      badge.textContent = `Only ${stock} left`;
      btn.insertAdjacentElement("afterend", badge);
    }
  });
}



function addToCart() {
  if (!selectedSize) {
    alert("Please select a size");
    return;
  }

  const productInfo = document.querySelector(".product-info");
  if (!productInfo) return;

  const product = {
    id: productInfo.dataset.id,
    name: productInfo.dataset.name,
    price: Number(productInfo.dataset.price),
    image: productInfo.dataset.image,
    size: selectedSize,
    quantity: 1
  };

  /* ================================
     ✅ STOCK CHECK (ADD HERE)
  ================================ */
	const row = getInventoryRowForProduct(product.id);
	if (row) {
	  const availableStock = Number(row[product.size] ?? 0);

	  // Count already in cart
	  const cart = JSON.parse(localStorage.getItem("cart")) || [];
	  const existing = cart.find(
		item => item.id === product.id && item.size === product.size
	  );

	  const alreadyInCartQty = existing ? existing.quantity : 0;

	  if (alreadyInCartQty + 1 > availableStock) {
		alert(`Only ${availableStock} pieces available for this size.`);
		return;
	  }
	}


  /* ================================
     CART LOGIC (UNCHANGED)
  ================================ */
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(
    item => item.id === product.id && item.size === product.size
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push(product);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();

  alert(`${product.name} (${selectedSize}) added to bag`);
}


/* ================================
   CART DRAWER TOGGLE
================================ */
function toggleCart() {
  document.getElementById("cart-drawer")?.classList.toggle("open");
}

/* ================================
   UPDATE CART COUNT (GLOBAL)
================================ */
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = count;
  }
}

/* ================================
   RENDER CART (DRAWER + PAGE)
================================ */
function renderCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

  if (!cartItemsContainer || !totalEl) return;

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
	  cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
	  totalEl.textContent = "0";

	  const checkoutBtn = document.querySelector(".checkout-btn");
	  if (checkoutBtn) {
		checkoutBtn.disabled = true;
		checkoutBtn.style.opacity = "0.4";
		checkoutBtn.style.pointerEvents = "none";
	  }

	  updateCartCount();
	  return;
	}

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

	const row = getInventoryRowForProduct(item.id);
		let stockNote = "";

		if (row) {
		  const availableStock = Number(row[item.size] ?? 0);

		  if (item.quantity >= availableStock) {
			stockNote = `<p class="stock-warning">Max stock reached</p>`;
		  } else if (availableStock < 5) {
			stockNote = `<p class="stock-warning">Only ${availableStock} left</p>`;
		  }
		}

    cartItemsContainer.innerHTML += `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" />

        <div class="cart-info">
          <h3>${item.name}</h3>
          <p>Size: ${item.size}</p>
          <p>₹${item.price}</p>

          <div class="qty-controls">
            <button onclick="changeQty(${index}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="changeQty(${index}, 1)">+</button>
          </div>
		  ${stockNote}
          <button class="remove-btn" onclick="removeItem(${index})">
            Remove
          </button>
        </div>
      </div>
    `;
  });

  totalEl.textContent = total;
  updateCartCount();
}

async function reduceInventoryAfterOrder(cartItems) {
  const payload = {
    items: cartItems.map(item => ({
      id: item.id,
      size: item.size,
      quantity: item.quantity
    }))
  };

  const response = await fetch(INVENTORY_URL, {
    method: "POST",
    redirect: "follow", // 🔥 CRITICAL
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  // Apps Script returns JSON after redirect
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Inventory server returned invalid response");
  }

  if (!data.success) {
    throw new Error(data.error || "Inventory update failed");
  }
}


async function placeOrder() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  try {
    // 🔥 WAIT for inventory update
    await reduceInventoryAfterOrder(cart);

    // Clear cart
    localStorage.removeItem("cart");
    updateCartCount();

    // Redirect ONLY after success
    window.location.href = "success.html";
  } catch (e) {
    console.error("Order error:", e);
    alert("Order failed. Please try again.");
  }
}



/* ================================
   QUANTITY CHANGE
================================ */

	function changeQty(index, delta) {
	  let cart = JSON.parse(localStorage.getItem("cart")) || [];
	  const item = cart[index];

	  const row = getInventoryRowForProduct(item.id);
	  const availableStock = row ? Number(row[item.size] ?? 0) : Infinity;

	  const newQty = item.quantity + delta;

	  if (newQty > availableStock) {
		alert(`Only ${availableStock} pieces available for this size.`);
		return;
	  }

	  if (newQty <= 0) {
		cart.splice(index, 1);
	  } else {
		item.quantity = newQty;
	  }

	  localStorage.setItem("cart", JSON.stringify(cart));
	  renderCart();
	}


/* ================================
   REMOVE ITEM
================================ */
function removeItem(index) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const isProductPage = document.getElementById("productMeta");
  const loading = document.getElementById("productLoading");

  /* =============================
     CART / CHECKOUT / PAYMENT
  ============================== */
  renderCart();
  renderCartTotalOnly();
  updateCartCount();

  /* =============================
     INVENTORY (NON-BLOCKING)
  ============================== */
  loadInventory().then(() => {
    // ✅ Product page needs inventory BEFORE showing UI
    if (isProductPage) {
      applyInventoryToProductPage();

      if (loading) loading.style.display = "none";
      isProductPage.classList.remove("hidden");
    }

    // ✅ Cart just needs enrichment
    renderCart();
  });
});

// PRODUCT INFO TABS
document.querySelectorAll(".info-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".info-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".info-panel").forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(`info-${tab.dataset.info}`).classList.add("active");
  });
});

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function getCartTotalAmount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
}

/**
 * Updates total text in any page that has #cart-total,
 * without needing #cart-items.
 */
function renderCartTotalOnly() {
  const totalEl = document.getElementById("cart-total");
  if (!totalEl) return;
  totalEl.textContent = String(getCartTotalAmount());
}


// remove after launch
// COUNTDOWN TIMER
const launchDate = new Date("2025-01-01T00:00:00").getTime();

setInterval(() => {
  const now = new Date().getTime();
  const distance = launchDate - now;

  if (distance < 0) return;

  document.getElementById("days").innerText =
    Math.floor(distance / (1000 * 60 * 60 * 24));

  document.getElementById("hours").innerText =
    Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  document.getElementById("minutes").innerText =
    Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  document.getElementById("seconds").innerText =
    Math.floor((distance % (1000 * 60)) / 1000);
}, 1000);
