// Confere no Wix (só leitura) os envios recebidos pelos formulários do site e
// a situação de inscrição na newsletter dos e-mails de teste.
//   de site/:  node scripts/confere-envios.mjs [email-de-teste …]
// Endpoints tirados da doc oficial (21/10/2026):
//   POST /form-submission-service/v4/submissions/namespace/query
//     dev.wix.com/docs/api-reference/crm/forms/form-submissions/query-submissions-by-namespace
//   POST /email-marketing/v1/email-subscriptions/query
//     dev.wix.com/docs/api-reference/crm/communication/email-subscriptions/query-email-subscriptions
import { readFileSync } from 'node:fs';
import { wixToken } from '../../.agents/skills/wix-headless-templates/shared/seed/wix-cli.mjs';

const siteId = JSON.parse(readFileSync('wix.config.json', 'utf8')).siteId;
const token = wixToken(siteId);
const emails = process.argv.slice(2).length ? process.argv.slice(2) : ['teste-formulario@exemplo.com', 'teste-newsletter@exemplo.com'];
const FORMS = {
  '16c3777a-7c4b-4aa8-a568-00f529732da1': 'Contato do site',
  'c6673ac9-792b-40fe-99d5-a4f31acf355b': 'Newsletter para educadores',
};

async function post(path, body) {
  const r = await fetch('https://www.wixapis.com' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'wix-site-id': siteId, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(path + ' → ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  return j;
}

for (const [formId, nome] of Object.entries(FORMS)) {
  const j = await post('/form-submission-service/v4/submissions/namespace/query', {
    query: { filter: { formId, namespace: 'wix.form_app.form' } },
  });
  const subs = j.submissions ?? [];
  console.log(nome + ': ' + subs.length + ' envio(s)');
  for (const s of subs) {
    const valores = Object.entries(s.submissions ?? {}).map(([k, v]) => k.replace(/_[a-z0-9]{6}$/, '') + '=' + JSON.stringify(v).slice(0, 60));
    console.log('  ' + s.createdDate + '  ' + s.status + '  contato:' + (s.contactId ? 'sim' : 'não') + '  ' + valores.join('  '));
  }
}

const inscr = await post('/email-marketing/v1/email-subscriptions/query', { filter: { email: { $in: emails } } });
console.log('\nInscrição em e-mail marketing:');
for (const e of emails) {
  const s = (inscr.subscriptions ?? []).find((x) => x.email === e);
  console.log('  ' + e + ': ' + (s ? s.subscriptionStatus + ' (entrega: ' + s.deliverabilityStatus + ')' : 'sem registro'));
}
