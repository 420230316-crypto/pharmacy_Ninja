// ===== Supabase Initialization =====
const SUPABASE_URL = 'https://tcvyfaxdvveniwsgnbxk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O_13Ds6U69DTdSMikiFa4w_sA3oSBwS';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];
let categories = ['الكل'];
let activeCategory = 'الكل';
let cart = []; // Array of objects { product, quantity }

// ===== SVG أيقونة الدواء =====
function pillSVG() {
    return `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="20" width="48" height="24" rx="12" stroke="#0284c7" stroke-width="2"/>
        <line x1="32" y1="20" x2="32" y2="44" stroke="#0284c7" stroke-width="2" stroke-dasharray="3 2"/>
        <rect x="8" y="20" width="24" height="24" rx="12" fill="#0284c7" opacity="0.15"/>
    </svg>`;
}

const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');

const reservationModal = document.getElementById('reservationModal'); // Checkout Modal
const cartModal = document.getElementById('cartModal');
const reservationForm = document.getElementById('reservationForm');
const successMessage = document.getElementById('successMessage');
const proceedCheckoutBtn = document.getElementById('proceedCheckoutBtn');

// ===== جلب الأدوية من Supabase =====
async function fetchProducts() {
    productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">جاري تحميل الأدوية من قاعدة البيانات...</p>';
    
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: true });
        
    if (error) {
        console.error('Error fetching products:', error);
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:40px 0;">حدث خطأ أثناء تحميل البيانات من Supabase.</p>';
        return;
    }
    
    if (data) {
        products = data;
        categories = ['الكل', ...new Set(products.map(p => p.category))];
        renderFilters();
        applyFilters();
    }
}

// ===== عرض المنتجات =====
function renderProducts(items) {
    productsGrid.innerHTML = '';

    if (items.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">عذراً، لم نتمكن من إيجاد الدواء المطلوب.</p>';
        return;
    }

    items.forEach(product => {
        const inStock = product.stock > 0;
        const statusClass = inStock ? 'status-in-stock' : 'status-out-of-stock';
        const statusText = inStock ? 'متوفر' : 'غير متوفر';
        const buttonDisabled = !inStock ? 'disabled' : '';
        const buttonText = inStock ? 'أضف للسلة 🛒' : 'نفدت الكمية';

        let stockClass = 'stock-good';
        if (product.stock === 0) stockClass = 'stock-out';
        else if (product.stock <= 10) stockClass = 'stock-low';
        else if (product.stock <= 50) stockClass = 'stock-medium';

        const card = document.createElement('div');
        card.className = 'product-card';
        const imagePath = product.image_url || product.image;
        
        card.innerHTML = `
            <div class="product-image-placeholder">
                ${imagePath ? `<img src="${imagePath}" alt="${product.name}" class="product-image">` : pillSVG()}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-meta">
                    <span class="product-price">${product.price} جنيه</span>
                    <span class="product-status ${statusClass}">${statusText}</span>
                </div>
                <div class="product-stock ${stockClass}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
                    <span>المخزون: <strong>${product.stock}</strong> ${product.stock === 0 ? '' : 'قطعة'}</span>
                </div>
                <button class="btn btn-primary" onclick="addToCart(${product.id})" ${buttonDisabled}>${buttonText}</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

function renderFilters() {
    const filtersContainer = document.getElementById('filtersContainer');
    if (!filtersContainer) return;
    filtersContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat === activeCategory ? ' active' : '');
        const count = cat === 'الكل' ? products.length : products.filter(p => p.category === cat).length;
        btn.textContent = cat + ' (' + count + ')';
        btn.onclick = () => {
            activeCategory = cat;
            applyFilters();
            renderFilters();
        };
        filtersContainer.appendChild(btn);
    });
    const countEl = document.querySelector('.product-count');
    if(countEl) countEl.textContent = `(${products.length} دواء)`;
}

function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let filtered = products;
    if (activeCategory !== 'الكل') filtered = filtered.filter(p => p.category === activeCategory);
    if (term) filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

fetchProducts();
searchInput.addEventListener('input', () => applyFilters());

// ==========================================
// Cart Logic
// ==========================================
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            alert('لقد وصلت للحد الأقصى المتاح بالمخزون من هذا الدواء.');
        }
    } else {
        cart.push({ product: product, quantity: 1 });
    }
    updateCartUI();
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    updateCartUI();
};

window.updateQuantity = function(productId, delta) {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(productId);
    } else if (newQty > item.product.stock) {
        alert('المخزون لا يسمح بهذه الكمية.');
    } else {
        item.quantity = newQty;
        updateCartUI();
    }
};

function updateCartUI() {
    const cartBadge = document.getElementById('cartBadgeCount');
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalPrice');
    const checkoutBtn = document.getElementById('proceedCheckoutBtn');
    
    let totalItems = 0;
    let totalPrice = 0;
    
    cart.forEach(item => {
        totalItems += item.quantity;
        totalPrice += (item.product.price * item.quantity);
    });
    
    cartBadge.textContent = totalItems;
    totalEl.textContent = `${totalPrice} جنيه`;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">السلة فارغة حالياً</p>';
        checkoutBtn.disabled = true;
    } else {
        checkoutBtn.disabled = false;
        container.innerHTML = '';
        cart.forEach(item => {
            container.innerHTML += `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.product.name}</h4>
                        <span class="cart-item-price">${item.product.price} ج.م</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.product.id}, 1)">+</button>
                        <span style="font-weight:bold; min-width:20px; text-align:center;">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.product.id}, -1)">−</button>
                        <button class="remove-item-btn" onclick="removeFromCart(${item.product.id})">مسح</button>
                    </div>
                </div>
            `;
        });
    }
}

// Modals Setup
document.getElementById('floatingCartBtn').addEventListener('click', () => {
    cartModal.classList.add('active');
});
document.querySelector('.cart-close').addEventListener('click', () => {
    cartModal.classList.remove('active');
});

proceedCheckoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    cartModal.classList.remove('active');
    
    const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    document.getElementById('checkoutTotalPrice').textContent = `${totalPrice} جنيه`;
    
    reservationForm.style.display = 'block';
    successMessage.classList.add('hidden');
    reservationForm.reset();
    
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'تأكيد الطلب نهائياً';
    document.getElementById('addressField').style.display = 'none';
    
    reservationModal.classList.add('active');
});

document.querySelector('.checkout-close').addEventListener('click', () => {
    reservationModal.classList.remove('active');
});
document.getElementById('closeSuccessBtn').addEventListener('click', () => {
    reservationModal.classList.remove('active');
});
window.addEventListener('click', (e) => { 
    if (e.target === cartModal) cartModal.classList.remove('active');
    if (e.target === reservationModal) reservationModal.classList.remove('active');
});

// ==========================================
// Form Submission -> Pending Reservations
// ==========================================
window.toggleAddressField = function() {
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    document.getElementById('addressField').style.display = orderType === 'delivery' ? 'block' : 'none';
};

reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const email = document.getElementById('customerEmail').value;
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    const address = document.getElementById('deliveryAddress').value;
    
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جاري تسجيل الطلب...';

    const orderId = 'RES-' + Math.floor(100000 + Math.random() * 900000);
    const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    try {
        const reservation_data = {
            reservation_number: orderId,
            customer_name: name,
            customer_phone: phone,
            customer_email: email,
            order_type: orderType,
            delivery_address: orderType === 'delivery' ? address : null,
            total_amount: totalPrice
        };

        const items_data = cart.map(item => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: item.product.price * item.quantity
        }));

        const { error: pendingError } = await supabaseClient
            .from('pending_reservations')
            .insert([{ 
                reservation_data: reservation_data,
                items_data: items_data
            }]);

        if (pendingError) throw pendingError;
        
        document.getElementById('reservationId').textContent = orderId;
        reservationForm.style.display = 'none';
        successMessage.classList.remove('hidden');
        
        cart = [];
        updateCartUI();

    } catch (err) {
        console.error("Error creating pending reservation:", err);
        alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأكيد الطلب نهائياً';
    }
});

// ==========================================
// Admin Panel Logic
// ==========================================
const adminModal = document.getElementById('adminModal');
document.getElementById('openAdminBtn').addEventListener('click', () => {
    adminModal.classList.add('active');
    loadPendingOrders();
});
document.querySelector('.admin-close').addEventListener('click', () => {
    adminModal.classList.remove('active');
    document.getElementById('adminStatusMsg').textContent = '';
});

async function loadPendingOrders() {
    const tbody = document.getElementById('pendingOrdersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">جاري تحميل الطلبات...</td></tr>';
    
    const { data, error } = await supabaseClient
        .from('pending_reservations')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">خطأ في جلب الطلبات</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد طلبات معلقة حالياً.</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    data.forEach(order => {
        const res = order.reservation_data;
        const items = order.items_data; // This is now an array
        const typeBadge = res.order_type === 'delivery' ? '<span class="badge badge-delivery">توصيل දليفري</span>' : '<span class="badge badge-pickup">استلام بالصيدلية</span>';
        
        // Generate small list of items
        const itemsList = items.map(i => `${i.quantity}x ${i.product_name}`).join('<br>');

        tbody.innerHTML += `
            <tr>
                <td>${res.reservation_number}</td>
                <td>
                    <strong>${res.customer_name}</strong><br>
                    <small style="color:#64748b">${res.customer_phone}</small>
                    ${res.delivery_address ? `<br><small style="color:#0284c7">${res.delivery_address}</small>` : ''}
                </td>
                <td>${typeBadge}</td>
                <td><small>${itemsList}</small></td>
                <td><strong style="color:var(--primary-color)">${res.total_amount} ج.م</strong></td>
                <td>${new Date(order.created_at).toLocaleString('ar-EG').split(' ')[0]}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="approveOrder(${order.id})">موافقة</button>
                </td>
            </tr>
        `;
    });
}

window.approveOrder = async function(pendingId) {
    const statusMsg = document.getElementById('adminStatusMsg');
    statusMsg.style.color = '#0284c7';
    statusMsg.textContent = 'جاري الموافقة واعتماد الطلبية بالكامل...';
    
    try {
        const { data: pendingData, error: fetchErr } = await supabaseClient.from('pending_reservations').select('*').eq('id', pendingId).single();
        if (fetchErr) throw fetchErr;

        const resDataObj = pendingData.reservation_data;
        const itemsArray = pendingData.items_data; // array!

        // 1. Insert to Reservations
        const { data: resData, error: resError } = await supabaseClient
            .from('reservations')
            .insert([{ 
                reservation_number: resDataObj.reservation_number,
                customer_name: resDataObj.customer_name, 
                customer_phone: resDataObj.customer_phone, 
                total_amount: resDataObj.total_amount,
                status: 'confirmed'
            }])
            .select()
            .single();
        if (resError) throw resError;

        // 2. Insert ALL items to Reservation Items & Deduct Stock
        for (const item of itemsArray) {
            // Insert item
            await supabaseClient.from('reservation_items').insert([{
                reservation_id: resData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price
            }]);

            // Deduct stock
            const product = products.find(p => p.id === item.product_id);
            if (product) {
                const newStock = Math.max(product.stock - item.quantity, 0);
                await supabaseClient.from('products').update({ stock: newStock }).eq('id', product.id);
                product.stock = newStock; // update local
            }
        }
        renderProducts(products); // Refresh UI with new stock details

        // 3. Delete from pending_reservations
        await supabaseClient.from('pending_reservations').delete().eq('id', pendingId);

        statusMsg.style.color = '#10b981';
        statusMsg.textContent = 'تم الاعتماد بنجاح وتم تحويل الطلب للداتا بيز!';
        loadPendingOrders();

    } catch (err) {
        console.error("Approval Error:", err);
        statusMsg.style.color = '#ef4444';
        statusMsg.textContent = 'حدث خطأ: ' + err.message;
    }
}
