# git-repo-animation

> Acompanhe a evolução dos commits do repositório de forma animada e fluida.

O **git-repo-animation** é uma aplicação web interativa em React e Canvas 2D de alta performance que transforma o histórico de commits de qualquer repositório Git público do GitHub (ou repositório sintético demonstrativo) em uma árvore genealógica de ramificações cinematográfica e fluida.

---

## Principais Funcionalidades

- **Árvore da Linha do Tempo Fluida & Responsiva**:
  - Enquadramento dinâmico com física de amortecimento exponencial contínua (60 FPS), sem solavancos ou saltos bruscos.
  - Estabilização vertical da linha de visão na mediana da árvore, evitando oscilações ao alternar entre branches paralelos.
  - Nós de commits escalonados com proteção de legibilidade (tamanhos de nós e hashes adaptados a qualquer nível de zoom).

- **Dois Modos de Visualização de Câmera**:
  - **Seguir Câmera (Follow)**: Acompanha o commit em tempo real na vanguarda da linha do tempo, exibindo telemetria, autor, mensagem e estatísticas (`+adições / -remoções`).
  - **Cenário Total (Overview)**: Enquadra o panorama completo da árvore com zoom panorâmico dinâmico e deslize coordenado, permitindo visualizar repositórios com centenas de commits sem deformação.

- **Controles de Carregamento & Interrupção de Commits**:
  - Botão de parada imediata (**Parar**) acionado via `AbortController`, permitindo interromper o carregamento de repositórios gigantescos a qualquer momento e visualizar os commits já obtidos.
  - Suporte a GitHub Personal Access Token (PAT) opcional para repositórios com limites de taxa (rate limit) de API pública.

- **Navegação & Interatividade Completa**:
  - Arraste livre pelo canvas (*pan*) e zoom com a roda do mouse (*wheel*).
  - Botão inteligente flutuante **"Centralizar Câmera"** para retornar ao acompanhamento automático após navegação manual.
  - Clique em qualquer nó para abrir o **Inspetor de Commit** com detalhes completos (SHA, autor, data, mensagem, arquivos alterados e links diretos).

- **Múltiplos Temas Visuais**:
  - **Cósmico (Cosmic)**: Fundo profundo nebuloso com estrelas cintilantes e conexões brilhantes em neon.
  - **Matrix (Cyber)**: Estética terminal hacker com tons verde neon e grades futuristas.
  - **Minimalista Escuro (Clean Dark)**: Layout de alto contraste e foco técnico na topologia das ramificações.
  - **Solar (Warm)**: Paleta solar com gradientes âmbar e dourado.

- **Mecanismo de Exportação**:
  - Exportação direta para **PNG em alta resolução**, animação em **GIF** (via `gifenc`) e gravação em vídeo **WebM**.

---

## Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/) com [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Renderização Gráfica**: HTML5 Canvas 2D acelerado por hardware com subpixel scaling para telas Retina/HiDPI
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Exportação de GIF**: [gifenc](https://github.com/mattdesl/gifenc)

---

## Como Executar o Projeto

### Pré-requisitos
- Node.js 18+ instalado
- Gerenciador de pacotes npm ou yarn

### Instalação

```bash
# Clone ou baixe o repositório
git clone <url-do-repositorio>

# Acesse o diretório
cd git-repo-animation

# Instale as dependências
npm install
```

### Modo de Desenvolvimento

```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:3000`.

### Verificação de Tipos e Lint

```bash
npm run lint
```

### Build de Produção

```bash
npm run build
```
Os arquivos otimizados e prontos para implantação serão gerados no diretório `dist/`.

---

## Estrutura do Código

```
├── index.html                      # Ponto de entrada HTML e fontes
├── metadata.json                   # Metadados e permissões da aplicação
├── package.json                    # Dependências e scripts de execução
├── src/
│   ├── App.tsx                     # Orquestrador principal da aplicação e estados globais
│   ├── main.tsx                    # Inicialização do React DOM
│   ├── types.ts                    # Definições de tipos TypeScript (GitCommit, ViewMode, Themes)
│   ├── index.css                   # Estilos globais e importação do Tailwind CSS
│   ├── components/
│   │   ├── CommitInspector.tsx     # Painel lateral com detalhes aprofundados do commit
│   │   ├── CommitTimelineCanvas.tsx# Canvas 2D da árvore, câmera dinâmica e HUD
│   │   ├── ControlBar.tsx          # Barra de reprodução, scrubber, velocidade e modos
│   │   ├── ExportModal.tsx         # Modal de exportação para PNG, GIF e WebM
│   │   ├── Footer.tsx              # Rodapé com atalhos e informações do projeto
│   │   ├── InfoModal.tsx           # Modal com guia de navegação e conceitos
│   │   └── Navbar.tsx              # Barra superior com busca de repositório e seleção de temas
│   ├── services/
│   │   └── github.ts               # Integração com GitHub REST API e dados sintéticos
│   └── utils/
│       ├── exportEngine.ts         # Motor de renderização estática para exportações
│       ├── gifExport.ts            # Codificação de frames em GIF animado
│       ├── gitLayout.ts            # Cálculo determinístico de raias (lanes) e nós da árvore
│       └── themes.ts               # Paletas de cores e definições visuais dos temas
```

---

## Licença

Distribuído sob licença MIT. Sinta-se livre para utilizar, modificar e expandir conforme suas necessidades.
