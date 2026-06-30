# Editor de Cenas 3D em WebGL

Este projeto é um motor de renderização e editor de cenas 3D desenvolvido do utilizando **WebGL2**. Ele permite a importação de modelos `.obj`, texturização dinâmica, hierarquia de objetos e salvamento/carregamento de estado via JSON.

## Acesso

Você pode testar a aplicação diretamente no navegador, acessando o link abaixo:

**https://gustavodomenech.github.io/EditorDeCenasEmWebGL/**

## Como rodar localmente

Se você deseja rodar ou modificar o projeto localmente. 

> **Aviso:** Como o WebGL precisa fazer requisições assíncronas (via fetch) para carregar os arquivos .obj e a imagem de textura, as políticas de segurança dos navegadores impedem que o projeto funcione apenas clicando duas vezes no arquivo index.html. É necessário um servidor local.

1. Abra a pasta do projeto no **Visual Studio Code**.
2. Instale a extensão **Live Server** (caso não tenha).
3. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.
4. O editor abrirá automaticamente no seu navegador padrão.