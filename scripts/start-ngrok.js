const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels';
const ENV_PATH = path.join(__dirname, '..', '.env.local');

async function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const tunnel = parsed.tunnels.find(t => t.proto === 'https');
          if (tunnel) {
            resolve(tunnel.public_url);
          } else {
            reject(new Error('Túnel HTTPS não encontrado'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function updateEnvFile(ngrokUrl) {
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');

  // Atualizar ML_REDIRECT_URI
  const newRedirectUri = `${ngrokUrl}/api/auth/mercadolivre/callback`;
  envContent = envContent.replace(
    /ML_REDIRECT_URI=.*/,
    `ML_REDIRECT_URI=${newRedirectUri}`
  );

  // Atualizar NEXT_PUBLIC_APP_URL
  envContent = envContent.replace(
    /NEXT_PUBLIC_APP_URL=.*/,
    `NEXT_PUBLIC_APP_URL=${ngrokUrl}`
  );

  fs.writeFileSync(ENV_PATH, envContent);

  return newRedirectUri;
}

async function startNgrok() {
  console.log('🚀 Iniciando ngrok na porta 3000...\n');

  const ngrok = spawn('ngrok', ['http', '3000'], {
    stdio: 'inherit'
  });

  ngrok.on('error', (error) => {
    console.error('❌ Erro ao iniciar ngrok:', error.message);
    console.log('\n💡 Certifique-se de que o ngrok está instalado:');
    console.log('   npm install -g ngrok');
    console.log('   ou baixe em: https://ngrok.com/download\n');
    process.exit(1);
  });

  // Aguardar o ngrok iniciar
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const ngrokUrl = await getNgrokUrl();
    const redirectUri = updateEnvFile(ngrokUrl);

    console.log('\n✅ Ngrok configurado com sucesso!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 URL PÚBLICA DO NGROK:');
    console.log(`   ${ngrokUrl}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔧 CONFIGURAÇÃO DO MERCADO LIVRE:');
    console.log('   Acesse: https://developers.mercadolivre.com.br/apps/');
    console.log('   Vá em "Editar" no seu aplicativo');
    console.log('   Cole esta URL em "Redirect URI":\n');
    console.log(`   ${redirectUri}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('   1. Configure o Redirect URI acima no painel do ML');
    console.log('   2. Reinicie o servidor Next.js para carregar as novas variáveis');
    console.log('   3. Mantenha este terminal aberto enquanto testa\n');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro ao obter URL do ngrok:', error.message);
    console.log('💡 Verifique se o ngrok está rodando corretamente\n');
    process.exit(1);
  }

  // Manter o processo rodando
  process.on('SIGINT', () => {
    console.log('\n\n👋 Encerrando ngrok...');
    ngrok.kill();
    process.exit(0);
  });
}

startNgrok();
