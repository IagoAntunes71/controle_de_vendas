// ============================================================================
// ✍️ PARTE 1: DIGITE ESTA PARTE NA MÃO (Conexão com Banco e Login Real)
// ============================================================================

//Avisando que este sistema irá rodar no navegador//
"use client";

//Serve para guardar as infos que mudam na tela (useState) e rodar ações automáticas (useEffect)//
import React, { useState, useEffect } from "react";

// Importamos a ponte de conexão que você acabou de criar em src/lib/supabase.ts
import { supabase } from "@/lib/supabase";

//Se você tentar salvar um texto no campo 'id' (que é number), o IntelliJ avisa o erro na hora.//
interface Fechamento {
    id: number;
    responsavel: string;
    aluno: string;
    escola: string;
    serie: string;
    data: string; // Vai guardar textos no formato "AAAA-MM-DD"
}

// MOLDE DO USUÁRIO LOGADO (Agora o 'id' vem do Supabase no formato UUID, que é uma string)
interface UsuarioPerfil {
    id: string;
    nome: string;
    email: string;
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
    // BLOCO A1: ESTADOS DE LOGIN E CADASTRO
    // --------------------------------------------------------------------------
    const [usuarioLogado, setUsuarioLogado] = useState<UsuarioPerfil | null>(null);
    const [carregando, setCarregando] = useState<boolean>(true);
    const [enviandoAuth, setEnviandoAuth] = useState<boolean>(false);

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
    const [dataFechamento, setDataFechamento] = useState<string>("");

   // Estado da meta e da lista principal de alunos fechados:
    const [metaMensal, setMetaMensal] = useState<number>(15);
    const [mesFiltro, setMesFiltro] = useState<string>("");

    const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
    const [salvando, setSalvando] = useState<boolean>(false);
    const [copiado, setCopiado] = useState<boolean>(false);

    // --------------------------------------------------------------------------
    // BLOCO B: BUSCAR DADOS DO USUÁRIO NO BANCO (PostgreSQL via Supabase)
    // --------------------------------------------------------------------------

    // 'async' indica que esta função faz consultas pela internet e usa 'await'
    async function carregarDadosDoBanco(userId: string, email: string, nomeInicial?: string) {
        // 1. Busca a linha deste usuário na tabela 'perfis' (equivale a: SELECT * FROM perfis WHERE id = userId)
        let { data: perfil } = await supabase
            .from("perfis")
            .select("*")
            .eq("id", userId)
            .single();

        // 2. Se for o primeiro acesso da conta e ainda não existir linha na tabela 'perfis', cria agora:
        if (!perfil) {
            const { data: novoPerfil } = await supabase
                .from("perfis")
                .insert({
                    id: userId,
                    nome: nomeInicial || email.split("@")[0],
                    escolas: ESCOLAS_PADRAO,
                    series: SERIES_PADRAO,
                    meta_mensal: 15,
                })
                .select()
                .single();

            perfil = novoPerfil;
        }

        // Preenche os estados da tela com o que veio do banco
        if (perfil) {
            setUsuarioLogado({
                id: userId,
                nome: perfil.nome,
                email: email,
            });
            setEscolas(perfil.escolas);
            setSeries(perfil.series);
            setEscolaSelecionada(perfil.escolas[0] || "");
            setSerieSelecionada(perfil.series[0] || "");
            setMetaMensal(perfil.meta_mensal);
        }

        // 3. Busca todos os alunos fechados deste usuário ordenados do mais recente para o mais antigo
        // (A regra RLS que criamos no SQL garante que só vêm os alunos DESTE usuário!)
        const { data: listaFechamentos } = await supabase
            .from("fechamentos")
            .select("*")
            .order("id", { ascending: false });

        if (listaFechamentos) {
            setFechamentos(listaFechamentos);
        }
    }

    // useEffect: Roda UMA VEZ quando a página abre para checar se você já está logado no Supabase
    useEffect(() => {
        async function verificarSessao() {
            const { data: { session } } = await supabase.auth.getSession();

            // Movido para depois do 'await' para não disparar o erro do React 19
            const hoje = new Date();
            setDataFechamento(hoje.toISOString().split("T")[0]);
            setMesFiltro(hoje.toISOString().slice(0, 7));

            if (session?.user) {
                await carregarDadosDoBanco(
                    session.user.id,
                    session.user.email || "",
                    session.user.user_metadata?.nome
                );
            }

            setCarregando(false);
        }

        verificarSessao();
    }, []);

    // --------------------------------------------------------------------------
    // BLOCO C: FUNÇÕES DE LOGIN, CADASTRO E SAÍDA NA NUVEM
    // --------------------------------------------------------------------------

    async function handleAutenticar(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setErroAuth("");
        setEnviandoAuth(true);

        const emailLimpo = emailAuth.trim().toLowerCase();

        if (modoCadastro) {
            if (!nomeAuth.trim()) {
                setErroAuth("Digite seu nome para criar o perfil.");
                setEnviandoAuth(false);
                return;
            }

            // Cria a conta oficial no sistema de autenticação do Supabase
            const { data, error } = await supabase.auth.signUp({
                email: emailLimpo,
                password: senhaAuth,
                options: {
                    data: { nome: nomeAuth.trim() },
                },
            });

            if (error) {
                setErroAuth(error.message);
                setEnviandoAuth(false);
                return;
            }

            if (data.user) {
                await carregarDadosDoBanco(data.user.id, emailLimpo, nomeAuth.trim());
            }
        } else {
            // Faz login com e-mail e senha no Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailLimpo,
                password: senhaAuth,
            });

            if (error) {
                setErroAuth(error.message);
                setEnviandoAuth(false);
                return;
            }

            if (data.user) {
                await carregarDadosDoBanco(data.user.id, emailLimpo);
            }
        }

        setNomeAuth("");
        setEmailAuth("");
        setSenhaAuth("");
        setEnviandoAuth(false);
    }

    async function handleSair() {
        await supabase.auth.signOut();
        setUsuarioLogado(null);
        setFechamentos([]);
    }

    // --------------------------------------------------------------------------
    // BLOCO D: FUNÇÕES DO SISTEMA (Salvando cada alteração direto no PostgreSQL)
    // --------------------------------------------------------------------------

    // Atualiza a meta no banco quando você termina de digitar o número e sai do campo (onBlur)
    async function handleSalvarMetaNoBanco() {
        if (!usuarioLogado) return;
        await supabase
            .from("perfis")
            .update({ meta_mensal: metaMensal })
            .eq("id", usuarioLogado.id);
    }

    // FUNÇÃO 1: Adicionar um colégio novo e salvar a lista atualizada no Supabase
    async function handleAdicionarEscola() {
        const nomeLimpo = textoNovaEscola.trim();
        if (!nomeLimpo || !usuarioLogado) return;

        let novaLista = escolas;
        if (!escolas.includes(nomeLimpo)) {
            novaLista = [...escolas, nomeLimpo];
            setEscolas(novaLista);

            // UPDATE perfis SET escolas = novaLista WHERE id = usuarioLogado.id
            await supabase
                .from("perfis")
                .update({ escolas: novaLista })
                .eq("id", usuarioLogado.id);
        }

        setEscolaSelecionada(nomeLimpo);
        setTextoNovaEscola("");
        setMostrandoNovaEscola(false);
    }

    // FUNÇÃO 1.1: Apagar o colégio selecionado e atualizar no Supabase
    async function handleRemoverEscola() {
        if (!escolaSelecionada || !usuarioLogado) return;

        const confirmou = window.confirm(
            `Deseja remover "${escolaSelecionada}" da sua lista de colégios?`
        );
        if (!confirmou) return;

        const novaLista = escolas.filter((esc) => esc !== escolaSelecionada);
        setEscolas(novaLista);
        setEscolaSelecionada(novaLista[0] || "");

        await supabase
            .from("perfis")
            .update({ escolas: novaLista })
            .eq("id", usuarioLogado.id);
    }

    // FUNÇÃO 2: Adicionar uma série nova e salvar no Supabase
    async function handleAdicionarSerie() {
        const nomeLimpo = textoNovaSerie.trim();
        if (!nomeLimpo || !usuarioLogado) return;

        let novaLista = series;
        if (!series.includes(nomeLimpo)) {
            novaLista = [...series, nomeLimpo];
            setSeries(novaLista);

            await supabase
                .from("perfis")
                .update({ series: novaLista })
                .eq("id", usuarioLogado.id);
        }

        setSerieSelecionada(nomeLimpo);
        setTextoNovaSerie("");
        setMostrandoNovaSerie(false);
    }

    // FUNÇÃO 2.1: Apagar a série selecionada e atualizar no Supabase
    async function handleRemoverSerie() {
        if (!serieSelecionada || !usuarioLogado) return;

        const confirmou = window.confirm(
            `Deseja remover "${serieSelecionada}" da sua lista de séries?`
        );
        if (!confirmou) return;

        const novaLista = series.filter((ser) => ser !== serieSelecionada);
        setSeries(novaLista);
        setSerieSelecionada(novaLista[0] || "");

        await supabase
            .from("perfis")
            .update({ series: novaLista })
            .eq("id", usuarioLogado.id);
    }

    // FUNÇÃO 3: Inserir um novo aluno fechado na tabela 'fechamentos' do banco
    async function handleSalvarFechamento(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!usuarioLogado) return;

        if (!responsavel.trim() || !aluno.trim()) {
            alert("Por favor, preencha o nome do responsável e do aluno.");
            return;
        }

        if (!escolaSelecionada || !serieSelecionada) {
            alert("Adicione e selecione pelo menos um colégio e uma série.");
            return;
        }

        setSalvando(true);

        // INSERT INTO fechamentos (...) VALUES (...) RETURNING *
        const { data: registroCriado, error } = await supabase
            .from("fechamentos")
            .insert({
                user_id: usuarioLogado.id,
                responsavel: responsavel.trim(),
                aluno: aluno.trim(),
                escola: escolaSelecionada,
                serie: serieSelecionada,
                data: dataFechamento,
            })
            .select()
            .single();

        setSalvando(false);

        if (error) {
            alert("Erro ao salvar no banco: " + error.message);
            return;
        }

        // Adiciona na tela o registro já com o ID oficial gerado pelo PostgreSQL
        if (registroCriado) {
            setFechamentos([registroCriado, ...fechamentos]);
            setResponsavel("");
            setAluno("");
        }
    }

    // FUNÇÃO 4: Excluir um registro do banco de dados
    async function handleRemoverFechamento(idParaRemover: number) {
        // DELETE FROM fechamentos WHERE id = idParaRemover
        const { error } = await supabase
            .from("fechamentos")
            .delete()
            .eq("id", idParaRemover);

        if (error) {
            alert("Erro ao excluir: " + error.message);
            return;
        }

        const listaAtualizada = fechamentos.filter((item) => item.id !== idParaRemover);
        setFechamentos(listaAtualizada);
    }

    // --------------------------------------------------------------------------
    // BLOCO E: CÁLCULOS AUTOMÁTICOS E RELATÓRIO WHATSAPP
    // --------------------------------------------------------------------------
    const fechamentosDoMes = fechamentos.filter((item) =>
        item.data.startsWith(mesFiltro)
    );

    const porcentagemMeta =
        metaMensal > 0
            ? Math.min(Math.round((fechamentosDoMes.length / metaMensal) * 100), 100)
            : 0;

    function handleCopiarRelatorio() {
        if (fechamentosDoMes.length === 0) {
            alert("Não há alunos fechados neste mês para gerar relatório.");
            return;
        }

        const linhas = fechamentosDoMes.map((item, index) => {
            const [ano, mes, dia] = item.data.split("-");
            return `${index + 1}. Aluno: ${item.aluno} (${item.serie} - ${item.escola}) | Resp.: ${item.responsavel} | Data: ${dia}/${mes}/${ano}`;
        });

        const textoRelatorio = `*Fechamentos do Mês (${mesFiltro})*\nConsultor: ${usuarioLogado?.nome}\nMeta: ${fechamentosDoMes.length}/${metaMensal} alunos\n\n${linhas.join("\n")}`;

        navigator.clipboard.writeText(textoRelatorio);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
    }


// ============================================================================
// 📋 PARTE 2: PODE COPIAR E COLAR ESTA PARTE (Interface Visual / HTML + Tailwind)
// ============================================================================

    if (carregando) {
        return (
            <main className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
                Conectando ao banco de dados...
            </main>
        );
    }

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
                                ? "Crie seu perfil na nuvem para acessar de qualquer lugar"
                                : "Entre na sua conta para acessar seus atendimentos"}
                        </p>
                    </div>

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
                            <label className="block text-sm font-medium mb-1">
                                Senha (mínimo 6 caracteres)
                            </label>
                            <input
                                type="password"
                                minLength={6}
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
                            disabled={enviandoAuth}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
                        >
                            {enviandoAuth
                                ? "Aguarde..."
                                : modoCadastro
                                    ? "Cadastrar e Entrar"
                                    : "Acessar Meu Painel"}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

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

                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500">
                                    Mês de Referência
                                </label>
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
                                    onBlur={handleSalvarMetaNoBanco}
                                    className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>

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

                    <form onSubmit={handleSalvarFechamento} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        {/* Campo Dinâmico: Colégio */}
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
                                    {escolas.map((esc) => (
                                        <option key={esc} value={esc}>
                                            {esc}
                                        </option>
                                    ))}
                                </select>
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

                        {/* Campo Dinâmico: Série */}
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

                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={salvando}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                            >
                                {salvando ? "Salvando no banco..." : "Registrar Aluno Fechado"}
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