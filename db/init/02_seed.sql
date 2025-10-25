USE unilab;

-- Inserir usuários (alguns com role admin/staff para simular administradores)
INSERT INTO users (name, email, password, role) VALUES
('Admin Alice', 'admin@uni.local', 'admin', 'admin'),
('Prof. Bob', 'bob@uni.local', 'bob', 'staff'),
('Prof. Carol', 'carol@uni.local', 'carol', 'staff'),
('Eve Student', 'eve@uni.local', 'eve', 'student'),
('Mallory Student', 'mallory@uni.local', 'mallory', 'student');

-- Comentários com HTML (author_id agora referencia users)
INSERT INTO comments (student_id, author_id, body) VALUES
(4, 2, '<em>Parabéns</em> pelo desempenho!'),
(5, 3, '<script>alert("XSS em perfil")</script>');
