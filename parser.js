function parseOBJ(textoArquivo) {
  //arrays temporarios (tabela de simbolos)
  const posicoesBrutas = [];
  const texCoordsBrutas = [];
  const normaisBrutas = [];

  //arrays finais que vao pra vram
  const posicoesFinais = [];
  const texCoordsFinais = [];
  const normaisFinais = [];

  const linhas = textoArquivo.split("\n"); //quebra o arquivo e um array de linhas

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim(); //remove espaço extra no começo e fim da linha

    if (linha === "" || linha.startsWith("#") || linha.startsWith('mtllib') ||
        linha.startsWith('o') || linha.startsWith('usemtl') || linha.startsWith('s')) {
      //ignora comentarios, linhas vazias, materiais e nomes de objetos
      continue;
    }

    //divide a linha pelos espaços em branco
    const partes = linha.split(/\s+/);
    const tipoRegistro = partes[0];

    if (tipoRegistro === "v") {
      posicoesBrutas.push([
        //empilha as coordenadas x, y, z, convertidas pra float
        parseFloat(partes[1]),
        parseFloat(partes[2]),
        parseFloat(partes[3]),
      ]);
    } else if (tipoRegistro === "vt") {
      //empilha o mapeamento de textura u, v
      texCoordsBrutas.push([
        parseFloat(partes[1]),
        parseFloat(partes[2])
        ]);
    } else if (tipoRegistro === "vn") {
      normaisBrutas.push([
        //empilha as normais x, y, z
        parseFloat(partes[1]),
        parseFloat(partes[2]),
        parseFloat(partes[3]),
      ]);
    } else if (tipoRegistro === "f") {

        const verticesFace = partes.slice(1) //tira o f da frente
        
        //faz a triangulação
        for (let j = 1; j < verticesFace.length - 1; j++){ //monta o trinagulo usando 0, j e j+1
            const v0 = verticesFace[0].split('/');
            const v1 = verticesFace[j].split('/');
            const v2 = verticesFace[j + 1].split('/');

            const triangulo = [v0, v1, v2];

            for (let k = 0; k < 3; k++){ //processa os 3 vertices do triangulo
                const dadosVertice = triangulo[k];

                //posicao
                const indicePos = parseInt(dadosVertice[0]) - 1; //subtrai 1 pra bater com as arrays do JS
                const pos = posicoesBrutas[indicePos];
                posicoesFinais.push(pos[0], pos[1], pos[2]);

                //textura
                if (dadosVertice[1]){
                    const indiceTex = parseInt(dadosVertice[1]) - 1;
                    const tex = texCoordsBrutas[indiceTex];
                    texCoordsFinais.push(tex[0], 1.0 - tex[1]); //desinverte o eixo v
                } else {
                    texCoordsFinais.push(0.0, 0.0); //joga um valor neutro caso n tenha textura
                }
                
                //normal
                if (dadosVertice[2]){
                    const indiceNormal = parseInt(dadosVertice[2]) - 1;
                    const norm = normaisBrutas[indiceNormal];
                    normaisFinais.push(norm[0], norm[1], norm[2]);
                }
            }
        }
    }
  }
  return{
    posicoes: new Float32Array(posicoesFinais),
    texCoords: new Float32Array(texCoordsFinais),
    normais: new Float32Array(normaisFinais),
    contagemVertices: posicoesFinais.length / 3 //a contagem é desenhar o tamanho divido por 3
  };
}
