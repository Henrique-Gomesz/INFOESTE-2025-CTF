// home.js
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    
    if (user) {
        document.getElementById('loginPrompt').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role || 'student';
    } else {
        document.getElementById('loginPrompt').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
    }
});
