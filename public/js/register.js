// register.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se já estiver logado
    if (isLoggedIn()) {
        window.location.href = '/dashboard.html';
        return;
    }
    
    const form = document.getElementById('registerForm');
    const errorDiv = document.getElementById('error');
    const messageDiv = document.getElementById('message');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorDiv.style.display = 'none';
        messageDiv.style.display = 'none';
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const data = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });
            
            if (data.success) {
                messageDiv.textContent = data.message;
                messageDiv.style.display = 'block';
                
                // Redireciona para login após 2 segundos
                setTimeout(() => {
                    window.location.href = '/login.html?message=' + encodeURIComponent('Conta criada com sucesso! Faça login.');
                }, 2000);
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
});
