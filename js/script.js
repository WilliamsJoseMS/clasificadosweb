// JavaScript Document// Configuración
const API_URL = "TU_URL_DE_APPS_SCRIPT"; // Reemplazar con tu URL
const BUSINESS_PER_PAGE = 9;
let currentPage = 1;
let allBusinesses = [];
let filteredBusinesses = [];
let iconsMap = {};
let config = {};

// Elementos del DOM
const elements = {
    businessContainer: document.getElementById('businessContainer'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    cityFilter: document.getElementById('cityFilter'),
    businessTypeFilter: document.getElementById('businessTypeFilter'),
    sortFilter: document.getElementById('sortFilter'),
    totalBusinesses: document.getElementById('totalBusinesses'),
    totalVisits: document.getElementById('totalVisits'),
    totalCities: document.getElementById('totalCities'),
    themeToggle: document.getElementById('themeToggle'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    siteTitle: document.getElementById('siteTitle'),
    footerTitle: document.getElementById('footerTitle'),
    footerText: document.getElementById('footerText'),
    footerWhatsApp: document.getElementById('footerWhatsApp'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    addBusinessBtn: document.getElementById('addBusinessBtn'),
    addBusinessModal: document.getElementById('addBusinessModal')
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    
    try {
        // Cargar configuración
        config = await fetchData('getConfig');
        
        // Cargar iconos
        iconsMap = await fetchData('getIcons');
        
        // Cargar negocios
        allBusinesses = await fetchData('getBusinesses');
        filteredBusinesses = [...allBusinesses];
        
        // Actualizar UI con configuración
        updateConfigUI();
        
        // Inicializar filtros
        initFilters();
        
        // Mostrar primera página
        displayBusinesses();
        
        // Configurar eventos
        setupEventListeners();
        
        // Ocultar loading
        hideLoading();
    } catch (error) {
        console.error("Error inicializando la aplicación:", error);
        hideLoading();
        alert("Error cargando los datos. Por favor recarga la página.");
    }
});

// Funciones para obtener datos
async function fetchData(action, data = {}) {
    const url = `${API_URL}?action=${action}`;
    const response = await fetch(url);
    return await response.json();
}

async function postData(action, data) {
    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...data }),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return await response.json();
}

// Actualizar UI con configuración
function updateConfigUI() {
    if (config.TituloSitio) {
        elements.siteTitle.textContent = config.TituloSitio;
        elements.footerTitle.textContent = config.TituloSitio;
    }
    
    if (config.TextoFooter) {
        elements.footerText.textContent = config.TextoFooter;
    }
    
    if (config.ContactoWhatsApp) {
        elements.footerWhatsApp.href = `https://wa.me/${config.ContactoWhatsApp}`;
    }
    
    // Configurar tema inicial
    const savedTheme = localStorage.getItem('theme') || (config.ModoOscuro === 'true' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.checked = savedTheme === 'dark';
}

// Inicializar filtros
function initFilters() {
    // Obtener ciudades únicas
    const cities = [...new Set(allBusinesses.map(b => b.Ciudad))].filter(Boolean);
    cities.sort();
    
    // Obtener tipos de negocio únicos
    const businessTypes = [...new Set(allBusinesses.map(b => b['Tipo de Negocio']))].filter(Boolean);
    businessTypes.sort();
    
    // Llenar filtro de ciudades
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        elements.cityFilter.appendChild(option);
    });
    
    // Llenar filtro de tipos de negocio
    businessTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        elements.businessTypeFilter.appendChild(option);
    });
    
    // Actualizar estadísticas
    elements.totalBusinesses.textContent = allBusinesses.length;
    elements.totalCities.textContent = cities.length;
}

// Mostrar negocios
function displayBusinesses() {
    elements.businessContainer.innerHTML = '';
    
    const startIndex = (currentPage - 1) * BUSINESS_PER_PAGE;
    const endIndex = startIndex + BUSINESS_PER_PAGE;
    const businessesToShow = filteredBusinesses.slice(startIndex, endIndex);
    
    if (businessesToShow.length === 0) {
        elements.businessContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron negocios</h3>
                <p>Intenta con otros filtros o términos de búsqueda</p>
            </div>
        `;
        return;
    }
    
    businessesToShow.forEach(business => {
        const businessCard = createBusinessCard(business);
        elements.businessContainer.appendChild(businessCard);
    });
    
    updatePagination();
}

// Crear tarjeta de negocio
function createBusinessCard(business) {
    const card = document.createElement('div');
    card.className = 'business-card';
    
    const icon = iconsMap[business['Tipo de Negocio']] || 'fas fa-store';
    
    card.innerHTML = `
        <div class="business-header">
            <i class="${icon}"></i>
            <h3>${business['Nombre Negocio']}</h3>
            <span class="city-badge">${business.Ciudad}</span>
        </div>
        <div class="business-body">
            <p>${business.Descripción || 'Sin descripción disponible'}</p>
            <div class="business-contact">
                ${business.Teléfono ? `<a href="tel:${business.Teléfono}"><i class="fas fa-phone"></i> ${business.Teléfono}</a>` : ''}
                ${business.WhatsApp ? `<a href="https://wa.me/${business.WhatsApp}" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
                ${business.Dirección ? `<a href="#"><i class="fas fa-map-marker-alt"></i> ${business.Dirección}</a>` : ''}
            </div>
        </div>
        <div class="business-actions">
            <button class="like-btn" data-id="${business['Nombre Negocio']}">
                <i class="fas fa-thumbs-up"></i> <span class="like-count">${business.Likes || 0}</span>
            </button>
            <button class="comment-btn" data-id="${business['Nombre Negocio']}">
                <i class="fas fa-comment"></i> Comentar
            </button>
        </div>
    `;
    
    // Añadir imagen si está disponible
    if (business.ImagenURL) {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'business-image';
        imgDiv.style.backgroundImage = `url(${business.ImagenURL})`;
        card.insertBefore(imgDiv, card.firstChild);
    }
    
    return card;
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(filteredBusinesses.length / BUSINESS_PER_PAGE);
    
    elements.pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    elements.prevPage.disabled = currentPage === 1;
    elements.nextPage.disabled = currentPage === totalPages || totalPages === 0;
}

// Filtrar negocios
function filterBusinesses() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const cityFilter = elements.cityFilter.value;
    const businessTypeFilter = elements.businessTypeFilter.value;
    const sortBy = elements.sortFilter.value;
    
    filteredBusinesses = allBusinesses.filter(business => {
        const matchesSearch = 
            business['Nombre Negocio'].toLowerCase().includes(searchTerm) ||
            business.Descripción.toLowerCase().includes(searchTerm) ||
            business.Ciudad.toLowerCase().includes(searchTerm) ||
            business['Tipo de Negocio'].toLowerCase().includes(searchTerm);
        
        const matchesCity = cityFilter ? business.Ciudad === cityFilter : true;
        const matchesType = businessTypeFilter ? business['Tipo de Negocio'] === businessTypeFilter : true;
        
        return matchesSearch && matchesCity && matchesType;
    });
    
    // Ordenar
    if (sortBy === 'likes') {
        filteredBusinesses.sort((a, b) => (b.Likes || 0) - (a.Likes || 0));
    } else {
        filteredBusinesses.sort((a, b) => new Date(b['Fecha Registro']) - new Date(a['Fecha Registro']));
    }
    
    // Resetear a página 1
    currentPage = 1;
    displayBusinesses();
}

// Configurar event listeners
function setupEventListeners() {
    // Filtros y búsqueda
    elements.searchInput.addEventListener('input', filterBusinesses);
    elements.searchBtn.addEventListener('click', filterBusinesses);
    elements.cityFilter.addEventListener('change', filterBusinesses);
    elements.businessTypeFilter.addEventListener('change', filterBusinesses);
    elements.sortFilter.addEventListener('change', filterBusinesses);
    
    // Paginación
    elements.prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayBusinesses();
        }
    });
    
    elements.nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBusinesses.length / BUSINESS_PER_PAGE);
        if (currentPage < totalPages) {
           