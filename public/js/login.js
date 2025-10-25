// login.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se já estiver logado
    if (isLoggedIn()) {
        window.location.href = '/dashboard.html';
        return;
    }
    
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('error');
    const messageDiv = document.getElementById('message');
    
    // Mostra mensagem se houver
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorDiv.style.display = 'none';
        messageDiv.style.display = 'none';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (data.success) {
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
});
