/**
 * Anexos dos registros (boletim e produção científica). SÓ NO SERVIDOR.
 *
 * Fluxo, pela doc oficial da Media Manager (dev.wix.com/docs/api-reference/assets/media/media-manager/files):
 *   1. o responsável pede um endereço de envio (/api/clube/anexo): o servidor
 *      confere quem é, de quem é a criança e o tipo do arquivo, e gera um
 *      endereço com `private: true` — o arquivo nasce PRIVADO, e o endereço
 *      normal dele responde 403 ("Private Files");
 *   2. o navegador sobe o arquivo direto para esse endereço (PUT);
 *   3. o registro leva só o id do arquivo, e o servidor confere de novo
 *      (privado, nome começando pelo id da criança, ou seja: subido por um
 *      responsável dela, porque só ele consegue o endereço com esse nome);
 *   4. a equipe vê por um link temporário (Generate File Download URL, 10 min);
 *   5. o boletim é apagado de vez assim que a equipe decide; qualquer anexo de
 *      registro recusado também.
 */
import { auth } from '@wix/essentials';
import { files } from '@wix/media';
import { ANEXOS, problemaNoArquivo, type TipoAnexo } from './regras';

const gerarEnvio = auth.elevate(files.generateFileUploadUrl);
const descritor = auth.elevate(files.getFileDescriptor);
const gerarDownload = auth.elevate(files.generateFileDownloadUrl);
const apagar = auth.elevate(files.bulkDeleteFiles);

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Endereço para subir UM arquivo privado. Quem chama já conferiu o responsável e a criança. */
export async function enderecoDeEnvio(researcherId: string, tipo: TipoAnexo, mime: string, tamanho: number): Promise<{ uploadUrl: string } | { erro: string }> {
  const problema = problemaNoArquivo(tipo, mime, tamanho);
  if (problema) return { erro: problema };
  const aleatorio = crypto.randomUUID().slice(0, 8);
  // o nome amarra o arquivo à criança: o registro só aceita arquivo com este começo
  const nome = researcherId + '_' + tipo + '_' + aleatorio + '.' + EXT[mime];
  const r = await gerarEnvio(mime, { fileName: nome, private: true, sizeInBytes: String(tamanho), labels: ['clube-envio'] });
  return { uploadUrl: String(r.uploadUrl) };
}

/** O arquivo existe, é privado, é desta criança e do tipo certo? */
export async function arquivoValido(fileId: string, researcherId: string, tipo: TipoAnexo): Promise<boolean> {
  try {
    const d: any = await descritor(fileId);
    const nome = String(d?.displayName ?? '');
    return d?.private === true && nome.startsWith(researcherId + '_' + tipo + '_') && d?.state !== 'FAILED' && d?.state !== 'DELETED';
  } catch {
    return false;
  }
}

/** Link temporário para a equipe ver o anexo. */
export async function linkTemporario(fileId: string): Promise<string> {
  const r: any = await gerarDownload(fileId, { expirationInMinutes: 10, contentDisposition: 'INLINE' as any });
  return String(r?.downloadUrls?.[0]?.url ?? '');
}

/** Apaga de vez (não vai para a lixeira da mídia). Falha aqui não desfaz a decisão da equipe. */
export async function apagarDeVez(fileIds: string[]): Promise<void> {
  const ids = fileIds.filter(Boolean);
  if (!ids.length) return;
  try {
    await apagar(ids, { permanent: true });
  } catch (e) {
    console.error('[clube] não consegui apagar anexo', ids, e);
  }
}

export { ANEXOS };
