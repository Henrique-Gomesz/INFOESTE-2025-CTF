// users.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    
    // Verifica se o usuário é admin
    const currentUser = getCurrentUser();
    
    // Configura link "Meu Perfil" na navbar
    if (currentUser) {
        const myProfileNavLink = document.getElementById('myProfileNavLink');
        if (myProfileNavLink) {
            myProfileNavLink.href = `/user.html?id=${currentUser.id}`;
        }
    }
    
    if (!currentUser || currentUser.role !== 'admin') {
        document.body.innerHTML = `
            <nav class="navbar">
                <div class="container">
                    <div class="nav-brand">🏦 Banco Digital</div>
                    <div class="nav-links">
                        <a href="/">Início</a>
                        <a href="/dashboard.html">Dashboard</a>
                        <a href="/social.html">Feed Social</a>
                        <a href="/user.html?id=${currentUser.id}">Meu Perfil</a>
                        <a href="#" id="logoutLink">Sair</a>
                    </div>
                </div>
            </nav>
            <div class="container">
                <div style="text-align: center; padding: 50px;">
                    <h1>🔒 Acesso Negado</h1>
                    <p>Apenas administradores podem visualizar a lista de usuários.</p>
                    <a href="/dashboard.html" class="btn btn-primary">Voltar ao Dashboard</a>
                </div>
            </div>
        `;
        return;
    }
    
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const usersList = document.getElementById('usersList');
    const searchQuery = document.getElementById('searchQuery');
    const queryText = document.getElementById('queryText');
    
    // Obtém query da URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    if (query) {
        searchInput.value = query;
    }
    
    // Carrega usuários
    loadUsers(query);
    
    // Handler do formulário de busca
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        
        // Atualiza URL
        const newUrl = q ? `?q=${encodeURIComponent(q)}` : window.location.pathname;
        window.history.pushState({}, '', newUrl);
        
        loadUsers(q);
    });
    
    async function loadUsers(q = '') {
        try {
            usersList.innerHTML = '<p>Carregando...</p>';

            const endpoint = q ? `/users?q=${encodeURIComponent(q)}` : '/users';
            const data = await apiRequest(endpoint);
            
            if (q) {
                searchQuery.style.display = 'block';
                // VULNERABILIDADE XSS: Insere query diretamente no HTML
                queryText.innerHTML = q;
            } else {
                searchQuery.style.display = 'none';
            }
            
            if (data.users && data.users.length > 0) {
                usersList.innerHTML = data.users.map(user => `
                    <div class="user-card">
                        <h3>${escapeHtml(user.name || user.id || 'N/A')}</h3>
                        <p><strong>Email/Info:</strong> ${escapeHtml(user.email || 'N/A')}</p>
                        <p><strong>ID:</strong> ${escapeHtml(String(user.id || 'N/A'))}</p>
                        ${user.id && !isNaN(user.id) ? `<a href="/user.html?id=${user.id}" class="btn btn-primary">Ver Perfil</a>` : ''}
                    </div>
                `).join('');
            } else {
                usersList.innerHTML = '<p>Nenhum usuário encontrado.</p>';
            }
        } catch (error) {
            usersList.innerHTML = `<p class="error">Erro ao carregar usuários: ${escapeHtml(error.message)}</p>`;
        }
    }
    
    // Função auxiliar para escapar HTML (proteção contra XSS)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
