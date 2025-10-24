USE unilab;

INSERT INTO users (name, email, password, role) VALUES
('Admin Alice', 'admin@uni.local', 'admin', 'admin'),
('Prof. Bob', 'bob@uni.local', 'bob', 'staff'),
('Prof. Carol', 'carol@uni.local', 'carol', 'staff'),
('Eve Student', 'eve@uni.local', 'eve', 'student'),
('Mallory Student', 'mallory@uni.local', 'mallory', 'student');

INSERT INTO students (user_id, name, email, address, advisor_id) VALUES
(4, 'Eve Student', 'eve@uni.local', 'Rua 1, 123', 2),
(5, 'Mallory Student', 'mallory@uni.local', 'Av. 2, 456', 3);

INSERT INTO courses (code, title, seats) VALUES
('CS101', 'Introdução à Computação', 2),
('SEC201', 'Segurança da Informação', 1);

INSERT INTO enrollments (student_id, course_id) VALUES
(1, 1);

INSERT INTO grades (student_id, course_id, grade) VALUES
(1, 1, 'A'),
(2, 1, 'B');

-- XSS armazenado em anúncio
INSERT INTO announcements (author_id, title, body) VALUES
(2, 'Boas-vindas', '<p>Bem-vindos ao semestre!</p>'),
(2, 'Aviso Importante', '<strong>Manutenção</strong> amanhã às 10h'),
(3, 'Promoção', '<img src=x onerror="alert(\'XSS armazenado\')"> Desconto no restaurante');

-- Comentários com HTML
INSERT INTO comments (student_id, author_id, body) VALUES
(1, 2, '<em>Parabéns</em> pelo desempenho!'),
(2, 3, '<script>alert("XSS em perfil")</script>');
