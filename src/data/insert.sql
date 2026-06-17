-- ==========================================
-- EMPRESA
-- ==========================================

INSERT INTO empresas (nome, email, telefone)
VALUES
('Salão Beleza Total', '[contato@belezatotal.com.br](mailto:contato@belezatotal.com.br)', '27999887766');

-- ==========================================
-- USUÁRIOS
-- senha padrão: 123456
-- ==========================================

INSERT INTO usuarios
(empresa_id, nome, email, senha, perfil, ativo)
VALUES
(1, 'Ana Costa', '[ana.costa@gmail.com](mailto:ana.costa@gmail.com)', '$2b$10$iE7LWj//5zWPn1Hl.vfHZuRkRmSr3P5a/no2a8lK7ELx1Y/ZPut12', 'admin', true),
(1, 'João Silva', '[joao.silva@outlook.com](mailto:joao.silva@outlook.com)', '$2b$10$iE7LWj//5zWPn1Hl.vfHZuRkRmSr3P5a/no2a8lK7ELx1Y/ZPut12', 'atendente', true),
(1, 'Maria Silva', '[maria.silva@empresa.com](mailto:maria.silva@empresa.com)', '$2b$10$iE7LWj//5zWPn1Hl.vfHZuRkRmSr3P5a/no2a8lK7ELx1Y/ZPut12', 'atendente', true);

-- ==========================================
-- PROFISSIONAIS
-- ==========================================

INSERT INTO profissionais
(empresa_id, nome, telefone, email, ativo)
VALUES
(1, 'Carlos Souza', '31955555566', '[carlos.souza@yahoo.com](mailto:carlos.souza@yahoo.com)', true),
(1, 'Ana Beatriz', '27944446677', '[ana.bia@outlook.com](mailto:ana.bia@outlook.com)', true),
(1, 'Ricardo Rocha', '11933337788', '[ricardo.rocha@empresa.com](mailto:ricardo.rocha@empresa.com)', true),
(1, 'Beatriz Alves', '21922228899', '[beatriz.a@gmail.com](mailto:beatriz.a@gmail.com)', true);

-- ==========================================
-- SERVIÇOS
-- ==========================================

INSERT INTO servicos
(empresa_id, nome, descricao, duracao_minutos, valor, ativo)
VALUES
(1, 'Corte Masculino', 'Corte tradicional masculino', 30, 35.00, true),
(1, 'Corte Feminino', 'Corte feminino completo', 60, 70.00, true),
(1, 'Escova', 'Escova simples', 45, 50.00, true),
(1, 'Manicure', 'Serviço de manicure', 40, 30.00, true),
(1, 'Pedicure', 'Serviço de pedicure', 50, 40.00, true);

-- ==========================================
-- CLIENTES
-- ==========================================

INSERT INTO clientes
(empresa_id, nome, telefone, email, data_nascimento, observacoes)
VALUES
(1, 'Pedro Santos', '27966664455', '[pedro.santos@gmail.com](mailto:pedro.santos@gmail.com)', '1990-05-10', NULL),
(1, 'Fernando Lima', '31911119900', '[fernando.lima@gmail.com](mailto:fernando.lima@gmail.com)', '1988-07-15', NULL),
(1, 'Juliana Mendes', '27900000011', '[ju.mendes@outlook.com](mailto:ju.mendes@outlook.com)', '1995-09-22', 'Cliente VIP'),
(1, 'Mariana Oliveira', '27998887711', '[mariana@email.com](mailto:mariana@email.com)', '1992-01-30', NULL),
(1, 'Lucas Martins', '27997775544', '[lucas@email.com](mailto:lucas@email.com)', '1987-12-05', NULL);

-- ==========================================
-- HORÁRIOS DE FUNCIONAMENTO
-- 0 = Domingo
-- 1 = Segunda
-- ...
-- 6 = Sábado
-- ==========================================

INSERT INTO horarios_funcionamento
(empresa_id, dia_semana, hora_inicio, hora_fim, intervalo_minutos)
VALUES
(1,1,'08:00','18:00',30),
(1,2,'08:00','18:00',30),
(1,3,'08:00','18:00',30),
(1,4,'08:00','18:00',30),
(1,5,'08:00','18:00',30),
(1,6,'08:00','13:00',30);

-- ==========================================
-- AGENDAMENTOS
-- ==========================================

INSERT INTO agendamentos
(
empresa_id,
cliente_id,
profissional_id,
servico_id,
data_agendamento,
hora_inicio,
hora_fim,
status,
observacoes
)
VALUES
(1,1,1,1,'2026-06-20','09:00','09:30','agendado','Primeiro atendimento'),
(1,2,2,2,'2026-06-20','10:00','11:00','confirmado',NULL),
(1,3,3,3,'2026-06-20','14:00','14:45','agendado',NULL),
(1,4,4,4,'2026-06-21','09:00','09:40','concluido',NULL),
(1,5,1,5,'2026-06-21','15:00','15:50','agendado',NULL);

-- ==========================================
-- BLOQUEIOS DE AGENDA
-- ==========================================

INSERT INTO bloqueios_agenda
(
profissional_id,
inicio_bloqueio,
fim_bloqueio,
motivo
)
VALUES
(
1,
'2026-06-22 12:00:00',
'2026-06-22 14:00:00',
'Almoço estendido'
),
(
2,
'2026-06-23 08:00:00',
'2026-06-23 12:00:00',
'Treinamento'
);

-- ==========================================
-- HISTÓRICO DOS AGENDAMENTOS
-- ==========================================

INSERT INTO historico_agendamentos
(
agendamento_id,
usuario_id,
acao,
status_anterior,
status_novo,
observacao
)
VALUES
(1,1,'CRIACAO',NULL,'agendado','Agendamento criado'),
(2,2,'CONFIRMACAO','agendado','confirmado','Cliente confirmou presença'),
(4,1,'FINALIZACAO','confirmado','concluido','Atendimento concluído');
