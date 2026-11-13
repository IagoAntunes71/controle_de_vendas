import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function obterMesAnterior(dataBase: Date): string {
    const primeiroDiaMesAnterior = new Date(
        dataBase.getFullYear(),
        dataBase.getMonth() - 1,
        1
    );
    const ano = primeiroDiaMesAnterior.getFullYear();
    const mes = String(primeiroDiaMesAnterior.getMonth() + 1).padStart(2, "0");
    return `${ano}-${mes}`;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
            { erro: "Variáveis do Supabase não configuradas." },
            { status: 500 }
        );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const mesAnterior = obterMesAnterior(new Date());
    const [anoRef, mesRef] = mesAnterior.split("-");

    const { data: perfis, error: erroPerfis } = await supabaseAdmin
        .from("perfis")
        .select("*")
        .neq("whatsapp_relatorio", "")
        .neq("callmebot_apikey", "");

    if (erroPerfis || !perfis) {
        return NextResponse.json(
            { erro: erroPerfis?.message || "Erro ao buscar perfis." },
            { status: 500 }
        );
    }

    let enviados = 0;

    for (const perfil of perfis) {
        if (!perfil.whatsapp_relatorio || !perfil.callmebot_apikey) continue;
        if (perfil.ultimo_relatorio_auto === mesAnterior) continue;

        const { data: fechamentos } = await supabaseAdmin
            .from("fechamentos")
            .select("*")
            .eq("user_id", perfil.id)
            .like("data", `${mesAnterior}-%`)
            .order("data", { ascending: true });

        if (!fechamentos || fechamentos.length === 0) continue;

        const linhas = fechamentos.map((item, index) => {
            const [ano, mes, dia] = item.data.split("-");
            const origemTexto = item.origem || "DataCrazy";
            return `${index + 1}. Aluno: ${item.aluno} (${item.serie} - ${item.escola}) | Origem: ${origemTexto} | Resp.: ${item.responsavel} | Data: ${dia}/${mes}/${ano}`;
        });

        const textoRelatorio = `*Fechamento Mensal (${mesRef}/${anoRef}) — R4*\nConsultor: ${perfil.nome}\nTotal Fechado: ${fechamentos.length}/${perfil.meta_mensal} alunos\n\n${linhas.join("\n")}`;

        const digitos = String(perfil.whatsapp_relatorio).replace(/\D/g, "");
        const telefoneComDdi =
            digitos.length === 10 || digitos.length === 11
                ? `+55${digitos}`
                : `+${digitos}`;

        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
            telefoneComDdi
        )}&text=${encodeURIComponent(textoRelatorio)}&apikey=${encodeURIComponent(
            String(perfil.callmebot_apikey).trim()
        )}`;

        const resposta = await fetch(url, { method: "GET", cache: "no-store" });

        if (resposta.ok) {
            await supabaseAdmin
                .from("perfis")
                .update({ ultimo_relatorio_auto: mesAnterior })
                .eq("id", perfil.id);
            enviados++;
        }
    }

    return NextResponse.json({
        sucesso: true,
        mesReferencia: mesAnterior,
        relatoriosEnviados: enviados,
    });
}