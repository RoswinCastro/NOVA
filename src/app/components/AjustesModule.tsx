import { LayoutPanelTop, Moon, PanelLeft, Sun, Type } from 'lucide-react';

interface AjustesModuleProps {
  barraLateralHorizontal: boolean;
  setBarraLateralHorizontal: (value: boolean) => void;
  tema: 'claro' | 'oscuro';
  setTema: (value: 'claro' | 'oscuro') => void;
  tamanoLetra: string;
  setTamanoLetra: (value: string) => void;
}

export function AjustesModule({
  barraLateralHorizontal,
  setBarraLateralHorizontal,
  tema,
  setTema,
  tamanoLetra,
  setTamanoLetra,
}: AjustesModuleProps) {
  const cardClass = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6';
  const sectionIconClass =
    tema === 'oscuro'
      ? 'rounded-xl bg-slate-800 p-3 text-blue-300'
      : 'rounded-xl bg-blue-50 p-3 text-blue-600';

  const selectedOptionClass =
    tema === 'oscuro'
      ? 'border-blue-400 bg-slate-800 ring-2 ring-blue-500/20'
      : 'border-blue-500 bg-blue-50 ring-2 ring-blue-100';

  const unselectedOptionClass =
    tema === 'oscuro'
      ? 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'
      : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50';

  const labelClass = tema === 'oscuro' ? 'font-medium text-gray-100' : 'font-medium text-gray-800';
  const scaleChipClass =
    tema === 'oscuro'
      ? 'rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-gray-100 shadow-sm'
      : 'rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm';
  const scalePanelClass = tema === 'oscuro' ? 'rounded-xl bg-slate-900 px-5 py-4' : 'rounded-xl bg-gray-50 px-5 py-4';

  return (
    <div>
      <h1 className="mb-6 text-center">Ajustes</h1>

      <div className="mx-auto max-w-4xl space-y-6">
        <div className={cardClass}>
          <div className="mb-4 text-center">
            <h3>Tema</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setTema('claro')}
              className={`rounded-xl border px-5 py-4 text-left transition-all ${
                tema === 'claro'
                  ? selectedOptionClass
                  : unselectedOptionClass
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={tema === 'oscuro' ? 'rounded-lg bg-slate-700 p-2 shadow-sm' : 'rounded-lg bg-white p-2 shadow-sm'}>
                  <Sun className="h-5 w-5 text-amber-500" />
                </div>
                <span className={labelClass}>Modo claro</span>
              </div>
            </button>

            <button
              onClick={() => setTema('oscuro')}
              className={`rounded-xl border px-5 py-4 text-left transition-all ${
                tema === 'oscuro'
                  ? selectedOptionClass
                  : unselectedOptionClass
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 shadow-sm ${tema === 'oscuro' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Moon className={`h-5 w-5 ${tema === 'oscuro' ? 'text-blue-300' : 'text-slate-700'}`} />
                </div>
                <span className={labelClass}>Modo oscuro</span>
              </div>
            </button>
          </div>
        </div>

        <div className={`${cardClass} hidden md:block`}>
          <div className="mb-4 flex items-center gap-3">
            <div className={sectionIconClass}>
              <Type className="h-5 w-5" />
            </div>
            <h3>Tamaño de Letra</h3>
          </div>

          <div className={scalePanelClass}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Escala</span>
              <span className={scaleChipClass}>
                {tamanoLetra}px
              </span>
            </div>
            <input
              type="range"
              min="12"
              max="20"
              value={tamanoLetra}
              onChange={(event) => setTamanoLetra(event.target.value)}
              className="w-full accent-[#0066ff]"
            />
          </div>
        </div>

        <div className={`${cardClass} hidden md:block`}>
          <div className="mb-4 flex items-center gap-3">
            <div className={sectionIconClass}>
              {barraLateralHorizontal ? <LayoutPanelTop className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </div>
            <h3>Posición de Barra de Navegación</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setBarraLateralHorizontal(false)}
              className={`rounded-xl border px-5 py-4 text-left transition-all ${
                !barraLateralHorizontal
                  ? selectedOptionClass
                  : unselectedOptionClass
              }`}
            >
              <div className="flex items-center gap-3">
                <PanelLeft className="h-5 w-5 text-blue-600" />
                <span className={labelClass}>Lateral</span>
              </div>
            </button>

            <button
              onClick={() => setBarraLateralHorizontal(true)}
              className={`rounded-xl border px-5 py-4 text-left transition-all ${
                barraLateralHorizontal
                  ? selectedOptionClass
                  : unselectedOptionClass
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutPanelTop className="h-5 w-5 text-blue-600" />
                <span className={labelClass}>Horizontal</span>
              </div>
            </button>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="mb-4">Información del Sistema</h3>
          <div className="space-y-2 text-gray-600">
            <p>Versión: 1.0.0</p>
            <p>Sistema de Monitoreo NOVA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
