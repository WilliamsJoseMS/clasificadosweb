// Configuración
const CONFIG = {
    apiUrl: "https://script.google.com/macros/s/AKfycby-GPmktQVKt8b2noJJRRIrhFoqPfuxs4lZLelaI7fnqfwkLE3Qrvxrgl5Y15qdZpCMIw/exec", // Reemplazar con tu URL de Apps Script
    itemsPerPage: 9,
    currentPage: 1,
    businesses: [],
    filteredBusinesses: [],
    icons: {},
    config: {},
    likedBusinesses: JSON.parse(localStorage.getItem('likedBusinesses')) || []
};

// Elementos del DOM
const DOM = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    businessContainer: document.getElementById('businessContainer'),
    noResults: document.getElementById('noResults'),
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
    addBusinessBtn: document.getElementById('addBusinessBtn'),
    addBusinessModal: document.getElementById('addBusinessModal')
};

// Funciones de utilidad
const utils = {
    showLoading: () => {
        DOM.loadingOverlay.style.display = 'flex';
    },
    
    hideLoading: () => {
        DOM.loadingOverlay.style.display = 'none';
    },
    
    setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        DOM.themeToggle.checked = theme === 'dark';
    },
    
    debounce: (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
};

// Funciones de API
const api = {
    fetchData: async (action) => {
        try {
            const response = await fetch(`${CONFIG.apiUrl}?action=${action}`);
            if (!response.ok) throw new Error('Error en la respuesta de la API');
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },
    
    postData: async (action, data) => {
        try {
            const response = await fetch(CONFIG.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, ...data })
            });
            if (!response.ok) throw new Error('Error en la respuesta de la API');
            return await response.json();
        } catch (error) {
            console.error('Error posting data:', error);
            throw error;
        }
    }
};

// Funciones de negocio
const business = {
    init: async () => {
        utils.showLoading();
        
        try {
            // Cargar configuración
            CONFIG.config = await api.fetchData('getConfig');
            
            // Cargar iconos
            CONFIG.icons = await api.fetchData('getIcons');
            
            // Cargar negocios
            CONFIG.businesses = await api.fetchData('getBusinesses');
            CONFIG.filteredBusinesses = [...CONFIG.businesses];
            
            // Actualizar UI
            ui.updateConfig();
            ui.initFilters();
            ui.displayBusinesses();
            
            // Configurar eventos
            events.setup();
            
            utils.hideLoading();
        } catch (error) {
            console.error('Error initializing app:', error);
            utils.hideLoading();
            alert('Error cargando los datos. Por favor recarga la página.');
        }
    },
    
    filterBusinesses: () => {
        const searchTerm = DOM.searchInput.value.toLowerCase();
        const cityFilter = DOM.cityFilter.value;
        const businessTypeFilter = DOM.businessTypeFilter.value;
        const sortBy = DOM.sortFilter.value;
        
        CONFIG.filteredBusinesses = CONFIG.businesses.filter(b => {
            const matchesSearch = 
                b['Nombre Negocio'].toLowerCase().includes(searchTerm) ||
                b.Descripción?.toLowerCase().includes(searchTerm) ||
                b.Ciudad.toLowerCase().includes(searchTerm) ||
                b['Tipo de Negocio'].toLowerCase().includes(searchTerm);
            
            const matchesCity = cityFilter ? b.Ciudad === cityFilter : true;
            const matchesType = businessTypeFilter ? b['Tipo de Negocio'] === businessTypeFilter : true;
            
            return matchesSearch && matchesCity && matchesType;
        });
        
        // Ordenar
        if (sortBy === 'likes') {
            CONFIG.filteredBusinesses.sort((a, b) => (b.Likes || 0) - (a.Likes || 0));
        } else {
            CONFIG.filteredBusinesses.sort((a, b) => new Date(b['Fecha Registro']) - new Date(a['Fecha Registro']));
        }
        
        CONFIG.currentPage = 1;
        ui.displayBusinesses();
    },
    
    likeBusiness: async (businessId) => {
        try {
            if (CONFIG.likedBusinesses.includes(businessId)) {
                return; // Ya dio like
            }
            
            const result = await api.postData('likeBusiness', { businessId });
            if (result.success) {
                CONFIG.likedBusinesses.push(businessId);
                localStorage.setItem('likedBusinesses', JSON.stringify(CONFIG.likedBusinesses));
                
                // Actualizar en memoria
                const business = CONFIG.businesses.find(b => b['Nombre Negocio'] === businessId);
                if (business) {
                    business.Likes = (business.Likes || 0) + 1;
                }
                
                // Refrescar visualización si está visible
                if (CONFIG.filteredBusinesses.some(b => b['Nombre Negocio'] === businessId)) {
                    business.filterBusinesses();
                }
            }
        } catch (error) {
            console.error('Error liking business:', error);
        }
    }
};

// Funciones de UI
const ui = {
    updateConfig: () => {
        if (CONFIG.config.TituloSitio) {
            DOM.siteTitle.textContent = CONFIG.config.TituloSitio;
            DOM.footerTitle.textContent = CONFIG.config.TituloSitio;
        }
        
        if (CONFIG.config.TextoFooter) {
            DOM.footerText.textContent = CONFIG.config.TextoFooter;
        }
        
        if (CONFIG.config.ContactoWhatsApp) {
            DOM.footerWhatsApp.href = `https://wa.me/${CONFIG.config.ContactoWhatsApp}`;
        }
        
        // Tema inicial
        const savedTheme = localStorage.getItem('theme') || 
                          (CONFIG.config.ModoOscuro === 'true' ? 'dark' : 'light');
        utils.setTheme(savedTheme);
    },
    
    initFilters: () => {
        // Ciudades
        const cities = [...new Set(CONFIG.businesses.map(b => b.Ciudad))].filter(Boolean);
        cities.sort();
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            DOM.cityFilter.appendChild(option);
        });
        
        // Tipos de negocio
        const businessTypes = [...new Set(CONFIG.businesses.map(b => b['Tipo de Negocio']))].filter(Boolean);
        businessTypes.sort();
        businessTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            DOM.businessTypeFilter.appendChild(option);
        });
        
        // Estadísticas
        DOM.totalBusinesses.textContent = CONFIG.businesses.length;
        DOM.totalCities.textContent = cities.length;
    },
    
    displayBusinesses: () => {
        const startIdx = (CONFIG.currentPage - 1) * CONFIG.itemsPerPage;
        const endIdx = startIdx + CONFIG.itemsPerPage;
        const businessesToShow = CONFIG.filteredBusinesses.slice(startIdx, endIdx);
        
        DOM.businessContainer.innerHTML = '';
        
        if (businessesToShow.length === 0) {
            DOM.noResults.style.display = 'block';
            return;
        }
        
        DOM.noResults.style.display = 'none';
        
        businessesToShow.forEach(b => {
            const card = ui.createBusinessCard(b);
            DOM.businessContainer.appendChild(card);
        });
        
        ui.updatePagination();
    },
    
    createBusinessCard: (business) => {
        const card = document.createElement('div');
        card.className = 'business-card';
        
        const icon = CONFIG.icons[business['Tipo de Negocio']] || 'fas fa-store';
        const isLiked = CONFIG.likedBusinesses.includes(business['Nombre Negocio']);
        
        // Imagen si está disponible
        if (business.ImagenURL) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'business-image';
            imgDiv.style.backgroundImage = `url(${business.ImagenURL})`;
            card.appendChild(imgDiv);
        }
        
        // Header
        const header = document.createElement('div');
        header.className = 'business-header';
        header.innerHTML = `
            <i class="${icon}"></i>
            <h3>${business['Nombre Negocio']}</h3>
            <span class="city-badge">${business.Ciudad}</span>
        `;
        card.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.className = 'business-body';
        body.innerHTML = `
            <p>${business.Descripción || 'Sin descripción disponible'}</p>
            <div class="business-contact">
                ${business.Teléfono ? `<a href="tel:${business.Teléfono}"><i class="fas fa-phone"></i> ${business.Teléfono}</a>` : ''}
                ${business.WhatsApp ? `<a href="https://wa.me/${business.WhatsApp}" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
                ${business.Dirección ? `<a href="#"><i class="fas fa-map-marker-alt"></i> ${business.Dirección}</a>` : ''}
            </div>
        `;
        card.appendChild(body);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'business-actions';
        actions.innerHTML = `
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${business['Nombre Negocio']}">
                <i class="fas fa-thumbs-up"></i> <span class="like-count">${business.Likes || 0}</span>
            </button>
            <button class="comment-btn" data-id="${business['Nombre Negocio']}">
                <i class="fas fa-comment"></i> Comentar
            </button>
        `;
        card.appendChild(actions);
        
        return card;
    },
    
    updatePagination: () => {
        const totalPages = Math.ceil(CONFIG.filteredBusinesses.length / CONFIG.itemsPerPage);
        DOM.pageInfo.textContent = `Página ${CONFIG.currentPage} de ${totalPages}`;
        DOM.prevPage.disabled = CONFIG.currentPage === 1;
        DOM.nextPage.disabled = CONFIG.currentPage === totalPages || totalPages === 0;
    }
};

// Manejo de eventos
const events = {
    setup: () => {
        // Búsqueda y filtros
        DOM.searchInput.addEventListener('input', utils.debounce(business.filterBusinesses, 300));
        DOM.searchBtn.addEventListener('click', business.filterBusinesses);
        DOM.cityFilter.addEventListener('change', business.filterBusinesses);
        DOM.businessTypeFilter.addEventListener('change', business.filterBusinesses);
        DOM.sortFilter.addEventListener('change', business.filterBusinesses);
        
        // Paginación
        DOM.prevPage.addEventListener('click', () => {
            if (CONFIG.currentPage > 1) {
                CONFIG.currentPage--;
                ui.displayBusinesses();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        DOM.nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(CONFIG.filteredBusinesses.length / CONFIG.itemsPerPage);
            if (CONFIG.currentPage < totalPages) {
                CONFIG.currentPage++;
                ui.displayBusinesses();
                window.scrollTo({ top
