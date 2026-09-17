/* ============================================
   LANDING — misma lógica que navbar.ts (dropdown de idioma) + footer.ts (año)
   Nota: el cambio de idioma aquí es solo visual (bandera + código ES/EN/PT/FR).
   Tu app real sí traduce todo el contenido vía ngx-translate; replicar los
   4 archivos de traducción completos quedó fuera del alcance de esta maqueta.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('languageDropdown');
  const langBtn = document.getElementById('langBtn');
  const langMenu = document.getElementById('langMenu');
  const langFlag = document.getElementById('langFlag');
  const langCode = document.getElementById('langCode');

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langMenu.hidden = !langMenu.hidden;
  });

  langMenu.querySelectorAll('.lang-option').forEach((option) => {
    option.addEventListener('click', () => {
      const lang = option.dataset.lang;
      const flag = option.dataset.flag;

      langFlag.className = `fi fi-${flag}`;
      langCode.textContent = lang.toUpperCase();

      langMenu.querySelectorAll('.lang-check').forEach((check) => {
        check.classList.toggle('selected', check.dataset.check === lang);
      });

      localStorage.setItem('lang', lang);
      langMenu.hidden = true;
    });
  });

  // cierra el menú si se hace click fuera (igual que @HostListener en navbar.ts)
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      langMenu.hidden = true;
    }
  });

  // restaura el idioma guardado, igual que el constructor de navbar.ts
  const savedLang = localStorage.getItem('lang') || 'es';
  const savedOption = langMenu.querySelector(`[data-lang="${savedLang}"]`);
  if (savedOption) savedOption.click();
  langMenu.hidden = true;

  // footer.ts: currentYear = new Date().getFullYear()
  document.getElementById('footerCopyright').textContent =
    `© ${new Date().getFullYear()} AquaWash. Todos los derechos reservados.`;
});
