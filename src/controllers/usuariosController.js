// usuariosController.js — CRUD de usuários + login + perfil
//
// Conceitos da UC3 exercitados aqui:
// - Bloco A / Aula 12 e 13: SQLite no Node com prepared statements (?)
// - Bloco C / Aula 2: SQL Injection — usar ? em vez de concatenar string
// - Bloco C / Aula 3: bcrypt.hash (cadastro) e bcrypt.compare (login)
// - Bloco B / Aula 2 (alternativa do slide 33): autenticação por JWT
// - Bloco C / Aula 1: Confidencialidade — nunca devolver `senha` no JSON

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../data/db.js';
import { processarUploadImagem } from '../middlewares/uploadImagem.js';

const SALT_ROUNDS = 10;

function ehErroEmailDuplicado(erro) {
  return erro?.code === '23505' || erro?.message?.includes('UNIQUE constraint failed');
}

// GET /usuarios — lista todos (sem o campo senha)
export async function listar(req, res) {
  try {
    const db = await getDatabase();
    const usuarios = await db.all(
      'SELECT id, empresa_id, nome, email, telefone, perfil, ativo, criado_em, foto FROM usuarios ORDER BY id'
    );
    res.json(usuarios);
  } catch (erro) {
    console.error('[usuarios.listar]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar usuários.' });
  }
}

// GET /usuarios/:id
export async function buscarPorId(req, res) {
  const { id } = req.params;
  try {
    const db = await getDatabase();
    const usuario = await db.get(
      'SELECT id, empresa_id, nome, email, telefone, perfil, ativo, criado_em, foto FROM usuarios WHERE id = ?',
      [id]
    );

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.json(usuario);
  } catch (erro) {
    console.error('[usuarios.buscarPorId]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar usuário.' });
  }
}

// POST /usuarios — cadastro público
export async function criar(req, res) {
  const { nome, empresa_id, email, telefone, perfil, senha } = req.body;

  if (!nome || empresa_id > 0 || !email || !perfil || !telefone || !senha) {
    return res.status(400).json({ mensagem: 'Campos obrigatórios ausentes.' });
  }

  // validação simples — exemplo didático para o aluno entender que toda
  // entrada do usuário precisa passar por verificação no servidor.
  if (typeof senha !== 'string' || senha.length < 6) {
    return res.status(400).json({
      mensagem: 'A senha deve ter pelo menos 6 caracteres.'
    });
  }

  try {
    const db = await getDatabase();

    // bcrypt.hash → guarda HASH, não a senha em texto puro (UC3 Bloco C / Aula 3)
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const resultado = await db.run(
      'INSERT INTO usuarios (nome, empresa_id, email, telefone, perfil, senha) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, empresa_id, email, telefone, perfil, senhaHash]
    );

    res.status(201).json({
      id: resultado.lastID,
      nome,
      empresa_id,
      email,
      telefone,
      perfil,
      foto: null
    });
  } catch (erro) {
    // a coluna email tem UNIQUE no CREATE TABLE — tratamos o erro
    // de violação dessa restrição como 409 Conflict.
    if (ehErroEmailDuplicado(erro)) {
      return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    }
    console.error('[usuarios.criar]', erro);
    res.status(500).json({ mensagem: 'Erro ao salvar usuário.' });
  }
}

// PUT /usuarios/:id — atualização parcial. Só o próprio usuário pode editar.
export async function atualizar(req, res) {
  const idAlvo = Number(req.params.id);

  // pilar Integridade (UC3 Bloco C / Aula 1):
  // ninguém edita dados de outra pessoa.
  if (idAlvo !== req.usuarioId) {
    return res.status(403).json({
      mensagem: 'Você só pode editar o próprio usuário.'
    });
  }

  const { nome,  empresa_id, email, telefone, perfil, senha } = req.body;

  try {
    let novaFotoUpload = null;

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const upload = await processarUploadImagem(req, res, { pasta: 'perfil', campo: 'foto' });
      novaFotoUpload = upload.publicUrl;
    }

    const db = await getDatabase();
    const atual = await db.get('SELECT * FROM usuarios WHERE id = ?', [idAlvo]);

    if (!atual) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }

    const novoNome = nome ?? atual.nome;
    const novoEmpresa_id = empresa_id ?? atual.empresa_id
    const novoEmail = email ?? atual.email;
    const novoTelefone = telefone ?? atual.telefone;
    const novoPerfil = perfil ?? atual.perfil
    const novaFoto = novaFotoUpload ?? req.body.foto ?? atual.foto;
    let novaSenha = atual.senha;

    if (senha) {
      if (typeof senha !== 'string' || senha.length < 6) {
        return res.status(400).json({
          mensagem: 'A senha deve ter pelo menos 6 caracteres.'
        });
      }
      novaSenha = await bcrypt.hash(senha, SALT_ROUNDS);
    }

    await db.run(
      'UPDATE usuarios SET nome = ?, email = ?, telefone = ?, senha = ?, foto = ? WHERE id = ?',
      [novoNome, novoEmpresa_id, novoEmail, novoTelefone,novoPerfil, novaSenha, novaFoto, idAlvo]
    );

    res.json({
      id: idAlvo,
      nome: novoNome,
      empresa_id: novoEmpresa_id,
      email: novoEmail,
      telefone: novoTelefone,
      perfil: novoPerfil,
      foto: novaFoto
    });
  } catch (erro) {
    if (erro?.message === 'A imagem deve ter no máximo 5MB.' || erro?.message === 'Apenas arquivos de imagem são permitidos.') {
      return res.status(400).json({ mensagem: erro.message });
    }

    if (ehErroEmailDuplicado(erro)) {
      return res.status(409).json({ mensagem: 'Este e-mail já está cadastrado.' });
    }
    console.error('[usuarios.atualizar]', erro);
    res.status(500).json({ mensagem: 'Erro ao atualizar usuário.' });
  }
}

// DELETE /usuarios/:id — só o próprio usuário pode se remover.
export async function remover(req, res) {
  const idAlvo = Number(req.params.id);

  if (idAlvo !== req.usuarioId) {
    return res.status(403).json({
      mensagem: 'Você só pode remover o próprio usuário.'
    });
  }

  try {
    const db = await getDatabase();
    // ON DELETE CASCADE no CREATE TABLE de tarefas já apaga as tarefas
    // vinculadas — assim demonstramos relacionamento + FK na prática.
    const resultado = await db.run('DELETE FROM usuarios WHERE id = ?', [idAlvo]);

    if (resultado.changes === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.json({ mensagem: 'Usuário removido com sucesso.' });
  } catch (erro) {
    console.error('[usuarios.remover]', erro);
    res.status(500).json({ mensagem: 'Erro ao remover usuário.' });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Autenticação — login + perfil
// ────────────────────────────────────────────────────────────────────────────

// POST /usuarios/login
// body: { email, senha }
// resposta: { token, usuario: { id, nome, email } }
//
// Fluxo:
// 1) busca o usuário pelo email (prepared statement — protege contra
//    SQL Injection, UC3 Bloco C / Aula 2);
// 2) compara a senha digitada com o hash salvo (bcrypt.compare);
// 3) se OK, gera um JWT assinado com JWT_SECRET (slide 33 da UC3 —
//    JWT como alternativa a session do Bloco B).
export async function login(req, res) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ mensagem: 'Informe email e senha.' });
  }

  try {
    const db = await getDatabase();
    const usuario = await db.get(
      'SELECT id, nome, email, senha, foto FROM usuarios WHERE email = ?',
      [email]
    );

    // mensagem genérica de propósito: não revela se foi o e-mail ou a senha.
    // Isso dificulta força bruta direcionada (UC3 Bloco C / Aula 2).
    if (!usuario) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha);
    if (!senhaConfere) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas.' });
    }

    // O "payload" é o que vai dentro do token. NUNCA coloque senha aqui —
    // o payload é apenas codificado em base64, não é criptografado.
    const token = jwt.sign(
      { usuarioId: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, foto: usuario.foto ?? null }
    });
  } catch (erro) {
    console.error('[usuarios.login]', erro);
    res.status(500).json({ mensagem: 'Erro ao autenticar.' });
  }
}

// GET /usuarios/perfil — rota protegida pelo middleware autenticarJWT.
// Devolve os dados do usuário a partir do token.
export async function perfil(req, res) {
  try {
    const db = await getDatabase();
    const usuario = await db.get(
      'SELECT id, empresa_id, nome, email, telefone, perfil, ativo, criado_em, fotoFROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    if (!usuario) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.json(usuario);
  } catch (erro) {
    console.error('[usuarios.perfil]', erro);
    res.status(500).json({ mensagem: 'Erro ao buscar perfil.' });
  }
}

