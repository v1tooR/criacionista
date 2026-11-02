/**
 * Desenha e envia os formulários do Wix Forms no visual do site.
 *
 * Quem valida, aplica as regras do dono ("mostrar quando…") e envia é a
 * máquina de estado do kit (src/wix/forms/form-store.ts) — não mexer nela.
 * Aqui só fica a apresentação, com as classes que o protótipo já usa
 * (.field, .sel, .radios, .check, .nl__msg, .nl__ok).
 *
 * Regra do kit, seguida à risca: nenhum campo é chamado pelo nome. Tudo sai
 * de `form.fields`, então se o dono renomear, reordenar, acrescentar ou tirar
 * um campo no painel do Wix, o site acompanha.
 *
 * Marcação esperada (o portador, scripts/port-astro.js, monta):
 *   <form data-form-wix="contato" novalidate>
 *     <script type="application/json" data-esquema>…FormDto…</script>
 *     <h3>…</h3> <p class="nl__sub">…</p>
 *     <div data-campos></div>
 *     <p class="nl__msg" role="status">…</p>  …notas…
 *   </form>
 */
import { createFormStore, FORM_ERROR, type FormState, type FormStore } from './wix/forms/form-store';
import type { FormDto, FormFieldDto, SubmitOutcome } from './wix/forms/types';
import { FORMULARIOS, type ChaveFormulario } from './formularios';
import { caminho } from './config';

/* ---------- mensagens do kit (inglês, as mesmas do Wix) → português ---------- */
const PT: Record<string, string> = {
  'Enter a first name.': 'Informe seu nome.',
  'Enter a last name.': 'Informe seu sobrenome.',
  'Enter a company name.': 'Informe o nome da instituição.',
  'Enter an email address like example@mysite.com.': 'Informe um e-mail válido, como voce@exemplo.com.',
  'Enter a phone number.': 'Informe um telefone.',
  'Enter a valid phone number.': 'Informe um telefone válido.',
  'Enter a web URL like https://www.example.com.': 'Informe um endereço como https://www.exemplo.com.',
  'Enter a number.': 'Informe um número.',
  'Choose a date.': 'Escolha uma data.',
  'Enter a time.': 'Informe um horário.',
  'Choose an option.': 'Escolha uma opção.',
  'Check the box to continue.': 'Marque esta caixa para continuar.',
  'Enter an answer.': 'Preencha este campo.',
  'Enter a valid answer.': 'Confira o que você digitou.',
  'The chosen value is not allowed.': 'Escolha uma das opções da lista.',
  'The spam check did not pass. Please try again.': 'A verificação contra spam não passou. Tente de novo.',
  'This form no longer exists.': 'Este formulário não está mais disponível.',
  'This form is no longer accepting submissions.': 'Este formulário não está recebendo respostas no momento.',
  'The form could not be loaded. Please try again.': 'Não foi possível carregar o formulário. Recarregue a página.',
  'Could not load the form.': 'Não foi possível carregar o formulário. Recarregue a página.',
  'Could not send the form. Please try again.': 'Não foi possível enviar agora. Tente de novo em instantes.',
};

export function traduz(msg?: string): string {
  if (!msg) return '';
  if (PT[msg]) return PT[msg];
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/^Enter at least (\d+) characters?\.$/))) return 'Escreva pelo menos ' + m[1] + ' caracteres.';
  if ((m = msg.match(/^Enter less than (\d+) characters?\.$/))) return 'Escreva menos de ' + m[1] + ' caracteres.';
  if ((m = msg.match(/^Enter between (\d+) and (\d+) characters\.$/))) return 'Escreva entre ' + m[1] + ' e ' + m[2] + ' caracteres.';
  if ((m = msg.match(/^Enter exactly (\d+) characters?\.$/))) return 'Escreva exatamente ' + m[1] + ' caracteres.';
  // texto que o dono escreveu no painel (já em português) ou mensagem nova do kit
  return msg;
}

/**
 * Erro do formulário inteiro. Além das mensagens conhecidas, pode chegar o
 * texto técnico de uma falha de rede ("Failed to fetch", um status HTTP…).
 * Texto em português (o do dono, no painel) passa; o técnico vira uma frase
 * para o visitante, e o original fica no console para quem for investigar.
 */
export function traduzGeral(msg?: string): string {
  if (!msg) return '';
  const t = traduz(msg);
  if (t !== msg || /[áàâãéêíóôõúç]/i.test(msg)) return t;
  console.warn('[formulario] erro do envio:', msg);
  return PT['Could not send the form. Please try again.'];
}

/* ---------- utilidades de DOM ---------- */
type Attrs = Record<string, string | boolean | undefined>;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...filhos: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') e.className = String(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos) e.append(f);
  return e;
}

const AUTOCOMPLETE: Record<string, string> = {
  CONTACTS_FIRST_NAME: 'name', CONTACTS_LAST_NAME: 'family-name', CONTACTS_EMAIL: 'email',
  CONTACTS_PHONE: 'tel', CONTACTS_COMPANY: 'organization',
};
const TIPO_INPUT: Record<string, string> = {
  text: 'text', email: 'email', phone: 'tel', url: 'url', password: 'password',
  number: 'number', rating: 'number', date: 'date', time: 'time', datetime: 'datetime-local',
};
const OK_SVG = '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="m8 12.4 2.8 2.8L16 9.8"/></svg>';

/** Um campo desenhado: o bloco inteiro, onde marcar erro e onde escrever a mensagem. */
interface No { chave: string; bloco: HTMLElement; marca: HTMLElement[]; erro: HTMLElement; }

/** Muda quando o campo precisa ser redesenhado (uma regra trocou as opções ou a obrigatoriedade). */
const assinatura = (f: FormFieldDto) =>
  [f.target, f.control, f.required, f.label, f.choices.map((c) => c.value).join('\u0001')].join('|');

function rotulo(form: FormDto, f: FormFieldDto): (Node | string)[] {
  const ind = form.requiredIndicator;
  if (!f.required || ind === 'NONE') return [f.label];
  const marca = el('span', { class: 'req' }, ind === 'TEXT' ? '(obrigatório)' : '*');
  return form.requiredIndicatorBefore ? [marca, ' ', f.label] : [f.label, ' ', marca];
}

function desenhar(form: FormDto, f: FormFieldDto, valor: unknown, prefixo: string): No {
  const id = prefixo + '-' + f.target;
  const erroId = 'err-' + f.target;
  const erro = el('p', { class: 'err', id: erroId, hidden: true });
  const ajuda = f.description ? el('p', { class: 'field__help' }, f.description) : null;
  const comum = (c: HTMLElement) => {
    c.setAttribute('name', f.target);
    c.setAttribute('aria-describedby', erroId);
    if (f.readOnly) c.setAttribute('disabled', '');
    if (!f.showLabel) c.setAttribute('aria-label', f.label);
    return c;
  };

  // caixa única (autorização, inscrição na newsletter): o rótulo é o texto ao lado
  if (f.control === 'checkbox') {
    const caixa = comum(el('input', { type: 'checkbox', id, checked: valor === true })) as HTMLInputElement;
    caixa.checked = valor === true; // CONTACTS_SUBSCRIBE nunca vem marcado: o valor inicial do kit é false
    const bloco = el('label', { class: 'check', for: id }, caixa, ' ',
      el('span', {}, f.label, ' ', el('a', { href: caminho('politica-de-privacidade') }, 'Política de privacidade')));
    const envolve = el('div', { class: 'field field--check' }, bloco, erro);
    return { chave: assinatura(f), bloco: envolve, marca: [bloco], erro };
  }

  // grupo de opções exclusivas
  if (f.control === 'radio' || f.control === 'checkboxGroup' || f.control === 'tags') {
    const multi = f.control !== 'radio';
    const lista = Array.isArray(valor) ? valor.map(String) : [String(valor ?? '')];
    const opcoes = f.choices.map((c, i) => {
      const inp = comum(el('input', { type: multi ? 'checkbox' : 'radio', id: id + '-' + i, value: c.value })) as HTMLInputElement;
      inp.checked = lista.includes(c.value);
      return el('label', { class: 'radio', for: id + '-' + i }, inp, el('span', {}, c.label));
    });
    const grupo = el('fieldset', { class: 'field', 'aria-describedby': erroId },
      el('legend', {}, ...rotulo(form, f)), el('div', { class: 'radios' }, ...opcoes), ...(ajuda ? [ajuda] : []), erro);
    return { chave: assinatura(f), bloco: grupo, marca: [grupo], erro };
  }

  let controle: HTMLElement;
  if (f.control === 'textarea') {
    controle = comum(el('textarea', { id, rows: '5', placeholder: f.placeholder, autocomplete: AUTOCOMPLETE[f.identifier] }));
    (controle as HTMLTextAreaElement).value = String(valor ?? '');
  } else if (f.control === 'select') {
    const s = comum(el('select', { id })) as HTMLSelectElement;
    s.append(el('option', { value: '', disabled: true }, f.placeholder || 'Selecione uma opção'));
    for (const c of f.choices) s.append(el('option', { value: c.value }, c.label));
    s.value = String(valor ?? '');
    if (!s.value) s.selectedIndex = 0;
    controle = s;
  } else if (TIPO_INPUT[f.control]) {
    const v = f.validation;
    controle = comum(el('input', {
      type: TIPO_INPUT[f.control], id, placeholder: f.placeholder, autocomplete: AUTOCOMPLETE[f.identifier],
      min: v.minimum != null ? String(v.minimum) : v.minDate, max: v.maximum != null ? String(v.maximum) : v.maxDate,
      step: v.multipleOf != null ? String(v.multipleOf) : undefined,
    }));
    (controle as HTMLInputElement).value = String(valor ?? '');
  } else {
    // arquivo, endereço, pagamento, agendamento: fora do que estes formulários usam hoje
    const nota = el('p', { class: 'nl__note' }, 'Este campo ainda não pode ser preenchido pelo site. Fale com a gente pela página de contato.');
    const bloco = el('div', { class: 'field' }, el('label', {}, ...rotulo(form, f)), nota, erro);
    return { chave: assinatura(f), bloco, marca: [], erro };
  }
  const corpo = f.control === 'select' ? el('div', { class: 'sel' }, controle) : controle;
  const bloco = el('div', { class: 'field' }, el('label', { for: id }, ...rotulo(form, f)), corpo, ...(ajuda ? [ajuda] : []), erro);
  return { chave: assinatura(f), bloco, marca: [controle], erro };
}

/** Valor de um controle para o kit: booleano na caixa única, lista no grupo, texto no resto. */
function lerValor(formEl: HTMLFormElement, f: FormFieldDto, alvo: HTMLInputElement): unknown {
  if (f.control === 'checkbox') return alvo.checked;
  if (f.control === 'checkboxGroup' || f.control === 'tags') {
    return [...formEl.querySelectorAll<HTMLInputElement>('input[name="' + CSS.escape(f.target) + '"]:checked')].map((i) => i.value);
  }
  return alvo.value;
}

/* ---------- montagem ---------- */
export function montar(formEl: HTMLFormElement): FormStore | null {
  const chave = formEl.dataset.formWix as ChaveFormulario;
  const formId = FORMULARIOS[chave];
  const campos = formEl.querySelector<HTMLElement>('[data-campos]');
  const status = formEl.querySelector<HTMLElement>('.nl__msg');
  if (!formId || !campos || !status) {
    console.error('[formulario] marcação incompleta em', formEl);
    return null;
  }
  let inicial: FormDto | undefined;
  try {
    const bruto = formEl.querySelector('script[data-esquema]')?.textContent;
    if (bruto && bruto !== 'null') inicial = JSON.parse(bruto) as FormDto;
  } catch { /* esquema corrompido: o kit busca de novo */ }

  const store = createFormStore({ formId, initialForm: inicial });
  const nos = new Map<string, No>();
  const acoes = el('div', { class: 'form__acoes' });
  campos.after(acoes);
  let tentou = false;
  let ok: HTMLElement | null = null;
  const prefixo = 'f' + chave;

  const campoPorNome = (nome: string) => store.getState().form?.fields.find((f) => f.target === nome);

  formEl.addEventListener('input', (e) => {
    const alvo = e.target as HTMLInputElement;
    const f = alvo?.name ? campoPorNome(alvo.name) : undefined;
    if (!f || f.control === 'radio' || f.control === 'checkbox' || f.control === 'checkboxGroup' || f.control === 'tags' || f.control === 'select') return;
    store.setValue(f.target, lerValor(formEl, f, alvo));
  });
  formEl.addEventListener('change', (e) => {
    const alvo = e.target as HTMLInputElement;
    const f = alvo?.name ? campoPorNome(alvo.name) : undefined;
    if (!f) return;
    store.setValue(f.target, lerValor(formEl, f, alvo));
    // escolha feita (opção, caixa): confere na hora, como o desfoque faz no texto
    if (['radio', 'checkbox', 'checkboxGroup', 'tags', 'select'].includes(f.control)) store.validate(f.target);
  });
  formEl.addEventListener('focusout', (e) => {
    const alvo = e.target as HTMLInputElement;
    const f = alvo?.name ? campoPorNome(alvo.name) : undefined;
    if (f && (TIPO_INPUT[f.control] || f.control === 'textarea')) store.validate(f.target);
  });
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    tentou = true;
    const s = store.getState();
    const ultimo = !s.form || s.step >= s.form.steps.length - 1;
    if (!ultimo) { store.next(e); return; }
    const r = await store.submit(e);
    if (!r && Object.keys(store.getState().errors).some((k) => k !== FORM_ERROR)) {
      status.className = 'nl__msg bad';
      status.textContent = 'Falta pouco: confira os campos marcados.';
    }
  });

  const mostrarOk = (out: SubmitOutcome) => {
    if (out.url) {
      if (out.newTab) window.open(out.url, '_blank', 'noopener');
      else window.location.assign(out.url);
      if (!out.newTab) return;
    }
    const texto = out.message || formEl.dataset.okPadrao || 'Recebemos o seu envio. Obrigado!';
    ok = el('div', { class: 'nl__ok', role: 'status', tabindex: '-1' });
    ok.innerHTML = OK_SVG;
    for (const par of texto.split(/\n+/).map((t) => t.trim()).filter(Boolean)) ok.append(el('p', { class: 'nl__sub' }, par));
    // esconde o formulário e guarda o que já estava escondido, para o caso de
    // o dono ter configurado o agradecimento para sumir depois de N segundos
    for (const filho of [...formEl.children] as HTMLElement[]) {
      if (filho.tagName === 'SCRIPT') continue;
      filho.dataset.antesDoOk = filho.hidden ? '1' : '0';
      filho.hidden = true;
    }
    formEl.append(ok);
    ok.focus({ preventScroll: false });
  };
  const tirarOk = () => {
    if (!ok) return;
    ok.remove(); ok = null;
    for (const filho of [...formEl.children] as HTMLElement[]) {
      if (filho.dataset.antesDoOk !== undefined) { filho.hidden = filho.dataset.antesDoOk === '1'; delete filho.dataset.antesDoOk; }
    }
  };

  const sincronizar = (s: FormState) => {
    if (s.outcome) { if (!ok) mostrarOk(s.outcome); return; }
    tirarOk();

    const erroGeral = traduzGeral(s.errors[FORM_ERROR]);
    if (!s.form) {
      campos.textContent = '';
      if (erroGeral) { status.className = 'nl__msg bad'; status.textContent = erroGeral; }
      else { status.className = 'nl__msg'; status.textContent = s.loading ? 'Carregando o formulário…' : ''; }
      acoes.hidden = true;
      return;
    }
    if (s.closed) {
      campos.replaceChildren(el('p', { class: 'nl__sub' }, traduz(s.form.disabledMessage) || 'Este formulário não está recebendo respostas no momento.'));
      nos.clear();
      acoes.hidden = true;
      return;
    }

    // campos do passo atual, na ordem do painel; só refaz o que mudou (não perde o foco)
    const passo = s.form.steps[s.step] ?? s.form.steps[0];
    const visiveis = s.form.fields.filter((f) => !passo || f.stepId === passo.id);
    const quero = new Set(visiveis.map((f) => f.target));
    for (const [alvo, no] of nos) if (!quero.has(alvo)) { no.bloco.remove(); nos.delete(alvo); }
    visiveis.forEach((f, i) => {
      let no = nos.get(f.target);
      if (no && no.chave !== assinatura(f)) { const novo = desenhar(s.form!, f, s.values[f.target], prefixo); no.bloco.replaceWith(novo.bloco); no = novo; nos.set(f.target, no); }
      if (!no) { no = desenhar(s.form!, f, s.values[f.target], prefixo); nos.set(f.target, no); }
      const atual = campos.children[i];
      if (atual !== no.bloco) campos.insertBefore(no.bloco, atual ?? null);
    });

    for (const [alvo, no] of nos) {
      const msg = traduz(s.errors[alvo]);
      no.erro.textContent = msg;
      no.erro.hidden = !msg;
      no.marca.forEach((m) => m.classList.toggle('is-error', !!msg));
      no.bloco.querySelectorAll('input,select,textarea').forEach((c) => c.setAttribute('aria-invalid', String(!!msg)));
    }

    const temErroDeCampo = Object.keys(s.errors).some((k) => k !== FORM_ERROR && s.errors[k]);
    if (erroGeral) { status.className = 'nl__msg bad'; status.textContent = erroGeral; }
    else if (!(tentou && temErroDeCampo)) { status.className = 'nl__msg'; status.textContent = s.loading ? 'Enviando…' : ''; }

    // botões: voltar (a partir do 2º passo), continuar ou enviar. Atualizados
    // no lugar — recriá-los a cada sincronização engoliria o clique (o desfoque
    // do último campo valida, sincroniza e trocaria o botão sob o mouse).
    const ultimo = s.step >= s.form.steps.length - 1;
    acoes.hidden = false;
    voltar.hidden = s.step === 0;
    voltar.textContent = s.form.previousText || 'Voltar';
    enviar.disabled = s.loading;
    enviarTexto.textContent = (ultimo ? s.form.submitText || 'Enviar' : s.form.nextText || 'Continuar') + ' ';
  };

  const voltar = el('button', { class: 'btn btn--ghost', type: 'button', hidden: true });
  const enviarTexto = document.createTextNode('');
  const enviar = el('button', { class: 'btn btn--primary', type: 'submit' }, enviarTexto, el('span', { class: 'btn__arrow' }, '→'));
  acoes.append(voltar, enviar);
  voltar.addEventListener('click', () => store.previous());

  store.subscribe(() => sincronizar(store.getState()));
  sincronizar(store.getState());
  store.start();
  return store;
}

/** Monta todo formulário marcado da página. */
export function montarTodos(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-form-wix]').forEach((f) => montar(f));
}
