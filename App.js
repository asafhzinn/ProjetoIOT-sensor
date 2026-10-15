import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { atualizarStatus, buscarSensores, listarSensores, visualizarSensor } from './api';
 
const C = {
  header: '#12302B',
  headerText: '#E8F1EE',
  headerMuted: '#8FB0A8',
  bg: '#EEF2F0',
  card: '#FFFFFF',
  ink: '#16221F',
  muted: '#6A7C77',
  line: '#DCE4E1',
  on: '#1F9D63',
  onSoft: '#E1F4EA',
  off: '#C2473A',
  offSoft: '#F9E5E2',
};
 
const isOn = (s) => s === 1 || s === true;
const iconePorTipo = (tipo) => (tipo === 'umidade' ? '💧' : tipo === 'infravermelho' ? '📡' : '🔌');
const capitalizar = (t = '') => t.charAt(0).toUpperCase() + t.slice(1);
 
/* ---------- Componentes pequenos ---------- */
function Icone({ tipo, ativo, grande }) {
  return (
    <View
      style={[
        styles.icone,
        grande && styles.iconeGrande,
        { backgroundColor: ativo ? C.onSoft : C.offSoft },
      ]}
    >
      <Text style={{ fontSize: grande ? 34 : 22 }}>{iconePorTipo(tipo)}</Text>
    </View>
  );
}
 
function Selo({ ativo }) {
  return (
    <View style={[styles.selo, { backgroundColor: ativo ? C.onSoft : C.offSoft }]}>
      <View style={[styles.ponto, { backgroundColor: ativo ? C.on : C.off }]} />
      <Text style={[styles.seloTexto, { color: ativo ? C.on : C.off }]}>
        {ativo ? 'Ativo' : 'Inativo'}
      </Text>
    </View>
  );
}
 
function Contador({ valor, rotulo, cor }) {
  return (
    <View style={styles.contador}>
      <Text style={[styles.contadorValor, cor && { color: cor }]}>{valor}</Text>
      <Text style={styles.contadorRotulo}>{rotulo}</Text>
    </View>
  );
}
 
/* ---------- Card de sensor (usado na lista e na busca) ---------- */
function CardSensor({ item, ocupado, onAbrir, onAlternar }) {
  const ativo = isOn(item.status);
  return (
    <Pressable
      onPress={() => onAbrir(item.codigo)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.barra, { backgroundColor: ativo ? C.on : C.off }]} />
      <Icone tipo={item.tipo} ativo={ativo} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.codigo}>{item.codigo}</Text>
        <Text style={styles.tipo}>{capitalizar(item.tipo)}</Text>
        <Selo ativo={ativo} />
      </View>
      <Switch
        value={ativo}
        disabled={ocupado}
        onValueChange={() => onAlternar(item.codigo)}
        trackColor={{ false: '#D5B9B5', true: '#8FDDB8' }}
        thumbColor={ativo ? C.on : C.off}
      />
    </Pressable>
  );
}
 
/* ---------- Tela 1: lista ---------- */
function ListaSensores({ sensores, carregando, erro, atualizando, onRecarregar, onAbrir, onAlternar, ocupados }) {
  const [filtro, setFiltro] = useState('todos');
 
  if (carregando) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={C.header} />;
  }
 
  const ativos = sensores.filter((s) => isOn(s.status)).length;
  const dados = sensores.filter((s) =>
    filtro === 'todos' ? true : filtro === 'ativos' ? isOn(s.status) : !isOn(s.status)
  );
 
  return (
    <FlatList
      data={dados}
      keyExtractor={(item) => item.codigo}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRecarregar} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.titulo}>Painel de sensores</Text>
            <Text style={styles.subtituloHeader}>Puxe a tela para baixo para atualizar</Text>
            <View style={styles.contadores}>
              <Contador valor={sensores.length} rotulo="Total" />
              <Contador valor={ativos} rotulo="Ativos" cor="#6EE0A8" />
              <Contador valor={sensores.length - ativos} rotulo="Inativos" cor="#FF9C90" />
            </View>
          </View>
 
          {erro && <Text style={styles.erro}>{erro}</Text>}
 
          <View style={styles.filtros}>
            {['todos', 'ativos', 'inativos'].map((f) => (
              <Pressable
                key={f}
                onPress={() => setFiltro(f)}
                style={[styles.chip, filtro === f && styles.chipAtivo]}
              >
                <Text style={[styles.chipTexto, filtro === f && styles.chipTextoAtivo]}>
                  {capitalizar(f)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        !erro && <Text style={styles.vazio}>Nenhum sensor nesta categoria.</Text>
      }
      renderItem={({ item }) => (
        <CardSensor
          item={item}
          ocupado={ocupados.includes(item.codigo)}
          onAbrir={onAbrir}
          onAlternar={onAlternar}
        />
      )}
    />
  );
}
 
/* ---------- Tela: buscar sensores por código ---------- */
function BuscaSensores({ sensores, texto, setTexto, resultados, buscando, erro, onBuscar, onAbrir, onAlternar, ocupados }) {
  return (
    <FlatList
      data={resultados}
      keyExtractor={(r) => r.codigo}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.titulo}>Buscar sensores</Text>
            <Text style={styles.subtituloHeader}>
              Digite um ou mais códigos separados por vírgula
            </Text>
          </View>
 
          <View style={styles.buscaBox}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={onBuscar}
              placeholder="Ex.: S1, S3, S8"
              placeholderTextColor={C.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.input}
            />
            <Pressable
              onPress={onBuscar}
              disabled={buscando || !texto.trim()}
              style={({ pressed }) => [
                styles.botaoBuscar,
                (buscando || !texto.trim()) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.botaoTexto}>{buscando ? 'Buscando...' : 'Buscar'}</Text>
            </Pressable>
          </View>
 
          {erro && <Text style={styles.erro}>{erro}</Text>}
        </View>
      }
      ListEmptyComponent={
        !buscando && !erro && (
          <Text style={styles.vazio}>Os sensores encontrados vão aparecer aqui.</Text>
        )
      }
      renderItem={({ item: r }) => {
        const sensor = r.encontrado && sensores.find((s) => s.codigo === r.codigo);
        if (!sensor) {
          return (
            <View style={[styles.card, { paddingLeft: 18 }]}>
              <View style={[styles.barra, { backgroundColor: C.muted }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.codigo}>{r.codigo}</Text>
                <Text style={styles.tipo}>Sensor não encontrado</Text>
              </View>
            </View>
          );
        }
        return (
          <CardSensor
            item={sensor}
            ocupado={ocupados.includes(sensor.codigo)}
            onAbrir={onAbrir}
            onAlternar={onAlternar}
          />
        );
      }}
    />
  );
}
 
/* ---------- Tela 2: detalhe ---------- */
function DetalheSensor({ sensor, onVoltar, onAlternar, ocupado, carregando }) {
  const ativo = isOn(sensor.status);
 
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerDetalhe}>
        <Pressable onPress={onVoltar} hitSlop={12}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </Pressable>
        <Text style={styles.titulo}>{sensor.codigo}</Text>
        <Text style={styles.subtituloHeader}>Sensor {sensor.tipo}</Text>
      </View>
 
      <View style={styles.detalheCorpo}>
        <View style={styles.detalheCard}>
          <Icone tipo={sensor.tipo} ativo={ativo} grande />
          <Text style={styles.detalheRotulo}>Status atual</Text>
          {carregando ? (
            <ActivityIndicator style={{ marginVertical: 14 }} color={C.header} />
          ) : (
            <Text style={[styles.detalheStatus, { color: ativo ? C.on : C.off }]}>
              {ativo ? 'Ativo' : 'Inativo'}
            </Text>
          )}
        </View>
 
        <Pressable
          disabled={ocupado || carregando}
          onPress={() => onAlternar(sensor.codigo)}
          style={({ pressed }) => [
            styles.botao,
            { backgroundColor: ativo ? C.off : C.on },
            (ocupado || carregando) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.botaoTexto}>
            {ocupado ? 'Salvando...' : ativo ? 'Desativar sensor' : 'Ativar sensor'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
 
/* ---------- App ---------- */
export default function App() {
  const [sensores, setSensores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ocupados, setOcupados] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [aba, setAba] = useState('lista');
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState(null);
 
  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setSensores(await listarSensores());
    } catch (e) {
      setErro('Não foi possível carregar os sensores. Confira se você está na mesma rede do servidor.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);
 
  useEffect(() => {
    carregar();
  }, [carregar]);
 
  const definirStatus = (codigo, status) =>
    setSensores((lista) => lista.map((s) => (s.codigo === codigo ? { ...s, status } : s)));
 
  async function alternar(codigo) {
    const atual = sensores.find((s) => s.codigo === codigo);
    if (!atual) return;
    const novo = !isOn(atual.status);
    setOcupados((o) => [...o, codigo]);
    definirStatus(codigo, novo ? 1 : 0); // atualiza na hora
    try {
      await atualizarStatus(codigo, novo);
    } catch (e) {
      definirStatus(codigo, atual.status); // volta ao valor anterior
      setErro('Não foi possível atualizar o status. Tente de novo.');
    } finally {
      setOcupados((o) => o.filter((c) => c !== codigo));
    }
  }
 
  async function abrir(codigo) {
    setAberto(codigo);
    setCarregandoDetalhe(true);
    try {
      const data = await visualizarSensor(codigo);
      definirStatus(codigo, data.status);
    } catch (e) {
      /* mantém o status que já estava na lista */
    } finally {
      setCarregandoDetalhe(false);
    }
  }
 
  async function buscar() {
    const digitados = [...new Set(texto.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))];
    if (digitados.length === 0) return;
    // usa o código exatamente como está cadastrado (S1 e s1 viram o mesmo)
    const alvos = digitados.map((d) => {
      const achado = sensores.find((s) => s.codigo.toLowerCase() === d.toLowerCase());
      return achado ? achado.codigo : d;
    });
    try {
      setBuscando(true);
      setErroBusca(null);
      const res = await buscarSensores(alvos);
      setSensores((lista) => {
        const nova = [...lista];
        res.filter((r) => r.encontrado).forEach((r) => {
          const i = nova.findIndex((s) => s.codigo === r.codigo);
          if (i >= 0) nova[i] = { ...nova[i], status: r.status };
          else nova.push({ codigo: r.codigo, tipo: 'sensor', status: r.status });
        });
        return nova;
      });
      setResultados(res);
    } catch (e) {
      setErroBusca('Não foi possível buscar. Confira se você está na mesma rede do servidor.');
    } finally {
      setBuscando(false);
    }
  }
 
  const sensorAberto = sensores.find((s) => s.codigo === aberto);
 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {sensorAberto ? (
        <DetalheSensor
          sensor={sensorAberto}
          carregando={carregandoDetalhe}
          ocupado={ocupados.includes(sensorAberto.codigo)}
          onAlternar={alternar}
          onVoltar={() => setAberto(null)}
        />
      ) : (
        <>
          <View style={{ flex: 1 }}>
            {aba === 'lista' ? (
              <ListaSensores
                sensores={sensores}
                carregando={carregando}
                erro={erro}
                atualizando={atualizando}
                ocupados={ocupados}
                onRecarregar={() => {
                  setAtualizando(true);
                  carregar();
                }}
                onAbrir={abrir}
                onAlternar={alternar}
              />
            ) : (
              <BuscaSensores
                sensores={sensores}
                texto={texto}
                setTexto={setTexto}
                resultados={resultados}
                buscando={buscando}
                erro={erroBusca}
                ocupados={ocupados}
                onBuscar={buscar}
                onAbrir={abrir}
                onAlternar={alternar}
              />
            )}
          </View>
          <View style={styles.abas}>
            {[
              ['lista', 'Todos os sensores'],
              ['busca', 'Buscar'],
            ].map(([id, rotulo]) => (
              <Pressable key={id} onPress={() => setAba(id)} style={styles.aba}>
                <Text style={[styles.abaTexto, aba === id && styles.abaTextoAtiva]}>{rotulo}</Text>
                {aba === id && <View style={styles.abaLinha} />}
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
 
  header: {
    backgroundColor: C.header,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerDetalhe: {
    backgroundColor: C.header,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  titulo: { fontSize: 28, fontWeight: '800', color: C.headerText },
  subtituloHeader: { fontSize: 14, color: C.headerMuted, marginTop: 4 },
  voltar: { fontSize: 16, color: C.headerMuted, marginBottom: 14 },
 
  contadores: { flexDirection: 'row', marginTop: 20, gap: 10 },
  contador: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contadorValor: { fontSize: 24, fontWeight: '800', color: C.headerText },
  contadorRotulo: { fontSize: 12, color: C.headerMuted, marginTop: 2 },
 
  erro: {
    backgroundColor: C.offSoft,
    color: C.off,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
  },
 
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipAtivo: { backgroundColor: C.header, borderColor: C.header },
  chipTexto: { fontSize: 14, color: C.muted, fontWeight: '600' },
  chipTextoAtivo: { color: C.headerText },
 
  vazio: { textAlign: 'center', color: C.muted, marginTop: 24 },
 
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    paddingLeft: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.line,
  },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  icone: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconeGrande: { width: 76, height: 76, borderRadius: 22 },
  codigo: { fontSize: 18, fontWeight: '700', color: C.ink },
  tipo: { fontSize: 14, color: C.muted, marginTop: 1, marginBottom: 6 },
 
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ponto: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  seloTexto: { fontSize: 12, fontWeight: '700' },
 
  buscaBox: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  input: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.ink,
  },
  botaoBuscar: {
    backgroundColor: C.header,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
 
  abas: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  abaTexto: { fontSize: 15, fontWeight: '600', color: C.muted },
  abaTextoAtiva: { color: C.header },
  abaLinha: { position: 'absolute', top: 0, height: 3, width: '40%', backgroundColor: C.on, borderRadius: 2 },
 
  detalheCorpo: { padding: 20 },
  detalheCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  detalheRotulo: { fontSize: 14, color: C.muted, marginTop: 18 },
  detalheStatus: { fontSize: 38, fontWeight: '800', marginTop: 4 },
 
  botao: { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  botaoTexto: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
 