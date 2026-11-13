import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { telefone, apiKey, mensagem } = await request.json();

        const digitos = String(telefone || "").replace(/\D/g, "");
        if (!digitos || !apiKey || !mensagem) {
            return NextResponse.json(
                { erro: "Configure o WhatsApp e a API Key do CallMeBot no perfil." },
                { status: 400 }
            );
        }

        const telefoneComDdi =
            digitos.length === 10 || digitos.length === 11
                ? `+55${digitos}`
                : `+${digitos}`;

        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
            telefoneComDdi
        )}&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(
            String(apiKey).trim()
        )}`;

        const resposta = await fetch(url, { method: "GET", cache: "no-store" });
        const textoRetorno = await resposta.text();

        if (!resposta.ok || textoRetorno.toLowerCase().includes("error")) {
            return NextResponse.json(
                { erro: `Falha no CallMeBot: ${textoRetorno}` },
                { status: 502 }
            );
        }

        return NextResponse.json({ sucesso: true });
    } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : "Erro desconhecido";
        return NextResponse.json(
            { erro: `Erro interno ao conectar ao CallMeBot: ${detalhe}` },
            { status: 500 }
        );
    }
}