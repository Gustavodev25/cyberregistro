'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      name: 'Página Inicial',
      href: '/dashboard',
    },
    {
      name: 'Anuncios',
      href: '/anuncios',
    },
    {
      name: 'Contas Mercado Livre',
      href: '/contas-conectadas',
    },
    {
      name: 'Registro',
      href: '/registro',
    },
    {
      name: 'BPP ML',
      href: '/bpp-ml',
    },
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-64 bg-white
          border-r border-neutral-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-200">
            <h1 className="text-xl font-semibold text-neutral-900">
              Cyber Registro
            </h1>
            <button
              onClick={onClose}
              className="lg:hidden text-neutral-500 hover:text-neutral-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu de navegaï¿½ï¿½Çœo */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        block px-3 py-2 rounded-md text-sm
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-black/5 text-neutral-900 font-medium'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }
                      `}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}





