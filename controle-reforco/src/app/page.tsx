// ============================================================================
// ✍️ PARTE 1: DIGITE ESTA PARTE NA MÃO (Suas anotações + Novas funções)
// ============================================================================

//Avisando que este sistema irá rodar no navegador//
"use client";

//Serve para guardar as infos que mudam na tela (useState) e rodar ações automáticas (useEffect)//
import React, { useState, useEffect } from "react";

//Se você tentar salvar um texto no campo 'id' (que é number), o IntelliJ avisa o erro na hora.//
interface Fechamento {
    id: number;
    responsavel: string;
    aluno: string;
    escola: string;
    serie: string;
    data: string; // Vai guardar textos no formato "AAAA-MM-DD"
}

// NOVO MOLDE: Define os campos de cada conta/perfil cadastrado no sistema
interface Usuario {
    nome: string;
    email: string;
    senha: string;
}

// NOVO MOLDE: Agrupa tudo que pertence exclusivamente a um usuário (escolas, séries, meta e alunos)
interface DadosUsuario {
    escolas: string[];
    series: string[];
    metaMensal: number;
    fechamentos: Fechamento[];
}

// Listas iniciais padrão para toda conta nova que for criada
const ESCOLAS_PADRAO: string[] = [
    "Colégio São Paulo",
    "Colégio Sartre",
    "Colégio Anchieta",
];

const SERIES_PADRAO: string[] = [
    "6º Ano EF",
    "7º Ano EF",
    "8º Ano EF",
    "9º Ano EF",
    "1º Ano EM",
    "2º Ano EM",
    "3º Ano EM",
];

// 👇 LEMBRETE: Esta linha abre a "caixa" principal da página. Tudo fica dentro dela!
export default function ControleReforcoPage() {

    // --------------------------------------------------------------------------
    // BLOCO A1 (NOVO): ESTADOS DE LOGIN E CADASTRO DE PERFIL
    // --------------------------------------------------------------------------

    // <Usuario | null> significa: pode guardar um 'Usuario' (quando logado) OU 'null' (quando deslogado)
    const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);
    const [carregando, setCarregando] = useState<boolean>(true);

    // Controla se a tela mostra "Entrar" (false) ou "Criar Conta" (true)
    const [modoCadastro, setModoCadastro] = useState<boolean>(false);
    const [nomeAuth, setNomeAuth] = useState<string>("");
    const [emailAuth, setEmailAuth] = useState<string>("");
    const [senhaAuth, setSenhaAuth] = useState<string>("");
    const [erroAuth, setErroAuth] = useState<string>("");

    // --------------------------------------------------------------------------
    // BLOCO A2: ESTADOS DO SISTEMA (Com suas anotações originais)
    // --------------------------------------------------------------------------

    // <string[]> avisa ao TypeScript que este estado guarda uma LISTA(array) de textos.
    const [escolas, setEscolas] = useState<string[]>(ESCOLAS_PADRAO);
    const [series, setSeries] = useState<string[]>(SERIES_PADRAO);

    //Serve para abrir ou esconder a caixinha de "+ Novo Colégio" e "+ Nova Série".
    const [mostrandoNovaEscola, setMostrandoNovaEscola] = useState<boolean>(false);
    const [textoNovaEscola, setTextoNovaEscola] = useState<string>("");

    const [mostrandoNovaSerie, setMostrandoNovaSerie] = useState<boolean>(false);
    const [textoNovaSerie, setTextoNovaSerie] = useState<string>("");

    //Processo que guarda o que voce esta digitando nos campos do formulario:
    const [responsavel, setResponsavel] = useState<string>("");
    const [aluno, setAluno] = useState<string>("");
    const [escolaSelecionada, setEscolaSelecionada] = useState<string>(ESCOLAS_PADRAO[0]);
    const [serieSelecionada, setSerieSelecionada] = useState<string>(SERIES_PADRAO[0]);

    //Passa uma função () => ... dentro do useState para calcular a data de hoje
    //new Date().toISOString() gera algo como "2026-11-12T23:10:00.000Z"
    //split("T")[0] corta o texto na letra "T" e pega só a primeira parte: "2026-11-12".
    const [dataFechamento, setDataFechamento] = useState<string>(
        () => new Date().toISOString().split("T")[0]
    );

    //Estado da meta e da lista principal de alunos fechados:
    const [metaMensal, setMetaMensal] = useState<number>(15);

    // .slice(0, 7) pega apenas os 7 primeiros caracteres da data ("2026-11") para filtrar o mes
    const [mesFiltro, setMesFiltro] = useState<string>(
        () => new Date().toISOString().slice(0, 7)
    );

    // <Fechamento[]> diz ao TypeScript: "esta lista só aceita objetos que sigam o molde Fechamento
    // Começa com [] (uma lista vazia)
    const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
    const [copiado, setCopiado] = useState<boolean>(false);

    // --------------------------------------------------------------------------
    // BLOCO B (NOVO): SALVAR E CARREGAR DADOS NO NAVEGADOR (localStorage + useEffect)
    // --------------------------------------------------------------------------

    // Busca no navegador apenas os dados salvos do e-mail que acabou de logar
    function carregarDadosDoPerfil(email: string) {
        // O localStorage funciona como um mini banco de dados dentro do navegador.
        // Colocamos o e-mail no nome da chave para cada usuário ter seu próprio espaço isolado.
        const dadosSalvos = localStorage.getItem(`reforco_dados_${email}`);

        if (dadosSalvos) {
            // JSON.parse transforma o texto salvo no navegador de volta em objeto TypeScript
            const dados: DadosUsuario = JSON.parse(dadosSalvos);
            setEscolas(dados.escolas);
            setSeries(dados.series);
            setEscolaSelecionada(dados.escolas[0] || "");
            setSerieSelecionada(dados.series[0] || "");
            setMetaMensal(dados.metaMensal);
            setFechamentos(dados.fechamentos);
        } else {
            // Se for conta recém-criada, entrega o sistema limpo com as listas padrão
            setEscolas(ESCOLAS_PADRAO);
            setSeries(SERIES_PADRAO);
            setEscolaSelecionada(ESCOLAS_PADRAO[0]);
            setSerieSelecionada(SERIES_PADRAO[0]);
            setMetaMensal(15);
            setFechamentos([]);
        }
    }

    // useEffect 1: Roda UMA VEZ quando a página abre (por causa do [] vazio no final).
    useEffect(() => {
        // queueMicrotask agenda a leitura para logo após a primeira pintura da tela,
        // evitando o erro 'set-state-in-effect' do React 19.
        queueMicrotask(() => {
            const emailSessao = localStorage.getItem("reforco_sessao_atual");

            if (emailSessao) {
                const listaUsuarios: Usuario[] = JSON.parse(
                    localStorage.getItem("reforco_usuarios") || "[]"
                );
                const usuarioEncontrado = listaUsuarios.find((u) => u.email === emailSessao);

                if (usuarioEncontrado) {
                    setUsuarioLogado(usuarioEncontrado);
                    carregarDadosDoPerfil(usuarioEncontrado.email);
                }
            }

            setCarregando(false);
        });
    }, []);

    // useEffect 2: Roda SOZINHO toda vez que escolas, series, metaMensal ou fechamentos mudarem.
    // É isso que impede você de perder os dados quando apertar F5!
    useEffect(() => {
        if (!usuarioLogado || carregando) return;

        const pacoteParaSalvar: DadosUsuario = {
            escolas,
            series,
            metaMensal,
            fechamentos,
        };

        // JSON.stringify converte o objeto em texto para poder salvar no localStorage
        localStorage.setItem(
            `reforco_dados_${usuarioLogado.email}`,
            JSON.stringify(pacoteParaSalvar)
        );
    }, [usuarioLogado, carregando, escolas, series, metaMensal, fechamentos]);

    // --------------------------------------------------------------------------
    // BLOCO C (NOVO): FUNÇÕES DE ENTRAR, CRIAR CONTA E SAIR
    // --------------------------------------------------------------------------

    function handleAutenticar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErroAuth("");

        const emailLimpo = emailAuth.trim().toLowerCase();

        if (!emailLimpo || !senhaAuth) {
            setErroAuth("Preencha o e-mail e a senha.");
            return;
        }

        const listaUsuarios: Usuario[] = JSON.parse(
            localStorage.getItem("reforco_usuarios") || "[]"
        );

        if (modoCadastro) {
            // Criando um perfil novo
            if (!nomeAuth.trim()) {
                setErroAuth("Digite seu nome para criar o perfil.");
                return;
            }

            // .some() verifica se já existe algum cadastro com esse e-mail
            const emailJaExiste = listaUsuarios.some((u) => u.email === emailLimpo);
            if (emailJaExiste) {
                setErroAuth("Este e-mail já possui cadastro. Clique em 'Entrar'.");
                return;
            }

            const novoUsuario: Usuario = {
                nome: nomeAuth.trim(),
                email: emailLimpo,
                senha: senhaAuth,
            };

            localStorage.setItem(
                "reforco_usuarios",
                JSON.stringify([...listaUsuarios, novoUsuario])
            );
            localStorage.setItem("reforco_sessao_atual", emailLimpo);

            setUsuarioLogado(novoUsuario);
            carregarDadosDoPerfil(emailLimpo);
        } else {
            // Entrando em um perfil que já existe
            const usuarioValido = listaUsuarios.find(
                (u) => u.email === emailLimpo && u.senha === senhaAuth
            );

            if (!usuarioValido) {
                setErroAuth("E-mail ou senha incorretos.");
                return;
            }

            localStorage.setItem("reforco_sessao_atual", emailLimpo);
            setUsuarioLogado(usuarioValido);
            carregarDadosDoPerfil(emailLimpo);
        }

        setNomeAuth("");
        setEmailAuth("");
        setSenhaAuth("");
    }

    function handleSair() {
        localStorage.removeItem("reforco_sessao_atual");
        setUsuarioLogado(null);
    }

    // --------------------------------------------------------------------------
    // BLOCO D: FUNÇÕES DE AÇÃO (Por convenção no React, começam com "handle...")
    // --------------------------------------------------------------------------

    // FUNÇÃO 1: Adicionar um colégio novo na lista suspensa
    function handleAdicionarEscola() {
        // .trim() remove espaços em branco acidentais no começo ou fim do texto
        const nomeLimpo = textoNovaEscola.trim();

        // "Early Return" (retorno antecipado): se o campo estiver vazio, para a função aqui.
        if (!nomeLimpo) return;

        // .includes() verifica se o nome já existe na lista para não duplicar
        if (!escolas.includes(nomeLimpo)) {
            // OPERADOR SPREAD (...):
            // No React, nunca usamos .push() para alterar listas diretamente.
            // [...escolas, nomeLimpo] significa: "crie uma lista nova copiando tudo que já
            // estava em 'escolas' e coloque 'nomeLimpo' no final".
            setEscolas([...escolas, nomeLimpo]);
        }

        setEscolaSelecionada(nomeLimpo); // Já deixa o colégio recém-criado selecionado
        setTextoNovaEscola("");          // Limpa o input de texto
        setMostrandoNovaEscola(false);   // Fecha a caixinha de adição
    }

    // FUNÇÃO 1.1 (NOVA): Apagar o colégio que está selecionado no momento
    function handleRemoverEscola() {
        if (!escolaSelecionada) return;

        // window.confirm abre uma caixinha pedindo confirmação antes de apagar
        const confirmou = window.confirm(
            `Deseja remover "${escolaSelecionada}" da sua lista de colégios?`
        );
        if (!confirmou) return;

        // Cria uma nova lista sem o colégio que estava selecionado
        const novaLista = escolas.filter((esc) => esc !== escolaSelecionada);
        setEscolas(novaLista);
        setEscolaSelecionada(novaLista[0] || "");
    }

    // FUNÇÃO 2: Adicionar uma série nova (mesma lógica da função acima)
    function handleAdicionarSerie() {
        const nomeLimpo = textoNovaSerie.trim();
        if (!nomeLimpo) return;

        if (!series.includes(nomeLimpo)) {
            setSeries([...series, nomeLimpo]);
        }

        setSerieSelecionada(nomeLimpo);
        setTextoNovaSerie("");
        setMostrandoNovaSerie(false);
    }

    // FUNÇÃO 2.1 (NOVA): Apagar a série que está selecionada no momento
    function handleRemoverSerie() {
        if (!serieSelecionada) return;

        const confirmou = window.confirm(
            `Deseja remover "${serieSelecionada}" da sua lista de séries?`
        );
        if (!confirmou) return;

        const novaLista = series.filter((ser) => ser !== serieSelecionada);
        setSeries(novaLista);
        setSerieSelecionada(novaLista[0] || "");
    }

    // FUNÇÃO 3: Salvar o aluno fechado ao enviar o formulário
    // (e: React.FormEvent<HTMLFormElement>) é a tipagem do TypeScript para o evento de envio de formulário.
    function handleSalvarFechamento(e: React.FormEvent<HTMLFormElement>) {
        // Por padrão, formulários HTML recarregam a página inteira ao serem enviados.
        // e.preventDefault() bloqueia esse comportamento para não perdermos os dados da tela.
        e.preventDefault();

        if (!responsavel.trim() || !aluno.trim()) {
            alert("Por favor, preencha o nome do responsável e do aluno.");
            return;
        }

        if (!escolaSelecionada || !serieSelecionada) {
            alert("Adicione e selecione pelo menos um colégio e uma série.");
            return;
        }

        // Criamos um objeto novo obedecendo à interface 'Fechamento' definida lá no topo:
        const novoRegistro: Fechamento = {
            id: Date.now(), // Date.now() retorna o timestamp atual em milissegundos (serve como ID único)
            responsavel: responsavel.trim(),
            aluno: aluno.trim(),
            escola: escolaSelecionada,
            serie: serieSelecionada,
            data: dataFechamento,
        };

        // Coloca 'novoRegistro' primeiro na lista, seguido de todos os antigos (...fechamentos)
        setFechamentos([novoRegistro, ...fechamentos]);

        // Limpa apenas os nomes para você já ficar pronto para o próximo atendimento
        setResponsavel("");
        setAluno("");
    }

    // FUNÇÃO 4: Remover um registro lançado errado
    // (idParaRemover: number) exige que quem chamar essa função passe um número.
    function handleRemoverFechamento(idParaRemover: number) {
        // .filter() percorre toda a lista e cria uma nova contendo APENAS os itens
        // que passarem no teste (ou seja, cujo 'item.id' seja diferente (!==) do ID excluído).
        // O símbolo "=>" é uma Arrow Function (forma curta de escrever uma função em JS).
        const listaAtualizada = fechamentos.filter((item) => item.id !== idParaRemover);
        setFechamentos(listaAtualizada);
    }

    // --------------------------------------------------------------------------
    // BLOCO E: CÁLCULOS AUTOMÁTICOS (Dados Derivados)
    // Toda vez que qualquer estado muda, o React lê estas linhas de novo sozinho.
    // --------------------------------------------------------------------------

    // Filtra apenas os fechamentos cuja data começa com o mês escolhido no filtro (ex: "2026-11")
    const fechamentosDoMes = fechamentos.filter((item) =>
        item.data.startsWith(mesFiltro)
    );

    // Operador Ternário (condição ? valorSeVerdadeiro : valorSeFalso):
    // Se metaMensal > 0, calcula a porcentagem arredondada (Math.round) e trava no máximo em 100 (Math.min).
    // Senão, retorna 0 (evita divisão por zero).
    const porcentagemMeta =
        metaMensal > 0
            ? Math.min(Math.round((fechamentosDoMes.length / metaMensal) * 100), 100)
            : 0;

    // FUNÇÃO 5: Montar o texto formatado e copiar para a área de transferência (Ctrl+C)
    function handleCopiarRelatorio() {
        if (fechamentosDoMes.length === 0) {
            alert("Não há alunos fechados neste mês para gerar relatório.");
            return;
        }

        // .map() transforma cada objeto 'Fechamento' da lista em uma frase de texto.
        const linhas = fechamentosDoMes.map((item, index) => {
            // Desestruturação de Array: quebra "2026-11-12" nos "-" e guarda em 3 variáveis de uma vez
            const [ano, mes, dia] = item.data.split("-");

            // Template String (usa crase ` `): permite misturar texto comum com variáveis dentro de ${ }
            return `${index + 1}. Aluno: ${item.aluno} (${item.serie} - ${item.escola}) | Resp.: ${item.responsavel} | Data: ${dia}/${mes}/${ano}`;
        });

        // \n significa quebra de linha (Enter). .join("\n") junta todas as frases uma embaixo da outra.
        const textoRelatorio = `*Fechamentos do Mês (${mesFiltro})*\nConsultor: ${usuarioLogado?.nome}\nMeta: ${fechamentosDoMes.length}/${metaMensal} alunos\n\n${linhas.join("\n")}`;

        // API nativa do navegador que copia o texto para o Ctrl+C do computador/celular
        navigator.clipboard.writeText(textoRelatorio);

        setCopiado(true);
        // setTimeout agenda uma tarefa para rodar depois de 2500 milissegundos (2,5 segundos)
        setTimeout(() => setCopiado(false), 2500);
    }


// ============================================================================
// 📋 PARTE 2: PODE COPIAR E COLAR ESTA PARTE (Interface Visual / HTML + Tailwind)
// ============================================================================
    // O comando 'return' devolve o visual (JSX) que será desenhado na tela.
    // Tudo que estiver entre chaves { } dentro do HTML é código JavaScript/TypeScript rodando.

    // TELA 0: Enquanto verifica se há usuário logado no navegador
    if (carregando) {
        return (
            <main className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
                Carregando sistema...
            </main>
        );
    }

    // TELA 1: Se NÃO houver usuário logado, mostra a tela de Login / Cadastro
    if (!usuarioLogado) {
        return (
            <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-slate-800">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">
                            Controle de Matrículas
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {modoCadastro
                                ? "Crie seu perfil individual para acompanhar suas metas"
                                : "Entre na sua conta para acessar seus atendimentos"}
                        </p>
                    </div>

                    {/* Abas para alternar entre Entrar e Criar Conta */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setModoCadastro(false);
                                setErroAuth("");
                            }}
                            className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                                !modoCadastro
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            Entrar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setModoCadastro(true);
                                setErroAuth("");
                            }}
                            className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                                modoCadastro
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            Criar Conta
                        </button>
                    </div>

                    <form onSubmit={handleAutenticar} className="space-y-4">
                        {/* Campo Nome aparece apenas na aba "Criar Conta" */}
                        {modoCadastro && (
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Seu Nome
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Iago"
                                    value={nomeAuth}
                                    onChange={(e) => setNomeAuth(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">E-mail</label>
                            <input
                                type="email"
                                placeholder="seuemail@exemplo.com"
                                value={emailAuth}
                                onChange={(e) => setEmailAuth(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Senha</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={senhaAuth}
                                onChange={(e) => setSenhaAuth(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {erroAuth && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {erroAuth}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                        >
                            {modoCadastro ? "Cadastrar e Entrar" : "Acessar Meu Painel"}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    // TELA 2: Se HOUVER usuário logado, mostra o painel completo do perfil dele
    return (
        <main className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* BARRA SUPERIOR DO PERFIL LOGADO */}
                <div className="flex items-center justify-between bg-slate-800 text-white px-5 py-3 rounded-xl text-sm">
                    <div>
                        Perfil ativo: <strong>{usuarioLogado.nome}</strong>{" "}
                        <span className="text-slate-400 hidden sm:inline">
              ({usuarioLogado.email})
            </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleSair}
                        className="bg-slate-700 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                        Sair / Trocar Conta
                    </button>
                </div>

                {/* CABEÇALHO E TERMÔMETRO DA META */}
                <header className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Controle de Matrículas — Reforço Escolar
                            </h1>
                            <p className="text-sm text-slate-500">
                                Registro rápido de atendimentos fechados
                            </p>
                        </div>

                        {/* Filtro de Mês e Configuração da Meta */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500">
                                    Mês de Referência
                                </label>
                                {/* Ligação dupla: 'value' mostra o estado atual e 'onChange' atualiza o estado ao mudar */}
                                <input
                                    type="month"
                                    value={mesFiltro}
                                    onChange={(e) => setMesFiltro(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500">
                                    Meta (Alunos)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={metaMensal}
                                    onChange={(e) => setMetaMensal(Number(e.target.value))}
                                    className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="mt-5">
                        <div className="flex justify-between text-sm font-medium mb-1">
              <span>
                Progresso: {fechamentosDoMes.length} de {metaMensal} alunos fechados
              </span>
                            <span className="text-blue-600">{porcentagemMeta}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${porcentagemMeta}%` }}
                            />
                        </div>
                    </div>
                </header>

                {/* FORMULÁRIO DE CADASTRO */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold mb-4 text-slate-900">
                        Novo Fechamento
                    </h2>

                    {/* onSubmit chama a FUNÇÃO 3 que você digitou lá em cima */}
                    <form onSubmit={handleSalvarFechamento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Campo: Nome do Responsável */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Nome do Pai / Mãe / Responsável *
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Maria Oliveira"
                                value={responsavel}
                                onChange={(e) => setResponsavel(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Campo: Nome do Aluno */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Nome do Aluno *
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Lucas Oliveira"
                                value={aluno}
                                onChange={(e) => setAluno(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Campo Dinâmico: Colégio (+ Adicionar e - Remover) */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Colégio</label>
                            <div className="flex gap-1.5">
                                <select
                                    value={escolaSelecionada}
                                    onChange={(e) => setEscolaSelecionada(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    {escolas.length === 0 && (
                                        <option value="">Nenhum colégio cadastrado</option>
                                    )}
                                    {/* .map() cria uma tag <option> para cada colégio salvo no estado 'escolas' */}
                                    {escolas.map((esc) => (
                                        <option key={esc} value={esc}>
                                            {esc}
                                        </option>
                                    ))}
                                </select>
                                {/* O símbolo "!" inverte o booleano: se estava false vira true, se estava true vira false */}
                                <button
                                    type="button"
                                    onClick={() => setMostrandoNovaEscola(!mostrandoNovaEscola)}
                                    title="Adicionar novo colégio"
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoverEscola}
                                    disabled={escolas.length === 0}
                                    title="Remover colégio selecionado"
                                    className="px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-40 rounded-lg font-bold text-red-700 cursor-pointer"
                                >
                                    -
                                </button>
                            </div>

                            {/* Renderização Condicional (&&): só mostra essa <div> se 'mostrandoNovaEscola' for true */}
                            {mostrandoNovaEscola && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome do novo colégio..."
                                        value={textoNovaEscola}
                                        onChange={(e) => setTextoNovaEscola(e.target.value)}
                                        className="w-full border border-blue-400 rounded-lg px-3 py-1.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAdicionarEscola}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer"
                                    >
                                        OK
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Campo Dinâmico: Série (+ Adicionar e - Remover) */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Série</label>
                            <div className="flex gap-1.5">
                                <select
                                    value={serieSelecionada}
                                    onChange={(e) => setSerieSelecionada(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    {series.length === 0 && (
                                        <option value="">Nenhuma série cadastrada</option>
                                    )}
                                    {series.map((ser) => (
                                        <option key={ser} value={ser}>
                                            {ser}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setMostrandoNovaSerie(!mostrandoNovaSerie)}
                                    title="Adicionar nova série"
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoverSerie}
                                    disabled={series.length === 0}
                                    title="Remover série selecionada"
                                    className="px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-40 rounded-lg font-bold text-red-700 cursor-pointer"
                                >
                                    -
                                </button>
                            </div>

                            {mostrandoNovaSerie && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ex: Pré-Vestibular..."
                                        value={textoNovaSerie}
                                        onChange={(e) => setTextoNovaSerie(e.target.value)}
                                        className="w-full border border-blue-400 rounded-lg px-3 py-1.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAdicionarSerie}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer"
                                    >
                                        OK
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Campo: Data do Fechamento */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Data do Fechamento
                            </label>
                            <input
                                type="date"
                                value={dataFechamento}
                                onChange={(e) => setDataFechamento(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                            />
                        </div>

                        {/* Botão Salvar */}
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                            >
                                Registrar Aluno Fechado
                            </button>
                        </div>
                    </form>
                </section>

                {/* LISTAGEM DOS ALUNOS FECHADOS NO MÊS */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Alunos Fechados no Mês ({fechamentosDoMes.length})
                        </h2>

                        <button
                            type="button"
                            onClick={handleCopiarRelatorio}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                            {copiado ? "✓ Copiado para o WhatsApp!" : "Copiar Relatório do Mês"}
                        </button>
                    </div>

                    {fechamentosDoMes.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-6">
                            Nenhum fechamento registrado para este mês ainda.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2 px-3">Aluno</th>
                                    <th className="py-2 px-3">Responsável</th>
                                    <th className="py-2 px-3">Série / Colégio</th>
                                    <th className="py-2 px-3">Data</th>
                                    <th className="py-2 px-3 text-right">Ação</th>
                                </tr>
                                </thead>
                                <tbody>
                                {fechamentosDoMes.map((item) => {
                                    const [ano, mes, dia] = item.data.split("-");
                                    return (
                                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-medium text-slate-900">
                                                {item.aluno}
                                            </td>
                                            <td className="py-2.5 px-3">{item.responsavel}</td>
                                            <td className="py-2.5 px-3">
                          <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mr-1.5">
                            {item.serie}
                          </span>
                                                <span className="text-slate-600">{item.escola}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">
                                                {`${dia}/${mes}/${ano}`}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoverFechamento(item.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer"
                                                >
                                                    Excluir
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}