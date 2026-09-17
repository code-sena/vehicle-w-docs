/* ============================================
   THEME SWITCHER — aplica la clase real que usa tu app
   (body.green-dark / body.pink / body.pink-dark)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.theme-switcher button');
  const saved = localStorage.getItem('demo-theme') || '';

  applyTheme(saved);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  function applyTheme(theme) {
    document.body.classList.remove('green-dark', 'pink', 'pink-dark');
    if (theme) document.body.classList.add(theme);
    localStorage.setItem('demo-theme', theme);

    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }
});
