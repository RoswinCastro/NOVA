// src/App.tsx
import { Home, Shield, FileText, User, Settings, ClipboardList, LogOut } from 'lucide-react';
import { useState } from 'react';
import logoInicio from '../imports/nova-removebg-preview-1.png';
import { Login } from './components/Login';
import { ArmasModule } from './components/ArmasModule';
import { RegistroModule } from './components/RegistroModule';
import { RegistroEntradaSalidaModule } from './components/RegistroEntradaSalidaModule';
import { PersonalModule } from './components/PersonalModule';
import { AjustesModule } from './components/AjustesModule';
import { AuthProvider, useAuth } from './components/AuthContext';

// ============================================
// COMPONENTE INTERNO PARA MANEJAR LA LÓGICA
// ============================================
function ContentApp() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('inicio');
  const [barraLateralHorizontal, setBarraLateralHorizontal] = useState(false);

  // Si no hay usuario autenticado, mostrar Login
  if (!user) {
    return <Login />;
  }

  // Función para obtener clases de los botones de la barra lateral
  const getButtonClass = (section: string) => `
    flex flex-row md:flex-col items-center gap-2 p-3 rounded-lg transition-colors w-auto md:w-16 
    ${activeSection === section ? 'bg-black text-white' : 'text-white hover:bg-[#0052cc]'}
  `;

  // Renderizar el contenido según la sección activa
  const renderContent = () => {
    switch (activeSection) {
      case 'inicio':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <h1 className="text-4xl mb-8 font-bold text-gray-800">BIENVENIDO</h1>
            <img 
              src={logoInicio} 
              alt="Logo NOVA" 
              className="w-[300px] h-auto object-contain animate-fade-in" 
            />
            <p className="mt-4 text-gray-600 text-center max-w-md">
              Sistema de gestión de armas y personal
            </p>
          </div>
        );
      case 'armas':
        return <ArmasModule />;
      case 'registro':
        return <RegistroEntradaSalidaModule />;
      case 'historial':
        return <RegistroModule />;
      case 'personal':
        return <PersonalModule />;
      case 'configuracion':
        // Solo admin puede ver ajustes
        if (user.role === 'admin') {
          return (
            <AjustesModule
              barraLateralHorizontal={barraLateralHorizontal}
              setBarraLateralHorizontal={setBarraLateralHorizontal}
            />
          );
        }
        return (
          <div className="text-center text-red-500">
            <p>Acceso denegado. Solo administradores.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`size-full bg-white min-h-screen ${
        barraLateralHorizontal ? 'flex flex-col' : 'flex flex-col md:flex-row'
      }`}
    >
      {/* ============================================
      BARRA LATERAL (SIDEBAR)
      ============================================ */}
      <div
        className={`bg-[#0066ff] shadow-lg overflow-x-auto ${
          barraLateralHorizontal
            ? 'flex w-full flex-row items-center gap-2 p-2'
            : 'flex w-full flex-row items-center gap-2 p-2 md:w-20 md:flex-col md:gap-6 md:py-6'
        }`}
      >
        {/* Botón Inicio */}
        <button 
          onClick={() => setActiveSection('inicio')} 
          className={getButtonClass('inicio')}
          title="Inicio"
        >
          <Home size={24} />
          <span className="text-xs">Inicio</span>
        </button>

        {/* Botón Armas */}
        <button 
          onClick={() => setActiveSection('armas')} 
          className={getButtonClass('armas')}
          title="Armas"
        >
          <Shield size={24} />
          <span className="text-xs">Armas</span>
        </button>

        {/* Botón Registro (Entrada/Salida) */}
        <button 
          onClick={() => setActiveSection('registro')} 
          className={getButtonClass('registro')}
          title="Registro Entrada/Salida"
        >
          <ClipboardList size={24} />
          <span className="text-xs">Registro</span>
        </button>

        {/* Botón Historial */}
        <button 
          onClick={() => setActiveSection('historial')} 
          className={getButtonClass('historial')}
          title="Historial"
        >
          <FileText size={24} />
          <span className="text-xs">Historial</span>
        </button>

        {/* Botón Personal */}
        <button 
          onClick={() => setActiveSection('personal')} 
          className={getButtonClass('personal')}
          title="Personal"
        >
          <User size={24} />
          <span className="text-xs">Personal</span>
        </button>

        {/* Separador en desktop */}
        <div className={`${barraLateralHorizontal ? 'flex-1' : 'hidden md:flex flex-1'}`}></div>

        {/* Botón Ajustes (solo admin) */}
        {user.role === 'admin' && (
          <button 
            onClick={() => setActiveSection('configuracion')} 
            className={getButtonClass('configuracion')}
            title="Ajustes"
          >
            <Settings size={24} />
            <span className="text-xs">Ajustes</span>
          </button>
        )}

        {/* Botón Salir */}
        <button 
          onClick={logout} 
          className="flex flex-row md:flex-col items-center gap-2 p-3 rounded-lg w-auto md:w-16 text-white hover:bg-red-600 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={24} />
          <span className="text-xs">Salir</span>
        </button>
      </div>

      {/* ============================================
      ÁREA PRINCIPAL DE CONTENIDO
      ============================================ */}
      <div className="flex-1 p-4 md:p-8 overflow-auto bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORTACIÓN PRINCIPAL DE LA APP
// ============================================
export default function App() {
  return (
    <AuthProvider>
      <ContentApp />
    </AuthProvider>
  );
}
