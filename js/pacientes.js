// ===== 1. ELEMENTOS DA PÁGINA =====
// Pegamos cada elemento do HTML pelo id para poder usar no código
const formulario = document.getElementById('form-paciente');
const campoNome = document.getElementById('nome');
const campoCpf = document.getElementById('cpf');
const campoNascimento = document.getElementById('nascimento');
const campoTelefone = document.getElementById('telefone');
const campoBusca = document.getElementById('busca');
const corpoTabela = document.getElementById('lista-pacientes');
const mensagemVazia = document.getElementById('mensagem-vazia');

// ===== 2. ARMAZENAMENTO (localStorage) =====
// Nome da "gaveta" onde os pacientes ficam guardados no navegador
const CHAVE = 'pacientes';

// Lê a lista salva. O localStorage só guarda texto, então usamos
// JSON.parse para transformar o texto de volta em lista.
// Se ainda não existir nada, devolve uma lista vazia.
function carregarPacientes() {
  return JSON.parse(localStorage.getItem(CHAVE)) || [];
}

// Salva a lista inteira. JSON.stringify transforma a lista em texto.
function salvarPacientes(lista) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

// ===== 3. MÁSCARAS (formatam enquanto a pessoa digita) =====
// CPF: 12345678901 vira 123.456.789-01
campoCpf.addEventListener('input', () => {
  const numeros = campoCpf.value.replace(/\D/g, '').slice(0, 11); // só dígitos, máx. 11
  campoCpf.value = numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
});

// Telefone: 85900000000 vira (85) 90000-0000
campoTelefone.addEventListener('input', () => {
  const n = campoTelefone.value.replace(/\D/g, '').slice(0, 11);
  if (n.length > 10) {
    campoTelefone.value = n.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  } else if (n.length > 6) {
    campoTelefone.value = n.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (n.length > 2) {
    campoTelefone.value = n.replace(/^(\d{2})(\d*)/, '($1) $2');
  } else {
    campoTelefone.value = n;
  }
});

// Data de nascimento: 31122000 vira 31/12/2000
campoNascimento.addEventListener('input', () => {
  const n = campoNascimento.value.replace(/\D/g, '').slice(0, 8); // só dígitos, máx. 8
  campoNascimento.value = n
    .replace(/(\d{2})(\d)/, '$1/$2')              // coloca a primeira barra
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3'); // coloca a segunda barra
});

// Converte 31/12/2000 para 2000-12-31 (formato que guardamos no localStorage).
// Também confere se a data existe e se não é futura. Devolve null se for inválida.
function converterData(texto) {
  const partes = texto.split('/');
  if (partes.length !== 3 || partes[2].length !== 4) return null;

  const [dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Se o dia/mês não existir (ex.: 31/02), o JS "corrige" a data e a comparação falha
  const existe =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  if (!existe || data > new Date() || ano < 1900) return null;
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// ===== 4. FUNÇÕES AUXILIARES =====
// Troca a data de 2000-12-31 (formato guardado) para 31/12/2000 (formato brasileiro)
function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Cria uma célula <td> com um texto dentro.
// Usamos textContent (e não innerHTML) por segurança: assim, se alguém digitar
// código HTML no nome, ele aparece como texto e não é executado.
function criarCelula(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

// ===== 5. MOSTRAR A LISTA NA TABELA =====
function mostrarPacientes() {
  const termo = campoBusca.value.toLowerCase();
  const todos = carregarPacientes();

  // filter mantém só os pacientes cujo nome ou CPF contém o que foi digitado na busca
  const filtrados = todos.filter(
    (p) => p.nome.toLowerCase().includes(termo) || p.cpf.includes(termo)
  );

  corpoTabela.innerHTML = ''; // limpa a tabela antes de desenhar de novo

  // Para cada paciente, monta uma linha <tr> com suas células
  filtrados.forEach((p) => {
    const linha = document.createElement('tr');
    linha.appendChild(criarCelula(p.nome));
    linha.appendChild(criarCelula(p.cpf));
    linha.appendChild(criarCelula(formatarData(p.nascimento)));
    linha.appendChild(criarCelula(p.telefone || '-'));

    // Botão de excluir
    const celulaAcoes = document.createElement('td');
    const botaoExcluir = document.createElement('button');
    botaoExcluir.textContent = 'Excluir';
    botaoExcluir.className = 'botao botao--perigo botao--pequeno';
    botaoExcluir.addEventListener('click', () => excluirPaciente(p.pessoa_id));
    celulaAcoes.appendChild(botaoExcluir);
    linha.appendChild(celulaAcoes);

    corpoTabela.appendChild(linha);
  });

  // Mostra a mensagem de "vazio" só quando não há nada para exibir
  if (filtrados.length === 0) {
    mensagemVazia.textContent = todos.length === 0
      ? 'Nenhum paciente cadastrado.'
      : 'Nenhum paciente encontrado para essa busca.';
    mensagemVazia.style.display = 'block';
  } else {
    mensagemVazia.style.display = 'none';
  }
}

// ===== 6. CADASTRAR PACIENTE =====
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault(); // impede a página de recarregar ao enviar

  // Converte e valida a data digitada; se for inválida, avisa e para aqui
  const nascimentoIso = converterData(campoNascimento.value);
  if (!nascimentoIso) {
    alert('Data de nascimento inválida. Use o formato dd/mm/aaaa.');
    return;
  }

  const pacientes = carregarPacientes();

  // Não permite dois pacientes com o mesmo CPF
  if (pacientes.some((p) => p.cpf === campoCpf.value)) {
    alert('Já existe um paciente cadastrado com esse CPF.');
    return;
  }

  // O novo id é o maior id existente + 1 (igual ao pessoa_id do DER)
  const novoId = pacientes.length
    ? Math.max(...pacientes.map((p) => p.pessoa_id)) + 1
    : 1;

  // Objeto com os mesmos campos da tabela tbPessoas
  pacientes.push({
    pessoa_id: novoId,
    nome: campoNome.value.trim(),
    cpf: campoCpf.value,
    nascimento: nascimentoIso,
    telefone: campoTelefone.value,
    atualizado_em: new Date().toISOString(),
  });

  salvarPacientes(pacientes);
  formulario.reset(); // limpa os campos
  mostrarPacientes(); // atualiza a tabela
});

// ===== 7. EXCLUIR PACIENTE =====
function excluirPaciente(id) {
  if (!confirm('Deseja realmente excluir este paciente?')) return;

  // Mantém todos, menos o que tem o id clicado
  const restantes = carregarPacientes().filter((p) => p.pessoa_id !== id);
  salvarPacientes(restantes);
  mostrarPacientes();
}

// ===== 8. BUSCA =====
// A cada letra digitada na busca, a tabela é redesenhada com o filtro
campoBusca.addEventListener('input', mostrarPacientes);

// ===== 9. INÍCIO =====
// Ao abrir a página, mostra os pacientes que já estavam salvos
mostrarPacientes();