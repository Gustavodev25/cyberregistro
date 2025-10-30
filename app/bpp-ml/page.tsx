'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function BppMlPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      JSON.parse(atob(token.split('.')[1]));
    } catch {
      router.push('/login');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const targetUrl = 'https://www.mercadolivre.com.br/noindex/pppi/rights/enroll';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} onLogout={() => { localStorage.removeItem('token'); router.push('/login'); }} />
        <main className="flex-1 overflow-hidden bg-neutral-50">
          <div className="h-full px-6 py-3 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
              <h1 className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-lg bg-[#2F4F7F] text-white px-4 py-1.5 shadow-lg">
                  <span className="block text-base md:text-lg font-bold leading-tight tracking-wide">BRAND PROTECTION PROGRAM</span>
                </span>
                <span className="inline-block rounded-lg bg-[#2F4F7F] text-white px-3 py-1 shadow-lg">
                  <span className="block text-sm font-semibold tracking-wide">MERCADO LIVRE</span>
                </span>
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                O formulário do Mercado Livre não permite incorporação em iframe (CSP frame-ancestors).
              </p>
            </div>

            {/* Conteudo principal */}
            <div className="flex-1 overflow-hidden flex flex-col mt-2">
              <div className="text-left mb-3">
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">
                  Abra o formulário para continuar
                </h3>
                <p className="text-base text-neutral-600">
                  O formulário do Mercado Livre será aberto em uma nova aba. Após concluir, você pode retornar aqui.
                </p>
                <p className="mt-1.5 text-sm text-neutral-500">Nota: em breve, alguns campos poderão ser preenchidos automaticamente a partir do seu cadastro (opcional).</p>
              </div>

              {/* Passo a passo */}
              <div className="flex-1 overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-4 h-full">
                  {/* Coluna 1 */}
                  <div className="space-y-3 overflow-y-auto">
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">1</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Abrir o formulário</div>
                        <div className="text-base text-neutral-600 mt-1">Clique em "Abrir formulário no Mercado Livre" (nova aba).</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">2</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Tipo de usuário</div>
                        <div className="text-base text-neutral-600 mt-1">Em "Que tipo de usuário você quer cadastrar?", selecione "Sou um titular de direitos".</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">3</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Informações da pessoa ou empresa</div>
                        <div className="text-base text-neutral-600 mt-1">Use os mesmos dados de autor e titular da obra registrados na CYBER REGISTRO e anexe o documento pessoal do autor e do titular.</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">4</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Dados Públicos</div>
                        <div className="text-base text-neutral-600 mt-1">Nome público: sugerimos "Nome + Sobrenome + CYBER". Em "e-mail de contato", use um e-mail novo (nunca usado no ML) e diferente do "e-mail corporativo".</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">5</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Dados do administrador da conta</div>
                        <div className="text-base text-neutral-600 mt-1">Você deve usar os dados da sua conta do Mercado Livre que deseja proteger (PF/PJ), conforme seus respectivos dados.</div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2 */}
                  <div className="space-y-3 overflow-y-auto">
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">6</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Direitos a cadastrar</div>
                        <div className="text-base text-neutral-600 mt-1">Selecione "Direitos autorais" e cadastre um direito já registrado conosco. Escolha 1 anúncio para começar e anexe 2 PDFs: (1) imagens do anúncio agrupadas, (2) certificado do registro.</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">7</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Validação por e-mail</div>
                        <div className="text-base text-neutral-600 mt-1">Um código será enviado ao e-mail definido em Dados Públicos. Verifique sua caixa de entrada e informe o código para concluir.</div>
                      </div>
                    </div>
                    <div className="flex gap-3.5 items-start rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="h-9 w-9 rounded-full bg-[#2F4F7F] text-white flex items-center justify-center text-lg font-semibold flex-shrink-0">8</div>
                      <div>
                        <div className="text-lg font-semibold text-neutral-900">Aguardar análise do BPP</div>
                        <div className="text-base text-neutral-600 mt-1">Após enviar, aguarde a análise do BPP e o retorno no e-mail informado em Dados Públicos com os próximos passos.</div>
                      </div>
                    </div>

                    {/* Checklist rápido */}
                    <div className="rounded-lg border border-neutral-200 bg-white p-4">
                      <div className="text-lg font-semibold text-neutral-900 mb-2">Checklist rápido (recomendado)</div>
                      <ul className="list-disc pl-5 space-y-1.5 text-base text-neutral-700">
                        <li>PDF com imagens do anúncio (agrupar imagens)</li>
                        <li>PDF do certificado de registro (Cyber Registro)</li>
                        <li>Documento pessoal do autor e do titular</li>
                        <li>E-mail de contato novo (Dados Públicos) e diferente do e-mail corporativo</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acao principal */}
              <div className="mt-4 flex items-center justify-center flex-shrink-0">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-10 py-3.5 bg-[#2F4F7F] text-white rounded-lg hover:bg-[#253B65] transition-all hover:shadow-lg font-semibold text-lg"
                >
                  Abrir formulário do BPP - ML
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
