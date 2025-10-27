// Configuração da API
const API_BASE_URL = window.location.origin + '/api';

// Funções utilitárias para cookies
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// Verifica se o usuário está logado
function isLoggedIn() {
    return getCookie('token') !== null;
}

// Obtém informações do usuário do cookie (JWT decodificado - inseguro!)
function getCurrentUser() {
    const token = getCookie('token');
    if (!token) return null;
    
    try {
        // Decodifica JWT (base64) - VULNERABILIDADE: sem validação de assinatura
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (e) {
        console.error('Erro ao decodificar token:', e);
        return null;
    }
}

// Atualiza a navegação baseado no estado de autenticação
function updateNavigation() {
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const usersLink = document.getElementById('usersLink');
    
    if (isLoggedIn()) {
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'inline';
        if (dashboardLink) dashboardLink.style.display = 'inline';
        if (usersLink) usersLink.style.display = 'inline';
    } else {
        if (loginLink) loginLink.style.display = 'inline';
        if (logoutLink) logoutLink.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (usersLink) usersLink.style.display = 'none';
    }
}

// Função de logout
function logout() {
    fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(() => {
        deleteCookie('token');
        window.location.href = '/login.html';
    })
    .catch(err => {
        console.error('Erro no logout:', err);
        // Logout local mesmo se falhar no servidor
        deleteCookie('token');
        window.location.href = '/login.html';
    });
}

// Adiciona listener para o botão de logout
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...defaultOptions,
        ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }
    
    return data;
}
