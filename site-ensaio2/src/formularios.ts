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
  contato: '16c3777a-7c4b-4aa8-a568-00f529732da1',     // "Contato do site"
  newsletter: 'c6673ac9-792b-40fe-99d5-a4f31acf355b',  // "Newsletter para educadores"
  lancamento: '1282f843-35e3-4025-aded-d0b6155696de',  // "Aviso de lançamento" (TESTEENSAIO)
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
