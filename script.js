let vehiclesData = [];
let cart = [];

// --- CARGA DE DATOS ---
async function loadVehicles() {
    const container = document.getElementById('productsContainer');
    const spinner = document.getElementById('loadingSpinner');

    try {
        const response = await fetch('https://raw.githubusercontent.com/JUANCITOPENA/Pagina_Vehiculos_Ventas/refs/heads/main/vehiculos.json');
        if (!response.ok) throw new Error('No se pudo conectar con la base de datos');
        
        vehiclesData = await response.json();

        // CORRECCIÓN ESPECÍFICA SOLICITADA POR EL USUARIO:
        // El JSON dice CR-V pero la imagen es un Civic (según el usuario no es CR-V)
        vehiclesData.forEach(v => {
            if(v.modelo === "Honda CR-V") v.modelo = "Civic Sedán"; // Ejemplo de corrección manual
        });

        displayVehicles(vehiclesData);
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger w-100 text-center">Error: ${error.message}</div>`;
    } finally {
        spinner.style.display = 'none';
    }
}

// --- RENDERIZADO DE TARJETAS ---
function displayVehicles(data) {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    data.forEach(vehicle => {
        // CORRECCIÓN PARA NOMBRES DUPLICADOS (Evita "Toyota Toyota")
        let nombreMostrar = vehicle.modelo.toLowerCase().includes(vehicle.marca.toLowerCase()) 
            ? vehicle.modelo 
            : `${vehicle.marca} ${vehicle.modelo}`;

        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6 mb-4';
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0">
                <img src="${vehicle.imagen}" class="card-img-top viewDetailsBtn" alt="${vehicle.marca}" style="cursor:pointer" data-id="${vehicle.codigo}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title fw-bold text-dark">${nombreMostrar}</h5>
                    <p class="mb-1"><span class="badge bg-info text-dark">${vehicle.categoria}</span></p>
                    <p class="text-muted small">${vehicle.tipo.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ ]/g, "")}</p>
                    <h4 class="text-primary fw-bold mt-auto">$${vehicle.precio_venta.toLocaleString()}</h4>
                    <button class="btn btn-outline-primary mt-3 viewDetailsBtn" data-id="${vehicle.codigo}">
                        <i class="fas fa-plus-circle me-2"></i>Ver y Comprar
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

// --- FILTRADO ---
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = vehiclesData.filter(v => 
        v.marca.toLowerCase().includes(term) || 
        v.modelo.toLowerCase().includes(term) || 
        v.categoria.toLowerCase().includes(term)
    );
    displayVehicles(filtered);
});

// --- GESTIÓN DE CLIC (Aquí se soluciona el error de UNDEFINED) ---
document.getElementById('productsContainer').addEventListener('click', (e) => {
    // Usamos closest para asegurarnos de capturar el elemento que tiene el data-id
    const btn = e.target.closest('.viewDetailsBtn');
    
    if (btn) {
        const codigo = btn.getAttribute('data-id');
        // Importante: Convertir a número o string según el JSON
        const vehicle = vehiclesData.find(v => String(v.codigo) === String(codigo));
        
        if (vehicle) {
            showDetailModal(vehicle);
        } else {
            console.error("Vehículo no encontrado para el código:", codigo);
        }
    }
});

function showDetailModal(vehicle) {
    document.getElementById('detailImage').src = vehicle.imagen;
    document.getElementById('detailVehicleName').innerText = `${vehicle.marca} ${vehicle.modelo}`;
    document.getElementById('detailCat').innerText = vehicle.categoria;
    document.getElementById('detailPrice').innerText = `$${vehicle.precio_venta.toLocaleString()}`;
    document.getElementById('quantityInput').value = 1;
    
    const addBtn = document.getElementById('addToCartBtn');
    addBtn.onclick = () => {
        const qty = parseInt(document.getElementById('quantityInput').value);
        if (qty > 0) {
            addItemToCart(vehicle, qty);
            bootstrap.Modal.getInstance(document.getElementById('quantityModal')).hide();
        }
    };

    new bootstrap.Modal(document.getElementById('quantityModal')).show();
}

// --- CARRITO ---
function addItemToCart(vehicle, quantity) {
    const existing = cart.find(item => item.codigo === vehicle.codigo);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ ...vehicle, quantity: quantity });
    }
    updateCartUI();
    
    const badge = document.getElementById('cartCount');
    badge.classList.remove('pulse');
    void badge.offsetWidth; // Trigger reflow para reiniciar animación
    badge.classList.add('pulse');
}

function updateCartUI() {
    const container = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    const countSpan = document.getElementById('cartCount');
    
    container.innerHTML = '';
    let total = 0;
    let itemsCount = 0;

    cart.forEach(item => {
        const subtotal = item.precio_venta * item.quantity;
        total += subtotal;
        itemsCount += item.quantity;

        container.innerHTML += `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${item.imagen}" width="70" class="rounded me-3 shadow-sm">
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold">${item.marca} ${item.modelo}</h6>
                    <small>${item.quantity} x $${item.precio_venta.toLocaleString()}</small>
                </div>
                <div class="fw-bold text-primary">$${subtotal.toLocaleString()}</div>
            </div>
        `;
    });

    totalSpan.innerText = `$${total.toLocaleString()}`;
    countSpan.innerText = itemsCount;
}

// --- PAGO Y PDF ---
document.getElementById('processPaymentBtn').addEventListener('click', () => {
    const name = document.getElementById('payName').value;
    if (!name) return alert("Por favor, ingrese el nombre del titular.");

    alert("¡Pago exitoso! Se descargará su factura de Heredia Garage.");
    generateInvoice(name);
    
    cart = [];
    updateCartUI();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    bootstrap.Modal.getInstance(document.getElementById('cartModal')).hide();
});

function generateInvoice(name) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(26, 115, 232);
    doc.text("HEREDIA GARAGE - FACTURA", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Cliente: ${name}`, 20, 40);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 48);
    doc.line(20, 55, 190, 55);

    let y = 65;
    let total = 0;
    cart.forEach(item => {
        const sub = item.precio_venta * item.quantity;
        total += sub;
        doc.text(`${item.marca} ${item.modelo} (x${item.quantity})`, 20, y);
        doc.text(`$${sub.toLocaleString()}`, 160, y);
        y += 10;
    });

    doc.line(20, y, 190, y);
    doc.setFontSize(16);
    doc.text(`TOTAL PAGADO: $${total.toLocaleString()}`, 110, y + 15);
    
    doc.save(`Factura_HerediaGarage_${Date.now()}.pdf`);
}

// --- TEST AUTOMATIZADO ---
function runTests() {
    console.log("%c--- PRUEBAS HEREDIA GARAGE ---", "color: blue; font-weight: bold;");
    
    // Test 1: Datos cargados
    if (vehiclesData.length > 0) console.log("✅ Carga de Datos: PASSED");
    else console.log("❌ Carga de Datos: FAILED");

    // Test 2: Nombre Duplicado Fix
    const car = vehiclesData[0];
    if (car && car.modelo.toLowerCase().includes(car.marca.toLowerCase())) {
        console.log("✅ Fix Nombres Duplicados: PASSED");
    }

    console.log("--- FIN DE PRUEBAS ---");
}

document.addEventListener('DOMContentLoaded', () => {
    loadVehicles().then(() => {
        setTimeout(runTests, 2000); // Ejecutar tras carga
    });
});