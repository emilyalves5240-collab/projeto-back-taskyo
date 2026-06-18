// servicosController.js — CRUD de serviços
//
// Ponto importante de segurança (UC3 Bloco C / Aula 1 — pilar Confidencialidade):
// toda operação aqui é restrita à empresa logada. O empresa_id NÃO vem do
// body — vem do token (req.empresaId). Assim, uma empresa não consegue ver,
// alterar ou apagar serviços de outra empresa.
//
// Observação: este controller assume que o middleware de autenticação
// preenche req.empresaId a partir do token, da mesma forma que o exemplo de
// tarefas preenchia req.usuarioId. Se o seu middleware usar outro nome de
// propriedade, ajuste as referências abaixo.

import { getDatabase } from '../data/db.js';

const CAMPOS_SERVICO = 'id, empresa_id, nome, descricao, duracao_minutos, valor, ativo, criado_em, foto';

// Aceita boolean, número (0/1) ou texto ("true"/"sim"/"ativo" etc.) e
// devolve sempre um boolean.
function normalizarAtivo(valor, fallback = true) {
  if (typeof valor === 'boolean') return valor;
  if (valor === undefined || valor === null || valor === '') return fallback;
  if (typeof valor === 'number') return valor !== 0;
  if (typeof valor === 'string') {
    const texto = valor.trim().toLowerCase();
    if (['true', '1', 'sim', 'ativo'].includes(texto)) return true;
    if (['false', '0', 'nao', 'não', 'inativo'].includes(texto)) return false;
  }
  return fallback;
}

// Drivers diferentes podem devolver "ativo" como 0/1 em vez de boolean
// (comum em SQLite). "valor" é devolvido como veio do banco — alguns
// drivers de Postgres retornam NUMERIC como string de propósito, para não
// perder precisão decimal, então evitamos forçar conversão aqui.
function normalizarServicoSaida(servico) {
  return {
    ...servico,
    ativo: Boolean(servico.ativo)
  };
}

function validarDuracao(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function validarValor(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

// GET /servicos — só os da empresa logada
export async function listar(req, res) {
  try {
    const db = await getDatabase();
    const servicos = await db.all(
      `SELECT ${CAMPOS_SERVICO} FROM servicos WHERE empresa_id = ? ORDER BY nome ASC`,
      [req.empresaId]
    );
    res.json(servicos.map(normalizarServicoSaida));
  } catch (erro) {
    console.error('[servicos.listar]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar serviços.' });
  }
}

// GET /servicos/:id — só se o serviço for da empresa logada
export async function buscarPorId(req, res) {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    const servico = await db.get(
      `SELECT ${CAMPOS_SERVICO} FROM servicos WHERE id = ? AND empresa_id = ?`,
      [id, req.empresaId]
    );

    if (!servico) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }
    res.json(normalizarServicoSaida(servico));
  } catch (erro) {
    console.error('[servicos.buscarPorId]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar serviço.' });
  }
}

// GET /servicos/empresa/:empresaId
// Uso didático — mostra como filtrar por chave estrangeira (empresa_id).
// Por segurança, só a própria empresa pode listar os próprios serviços
// por esse endpoint.
export async function listarPorEmpresa(req, res) {
  const empresaIdSolicitada = Number(req.params.empresaId);

  if (empresaIdSolicitada !== req.empresaId) {
    return res.status(403).json({
      mensagem: 'Você só pode listar os serviços da própria empresa.'
    });
  }

  try {
    const db = await getDatabase();
    const servicos = await db.all(
      `SELECT ${CAMPOS_SERVICO} FROM servicos WHERE empresa_id = ? ORDER BY nome ASC`,
      [empresaIdSolicitada]
    );
    res.json(servicos.map(normalizarServicoSaida));
  } catch (erro) {
    console.error('[servicos.listarPorEmpresa]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar serviços da empresa.' });
  }
}

// POST /servicos — body { nome, descricao, duracao_minutos, valor, ativo, foto }.
// empresa_id vem do token, nunca do body.
export async function criar(req, res) {
  const { nome, descricao, duracao_minutos, valor, ativo, foto } = req.body;

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Informe um nome válido.' });
  }

  if (!foto || typeof foto !== 'string' || !foto.trim()) {
    return res.status(400).json({ mensagem: 'Informe a foto do serviço.' });
  }

  const duracaoValida = validarDuracao(duracao_minutos);
  if (duracaoValida === null) {
    return res.status(400).json({ mensagem: 'Informe uma duração (em minutos) válida.' });
  }

  const valorValido = validarValor(valor);
  if (valorValido === null) {
    return res.status(400).json({ mensagem: 'Informe um valor válido.' });
  }

  const ativoFinal = normalizarAtivo(ativo, true);

  try {
    const db = await getDatabase();
    const resultado = await db.run(
      'INSERT INTO servicos (empresa_id, nome, descricao, duracao_minutos, valor, ativo, foto) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.empresaId, nome.trim(), descricao?.trim() || null, duracaoValida, valorValido, ativoFinal, foto.trim()]
    );

    res.status(201).json({
      id: resultado.lastID,
      empresa_id: req.empresaId,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      duracao_minutos: duracaoValida,
      valor: valorValido,
      ativo: ativoFinal,
      foto: foto.trim()
    });
  } catch (erro) {
    console.error('[servicos.criar]', erro);
    res.status(500).json({ mensagem: 'Erro ao criar serviço.' });
  }
}

// PUT /servicos/:id — atualização parcial. Só permite mexer em
// serviço da própria empresa.
export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, descricao, duracao_minutos, valor, ativo, foto } = req.body;

  try {
    const db = await getDatabase();
    const atual = await db.get(
      `SELECT ${CAMPOS_SERVICO} FROM servicos WHERE id = ? AND empresa_id = ?`,
      [id, req.empresaId]
    );

    if (!atual) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }

    // mantém o valor atual quando o campo não vem no body
    const novoNome = nome?.trim() || atual.nome;
    const novaFoto = foto?.trim() || atual.foto;
    const novaDescricao = descricao !== undefined ? (descricao?.trim() || null) : atual.descricao;
    const novoAtivo = ativo !== undefined ? normalizarAtivo(ativo, atual.ativo) : Boolean(atual.ativo);

    let novaDuracao = atual.duracao_minutos;
    if (duracao_minutos !== undefined) {
      const duracaoValida = validarDuracao(duracao_minutos);
      if (duracaoValida === null) {
        return res.status(400).json({ mensagem: 'Informe uma duração (em minutos) válida.' });
      }
      novaDuracao = duracaoValida;
    }

    let novoValor = atual.valor;
    if (valor !== undefined) {
      const valorValido = validarValor(valor);
      if (valorValido === null) {
        return res.status(400).json({ mensagem: 'Informe um valor válido.' });
      }
      novoValor = valorValido;
    }

    await db.run(
      'UPDATE servicos SET nome = ?, descricao = ?, duracao_minutos = ?, valor = ?, ativo = ?, foto = ? WHERE id = ?',
      [novoNome, novaDescricao, novaDuracao, novoValor, novoAtivo, novaFoto, id]
    );

    res.json({
      id: Number(id),
      empresa_id: req.empresaId,
      nome: novoNome,
      descricao: novaDescricao,
      duracao_minutos: novaDuracao,
      valor: novoValor,
      ativo: novoAtivo,
      foto: novaFoto
    });
  } catch (erro) {
    console.error('[servicos.atualizar]', erro);
    res.status(500).json({ mensagem: 'Erro ao atualizar serviço.' });
  }
}

// DELETE /servicos/:id
export async function remover(req, res) {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    const resultado = await db.run(
      'DELETE FROM servicos WHERE id = ? AND empresa_id = ?',
      [id, req.empresaId]
    );

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Serviço não encontrado.' });
    }
    res.json({ mensagem: 'Serviço removido com sucesso.' });
  } catch (erro) {
    console.error('[servicos.remover]', erro);
    res.status(500).json({ mensagem: 'Erro ao remover serviço.' });
  }
}