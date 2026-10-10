// Gera os PNG do PWA em public/icones/ a partir de assets/icone.svg (rodar só quando o SVG mudar).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateAssets } from '@vite-pwa/assets-generator/api/generate-assets';
import { instructions } from '@vite-pwa/assets-generator/api/instructions';
import { lerToken } from './lerToken.mjs';

const aqui = (caminho) => fileURLToPath(new URL(caminho, import.meta.url));
const corFundo = lerToken(readFileSync(aqui('../src/estilo/tokens.css'), 'utf8'), '--cor-fundo');
// O SVG já traz fundo cheio e o desenho dentro da zona segura de 80%: sem recuo extra.
const opcoes = { padding: 0, resizeOptions: { fit: 'contain', background: corFundo } };
const nomes = {
  transparent: (largura) => `icone-${largura}.png`,
  maskable: (largura) => `icone-maskable-${largura}.png`,
  apple: () => 'apple-touch-icon.png',
};

const origem = aqui('../assets/icone.svg');
const plano = await instructions({
  imageResolver: () => Promise.resolve(readFileSync(origem)),
  imageName: origem,
  originalName: 'assets/icone.svg',
  preset: {
    transparent: { sizes: [192, 512], ...opcoes },
    maskable: { sizes: [512], ...opcoes },
    apple: { sizes: [180], ...opcoes },
    assetName: (tipo, { width }) => nomes[tipo](width),
  },
  htmlLinks: { xhtml: false, includeId: false },
  basePath: '/icones/',
  resolveSvgName: (nome) => nome,
});
await generateAssets(plano, true, aqui('../public/icones'), (mensagem) => console.log(mensagem));
