-- Arquivo de apoio para os alunos enxergarem o SQL das tabelas base.
-- Quando for criar uma tabela nova manualmente:
-- 1) escreva o CREATE TABLE aqui como rascunho e referencia;
-- 2) copie a mesma estrutura para src/data/db.js;
-- 3) suba o projeto para o backend executar o CREATE TABLE IF NOT EXISTS.

-- ==========================================
-- EMPRESAS
-- ==========================================
CREATE TABLE empresas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    telefone VARCHAR(20),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- USUÁRIOS
-- ==========================================
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha TEXT NOT NULL,
    perfil VARCHAR(50) NOT NULL, -- admin, atendente, etc
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    foto TEXT NOT NULL

    CONSTRAINT usuarios_email_empresa_unique
        UNIQUE (empresa_id, email)
);

-- ==========================================
-- PROFISSIONAIS
-- ==========================================
CREATE TABLE profissionais (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    foto TEXT NOT NULL
);

-- ==========================================
-- SERVIÇOS
-- ==========================================
CREATE TABLE servicos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    duracao_minutos INTEGER NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    foto TEXT NOT NULL
);

-- ==========================================
-- CLIENTES
-- ==========================================
CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255),
    data_nascimento DATE,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AGENDAMENTOS
-- ==========================================
CREATE TABLE agendamentos (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    profissional_id BIGINT NOT NULL REFERENCES profissionais(id) ON DELETE RESTRICT,
    servico_id BIGINT NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,

    data_agendamento DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'agendado',

    observacoes TEXT,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_hora_agendamento
        CHECK (hora_fim > hora_inicio)
);

-- ==========================================
-- HORÁRIOS DE FUNCIONAMENTO
-- ==========================================
CREATE TABLE horarios_funcionamento (
    id BIGSERIAL PRIMARY KEY,

    empresa_id BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

    dia_semana SMALLINT NOT NULL
        CHECK (dia_semana BETWEEN 0 AND 6),

    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,

    intervalo_minutos INTEGER DEFAULT 30,

    CONSTRAINT chk_horario_funcionamento
        CHECK (hora_fim > hora_inicio)
);

-- ==========================================
-- BLOQUEIOS DE AGENDA
-- ==========================================
CREATE TABLE bloqueios_agenda (
    id BIGSERIAL PRIMARY KEY,

    profissional_id BIGINT NOT NULL
        REFERENCES profissionais(id)
        ON DELETE CASCADE,

    inicio_bloqueio TIMESTAMP WITH TIME ZONE NOT NULL,
    fim_bloqueio TIMESTAMP WITH TIME ZONE NOT NULL,

    motivo TEXT,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_periodo_bloqueio
        CHECK (fim_bloqueio > inicio_bloqueio)
);

-- ==========================================
-- HISTÓRICO DE AGENDAMENTOS
-- ==========================================
CREATE TABLE historico_agendamentos (
    id BIGSERIAL PRIMARY KEY,

    agendamento_id BIGINT NOT NULL
        REFERENCES agendamentos(id)
        ON DELETE CASCADE,

    usuario_id BIGINT NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    acao VARCHAR(100) NOT NULL,
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30),

    observacao TEXT,

    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES
-- ==========================================

CREATE INDEX idx_usuarios_empresa
ON usuarios(empresa_id);

CREATE INDEX idx_profissionais_empresa
ON profissionais(empresa_id);

CREATE INDEX idx_servicos_empresa
ON servicos(empresa_id);

CREATE INDEX idx_clientes_empresa
ON clientes(empresa_id);

CREATE INDEX idx_agendamentos_empresa
ON agendamentos(empresa_id);

CREATE INDEX idx_agendamentos_data
ON agendamentos(data_agendamento);

CREATE INDEX idx_agendamentos_profissional
ON agendamentos(profissional_id);

CREATE INDEX idx_bloqueios_profissional
ON bloqueios_agenda(profissional_id);

CREATE INDEX idx_historico_agendamento
ON historico_agendamentos(agendamento_id);
