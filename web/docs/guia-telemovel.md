# Agorasim — o painel no telemóvel

Guia para o Diogo e a Rita. Tudo o que está aqui existe no painel tal como está
escrito — os nomes dos ecrãs e dos botões são os que vão ver no telemóvel.

**Endereço do painel:** `https://agorasim.pt/admin` depois de o domínio mudar para o
site novo. Até esse dia, o mesmo painel está em
`https://agorasim.jamienisbet.com/admin`. Instalem a aplicação a partir do endereço
definitivo — uma aplicação instalada fica presa ao endereço de onde foi instalada; se
a instalarem antes da mudança, apaguem-na e voltem a instalar depois.

---

## 1. Instalar o painel como aplicação

O painel funciona no navegador, mas instalado fica com um ícone no ecrã principal,
abre a ecrã inteiro e comporta-se como qualquer outra aplicação. Não vem da App Store
nem da Play Store — instala-se a partir do navegador.

**iPhone / iPad (Safari)**

1. Abram o Safari (tem de ser o Safari) e entrem em `https://agorasim.pt/admin`.
2. Toquem no botão **Partilhar** (o quadrado com a seta para cima, em baixo).
3. Deslizem a lista e toquem em **Adicionar ao ecrã principal**.
4. Confirmem com **Adicionar**. O ícone «Agorasim» aparece no ecrã principal.

**Android (Chrome)**

1. Abram o Chrome e entrem em `https://agorasim.pt/admin`.
2. Toquem no menu **⋮** (os três pontos, em cima à direita).
3. Toquem em **Instalar aplicação** (em alguns telemóveis diz **Adicionar ao ecrã
   principal**).
4. Confirmem com **Instalar**.

No Android, depois de instalado, manter o ícone premido mostra atalhos diretos para
**Vendas**, **Calendário** e **Catálogo**. (O iPhone não tem estes atalhos — abre-se
a aplicação e usa-se o menu em baixo.)

## 2. A primeira entrada

O Jamie cria a conta de cada um — uma conta por pessoa, não uma partilhada — e
entrega uma palavra-passe temporária em mão ou por voz. Tudo o que fazem no painel
fica registado na vossa conta, por isso ela deve ser só vossa.

1. Abram a aplicação instalada. Aparece o ecrã **Entrar**.
2. Preencham **Email** e **Palavra-passe** (a temporária) e toquem em **Entrar**.
3. Mudem logo a palavra-passe: no menu em baixo toquem em **Mais** e, em
   **Definições**, em **A minha conta** (ou abram diretamente
   `/admin/settings/account`).
4. No cartão **Mudar a palavra-passe** preencham **Palavra-passe atual**, **Nova
   palavra-passe** e **Repetir a nova palavra-passe**, e toquem em **Mudar
   palavra-passe**.
5. Mudar a palavra-passe termina a sessão em todos os dispositivos, incluindo este —
   voltam ao ecrã **Entrar** e entram com a nova. Guardem-na no gestor de
   palavras-passe do telemóvel.

A sessão dura 7 dias; depois disso o painel pede para entrar outra vez. Para sair à
mão, o botão **Sair** está no fundo do menu **Mais**. Se um telemóvel se perder, em
**A minha conta** há **Sair de todos os dispositivos** — termina todas as sessões de
uma vez.

## 3. O menu

Em baixo há cinco botões: **Início**, **Vendas**, **Agenda** (o Calendário),
**Ideias** e **Mais**. **Mais** abre a lista de todas as áreas, por grupos:

- **Vendas** — Vendas · Calendário · Experiências (o catálogo)
- **Marketing** — Blog · Redes sociais
- **Sistema** — Mensagens automáticas · Sugestões
- **Definições** — A minha conta · Equipa · Registo de atividade

As áreas com um ponto ao lado ainda estão em desenvolvimento: mostram um exemplo do
que vão ser e não têm dados reais.

## 4. A rotina do dia

### Vendas — o que entrou e o que está para hoje

`/admin/sales`. Cada pedido que alguém envia pelo site é um cartão num quadro com
quatro colunas: **Novo → Contactado → Orçamentado → Reservado** (e **Arquivado**, para
o que já não vai a lado nenhum). Cada cartão mostra o nome, a experiência, o número
de pessoas, a data pedida e — quando houve pagamento — a referência **BK-…** e o valor.

- **Pedidos novos** estão na coluna **Novo**. O número também aparece no **Início**.
- **Reservas de hoje:** o sítio mais rápido é o **Calendário** — toquem no dia de hoje
  e a folha do dia lista **Reservas neste dia**, por partida (manhã e tarde), com o
  nome de quem vem. No quadro de Vendas, a coluna **Reservado** tem os cartões com
  referência **BK-…** e a data do passeio.
- **Procurar** alguém: a caixa **Procurar pedidos** no topo aceita nome, e-mail ou
  telefone e procura em todas as colunas.

Toquem num cartão para abrir o pedido. Aí está tudo o que dá para fazer com ele:

- **Email**, **Telefonar**, **WhatsApp** — abrem a vossa aplicação de email ou o
  WhatsApp com uma mensagem já escrita na língua em que a pessoa escreveu.
- **Registar contacto** — marca que acabaram de falar com a pessoa (fica «Último
  contacto há X»).
- O botão de estado (ao lado do nome) muda a coluna: **Novo**, **Contactado**,
  **Orçamentado**, **Reservado**, **Arquivado**.
- **Arquivar** / **Reabrir**.
- O formulário por baixo permite corrigir os dados do pedido e escrever notas internas.
- **Reservas** — o que a pessoa pagou, o que já foi reembolsado, e os botões
  **Mover a reserva** e **Cancelar e reembolsar** (ver a secção 5).
- **Histórico** — quem mexeu neste pedido, e quando.

### Calendário — o que está à venda

`/admin/calendar`. Há duas partidas por dia — **Manhã · 10:00** e **Tarde · 14:00** —
partilhadas por todos os passeios. Uma partida que não está no calendário não pode
ser reservada por ninguém, por isso abrir dias é o que põe o negócio à venda.

**Um dia:** toquem no dia. A folha do dia deixa:

- escolher **que partidas** estão em causa (manhã, tarde ou ambas);
- dizer **quantos condutores** estão ao serviço nesse dia (os botões − e +);
- escrever uma **Nota (só a equipa vê)** — «Casamento», «revisão do carro»…;
- **Pôr à venda**, **Fechar** ou **Limpar** (limpar tira o dia do calendário de todo).
- Ver as **Reservas neste dia** e registar uma venda feita à mão (dinheiro, telefone)
  com **Nova reserva** — escolhem a partida, o passeio, quantos vêm, o nome, o email
  e o **Valor combinado (€)**.

**Vários dias:** toquem em **Marcar um período**, depois no primeiro e no último dia,
e escolham **Pôr à venda** ou **Fechar**. Por baixo do calendário, **Definir o mês
inteiro** abre ou fecha o mês de uma vez (**Fechar tudo** fecha as vendas do mês; as
reservas já feitas não são canceladas).

Fechar um dia com reservas **não cancela as reservas** — só impede novas. Para
cancelar uma reserva vão ao pedido dela em **Vendas** (secção 5).

### Mensagens automáticas

`/admin/notifications`. Este ecrã ainda está em desenvolvimento: mostra um exemplo do
que vai ser (confirmações, lembretes e agradecimentos automáticos) e não tem dados
reais nem nada para ligar ou desligar. As confirmações de reserva pagas já saem
sozinhas para o cliente, e uma cópia para a equipa chega ao email que o Jamie
configurou para isso (**info@agorasim.pt**) — liguem as notificações desse email no
telemóvel. Na primeira semana a regra é:
**cada reserva real é vista no quadro de Vendas dentro de uma hora.**

## 5. Cancelar uma reserva e devolver o dinheiro

Só uma reserva **Paga** pode ser cancelada — para as outras não há nada a devolver.
Antes de cancelar por mau tempo, pensem primeiro em **Mover a reserva** para outro dia
ou outra partida: é a política da casa (remarcar; reembolsar só em condições
extremas), e o cliente recebe um email com a nova data.

1. Em **Vendas**, abram o pedido da pessoa (procurem pelo nome ou pela referência).
2. No cartão **Reservas**, na reserva certa, toquem em **Cancelar e reembolsar**.
3. Em **Valor a reembolsar (€)** vem já o valor todo que ainda há para devolver.
   Podem baixar — até **0**, para cancelar sem devolver nada. O texto por baixo
   confirma em palavras o que vai acontecer («Vão ser devolvidos 120 €.»).
4. Escrevam **REEMBOLSAR** na caixa **Escreva REEMBOLSAR para confirmar**. Só depois
   o botão vermelho **Cancelar e reembolsar** fica ativo. **Voltar** sai sem fazer
   nada.
5. Toquem em **Cancelar e reembolsar**. O carro fica outra vez livre para essa
   partida, o cliente recebe um email a dizer que a reserva foi cancelada e quanto
   lhe é devolvido, e a devolução segue pelo Stripe para o cartão com que pagou
   (normalmente 5 a 10 dias úteis a aparecer no extrato).

Não há como voltar atrás. Se se enganarem no valor, contactem o Jamie antes de fazer
mais alguma coisa.

## 6. Mudar um preço, um texto, uma experiência

`/admin/experiences` (no menu chama-se **Experiências**; no atalho, **Catálogo**). A
lista mostra cada experiência e extra, com o resumo dos preços por baixo. Em cada
linha há **Editar**, um olho para **Ocultar do site** / **Mostrar outra vez**, e
setas para mudar a ordem. **Adicionar** (em cima) cria uma nova.

**Textos:** em **Editar** podem mudar em português e em inglês o **Nome**, a **Frase
de apresentação**, o **Resumo**, a **Descrição**, os **Destaques**, a **Duração**, a
imagem e as **Perguntas e respostas**, e ligar ou desligar **Visível no site**. No fim
toquem em **Guardar experiência**; as alterações aparecem no site assim que guardarem.

**Preços:** a tabela de preços (partilhado/privado, crianças, mínimos) aparece em
**Editar** na secção **Preços**, mas **para já é só de leitura** — não há ainda um
editor de preços no painel. Para mudar um preço, mandem mensagem ao Jamie com o valor
novo e a partir de quando; ele muda e fica logo em vigor. O editor está previsto.

Ocultar uma experiência tira-a do site mas mantém-na legível nos pedidos antigos.
Apagar é irreversível e quase nunca é a opção certa — ocultem.

## 7. Onde está o registo de tudo

- **Em cada pedido**, o cartão **Histórico** mostra todas as alterações a esse pedido,
  quem as fez e quando.
- **Para o painel inteiro**, em **Mais → Definições → Registo de atividade**
  (`/admin/settings/audit`): todas as alterações — mudanças de estado, cancelamentos,
  alterações de contas — com quem as fez, quando, e os dados antes e depois. Só as
  contas com a função **Responsável** o veem, que é a vossa.
- **Equipa** (`/admin/settings/users`) lista quem pode entrar no painel; é também aí
  que se desativa uma conta.

## 8. Quando algo parece errado — ligar ao Jamie

Liguem ou mandem mensagem ao Jamie pelo contacto habitual (WhatsApp) quando:

- um cliente diz que pagou e a reserva não aparece em **Vendas** ao fim de alguns
  minutos;
- uma reserva aparece como **Pagamento pendente** há mais de uma hora;
- um reembolso foi feito com o valor errado, ou em **Reservas** aparece o aviso de que
  a comissão ainda não consta como devolvida e não muda;
- é preciso mudar um preço, ou criar uma experiência nova que se venda online;
- a aplicação mostra um erro, um ecrã em inglês, ou o **Início** não carrega;
- alguém precisa de uma conta nova, ou uma palavra-passe se perdeu de vez.

Se o painel estiver em baixo, o negócio não está: os pedidos e as reservas continuam
a chegar ao email **info@agorasim.pt** e o Stripe guarda todos os pagamentos.
Nenhum toque no painel apaga dinheiro — o pior que acontece é ter de ligar.
