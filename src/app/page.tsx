// ============================================================================
// ✍️ PARTE 1: CONEXÃO COM BANCO E LOGIN REAL
// ============================================================================

"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface Fechamento {
    id: number;
    user_id?: string;
    responsavel: string;
    aluno: string;
    escola: string;
    serie: string;
    origem?: string;
    data: string;
}

interface UsuarioPerfil {
    id: string;
    nome: string;
    email: string;
    isAdmin: boolean;
    whatsappRelatorio: string;
    callmebotApiKey: string;
    ultimoRelatorioAuto: string;
}

interface ConsultorResumo {
    id: string;
    nome: string;
    meta_mensal: number;
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

const ORIGENS_CLIENTE: string[] = [
    "DataCrazy",
    "Presencial",
    "Ligação",
];

function normalizarTexto(texto: string): string {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function limparDigitos(valor: string): string {
    return valor.replace(/\D/g, "");
}

function formatarTelefoneExibicao(valor: string): string {
    const digitos = limparDigitos(valor).slice(0, 13);
    if (!digitos) return "";

    const local =
        digitos.startsWith("55") && digitos.length >= 12
            ? digitos.slice(2)
            : digitos;

    if (local.length <= 2) return `(${local}`;
    if (local.length <= 6) return `(${local.slice(0, 2)}) ${local.slice(2)}`;
    if (local.length <= 10) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7, 11)}`;
}

function normalizarNumeroBanco(valor: string): string {
    const digitos = limparDigitos(valor);
    if (!digitos) return "";
    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    return digitos;
}

function formatarMesAno(mesIso: string): string {
    if (!mesIso || !mesIso.includes("-")) return mesIso;
    const [ano, mes] = mesIso.split("-");
    return `${mes}/${ano}`;
}

function obterEstiloBadgeOrigem(origem: string): string {
    if (origem === "Presencial") {
        return "bg-r4-terracota/15 text-r4-terracota-escuro";
    }
    if (origem === "Ligação") {
        return "bg-r4-marrom/10 text-r4-marrom";
    }
    return "bg-r4-petroleo/15 text-r4-petroleo-escuro";
}

export default function ControleReforcoPage() {

    // --------------------------------------------------------------------------
    // BLOCO A1: ESTADOS DE LOGIN E CADASTRO
    // --------------------------------------------------------------------------
    const [usuarioLogado, setUsuarioLogado] = useState<UsuarioPerfil | null>(null);
    const [consultores, setConsultores] = useState<ConsultorResumo[]>([]);
    const [carregando, setCarregando] = useState<boolean>(true);
    const [enviandoAuth, setEnviandoAuth] = useState<boolean>(false);

    const [modoCadastro, setModoCadastro] = useState<boolean>(false);
    const [nomeAuth, setNomeAuth] = useState<string>("");
    const [emailAuth, setEmailAuth] = useState<string>("");
    const [senhaAuth, setSenhaAuth] = useState<string>("");
    const [erroAuth, setErroAuth] = useState<string>("");

    // --------------------------------------------------------------------------
    // BLOCO A2: ESTADOS DE WHATSAPP (CALLMEBOT) DO PERFIL
    // --------------------------------------------------------------------------
    const [editandoWhatsapp, setEditandoWhatsapp] = useState<boolean>(false);
    const [inputWhatsapp, setInputWhatsapp] = useState<string>("");
    const [inputApiKey, setInputApiKey] = useState<string>("");
    const [salvandoWhatsapp, setSalvandoWhatsapp] = useState<boolean>(false);
    const [enviandoWhatsapp, setEnviandoWhatsapp] = useState<boolean>(false);
    const [whatsappEnviadoOk, setWhatsappEnviadoOk] = useState<boolean>(false);

    // --------------------------------------------------------------------------
    // BLOCO A3: ESTADOS DO SISTEMA
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
    const [origemSelecionada, setOrigemSelecionada] = useState<string>(ORIGENS_CLIENTE[0]);

    const [dataFechamento, setDataFechamento] = useState<string>("");

    const [editandoId, setEditandoId] = useState<number | null>(null);
    const formRef = useRef<HTMLElement | null>(null);

    const [metaMensal, setMetaMensal] = useState<number>(15);
    const [mesFiltro, setMesFiltro] = useState<string>("");

    const [buscaTexto, setBuscaTexto] = useState<string>("");
    const [filtroEscola, setFiltroEscola] = useState<string>("");
    const [filtroSerie, setFiltroSerie] = useState<string>("");
    const [filtroOrigem, setFiltroOrigem] = useState<string>("");
    const [filtroConsultor, setFiltroConsultor] = useState<string>("");

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
            const { data: novoPerfil, error: erroInsert } = await supabase
                .from("perfis")
                .insert({
                    id: userId,
                    nome: nomeInicial || email.split("@")[0],
                    escolas: ESCOLAS_PADRAO,
                    series: SERIES_PADRAO,
                    meta_mensal: 15,
                    whatsapp_relatorio: "",
                    callmebot_apikey: "",
                    ultimo_relatorio_auto: "",
                })
                .select()
                .single();

            if (erroInsert) {
                setErroAuth("Erro ao criar perfil no banco: " + erroInsert.message);
                return;
            }

            perfil = novoPerfil;
        }

        const ehAdmin = Boolean(perfil?.is_admin);

        // Se for ADM, busca também a lista de todos os perfis para identificar cada consultor
        if (ehAdmin) {
            const { data: todosPerfis } = await supabase
                .from("perfis")
                .select("id, nome, meta_mensal")
                .order("nome", { ascending: true });

            if (todosPerfis) {
                setConsultores(todosPerfis);
            }
        } else if (perfil) {
            setConsultores([
                {
                    id: userId,
                    nome: perfil.nome,
                    meta_mensal: perfil.meta_mensal,
                },
            ]);
        }

        // Para ADM, a política RLS retorna os fechamentos de todos os consultores
        const { data: listaFechamentos } = await supabase
            .from("fechamentos")
            .select("*")
            .order("id", { ascending: false });

        if (listaFechamentos) {
            setFechamentos(listaFechamentos);
        }

        if (perfil) {
            const whatsappSalvo = perfil.whatsapp_relatorio || "";
            const apiKeySalva = perfil.callmebot_apikey || "";

            setUsuarioLogado({
                id: userId,
                nome: perfil.nome,
                email: email,
                isAdmin: ehAdmin,
                whatsappRelatorio: whatsappSalvo,
                callmebotApiKey: apiKeySalva,
                ultimoRelatorioAuto: perfil.ultimo_relatorio_auto || "",
            });
            setInputWhatsapp(formatarTelefoneExibicao(whatsappSalvo));
            setInputApiKey(apiKeySalva);
            setEscolas(perfil.escolas);
            setSeries(perfil.series);
            setEscolaSelecionada(perfil.escolas[0] || "");
            setSerieSelecionada(perfil.series[0] || "");
            setMetaMensal(perfil.meta_mensal);
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
        setConsultores([]);
        setFechamentos([]);
        setEditandoId(null);
        setFiltroConsultor("");
    }

    // --------------------------------------------------------------------------
    // BLOCO D: FUNÇÕES DO PERFIL E DO SISTEMA (PostgreSQL via Supabase)
    // --------------------------------------------------------------------------
    async function handleSalvarWhatsappPerfil(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!usuarioLogado) return;

        const digitos = limparDigitos(inputWhatsapp);
        if (digitos.length > 0 && digitos.length < 10) {
            alert("Digite um número de WhatsApp válido com DDD (ex: (71) 99999-9999).");
            return;
        }

        const chaveLimpa = inputApiKey.trim();
        if (digitos.length > 0 && !chaveLimpa) {
            alert("Informe também a API Key recebida do CallMeBot.");
            return;
        }

        setSalvandoWhatsapp(true);
        const numeroNormalizado = normalizarNumeroBanco(inputWhatsapp);

        const { error } = await supabase
            .from("perfis")
            .update({
                whatsapp_relatorio: numeroNormalizado,
                callmebot_apikey: numeroNormalizado ? chaveLimpa : "",
            })
            .eq("id", usuarioLogado.id);

        setSalvandoWhatsapp(false);

        if (error) {
            alert(
                "Erro ao salvar configurações. Verifique se executou o SQL na tabela 'perfis': " +
                error.message
            );
            return;
        }

        setUsuarioLogado({
            ...usuarioLogado,
            whatsappRelatorio: numeroNormalizado,
            callmebotApiKey: numeroNormalizado ? chaveLimpa : "",
        });
        setInputWhatsapp(formatarTelefoneExibicao(numeroNormalizado));
        setInputApiKey(numeroNormalizado ? chaveLimpa : "");
        setEditandoWhatsapp(false);
    }

    async function handleSalvarMetaNoBanco() {
        if (!usuarioLogado) return;
        await supabase
            .from("perfis")
            .update({ meta_mensal: metaMensal })
            .eq("id", usuarioLogado.id);

        setConsultores((lista) =>
            lista.map((c) =>
                c.id === usuarioLogado.id ? { ...c, meta_mensal: metaMensal } : c
            )
        );
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

    function handleIniciarEdicao(item: Fechamento) {
        setEditandoId(item.id);
        setResponsavel(item.responsavel);
        setAluno(item.aluno);
        setEscolaSelecionada(item.escola);
        setSerieSelecionada(item.serie);
        setOrigemSelecionada(item.origem || ORIGENS_CLIENTE[0]);
        setDataFechamento(item.data);

        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleCancelarEdicao() {
        setEditandoId(null);
        setResponsavel("");
        setAluno("");
        setEscolaSelecionada(escolas[0] || "");
        setSerieSelecionada(series[0] || "");
        setOrigemSelecionada(ORIGENS_CLIENTE[0]);
        setDataFechamento(new Date().toISOString().split("T")[0]);
    }

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
            let queryUpdate = supabase
                .from("fechamentos")
                .update({
                    responsavel: responsavel.trim(),
                    aluno: aluno.trim(),
                    escola: escolaSelecionada,
                    serie: serieSelecionada,
                    origem: origemSelecionada,
                    data: dataFechamento,
                })
                .eq("id", editandoId);

            if (!usuarioLogado.isAdmin) {
                queryUpdate = queryUpdate.eq("user_id", usuarioLogado.id);
            }

            const { data: registroAtualizado, error } = await queryUpdate
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
            const { data: registroCriado, error } = await supabase
                .from("fechamentos")
                .insert({
                    user_id: usuarioLogado.id,
                    responsavel: responsavel.trim(),
                    aluno: aluno.trim(),
                    escola: escolaSelecionada,
                    serie: serieSelecionada,
                    origem: origemSelecionada,
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
                setOrigemSelecionada(ORIGENS_CLIENTE[0]);
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
    // BLOCO E: CÁLCULOS AUTOMÁTICOS, FILTROS E ENVIO DIRETO WHATSAPP
    // --------------------------------------------------------------------------
    const mapaConsultores = new Map<string, ConsultorResumo>(
        consultores.map((c) => [c.id, c])
    );

    function obterNomeConsultor(userId?: string): string {
        if (!userId) return usuarioLogado?.nome || "Consultor";
        return mapaConsultores.get(userId)?.nome || "Consultor";
    }

    const fechamentosDoMes = fechamentos.filter((item) =>
        item.data.startsWith(mesFiltro)
    );

    // Base do termômetro: se o ADM filtrou um consultor específico, mostra a meta dele; caso contrário, mostra o total da equipe
    const fechamentosBaseMeta =
        usuarioLogado?.isAdmin && filtroConsultor
            ? fechamentosDoMes.filter((item) => item.user_id === filtroConsultor)
            : fechamentosDoMes;

    const metaExibida =
        usuarioLogado?.isAdmin && !filtroConsultor
            ? consultores.reduce((soma, c) => soma + (c.meta_mensal || 0), 0) || metaMensal
            : usuarioLogado?.isAdmin && filtroConsultor
                ? mapaConsultores.get(filtroConsultor)?.meta_mensal || metaMensal
                : metaMensal;

    const porcentagemMeta =
        metaExibida > 0
            ? Math.min(Math.round((fechamentosBaseMeta.length / metaExibida) * 100), 100)
            : 0;

    const termoBuscaNormalizado = normalizarTexto(buscaTexto.trim());
    const temFiltroAtivo = Boolean(
        termoBuscaNormalizado ||
        filtroEscola ||
        filtroSerie ||
        filtroOrigem ||
        filtroConsultor
    );

    const fechamentosFiltrados = fechamentosDoMes.filter((item) => {
        const bateTexto =
            !termoBuscaNormalizado ||
            normalizarTexto(item.aluno).includes(termoBuscaNormalizado) ||
            normalizarTexto(item.responsavel).includes(termoBuscaNormalizado);

        const bateEscola = !filtroEscola || item.escola === filtroEscola;
        const bateSerie = !filtroSerie || item.serie === filtroSerie;
        const origemAtual = item.origem || ORIGENS_CLIENTE[0];
        const bateOrigem = !filtroOrigem || origemAtual === filtroOrigem;
        const bateConsultor = !filtroConsultor || item.user_id === filtroConsultor;

        return bateTexto && bateEscola && bateSerie && bateOrigem && bateConsultor;
    });

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
        setFiltroOrigem("");
        setFiltroConsultor("");
    }

    function montarTextoRelatorioAtual(): string {
        const linhas = fechamentosFiltrados.map((item, index) => {
            const [ano, mes, dia] = item.data.split("-");
            const origemTexto = item.origem || ORIGENS_CLIENTE[0];
            const infoConsultor = usuarioLogado?.isAdmin
                ? ` | Consultor: ${obterNomeConsultor(item.user_id)}`
                : "";
            return `${index + 1}. Aluno: ${item.aluno} (${item.serie} - ${item.escola}) | Origem: ${origemTexto}${infoConsultor} | Resp.: ${item.responsavel} | Data: ${dia}/${mes}/${ano}`;
        });

        const cabecalhoFiltro = temFiltroAtivo ? " *(Lista Filtrada)*" : "";
        const tituloConsultor = usuarioLogado?.isAdmin
            ? filtroConsultor
                ? `Consultor: ${obterNomeConsultor(filtroConsultor)}`
                : `Visão Geral ADM (Toda a Equipe)`
            : `Consultor: ${usuarioLogado?.nome}`;

        return `*Fechamentos do Mês (${formatarMesAno(mesFiltro)}) — R4*${cabecalhoFiltro}\n${tituloConsultor}\nMeta: ${fechamentosBaseMeta.length}/${metaExibida} alunos\n\n${linhas.join("\n")}`;
    }

    function handleCopiarRelatorio() {
        if (fechamentosFiltrados.length === 0) {
            alert("Não há alunos listados para gerar relatório.");
            return;
        }

        navigator.clipboard.writeText(montarTextoRelatorioAtual());
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
    }

    async function handleEnviarRelatorioWhatsAppDireto() {
        if (!usuarioLogado) return;

        if (!usuarioLogado.whatsappRelatorio || !usuarioLogado.callmebotApiKey) {
            alert("Configure primeiro seu número de WhatsApp e a API Key do CallMeBot no perfil acima.");
            setEditandoWhatsapp(true);
            return;
        }

        if (fechamentosFiltrados.length === 0) {
            alert("Não há alunos listados neste mês/filtro para enviar.");
            return;
        }

        setEnviandoWhatsapp(true);

        try {
            const resposta = await fetch("/api/whatsapp/enviar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telefone: usuarioLogado.whatsappRelatorio,
                    apiKey: usuarioLogado.callmebotApiKey,
                    mensagem: montarTextoRelatorioAtual(),
                }),
            });

            const dados = await resposta.json();
            setEnviandoWhatsapp(false);

            if (!resposta.ok) {
                alert(dados.erro || "Não foi possível enviar a mensagem no WhatsApp.");
                return;
            }

            setWhatsappEnviadoOk(true);
            setTimeout(() => setWhatsappEnviadoOk(false), 3000);
        } catch {
            setEnviandoWhatsapp(false);
            alert("Erro de conexão ao tentar enviar pelo WhatsApp.");
        }
    }

    const whatsappConfigurado = Boolean(
        usuarioLogado?.whatsappRelatorio && usuarioLogado?.callmebotApiKey
    );

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
            <div className="max-w-5xl mx-auto space-y-6">

                {/* BARRA SUPERIOR DO PERFIL LOGADO + WHATSAPP AUTOMÁTICO */}
                <div className="bg-r4-marrom text-white px-5 py-3 rounded-xl text-sm shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo-r4.png"
                                alt="Logo R4"
                                className="w-8 h-8 rounded-full bg-white p-0.5 object-contain shrink-0"
                            />
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span>
                                        Perfil ativo: <strong>{usuarioLogado.nome}</strong>{" "}
                                        <span className="text-stone-300 hidden md:inline">
                                            ({usuarioLogado.email})
                                        </span>
                                    </span>

                                    {usuarioLogado.isAdmin && (
                                        <span className="bg-r4-terracota text-white text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md">
                                            ADM • Visão Geral
                                        </span>
                                    )}
                                </div>

                                <div className="text-xs text-stone-300 mt-0.5">
                                    Envio automático (dia 1 às 08h):{" "}
                                    {whatsappConfigurado ? (
                                        <span className="text-emerald-300 font-medium">
                                            Ativo para{" "}
                                            {formatarTelefoneExibicao(
                                                usuarioLogado.whatsappRelatorio
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-amber-300">Não configurado</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={() => setEditandoWhatsapp(!editandoWhatsapp)}
                                className="bg-r4-petroleo hover:bg-r4-petroleo-escuro text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                                {editandoWhatsapp
                                    ? "Fechar Config."
                                    : whatsappConfigurado
                                        ? "Alterar WhatsApp"
                                        : "Configurar WhatsApp"}
                            </button>

                            <button
                                type="button"
                                onClick={handleSair}
                                className="bg-white/10 hover:bg-r4-vermelho text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                                Sair / Trocar Conta
                            </button>
                        </div>
                    </div>

                    {/* CONFIGURAÇÃO CALLMEBOT POR PERFIL */}
                    {editandoWhatsapp && (
                        <form
                            onSubmit={handleSalvarWhatsappPerfil}
                            className="pt-3 border-t border-white/15 space-y-3"
                        >
                            <p className="text-xs text-stone-200 leading-relaxed">
                                Para ativar o envio automático gratuito: adicione o contato do{" "}
                                <a
                                    href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-emerald-300 font-medium"
                                >
                                    CallMeBot
                                </a>{" "}
                                no WhatsApp, envie{" "}
                                <code className="bg-black/30 px-1.5 py-0.5 rounded">
                                    I allow callmebot to send me messages
                                </code>{" "}
                                e cole abaixo o seu número e a <strong>API Key</strong> recebida:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-stone-200 mb-1">
                                        WhatsApp com DDD
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Ex: (71) 99999-9999"
                                        value={inputWhatsapp}
                                        onChange={(e) =>
                                            setInputWhatsapp(
                                                formatarTelefoneExibicao(e.target.value)
                                            )
                                        }
                                        className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-stone-200 mb-1">
                                        API Key do CallMeBot
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 123456"
                                        value={inputApiKey}
                                        onChange={(e) => setInputApiKey(e.target.value)}
                                        className="w-full bg-white text-slate-900 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={salvandoWhatsapp}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer h-[34px]"
                                >
                                    {salvandoWhatsapp ? "Salvando..." : "Salvar Automação"}
                                </button>
                            </div>
                        </form>
                    )}
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
                                    {usuarioLogado.isAdmin
                                        ? "Painel administrativo com fechamentos de toda a equipe"
                                        : "Registro rápido de atendimentos fechados"}
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
                                    Sua Meta (Alunos)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={metaMensal}
                                    onChange={(e) => setMetaMensal(Number(e.target.value))}
                                    onBlur={handleSalvarMetaNoBanco}
                                    className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex justify-between text-sm font-medium mb-1">
                            <span>
                                {usuarioLogado.isAdmin && !filtroConsultor
                                    ? `Progresso da Equipe: ${fechamentosBaseMeta.length} de ${metaExibida} alunos fechados`
                                    : `Progresso: ${fechamentosBaseMeta.length} de ${metaExibida} alunos fechados`}
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

                        {/* Origem do Cliente */}
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Origem do Cliente
                            </label>
                            <select
                                value={origemSelecionada}
                                onChange={(e) => setOrigemSelecionada(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                            >
                                {ORIGENS_CLIENTE.map((orig) => (
                                    <option key={orig} value={orig}>
                                        {orig}
                                    </option>
                                ))}
                            </select>
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
                        <div className="md:col-span-2 flex items-center gap-2 pt-1">
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

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopiarRelatorio}
                                className={`px-3.5 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
                                    copiado
                                        ? "bg-emerald-600"
                                        : "bg-r4-petroleo hover:bg-r4-petroleo-escuro"
                                }`}
                            >
                                {copiado
                                    ? "Relatório Copiado!"
                                    : temFiltroAtivo
                                        ? "Copiar Filtrados"
                                        : "Copiar Relatório"}
                            </button>

                            <button
                                type="button"
                                onClick={handleEnviarRelatorioWhatsAppDireto}
                                disabled={enviandoWhatsapp}
                                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
                            >
                                {enviandoWhatsapp
                                    ? "Enviando..."
                                    : whatsappEnviadoOk
                                        ? "Enviado no WhatsApp!"
                                        : "Enviar no WhatsApp"}
                            </button>
                        </div>
                    </div>

                    {/* BARRA DE BUSCA E FILTROS */}
                    {fechamentosDoMes.length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-4 space-y-2">
                            <div
                                className={`grid grid-cols-1 sm:grid-cols-2 ${
                                    usuarioLogado.isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"
                                } gap-2.5`}
                            >
                                <input
                                    type="text"
                                    placeholder="Buscar aluno ou responsável..."
                                    value={buscaTexto}
                                    onChange={(e) => setBuscaTexto(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                />

                                {usuarioLogado.isAdmin && (
                                    <select
                                        value={filtroConsultor}
                                        onChange={(e) => setFiltroConsultor(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                    >
                                        <option value="">Todos os consultores</option>
                                        {consultores.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.nome}
                                            </option>
                                        ))}
                                    </select>
                                )}

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

                                <select
                                    value={filtroOrigem}
                                    onChange={(e) => setFiltroOrigem(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-r4-petroleo"
                                >
                                    <option value="">Todas as origens</option>
                                    {ORIGENS_CLIENTE.map((orig) => (
                                        <option key={orig} value={orig}>
                                            {orig}
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
                                    <th className="py-2.5 px-4 font-medium">Origem</th>
                                    {usuarioLogado.isAdmin && (
                                        <th className="py-2.5 px-4 font-medium">Consultor</th>
                                    )}
                                    <th className="py-2.5 px-4 font-medium">Data</th>
                                    <th className="py-2.5 pl-4 font-medium text-right">Ações</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {fechamentosFiltrados.map((item) => {
                                    const [ano, mes, dia] = item.data.split("-");
                                    const estaEmEdicao = editandoId === item.id;
                                    const origemExibida = item.origem || ORIGENS_CLIENTE[0];

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
                                            <td className="py-3 px-4">
                                                    <span
                                                        className={`inline-block font-medium px-2.5 py-0.5 rounded-full text-xs ${obterEstiloBadgeOrigem(
                                                            origemExibida
                                                        )}`}
                                                    >
                                                        {origemExibida}
                                                    </span>
                                            </td>
                                            {usuarioLogado.isAdmin && (
                                                <td className="py-3 px-4 font-medium text-r4-marrom">
                                                    {obterNomeConsultor(item.user_id)}
                                                </td>
                                            )}
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