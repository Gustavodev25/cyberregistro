'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    // Decodificar o token para obter informações do usuário
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsuario(payload);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />

        {/* Main Content - Vazio */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Conteúdo vazio - pronto para ser adicionado */}
          </div>
        </main>
      </div>
    </div>
  );
}
