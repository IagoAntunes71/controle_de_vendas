# 🎓 Controle de Matrículas — Reforço Escolar (R4)

Sistema completo para gestão de matrículas e acompanhamentos de fechamentos mensais do **Reforço Escolar R4**, disponível tanto via navegador (Web) quanto como aplicativo nativo leve para Windows (Desktop).

---

## 🚀 Como Acessar

### 🌐 Versão Web
Acesse diretamente pelo navegador de qualquer dispositivo:
👉 **[https://controle-de-vendas-fawn.vercel.app/](https://controle-de-vendas-fawn.vercel.app/)**

### 💻 Aplicativo Desktop (Windows)
Para maior agilidade no dia a dia, o sistema conta com um aplicativo nativo para Windows (`.exe`) empacotado com **Tauri**, com acesso direto pela Área de Trabalho e Barra de Tarefas:

1. Acesse a **[página de Releases](https://github.com/IagoAntunes71/controle_de_vendas/releases/tag/v0.1.0)** deste repositório.
2. Baixe o instalador **`Controle De Matriculas_0.1.0_x64-setup.exe`** (~1,84 MB).
3. Execute o arquivo baixado e siga as instruções na tela para concluir a instalação.

---

## ✨ Funcionalidades Principais

* **Controle de Perfil Ativo:** Identificação do consultor/usuário logado com opção rápida para sair ou trocar de conta.
* **Metas e Progresso Mensal:** Seleção do mês de referência, definição de meta de alunos e barra de progresso visual calculada automaticamente.
* **Registro Rápido de Fechamentos:** Formulário intuitivo para cadastrar responsável, nome do aluno, colégio, série e data de fechamento.
* **Cadastro Dinâmico de Colégios e Séries:** Botões de adição (`+`) e remoção (`-`) integrados diretamente ao formulário para gerenciar listas sem precisar editar código.
* **Relatório com Um Clique:** Listagem detalhada dos alunos fechados no mês selecionado, com opção de exclusão individual e botão **Copiar Relatório do Mês** pronto para envio.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend & Deploy Web:** JavaScript / HTML / CSS hospedado na **Vercel** com atualização contínua via GitHub.
* **Aplicativo Desktop:** **Tauri v2** (Rust + WebView2) com empacotamento via **NSIS** para Windows x64.

---
