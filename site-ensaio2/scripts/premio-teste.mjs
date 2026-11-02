// SÓ NO ENSAIO: um prêmio barato para testar o resgate.
import { wix, siteId } from './wix-api.mjs';
if (siteId !== 'ab0dbd03-d423-4778-bf4c-1e234abdcf59') throw new Error('não é o TESTEENSAIO');
const r = await wix('POST', '/wix-data/v2/items', { dataCollectionId: 'Rewards', dataItem: { data: { title: 'Prêmio de teste (ensaio)', description: 'Só para testar o resgate.', pointsPrice: 5, active: true } } });
console.log('criado', r.dataItem?.id);
