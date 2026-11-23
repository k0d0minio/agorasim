# Findings jam-473

Este pipeline não escreve no Linear. O operador regista o comentário e os tickets abaixo.

## 1. Comentário para JAM-473 (rascunho, em inglês)

> Spike result: `.icm/docs/go-live-legal.md` (PR #273).
>
> 1. RNAAT is a condition to sell tours, not only a line on the site (DL 108/2009 art. 5.º n.º 1).
>    The site must show the number in all external activity, online too (art. 8.º n.º 2). The
>    policies (personal accident, civil liability, art. 27.º) come before the inscription. Thus
>    paid bookings wait for the RNAAT number. "Registo em curso" does not obey the law.
> 2. Each paid booking and each wedding instalment needs a fatura on the date of the payment
>    (CIVA art. 29.º n.º 1 b), art. 36.º n.º 1 c)). A refund needs a credit note. Stripe
>    receipts are not faturas.
> 3. Fatura decision until the accountant answers: by hand, in the client's own tool. An
>    automatic integration with a certified program is a new request outside the deal, size M
>    (4 to 6 days).
> 4. Open: RNAAT, the two policies, the Livro de Reclamações registration, the VAT regime and
>    rate, who sells the add-ons, the invoicing tool, the retention period. The questions go
>    to Diogo in one batch (section 3 of the run findings).
> 5. Proposed follow-up tickets: F1 to F8 in the run findings.

## 2. Tickets propostos (não criados)

| # | Title | Size | Depends on | In the deal? |
|---|---|---|---|---|
| F1 | agorasim · The terms and the privacy page show the RNAAT number and the insurers | S (0.5 d) | client answers Q1, Q2 | yes: legal content of feature 1 |
| F2 | agorasim · The terms say the VAT regime and how the guest gets the fatura | S (0.5 d) | accountant answers A1, A3 | yes |
| F3 | agorasim · The guest can give a NIF for the fatura at booking and on a quote | S (1 d): optional field, `pt-PT` and `en`, stored on the booking and the quote, shown in the admin console, in the Art. 15 export and the retention rules | the decision "by hand" or F7 | grey: Jamie decides |
| F4 | agorasim · The admin console lists the payments and refunds to invoice | S (1 to 1.5 d): a list by day of paid bookings, instalments and refunds with the fatura fields, and a mark "fatura emitida" with its number | fatura decision "by hand" | no: a new request (small) |
| F5 | agorasim · Booking rows of a real sale are kept for the tax period, then anonymised | S to M (1 to 2 d): `retention.ts`, the policy text, `data-protection.md` item 2 | accountant answers A5, lawyer | yes: privacy of feature 3 |
| F6 | agorasim · The driver sees the service document of each departure on the phone | S (1 d): business, RNAAT number, tour, date, time, departure and arrival place (DL 108/2009 art. 26.º n.º 4) | Q1; confirm that a document on a phone is enough | no: a new request (small) |
| F7 | agorasim · Each payment makes a certified fatura, and each refund a credit note | M (4 to 6 d), see the page | accountant asks for it, or the volume | no: a new request (G §8) |
| F8 | agorasim · The terms and the privacy page lose the draft banner | S (0.5 d): remove `draftNotice` and every `TODO(legal)` after the sign-off | the lawyer's sign-off | yes |

Also for a lawyer: the "sinal" wording and an events rule for a cancellation by Agorasim
(`terms.ts`, B8). It is part of F8 or its own ticket after the answer.

## 3. Perguntas para o Diogo e a Rita (um envio, pela mão do Jamie)

1. A Agorasim Vintage está inscrita no RNAAT (Registo Nacional dos Agentes de Animação
   Turística)? Se sim, qual é o número? Se não, quando fazem a inscrição? Sem o número não
   podemos aceitar reservas pagas no site.
2. Qual é a seguradora e o número da apólice do seguro de acidentes pessoais e do seguro de
   responsabilidade civil? As apólices cobrem passeios com clientes nos carros clássicos?
3. A Agorasim já está registada na plataforma do Livro de Reclamações Eletrónico
   (livroreclamacoes.pt)?
4. Quem é o vosso contabilista certificado? Posso enviar-lhe diretamente as perguntas sobre
   faturas (pergunta 5)?
5. Para o contabilista:
   a. O Diogo está no regime de isenção de IVA (artigo 53.º do CIVA) ou no regime normal? Se
      está no regime normal, que taxa de IVA se aplica aos passeios e a cada complemento?
   b. Como emitem faturas hoje: no Portal das Finanças (faturas-recibo) ou num programa
      certificado? Qual?
   c. Cada reserva paga online precisa de uma fatura na data do pagamento, e cada reembolso de
      uma nota de crédito. Preferem emitir à mão, ou querem que o site as emita
      automaticamente num programa certificado (um pedido novo, fora do acordo)?
   d. Durante quantos anos temos de guardar os dados de uma reserva paga (nome, valores,
      datas)? Podemos apagar o email e o telefone do cliente mais cedo?
   e. O regime da margem das agências de viagens (DL 221/85) aplica-se aos complementos que
      revendem?
6. Os complementos (Tasco Galapito, Manzwine, Ramilo Wines, Olaria MZ): quem cobra o cliente?
   A Agorasim, em nome próprio (e o parceiro fatura à Agorasim), ou o parceiro diretamente?
7. Os carros (2CV, 4L, VW T3) são propriedade do Diogo, ou estão em leasing ou renting?
   Quantos lugares tem cada um, com o condutor incluído?
8. Algum passeio sai da estrada para um caminho ou um terreno dentro do Parque Natural
   Sintra-Cascais?
9. No dia do lançamento a Agorasim continua como trabalhador independente (NIF do Diogo), ou
   passa a uma empresa?
10. Têm um advogado para rever os termos de venda e a política de privacidade? Se não, querem
    que o Jamie proponha um?

## 4. Outros achados

- **Conflito com o runbook.** `launch-runbook.md` §4b diz que o site pode lançar com
  "RNAAT: registo em curso". DL 108/2009 art. 5.º n.º 1 e art. 8.º n.º 2 dizem o contrário
  para reservas pagas. Corrigir §4b num ticket `knowledge` (este lane muda só uma página).
- **Comissão sem fatura.** O Commission & Payments Agreement §3 e §6 diz "There is no invoice"
  para a comissão. A comissão é um serviço da Platform à Agorasim. O contabilista da
  Agorasim pode pedir um documento para a registar como custo. O contabilista do Jamie diz
  se a Platform tem de faturar a comissão. Fora deste ticket.
- **Trabalhador independente ou empresa.** `launch-runbook.md` §0 e §4a dizem "the company" como titular do
  domínio. `privacy.ts` e o pedido de informação dizem trabalhador independente. A pergunta 9
  decide.
- **Credencial em texto simples.** `agorasim-info.pdf` (fora do repo, nos documentos do
  negócio) tem uma palavra-passe em texto simples. O mesmo ficheiro tem o IBAN. Esta sessão
  não copiou nenhum dos dois. O Jamie deve rodar a palavra-passe e guardar o ficheiro num
  lugar protegido.
- **Caminho errado no ticket.** O ticket aponta para
  `~/Documents/Archive/deal-documents/agorasim/...`. O caminho real é
  `~/Documents/to organise/Archive/deal-documents/agorasim/...`.
- **Hook do router.** O hook `route-request` imprimiu "Route: start JAM-293" para um pedido
  sobre JAM-473. Falha do blueprint: dizer ao operador.
- **Limite de branches Neon.** O projeto `uat-agorasim` tem 10 branches (main, 8 previews
  e `local-test/2026-11-19`). Com onze sessões em paralelo, os previews novos falham no
  Vercel antes do build (PR #272 e #273). `local-test/2026-11-19` parece um resto de um teste
  local.
