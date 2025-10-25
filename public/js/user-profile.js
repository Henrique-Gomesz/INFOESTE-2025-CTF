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
                
                // Informações do usuário
                document.getElementById('profileName').textContent = data.user.name;
                document.getElementById('profileEmail').textContent = data.user.email;
                document.getElementById('profileId').textContent = data.user.id;
                
                // Ações do perfil (editar/excluir)
                const profileActions = document.getElementById('profileActions');
                profileActions.innerHTML = '';
                
                if (currentUser && (currentUser.id == id || currentUser.role === 'admin')) {
                    profileActions.innerHTML = `
                        <button class="btn btn-secondary" onclick="editProfile(${id})">Editar Perfil</button>
                    `;
                    
                    if (currentUser.role === 'admin' && currentUser.id != id) {
                        profileActions.innerHTML += `
                            <button class="btn btn-danger" onclick="deleteUser(${id})">Excluir Usuário</button>
                        `;
                    }
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
    
    // Funções globais para os botões
    window.editProfile = function(id) {
        const newName = prompt('Novo nome:');
        const newEmail = prompt('Novo email:');
        
        if (!newName && !newEmail) return;
        
        const updateData = {};
        if (newName) updateData.name = newName;
        if (newEmail) updateData.email = newEmail;
        
        apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        })
        .then(() => {
            alert('Perfil atualizado com sucesso!');
            loadUserProfile(id);
        })
        .catch(error => {
            alert('Erro ao atualizar perfil: ' + error.message);
        });
    };
    
    window.deleteUser = function(id) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
        
        apiRequest(`/users/${id}`, {
            method: 'DELETE'
        })
        .then(() => {
            alert('Usuário excluído com sucesso!');
            window.location.href = '/users.html';
        })
        .catch(error => {
            alert('Erro ao excluir usuário: ' + error.message);
        });
    };
    
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
