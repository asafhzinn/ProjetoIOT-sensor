const BASE_URL = 'http://10.137.11.6/api/sensor/status';
 
async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar o servidor`);
  return res.json();
}
 
// GET /listar -> aceita lista direta ou objeto que contenha a lista
export async function listarSensores() {
  const data = await request('/listar');
  if (Array.isArray(data)) return data;
  const lista = Object.values(data).find(Array.isArray);
  return lista || [];
}
 
// GET /visualizar/:codigo -> { success, status }
export function visualizarSensor(codigo) {
  return request(`/visualizar/${codigo}`);
}
 
// Busca vários códigos de uma vez usando a rota /visualizar/:codigo.
// Retorna [{ codigo, encontrado, status }] na mesma ordem dos códigos.
export async function buscarSensores(codigos) {
  const respostas = await Promise.allSettled(codigos.map((c) => visualizarSensor(c)));
  return codigos.map((codigo, i) => {
    const r = respostas[i];
    if (r.status === 'fulfilled' && r.value && r.value.status !== undefined) {
      return { codigo, encontrado: true, status: r.value.status };
    }
    return { codigo, encontrado: false };
  });
}
 
// PUT /atualizar  body: { codigo, status: true|false }
export function atualizarStatus(codigo, status) {
  return request('/atualizar', {
    method: 'PUT',
    body: JSON.stringify({ codigo, status }),
  });
}
 