let gl;
let canvas;
let programaGlobal;
let u_matrizLoc;

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
    out vec4 corSaida; //saida de cor do fragmento (pixel)

    void main(){
        vec3 corNormal = v_normal * 0.5 + 0.5; //ajusta a normal pra virar rgb válido
        corSaida = vec4(corNormal, 1.0);
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
  let matPos = Matriz.translacao(0.015, -0.015, -0.4)

  let matModelo = Matriz.multiplicar(matRot, matEscala);
  matModelo = Matriz.multiplicar(matPos, matModelo);

  let matrizFinal = Matriz.multiplicar(projecao, matModelo);

  gl.uniformMatrix4fv(u_matrizLoc, false, matrizFinal);

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
      posicao: [(Math.random() - 0.5) * 4, -0.2, (Math.random() - 0.5) * -4 - 1],
      rotacao: [0, 0, 0],
      escala: [1, 1, 1]
    });
  };

  //cria a imagem 3D fotografada
  const img = document.createElement('img');
  img.src = IconeBase64;
  img.style.width = "80px";
  img.style.height = "80px";
  img.style.pointerEvents = "none;"
  
  //cria o texto descritivo
  const p = document.createElement('p');
  p.innerText = nomeOBJ;
  p.style.fontSize = "10px";
  img.style.pointerEvents = "none;"

  divItem.appendChild(img);
  divItem.appendChild(p);
  divLista.appendChild(divItem);

};

async function carregarModeloOBJ(idUnico ,nomeArquivo, nomeOBJ) {
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
      contagemVertices: dadosModelo.contagemVertices
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

  redimensionarCanvas(); //tamanho inicial
  window.addEventListener("resize", redimensionarCanvas); //arrumar canvas quando a janela muda de tamanho

  gl.clearColor(0.15, 0.15, 0.15, 1.0); //cinza escuro
  gl.enable(gl.DEPTH_TEST); //teste de profundidade, z-buffer

  carregarModeloOBJ('carro', 'car_hatchback.obj', 'Hatchback do Carro');

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
//o loop
function renderizar() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //limpa tela e o buffer de profundidade
  gl.useProgram(programaGlobal);

  //configura a projeção (lente da camera)
  const aspect = canvas.width / canvas.height
  const projecao = Matriz.perspectiva((60 * Math.PI) / 180, aspect, 0.1, 100.0);  //campo de visão de 60 graus, baseado na tela do canvas
  let visualizacao = Matriz.translacao(0, -2.0, -4.0);   //configura a visualização (posição da camera)
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoX(Math.PI / 6));  //gira o mundo em 30 graus (cima)
  visualizacao = Matriz.multiplicar(visualizacao, Matriz.rotacaoY(-Math.PI / 4)); //gira o mundo em 45 graus (diagonal)


  for (let i = 0; i <cena.length; i++){ //percorre os objetos que estão na lista da cena
    const instancia = cena[i];
    const modeloBib = bibliotecaModelos[instancia.modeloId];

    if(!modeloBib) continue; //pula o modelo se ele n foi baixado

    //calcula a matriz baseada nas propriedades desta instancia especifica
    const matEscala = Matriz.escala(instancia.escala[0], instancia.escala[1], instancia.escala[2]);
    const matRot = Matriz.rotacaoY(instancia.rotacao[1]);
    const matPos = Matriz.translacao(instancia.posicao[0], instancia.posicao[1], instancia.posicao[2]);

    let matModelo = Matriz.multiplicar(matRot, matEscala);
    matModelo = Matriz.multiplicar(matPos, matModelo);

    let matrizFinal = Matriz.multiplicar(visualizacao, matModelo);
    matrizFinal = Matriz.multiplicar(projecao, matrizFinal);

    gl.uniformMatrix4fv(u_matrizLoc, false, matrizFinal); //envia a matriz pra GPU

    //pega o endereço de memoria vao na biblioteca e desenha
    gl.bindVertexArray(modeloBib.vao);
    gl.drawArrays(gl.TRIANGLES, 0, modeloBib.contagemVertices);
  }



  requestAnimationFrame(renderizar); //chama a função de novo no próximo frame
}

window.onload = inicializarWebGL; //executa a inicialização quando o html termina de carregar
