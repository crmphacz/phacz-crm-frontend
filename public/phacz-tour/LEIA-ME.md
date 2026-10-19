# Prints do tutorial

As 15 telas que o tutorial da página **Documentação** percorre.

## Falta 1 print

| Arquivo | Tela a capturar |
|---|---|
| `tela-05-dashboard.png` | **Dashboard → aba Visão Geral** |

Enquanto ele não existir, o tutorial roda normalmente e aquela tela aparece com o aviso
"Print desta tela ainda não adicionado" — nada quebra. Basta salvar o arquivo com esse nome
nesta pasta.

Depois de adicionar, confira as coordenadas da cena 5 em
`src/components/phacz-tour/phacz-tour.data.ts`: elas foram escritas a partir do layout da tela,
mas só dá para ter certeza de que o destaque caiu no lugar certo com o print na mão.

## Como tirar um print

1. Abra o sistema **em produção, com dados reais** — é o que torna o tutorial útil: a pessoa
   reconhece o que vai ver.
2. Deixe a janela em **1919 × 908** (ou tire em qualquer tamanho e redimensione depois — o que
   importa é manter a proporção 1919:908, senão a imagem distorce no player).
3. Capture a tela inteira do navegador, **sem a barra de endereços**.
4. Salve em PNG com o nome exato da lista, nesta pasta.

## As 15 telas

| # | Arquivo | Tela |
|---|---|---|
| 1 | `tela-01-pipeline.png` | Pipeline |
| 2 | `tela-02-card-corretor.png` | Card do corretor, aba Geral |
| 3 | `tela-03-atividades.png` | Card do corretor, aba Atividades |
| 4 | `tela-04-clientes.png` | Clientes Finais |
| 5 | `tela-05-dashboard.png` | Dashboard → Visão Geral *(falta)* |
| 6 | `tela-06-placar.png` | Dashboard → Placar de Metas |
| 7 | `tela-07-agenda.png` | Agenda |
| 8 | `tela-08-rodadas.png` | Calendário de Rodadas |
| 9 | `tela-09-empreendimentos.png` | Empreendimentos |
| 10 | `tela-10-tabelas.png` | Tabelas de Custos |
| 11 | `tela-11-whatsapp.png` | WhatsApp em massa |
| 12 | `tela-12-email.png` | E-mail Marketing |
| 13 | `tela-13-configuracoes.png` | Configurações da Empresa |
| 14 | `tela-14-usuarios.png` | Usuários |
| 15 | `tela-15-ia.png` | PHACZ IA |

## Mexer no roteiro

Cada parada de cada tela está em `src/components/phacz-tour/phacz-tour.data.ts`, em valores de
0 a 1 sobre a imagem:

```ts
{
  c:   [x, y],                    // onde o cursor para
  b:   [x, y, largura, altura],   // o que a caixa destaca
  cam: [escala, foco x, foco y],  // 1 = tela inteira; 1.5 = aproximada
  r:   'o texto da dica',         // uma linha só — o balão não quebra
}
```

Tirar ou acrescentar uma tela é mexer em três listas do mesmo arquivo: `leg` (o nome),
`paradas` (o roteiro) e `telas` (o arquivo). O motor não muda.
