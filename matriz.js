const Matriz = {
    identidade: function(){               //retorna uma matriz identidade
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },

    multiplicar: function(a, b){          //multiplica duas matrizes 4x4 (A x B)
        let res = new Float32Array(16);
        for (let i = 0; i < 4; i++){      //coluna de B
            for (let j = 0; j < 4; j++){  //linha de A
                res[i * 4 + j] =
                    a[0 * 4 + j] * b[i * 4 + 0] +
                    a[1 * 4 + j] * b[i * 4 + 1] +
                    a[2 * 4 + j] * b[i * 4 + 2] +
                    a[3 * 4 + j] * b[i * 4 + 3];
            }
        }
        return res;
    },

    translacao: function(x, y, z){        //matriz de translação
        return new Float32Array([
           1, 0, 0, 0,
           0, 1, 0, 0,
           0, 0, 1, 0,
           x, y, z, 1  
        ]);
    },

    escala: function(sx, sy, sz){         //matriz de escala
        return new Float32Array([
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1
        ]);
    },

    rotacaoY: function(radianos){         //matriz de rotação no eixo y (mais comum pra rotacionar modelo)
        let c = Math.cos(radianos);
        let s = Math.sin(radianos);
        return new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ]);
    },

    rotacaoX:function(radianos){
        let c = Math.cos(radianos);
        let s = Math.sin(radianos);
        return new Float32Array([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ]);
    },

    rotacaoZ: function(radianos) {
        let c = Math.cos(radianos);
        let s = Math.sin(radianos);
        return new Float32Array([
            c,  s, 0, 0,
           -s,  c, 0, 0,
            0,  0, 1, 0,
            0,  0, 0, 1
        ]);
    },

    escala: function(sx, sy, sz){
        return new Float32Array([
            sx, 0, 0, 0,
            0, sy, 0, 0,
            0, 0, sz, 0,
            0, 0, 0, 1
        ]);
    },

    perspectiva: function(fovRadianos, aspect, near, far){ //matriz de projeção(perpectiva)
        let f = 1.0 / Math.tan(fovRadianos / 2);
        let alcance = near - far;

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) / alcance, -1,
            0, 0, (2 * near * far) / alcance, 0
        ]);
    }

};