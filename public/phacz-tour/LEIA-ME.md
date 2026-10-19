# Prints do tutorial

Os 12 arquivos abaixo são as telas que o tutorial da página **Documentação** percorre.
Enquanto um deles não existir, o tutorial roda normalmente e aquela tela aparece com o aviso
"Print desta tela ainda não adicionado" — nada quebra.

## Como tirar os prints

1. Abra o sistema **em produção, com dados reais** (é o que torna o tutorial útil: a pessoa
   reconhece o que vai ver).
2. Deixe a janela em **1706 × 921** (ou tire em qualquer tamanho e redimensione depois — o que
   importa é manter a proporção 1706:921, senão a imagem distorce no player).
3. Capture a tela inteira do navegador, **sem a barra de endereços**.
4. Salve em PNG com o nome exato da lista abaixo, nesta pasta.

## Os 12 arquivos

| Arquivo | Tela a capturar |
|---|---|
| `tela-01-pipeline.png` | Pipeline, com as colunas visíveis |
| `tela-02-card-corretor.png` | Um card de corretor aberto, na aba **Geral** |
| `tela-03-atividades.png` | O mesmo card, na aba **Atividades**, com o formulário aberto |
| `tela-04-clientes.png` | Clientes Finais, com a lista carregada |
| `tela-05-dashboard.png` | Dashboard → aba **Visão Geral** |
| `tela-06-placar.png` | Dashboard → aba **Placar de Metas** |
| `tela-07-agenda.png` | Agenda, num mês com compromissos |
| `tela-08-rodadas.png` | Calendário de Rodadas |
| `tela-09-empreendimentos.png` | Um empreendimento aberto, com as unidades |
| `tela-10-tabelas.png` | Tabelas de Custos |
| `tela-11-whatsapp.png` | WhatsApp em massa |
| `tela-12-configuracoes.png` | Configurações da Empresa |

## Depois de adicionar

As **coordenadas** de cada parada (onde o cursor para, o que a caixa destaca, quanto a câmera
aproxima) estão em `src/components/phacz-tour/phacz-tour.data.ts`, em valores de 0 a 1 sobre a
imagem. Elas foram escritas a partir do layout do sistema, mas só dá para conferir se o
destaque caiu no lugar certo **com o print na tela** — espere algum ajuste fino nessa etapa.

Cada parada é:

```ts
{
  c:   [x, y],                    // onde o cursor para
  b:   [x, y, largura, altura],   // o que a caixa destaca
  cam: [escala, foco x, foco y],  // 1 = tela inteira; 1.5 = aproximada
  r:   'o texto da dica',
}
```
