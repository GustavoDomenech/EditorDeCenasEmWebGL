let gl;
let canvas;
let programaGlobal;
let u_matrizLoc;
let u_texturaLoc;
let u_corLoc;
let texturaGlobal = null; 
let mousePressionado = false;
let mousePosicaoAnterior = {x: 0, y: 0};
let anguloCameraX = Math.PI / 6;
let anguloCameraY = -Math.PI / 4;
let indiceSelecionado = -1;
const bibliotecaModelos = {}; 
const cena = []; 

const vertexShaderSource = `#version 300 es
    in vec3 a_posicao;
    in vec3 a_normal;
    in vec2 a_texCoord; 
    
    uniform mat4 u_matriz;
    
    out vec3 v_normal;
    out vec2 v_texCoord; 

    void main(){
        gl_Position = u_matriz * vec4(a_posicao, 1.0);
        v_normal = a_normal; 
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float; 

    in vec3 v_normal;
    in vec2 v_texCoord; 

    uniform sampler2D u_textura; 
    uniform vec3 u_cor; 

    out vec4 corSaida;

    void main(){
        vec3 luzDirecao = normalize(vec3(1.0, 1.5, 0.5)); 
        float luz = max(dot(normalize(v_normal), luzDirecao), 0.3); 
        vec4 corTextura = texture(u_textura, v_texCoord); 
        corSaida = vec4(corTextura.rgb * u_cor * luz, corTextura.a); 
      }
`;

function criarShader(gl, tipo, codigoFonte) {
  const shader = gl.createShader(tipo);
  gl.shaderSource(shader, codigoFonte);
  gl.compileShader(shader);

  const sucesso = gl.getShaderParameter(shader, gl.COMPILE_STATUS); 
  if (sucesso) {
    return shader;
  }

  console.error("Erro ao compilar o shader: ", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function criarPrograma(gl, vertexShader, fragmentShader) {
  const programa = gl.createProgram();
  gl.attachShader(programa, vertexShader);
  gl.attachShader(programa, fragmentShader);
  gl.linkProgram(programa);

  const sucesso = gl.getProgramParameter(programa, gl.LINK_STATUS);
  if (sucesso) {
    return programa;
  }

  console.error("Erro ao linkar o programa: ", gl.getProgramInfoLog(programa));
  gl.deleteProgram(programa);
}

function gerarIconeBase64(modeloBib){
  const larguraOriginal = canvas.width;
  const alturaOriginal = canvas.height;

  canvas.width = 128;
  canvas.height = 128;
  gl.viewport(0, 0, 128, 128);

  gl.clearColor(0.25, 0.25, 0.25, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(programaGlobal);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texturaGlobal);
  gl.uniform1i(u_texturaLoc, 0);

  const projecao = Matriz.perspectiva((60 * Math.PI) / 180, 1.0, 0.1, 100.0);
  const matEscala = Matriz.escala(0.4, 0.4, 0.4);
  let matRot = Matriz.multiplicar(Matriz.rotacaoX(Math.PI / 6), Matriz.rotacaoY(-Math.PI / 4));

  let dx = modeloBib.configIcone.x;
  let dy = modeloBib.configIcone.y;
  let dz = modeloBib.configIcone.z;
  let matPos = Matriz.translacao(dx, dy, dz);

  let matModelo = Matriz.multiplicar(matRot, matEscala);
  matModelo = Matriz.multiplicar(matPos, matModelo);

  let matrizFinal = Matriz.multiplicar(projecao, matModelo);

  gl.uniformMatrix4fv(u_matrizLoc, false, matrizFinal);
  gl.uniform3fv(u_corLoc, [1.0, 1.0, 1.0]);

  gl.bindVertexArray(modeloBib.vao);
  gl.drawArrays(gl.TRIANGLES, 0, modeloBib.contagemVertices);

  const dataUrl = canvas.toDataURL('image/png'); 
  
  canvas.width = larguraOriginal;
  canvas.height = alturaOriginal;
  gl.viewport(0, 0, larguraOriginal, alturaOriginal);
  gl.clearColor(0.15, 0.15, 0.15, 1.0);

  return dataUrl;
}

function atualizarListaCena(){ 
  const lista = document.getElementById('lista-cena');
  if (!lista) return;
  lista.innerHTML = ''; 

  for (let i = 0; i < cena.length; i++){
    const item = document.createElement('li');
    item.innerText = `${cena[i].nomeOBJ} ${i + 1}`;
    item.style.padding = "8px";
    item.style.cursor = "pointer";
    item.style.borderBottom = "1px solid #444"

    if (i === indiceSelecionado){
      item.style.backgroundColor = "#4CAF50"; 
      item.style.color = "white";
    }

    item.onclick = () => selecionarObjeto(i);
    lista.appendChild(item);
  }
}

function selecionarObjeto(indice){
  indiceSelecionado = indice;
  atualizarListaCena(); 

  const obj = cena[indice];
  document.getElementById('nome-selecionado').innerText = `${obj.nomeOBJ} ${indice + 1}`;
  document.getElementById('painel-transformacoes').style.display = 'block'; 

  const selectPai = document.getElementById('sel-pai');
  selectPai.innerHTML = '<option value="-1">Nenhum</option>'; 
  for (let i = 0; i < cena.length; i++){
    if (i !== indice) { 
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${cena[i].nomeOBJ} ${i + 1}`;
      selectPai.appendChild(opt);
    }
  }

  if (obj.pai !== null){ 
    selectPai.value = cena.indexOf(obj.pai);
  } else {
    selectPai.value = -1;
  }

  function setValor(id, valor){ 
    document.getElementById(id).value = valor;
    document.getElementById(`val-${id}`).innerText = valor.toFixed(2)
  }

  setValor('pos-x', obj.posicao[0]);
  setValor('pos-y', obj.posicao[1]);
  setValor('pos-z', obj.posicao[2]);
  setValor('rot-x', obj.rotacao[0]);
  setValor('rot-y', obj.rotacao[1]);
  setValor('rot-z', obj.rotacao[2]);
  setValor('esc-x', obj.escala[0]);
  setValor('esc-y', obj.escala[1]);
  setValor('esc-z', obj.escala[2]);

  const rHex = Math.round(obj.cor[0] * 255).toString(16).padStart(2, '0');
  const gHex = Math.round(obj.cor[1] * 255).toString(16).padStart(2, '0');
  const bHex = Math.round(obj.cor[2] * 255).toString(16).padStart(2, '0');
  document.getElementById('cor-modelo').value = `#${rHex}${gHex}${bHex}`;

  document.getElementById('anim-ativa').checked = obj.animacao.ativa;
  document.getElementById('anim-eixo').value = obj.animacao.eixo;
  document.getElementById('anim-vel').value = obj.animacao.velocidade;
  document.getElementById('val-anim-vel').innerText = obj.animacao.velocidade.toFixed(3);
}

function configurarInputs(){ 
  const ids = ['pos-x', 'pos-y', 'pos-z', 'rot-x', 'rot-y','rot-z', 'esc-x', 'esc-y', 'esc-z'];

  ids.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', (e) => {
      if (indiceSelecionado === -1) return;
      const obj = cena[indiceSelecionado];
      const valor = parseFloat(e.target.value) || 0;

      document.getElementById(`val-${id}`).innerText = valor.toFixed(2); 

      if (id === 'pos-x') obj.posicao[0] = valor; 
      if (id === 'pos-y') obj.posicao[1] = valor;
      if (id === 'pos-z') obj.posicao[2] = valor;

      if (id === 'rot-x') obj.rotacao[0] = valor;
      if (id === 'rot-y') obj.rotacao[1] = valor;
      if (id === 'rot-z') obj.rotacao[2] = valor;

      if (id === 'esc-x') obj.escala[0] = valor;
      if (id === 'esc-y') obj.escala[1] = valor;
      if (id === 'esc-z') obj.escala[2] = valor;
    });
  });
  
  const selectPai = document.getElementById('sel-pai');
  if (selectPai){
    selectPai.addEventListener('change', (e) =>{
      if (indiceSelecionado === -1) return;
      const novoPaiIndice = parseInt(e.target.value);
      const objFilho = cena[indiceSelecionado];

      let seguro = true;
      let tempPai;

      if(novoPaiIndice !== -1){
        tempPai = cena[novoPaiIndice];
      } else {
        tempPai = null;
      }

      while (tempPai){
        if (tempPai === objFilho){
          seguro = false;
          break;
        }
      tempPai = tempPai.pai;
      }

      if (seguro){
        const paiAntigo = objFilho.pai;
        
        if (paiAntigo !== null){ 
          objFilho.posicao[0] += paiAntigo.posicao[0];
          objFilho.posicao[1] += paiAntigo.posicao[1];
          objFilho.posicao[2] += paiAntigo.posicao[2];
        }

        if (novoPaiIndice !== -1){
          const novoPai = cena[novoPaiIndice];
          objFilho.posicao[0] -= novoPai.posicao[0];
          objFilho.posicao[1] -= novoPai.posicao[1];
          objFilho.posicao[2] -= novoPai.posicao[2];
        }

        if (objFilho.pai){ 
          const indexAntigo = objFilho.pai.filhos.indexOf(objFilho);
          if (indexAntigo > -1) objFilho.pai.filhos.splice(indexAntigo, 1);
        }

        if (novoPaiIndice !== -1){ 
          const novoPai = cena[novoPaiIndice];
          objFilho.pai = novoPai;
          novoPai.filhos.push(objFilho); 
        } else {
            objFilho.pai = null;
        }
      } else {
          alert("Ação inválida, Pai do próprio pai.");
          if (objFilho.pai !== null){
            e.target.value = cena.indexOf(objFilho.pai);
          } else {
            e.target.value = -1;
          }
      }
      selecionarObjeto(indiceSelecionado);
    });
  }

  const animAtiva = document.getElementById('anim-ativa');
  if (animAtiva) {
    animAtiva.addEventListener('change', (e) =>{
      if (indiceSelecionado !== -1){
        cena[indiceSelecionado].animacao.ativa = e.target.checked;
      }
    });
  }

  const animEixo = document.getElementById('anim-eixo');
  if (animEixo) {
    animEixo.addEventListener('change', (e) =>{
      if (indiceSelecionado !== -1){
        cena[indiceSelecionado].animacao.eixo = parseInt(e.target.value);
      }
    });
  }

  const animVel = document.getElementById('anim-vel');
  if (animVel) {
    animVel.addEventListener('input', (e) =>{
      if (indiceSelecionado === -1) return;
      const val = parseFloat(e.target.value);
      cena[indiceSelecionado].animacao.velocidade = val;
      document.getElementById('val-anim-vel').innerText = val.toFixed(3);
    });
  }

  const inputCor = document.getElementById('cor-modelo'); 
  if (inputCor) {
    inputCor.addEventListener('input', (e) => {
      if (indiceSelecionado === -1) return;
      const hex = e.target.value; 
      const r = parseInt(hex.substring(1, 3), 16) / 255;
      const g = parseInt(hex.substring(3, 5), 16) / 255;
      const b = parseInt(hex.substring(5, 7), 16) / 255;
      cena[indiceSelecionado].cor = [r, g, b]; 
    });
  }
}

function configurarCamera(){
  canvas.addEventListener('mousedown', (e) =>{  
    if (e.button === 0) { 
      mousePressionado = true;
      mousePosicaoAnterior = {x: e.offsetX, y: e.offsetY};
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (mousePressionado) {
      const deltaX = e.offsetX - mousePosicaoAnterior.x;
      const deltaY = e.offsetY - mousePosicaoAnterior.y;

      const sensibilidade = 0.01;

      anguloCameraY -= deltaX * sensibilidade;
      anguloCameraX -= deltaY * sensibilidade;
      
      const limite = Math.PI / 2 - 0.01;
      anguloCameraX = Math.max(-limite, Math.min(limite, anguloCameraX));

      mousePosicaoAnterior = {x: e.offsetX, y: e.offsetY};
    }
  });

  window.addEventListener('mouseup', () =>{
    mousePressionado = false;
  });

  canvas.addEventListener('mouseleave', () => {
    mousePressionado = false;
  });
}

function criarItemMenu(idUnico, nomeOBJ){
  const IconeBase64 = gerarIconeBase64(bibliotecaModelos[idUnico]);
  const divLista = document.getElementById('lista-modelos');

  if (!divLista) return;

  const divItem = document.createElement('div');
  divItem.style.width = "110px";
  divItem.style.minHeight = "110px"
  divItem.style.cursor = "pointer";
  divItem.style.display = "flex";
  divItem.style.flexDirection = "column";
  divItem.style.alignItems = "center";
  divItem.style.justifyContent = "center";
  divItem.style.backgroundColor = "#333";
  divItem.style.borderRadius = "8px";
  divItem.style.padding = "10px";
  divItem.style.boxSizing = "border-box";
  divItem.style.transition = "background-color 0.2s";

  divItem.onmouseover = () => divItem.style.backgroundColor = "#4CAF50";
  divItem.onmouseout = () => divItem.style.backgroundColor = "#333"

  divItem.onclick = () => {
    cena.push({
      modeloId: idUnico,
      nomeOBJ: nomeOBJ, 
      pai: null, 
      filhos: [], 
      matrizLocal: null, 
      matrizGlobal: null,
      animacao: {ativa: false, eixo: 2, velocidade: 0.002}, 
      cor: [1.0, 1.0, 1.0],
      posicao: [0, 0, 0],
      rotacao: [0, 0, 0], 
      escala: [1, 1, 1]
    });

    atualizarListaCena();
  };

  const img = document.createElement('img');
  img.src = IconeBase64;
  img.style.width = "80px";
  img.style.height = "80px";
  img.style.pointerEvents = "none";
  
  const p = document.createElement('p');
  p.innerText = nomeOBJ;
  p.style.fontSize = "10px";
  p.style.pointerEvents = "none";

  divItem.appendChild(img);
  divItem.appendChild(p);
  divLista.appendChild(divItem);
}

function carregarTextura(gl, url){
  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);

  const corTemp = new Uint8Array([255, 255, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, corTemp);

  const imagem = new Image(); 
  imagem.onload = function(){
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  }

  imagem.src = url;

  return textura;
}

async function carregarModeloOBJ(idUnico ,nomeArquivo, nomeOBJ, configIcone = {x: 0.015, y: -0.015, z: -0.4}) {
  try { 
    const resposta = await fetch(nomeArquivo);
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);

    const textoOBJ = await resposta.text();  
    const dadosModelo = parseOBJ(textoOBJ);  
    
    const novoVao = gl.createVertexArray();
    gl.bindVertexArray(novoVao);

    const a_posicaoLoc = gl.getAttribLocation(programaGlobal, "a_posicao");
    const a_normalLoc = gl.getAttribLocation(programaGlobal, "a_normal");

    const bufferPosicao = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicao);
    gl.bufferData(gl.ARRAY_BUFFER, dadosModelo.posicoes, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_posicaoLoc);
    gl.vertexAttribPointer(a_posicaoLoc, 3, gl.FLOAT, false, 0, 0);

    const bufferNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferNormal);
    gl.bufferData(gl.ARRAY_BUFFER, dadosModelo.normais, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_normalLoc);
    gl.vertexAttribPointer(a_normalLoc, 3, gl.FLOAT, false, 0, 0);

    const a_texCoordLoc = gl.getAttribLocation(programaGlobal, "a_texCoord");
    const bufferTex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferTex);
    gl.bufferData(gl.ARRAY_BUFFER, dadosModelo.texCoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_texCoordLoc);
    gl.vertexAttribPointer(a_texCoordLoc, 2, gl.FLOAT, false, 0, 0); 

    gl.bindVertexArray(null); 

    bibliotecaModelos[idUnico] = {
      vao: novoVao,
      contagemVertices: dadosModelo.contagemVertices,
      configIcone: configIcone
    };

    criarItemMenu(idUnico, nomeOBJ); 

  } catch (erro){
    console.error("Falha no pipeline de carregamento", erro);
  }
}

function inicializarWebGL() {
  canvas = document.getElementById("canvas-webgl");
  gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true }); 

  if (!gl) {
    alert("Não suporta WebGl2");
    return;
  }

  const vertexShader = criarShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = criarShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  programaGlobal = criarPrograma(gl, vertexShader, fragmentShader);
  u_matrizLoc = gl.getUniformLocation(programaGlobal, "u_matriz");
  u_texturaLoc = gl.getUniformLocation(programaGlobal, "u_textura");
  u_corLoc = gl.getUniformLocation(programaGlobal, "u_cor");

  texturaGlobal = carregarTextura(gl, 'objetos/citybits_texture.png');

  redimensionarCanvas(); 
  window.addEventListener("resize", redimensionarCanvas); 

  gl.clearColor(0.15, 0.15, 0.15, 1.0); 
  gl.enable(gl.DEPTH_TEST); 

  configurarInputs(); 
  configurarCamera();

  carregarModeloOBJ('carro', 'objetos/car_hatchback.obj', 'Chassi do Carro', {x: 0.015, y: -0.015, z: -0.4});
  carregarModeloOBJ('banco', 'objetos/bench.obj', 'Banco', {x: -0.015, y: -0.015, z: -0.2});
  carregarModeloOBJ('pneu-de' , 'objetos/car_hatchback_wheel_front_left.obj', 'Pneu Dianteiro Esquerdo', {x: 0.019, y: 0.053, z: -0.24});
  carregarModeloOBJ('pneu-dd' , 'objetos/car_hatchback_wheel_front_right.obj', 'Pneu Dianteiro Direito', {x: 0.12, y: 0.01, z: -0.15});
  carregarModeloOBJ('pneu-te' , 'objetos/car_hatchback_wheel_rear_left.obj', 'Pneu Traseiro Esquerdo', {x: -0.12, y: -0.01, z: -0.12});
  carregarModeloOBJ('pneu-td' , 'objetos/car_hatchback_wheel_rear_right.obj', 'Pneu Traseiro Direito', {x: -0.019, y: -0.055, z: -0.045});

  requestAnimationFrame(renderizar); 
}

function redimensionarCanvas() {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    gl.viewport(0, 0, canvas.width, canvas.height); 
  }
}

function atualizarGrafoCena(nodo, matrizGlobalPai) {
  const matEscala = Matriz.escala(nodo.escala[0], nodo.escala[1], nodo.escala[2]);
  const anguloX = nodo.rotacao[0] * (Math.PI / 180);
  const anguloY = nodo.rotacao[1] * (Math.PI / 180);
  const anguloZ = nodo.rotacao[2] * (Math.PI / 180);

  let matRot = Matriz.multiplicar(Matriz.rotacaoX(anguloX), Matriz.rotacaoY(anguloY));
  matRot = Matriz.multiplicar(matRot, Matriz.rotacaoZ(anguloZ));

  const matPos = Matriz.translacao(nodo.posicao[0], nodo.posicao[1], nodo.posicao[2]);

  let matLocal = Matriz.multiplicar(matRot, matEscala);
  nodo.matrizLocal = Matriz.multiplicar(matPos, matLocal);

  if (matrizGlobalPai) { 
    nodo.matrizGlobal = Matriz.multiplicar(matrizGlobalPai, nodo.matrizLocal);
  } else {
    nodo.matrizGlobal = nodo.matrizLocal;
  }

  nodo.filhos.forEach(filho => { 
    atualizarGrafoCena(filho, nodo.matrizGlobal);
  });
}

function renderizar() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
  gl.useProgram(programaGlobal);

  const aspect = canvas.width / canvas.height
  const projecao = Matriz.perspectiva((60 * Math.PI) / 180, aspect, 0.1, 100.0);  
  let visualizacao = Matriz.translacao(0, -2.0, -4.0);   
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoX(anguloCameraX));  
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoY(anguloCameraY)); 

  gl.activeTexture(gl.TEXTURE0); 
  gl.bindTexture(gl.TEXTURE_2D, texturaGlobal);
  gl.uniform1i(u_texturaLoc, 0);

  cena.forEach((obj, index) => {
    if (obj.animacao.ativa){
      obj.posicao[obj.animacao.eixo] += obj.animacao.velocidade; 

      if (index === indiceSelecionado){
        const idsPos = ['pos-x', 'pos-y', 'pos-z'];
        const idHtml = idsPos[obj.animacao.eixo];
        document.getElementById(idHtml).value = obj.posicao[obj.animacao.eixo];
        document.getElementById(`val-${idHtml}`).innerText = obj.posicao[obj.animacao.eixo].toFixed(2);
      }
    }
  });

  cena.forEach(obj => { 
    if (obj.pai === null){
      atualizarGrafoCena(obj, null)
    }
  });

  for (let i = 0; i <cena.length; i++){ 
    const instancia = cena[i];
    const modeloBib = bibliotecaModelos[instancia.modeloId];

    if(!modeloBib || !instancia.matrizGlobal) continue; 

    let matrizFinal = Matriz.multiplicar(visualizacao, instancia.matrizGlobal); 
    matrizFinal = Matriz.multiplicar(projecao, matrizFinal);

    gl.uniformMatrix4fv(u_matrizLoc, false, matrizFinal); 
    gl.uniform3fv(u_corLoc, instancia.cor) 

    gl.bindVertexArray(modeloBib.vao);
    gl.drawArrays(gl.TRIANGLES, 0, modeloBib.contagemVertices);
  }

  requestAnimationFrame(renderizar); 
}

function salvarCena(){
  if (cena.length === 0){
    alert("A cena está vazia, adicone objetos antes de salvar.");
    return;
  }

  const cenaSerializada = cena.map(obj => {
    let indicePai;
    if (obj.pai !== null) {
      indicePai = cena.indexOf(obj.pai);
    } else {
      indicePai = -1;
    }

    return {
      modeloId: obj.modeloId,
      nomeOBJ: obj.nomeOBJ,
      paiIndex: indicePai, 
      posicao: [...obj.posicao],
      rotacao: [...obj.rotacao],
      escala: [...obj.escala],
      cor: [...obj.cor],
      animacao: {...obj.animacao}
    }
  });

  const jsonStr = JSON.stringify(cenaSerializada, null, 2); 

  const blob = new Blob([jsonStr], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Minha_Cena.json';
  a.click();
  URL.revokeObjectURL(url);
}

function carregarCena(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();

  leitor.onload = function(e){
    try {
      const dados = JSON.parse(e.target.result);

      cena.length = 0;
      indiceSelecionado = -1;
      document.getElementById('painel-transformacoes').style.display = 'none';

      dados.forEach(dado =>{
        cena.push({
          modeloId: dado.modeloId,
          nomeOBJ: dado.nomeOBJ,
          pai: null,
          filhos: [],
          matrizLocal: null,
          matrizGlobal: null,
          posicao: [...dado.posicao],
          rotacao: [...dado.rotacao],
          escala: [...dado.escala],
          cor: [...dado.cor],
          animacao: {...dado.animacao}
        });
      });

      dados.forEach((dado, index) => {
        if (dado.paiIndex !== -1){
          const paiObj = cena[dado.paiIndex];
          const filhoObj = cena[index];

          filhoObj.pai = paiObj;
          paiObj.filhos.push(filhoObj);
        }
      });

    atualizarListaCena();

    } catch (erro){
      console.error("Erro ao ler JSON", erro);
    }
    evento.target.value = ''; 
  };

  leitor.readAsText(arquivo);
}

window.onload = inicializarWebGL;