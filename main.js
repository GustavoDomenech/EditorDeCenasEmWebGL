let gl;
let canvas;
let programaGlobal;
let u_matrizLoc;
let u_corLoc;
let indiceSelecionado = -1 //guarda o objeto sendo editado
const bibliotecaModelos = {}; //guarda a vram
const cena = []; //guarda os objetos na tela


const vertexShaderSource = `#version 300 es
    //atributo que vai receber as coordenadas do vertice do .obj
    in vec3 a_posicao;
    in vec3 a_normal;
    
    //matriz de transformação
    uniform mat4 u_matriz;
    
    out vec3 v_normal;

    void main(){
        gl_Position = u_matriz * vec4(a_posicao, 1.0);
        v_normal = a_normal; //repassa a normal pro fragment shader
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float; //define a precisao dos floats

    in vec3 v_normal;
    uniform vec3 u_cor; //cor a ser enviada
    out vec4 corSaida; //saida de cor do fragmento (pixel)

    void main(){
        vec3 luzDirecao = normalize(vec3(1.0, 1.5, 0.5)); //fonte de luz vindo da diagonal superior
        float luz = max(dot(normalize(v_normal), luzDirecao), 0.3); //calcula se a luz bate de frente com o triangulo, 0.3 = claridade minima
        corSaida = vec4(u_cor * luz, 1.0); //pinta o pixel com a cor escolhida iluminada
    }
`;

function criarShader(gl, tipo, codigoFonte) {
  const shader = gl.createShader(tipo);
  gl.shaderSource(shader, codigoFonte);
  gl.compileShader(shader);

  const sucesso = gl.getShaderParameter(shader, gl.COMPILE_STATUS); //teste
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
  //guarda o tamanho original do canvas
  const larguraOriginal = canvas.width;
  const alturaOriginal = canvas.height;

  canvas.width = 128;
  canvas.height = 128;
  gl.viewport(0, 0, 128, 128);

  //limpa o fundo
  gl.clearColor(0.25, 0.25, 0.25, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(programaGlobal);

  //configura a matriz pra tirar a foto
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
  gl.uniform3fv(u_corLoc, [0.8, 0.8, 0.8]);

  gl.bindVertexArray(modeloBib.vao);
  gl.drawArrays(gl.TRIANGLES, 0, modeloBib.contagemVertices);

  const dataUrl = canvas.toDataURL('image/png'); //tira foto em formato base64
  
  //restaura tudo pra poder continuar
  canvas.width = larguraOriginal;
  canvas.height = alturaOriginal;
  gl.viewport(0, 0, larguraOriginal, alturaOriginal);
  gl.clearColor(0.15, 0.15, 0.15, 1.0);

  return dataUrl;
}

function atualizarListaCena(){ //atualiza a lista de objetos no menu da esquerda
  const lista = document.getElementById('lista-cena');
  if (!lista) return;
  lista.innerHTML = ''; //limpa a lista

  for (let i = 0; i < cena.length; i++){
    const item = document.createElement('li');
    item.innerText = `${cena[i].nomeOBJ} ${i + 1}`;
    item.style.padding = "8px";
    item.style.cursor = "pointer";
    item.style.borderBottom = "1px solid #444"

    if (i === indiceSelecionado){
      item.style.backgroundColor = "#4CAF50"; //pinta de verde se for o objeto selecionado
      item.style.color = "white";
    }

    item.onclick = () => selecionarObjeto(i);
    lista.appendChild(item);
  }
}

function selecionarObjeto(indice){
  indiceSelecionado = indice;
  atualizarListaCena(); //atualiza as cores da lista

  const obj = cena[indice];
  document.getElementById('nome-selecionado').innerText = `${obj.nomeOBJ} ${indice + 1}`;
  document.getElementById('painel-transformacoes').style.display = 'block'; //mostra os inputs

  const selectPai = document.getElementById('sel-pai');
  selectPai.innerHTML = '<option value="-1">Nenhum (Mundo)</option>'; //reseta
  for (let i = 0; i < cena.length; i++){
    if (i !== indice) { //não mostra o objeto na lista
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${cena[i].nomeOBJ} ${i + 1}`;
      selectPai.appendChild(opt);
    }
  }

  if (obj.pai !== null){ //seleciona o pai atual do objeto
    selectPai.value = cena.indexOf(obj.pai);
  } else {
    selectPai.value = -1;
  }

  function setValor(id, valor){ //função auxiliar pra atualizar o slider e o numero ao mesmo tempo
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
  document.getElementById('val-anim-vel').value = obj.animacao.velocidade.toFixed(3);
}

function configurarInputs(){ //fica ouvindo os slider pra alterar o objeto em tempo real
  const ids = ['pos-x', 'pos-y', 'pos-z', 'rot-x', 'rot-y','rot-z', 'esc-x', 'esc-y', 'esc-z'];

  ids.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', (e) => {
      if (indiceSelecionado === -1) return;
      const obj = cena[indiceSelecionado];
      const valor = parseFloat(e.target.value) || 0;

      document.getElementById(`val-${id}`).innerText = valor.toFixed(2); //atualiza o texto verde do lado do nome do slider

      if (id === 'pos-x') obj.posicao[0] = valor; //salva em graus
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

      //impede que um filho seja selecionado como pai do seu pai
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
        
        if (paiAntigo !== null){ //se tinha pai, volta pra absoluta do mundo
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

        if (objFilho.pai){ //remove filgo do pai antigo
          const indexAntigo = objFilho.pai.filhos.indexOf(objFilho);
          if (indexAntigo > -1) objFilho.pai.filhos.splice(indexAntigo, 1);
        }

        if (novoPaiIndice !== -1){ //associa ao novo pai
          const novoPai = cena[novoPaiIndice];
          objFilho.pai = novoPai;
          novoPai.filhos.push(objFilho); //entra na array de filhos
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
  

  const inputCor = document.getElementById('cor-modelo'); //fica ouvindo pra mudar a cor, traduz pra webgl
  if (!inputCor) return;

  inputCor.addEventListener('input', (e) => {
    if (indiceSelecionado === -1) return;
    const hex = e.target.value; //formato rrggbb

    //converte o hexadecimal pra rgb
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;

    cena[indiceSelecionado].cor = [r, g, b]; //guarda na memoria do carro
    });
  }
}

function criarItemMenu(idUnico, nomeOBJ){
  const IconeBase64 = gerarIconeBase64(bibliotecaModelos[idUnico]);
  const divLista = document.getElementById('lista-modelos');

  if (!divLista) return;

  //criar o cartão do botão
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

  //efeito hover
  divItem.onmouseover = () => divItem.style.backgroundColor = "#4CAF50";
  divItem.onmouseout = () => divItem.style.backgroundColor = "#333"

  divItem.onclick = () => {
    cena.push({
      modeloId: idUnico,
      nomeOBJ: nomeOBJ, //nome pra mostrar na lista
      pai: null, //órfão
      filhos: [], //lista que guarda os dependentes dele
      matrizLocal: null, //vai ser calculada
      matrizGlobal: null,//vai ser calculada
      animacao: {ativa: false, eixo: 2, velocidade: 0.01}, //anda no eixo z
      cor: [0.8, 0.8, 0.8],
      posicao: [0, 0, 0],
      rotacao: [0, 0, 0], //em graus, 0 a 360
      escala: [1, 1, 1]
    });

    atualizarListaCena();
  };

  //cria a imagem 3D fotografada
  const img = document.createElement('img');
  img.src = IconeBase64;
  img.style.width = "80px";
  img.style.height = "80px";
  img.style.pointerEvents = "none";
  
  //cria o texto descritivo
  const p = document.createElement('p');
  p.innerText = nomeOBJ;
  p.style.fontSize = "10px";
  p.style.pointerEvents = "none";

  divItem.appendChild(img);
  divItem.appendChild(p);
  divLista.appendChild(divItem);

};

async function carregarModeloOBJ(idUnico ,nomeArquivo, nomeOBJ, configIcone = {x: 0.015, y: -0.015, z: -0.4}) {
  try { 
    const resposta = await fetch(nomeArquivo);
    if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status}`);

    const textoOBJ = await resposta.text();  //extrai o texto bruto
    const dadosModelo = parseOBJ(textoOBJ);  //passa pelo parser
    
    const novoVao = gl.createVertexArray();
    gl.bindVertexArray(novoVao);

    const a_posicaoLoc = gl.getAttribLocation(programaGlobal, "a_posicao");
    const a_normalLoc = gl.getAttribLocation(programaGlobal, "a_normal");

    //buffer de posições
    const bufferPosicao = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicao);
    gl.bufferData(gl.ARRAY_BUFFER, dadosModelo.posicoes, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_posicaoLoc);
    gl.vertexAttribPointer(a_posicaoLoc, 3, gl.FLOAT, false, 0, 0);

    //buffer de normais
    const bufferNormal = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferNormal);
    gl.bufferData(gl.ARRAY_BUFFER, dadosModelo.normais, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_normalLoc);
    gl.vertexAttribPointer(a_normalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null); //trava o vao

    bibliotecaModelos[idUnico] = {
      vao: novoVao,
      contagemVertices: dadosModelo.contagemVertices,
      configIcone: configIcone
    };

    criarItemMenu(idUnico, nomeOBJ); //gera e adiciona botão no menu da direita

    console.log(`Modelo '${idUnico}' carregado e salvo na biblioteca`);
  } catch (erro){
    console.error("Falha no pipeline de carregamento", erro);
  }
}

function inicializarWebGL() {
  canvas = document.getElementById("canvas-webgl");
  gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true }); //preserve permite tirar a foto do canvas

  if (!gl) {
    alert("Não suporta WebGl2");
    return;
  }

  //compilar os shaders
  const vertexShader = criarShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = criarShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  programaGlobal = criarPrograma(gl, vertexShader, fragmentShader);
  u_matrizLoc = gl.getUniformLocation(programaGlobal, "u_matriz");
  u_corLoc = gl.getUniformLocation(programaGlobal, "u_cor");

  redimensionarCanvas(); //tamanho inicial
  window.addEventListener("resize", redimensionarCanvas); //arrumar canvas quando a janela muda de tamanho

  gl.clearColor(0.15, 0.15, 0.15, 1.0); //cinza escuro
  gl.enable(gl.DEPTH_TEST); //teste de profundidade, z-buffer

  configurarInputs(); //liga os eventos da caixa de texto html

  carregarModeloOBJ('carro', 'objetos/car_hatchback.obj', 'Chassi do Carro', {x: 0.015, y: -0.015, z: -0.4});
  carregarModeloOBJ('banco', 'objetos/bench.obj', 'Banco', {x: -0.015, y: -0.015, z: -0.2});
  carregarModeloOBJ('pneu-de' , 'objetos/car_hatchback_wheel_front_left.obj', 'Pneu Dianteiro Esquerdo', {x: 0.019, y: 0.053, z: -0.24});
  carregarModeloOBJ('pneu-dd' , 'objetos/car_hatchback_wheel_front_right.obj', 'Pneu Dianteiro Direito', {x: 0.019, y: 0.053, z: -0.24});
  carregarModeloOBJ('pneu-te' , 'objetos/car_hatchback_wheel_rear_left.obj', 'Pneu Traseiro Esquerdo', {x: 0.019, y: 0.053, z: -0.24});
  carregarModeloOBJ('pneu-td' , 'objetos/car_hatchback_wheel_rear_right.obj', 'Pneu Traseiro Direito', {x: 0.019, y: 0.053, z: -0.24});

  requestAnimationFrame(renderizar); //inicia o loop da aplicação
}

function redimensionarCanvas() {
  //pega o tamanho real que o CSS ta dando
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    gl.viewport(0, 0, canvas.width, canvas.height); //avisa gpu o tamanho novo
  }
}

function atualizarGrafoCena(nodo, matrizGlobalPai) {
  //calcula a matriz local do objeto sozinho
  const matEscala = Matriz.escala(nodo.escala[0], nodo.escala[1], nodo.escala[2]);
  const anguloX = nodo.rotacao[0] * (Math.PI / 180);
  const anguloY = nodo.rotacao[1] * (Math.PI / 180);
  const anguloZ = nodo.rotacao[2] * (Math.PI / 180);

  let matRot = Matriz.multiplicar(Matriz.rotacaoX(anguloX), Matriz.rotacaoY(anguloY));
  matRot = Matriz.multiplicar(matRot, Matriz.rotacaoZ(anguloZ));

  const matPos = Matriz.translacao(nodo.posicao[0], nodo.posicao[1], nodo.posicao[2]);

  let matLocal = Matriz.multiplicar(matRot, matEscala);
  nodo.matrizLocal = Matriz.multiplicar(matPos, matLocal);

  if (matrizGlobalPai) { //calcula a global, se tem pai multiplica, se n tem é a própria
    nodo.matrizGlobal = Matriz.multiplicar(matrizGlobalPai, nodo.matrizLocal);
  } else {
    nodo.matrizGlobal = nodo.matrizLocal;
  }

  nodo.filhos.forEach(filho => { //propaga a matriz global pronta pra todos os filhos
    atualizarGrafoCena(filho, nodo.matrizGlobal);
  });
}

//o loop
function renderizar() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //limpa tela e o buffer de profundidade
  gl.useProgram(programaGlobal);

  //configura a projeção (lente da camera)
  const aspect = canvas.width / canvas.height
  const projecao = Matriz.perspectiva((60 * Math.PI) / 180, aspect, 0.1, 100.0);  //campo de visão de 60 graus, baseado na tela do canvas
  let visualizacao = Matriz.translacao(0, -2.0, -4.0);   //configura a visualização (posição da camera da cena principal)
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoX(Math.PI / 6));  //gira o mundo em 30 graus (cima)
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoY(-Math.PI / 4)); //gira o mundo em 45 graus (diagonal)

  cena.forEach((obj, index) => {
    if (obj.animacao.ativa){
      obj.posicao[obj.animacao.eixo] += obj.animacao.velocidade; //soma a velocidade na posição do eixo escolhido

      if (index === indiceSelecionado){
        const idsPos = ['pos-x', 'pos-y', 'pos-z'];
        const idHtml = idsPos[obj.animacao.eixo];
        document.getElementById(idHtml).value = obj.posicao[obj.animacao.eixo];
        document.getElementById(`val-${idHtml}`).innerText = obj.posicao[obj.animacao.eixo].toFixed(2);
      }
    }
  });

  cena.forEach(obj => { //atualiza a arvore, busca quem n tem pai e inicia a cascata
    if (obj.pai === null){
      atualizarGrafoCena(obj, null)
    }
  });

  for (let i = 0; i <cena.length; i++){ //percorre os objetos que estão na lista da cena
    const instancia = cena[i];
    const modeloBib = bibliotecaModelos[instancia.modeloId];

    if(!modeloBib || !instancia.matrizGlobal) continue; //pula o modelo se ele n foi baixado

    let matrizFinal = Matriz.multiplicar(visualizacao, instancia.matrizGlobal); //ja pega a matriz pronta, sem precisar calcular de novo
    matrizFinal = Matriz.multiplicar(projecao, matrizFinal);

    gl.uniformMatrix4fv(u_matrizLoc, false, matrizFinal); //envia a matriz pra GPU
    gl.uniform3fv(u_corLoc, instancia.cor); //envia a cor escolhida pra gpu

    //pega o endereço de memoria vao na biblioteca e desenha
    gl.bindVertexArray(modeloBib.vao);
    gl.drawArrays(gl.TRIANGLES, 0, modeloBib.contagemVertices);
  }

  requestAnimationFrame(renderizar); //chama a função de novo no próximo frame
}

window.onload = inicializarWebGL; //executa a inicialização quando o html termina de carregar
