// users.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
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
                        <h3>${escapeHtml(user.name)}</h3>
                        <p>Email: ${escapeHtml(user.email)}</p>
                        <p>ID: ${user.id}</p>
                        <a href="/user.html?id=${user.id}" class="btn btn-primary">Ver Perfil</a>
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
