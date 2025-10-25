// user-profile.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        showError('ID do usuário não fornecido');
        return;
    }
    
    const currentUser = getCurrentUser();
    
    // Configura link "Meu Perfil" na navbar
    if (currentUser) {
        const myProfileNavLink = document.getElementById('myProfileNavLink');
        if (myProfileNavLink) {
            myProfileNavLink.href = `/user.html?id=${currentUser.id}`;
        }
    }
    
    // Mostra link de usuários se for admin
    if (currentUser && currentUser.role === 'admin') {
        const usersNavLink = document.getElementById('usersNavLink');
        if (usersNavLink) {
            usersNavLink.style.display = 'inline';
        }
    }
    
    loadUserProfile(userId);
    
    // Handler do formulário de comentário
    const commentForm = document.getElementById('commentForm');
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const body = document.getElementById('commentBody').value;
        
        try {
            await apiRequest(`/users/${userId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ body })
            });
            
            // Limpa o formulário e recarrega comentários
            document.getElementById('commentBody').value = '';
            loadUserProfile(userId);
        } catch (error) {
            alert('Erro ao adicionar comentário: ' + error.message);
        }
    });
    
    async function loadUserProfile(id) {
        try {
            document.getElementById('loadingMessage').style.display = 'block';
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('userProfile').style.display = 'none';
            
            const data = await apiRequest(`/users/${id}`);
            
            if (data.success && data.user) {
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('userProfile').style.display = 'block';
                
                // Informações do usuário - NOME, CONTA E BIO
                document.getElementById('profileName').textContent = data.user.name;
                document.getElementById('profileAccount').textContent = data.user.account_number || 'N/A';
                document.getElementById('profileBio').textContent = data.user.bio || 'Este usuário ainda não adicionou uma biografia.';
                
                // Mostra botão de editar apenas para o dono do perfil
                if (currentUser && currentUser.id == id) {
                    document.getElementById('editProfileSection').style.display = 'block';
                    setupEditProfile(id, data.user);
                }
                
                // Comentários (VULNERABILIDADE: XSS armazenado)
                const commentsList = document.getElementById('commentsList');
                if (data.comments && data.comments.length > 0) {
                    commentsList.innerHTML = data.comments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-header">
                                <span class="comment-author">${escapeHtml(comment.author)}</span>
                                <span class="comment-date">${new Date().toLocaleDateString()}</span>
                            </div>
                            <div class="comment-body">${comment.body}</div>
                            ${canDeleteComment(comment) ? `
                                <div class="comment-actions">
                                    <button class="btn btn-danger btn-sm" onclick="deleteComment(${id}, ${comment.id})">Excluir</button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                } else {
                    commentsList.innerHTML = '<p class="comments-empty">Nenhum comentário ainda.</p>';
                }
            } else {
                showError('Usuário não encontrado');
            }
        } catch (error) {
            showError('Erro ao carregar perfil: ' + error.message);
        }
    }
    
    function canDeleteComment(comment) {
        if (!currentUser) return false;
        
        return currentUser.role === 'admin' || 
               currentUser.id == userId || 
               currentUser.id == comment.author_id;
    }
    
    function showError(message) {
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('userProfile').style.display = 'none';
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorMessage').style.display = 'block';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function formatMoney(value) {
        return parseFloat(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    // Configura a edição de perfil
    function setupEditProfile(userId, userData) {
        const editBtn = document.getElementById('editProfileBtn');
        const modal = document.getElementById('editModal');
        const closeModal = document.getElementById('closeModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const editForm = document.getElementById('editProfileForm');
        
        // Abre o modal
        editBtn.addEventListener('click', () => {
            document.getElementById('editName').value = userData.name;
            document.getElementById('editBio').value = userData.bio || '';
            modal.style.display = 'block';
        });
        
        // Fecha o modal
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        cancelEdit.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Fecha ao clicar fora do modal
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Submete as alterações
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newName = document.getElementById('editName').value;
            const newBio = document.getElementById('editBio').value;
            
            try {
                const response = await apiRequest(`/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: newName,
                        bio: newBio
                    })
                });
                
                if (response.success) {
                    alert('Perfil atualizado com sucesso!');
                    modal.style.display = 'none';
                    loadUserProfile(userId);
                } else {
                    alert('Erro ao atualizar perfil: ' + response.error);
                }
            } catch (error) {
                alert('Erro ao atualizar perfil: ' + error.message);
            }
        });
    }
    
    // Função global para excluir comentário
    window.deleteComment = function(userId, commentId) {
        if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
        
        apiRequest(`/users/${userId}/comments/${commentId}`, {
            method: 'DELETE'
        })
        .then(() => {
            loadUserProfile(userId);
        })
        .catch(error => {
            alert('Erro ao excluir comentário: ' + error.message);
        });
    };
});
