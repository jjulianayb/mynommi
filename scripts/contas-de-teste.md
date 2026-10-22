# Contas de teste

Existem quatro contas e duas tribos marcadas com `is_test = true`, criadas para
a equipe conseguir ver as telas cheias antes de ter gente de verdade.

| Apelido | Cidade | Id |
| --- | --- | --- |
| Marina | Belo Horizonte | `a0000000-0000-4000-8000-000000000001` |
| Rafa | Belo Horizonte | `a0000000-0000-4000-8000-000000000002` |
| Lu | Belo Horizonte | `a0000000-0000-4000-8000-000000000003` |
| Camila | Nova Lima | `a0000000-0000-4000-8000-000000000004` |

Tribos: **Caminhada da Pampulha** (tribo, 5 membros) e **Café depois da
caminhada** (rolê, 3 confirmados).

## A regra

Pessoa real **nunca** vê essas contas. A trava está no banco, na migração
`0026_contas_de_teste_invisiveis.sql`, e vale para:

- a política de leitura de `profiles` (busca e leitura direta);
- `pessoas_para_combinar()` (o baralho do match);
- `radar_nearby()`;
- `pagina_pessoal()`, mesmo com o endereço do perfil na mão;
- `list_teias()` e `tribos_para_mim()`;
- `pulso_da_nommi()` — contagem com gente de teste dentro é número mentiroso.

Quem enxerga é só quem tem papel `admin`, conferido por
`public.ve_contas_de_teste()`. Ao criar qualquer função nova que liste gente ou
tribo, **repita o filtro** `(NOT is_test OR public.ve_contas_de_teste())`.

As contas não têm senha utilizável e os avatares são desenhos gerados em SVG,
não fotos de pessoas.

## Para apagar quando não precisar mais

```sql
DELETE FROM auth.users WHERE id::text LIKE 'a0000000-0000-4000-8000-%';
DELETE FROM public.teias WHERE is_test;
```
