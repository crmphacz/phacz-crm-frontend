# Guia de Bandeiras PNG para Idiomas

Este documento lista todas as bandeiras PNG que precisam ser adicionadas ao diretório:
`src/assets/images/flags/`

## Bandeiras Existentes ✅
- `brazil.png` - Brasil (Português)
- `usa.png` - Estados Unidos (English)
- `spain.png` - Espanha (Español)

## Bandeiras a Adicionar 📥

### Requisitos
- Formato: PNG
- Tamanho recomendado: 512x512px ou 256x256px
- Proporção: Retangular (3:2) ou quadrada
- Qualidade: Alta resolução

### Lista de Bandeiras Necessárias

| Arquivo | País | Idioma | Código |
|---------|------|--------|--------|
| `china.png` | China | 中文 (Mandarim) | zh |
| `russia.png` | Rússia | Русский (Russo) | ru |
| `india.png` | Índia | हिन्दी (Hindi) | hi |
| `france.png` | França | Français (Francês) | fr |
| `indonesia.png` | Indonésia | Bahasa Indonesia | id |
| `turkey.png` | Turquia | Türkçe (Turco) | tr |
| `thailand.png` | Tailândia | ไทย (Tailandês) | th |
| `philippines.png` | Filipinas | Filipino | fil |
| `vietnam.png` | Vietnã | Tiếng Việt | vi |
| `germany.png` | Alemanha | Deutsch (Alemão) | de |
| `italy.png` | Itália | Italiano | it |
| `bulgaria.png` | Bulgária | Български (Búlgaro) | bg |
| `croatia.png` | Croácia | Hrvatski (Croata) | hr |
| `denmark.png` | Dinamarca | Dansk (Dinamarquês) | da |
| `hungary.png` | Hungria | Magyar (Húngaro) | hu |
| `netherlands.png` | Holanda | Nederlands (Holandês) | nl |
| `south-korea.png` | Coreia do Sul | 한국어 (Coreano) | ko |
| `romania.png` | Romênia | Română (Romeno) | ro |
| `sweden.png` | Suécia | Svenska (Sueco) | sv |
| `czech.png` | República Checa | Čeština (Checo) | cs |
| `lithuania.png` | Lituânia | Lietuvių (Lituano) | lt |
| `latvia.png` | Letônia | Latviešu (Letão) | lv |
| `malta.png` | Malta | Malti (Maltês) | mt |
| `estonia.png` | Estônia | Eesti (Estoniano) | et |

## Como Adicionar as Bandeiras

1. **Baixar as bandeiras:**
   - Fonte recomendada: [Flagpedia](https://flagpedia.net/)
   - Alternativa: [CountryFlags](https://www.countryflags.com/)
   - GitHub: [flag-icons](https://github.com/lipis/flag-icons)

2. **Processar as imagens:**
   - Converter para PNG se necessário
   - Redimensionar para 256x256px ou 512x512px
   - Otimizar com TinyPNG ou ImageOptim

3. **Adicionar ao projeto:**
   - Colocar na pasta: `src/assets/images/flags/`
   - Nomear conforme a tabela acima
   - Commit: `git add src/assets/images/flags/*.png`

## Exemplo de Código para React Native

```jsx
{
  language: 'zh',
  label: '中文 (Mandarim)',
  flag: require('./../../../assets/images/flags/china.png'),
}
```

## Verificação

Após adicionar as bandeiras, verificar que cada arquivo:
- ✅ Está no formato PNG
- ✅ Tem boa qualidade visual
- ✅ Carrega corretamente no app
- ✅ Tem tamanho otimizado (< 50KB por arquivo)

## Alternativa Temporária

Enquanto as bandeiras PNG não estiverem disponíveis, o app usa emojis de bandeiras (🇧🇷, 🇺🇸, 🇪🇸, etc.) como fallback.
