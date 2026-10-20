import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';
mermaid.registerLayoutLoaders(elkLayouts);
window.mermaid = mermaid;
