import {getResults} from '../tse.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error:'Método não permitido'});
  }
  const url = new URL(req.url, 'http://localhost');
  try {
    const result = await getResults({cargo:url.searchParams.get('cargo') || '1'});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(502).json({error:error.message});
  }
}
