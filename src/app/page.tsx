// ============================================================================
// ✍️ PARTE 1: CONEXÃO COM BANCO E LOGIN REAL
// ============================================================================

"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Fechamento {
    id: number;
    responsavel: string;
    aluno: string;
    escola: string;
    serie: string;
    data: string;
}

interface UsuarioPerfil {
    id: string;
    nome: string;
    email: string;
}

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

// Remove acentos para facilitar a busca por nome
function normalizarTexto(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

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
    // BLOCO A2: ESTADOS DO SISTEMA
    // --------------------------------------------------------------------------
    const [escolas, setEscolas] = useState<string[]>(ESCOLAS_PADRAO);
    const [series, setSeries] = useState<string[]>(SERIES_PADRAO);

    const [mostrandoNovaEscola, setMostrandoNovaEscola] = useState<boolean>(false);
    const [textoNovaEscola, setTextoNovaEscola] = useState<string>("");

    const [mostrandoNovaSerie, setMostrandoNovaSerie] = useState<boolean>(false);
    const [textoNovaSerie, setTextoNovaSerie] = useState<string>("");

    const [responsavel, setResponsavel] = useState<string>("");
    const [aluno, setAluno] = useState<string>("");
    const [escolaSelecionada, setEscolaSelecionada] = useState<string>(ESCOLAS_PADRAO[0]);
    const [serieSelecionada, setSerieSelecionada] = useState<string>(SERIES_PADRAO[0]);

    const [dataFechamento, setDataFechamento] = useState<string>("");

    // Estado de edição (guarda o ID do registro que está sendo editado ou null)
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const formRef = useRef<HTMLElement | null>(null);

    const [metaMensal, setMetaMensal] = useState<number>(15);
    const [mesFiltro, setMesFiltro] = useState<string>("");

    // Estados de busca e filtro na listagem
    const [buscaTexto, setBuscaTexto] = useState<string>("");
    const [filtroEscola, setFiltroEscola] = useState<string>("");
    const [filtroSerie, setFiltroSerie] = useState<string>("");

    const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
    const [salvando, setSalvando] = useState<boolean>(false);
    const [copiado, setCopiado] = useState<boolean>(false);

    // --------------------------------------------------------------------------
    // BLOCO B: BUSCAR DADOS DO USUÁRIO NO BANCO (PostgreSQL via Supabase)
    // --------------------------------------------------------------------------
    async function carregarDadosDoBanco(userId: string, email: string, nomeInicial?: string) {
        let { data: perfil } = await supabase
            .from("perfis")
            .select("*")
            .eq("id", userId)
            .single();

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

        const { data: listaFechamentos } = await supabase
            .from("fechamentos")
            .select("*")
            .order("id", { ascending: false });

        if (listaFechamentos) {
            setFechamentos(listaFechamentos);
        }
    }

    useEffect(() => {
        async function verificarSessao() {
            const { data: { session } } = await supabase.auth.getSession();

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
        setEditandoId(null);
    }

    // --------------------------------------------------------------------------
    // BLOCO D: FUNÇÕES DO SISTEMA (Salvando e editando no PostgreSQL)
    // --------------------------------------------------------------------------
    async function handleSalvarMetaNoBanco() {
        if (!usuarioLogado) return;
        await supabase
            .from("perfis")
            .update({ meta_mensal: metaMensal })
            .eq("id", usuarioLogado.id);
    }

    async function handleAdicionarEscola() {
        const nomeLimpo = textoNovaEscola.trim();
        if (!nomeLimpo || !usuarioLogado) return;

        let novaLista = escolas;
        if (!escolas.includes(nomeLimpo)) {
            novaLista = [...escolas, nomeLimpo];
            setEscolas(novaLista);

            await supabase
                .from("perfis")
                .update({ escolas: novaLista })
                .eq("id", usuarioLogado.id);
        }

        setEscolaSelecionada(nomeLimpo);
        setTextoNovaEscola("");
        setMostrandoNovaEscola(false);
    }

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

    // Preenche o formulário com os dados do aluno escolhido para edição
    function handleIniciarEdicao(item: Fechamento) {
        setEditandoId(item.id);
        setResponsavel(item.responsavel);
        setAluno(item.aluno);
        setEscolaSelecionada(item.escola);
        setSerieSelecionada(item.serie);
        setDataFechamento(item.data);

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Sai do modo de edição e limpa o formulário
    function handleCancelarEdicao() {
        setEditandoId(null);
        setResponsavel("");
        setAluno("");
        setEscolaSelecionada(escolas[0] || "");
        setSerieSelecionada(series[0] || "");
        setDataFechamento(new Date().toISOString().split("T")[0]);
    }

    // Salva um novo fechamento OU atualiza o fechamento em edição
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

        if (editandoId !== null) {
            // MODO EDIÇÃO: UPDATE fechamentos SET ... WHERE id = editandoId
            const { data: registroAtualizado, error } = await supabase
                .from("fechamentos")
                .update({
                    responsavel: responsavel.trim(),
                    aluno: aluno.trim(),
                    escola: escolaSelecionada,
                    serie: serieSelecionada,
                    data: dataFechamento,
                })
                .eq("id", editandoId)
                .eq("user_id", usuarioLogado.id)
                .select()
                .single();

            setSalvando(false);

            if (error) {
                alert("Erro ao atualizar no banco: " + error.message);
                return;
            }

            if (registroAtualizado) {
                setFechamentos((listaAtual) =>
                    listaAtual.map((item) =>
                        item.id === editandoId ? registroAtualizado : item
                    )
                );
                handleCancelarEdicao();
            }
        } else {
            // MODO NOVO REGISTRO: INSERT INTO fechamentos ...
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

            if (registroCriado) {
                setFechamentos([registroCriado, ...fechamentos]);
                setResponsavel("");
                setAluno("");
            }
        }
    }

    async function handleRemoverFechamento(itemParaRemover: Fechamento) {
        const confirmou = window.confirm(
            `Deseja excluir o fechamento de "${itemParaRemover.aluno}"?`
        );
        if (!confirmou) return;

        const { error } = await supabase
            .from("fechamentos")
            .delete()
            .eq("id", itemParaRemover.id);

        if (error) {
            alert("Erro ao excluir: " + error.message);
            return;
        }

        if (editandoId === itemParaRemover.id) {
            handleCancelarEdicao();
        }

        const listaAtualizada = fechamentos.filter(
            (item) => item.id !== itemParaRemover.id
        );
        setFechamentos(listaAtualizada);
    }

    // --------------------------------------------------------------------------
    // BLOCO E: CÁLCULOS AUTOMÁTICOS, FILTROS E RELATÓRIO WHATSAPP
    // --------------------------------------------------------------------------
    const fechamentosDoMes = fechamentos.filter((item) =>
        item.data.startsWith(mesFiltro)
    );

    const porcentagemMeta =
        metaMensal > 0
            ? Math.min(Math.round((fechamentosDoMes.length / metaMensal) * 100), 100)
            : 0;

    // Aplica busca por texto e filtros de colégio/série sobre os alunos do mês
    const termoBuscaNormalizado = normalizarTexto(buscaTexto.trim());
    const temFiltroAtivo = Boolean(termoBuscaNormalizado || filtroEscola || filtroSerie);

    const fechamentosFiltrados = fechamentosDoMes.filter((item) => {
        const bateTexto =
            !termoBuscaNormalizado ||
            normalizarTexto(item.aluno).includes(termoBuscaNormalizado) ||
            normalizarTexto(item.responsavel).includes(termoBuscaNormalizado);

        const bateEscola = !filtroEscola || item.escola === filtroEscola;
        const bateSerie = !filtroSerie || item.serie === filtroSerie;

        return bateTexto && bateEscola && bateSerie;
    });

    // Garante que opções antigas já cadastradas também apareçam nos filtros e na edição
    const opcoesFiltroEscolas = Array.from(
        new Set([...escolas, ...fechamentosDoMes.map((f) => f.escola)])
    );
    const opcoesFiltroSeries = Array.from(
        new Set([...series, ...fechamentosDoMes.map((f) => f.serie)])
    );

    const opcoesSelectEscolas =
        escolaSelecionada && !escolas.includes(escolaSelecionada)
            ? [escolaSelecionada, ...escolas]
            : escolas;

    const opcoesSelectSeries =
        serieSelecionada && !series.includes(serieSelecionada)
            ? [serieSelecionada, ...series]
            : series;

    function handleLimparFiltros() {
        setBuscaTexto("");
        setFiltroEscola("");
        setFiltroSerie("");
    }

    function handleCopiarRelatorio() {
        if (fechamentosFiltrados.length === 0) {
            alert("Não há alunos listados para gerar relatório.");
            return;
        }

        const linhas = fechamentosFiltrados.map((item, index) => {
            const [ano, mes, dia] = item.data.split("-");
            return `${index + 1}. Aluno: ${item.aluno} (${item.serie} - ${item.escola}) | Resp.: ${item.responsavel} | Data: ${dia}/${mes}/${ano}`;
        });

        const cabecalhoFiltro = temFiltroAtivo ? " *(Lista Filtrada)*" : "";
        const textoRelatorio = `*Fechamentos do Mês (${mesFiltro})*${cabecalhoFiltro}\nConsultor: ${usuarioLogado?.nome}\nMeta: ${fechamentosDoMes.length}/${metaMensal} alunos\n\n${linhas.join("\n")}`;

        navigator.clipboard.writeText(textoRelatorio);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
    }

    // ============================================================================
    // 📋 PARTE 2: INTERFACE VISUAL (Identidade Visual R4)
    // ============================================================================

    if (carregando) {
        return (
            <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-slate-700">
                <img
                    src="/logo-r4.png"
                    alt="Logo R4"
                    className="w-16 h-16 rounded-full object-contain bg-white p-1 shadow-xs animate-pulse"
                />
                <span>Conectando ao banco de dados...</span>
            </main>
        );
    }

    if (!usuarioLogado) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center p-4 text-slate-800">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="text-center mb-6">
                        <img
                            src="/logo-r4.png"
                            alt="Logo R4"
                            className="w-20 h-20 mx-auto mb-3 rounded-full object-contain bg-white p-1 shadow-xs border border-slate-100"
                        />
                        <h1 className="text-2xl font-bold text-r4-marrom">
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
                                    ? "bg-white text-r4-marrom shadow-xs"
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
                                    ? "bg-white text-r4-marrom shadow-xs"
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
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
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
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
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
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                required
                            />
                        </div>

                        {erroAuth && (
                            <p className="text-sm text-r4-vermelho bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {erroAuth}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={enviandoAuth}
                            className="w-full bg-r4-terracota hover:bg-r4-terracota-escuro disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer"
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
        <main className="min-h-screen bg-background p-4 md:p-8 text-slate-800">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* BARRA SUPERIOR DO PERFIL LOGADO */}
                <div className="flex items-center justify-between bg-r4-marrom text-white px-5 py-3 rounded-xl text-sm shadow-xs">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo-r4.png"
                            alt="Logo R4"
                            className="w-8 h-8 rounded-full bg-white p-0.5 object-contain shrink-0"
                        />
                        <div>
                            Perfil ativo: <strong>{usuarioLogado.nome}</strong>{" "}
                            <span className="text-stone-300 hidden sm:inline">
                                ({usuarioLogado.email})
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSair}
                        className="bg-white/10 hover:bg-r4-vermelho text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                        Sair / Trocar Conta
                    </button>
                </div>

                {/* CABEÇALHO E TERMÔMETRO DA META */}
                <header className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <img
                                src="/logo-r4.png"
                                alt="Logo R4"
                                className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs object-contain shrink-0"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-r4-marrom">
                                    Controle de Matrículas — R4
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Registro rápido de atendimentos fechados
                                </p>
                            </div>
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
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
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
                                    className="w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex justify-between text-sm font-medium mb-1">
                            <span>
                                Progresso: {fechamentosDoMes.length} de {metaMensal} alunos fechados
                            </span>
                            <span className="text-r4-petroleo font-bold">{porcentagemMeta}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-r4-petroleo h-3 rounded-full transition-all duration-300"
                                style={{ width: `${porcentagemMeta}%` }}
                            />
                        </div>
                    </div>
                </header>

                {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
                <section
                    ref={formRef}
                    className={`bg-white p-6 rounded-xl shadow-sm transition-colors ${
                        editandoId !== null
                            ? "border-2 border-r4-petroleo"
                            : "border border-slate-200"
                    }`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-semibold text-r4-marrom">
                                {editandoId !== null ? "Editar Fechamento" : "Novo Fechamento"}
                            </h2>
                            {editandoId !== null && (
                                <span className="bg-r4-petroleo/15 text-r4-petroleo-escuro text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                    Modo Edição
                                </span>
                            )}
                        </div>

                        {editandoId !== null && (
                            <button
                                type="button"
                                onClick={handleCancelarEdicao}
                                className="text-xs font-medium text-slate-500 hover:text-r4-vermelho underline cursor-pointer"
                            >
                                Cancelar edição
                            </button>
                        )}
                    </div>

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
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
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
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
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
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                >
                                    {opcoesSelectEscolas.length === 0 && (
                                        <option value="">Nenhum colégio cadastrado</option>
                                    )}
                                    {opcoesSelectEscolas.map((esc) => (
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
                                    className="px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-40 rounded-lg font-bold text-r4-vermelho cursor-pointer"
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
                                        className="w-full border border-r4-petroleo rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAdicionarEscola}
                                        className="px-3 py-1.5 bg-r4-petroleo text-white text-sm rounded-lg hover:bg-r4-petroleo-escuro cursor-pointer"
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
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                >
                                    {opcoesSelectSeries.length === 0 && (
                                        <option value="">Nenhuma série cadastrada</option>
                                    )}
                                    {opcoesSelectSeries.map((ser) => (
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
                                    className="px-3 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-40 rounded-lg font-bold text-r4-vermelho cursor-pointer"
                                >
                                    -
                                </button>
                            </div>

                            {mostrandoNovaSerie && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nome da nova série..."
                                        value={textoNovaSerie}
                                        onChange={(e) => setTextoNovaSerie(e.target.value)}
                                        className="w-full border border-r4-petroleo rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAdicionarSerie}
                                        className="px-3 py-1.5 bg-r4-petroleo text-white text-sm rounded-lg hover:bg-r4-petroleo-escuro cursor-pointer"
                                    >
                                        OK
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Data do Fechamento */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Data do Fechamento
                            </label>
                            <input
                                type="date"
                                value={dataFechamento}
                                onChange={(e) => setDataFechamento(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                required
                            />
                        </div>

                        {/* Botão Principal de Envio / Atualização */}
                        <div className="flex items-end gap-2">
                            <button
                                type="submit"
                                disabled={salvando}
                                className={`w-full disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer ${
                                    editandoId !== null
                                        ? "bg-r4-petroleo hover:bg-r4-petroleo-escuro"
                                        : "bg-r4-terracota hover:bg-r4-terracota-escuro"
                                }`}
                            >
                                {salvando
                                    ? "Salvando..."
                                    : editandoId !== null
                                        ? "Salvar Alterações"
                                        : "Registrar Aluno Fechado"}
                            </button>

                            {editandoId !== null && (
                                <button
                                    type="button"
                                    onClick={handleCancelarEdicao}
                                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                {/* LISTAGEM DOS ALUNOS FECHADOS NO MÊS */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-r4-marrom">
                                Alunos Fechados no Mês ({fechamentosDoMes.length})
                            </h2>
                            {temFiltroAtivo && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Exibindo <strong>{fechamentosFiltrados.length}</strong> de{" "}
                                    {fechamentosDoMes.length} registros filtrados
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleCopiarRelatorio}
                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
                                copiado
                                    ? "bg-emerald-600"
                                    : "bg-r4-petroleo hover:bg-r4-petroleo-escuro"
                            }`}
                        >
                            {copiado
                                ? "Relatório Copiado!"
                                : temFiltroAtivo
                                    ? "Copiar Lista Filtrada"
                                    : "Copiar Relatório do Mês"}
                        </button>
                    </div>

                    {/* BARRA DE BUSCA E FILTROS */}
                    {fechamentosDoMes.length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <input
                                    type="text"
                                    placeholder="Buscar aluno ou responsável..."
                                    value={buscaTexto}
                                    onChange={(e) => setBuscaTexto(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                />

                                <select
                                    value={filtroEscola}
                                    onChange={(e) => setFiltroEscola(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                >
                                    <option value="">Todos os colégios</option>
                                    {opcoesFiltroEscolas.map((esc) => (
                                        <option key={esc} value={esc}>
                                            {esc}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={filtroSerie}
                                    onChange={(e) => setFiltroSerie(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                >
                                    <option value="">Todas as séries</option>
                                    {opcoesFiltroSeries.map((ser) => (
                                        <option key={ser} value={ser}>
                                            {ser}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {temFiltroAtivo && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleLimparFiltros}
                                        className="text-xs font-medium text-r4-terracota hover:underline cursor-pointer"
                                    >
                                        Limpar busca e filtros
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {fechamentosDoMes.length === 0 ? (
                        <p className="text-sm text-slate-500 py-6 text-center">
                            Nenhum aluno fechado registrado para este mês ainda.
                        </p>
                    ) : fechamentosFiltrados.length === 0 ? (
                        <div className="py-6 text-center space-y-2">
                            <p className="text-sm text-slate-500">
                                Nenhum aluno encontrado com os filtros selecionados.
                            </p>
                            <button
                                type="button"
                                onClick={handleLimparFiltros}
                                className="text-xs font-medium text-r4-petroleo hover:underline cursor-pointer"
                            >
                                Mostrar todos os alunos do mês
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2.5 pr-4 font-medium">Aluno</th>
                                    <th className="py-2.5 px-4 font-medium">Responsável</th>
                                    <th className="py-2.5 px-4 font-medium">Série / Colégio</th>
                                    <th className="py-2.5 px-4 font-medium">Data</th>
                                    <th className="py-2.5 pl-4 font-medium text-right">Ações</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {fechamentosFiltrados.map((item) => {
                                    const [ano, mes, dia] = item.data.split("-");
                                    const estaEmEdicao = editandoId === item.id;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={
                                                estaEmEdicao
                                                    ? "bg-r4-petroleo/10"
                                                    : "hover:bg-slate-50"
                                            }
                                        >
                                            <td className="py-3 pr-4 font-medium text-slate-900">
                                                {item.aluno}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {item.responsavel}
                                            </td>
                                            <td className="py-3 px-4">
                                                    <span className="inline-block bg-r4-petroleo/10 text-r4-petroleo-escuro font-medium px-2 py-0.5 rounded-md text-xs mr-2">
                                                        {item.serie}
                                                    </span>
                                                <span className="text-slate-600">{item.escola}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {`${dia}/${mes}/${ano}`}
                                            </td>
                                            <td className="py-3 pl-4 text-right whitespace-nowrap space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleIniciarEdicao(item)}
                                                    className="text-r4-petroleo-escuro hover:underline text-xs font-semibold cursor-pointer"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoverFechamento(item)}
                                                    className="text-r4-vermelho hover:underline text-xs font-medium cursor-pointer"
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