/**
 * Stile der OS-Oberflächen, früher global im Root-Layout.
 *
 * Reihenfolge unverändert wie vorher in app/layout.tsx (Kaskade!). Importiert
 * von den Routen, die eine OS-Oberfläche zeigen: /os (Layout), /home (klassisch)
 * und /tunnel. Einstiegsseiten wie /login und / laden sie nicht mehr.
 *
 * - universe-v2.css, live-polish.css: nur mit NEXT_PUBLIC_UNIVERSE_V2 (html[data-uv2=on]),
 *   dazu die uv2-Bausteine der klassischen Oberfläche und der alten Apps.
 * - react-grid-layout / react-resizable: Widget-Raster der klassischen Oberfläche.
 * - os-brightness.css, universe-materials.css, world.css: OS-Oberfläche (.os-root, Universe).
 */
import './universe-v2.css';
import './live-polish.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './os-brightness.css';
import './universe-materials.css';
import './world.css';
