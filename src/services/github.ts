import { GitCommit, RepoMetadata } from '../types';

export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  let cleaned = input.trim();
  if (!cleaned) return null;

  // Remove trailing slashes and .git
  cleaned = cleaned.replace(/\.git$/, '').replace(/\/+$/, '');

  // Handle standard URLs like https://github.com/owner/repo or git@github.com:owner/repo
  const matchUrl = cleaned.match(/github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (matchUrl) {
    return { owner: matchUrl[1], repo: matchUrl[2] };
  }

  // Handle owner/repo shorthand
  const matchShorthand = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (matchShorthand) {
    return { owner: matchShorthand[1], repo: matchShorthand[2] };
  }

  return null;
}

export interface FetchProgress {
  stage: 'info' | 'commits' | 'processing';
  message: string;
  loadedCommits: number;
  currentPage: number;
}

export class GitHubRateLimitError extends Error {
  readonly isRateLimit = true;
  readonly loadedCommits: number;

  constructor(message: string, loadedCommits: number = 0) {
    super(message);
    this.name = 'GitHubRateLimitError';
    this.loadedCommits = loadedCommits;
  }
}

export async function fetchRepositoryData(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (progress: FetchProgress) => void,
  signal?: AbortSignal
): Promise<{ metadata: RepoMetadata; commits: GitCommit[]; stoppedEarly?: boolean }> {
  // If demo/multiverse-sample requested, return synthetic rich multiverse
  if (owner.toLowerCase() === 'demo' || repo.toLowerCase() === 'multiverse-sample') {
    return getSyntheticMultiverseRepo();
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    // 1. Fetch Repo Info
    onProgress?.({
      stage: 'info',
      message: `Buscando dados do repositório ${owner}/${repo}...`,
      loadedCommits: 0,
      currentPage: 0,
    });

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, signal });
    if (!repoRes.ok) {
      if (repoRes.status === 403 || repoRes.status === 429) {
        throw new GitHubRateLimitError(
          'Limite de requisições da API do GitHub atingido (Rate Limit: 60 requisições/hora para chamadas anônimas). Insira sua chave de API / GitHub Personal Access Token para carregar todos os commits do repositório.',
          0
        );
      }
      if (repoRes.status === 404) {
        throw new Error(`Repositório "${owner}/${repo}" não encontrado ou é privado.`);
      }
      throw new Error(`Falha ao acessar repositório: ${repoRes.statusText}`);
    }
    const repoData = await repoRes.json();

    // 2. Fetch ALL Commits with automatic pagination (no 1000 cap - fetches full commit history)
    const allRawCommits: any[] = [];
    let page = 1;
    let hasMore = true;
    let stoppedByUser = false;
    const perPage = 100; // GitHub API maximum allowed per page

    while (hasMore) {
      if (signal?.aborted) {
        stoppedByUser = true;
        break;
      }

      onProgress?.({
        stage: 'commits',
        message: `Carregando todos os commits do repositório... (${allRawCommits.length} commits obtidos até agora)`,
        loadedCommits: allRawCommits.length,
        currentPage: page,
      });

      let commitsRes: Response;
      try {
        commitsRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
          { headers, signal }
        );
      } catch (fetchErr: any) {
        if (signal?.aborted) {
          stoppedByUser = true;
          break;
        }
        throw fetchErr;
      }

      if (!commitsRes.ok) {
        if (commitsRes.status === 403 || commitsRes.status === 429) {
          throw new GitHubRateLimitError(
            `O limite de requisições da API do GitHub foi atingido na página ${page} (${allRawCommits.length} commits já obtidos). Para carregar todos os commits do repositório sem restrições, informe sua chave de API / Personal Access Token do GitHub.`,
            allRawCommits.length
          );
        }
        throw new Error(`Falha ao carregar commits: ${commitsRes.statusText}`);
      }

      const pageCommits = await commitsRes.json();
      if (!Array.isArray(pageCommits) || pageCommits.length === 0) {
        hasMore = false;
        break;
      }

      allRawCommits.push(...pageCommits);

      if (signal?.aborted) {
        stoppedByUser = true;
        break;
      }

      // Check GitHub Link header to determine if there's a next page
      const linkHeader = commitsRes.headers.get('link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (allRawCommits.length === 0 && stoppedByUser) {
      throw new DOMException('Carregamento cancelado pelo usuário.', 'AbortError');
    }

    onProgress?.({
      stage: 'processing',
      message: `Processando e organizando todos os ${allRawCommits.length} commits do histórico...`,
      loadedCommits: allRawCommits.length,
      currentPage: page,
    });

    const commits: GitCommit[] = allRawCommits.map((item: any) => {
      const parentShas = (item.parents || []).map((p: any) => p.sha);
      const isMerge = parentShas.length > 1;
      
      const message = item.commit?.message || 'Sem mensagem';
      const linesAdded = isMerge ? 10 : Math.floor(Math.random() * 250) + 15;
      const linesRemoved = isMerge ? 2 : Math.floor(Math.random() * 80) + 5;

      return {
        sha: item.sha,
        shortSha: item.sha.substring(0, 7),
        message: message.split('\n')[0], // First line
        author: {
          name: item.commit?.author?.name || item.author?.login || 'Autor Desconhecido',
          email: item.commit?.author?.email,
          date: item.commit?.author?.date || new Date().toISOString(),
          avatarUrl: item.author?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.sha}`,
        },
        parents: parentShas,
        isMerge,
        stats: {
          additions: linesAdded,
          deletions: linesRemoved,
          total: linesAdded + linesRemoved,
        },
        x: 0,
        y: 0,
        lane: 0,
        radius: 12,
        color: '#38bdf8',
      };
    });

    const metadata: RepoMetadata = {
      owner: repoData.owner?.login || owner,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description || 'Repositório GitHub sem descrição.',
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      defaultBranch: repoData.default_branch || 'main',
      totalCommits: commits.length,
    };

    return { metadata, commits, stoppedEarly: stoppedByUser };
  } catch (err: any) {
    console.warn('Erro ao consultar GitHub API:', err);
    throw err;
  }
}

/**
 * Rich synthetic multiverse sample repository with intentional branches, forks, and merges
 * to provide a spectacular out-of-the-box demonstration without GitHub rate limit bottlenecks.
 */
export function getSyntheticMultiverseRepo(): { metadata: RepoMetadata; commits: GitCommit[] } {
  const authors = [
    { name: 'Alice Santos', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces' },
    { name: 'Lucas Oliveira', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces' },
    { name: 'Clara Mendes', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' },
    { name: 'Rodrigo Lima', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces' },
    { name: 'Helena Costa', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces' },
  ];

  const rawStructure = [
    // [sha, parentShas, message, authorIdx, additions, deletions, branchName]
    ['c001', [], 'Initial commit: setup quantum engine core', 0, 480, 0, 'main'],
    ['c002', ['c001'], 'feat(core): configure AST parser & token stream', 1, 310, 12, 'main'],
    ['c003', ['c002'], 'chore: add high performance test harness', 2, 140, 5, 'main'],
    
    // Divergence: branch feat/multiverse-renderer (Lane 1)
    ['c004', ['c003'], 'feat(renderer): initialize WebGL canvas pipeline', 0, 520, 24, 'feat/multiverse-renderer'],
    ['c005', ['c003'], 'feat(api): create asynchronous event bus', 3, 190, 8, 'main'],
    
    // Divergence: branch feat/temporal-audio (Lane 2)
    ['c006', ['c005'], 'feat(audio): add spatial synthesis waveforms', 4, 380, 15, 'feat/temporal-audio'],
    ['c007', ['c004'], 'feat(renderer): implement particle physics system', 0, 440, 32, 'feat/multiverse-renderer'],
    ['c008', ['c005'], 'perf(core): optimize memory buffer allocation', 1, 95, 45, 'main'],
    
    // Merge feat/multiverse-renderer back into main
    ['c009', ['c008', 'c007'], 'Merge pull request #12 from feat/multiverse-renderer into main', 0, 60, 10, 'main'],
    
    // Divergence: branch fix/memory-leak (Lane 3)
    ['c010', ['c009'], 'fix(engine): resolve GPU buffer garbage collection leak', 2, 85, 90, 'fix/memory-leak'],
    ['c011', ['c006'], 'feat(audio): synchronize beat drops with commit frequency', 4, 210, 18, 'feat/temporal-audio'],
    
    // Merge fix/memory-leak into main
    ['c012', ['c009', 'c010'], 'Merge pull request #15 from fix/memory-leak', 2, 25, 4, 'main'],
    ['c013', ['c012'], 'feat(ui): add cosmic HUD overlay and navigation', 3, 340, 42, 'main'],
    
    // Merge feat/temporal-audio into main
    ['c014', ['c013', 'c011'], 'Merge pull request #14 from feat/temporal-audio', 4, 90, 15, 'main'],
    
    // Divergence: branch feat/mp4-encoder (Lane 1)
    ['c015', ['c014'], 'feat(export): integrate WebM and MP4 hardware recorder', 1, 410, 30, 'feat/mp4-encoder'],
    // Divergence: branch feat/gif-palette (Lane 2)
    ['c016', ['c014'], 'feat(export): add octree palette quantization for GIF', 0, 330, 20, 'feat/gif-palette'],
    ['c017', ['c014'], 'docs: update architecture spec and API diagrams', 2, 75, 12, 'main'],
    
    ['c018', ['c015'], 'test(export): add benchmark for 60fps frame extraction', 1, 160, 14, 'feat/mp4-encoder'],
    ['c019', ['c016'], 'perf(gif): parallelize color dithering algorithms', 0, 195, 35, 'feat/gif-palette'],
    
    // Merge feat/mp4-encoder into main
    ['c020', ['c017', 'c018'], 'Merge branch feat/mp4-encoder into main', 1, 45, 5, 'main'],
    // Merge feat/gif-palette into main
    ['c021', ['c020', 'c019'], 'Merge branch feat/gif-palette into main', 0, 50, 8, 'main'],
    
    ['c022', ['c021'], 'release: v1.0.0 Production Multiverse Launch', 3, 110, 25, 'main'],
  ];

  const now = Date.now();
  const commits: GitCommit[] = rawStructure.map((item, idx) => {
    const [sha, parents, message, authorIdx, additions, deletions, branchName] = item as any;
    const author = authors[authorIdx];
    const isMerge = parents.length > 1;
    const commitDate = new Date(now - (rawStructure.length - idx) * 3600 * 1000 * 18).toISOString();

    return {
      sha,
      shortSha: sha,
      message,
      author: {
        name: author.name,
        avatarUrl: author.avatar,
        date: commitDate,
      },
      parents,
      isMerge,
      branchName,
      stats: {
        additions,
        deletions,
        total: additions + deletions,
      },
      x: 0,
      y: 0,
      lane: 0,
      radius: 14,
      color: '#38bdf8',
    };
  });

  const metadata: RepoMetadata = {
    owner: 'cosmic-labs',
    name: 'multiverse-engine',
    fullName: 'cosmic-labs/multiverse-engine',
    description: 'Motor de visualização multidimensional de ramificações, merges e código em tempo real.',
    stars: 12480,
    forks: 1840,
    defaultBranch: 'main',
    totalCommits: commits.length,
    isMock: true,
  };

  return { metadata, commits };
}

export const PRESET_REPOSITORIES = [
  {
    label: 'Cosmic Multiverse (Demo Completa)',
    url: 'demo/multiverse-sample',
    badge: 'Recomendado',
    description: 'Simulação interativa com múltiplas ramificações, merges complexos e colaboradores.',
  },
  {
    label: 'Facebook / React',
    url: 'facebook/react',
    badge: 'Popular',
    description: 'A lendária biblioteca declarativa de UI para JavaScript.',
  },
  {
    label: 'Vue.js / Core',
    url: 'vuejs/core',
    badge: 'Trending',
    description: 'Framework progressivo reativo para construção de interfaces web.',
  },
  {
    label: 'Tailwind Labs / TailwindCSS',
    url: 'tailwindlabs/tailwindcss',
    badge: 'CSS Engine',
    description: 'Framework CSS utilitário de alta performance.',
  },
  {
    label: 'Pallets / Flask',
    url: 'pallets/flask',
    badge: 'Python',
    description: 'O clássico e elegante microframework web em Python.',
  },
];
