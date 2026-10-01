// ===== FUNÇÃO GENÉRICA DE CADASTRO =====
// Recebe um "config" com os nomes dos elementos do HTML e dos campos a guardar.
// Assim a mesma lógica serve para Locais e para Tipos de exame.
function iniciarCadastro(config) {
  // Elementos da página (pegos pelo id)
  const formulario = document.getElementById(config.idFormulario);
  const campo = document.getElementById(config.idCampo);
  const corpoTabela = document.getElementById(config.idLista);
  const mensagemVazia = document.getElementById(config.idVazio);

  // Lê a lista guardada no localStorage (ou uma lista vazia se não houver nada)
  function carregar() {
    return JSON.parse(localStorage.getItem(config.chave)) || [];
  }

  // Salva a lista inteira no localStorage (que só aceita texto, por isso o stringify)
  function salvar(lista) {
    localStorage.setItem(config.chave, JSON.stringify(lista));
  }

  // Desenha a tabela com os itens guardados
  function mostrar() {
    const itens = carregar();
    corpoTabela.innerHTML = ''; // limpa antes de desenhar de novo

    itens.forEach((item) => {
      const linha = document.createElement('tr');

      // Célula com o texto (textContent evita que HTML digitado seja executado)
      const celulaTexto = document.createElement('td');
      celulaTexto.textContent = item[config.campoTexto];
      linha.appendChild(celulaTexto);

      // Célula com o botão de excluir
      const celulaAcoes = document.createElement('td');
      const botaoExcluir = document.createElement('button');
      botaoExcluir.textContent = 'Excluir';
      botaoExcluir.className = 'botao botao--perigo botao--pequeno';
      botaoExcluir.addEventListener('click', () => excluir(item[config.campoId]));
      celulaAcoes.appendChild(botaoExcluir);
      linha.appendChild(celulaAcoes);

      corpoTabela.appendChild(linha);
    });

    // Mostra a mensagem de "vazio" só quando não há itens
    mensagemVazia.style.display = itens.length === 0 ? 'block' : 'none';
  }

  // Cadastrar um novo item ao enviar o formulário
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault(); // impede a página de recarregar

    const texto = campo.value.trim(); // trim tira espaços do começo e do fim
    const itens = carregar();

    // Não deixa cadastrar o mesmo nome duas vezes (ignora maiúsculas/minúsculas)
    const jaExiste = itens.some(
      (i) => i[config.campoTexto].toLowerCase() === texto.toLowerCase()
    );
    if (jaExiste) {
      alert(`Já existe um ${config.nomeItem} com esse nome.`);
      return;
    }

    // Novo id = maior id existente + 1 (igual à chave primária do DER)
    const novoId = itens.length
      ? Math.max(...itens.map((i) => i[config.campoId])) + 1
      : 1;

    // Os colchetes [ ] permitem usar o texto do config como nome do campo
    itens.push({
      [config.campoId]: novoId,
      [config.campoTexto]: texto,
      atualizado_em: new Date().toISOString(),
    });

    salvar(itens);
    formulario.reset();
    mostrar();
  });

  // Excluir um item pelo id
  function excluir(id) {
    if (!confirm(`Deseja realmente excluir este ${config.nomeItem}?`)) return;

    // Mantém todos, menos o que tem o id clicado
    const restantes = carregar().filter((i) => i[config.campoId] !== id);
    salvar(restantes);
    mostrar();
  }

  // Ao abrir a página, mostra o que já estava salvo
  mostrar();
}

// ===== USO 1: LOCAIS (tabela tbLocal do DER) =====
iniciarCadastro({
  chave: 'locais',               // nome da "gaveta" no localStorage
  idFormulario: 'form-local',
  idCampo: 'descricao-local',
  idLista: 'lista-locais',
  idVazio: 'vazio-locais',
  campoId: 'local_id',           // chave primária, como no DER
  campoTexto: 'descricao',       // campo de texto, como no DER
  nomeItem: 'local',             // usado nas mensagens de aviso
});

// ===== USO 2: TIPOS DE EXAME (tabela tbTipoAgendaMedica do DER) =====
iniciarCadastro({
  chave: 'tipos_exame',
  idFormulario: 'form-tipo',
  idCampo: 'nome-tipo',
  idLista: 'lista-tipos',
  idVazio: 'vazio-tipos',
  campoId: 'tipo_agenda_medica_id',
  campoTexto: 'nome',
  nomeItem: 'tipo de exame',
});