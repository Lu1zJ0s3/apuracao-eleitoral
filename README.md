# Apuração eleitoral 2026

Mapa das 27 UFs com dados oficiais do TSE para presidente, governador, senador e deputados. Atualização automática a cada 30 segundos enquanto a página está visível. Não usa votos simulados.

## Rodar localmente

Requer Node.js 24. Execute `npm start` e abra http://127.0.0.1:8765 no navegador.

## Vercel

Importe este repositório na Vercel. O arquivo `vercel.json` configura a publicação do frontend e a função `/api/results`, que consulta o TSE no servidor. Nenhuma chave de API é necessária. `npm run build` prepara somente os arquivos públicos, sem expor o código do servidor.

Fonte: https://resultados.tse.jus.br/oficial/ — configuração eleitoral oficial e arquivos de resultados por cargo/UF. Malha geográfica: API de malhas do IBGE.

Quando o TSE estiver indisponível, a interface informa a falha; não substitui dados reais por dados fictícios. Dados preservados em memória podem ser perdidos quando uma instância serverless reinicia.
