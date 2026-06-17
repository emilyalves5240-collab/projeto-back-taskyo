// agendamentosController.js — CRUD de agendamentos
//
// Segurança: toda operação é restrita à empresa do usuário logado.
// empresa_id NÃO vem do body — vem do token (req.empresaId).

import { getDatabase } from '../data/db.js';

const STATUS_VALIDOS = new Set(['agendado', 'confirmado', 'cancelado', 'concluido']);

function normalizarStatus(status, fallback = 'agendado') {
  if (!status || typeof status !== 'string') return fallback;

  const valor = String(status)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (STATUS_VALIDOS.has(valor)) return valor;

  return fallback;
}

// GET /agendamentos — todos da empresa, com filtros opcionais por data e profissional
export async function listar(req, res) {
  const { data, profissional_id } = req.query;

  try {
    const db = await getDatabase();

    let query = `
      SELECT
        a.id,
        a.cliente_id,
        a.profissional_id,
        a.servico_id,
        a.data_agendamento,
        a.hora_inicio,
        a.hora_fim,
        a.status,
        a.observacoes,
        a.criado_em,
        a.atualizado_em
      FROM agendamentos a
      WHERE a.empresa_id = $1
    `;
    const params = [req.empresaId];

    if (data) {
      params.push(data);
      query += ` AND a.data_agendamento = $${params.length}`;
    }

    if (profissional_id) {
      params.push(Number(profissional_id));
      query += ` AND a.profissional_id = $${params.length}`;
    }

    query += ' ORDER BY a.data_agendamento ASC, a.hora_inicio ASC';

    const agendamentos = await db.all(query, params);
    res.json(agendamentos);
  } catch (erro) {
    console.error('[agendamentos.listar]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar agendamentos.' });
  }
}

// GET /agendamentos/:id
export async function buscarPorId(req, res) {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const agendamento = await db.get(
      `SELECT
        id, cliente_id, profissional_id, servico_id,
        data_agendamento, hora_inicio, hora_fim,
        status, observacoes, criado_em, atualizado_em
      FROM agendamentos
      WHERE id = $1 AND empresa_id = $2`,
      [id, req.empresaId]
    );

    if (!agendamento) {
      return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    }

    res.json(agendamento);
  } catch (erro) {
    console.error('[agendamentos.buscarPorId]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar agendamento.' });
  }
}

// POST /agendamentos
// body: { cliente_id, profissional_id, servico_id, data_agendamento, hora_inicio, hora_fim, observacoes? }
export async function criar(req, res) {
  const {
    cliente_id,
    profissional_id,
    servico_id,
    data_agendamento,
    hora_inicio,
    hora_fim,
    observacoes,
  } = req.body;

  if (!cliente_id)       return res.status(400).json({ mensagem: 'Informe o cliente.' });
  if (!profissional_id)  return res.status(400).json({ mensagem: 'Informe o profissional.' });
  if (!servico_id)       return res.status(400).json({ mensagem: 'Informe o serviço.' });
  if (!data_agendamento) return res.status(400).json({ mensagem: 'Informe a data do agendamento.' });
  if (!hora_inicio)      return res.status(400).json({ mensagem: 'Informe o horário de início.' });
  if (!hora_fim)         return res.status(400).json({ mensagem: 'Informe o horário de término.' });

  // Validação duplicada da constraint chk_hora_agendamento — falha rápido antes de ir ao banco
  if (hora_fim <= hora_inicio) {
    return res.status(400).json({ mensagem: 'O horário de término deve ser posterior ao de início.' });
  }

  try {
    const db = await getDatabase();
    const resultado = await db.run(
      `INSERT INTO agendamentos
        (empresa_id, cliente_id, profissional_id, servico_id,
         data_agendamento, hora_inicio, hora_fim, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, cliente_id, profissional_id, servico_id,
                 data_agendamento, hora_inicio, hora_fim,
                 status, observacoes, criado_em, atualizado_em`,
      [
        req.empresaId,
        cliente_id,
        profissional_id,
        servico_id,
        data_agendamento,
        hora_inicio,
        hora_fim,
        observacoes?.trim() || null,
      ]
    );

    res.status(201).json(resultado);
  } catch (erro) {
    console.error('[agendamentos.criar]', erro);
    res.status(500).json({ mensagem: 'Erro ao criar agendamento.' });
  }
}

// PUT /agendamentos/:id — atualização parcial
export async function atualizar(req, res) {
  const { id } = req.params;
  const {
    cliente_id,
    profissional_id,
    servico_id,
    data_agendamento,
    hora_inicio,
    hora_fim,
    status,
    observacoes,
  } = req.body;

  try {
    const db = await getDatabase();
    const atual = await db.get(
      `SELECT id, cliente_id, profissional_id, servico_id,
              data_agendamento, hora_inicio, hora_fim,
              status, observacoes
       FROM agendamentos
       WHERE id = $1 AND empresa_id = $2`,
      [id, req.empresaId]
    );

    if (!atual) {
      return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    }

    // ?? mantém o valor atual quando o campo não vem no body
    const novoCliente       = cliente_id       ?? atual.cliente_id;
    const novoProfissional  = profissional_id  ?? atual.profissional_id;
    const novoServico       = servico_id       ?? atual.servico_id;
    const novaData          = data_agendamento ?? atual.data_agendamento;
    const novaHoraInicio    = hora_inicio      ?? atual.hora_inicio;
    const novaHoraFim       = hora_fim         ?? atual.hora_fim;
    const novoStatus        = typeof status === 'string'
      ? normalizarStatus(status, atual.status)
      : atual.status;
    const novasObservacoes  = observacoes !== undefined
      ? (observacoes?.trim() || null)
      : atual.observacoes;

    if (novaHoraFim <= novaHoraInicio) {
      return res.status(400).json({ mensagem: 'O horário de término deve ser posterior ao de início.' });
    }

    const atualizado = await db.run(
      `UPDATE agendamentos
       SET cliente_id      = $1,
           profissional_id = $2,
           servico_id      = $3,
           data_agendamento = $4,
           hora_inicio     = $5,
           hora_fim        = $6,
           status          = $7,
           observacoes     = $8,
           atualizado_em   = NOW()
       WHERE id = $9 AND empresa_id = $10
       RETURNING id, cliente_id, profissional_id, servico_id,
                 data_agendamento, hora_inicio, hora_fim,
                 status, observacoes, criado_em, atualizado_em`,
      [
        novoCliente,
        novoProfissional,
        novoServico,
        novaData,
        novaHoraInicio,
        novaHoraFim,
        novoStatus,
        novasObservacoes,
        id,
        req.empresaId,
      ]
    );

    res.json(atualizado);
  } catch (erro) {
    console.error('[agendamentos.atualizar]', erro);
    res.status(500).json({ mensagem: 'Erro ao atualizar agendamento.' });
  }
}

// DELETE /agendamentos/:id
export async function remover(req, res) {
  const { id } = req.params;

  try {
    const db = await getDatabase();
    const resultado = await db.run(
      'DELETE FROM agendamentos WHERE id = $1 AND empresa_id = $2',
      [id, req.empresaId]
    );

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Agendamento não encontrado.' });
    }

    res.json({ mensagem: 'Agendamento removido com sucesso.' });
  } catch (erro) {
    console.error('[agendamentos.remover]', erro);
    res.status(500).json({ mensagem: 'Erro ao remover agendamento.' });
  }
}
