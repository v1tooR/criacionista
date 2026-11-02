/**
 * Cliente do Wix.
 *
 * O site do cliente (clubecriacionista.com) é usado só como **fonte de dados**:
 * lemos o blog dele por API, de outro endereço, sem publicar nada lá. Quem
 * autoriza essa leitura é o Client ID criado em
 * Configurações › Desenvolvimento e integrações › Headless Settings.
 *
 * O Client ID não é segredo — a documentação do Wix diz que ele pode aparecer
 * em código de frontend. Mesmo assim fica em .env, para não precisar editar
 * código quando trocar de site (prévia x produção).
 *
 * Sem Client ID configurado, `wix` é null e as páginas caem no conteúdo fixo.
 * Isso é de propósito: a build nunca pode quebrar por causa de credencial
 * ausente, senão ninguém consegue trabalhar no layout sem acesso ao Wix.
 */
import { createClient, OAuthStrategy } from '@wix/sdk';
import { posts, categories } from '@wix/blog';
import { members } from '@wix/members';

const CLIENT_ID = import.meta.env.WIX_CLIENT_ID || process.env.WIX_CLIENT_ID || '';

/** Dá para falar com o Wix nesta execução? */
export const temWix = Boolean(CLIENT_ID);

export const wix = temWix
  ? createClient({
      modules: { posts, categories, members },
      auth: OAuthStrategy({ clientId: CLIENT_ID }),
    })
  : null;
