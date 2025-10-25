// forgot-password.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se já estiver logado
    if (isLoggedIn()) {
        window.location.href = '/dashboard.html';
        return;
    }
    
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const errorDiv = document.getElementById('error');
    const messageDiv = document.getElementById('message');
    
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorDiv.style.display = 'none';
        messageDiv.style.display = 'none';
        
        const email = document.getElementById('email').value;
        
        try {
            const data = await apiRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            if (data.success) {
                messageDiv.textContent = data.message + ' Verifique o console do navegador (F12) para ver o código.';
                messageDiv.style.display = 'block';
                
                // Mostra formulário de reset
                forgotPasswordForm.style.display = 'none';
                resetPasswordForm.style.display = 'block';
                document.getElementById('resetEmail').value = email;
                
                // VULNERABILIDADE: Tenta obter o OTP do cookie
                try {
                    const otpCookie = getCookie('reset_otp');
                    if (otpCookie) {
                        const otpData = JSON.parse(otpCookie);
                        console.log('🚨 VULNERABILIDADE: OTP encontrado no cookie!');
                        console.log('OTP:', otpData.otp);
                        console.log('Email:', otpData.email);
                        console.log('Expira em:', new Date(otpData.expires).toLocaleString());
                    }
                } catch (e) {
                    console.error('Erro ao ler cookie de OTP:', e);
                }
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
    
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorDiv.style.display = 'none';
        messageDiv.style.display = 'none';
        
        const email = document.getElementById('resetEmail').value;
        const otp = document.getElementById('otp').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            errorDiv.textContent = 'As senhas não coincidem';
            errorDiv.style.display = 'block';
            return;
        }
        
        try {
            const data = await apiRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email, otp, password, confirmPassword })
            });
            
            if (data.success) {
                messageDiv.textContent = data.message;
                messageDiv.style.display = 'block';
                
                // Redireciona para login após 2 segundos
                setTimeout(() => {
                    window.location.href = '/login.html?message=' + encodeURIComponent('Senha redefinida com sucesso! Faça login.');
                }, 2000);
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    });
});
