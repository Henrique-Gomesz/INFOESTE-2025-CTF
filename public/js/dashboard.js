// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    
    const user = getCurrentUser();
    
    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role || 'student';
        document.getElementById('userId').textContent = user.id;
        
        // Link para o próprio perfil
        const myProfileLink = document.getElementById('myProfileLink');
        if (myProfileLink) {
            myProfileLink.href = `/user.html?id=${user.id}`;
        }
        
        // Mostra card de admin se for admin
        if (user.role === 'admin') {
            const adminCard = document.getElementById('adminCard');
            if (adminCard) {
                adminCard.style.display = 'block';
            }
        }
    }
});
