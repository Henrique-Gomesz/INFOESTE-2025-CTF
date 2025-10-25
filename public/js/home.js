// home.js
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    
    if (user) {
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userName').textContent = user.name;
        
        // Mostra links do menu
        const socialLink = document.getElementById('socialLink');
        if (socialLink) socialLink.style.display = 'inline';
        
        // Mostra link de usuários apenas para admin
        const usersLink = document.getElementById('usersLink');
        if (usersLink && user.role === 'admin') {
            usersLink.style.display = 'inline';
        }
    } else {
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
    }
});
