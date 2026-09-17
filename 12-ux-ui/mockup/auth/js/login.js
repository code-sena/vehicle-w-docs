/* ============================================
   LOGIN — misma lógica que login.ts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/;

  const form = document.getElementById('loginForm');
  const correo = document.getElementById('correo');
  const contrasena = document.getElementById('contrasena');
  const correoError = document.getElementById('correoError');
  const contrasenaError = document.getElementById('contrasenaError');
  const submitBtn = document.getElementById('loginSubmit');

  // Igual que correoSinEspacios() en login.ts
  correo.addEventListener('input', () => {
    correo.value = correo.value.replace(/\s/g, '');
    updateSubmitState();
  });

  contrasena.addEventListener('input', updateSubmitState);

  correo.addEventListener('blur', () => validateField('correo'));
  contrasena.addEventListener('blur', () => validateField('contrasena'));

  function validateField(field) {
    if (field === 'correo') {
      if (!correo.value.trim()) return fail(correo, correoError, 'El correo es obligatorio');
      if (!GMAIL_PATTERN.test(correo.value.trim())) return fail(correo, correoError, 'Debe ingresar un correo válido @gmail.com');
      return pass(correo, correoError);
    }
    if (field === 'contrasena') {
      if (!contrasena.value) return fail(contrasena, contrasenaError, 'La contraseña es obligatoria');
      return pass(contrasena, contrasenaError);
    }
  }

  function updateSubmitState() {
    const valid = GMAIL_PATTERN.test(correo.value.trim()) && contrasena.value.length > 0;
    submitBtn.disabled = !valid;
  }

  function fail(inputEl, errorEl, message) {
    inputEl.style.borderColor = '#ef5350';
    errorEl.textContent = message;
    errorEl.hidden = false;
    return false;
  }

  function pass(inputEl, errorEl) {
    inputEl.style.borderColor = '';
    errorEl.hidden = true;
    return true;
  }

  // Igual que onSubmit() en login.ts: valida contra un usuario "demo"
  // (simulación de backend temporal que ya tenías en el proyecto)
  const usuarioDemo = { correo: 'admin@gmail.com', contrasena: 'Admin123!' };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return;

    if (correo.value === usuarioDemo.correo && contrasena.value === usuarioDemo.contrasena) {
      alert('Inicio de sesión correcto (demo). Aquí navegarías a /client.');
    } else {
      alert('Correo o contraseña incorrectos');
    }
  });
});
