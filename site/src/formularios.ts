/**
 * Os formulários do site no Wix Forms do cliente.
 *
 * Criados em 21/10/2026 por scripts/seed-formularios.mjs a partir de
 * scripts/formularios.plan.json (resultado em scripts/formularios.result.json).
 * Os campos, rótulos, obrigatoriedade e a mensagem de agradecimento são do
 * painel do Wix: o dono edita lá e o site segue, sem mudar código —
 *   https://manage.wix.com/dashboard/947bef68-f229-4456-956e-087f824170fd/wix-forms
 *
 * O esquema é lido na build (as páginas são pré-geradas) e embutido na página;
 * uma mudança no painel aparece no site na próxima build. O envio é sempre ao
 * vivo, direto para o Wix.
 */
import { getForm } from './wix/forms/forms';
import type { FormDto } from './wix/forms/types';

export const FORMULARIOS = {
  contato: '1f19dd0c-6296-4364-b81d-69de2613a216',     // "Contato do site"
  newsletter: '0e4ddaf6-5a10-4449-b5d2-f493c8b89228',  // "Newsletter para educadores"
  lancamento: 'ec01e466-400a-4a82-8e3d-e2bcf5763d36',  // "Aviso de lançamento" (28/10/2026, scripts/formulario-lancamento.plan.json)
} as const;

export type ChaveFormulario = keyof typeof FORMULARIOS;

/** O esquema na build. Sem Wix (build offline), null: a página busca no navegador. */
export async function esquemaNaBuild(chave: ChaveFormulario): Promise<FormDto | null> {
  try {
    return await getForm(FORMULARIOS[chave]);
  } catch (e) {
    console.warn('[formularios] ' + chave + ': esquema não lido na build (' + (e instanceof Error ? e.message : e) + ') — a página vai buscar no navegador');
    return null;
  }
}
