'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface Usage {
  used_at: string;
  discount_applied: number;
}

interface CupomData {
  cupom: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    is_active: boolean;
  };
  stats: {
    total_uses: number;
    total_discount: number;
    recent_usage: Usage[];
  };
}

export default function PartnerCouponPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<CupomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/parceiro/cupom/${token}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'Erro ao carregar dados');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-600">Carregando dados...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <div className="text-red-500 font-medium mb-2">{error}</div>
        <p className="text-neutral-600">Verifique se o link está correto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Cyber Registro"
              width={180}
              height={180}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Painel do Parceiro
          </h1>
          <p className="mt-2 text-neutral-600">
            Acompanhe o desempenho do seu cupom de desconto
          </p>
        </div>

        {/* Coupon Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Seu Código</p>
          <div className="text-5xl font-mono font-bold text-[#2F4F7F] tracking-wider mb-4">
            {data.cupom.code}
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            {data.cupom.discount_type === 'percentage' 
              ? `${data.cupom.discount_value}% de Desconto` 
              : `R$ ${data.cupom.discount_value} de Desconto`}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Total de Usos</p>
                <p className="mt-2 text-3xl font-bold text-neutral-900">
                  {data.stats.total_uses}
                  {data.cupom.max_uses && <span className="text-lg text-neutral-400 font-normal"> / {data.cupom.max_uses}</span>}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">Total Economizado</p>
                <p className="mt-2 text-3xl font-bold text-neutral-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.stats.total_discount)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Usage History */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h3 className="text-lg font-medium text-neutral-900">Histórico Recente</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Desconto Aplicado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {data.stats.recent_usage.length > 0 ? (
                  data.stats.recent_usage.map((usage, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                        {new Date(usage.used_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usage.discount_applied)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-neutral-500">
                      Nenhum uso registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
