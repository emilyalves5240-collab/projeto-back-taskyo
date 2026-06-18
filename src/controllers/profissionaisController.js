// profissionaisController.js — CRUD de profissionais
//
// Ponto importante de segurança (UC3 Bloco C / Aula 1 — pilar Confidencialidade):
// toda operação aqui é restrita à empresa logada. O empresa_id NÃO vem do
// body — vem do token (req.empresaId). Assim, uma empresa não consegue ver,
// alterar ou apagar profissionais de outra empresa.
//
// Observação: este controller assume que o middleware de autenticação
// preenche req.empresaId a partir do token, da mesma forma que o exemplo de
// tarefas preenchia req.usuarioId. Se o seu middleware usar outro nome de
// propriedade, ajuste as referências abaixo.

import { getDatabase } from '../data/db.js';

const CAMPOS_PROFISSIONAL = 'id, empresa_id, nome, telefone, email, ativo, criado_em, foto';

// Aceita boolean, número (0/1) ou texto ("true"/"sim"/"ativo" etc.) e
// devolve sempre um boolean. Usado tanto na entrada (criar/atualizar)
// quanto seria útil na saída, caso o driver do banco devolva 0/1 em vez
// de true/false (comum em SQLite).
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

function normalizarProfissionalSaida(profissional) {
  return {
    ...profissional,
    ativo: Boolean(profissional.ativo)
  };
}

function emailValido(email) {
  if (!email) return true; // campo opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /profissionais — só os da empresa logada
export async function listar(req, res) {
  try {
    const db = await getDatabase();
    const profissionais = await db.all(
      `SELECT ${CAMPOS_PROFISSIONAL} FROM profissionais WHERE empresa_id = ? ORDER BY nome ASC`,
      [req.empresaId]
    );
    res.json(profissionais.map(normalizarProfissionalSaida));
  } catch (erro) {
    console.error('[profissionais.listar]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar profissionais.' });
  }
}

// GET /profissionais/:id — só se o profissional for da empresa logada
export async function buscarPorId(req, res) {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    const profissional = await db.get(
      `SELECT ${CAMPOS_PROFISSIONAL} FROM profissionais WHERE id = ? AND empresa_id = ?`,
      [id, req.empresaId]
    );

    if (!profissional) {
      return res.status(404).json({ mensagem: 'Profissional não encontrado.' });
    }
    res.json(normalizarProfissionalSaida(profissional));
  } catch (erro) {
    console.error('[profissionais.buscarPorId]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar profissional.' });
  }
}

// GET /profissionais/empresa/:empresaId
// Uso didático — mostra como filtrar por chave estrangeira (empresa_id).
// Por segurança, só a própria empresa pode listar os próprios profissionais
// por esse endpoint.
export async function listarPorEmpresa(req, res) {
  const empresaIdSolicitada = Number(req.params.empresaId);

  if (empresaIdSolicitada !== req.empresaId) {
    return res.status(403).json({
      mensagem: 'Você só pode listar os profissionais da própria empresa.'
    });
  }

  try {
    const db = await getDatabase();
    const profissionais = await db.all(
      `SELECT ${CAMPOS_PROFISSIONAL} FROM profissionais WHERE empresa_id = ? ORDER BY nome ASC`,
      [empresaIdSolicitada]
    );
    res.json(profissionais.map(normalizarProfissionalSaida));
  } catch (erro) {
    console.error('[profissionais.listarPorEmpresa]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar profissionais da empresa.' });
  }
}

// POST /profissionais — body { nome, telefone, email, ativo, foto }.
// empresa_id vem do token, nunca do body.
export async function criar(req, res) {
  const { nome, telefone, email, ativo, foto } = req.body;

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ mensagem: 'Informe um nome válido.' });
  }

  if (!foto || typeof foto !== 'string' || !foto.trim()) {
    return res.status(400).json({ mensagem: 'Informe a foto do profissional.' });
  }

  if (!emailValido(email)) {
    return res.status(400).json({ mensagem: 'Informe um e-mail válido.' });
  }

  const ativoFinal = normalizarAtivo(ativo, true);

  try {
    const db = await getDatabase();
    const resultado = await db.run(
      'INSERT INTO profissionais (empresa_id, nome, telefone, email, ativo, foto) VALUES (?, ?, ?, ?, ?, ?)',
      [req.empresaId, nome.trim(), telefone?.trim() || null, email?.trim() || null, ativoFinal, foto.trim()]
    );

    res.status(201).json({
      id: resultado.lastID,
      empresa_id: req.empresaId,
      nome: nome.trim(),
      telefone: telefone?.trim() || null,
      email: email?.trim() || null,
      ativo: ativoFinal,
      foto: foto.trim()
    });
  } catch (erro) {
    console.error('[profissionais.criar]', erro);
    res.status(500).json({ mensagem: 'Erro ao criar profissional.' });
  }
}

// PUT /profissionais/:id — atualização parcial. Só permite mexer em
// profissional da própria empresa.
export async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, telefone, email, ativo, foto } = req.body;

  if (!emailValido(email)) {
    return res.status(400).json({ mensagem: 'Informe um e-mail válido.' });
  }

  try {
    const db = await getDatabase();
    const atual = await db.get(
      `SELECT ${CAMPOS_PROFISSIONAL} FROM profissionais WHERE id = ? AND empresa_id = ?`,
      [id, req.empresaId]
    );

    if (!atual) {
      return res.status(404).json({ mensagem: 'Profissional não encontrado.' });
    }

    // mantém o valor atual quando o campo não vem no body
    const novoNome = nome?.trim() || atual.nome;
    const novaFoto = foto?.trim() || atual.foto;
    const novoTelefone = telefone !== undefined ? (telefone?.trim() || null) : atual.telefone;
    const novoEmail = email !== undefined ? (email?.trim() || null) : atual.email;
    const novoAtivo = ativo !== undefined ? normalizarAtivo(ativo, atual.ativo) : Boolean(atual.ativo);

    await db.run(
      'UPDATE profissionais SET nome = ?, telefone = ?, email = ?, ativo = ?, foto = ? WHERE id = ?',
      [novoNome, novoTelefone, novoEmail, novoAtivo, novaFoto, id]
    );

    res.json({
      id: Number(id),
      empresa_id: req.empresaId,
      nome: novoNome,
      telefone: novoTelefone,
      email: novoEmail,
      ativo: novoAtivo,
      foto: novaFoto
    });
  } catch (erro) {
    console.error('[profissionais.atualizar]', erro);
    res.status(500).json({ mensagem: 'Erro ao atualizar profissional.' });
  }
}

// DELETE /profissionais/:id
export async function remover(req, res) {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    const resultado = await db.run(
      'DELETE FROM profissionais WHERE id = ? AND empresa_id = ?',
      [id, req.empresaId]
    );

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Profissional não encontrado.' });
    }
    res.json({ mensagem: 'Profissional removido com sucesso.' });
  } catch (erro) {
    console.error('[profissionais.remover]', erro);
    res.status(500).json({ mensagem: 'Erro ao remover profissional.' });
  }
}