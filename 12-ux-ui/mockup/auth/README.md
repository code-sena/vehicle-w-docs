# Lavado Vehicular — Módulo Auth (fiel a tu proyecto real)

Esta versión reconstruye login, registro y recuperar contraseña usando
directamente el código de tu zip completo (`Front-end-proyecto-web`), no
inventado: mismos colores (`styles.scss`), mismos componentes compartidos
(`auth-side-panel`, `back-button`, `stepper`, `auth-card`), mismas imágenes
(`panelLight.png` / `panelDark.png`) y mismos textos (`es.json`).

## Cómo verlo

Abre `index.html` en tu navegador. No necesita servidor ni build.

## Estructura

```
auth-real/
├── index.html
├── landing.html
├── login.html
├── register.html
├── forgot-password.html
├── images/
│   ├── panelLight.png        Copiadas de public/images/ (tu proyecto)
│   ├── panelDark.png
│   ├── hero.png                Fondo del hero (tema verde)
│   └── car.png                  Fondo del hero (tema rosado)
├── css/
│   ├── variables.css          Copiado de styles.scss — 4 temas reales
│   ├── base.css                Reset + fuentes (igual a src/index.html)
│   ├── landing.css              Copiado de landing.scss (contenedor)
│   ├── navbar.css                Copiado de navbar.scss
│   ├── hero.css                   Copiado de hero.scss
│   ├── features.css                Copiado de features.scss
│   ├── services.css                 Copiado de services.scss
│   ├── contact.css                   Copiado de contact.scss
│   ├── footer.css                     Copiado de footer.scss
│   ├── side-panel.css                  Copiado de auth-side-panel.scss
│   ├── back-button.css                  Copiado de back-button.scss
│   ├── stepper.css                       Copiado de stepper.scss
│   ├── auth-card.css                      Copiado de auth-card.scss
│   ├── login.css                           Copiado de login.scss
│   ├── register.css                         Copiado de register.component.scss
│   ├── forgot-password.css                   Copiado de forgot-password.scss
│   ├── step.css                               Combinado de los 3 *-step.scss
│   └── theme-switcher.css                      Control agregado (ver abajo)
└── js/
    ├── landing.js               Misma lógica que navbar.ts (idioma) + footer.ts (año)
    ├── login.js                  Misma lógica que login.ts
    ├── register.js                 Misma lógica que register.component.ts
    ├── forgot-password.js            Misma lógica que los 3 *-step.ts
    └── theme-switcher.js               Control agregado (ver abajo)
```

## Qué es 100% igual a tu app

- **Colores**: los 4 temas reales de `styles.scss` (`--primary: #2ec4b6`,
  el tema `green-dark`, `pink` y `pink-dark`), no la paleta que inventé
  en la primera versión.
- **Panel lateral**: la foto real del carro (`panelLight.png` /
  `panelDark.png`) con overlay, el logo con el mismo SVG, y las 3
  "benefit cards" flotantes con los textos reales de `es.json`
  (Información segura, Servicio Premium, Reservas rápidas).
- **Stepper**: círculos numerados 1-2-3 con líneas conectoras, igual a
  `stepper.ts`/`stepper.scss` (no el de puntos que había inventado antes).
- **Back button**: círculo con flecha, posición y hover idénticos a
  `back-button.scss`.
- **Textos**: todos sacados de `es.json` — el título es "Lavado
  Vehicular" (no "LavaYa"), los placeholders, mensajes de error y
  labels de los checklists son los reales.
- **Validaciones**: teléfono colombiano (debe iniciar en 3, 10 dígitos),
  correo solo `@gmail.com`, y la regla de contraseña del registro
  **no exige carácter especial** para habilitar el botón (aunque el
  checklist visual sí lo muestre) — es una particularidad real de tu
  `register.component.ts` que respeté tal cual. En cambio, el paso 3 de
  "nueva contraseña" sí lo exige, porque así está en `new-password-step.ts`.
- **Credenciales demo del login**: `admin@gmail.com` / `Admin123!`,
  igual que en tu `login.ts`.
- **Iconos**: `material-icons` (clásicos, como en tu proyecto) para
  login/register/side-panel/back-button/stepper, e `iconify-icon`
  (`mdi:email-outline`, `mdi:lock-outline`, etc.) para los 3 pasos de
  recuperar contraseña — igual a como está mezclado en tu código real.

## Landing (navbar + hero + features + services + contact + footer)

Reconstruido de `src/app/features/landing/`, componente por componente:

- **Navbar**: logo real, enlaces de ancla (#inicio, #nosotros, #servicios),
  el mismo dropdown de idioma (ES/EN/PT/FR) con banderas via flag-icons
  (el mismo CDN que ya usa tu `index.html`), y los botones de
  iniciar sesión / registro.
- **Hero**: mismo fondo (`hero.png` en temas verdes, `car.png` en temas
  rosados — así está en tu `styles.scss`), mismo badge, título y CTA.
- **Nosotros (features)**: el bloque de estadísticas (15K+ vehículos, 8K+
  clientes...) con la ilustración de burbujas animadas, más la grilla de
  "¿Por qué elegirnos?" con los 3 textos reales.
- **Servicios**: las 3 tarjetas de planes (Básico $20.000, Premium $35.000
  con la insignia "Más popular", Completo $50.000) con sus items exactos
  de `es.json`.
- **Contacto**: las 3 tarjetas (correo, teléfono, cobertura) — noté que tu
  `es.json` usa `hola@aquawash.com` en el correo de contacto y "AquaWash"
  en el copyright del footer, aunque el resto de la app dice "Lavado
  Vehicular" — lo dejé exactamente así porque es lo que tiene tu código
  real, no una inconsistencia mía.
- **Footer**: las 4 columnas, año dinámico con JS (igual que
  `currentYear = new Date().getFullYear()` en tu `footer.ts`).

**Lo único que simplifiqué en el landing**: el selector de idioma cambia
la bandera y el código (ES/EN/PT/FR) pero no traduce el contenido de la
página — tu app real usa `ngx-translate` con 4 archivos JSON completos
(`es.json`, `en.json`, `pt.json`, `fr.json`); reconstruir esa traducción
completa para una maqueta estática quedaba fuera de alcance.

## Lo único que agregué (no está en tu app)

- **Selector de 4 temas** (esquina superior derecha): tu app cambia de
  tema en otro lugar (seguramente un ajuste de perfil/sidebar), pero
  como el zip de `auth` no incluía ese selector, agregué uno mínimo
  solo para que puedas ver los 4 temas reales sin tener que editar
  código. Está comentado en el HTML para que sepas que no es tuyo.
- **Pantalla de éxito** al final de "recuperar contraseña": tu
  `new-password-step.ts` solo emite el evento `passwordUpdated` sin
  una vista propia (el componente padre decide qué hacer). Agregué una
  4ª pantalla simple para cerrar el flujo visualmente en esta demo.

## Conectar con tu backend

Los formularios no hacen peticiones reales. `login.js` valida contra el
usuario demo que ya tenías; `register.js` simula el `cargando` de 1.5s
y redirige a `login.html`; `forgot-password.js` avanza de paso
localmente. Reemplaza esas partes por tus llamadas HTTP reales cuando
conectes el backend (o llévate esta plantilla de vuelta a componentes
Angular).
