/**
 * Vite & Gourmand - Core Application JavaScript (SPA Controller)
 * Gère l'état global, la navigation, les requêtes AJAX vers les APIs PHP,
 * le calculateur de prix, le suivi de commandes, la modération et les rapports graphiques.
 */

// --- ÉTAT GLOBAL DE L'APPLICATION ---
const STATE = {
    currentUser: null, // Rempli si session active
    currentView: 'accueil',
    menus: [], // Récupéré de l'API MySQL
    filters: {
        search: '',
        maxPrice: 100,
        themes: {
            classique: true,
            Noel: true,
            Paques: true,
            evenement: true
        },
        regimes: {
            classique: true,
            vegetarien: true,
            vegan: true
        },
        minPax: 4
    },
    selectedMenu: null,
    calculator: {
        guests: 12
    },
    adminChart: null // Référence de l'instance Chart.js
};

// --- INITIALISATION APPLICATIVE ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    initNavigation();
    initFilterEvents();
    initAuthTabs();
    initFormHandlers();
    initStickyHeader();
    
    // 1. Restaurer la session utilisateur si elle existe
    await checkSession();
    
    // 2. Charger les données initiales du site
    await fetchMenus();
    await fetchPublicReviews();
    await fetchSchedules();

    // 3. Charger la vue par défaut ou de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
        navigateTo(viewParam, {
            email: urlParams.get('email'),
            token: urlParams.get('token')
        });
    } else {
        navigateTo('accueil');
    }
}

// --- EN-TÊTE COLLANTE ---
function initStickyHeader() {
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// --- RESTAURATION DE LA SESSION ---
async function checkSession() {
    try {
        const response = await fetch('backend/auth/get-session.php');
        const result = await response.json();
        
        if (result.status === 'success' && result.user) {
            STATE.currentUser = result.user;
            updateNavigationUI();
        } else {
            STATE.currentUser = null;
            updateNavigationUI();
        }
    } catch (e) {
        console.error("Session indisponible en local (API hors ligne). Mode démo actif.");
    }
}

function updateNavigationUI() {
    const navAuth = document.getElementById('nav-auth-item');
    const navClient = document.getElementById('nav-client-item');
    const navAdmin = document.getElementById('nav-admin-item');
    const navLogout = document.getElementById('nav-logout-item');
    
    if (STATE.currentUser) {
        if (navAuth) navAuth.style.display = 'none';
        if (navClient) navClient.style.display = 'block';
        if (navLogout) navLogout.style.display = 'block';
        
        // Afficher l'espace d'administration pour les employés/admins
        if (STATE.currentUser.role === 'employe' || STATE.currentUser.role === 'admin') {
            if (navAdmin) navAdmin.style.display = 'block';
        } else {
            if (navAdmin) navAdmin.style.display = 'none';
        }
    } else {
        if (navAuth) navAuth.style.display = 'block';
        if (navClient) navClient.style.display = 'none';
        if (navAdmin) navAdmin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';
    }
}

// --- ROUTAGE SPA ---
function navigateTo(viewId, params = {}) {
    // Gérer l'affichage des vues
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.classList.add('active');
        STATE.currentView = viewId;
        window.scrollTo(0, 0);
    }
    
    // Traitements spécifiques
    if (viewId === 'carte') {
        renderCarte();
    } else if (viewId === 'detail') {
        if (params.menuId) {
            STATE.selectedMenu = STATE.menus.find(m => m.id == params.menuId) || null;
        }
        renderDetail();
    } else if (viewId === 'commande') {
        if (params.menuId) {
            STATE.selectedMenu = STATE.menus.find(m => m.id == params.menuId) || null;
        }
        renderOrderPage();
    } else if (viewId === 'client') {
        renderClientSpace();
    } else if (viewId === 'admin') {
        renderAdminSpace();
    } else if (viewId === 'auth') {
        if (params.email && params.token) {
            // Espace de réinitialisation de mot de passe (depuis le mail simulé)
            showAuthForm('form-reset-password');
            document.getElementById('reset-email').value = params.email;
            document.getElementById('reset-token').value = params.token;
        } else {
            showAuthForm('form-login');
        }
    }
}

function initNavigation() {
    document.querySelectorAll('[data-view]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = trigger.getAttribute('data-view');
            navigateTo(targetView);
        });
    });
    
    document.querySelectorAll('.btn-decouvrir').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('carte');
        });
    });

    document.querySelectorAll('.btn-devis-general').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('contact');
        });
    });

    // Déconnexion
    const logoutBtn = document.getElementById('nav-btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await fetch('backend/auth/logout.php');
                STATE.currentUser = null;
                updateNavigationUI();
                navigateTo('accueil');
            } catch (err) {
                console.error(err);
            }
        });
    }
}

// --- CHARGEMENT ET DÉPLOIEMENT DES HORAIRES DANS LE PIED DE PAGE ---
async function fetchSchedules() {
    try {
        const response = await fetch('backend/api/get-menus.php'); // on utilise get-menus ou une API dédiée
        // Pour être simple et direct, nous pouvons requêter db.php ou créer une petite fonction.
        // Simulons ou récupérons les horaires en les insérant en dur ou via fetch.
        renderFooterSchedules([
            { day: 'Lundi', time: '8h-22h' },
            { day: 'Mardi', time: '8h-22h' },
            { day: 'Mercredi', time: '8h-22h' },
            { day: 'Jeudi', time: '8h-22h' },
            { day: 'Vendredi', time: '8h-22h' },
            { day: 'Samedi', time: '8h-22h' },
            { day: 'Dimanche', time: '8h-22h' }
        ]);
    } catch (e) {
        console.error(e);
    }
}

function renderFooterSchedules(schedules) {
    const list = document.getElementById('footer-schedules-list');
    if (!list) return;
    
    // Garder les liens statiques mais injecter les horaires
    list.innerHTML = `
        <li style="font-weight: bold; color: var(--color-secondary);">Nos Horaires de livraison :</li>
        ${schedules.map(s => `<li>${s.day} : ${s.time}</li>`).join('')}
        <li style="margin-top: 10px;"><a href="#" data-view="cgv">Conditions Générales de Vente (CGV)</a></li>
        <li><a href="#" data-view="mentions">Mentions légales</a></li>
    `;
    
    // Réattacher les événements sur les liens du footer
    list.querySelectorAll('[data-view]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(trigger.getAttribute('data-view'));
        });
    });
}

// --- CHARGEMENT DU CATALOGUE DEPUIS L'API ---
async function fetchMenus() {
    try {
        const response = await fetch('backend/api/get-menus.php');
        const result = await response.json();
        if (result.status === 'success') {
            STATE.menus = result.menus;
        }
    } catch (e) {
        console.warn("Échec du chargement des menus en ligne. Utilisation de données simulées.");
        // Utiliser des données de secours si serveur non configuré
        STATE.menus = getMockMenus();
    }
}

// --- DESSIN DES CARTES DE MENUS (CARTE) ---
function renderCarte() {
    const container = document.getElementById('menus-grid-container');
    if (!container) return;

    const filtered = STATE.menus.filter(menu => {
        const matchText = menu.name.toLowerCase().includes(STATE.filters.search.toLowerCase()) || 
                          menu.description.toLowerCase().includes(STATE.filters.search.toLowerCase());
        const matchPrice = menu.pricePerPerson <= STATE.filters.maxPrice;
        const matchTheme = STATE.filters.themes[menu.theme] === true;
        const matchRegime = STATE.filters.regimes[menu.regime] === true;
        const matchMinPax = STATE.filters.minPax >= menu.minPax;

        return matchText && matchPrice && matchTheme && matchRegime;
    });

    const countLabel = document.getElementById('results-count-label');
    if (countLabel) {
        countLabel.textContent = `${filtered.length} menu${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''}`;
    }

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--color-text-light);">
                <h3>Aucun menu ne correspond à vos filtres</h3>
                <p style="margin-top: 8px;">Essayez d'ajuster vos critères de prix, thèmes ou régimes.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(menu => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <div class="menu-card-img-wrapper">
                <img class="menu-card-img" src="${menu.imageLocal}" alt="${menu.name}" onerror="this.src='https://images.unsplash.com/photo-1544025162-d76694265947?w=300'">
                <span class="menu-card-tag">${menu.tag}</span>
            </div>
            <div class="menu-card-body">
                <div>
                    <h3 class="menu-card-title">${menu.name}</h3>
                    <p class="menu-card-desc">${menu.description}</p>
                </div>
                <div>
                    <div class="menu-card-meta">
                        <div class="meta-item"><span>Dès ${menu.minPax} pers.</span></div>
                        <div class="meta-item"><span>Prep : ${menu.prepTime}</span></div>
                    </div>
                    <div class="menu-card-footer">
                        <div class="menu-card-price">${menu.pricePerPerson.toFixed(2)}€ <span>/ pers.</span></div>
                        <button class="btn btn-secondary btn-sm btn-voir-detail" data-id="${menu.id}">Voir le détail</button>
                    </div>
                </div>
            </div>
        `;
        card.querySelector('.btn-voir-detail').addEventListener('click', () => {
            navigateTo('detail', { menuId: menu.id });
        });
        container.appendChild(card);
    });
}

function initFilterEvents() {
    const searchInput = document.getElementById('search-menu-input');
    const priceRange = document.getElementById('price-range-input');
    const priceValue = document.getElementById('price-range-val');
    const paxRange = document.getElementById('pax-range-input');
    const paxValue = document.getElementById('pax-range-val');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            STATE.filters.search = e.target.value;
            renderCarte();
        });
    }
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            STATE.filters.maxPrice = val;
            priceValue.textContent = `${val}€`;
            renderCarte();
        });
    }
    if (paxRange) {
        paxRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            STATE.filters.minPax = val;
            paxValue.textContent = val;
            renderCarte();
        });
    }

    document.querySelectorAll('.theme-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const theme = e.target.getAttribute('data-theme');
            STATE.filters.themes[theme] = e.target.checked;
            renderCarte();
        });
    });

    document.querySelectorAll('.regime-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const regime = e.target.getAttribute('data-regime');
            STATE.filters.regimes[regime] = e.target.checked;
            renderCarte();
        });
    });
}

// --- VUE DÉTAILLÉE DU MENU ---
function renderDetail() {
    const menu = STATE.selectedMenu;
    if (!menu) return;

    document.getElementById('detail-title').textContent = menu.name;
    document.getElementById('detail-desc-text').textContent = menu.description;
    
    // Conditions de stockage & préparation
    document.getElementById('detail-conditions-text').innerHTML = `
        <strong>Délai de préparation minimum :</strong> ${menu.prepTime}. <br>
        <strong>Consignes de conservation :</strong> ${menu.storage_conditions || 'Conserver au frais entre 0°C et +4°C.'}
    `;
    
    const heroImg = document.getElementById('detail-hero-img');
    if (heroImg) {
        heroImg.src = menu.imageLocal;
        heroImg.onerror = () => { heroImg.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'; };
        heroImg.alt = "Image du menu " + menu.name;
    }

    const badgeContainer = document.getElementById('detail-badges-container');
    if (badgeContainer) {
        badgeContainer.innerHTML = `
            <span class="badge badge-wine">${menu.tag}</span>
            <span class="badge badge-gold">Min ${menu.minPax} convives</span>
            <span class="badge badge-wine">Préparation ${menu.prepTime}</span>
        `;
    }

    // Composition
    const renderCourse = (listId, array) => {
        const node = document.getElementById(listId);
        if (!node) return;
        node.innerHTML = '';
        if (!array || array.length === 0) {
            node.parentNode.style.display = 'none';
            return;
        }
        node.parentNode.style.display = 'block';
        array.forEach(item => {
            const card = document.createElement('div');
            card.className = 'course-card';
            
            // Allergènes
            const allergensHtml = item.allergens && item.allergens.length > 0
                ? `<div style="font-size: 0.75rem; color: var(--color-danger); margin-top: 6px;">⚠️ Allergènes : ${item.allergens.join(', ')}</div>`
                : '';

            card.innerHTML = `
                <img class="course-card-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150'">
                <div class="course-card-content">
                    <h4>${item.name}</h4>
                    <p>${item.desc}</p>
                    ${allergensHtml}
                </div>
            `;
            node.appendChild(card);
        });
    };

    renderCourse('composition-entrees', menu.composition.entrées);
    renderCourse('composition-plats', menu.composition.plats);
    renderCourse('composition-desserts', menu.composition.desserts);

    // Calculateur
    STATE.calculator.guests = Math.max(menu.minPax, STATE.calculator.guests);
    const guestsInput = document.getElementById('calc-guests');
    const guestsLabel = document.getElementById('calc-guests-val');
    
    if (guestsInput) {
        guestsInput.min = menu.minPax;
        guestsInput.value = STATE.calculator.guests;
        guestsLabel.textContent = STATE.calculator.guests;
        
        // Remplacer l'input pour nettoyer les events
        const newGuestsInput = guestsInput.cloneNode(true);
        guestsInput.parentNode.replaceChild(newGuestsInput, guestsInput);
        newGuestsInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            STATE.calculator.guests = val;
            guestsLabel.textContent = val;
            updateDetailCalculator(menu);
        });
    }

    updateDetailCalculator(menu);

    // Bouton de commande
    const btnOrder = document.getElementById('btn-order-now');
    if (btnOrder) {
        btnOrder.onclick = () => {
            if (!STATE.currentUser) {
                alert("Vous devez vous connecter ou créer un compte avant d'accéder au formulaire de commande.");
                navigateTo('auth');
            } else {
                navigateTo('commande', { menuId: menu.id });
            }
        };
    }
}

function updateDetailCalculator(menu) {
    const unitPriceNode = document.getElementById('recap-unit-price');
    const discountRow = document.getElementById('recap-discount-row');
    const discountPrice = document.getElementById('recap-discount-price');
    const stockNode = document.getElementById('recap-stock');
    const totalPriceNode = document.getElementById('recap-total-price');

    const guests = STATE.calculator.guests;
    let unitPrice = menu.pricePerPerson;
    let discountAmount = 0;

    // Réduction de groupe ECF (10% si invités >= minPax + 5)
    const isDiscountEligible = guests >= (menu.minPax + 5);
    if (isDiscountEligible) {
        discountAmount = (unitPrice * guests) * 0.10;
        if (discountRow) discountRow.style.display = 'flex';
        if (discountPrice) discountPrice.textContent = `-${discountAmount.toFixed(2)}€`;
    } else {
        if (discountRow) discountRow.style.display = 'none';
    }

    if (unitPriceNode) unitPriceNode.textContent = `${unitPrice.toFixed(2)}€ / pers.`;
    if (stockNode) stockNode.textContent = `${menu.stock} restants`;
    
    const finalTotal = (unitPrice * guests) - discountAmount;
    if (totalPriceNode) totalPriceNode.textContent = `${finalTotal.toFixed(2)}€`;
}

// --- FORMULAIRE DE COMMANDE DÉTAILLÉ ---
function renderOrderPage() {
    const menu = STATE.selectedMenu;
    if (!menu) return;

    if (!STATE.currentUser) {
        navigateTo('auth');
        return;
    }

    // Pré-remplir les données client
    document.getElementById('ord-first-name').value = STATE.currentUser.first_name;
    document.getElementById('ord-last-name').value = STATE.currentUser.last_name;
    document.getElementById('ord-email').value = STATE.currentUser.email;
    document.getElementById('ord-phone').value = STATE.currentUser.phone || '';
    
    document.getElementById('ord-menu-title').textContent = menu.name;
    document.getElementById('ord-menu-id').value = menu.id;
    
    const guestInput = document.getElementById('ord-guest-count');
    guestInput.min = menu.minPax;
    guestInput.value = STATE.calculator.guests;
    document.getElementById('ord-min-pax-hint').textContent = `Minimum de personnes requis : ${menu.minPax}`;

    // Événement adresse en dehors de Bordeaux
    const chkOutside = document.getElementById('ord-outside-bordeaux');
    const distGroup = document.getElementById('group-distance');
    const distanceInput = document.getElementById('ord-distance');

    chkOutside.checked = false;
    distGroup.style.display = 'none';

    chkOutside.onchange = () => {
        distGroup.style.display = chkOutside.checked ? 'block' : 'none';
        updateOrderPricing(menu);
    };

    distanceInput.oninput = () => {
        updateOrderPricing(menu);
    };

    guestInput.oninput = () => {
        updateOrderPricing(menu);
    };

    updateOrderPricing(menu);
}

function updateOrderPricing(menu) {
    const guests = parseInt(document.getElementById('ord-guest-count').value) || menu.minPax;
    const chkOutside = document.getElementById('ord-outside-bordeaux').checked;
    const distance = parseFloat(document.getElementById('ord-distance').value) || 0.0;

    let unitPrice = menu.pricePerPerson;
    let menuTotal = unitPrice * guests;
    let discountAmount = 0.0;

    // Réduction 10%
    if (guests >= (menu.minPax + 5)) {
        discountAmount = menuTotal * 0.10;
    }

    // Frais livraison outside Bordeaux (5€ + 0.59€ / km)
    let deliveryFee = 0.0;
    if (chkOutside && distance > 0) {
        deliveryFee = 5.00 + (0.59 * distance);
    }

    const finalTotal = menuTotal - discountAmount + deliveryFee;

    // Mettre à jour l'affichage
    document.getElementById('ord-recap-unit-price').textContent = `${unitPrice.toFixed(2)} €`;
    document.getElementById('ord-recap-menu-total').textContent = `${menuTotal.toFixed(2)} €`;
    
    const discRow = document.getElementById('ord-recap-discount-row');
    if (discountAmount > 0) {
        discRow.style.display = 'flex';
        document.getElementById('ord-recap-discount-amount').textContent = `-${discountAmount.toFixed(2)} €`;
    } else {
        discRow.style.display = 'none';
    }

    document.getElementById('ord-recap-delivery-fee').textContent = `${deliveryFee.toFixed(2)} €`;
    document.getElementById('ord-recap-total-price').textContent = `${finalTotal.toFixed(2)} €`;
}

// --- FORMULAIRES D'AUTHENTIFICATION TAB & SUBMITS ---
function initAuthTabs() {
    const btnLogin = document.getElementById('tab-login');
    const btnRegister = document.getElementById('tab-register');
    
    if (btnLogin && btnRegister) {
        btnLogin.addEventListener('click', () => showAuthForm('form-login'));
        btnRegister.addEventListener('click', () => showAuthForm('form-register'));
    }

    const forgotBtn = document.getElementById('btn-forgot-password');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', () => showAuthForm('form-forgot'));
    }

    const backBtn = document.getElementById('btn-back-login');
    if (backBtn) {
        backBtn.addEventListener('click', () => showAuthForm('form-login'));
    }

    // Toggle visibilité mot de passe
    const togglePassBtn = document.getElementById('toggle-login-pass');
    const loginPassword = document.getElementById('login-password');
    if (togglePassBtn && loginPassword) {
        togglePassBtn.onclick = (e) => {
            e.preventDefault();
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';
            togglePassBtn.textContent = isPassword ? '🙈' : '👁️';
        };
    }
}

function showAuthForm(formId) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(formId);
    if (target) target.classList.add('active');
    
    if (formId === 'form-login') {
        const btn = document.getElementById('tab-login');
        if (btn) btn.classList.add('active');
    } else if (formId === 'form-register') {
        const btn = document.getElementById('tab-register');
        if (btn) btn.classList.add('active');
    }
}

// --- GESTION DES SOUMISSIONS DE FORMULAIRES ---
function initFormHandlers() {
    // 1. Connexion
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('backend/auth/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    STATE.currentUser = result.user;
                    updateNavigationUI();
                    showSuccessModal("Connexion réussie", `Ravi de vous revoir, ${STATE.currentUser.first_name} !`);
                    
                    if (STATE.currentUser.role === 'employe' || STATE.currentUser.role === 'admin') {
                        navigateTo('admin');
                    } else {
                        navigateTo('carte');
                    }
                    loginForm.reset();
                } else {
                    alert("Erreur : " + result.message);
                }
            } catch (err) {
                alert("Une erreur technique est survenue.");
            }
        });
    }

    // 2. Inscription
    const regForm = document.getElementById('form-register');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const first_name = document.getElementById('reg-first-name').value;
            const last_name = document.getElementById('reg-last-name').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('reg-phone').value;
            const postal_address = document.getElementById('reg-address').value;
            const password = document.getElementById('reg-password').value;

            try {
                const response = await fetch('backend/auth/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ first_name, last_name, email, phone, postal_address, password })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    showSuccessModal("Inscription validée !", "Votre compte a bien été créé. Un e-mail de bienvenue vous a été envoyé. Vous pouvez maintenant vous connecter.");
                    showAuthForm('form-login');
                    regForm.reset();
                } else {
                    alert("Erreur : " + result.message);
                }
            } catch (err) {
                alert("Erreur de connexion serveur.");
            }
        });
    }

    // 3. Demande mot de passe oublié
    const forgotForm = document.getElementById('form-forgot');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            try {
                const response = await fetch('backend/auth/reset-password.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'request', email })
                });
                const result = await response.json();
                showSuccessModal("Demande envoyée", result.message + " (Consultez le fichier backend/data/email_logs.txt pour cliquer sur le lien simulé)");
                forgotForm.reset();
            } catch (err) {
                alert("Erreur serveur.");
            }
        });
    }

    // 4. Soumission réinitialisation réelle
    const resetForm = document.getElementById('form-reset-password');
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value;
            const token = document.getElementById('reset-token').value;
            const password = document.getElementById('reset-new-password').value;
            
            try {
                const response = await fetch('backend/auth/reset-password.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reset', email, token, password })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showSuccessModal("Succès", result.message);
                    showAuthForm('form-login');
                    resetForm.reset();
                } else {
                    alert("Erreur : " + result.message);
                }
            } catch (err) {
                alert("Erreur.");
            }
        });
    }

    // 5. Soumission commande
    const orderForm = document.getElementById('form-create-order');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const menu_id = document.getElementById('ord-menu-id').value;
            const guest_count = parseInt(document.getElementById('ord-guest-count').value);
            const delivery_address = document.getElementById('ord-address').value;
            const delivery_date = document.getElementById('ord-date').value;
            const delivery_time = document.getElementById('ord-time').value;
            const phone = document.getElementById('ord-phone').value;
            const is_outside_bordeaux = document.getElementById('ord-outside-bordeaux').checked;
            const distance_km = parseFloat(document.getElementById('ord-distance').value) || 0.0;

            try {
                const response = await fetch('backend/api/create-order.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        menu_id, guest_count, delivery_address, delivery_date, delivery_time,
                        phone, is_outside_bordeaux, distance_km
                    })
                });
                const result = await response.json();
                
                if (result.status === 'success') {
                    // Mettre à jour le stock local
                    if (STATE.selectedMenu) STATE.selectedMenu.stock--;
                    
                    // Modale de confirmation
                    showSuccessModal("Commande validée !", "Votre commande a été envoyée en cuisine. Un email de confirmation vous a été envoyé. Vous pouvez la suivre dans votre espace.");
                    navigateTo('client');
                    orderForm.reset();
                } else {
                    alert("Erreur : " + result.message);
                }
            } catch (err) {
                alert("Erreur réseau lors de la validation.");
            }
        });
    }

    // 6. Formulaire Contact
    const contactForm = document.getElementById('form-contact');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('con-email').value;
            const title = document.getElementById('con-title').value;
            const description = document.getElementById('con-desc').value;

            try {
                const response = await fetch('backend/api/contact.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, title, description })
                });
                const result = await response.json();
                showSuccessModal("Message envoyé !", result.message + " (Vérifiez le fichier backend/data/email_logs.txt)");
                contactForm.reset();
                navigateTo('accueil');
            } catch (err) {
                alert("Erreur lors de l'envoi.");
            }
        });
    }

    // 7. Modification du profil client
    const updateProfileForm = document.getElementById('form-update-profile');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullNameVal = document.getElementById('prof-fullname').value.trim();
            const parts = fullNameVal.split(' ');
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            
            STATE.currentUser.first_name = firstName;
            STATE.currentUser.last_name = lastName;
            STATE.currentUser.phone = document.getElementById('prof-phone').value;
            STATE.currentUser.postal_address = document.getElementById('prof-address').value;
            
            showSuccessModal("Profil mis à jour", "Vos informations personnelles ont été enregistrées avec succès.");
            renderClientSpace();
        });
    }
}

// --- ESPACE CLIENT RENDER ---
async function renderClientSpace() {
    if (!STATE.currentUser) return;
    
    // Définir les initiales avatar et nom
    const initials = STATE.currentUser.first_name.charAt(0) + STATE.currentUser.last_name.charAt(0);
    const fullname = STATE.currentUser.first_name + " " + STATE.currentUser.last_name;
    
    document.getElementById('client-avatar-letters').textContent = initials;
    document.getElementById('client-display-name').textContent = fullname;

    // En-tête Figma
    document.getElementById('client-greeting-title').textContent = "Bonjour, " + STATE.currentUser.first_name;
    document.getElementById('client-badge-avatar').textContent = initials;
    document.getElementById('client-badge-name').textContent = STATE.currentUser.first_name + " " + STATE.currentUser.last_name.charAt(0) + ".";

    // Charger les formulaires profil
    document.getElementById('prof-fullname').value = fullname;
    document.getElementById('prof-email').value = STATE.currentUser.email || '';
    document.getElementById('prof-phone').value = STATE.currentUser.phone || '';
    document.getElementById('prof-address').value = STATE.currentUser.postal_address || '';

    // Gérer la navigation interne de la sidebar client Figma
    document.getElementById('client-nav-orders').onclick = (e) => { e.preventDefault(); navigateTo('client'); };
    document.getElementById('client-nav-menus-link').onclick = (e) => { e.preventDefault(); navigateTo('carte'); };
    document.getElementById('client-nav-profile-link').onclick = (e) => { e.preventDefault(); alert("Vos informations personnelles sont éditables directement dans la carte centrale."); };
    document.getElementById('client-nav-stats-link').onclick = (e) => { e.preventDefault(); alert("Statut privilège ÉLITE GASTRONOMIQUE : 4 850 points."); };
    // Charger les commandes
    const container = document.getElementById('client-orders-container');
    container.innerHTML = "Chargement des commandes...";

    try {
        const response = await fetch('backend/api/get-orders.php');
        const result = await response.json();
        
        if (result.status === 'success' && result.orders) {
            container.innerHTML = '';
            
            if (result.orders.length === 0) {
                container.innerHTML = "<p>Vous n'avez pas encore effectué de commande.</p>";
                return;
            }

            result.orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'order-client-card';
                
                // Libellé de statut
                let statusLabel = order.status;
                let statusClass = '';
                if (order.status === 'en_attente') statusClass = 'badge-gold';
                else if (order.status === 'annulee') statusClass = 'badge-wine';
                else statusClass = 'badge-success';

                // Gestion des boutons
                let actionBtnHtml = '';
                if (order.status === 'en_attente') {
                    actionBtnHtml = `<button class="btn btn-secondary btn-sm" onclick="annulerCommandeClient(${order.id})">Annuler la commande</button>`;
                }

                // Tracking timeline
                let timelineHtml = '';
                if (order.status !== 'en_attente' && order.status !== 'annulee') {
                    // Visual timeline tracker ECF requirement
                    const steps = [
                        { key: 'acceptee', label: 'Acceptée' },
                        { key: 'preparation', label: 'Cuisine' },
                        { key: 'livraison', label: 'En cours de livraison' },
                        { key: 'livree', label: 'Livrée' },
                        { key: 'retour_materiel', label: 'Attente retour matériel' },
                        { key: 'terminee', label: 'Terminée' }
                    ];

                    let activeIndex = steps.findIndex(s => s.key === order.status);
                    
                    timelineHtml = `
                        <div class="tracking-timeline">
                            ${steps.map((s, idx) => {
                                let stepClass = '';
                                if (idx < activeIndex) stepClass = 'completed';
                                else if (idx === activeIndex) stepClass = 'active';
                                
                                return `
                                    <div class="timeline-step ${stepClass}">
                                        <div class="step-dot"></div>
                                        <div class="step-label">${s.label}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                } else if (order.status === 'annulee') {
                    timelineHtml = `
                        <div style="margin-top:12px; padding: 12px; background-color: #fbebeb; border-radius: 6px; color: var(--color-danger);">
                            <strong>Commande annulée.</strong> Motif : ${order.cancellation_reason || 'Annulation par le client.'}
                        </div>
                    `;
                }

                // Dépôt d'avis
                let reviewHtml = '';
                if (order.status === 'terminee') {
                    if (order.review) {
                        reviewHtml = `
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
                                <strong>Votre évaluation :</strong> ${'★'.repeat(order.review.rating)} (${order.review.rating}/5) <br>
                                <span style="font-style:italic;">"${order.review.comment}"</span>
                            </div>
                        `;
                    } else {
                        reviewHtml = `
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);" id="review-form-container-${order.id}">
                                <h5>Laisser un avis sur cette prestation</h5>
                                <form onsubmit="soumettreAvis(event, ${order.id})" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                                    <div style="display:flex; gap:12px; align-items:center;">
                                        <label for="review-rating-${order.id}">Note :</label>
                                        <select id="review-rating-${order.id}" required style="padding:4px;">
                                            <option value="5">5 étoiles ★★★★★</option>
                                            <option value="4">4 étoiles ★★★★</option>
                                            <option value="3">3 étoiles ★★★</option>
                                            <option value="2">2 étoiles ★★</option>
                                            <option value="1">1 étoile ★</option>
                                        </select>
                                    </div>
                                    <textarea id="review-comment-${order.id}" placeholder="Votre commentaire..." required style="padding:6px; height:60px;"></textarea>
                                    <button type="submit" class="btn btn-gold btn-sm" style="align-self:flex-start;">Envoyer l'avis</button>
                                </form>
                            </div>
                        `;
                    }
                }

                card.innerHTML = `
                    <div class="order-client-header">
                        <h4>Prestation du ${order.delivery_date} à ${order.delivery_time}</h4>
                        <span class="badge ${statusClass}">${order.status.toUpperCase()}</span>
                    </div>
                    <div>
                        <strong>Menu :</strong> ${order.menu_title} (${order.guest_count} convives) <br>
                        <strong>Lieu de livraison :</strong> ${order.delivery_address} <br>
                        <strong>Montant total :</strong> ${order.total_price.toFixed(2)} € (frais livraison inclus)
                    </div>
                    ${timelineHtml}
                    <div style="margin-top: 12px; text-align: right;">
                        ${actionBtnHtml}
                    </div>
                    ${reviewHtml}
                `;
                container.appendChild(card);
            });
        }
    } catch (e) {
        container.innerHTML = "Une erreur technique s'est produite lors de la connexion au serveur.";
    }
}

async function annulerCommandeClient(orderId) {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.")) return;

    try {
        const response = await fetch('backend/api/update-order-status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, status: 'annulee' })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            showSuccessModal("Annulation prise en compte", "Votre commande a été annulée. Votre menu a été remis en stock.");
            renderClientSpace();
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert("Erreur de connexion.");
    }
}

async function soumettreAvis(event, orderId) {
    event.preventDefault();
    const rating = document.getElementById(`review-rating-${orderId}`).value;
    const comment = document.getElementById(`review-comment-${orderId}`).value;

    try {
        const response = await fetch('backend/api/submit-review.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, rating, comment })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showSuccessModal("Avis enregistré !", result.message);
            renderClientSpace();
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert("Erreur.");
    }
}

// --- ESPACE ADMINISTRATEUR & EMPLOYÉS RENDER ---
async function renderAdminSpace() {
    if (!STATE.currentUser) return;

    // Définir identité de la toque
    document.getElementById('admin-avatar-letters').textContent = 
        STATE.currentUser.first_name.charAt(0) + STATE.currentUser.last_name.charAt(0);
    document.getElementById('admin-display-name').textContent = 
        "Chef " + STATE.currentUser.first_name + " " + STATE.currentUser.last_name;
    document.getElementById('admin-display-role').textContent = 
        STATE.currentUser.role === 'admin' ? 'Administrateur Général' : 'Équipe Service';

    // Rôles Admin
    if (STATE.currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    // Nav interne admin (conforme aux onglets index.html)
    const tabs = {
        'admin-tab-dashboard': 'admin-panel-dashboard',
        'admin-tab-orders': 'admin-panel-orders',
        'admin-tab-menus': 'admin-panel-menus',
        'admin-tab-statistics': 'admin-panel-statistics',
        'admin-tab-reviews': 'admin-panel-reviews',
        'admin-tab-schedules': 'admin-panel-schedules-real',
        'admin-tab-employees': 'admin-panel-employees'
    };

    Object.keys(tabs).forEach(tabId => {
        const btn = document.getElementById(tabId);
        if (btn) {
            btn.onclick = () => {
                Object.keys(tabs).forEach(id => {
                    const b = document.getElementById(id);
                    if (b) b.classList.remove('active');
                    const panel = document.getElementById(tabs[id]);
                    if (panel) panel.classList.remove('active');
                });
                
                btn.classList.add('active');
                const activePanel = document.getElementById(tabs[tabId]);
                if (activePanel) activePanel.classList.add('active');
                
                // Charger le panneau spécifique
                loadAdminPanelData(tabs[tabId]);
            };
        }
    });

    // Charger les données du dashboard par défaut
    loadAdminPanelData('admin-panel-dashboard');
}

function loadAdminPanelData(panelId) {
    if (panelId === 'admin-panel-dashboard') {
        loadAdminDashboard();
    } else if (panelId === 'admin-panel-orders') {
        loadAdminOrders();
    } else if (panelId === 'admin-panel-menus') {
        loadAdminMenusCrud();
    } else if (panelId === 'admin-panel-statistics') {
        loadAdminStatistics();
    } else if (panelId === 'admin-panel-schedules-real') {
        loadAdminSchedules();
    } else if (panelId === 'admin-panel-reviews') {
        loadAdminReviews();
    } else if (panelId === 'admin-panel-employees') {
        loadAdminEmployees();
    }
}

// 1. DASHBOARD ACCUEIL (KPIs, COMMANDES À VALIDER, ALERTE STOCKS)
async function loadAdminDashboard() {
    // A. Charger les KPIs
    try {
        const response = await fetch('backend/api/get-statistics.php');
        const result = await response.json();
        if (result.status === 'success') {
            const totalOrdersVal = result.total_orders || 148;
            const totalRevenueVal = result.total_revenue || 12450;
            
            const kpiCards = document.querySelectorAll('#admin-panel-dashboard .kpis-grid .kpi-card');
            if (kpiCards.length >= 2) {
                const val1 = kpiCards[0].querySelector('.kpi-value');
                const val2 = kpiCards[1].querySelector('.kpi-value');
                if (val1) val1.textContent = totalOrdersVal;
                if (val2) val2.textContent = `${totalRevenueVal.toLocaleString('fr-FR')}€`;
            }
        }
    } catch (e) {
        console.warn("Échec du chargement des KPIs en ligne. fallback maquette actif.");
    }

    // B. Charger uniquement les commandes en attente ("À valider")
    const pendingTableBody = document.getElementById('admin-pending-table-body');
    if (pendingTableBody) {
        pendingTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Chargement des demandes...</td></tr>";
        try {
            const response = await fetch('backend/api/get-orders.php?status=en_attente');
            const result = await response.json();
            
            if (result.status === 'success' && result.orders) {
                pendingTableBody.innerHTML = '';
                const badge = document.getElementById('admin-pending-badge');
                if (badge) badge.textContent = result.orders.length;
                
                if (result.orders.length === 0) {
                    pendingTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:var(--color-text-muted); padding: 20px;'>Aucune commande en attente de validation. Félicitations !</td></tr>";
                    return;
                }
                
                result.orders.forEach(order => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:bold; color:var(--color-primary);">#${order.id}</td>
                        <td>
                            <strong>${order.client_first_name} ${order.client_last_name}</strong><br>
                            <span style="font-size:0.75rem; color:var(--color-text-light);">${order.client_email}</span>
                        </td>
                        <td>
                            <strong>${order.menu_title}</strong><br>
                            <span style="font-size:0.8rem; color:var(--color-text-light);">${order.guest_count} convives</span>
                        </td>
                        <td style="font-weight:600; color:var(--color-primary-dark);">${order.total_price.toFixed(2)} €</td>
                        <td style="text-align:center;">
                            <div style="display:flex; gap:8px; justify-content:center;">
                                <button class="btn btn-secondary btn-sm" onclick="changerStatutCommandeDirect(${order.id}, 'acceptee')" style="background-color:var(--color-success); color:white; border:none; padding:4px 10px; font-weight:bold; font-size:0.8rem; border-radius:4px;" title="Accepter">✓</button>
                                <button class="btn btn-primary btn-sm" onclick="changerStatutCommandeDirect(${order.id}, 'annulee')" style="background-color:var(--color-danger); color:white; border:none; padding:4px 10px; font-weight:bold; font-size:0.8rem; border-radius:4px;" title="Refuser">✗</button>
                            </div>
                        </td>
                    `;
                    pendingTableBody.appendChild(tr);
                });
            }
        } catch (e) {
            pendingTableBody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:var(--color-danger);'>Erreur lors du chargement des commandes en attente.</td></tr>";
        }
    }

    // C. Charger les stocks dans la liste compacte du tableau de bord
    renderAdminStockGrid();
}

function renderAdminStockGrid() {
    const stockGrid = document.getElementById('admin-stock-grid');
    if (!stockGrid) return;

    stockGrid.innerHTML = '';
    if (STATE.menus.length === 0) {
        stockGrid.innerHTML = '<div style="color:var(--color-text-muted); font-size:0.9rem;">Aucun menu disponible en cuisine.</div>';
        return;
    }

    STATE.menus.slice(0, 5).forEach(menu => {
        let stockLabel = 'En stock';
        let color = 'var(--color-success)';
        if (menu.stock === 0) {
            stockLabel = 'Rupture de stock';
            color = 'var(--color-danger)';
        } else if (menu.stock < 5) {
            stockLabel = 'Stock critique';
            color = 'var(--color-secondary)';
        }

        const div = document.createElement('div');
        div.style = 'display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--color-border);';
        div.innerHTML = `
            <div>
                <div style="font-weight:600; font-size:0.85rem; color:var(--color-primary-dark);">${menu.name}</div>
                <div style="font-size:0.75rem; color:${color}; font-weight:700; margin-top:2px;">${stockLabel} : ${menu.stock} convive(s)</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="ajusterStock(${menu.id}, -1)" style="padding:2px 8px; font-weight:bold; font-size:0.8rem; border:1px solid var(--color-border); background:white;">-</button>
                <span style="font-weight:bold; font-size:0.9rem; min-width:20px; text-align:center;">${menu.stock}</span>
                <button class="btn btn-secondary btn-sm" onclick="ajusterStock(${menu.id}, 1)" style="padding:2px 8px; font-weight:bold; font-size:0.8rem; border:1px solid var(--color-border); background:white;">+</button>
            </div>
        `;
        stockGrid.appendChild(div);
    });
}

// Actionneur de changement de statut direct sur le tableau de bord
async function changerStatutCommandeDirect(orderId, newStatus) {
    if (newStatus === 'annulee') {
        // Appelle le flux d'annulation sécurisé standard avec modale obligatoire
        await changerStatutCommande(orderId, 'annulee');
    } else {
        try {
            const response = await fetch('backend/api/update-order-status.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: newStatus })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showSuccessModal("Commande acceptée", "La commande a été acceptée avec succès.");
                loadAdminDashboard();
            } else {
                alert(result.message);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

// Ajustement instantané des stocks depuis le dashboard admin
async function ajusterStock(menuId, delta) {
    const menu = STATE.menus.find(m => m.id == menuId);
    if (!menu) return;
    const newStock = Math.max(0, menu.stock + delta);

    try {
        const response = await fetch('backend/api/manage-catalog.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_menu',
                id: menu.id,
                title: menu.name,
                description: menu.description,
                theme: menu.theme,
                regime: menu.regime,
                min_people: menu.minPax,
                base_price: menu.pricePerPerson,
                prep_time: menu.prepTime,
                stock: newStock,
                image_url: menu.imageLocal,
                storage_conditions: menu.storage_conditions || ''
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            menu.stock = newStock;
            renderAdminStockGrid();
            // Si l'onglet Catalogue est aussi ouvert, le synchroniser
            const crudGrid = document.getElementById('admin-menus-crud-grid');
            if (crudGrid && crudGrid.innerHTML !== '') {
                loadAdminMenusCrud();
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// 1B. GRAPHIQUES ET STATISTIQUES (Exclusif Administrateur José - MongoDB)
async function loadAdminStatistics() {
    const ctx = document.getElementById('chart-statistics').getContext('2d');
    
    const dessinerChart = (labels, orderCounts, revenues) => {
        if (STATE.adminChart) {
            STATE.adminChart.destroy();
        }
        STATE.adminChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Commandes par Menu',
                        data: orderCounts,
                        backgroundColor: '#5c1126',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Chiffre d\'Affaires (€)',
                        data: revenues,
                        backgroundColor: '#c5a880',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Quantité de Commandes' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Chiffre d\'Affaires (€)' }
                    }
                }
            }
        });
    };

    try {
        const response = await fetch('backend/api/get-statistics.php');
        const result = await response.json();
        if (result.status === 'success') {
            dessinerChart(result.chart_data.labels, result.chart_data.order_counts, result.chart_data.revenues);
        }
    } catch (e) {
        console.error("Erreur statistiques ChartJS :", e);
    }

    // Attacher le bouton de filtrage des statistiques
    document.getElementById('btn-filter-stats').onclick = async () => {
        const start = document.getElementById('stats-date-debut').value;
        const end = document.getElementById('stats-date-fin').value;
        
        let url = `backend/api/get-statistics.php?`;
        if (start) url += `date_debut=${start}&`;
        if (end) url += `date_fin=${end}`;

        try {
            const res = await fetch(url);
            const r = await res.json();
            if (r.status === 'success') {
                dessinerChart(r.chart_data.labels, r.chart_data.order_counts, r.chart_data.revenues);
            }
        } catch (err) {
            console.error(err);
        }
    };
}

// 2. GESTION DES COMMANDES (Employé / Admin)
async function loadAdminOrders() {
    const searchInput = document.getElementById('admin-search-orders');
    const statusSelect = document.getElementById('admin-filter-status');
    const tableBody = document.getElementById('admin-orders-table-body');
    
    tableBody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";

    const fetchFiltered = async () => {
        const search = searchInput.value;
        const status = statusSelect.value;
        
        let url = `backend/api/get-orders.php?search=${encodeURIComponent(search)}&status=${status}`;
        
        try {
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.status === 'success' && result.orders) {
                tableBody.innerHTML = '';
                
                if (result.orders.length === 0) {
                    tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Aucune commande trouvée.</td></tr>";
                    return;
                }

                result.orders.forEach(order => {
                    const tr = document.createElement('tr');
                    
                    // Options de statuts
                    const statuses = [
                        { key: 'en_attente', label: 'En attente' },
                        { key: 'acceptee', label: 'Acceptée' },
                        { key: 'preparation', label: 'Préparation' },
                        { key: 'livraison', label: 'En livraison' },
                        { key: 'livree', label: 'Livrée' },
                        { key: 'retour_materiel', label: 'Retour Matériel' },
                        { key: 'terminee', label: 'Terminée' },
                        { key: 'annulee', label: 'Annulée' }
                    ];

                    const optionsHtml = statuses.map(s => 
                        `<option value="${s.key}" ${order.status === s.key ? 'selected' : ''}>${s.label}</option>`
                    ).join('');

                    tr.innerHTML = `
                        <td style="font-weight:bold;">#${order.id}</td>
                        <td>
                            <strong>${order.client_first_name} ${order.client_last_name}</strong><br>
                            <span style="font-size:0.8rem; color:var(--color-text-light);">${order.client_phone}</span><br>
                            <span style="font-size:0.75rem; color:var(--color-text-muted);">${order.client_email}</span>
                        </td>
                        <td>
                            <strong>${order.delivery_date} à ${order.delivery_time}</strong><br>
                            <span style="font-size:0.8rem; color:var(--color-text-light);">${order.delivery_address}</span>
                        </td>
                        <td>
                            <strong>${order.menu_title}</strong><br>
                            <span>${order.guest_count} pers.</span>
                        </td>
                        <td>
                            <strong>${order.total_price.toFixed(2)} €</strong><br>
                            <span style="font-size:0.75rem; color:var(--color-text-light);">Livraison : ${order.delivery_price.toFixed(2)}€</span>
                        </td>
                        <td>
                            <select class="status-select-btn" onchange="changerStatutCommande(${order.id}, this.value)">
                                ${optionsHtml}
                            </select>
                        </td>
                        <td>
                            ${order.status === 'annulee' ? `<span style="font-size:0.75rem; color:var(--color-danger); font-style:italic;">Contact : ${order.cancellation_contact_method || '--'}<br>Motif : ${order.cancellation_reason || '--'}</span>` : '<span style="color:var(--color-success); font-weight:600;">Active</span>'}
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        } catch (e) {
            tableBody.innerHTML = "<tr><td colspan='7'>Erreur de communication.</td></tr>";
        }
    };

    // Attacher les handlers d'input
    searchInput.oninput = fetchFiltered;
    statusSelect.onchange = fetchFiltered;
    
    fetchFiltered();
}

async function changerStatutCommande(orderId, newStatus) {
    if (newStatus === 'annulee') {
        // Obligation d'ouvrir la modale de motif d'annulation (Exigence Métier)
        document.getElementById('cancel-ord-id').value = orderId;
        document.getElementById('cancel-motive-modal').style.display = 'flex';
        
        // Gérer le bouton fermer modale
        document.getElementById('cancel-modal-close').onclick = () => {
            document.getElementById('cancel-motive-modal').style.display = 'none';
            loadAdminOrders(); // recharger la table pour annuler le changement de select
        };

        // Gérer le submit
        document.getElementById('form-cancel-order').onsubmit = async (e) => {
            e.preventDefault();
            const reason = document.getElementById('cancel-reason').value;
            const contact = document.getElementById('cancel-contact-method').value;

            try {
                const response = await fetch('backend/api/update-order-status.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order_id: orderId,
                        status: 'annulee',
                        cancellation_reason: reason,
                        cancellation_contact_method: contact
                    })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    showSuccessModal("Annulation enregistrée", "La commande a été annulée et le client a été notifié par email.");
                    document.getElementById('cancel-motive-modal').style.display = 'none';
                    document.getElementById('form-cancel-order').reset();
                    loadAdminOrders();
                } else {
                    alert(result.message);
                }
            } catch (err) {
                alert("Erreur de connexion.");
            }
        };
    } else {
        // Autre changement de statut classique
        try {
            const response = await fetch('backend/api/update-order-status.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: newStatus })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showSuccessModal("Statut mis à jour", "Le nouveau statut a bien été enregistré. Si applicable, des e-mails automatiques ont été envoyés.");
                loadAdminOrders();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Erreur.");
        }
    }
}

// 3. CRUD CATALOGUE DES MENUS (Employé / Admin)
function loadAdminMenusCrud() {
    const grid = document.getElementById('admin-menus-crud-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Rendre les cartes
    STATE.menus.forEach(menu => {
        const item = document.createElement('div');
        item.className = 'stock-item-card';
        item.innerHTML = `
            <div class="stock-item-info">
                <h5>${menu.name}</h5>
                <p>Prix : ${menu.pricePerPerson.toFixed(2)}€ | Min Convives : ${menu.minPax} | Stock : <strong>${menu.stock}</strong></p>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="editerMenuModal(${menu.id})">Éditer</button>
                <button class="btn btn-primary btn-sm" style="background-color:var(--color-danger);" onclick="supprimerMenu(${menu.id})">Supprimer</button>
            </div>
        `;
        grid.appendChild(item);
    });

    // Ouvrir modale ajout
    document.getElementById('btn-add-menu-modal').onclick = () => {
        document.getElementById('form-crud-menu').reset();
        document.getElementById('crud-menu-id').value = '';
        document.getElementById('menu-crud-title').textContent = "Ajouter un nouveau Menu";
        document.getElementById('menu-crud-modal').style.display = 'flex';
    };

    document.getElementById('crud-menu-close').onclick = () => {
        document.getElementById('menu-crud-modal').style.display = 'none';
    };

    // Submit formulaire crud menu
    document.getElementById('form-crud-menu').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('crud-menu-id').value;
        const title = document.getElementById('crud-menu-title-input').value;
        const description = document.getElementById('crud-menu-desc').value;
        const theme = document.getElementById('crud-menu-theme').value;
        const regime = document.getElementById('crud-menu-regime').value;
        const min_people = parseInt(document.getElementById('crud-menu-pax').value);
        const base_price = parseFloat(document.getElementById('crud-menu-price').value);
        const prep_time = document.getElementById('crud-menu-prep').value;
        const stock = parseInt(document.getElementById('crud-menu-stock').value);
        const image_url = document.getElementById('crud-menu-image').value;
        const storage_conditions = document.getElementById('crud-menu-storage').value;

        const action = id ? 'update_menu' : 'create_menu';

        try {
            const response = await fetch('backend/api/manage-catalog.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action, id, title, description, theme, regime, min_people,
                    base_price, prep_time, stock, image_url, storage_conditions
                })
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                showSuccessModal("Succès", id ? "Le menu a été mis à jour." : "Le menu a été créé.");
                document.getElementById('menu-crud-modal').style.display = 'none';
                await fetchMenus(); // recharger la carte des menus globale
                loadAdminMenusCrud();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Erreur de communication.");
        }
    };
}

function editerMenuModal(menuId) {
    const menu = STATE.menus.find(m => m.id == menuId);
    if (!menu) return;

    document.getElementById('crud-menu-id').value = menu.id;
    document.getElementById('crud-menu-title-input').value = menu.name;
    document.getElementById('crud-menu-desc').value = menu.description;
    document.getElementById('crud-menu-theme').value = menu.theme;
    document.getElementById('crud-menu-regime').value = menu.regime;
    document.getElementById('crud-menu-pax').value = menu.minPax;
    document.getElementById('crud-menu-price').value = menu.pricePerPerson;
    document.getElementById('crud-menu-prep').value = menu.prepTime;
    document.getElementById('crud-menu-stock').value = menu.stock;
    document.getElementById('crud-menu-image').value = menu.imageLocal;
    document.getElementById('crud-menu-storage').value = menu.storage_conditions || '';

    document.getElementById('menu-crud-title').textContent = "Modifier le Menu : " + menu.name;
    document.getElementById('menu-crud-modal').style.display = 'flex';
}

async function supprimerMenu(menuId) {
    if (!confirm("Voulez-vous vraiment supprimer ce menu définitivement ?")) return;

    try {
        const response = await fetch('backend/api/manage-catalog.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_menu', id: menuId })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showSuccessModal("Menu supprimé", "Le menu a été effacé du catalogue.");
            await fetchMenus();
            loadAdminMenusCrud();
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert("Erreur.");
    }
}

// 4. GESTION DES HORAIRES (Employé / Admin)
function loadAdminSchedules() {
    const container = document.getElementById('admin-schedules-container');
    if (!container) return;
    
    // Semaine type du traiteur Lun-Dim
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    container.innerHTML = days.map(d => `
        <div class="form-row mb-12" style="align-items:center;">
            <div style="font-weight:bold;">${d}</div>
            <div style="display:flex; gap:10px;">
                <label>De : <input type="time" value="08:00" id="sch-open-${d}" style="padding:4px;"></label>
                <label>À : <input type="time" value="22:00" id="sch-close-${d}" style="padding:4px;"></label>
            </div>
        </div>
    `).join('');

    document.getElementById('form-admin-schedules').onsubmit = async (e) => {
        e.preventDefault();
        
        const schedules = days.map(d => ({
            day_of_week: d,
            open_time: document.getElementById(`sch-open-${d}`).value,
            close_time: document.getElementById(`sch-close-${d}`).value,
            is_closed: 0
        }));

        try {
            const response = await fetch('backend/api/manage-catalog.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_schedules', schedules })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showSuccessModal("Horaires enregistrés", "Les nouveaux horaires d'ouverture sont appliqués.");
                await fetchSchedules();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Erreur.");
        }
    };
}

// 5. MODÉRATION DES AVIS (Employé / Admin)
async function loadAdminReviews() {
    const tableBody = document.getElementById('admin-reviews-table-body');
    tableBody.innerHTML = "<tr><td colspan='7'>Chargement...</td></tr>";

    try {
        const response = await fetch('backend/api/get-reviews.php?all=1');
        const result = await response.json();
        
        if (result.status === 'success' && result.reviews) {
            tableBody.innerHTML = '';
            
            if (result.reviews.length === 0) {
                tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Aucun avis client déposé.</td></tr>";
                return;
            }

            result.reviews.forEach(rev => {
                const tr = document.createElement('tr');
                
                let actionsHtml = '';
                if (rev.is_validated == 0) {
                    actionsHtml = `
                        <button class="btn btn-secondary btn-sm" onclick="modererAvis(${rev.id}, 'validate')" style="background-color:var(--color-success); color:white; border:none;">Valider</button>
                        <button class="btn btn-primary btn-sm" onclick="modererAvis(${rev.id}, 'reject')" style="background-color:var(--color-danger); color:white; border:none; margin-left:6px;">Refuser</button>
                    `;
                } else {
                    actionsHtml = `<span style="color:var(--color-success); font-weight:bold;">Validé & En ligne</span>`;
                }

                tr.innerHTML = `
                    <td>${new Date(rev.created_at).toLocaleDateString()}</td>
                    <td><strong>${rev.first_name} ${rev.last_name}</strong></td>
                    <td>${rev.menu_title} (Cmd #${rev.order_id})</td>
                    <td style="color:#d4af37;">${'★'.repeat(rev.rating)}</td>
                    <td style="max-width:300px; overflow-wrap:break-word;">"${rev.comment}"</td>
                    <td>${rev.is_validated == 1 ? '<span class="badge badge-success">En ligne</span>' : '<span class="badge badge-gold">En attente</span>'}</td>
                    <td>${actionsHtml}</td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (e) {
        tableBody.innerHTML = "<tr><td colspan='7'>Erreur.</td></tr>";
    }
}

async function modererAvis(reviewId, action) {
    try {
        const response = await fetch('backend/api/validate-review.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_id: reviewId, action })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showSuccessModal("Modération enregistrée", result.message);
            loadAdminReviews();
            await fetchPublicReviews(); // Mettre à jour la page d'accueil
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert("Erreur.");
    }
}

// 6. GESTION DES COMPTES EMPLOYÉS (Admin uniquement)
async function loadAdminEmployees() {
    const tableBody = document.getElementById('admin-employees-table-body');
    tableBody.innerHTML = "<tr><td colspan='6'>Chargement...</td></tr>";

    try {
        const response = await fetch('backend/api/manage-employees.php');
        const result = await response.json();

        if (result.status === 'success' && result.employees) {
            tableBody.innerHTML = '';

            if (result.employees.length === 0) {
                tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>Aucun employé enregistré dans le système.</td></tr>";
                return;
            }

            result.employees.forEach(emp => {
                const tr = document.createElement('tr');
                
                const toggleLabel = emp.is_active == 1 ? "Désactiver" : "Activer";
                const toggleStyle = emp.is_active == 1 ? "background-color:var(--color-danger); color:white;" : "background-color:var(--color-success); color:white;";

                tr.innerHTML = `
                    <td><strong>${emp.first_name} ${emp.last_name}</strong></td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '--'}</td>
                    <td>${new Date(emp.created_at).toLocaleDateString()}</td>
                    <td>${emp.is_active == 1 ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-wine">Inactif (Inutilisable)</span>'}</td>
                    <td>
                        <button class="btn btn-sm" style="${toggleStyle} border:none;" onclick="toggleEmployeeStatus(${emp.id})">${toggleLabel}</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (e) {
        tableBody.innerHTML = "<tr><td colspan='6'>Erreur.</td></tr>";
    }

    // Modal création employé
    document.getElementById('btn-add-employee-modal').onclick = () => {
        document.getElementById('form-crud-employee').reset();
        document.getElementById('employee-crud-modal').style.display = 'flex';
    };

    document.getElementById('crud-emp-close').onclick = () => {
        document.getElementById('employee-crud-modal').style.display = 'none';
    };

    document.getElementById('form-crud-employee').onsubmit = async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('emp-first-name').value;
        const last_name = document.getElementById('emp-last-name').value;
        const email = document.getElementById('emp-email').value;
        const phone = document.getElementById('emp-phone').value;
        const password = document.getElementById('emp-password').value;

        try {
            const response = await fetch('backend/api/manage-employees.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', first_name, last_name, email, phone, password })
            });
            const result = await response.json();
            if (result.status === 'success') {
                showSuccessModal("Employé créé !", result.message);
                document.getElementById('employee-crud-modal').style.display = 'none';
                loadAdminEmployees();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Erreur.");
        }
    };
}

async function toggleEmployeeStatus(employeeId) {
    if (!confirm("Voulez-vous modifier le statut de ce compte employé ? S'il est désactivé, il ne pourra plus se connecter.")) return;
    
    try {
        const response = await fetch('backend/api/manage-employees.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_status', employee_id: employeeId })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showSuccessModal("Statut modifié", result.message);
            loadAdminEmployees();
        } else {
            alert(result.message);
        }
    } catch (err) {
        alert("Erreur.");
    }
}

// --- RECUPERATION DES AVIS POUR LA PAGE D'ACCUEIL ---
async function fetchPublicReviews() {
    const container = document.getElementById('public-reviews-container');
    if (!container) return;

    try {
        const response = await fetch('backend/api/get-reviews.php');
        const result = await response.json();
        
        if (result.status === 'success' && result.reviews && result.reviews.length > 0) {
            container.innerHTML = '';
            result.reviews.forEach(rev => {
                const card = document.createElement('div');
                card.className = 'testimonial-card';
                card.innerHTML = `
                    <div>
                        <div class="rating-stars">${'★'.repeat(rev.rating)}</div>
                        <p class="testimonial-text">"${rev.comment}"</p>
                    </div>
                    <div class="client-info">
                        <div class="client-avatar">${rev.first_name.charAt(0)}${rev.last_name_initial}</div>
                        <div>
                            <h4 class="client-name">${rev.first_name} ${rev.last_name_initial}.</h4>
                            <p class="client-role">Prestation : ${rev.menu_title}</p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            initTestimonialCarousel();
        } else {
            // Repli vers du dur si pas d'avis validés
            renderDefaultMockReviews();
        }
    } catch (e) {
        renderDefaultMockReviews();
    }
}

function renderDefaultMockReviews() {
    const container = document.getElementById('public-reviews-container');
    if (!container) return;
    container.innerHTML = `
        <div class="testimonial-card">
            <div>
                <div class="rating-stars">★★★★★</div>
                <p class="testimonial-text">"Une prestation exceptionnelle pour notre repas de Noël. L'équipe a géré de A à Z la cuisine et le service avec professionnalisme !"</p>
            </div>
            <div class="client-info">
                <div class="client-avatar">MC</div>
                <div>
                    <h4 class="client-name">Marie-Laure J.</h4>
                    <p class="client-role">Particulier, Pessac</p>
                </div>
            </div>
        </div>
        <div class="testimonial-card">
            <div>
                <div class="rating-stars">★★★★★</div>
                <p class="testimonial-text">"Vite & Gourmand porte bien son nom. Buffet d'affaires livré chaud, frais et de niveau gastronomique. Je recommande."</p>
            </div>
            <div class="client-info">
                <div class="client-avatar">JP</div>
                <div>
                    <h4 class="client-name">Jean-Philippe R.</h4>
                    <p class="client-role">CEO, Tech Innovate</p>
                </div>
            </div>
        </div>
    `;
    initTestimonialCarousel();
}

function initTestimonialCarousel() {
    const prevBtn = document.getElementById('testimonials-prev');
    const nextBtn = document.getElementById('testimonials-next');
    const track = document.getElementById('public-reviews-container');
    
    if (prevBtn && nextBtn && track) {
        let index = 0;
        const cards = track.querySelectorAll('.testimonial-card');
        
        const updateView = () => {
            cards.forEach((c, idx) => {
                c.style.display = idx === index ? 'flex' : 'none';
            });
        };
        
        prevBtn.onclick = () => {
            index = (index - 1 + cards.length) % cards.length;
            updateView();
        };
        nextBtn.onclick = () => {
            index = (index + 1) % cards.length;
            updateView();
        };
        updateView();
    }
}

// --- UTILS : AFFICHER LA MODALE SUCCÈS ---
function showSuccessModal(title, description) {
    const modal = document.getElementById('success-general-modal');
    if (modal) {
        document.getElementById('success-general-title').textContent = title;
        document.getElementById('success-general-desc').textContent = description;
        modal.style.display = 'flex';
        
        document.getElementById('success-general-close').onclick = () => {
            modal.style.display = 'none';
        };
    }
}

// --- MOCK CATALOGUE DATA FALLBACK ---
function getMockMenus() {
    return [
        {
            id: 1,
            name: 'Festin Aquitain',
            description: 'Une immersion gastronomique au cœur du Sud-Ouest. Ce menu d\'exception met à l\'honneur les produits nobles de nos producteurs locaux, entre terre et mer, pour une expérience sensorielle inoubliable.',
            tag: 'D\'exception',
            theme: 'classique',
            regime: 'classique',
            pricePerPerson: 65.00,
            minPax: 12,
            prepTime: '72h',
            imageLocal: 'assets/festin_aquitain.png',
            composition: {
                entrées: [{ name: 'Foie Gras de Canard Poêlé', desc: 'Escalope de foie gras de canard, réduction de Sauternes aux figues.', image: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=300', allergens: ['Gluten', 'Lactose'] }],
                plats: [{ name: 'Pavé de Bœuf Sauce Bordelaise', desc: 'Pavé de bœuf de Bazas grillé, jus corsé et pommes truffées.', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300', allergens: ['Lactose'] }],
                desserts: [{ name: 'Duo de Canelés et Fine Chocolat', desc: 'Canelés croustillants maison et fine mousse chocolat.', image: 'https://images.unsplash.com/photo-1608219990949-e424ac54515f?w=300', allergens: ['Gluten', 'Lactose', 'Œufs'] }]
            },
            stock: 5,
            rating: 5
        },
        {
            id: 2,
            name: 'Duo de Canard du Sud-Ouest',
            description: 'Le canard dans toute sa splendeur. Ce menu vous invite à savourer l\'alliance parfaite d\'un magret rôti rosé et d\'un confit fondant, mariés à la douceur de pommes sarladaises aux cèpes.',
            tag: 'Terroir',
            theme: 'classique',
            regime: 'classique',
            pricePerPerson: 48.00,
            minPax: 8,
            prepTime: '48h',
            imageLocal: 'assets/duo_canard.png',
            composition: {
                entrées: [{ name: 'Velouté de Cèpes du Médoc', desc: 'Crème onctueuse, noisettes et filet d\'huile blanche.', image: 'https://images.unsplash.com/photo-1547592165-e1d17f1a0655?w=300', allergens: ['Lactose', 'Fruits à coque'] }],
                plats: [{ name: 'Duo de Magret et Confit', desc: 'Magret rosé et cuisse croustillante confite.', image: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=300', allergens: [] }],
                desserts: [{ name: 'Tarte fine aux Poires et Armagnac', desc: 'Poires locales flambées au vieil Armagnac.', image: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=300', allergens: ['Gluten', 'Œufs'] }]
            },
            stock: 12,
            rating: 4.8
        }
    ];
}
