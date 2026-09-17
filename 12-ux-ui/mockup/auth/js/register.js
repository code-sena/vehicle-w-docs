/* ============================================
   REGISTER — misma lógica que register.component.ts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const GMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const PHONE_PATTERN = /^3[0-9]{9}$/;
  // Ojo: el validador real NO exige carácter especial (solo mayúscula + número + 8+),
  // aunque el checklist visual sí lo muestre. Lo dejo igual que en register.component.ts.
  const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

  const form = document.getElementById('registerForm');
  const nombre = document.getElementById('nombre');
  const correo = document.getElementById('reg-correo');
  const telefono = document.getElementById('telefono');
  const contrasena = document.getElementById('reg-contrasena');
  const confirmar = document.getElementById('confirmar');

  const nombreError = document.getElementById('nombreError');
  const correoError = document.getElementById('reg-correoError');
  const telefonoError = document.getElementById('telefonoError');
  const contrasenaError = document.getElementById('reg-contrasenaError');
  const confirmarError = document.getElementById('confirmarError');

  const requirementsBox = document.getElementById('passwordRequirements');
  const submitBtn = document.getElementById('registerSubmit');
  const submitLabel = document.getElementById('registerBtnLabel');

  initToggle('toggleRegPass', contrasena);
  initToggle('toggleConfirm', confirmar);

  function initToggle(btnId, input) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.querySelector('.material-icons').textContent =
        input.type === 'password' ? 'visibility' : 'visibility_off';
    });
  }

  // limpiarEspaciosCorreo() + bloquearEspacios()
  correo.addEventListener('input', () => {
    correo.value = correo.value.replace(/\s/g, '');
    updateSubmitState();
  });
  correo.addEventListener('keypress', (e) => {
    if (e.key === ' ') e.preventDefault();
  });

  // limpiarTelefono(): quita letras, obliga a que empiece en 3, limita a 10
  telefono.addEventListener('input', () => {
    let value = telefono.value.replace(/\D/g, '');
    if (value.length > 0 && value[0] !== '3') {
      value = value.substring(1);
    }
    telefono.value = value.substring(0, 10);
    updateSubmitState();
  });

  contrasena.addEventListener('input', () => {
    renderRequirements();
    updateSubmitState();
  });
  [nombre, confirmar].forEach((el) => el.addEventListener('input', updateSubmitState));

  nombre.addEventListener('blur', () => validateField('nombre'));
  correo.addEventListener('blur', () => validateField('correo'));
  telefono.addEventListener('blur', () => validateField('telefono'));
  contrasena.addEventListener('blur', () => validateField('contrasena'));
  confirmar.addEventListener('blur', () => validateField('confirmar'));

  function renderRequirements() {
    const pass = contrasena.value;
    const reqs = {
      minLength: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    requirementsBox.querySelectorAll('[data-req]').forEach((el) => {
      el.classList.toggle('met', Boolean(reqs[el.dataset.req]));
    });
  }

  function validateField(field) {
    switch (field) {
      case 'nombre':
        if (!nombre.value.trim()) return fail(nombre, nombreError, 'El nombre es obligatorio');
        if (nombre.value.trim().length < 3) return fail(nombre, nombreError, 'Debe tener mínimo 3 caracteres');
        return pass_(nombre, nombreError);

      case 'correo':
        if (!correo.value.trim()) return fail(correo, correoError, 'El correo es obligatorio');
        if (!GMAIL_PATTERN.test(correo.value)) return fail(correo, correoError, 'Solo se permiten correos @gmail.com');
        return pass_(correo, correoError);

      case 'telefono':
        if (!telefono.value.trim()) return fail(telefono, telefonoError, 'El teléfono es obligatorio');
        if (!PHONE_PATTERN.test(telefono.value)) return fail(telefono, telefonoError, 'Debe comenzar con 3 (número celular colombiano)');
        if (telefono.value.length < 10) return fail(telefono, telefonoError, 'El número debe tener 10 dígitos');
        return pass_(telefono, telefonoError);

      case 'contrasena':
        if (!contrasena.value) return fail(contrasena, contrasenaError, 'La contraseña es obligatoria');
        return pass_(contrasena, contrasenaError);

      case 'confirmar':
        if (!confirmar.value) return fail(confirmar, confirmarError, 'Debes confirmar la contraseña');
        if (confirmar.value !== contrasena.value) return fail(confirmar, confirmarError, 'Las contraseñas no coinciden');
        return pass_(confirmar, confirmarError);
    }
  }

  function updateSubmitState() {
    const ready =
      nombre.value.trim().length >= 3 &&
      GMAIL_PATTERN.test(correo.value) &&
      PHONE_PATTERN.test(telefono.value) &&
      PASSWORD_PATTERN.test(contrasena.value) &&
      confirmar.value === contrasena.value &&
      confirmar.value.length > 0;

    submitBtn.disabled = !ready;
  }

  function fail(inputEl, errorEl, message) {
    inputEl.classList.add('input-error');
    errorEl.textContent = message;
    errorEl.hidden = false;
    return false;
  }

  function pass_(inputEl, errorEl) {
    inputEl.classList.remove('input-error');
    errorEl.hidden = true;
    return true;
  }

  // Igual que onSubmit(): pone "Registrando..." 1.5s y luego redirige a login
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ['nombre', 'correo', 'telefono', 'contrasena', 'confirmar'].forEach(validateField);
    if (submitBtn.disabled) return;

    submitBtn.disabled = true;
    submitLabel.textContent = 'Registrando...';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  });
});
