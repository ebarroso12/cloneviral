# Radar Viral (cloneviral)

Painel de métricas e máquina de conteúdo para Instagram, reconstruído a partir do mapeamento funcional do Sistema Viral (clean-room: funções e fluxos, sem código, textos, marca ou arte do original).

- `replica/recon.md` — mapa de telas, fluxos, fórmulas das métricas, modelo de dados
- `replica/features.csv` — matriz de funções (paridade via `replica-diff`)
- `lib/` — camada de dados (arquivo local ou Supabase), métricas, créditos, IA
- Stack: Next.js 15 + TypeScript + Supabase (opcional, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # testes das fórmulas
```

Sem variáveis de ambiente o app roda em modo demonstração, com dados sintéticos e sem nenhum custo.
