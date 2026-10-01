// ===== 1. ELEMENTOS DA PÁGINA =====
const formulario = document.getElementById('form-agendamento');
const selPaciente = document.getElementById('paciente');
const selMedico = document.getElementById('medico');
const selLocal = document.getElementById('local');
const selTipo = document.getElementById('tipo');
const campoData = document.getElementById('data');
const campoHoraInicio = document.getElementById('hora-inicio');
const campoHoraFim = document.getElementById('hora-fim');
const campoObservacao = document.getElementById('observacao');
const campoBusca = document.getElementById('busca');
const campoFiltroData = document.getElementById('filtro-data');
const corpoTabela = document.getElementById('lista-agendamentos');
const mensagemVazia = document.getElementById('vazio-agendamentos');
const aviso = document.getElementById('aviso-cadastros');

// ===== 2. LEITURA E GRAVAÇÃO (localStorage) =====
// Lê uma lista guardada pelo nome da "gaveta"; se não existir, devolve lista vazia
function ler(chave) {
  return JSON.parse(localStorage.getItem(chave)) || [];
}

// Grava uma lista inteira (o localStorage só guarda texto, por isso o stringify)
function gravar(chave, lista) {
  localStorage.setItem(chave, JSON.stringify(lista));
}

// ===== 3. LISTAS (<select>) COM OS CADASTROS =====
// Cria as <option> de um <select> a partir de uma lista de itens.
// "textoDe" é uma função que diz qual texto mostrar para cada item.
function preencherSelect(select, itens, campoId, textoDe) {
  select.innerHTML = '';

  // Primeira opção vazia: com o "required" do HTML, obriga a escolher uma
  const padrao = document.createElement('option');
  padrao.value = '';
  padrao.textContent = 'Selecione...';
  select.appendChild(padrao);

  itens.forEach((item) => {
    const opcao = document.createElement('option');
    opcao.value = item[campoId];
    opcao.textContent = textoDe(item); // textContent evita executar HTML digitado
    select.appendChild(opcao);
  });
}

// Carrega os 4 cadastros e preenche as listas
function carregarListas() {
  const pacientes = ler('pacientes');
  const medicos = ler('medicos');
  const locais = ler('locais');
  const tipos = ler('tipos_exame');

  preencherSelect(selPaciente, pacientes, 'pessoa_id', (p) => `${p.nome} (${p.cpf})`);
  preencherSelect(selMedico, medicos, 'medico_id', (m) => m.nome);
  preencherSelect(selLocal, locais, 'local_id', (l) => l.descricao);
  preencherSelect(selTipo, tipos, 'tipo_agenda_medica_id', (t) => t.nome);

  // Monta o aviso com links para os cadastros que ainda estão vazios.
  // Aqui o innerHTML é seguro porque o texto é todo nosso (nada digitado pelo usuário).
  const faltando = [];
  if (!pacientes.length) faltando.push('<a href="pacientes.html">pacientes</a>');
  if (!medicos.length) faltando.push('<a href="cadastros.html">médicos</a>');
  if (!locais.length) faltando.push('<a href="cadastros.html">locais</a>');
  if (!tipos.length) faltando.push('<a href="cadastros.html">tipos de exame</a>');

  if (faltando.length) {
    aviso.innerHTML = `Para agendar, cadastre antes: ${faltando.join(', ')}.`;
    aviso.hidden = false;
  } else {
    aviso.hidden = true;
  }
}

// ===== 4. MÁSCARAS (formatam enquanto a pessoa digita) =====
// Data: 25032001 vira 25/03/2001
function mascaraData(campo) {
  campo.addEventListener('input', () => {
    const n = campo.value.replace(/\D/g, '').slice(0, 8);
    campo.value = n
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
  });
}

// Hora: 0830 vira 08:30
function mascaraHora(campo) {
  campo.addEventListener('input', () => {
    const n = campo.value.replace(/\D/g, '').slice(0, 4);
    campo.value = n.replace(/(\d{2})(\d)/, '$1:$2');
  });
}

mascaraData(campoData);
mascaraData(campoFiltroData);
mascaraHora(campoHoraInicio);
mascaraHora(campoHoraFim);

// ===== 5. VALIDAÇÕES =====
// Converte 31/12/2026 para 2026-12-31 (formato guardado).
// Devolve null se a data não existir (ex.: 31/02) ou estiver fora de 2000-2100.
function converterData(texto) {
  const partes = texto.split('/');
  if (partes.length !== 3 || partes[2].length !== 4) return null;

  const [dia, mes, ano] = partes.map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Se o dia/mês não existir, o JS "corrige" a data e a comparação falha
  const existe =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  if (!existe || ano < 2000 || ano > 2100) return null;
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// Confere se a hora está no formato hh:mm e entre 00:00 e 23:59
function horaValida(texto) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

// ===== 6. FUNÇÕES AUXILIARES =====
// 2026-12-31 vira 31/12/2026
function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Procura um item pelo id e devolve o texto dele.
// Se o item foi excluído depois do agendamento, mostra "(removido)".
function buscarNome(lista, campoId, id, campoTexto) {
  const item = lista.find((i) => i[campoId] === id);
  return item ? item[campoTexto] : '(removido)';
}

// Cria uma célula <td> com texto (textContent por segurança)
function criarCelula(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

// ===== 7. MOSTRAR A LISTA NA TABELA =====
function mostrarAgendamentos() {
  const agendamentos = ler('agendamentos');
  const pacientes = ler('pacientes');
  const medicos = ler('medicos');
  const locais = ler('locais');
  const tipos = ler('tipos_exame');

  const termo = campoBusca.value.toLowerCase();
  // O filtro de data só vale quando a data está completa e válida (dd/mm/aaaa)
  const dataFiltro = campoFiltroData.value.length === 10
    ? converterData(campoFiltroData.value)
    : null;

  // Ordena do mais cedo para o mais tarde (o texto "2026-10-05T08:00" ordena certo)
  agendamentos.sort((a, b) => a.datahora_inicio.localeCompare(b.datahora_inicio));

  corpoTabela.innerHTML = '';
  let exibidos = 0;

  agendamentos.forEach((a) => {
    // Troca os ids pelos nomes
    const nomePaciente = buscarNome(pacientes, 'pessoa_id', a.cliente_id, 'nome');
    const nomeMedico = buscarNome(medicos, 'medico_id', a.medico_id, 'nome');
    const nomeTipo = buscarNome(tipos, 'tipo_agenda_medica_id', a.tipo_agenda_medica_id, 'nome');
    const nomeLocal = buscarNome(locais, 'local_id', a.local_id, 'descricao');

    // Filtros: se não bater com a busca ou com a data, pula este agendamento
    const texto = `${nomePaciente} ${nomeMedico} ${nomeTipo}`.toLowerCase();
    if (!texto.includes(termo)) return;
    if (dataFiltro && a.datahora_inicio.slice(0, 10) !== dataFiltro) return;

    const linha = document.createElement('tr');
    linha.appendChild(criarCelula(formatarData(a.datahora_inicio.slice(0, 10))));
    linha.appendChild(criarCelula(`${a.datahora_inicio.slice(11, 16)} - ${a.datahora_fim.slice(11, 16)}`));
    linha.appendChild(criarCelula(nomePaciente));
    linha.appendChild(criarCelula(nomeMedico));
    linha.appendChild(criarCelula(nomeTipo));
    linha.appendChild(criarCelula(nomeLocal));
    linha.appendChild(criarCelula(a.observacao || '-'));

    // Botão de cancelar
    const celulaAcoes = document.createElement('td');
    const botao = document.createElement('button');
    botao.textContent = 'Cancelar';
    botao.className = 'botao botao--perigo botao--pequeno';
    botao.addEventListener('click', () => cancelarAgendamento(a.agenda_medica_id));
    celulaAcoes.appendChild(botao);
    linha.appendChild(celulaAcoes);

    corpoTabela.appendChild(linha);
    exibidos++;
  });

  // Mensagem de "vazio": diferente quando não há nada ou quando o filtro não achou nada
  if (exibidos === 0) {
    mensagemVazia.textContent = agendamentos.length === 0
      ? 'Nenhum agendamento marcado.'
      : 'Nenhum agendamento encontrado para esse filtro.';
    mensagemVazia.style.display = 'block';
  } else {
    mensagemVazia.style.display = 'none';
  }
}

// ===== 8. CRIAR AGENDAMENTO =====
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault(); // impede a página de recarregar

  // Valida a data
  const dataIso = converterData(campoData.value);
  if (!dataIso) {
    alert('Data inválida. Use o formato dd/mm/aaaa.');
    return;
  }

  // Valida as horas
  const horaInicio = campoHoraInicio.value;
  const horaFim = campoHoraFim.value;
  if (!horaValida(horaInicio) || !horaValida(horaFim)) {
    alert('Hora inválida. Use o formato hh:mm (de 00:00 a 23:59).');
    return;
  }
  if (horaFim <= horaInicio) {
    alert('A hora de fim precisa ser depois da hora de início.');
    return;
  }

  // Junta data e hora no formato do campo datahora_* do DER: 2026-10-05T08:00
  const inicio = `${dataIso}T${horaInicio}`;
  const fim = `${dataIso}T${horaFim}`;

  const agendamentos = ler('agendamentos');
  const localId = Number(selLocal.value);

  // Conflito: dois horários se sobrepõem quando um começa antes de o outro terminar
  // e termina depois de o outro começar. Aqui, no mesmo local.
  const conflito = agendamentos.some(
    (a) => a.local_id === localId && inicio < a.datahora_fim && fim > a.datahora_inicio
  );
  if (conflito) {
    alert('Esse local já está ocupado nesse horário.');
    return;
  }

  // Novo id = maior id existente + 1 (igual à chave primária do DER)
  const novoId = agendamentos.length
    ? Math.max(...agendamentos.map((a) => a.agenda_medica_id)) + 1
    : 1;

  // Objeto com os mesmos campos da tabela tbAgendaMedica
  agendamentos.push({
    agenda_medica_id: novoId,
    cliente_id: Number(selPaciente.value),
    medico_id: Number(selMedico.value),
    local_id: localId,
    tipo_agenda_medica_id: Number(selTipo.value),
    datahora_inicio: inicio,
    datahora_fim: fim,
    observacao: campoObservacao.value.trim(),
    atualizado_em: new Date().toISOString(),
  });

  gravar('agendamentos', agendamentos);
  formulario.reset();
  mostrarAgendamentos();
});

// ===== 9. CANCELAR AGENDAMENTO =====
function cancelarAgendamento(id) {
  if (!confirm('Deseja realmente cancelar este agendamento?')) return;

  // Mantém todos, menos o que tem o id clicado
  const restantes = ler('agendamentos').filter((a) => a.agenda_medica_id !== id);
  gravar('agendamentos', restantes);
  mostrarAgendamentos();
}

// ===== 10. BUSCA E FILTRO =====
// A cada letra digitada, a tabela é redesenhada com o filtro
campoBusca.addEventListener('input', mostrarAgendamentos);
campoFiltroData.addEventListener('input', mostrarAgendamentos);

// ===== 11. INÍCIO =====
// Ao abrir a página: preenche as listas e mostra os agendamentos salvos
carregarListas();
mostrarAgendamentos();