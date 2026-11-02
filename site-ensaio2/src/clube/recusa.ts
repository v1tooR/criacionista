/** Pedido recusado por regra (não é falha do servidor): vira a resposta HTTP com as mensagens por campo. */
export class Recusa extends Error {
  constructor(public status: number, public erros: Record<string, string>) { super(Object.values(erros)[0]); }
}
