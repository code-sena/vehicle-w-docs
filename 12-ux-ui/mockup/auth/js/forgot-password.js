/* ============================================
   FORGOT PASSWORD — misma lógica que los 3 steps .ts
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const GMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const panels = document.querySelectorAll('.step-panel');
  let currentStep = 1;

  function goToStep(step) {
    currentStep = step;

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', Number(panel.dataset.step) === step);
    });

    const stepper = document.getElementById('stepper');
    if (step > 3) {
      stepper.style.display = 'none';
      return;
    }
    stepper.style.display = 'flex';

    stepper.querySelectorAll('[data-circle]').forEach((circle) => {
      const n = Number(circle.dataset.circle);
      circle.classList.toggle('active', n === step);
      circle.classList.toggle('completed', n < step);
    });
    stepper.querySelectorAll('[data-line]').forEach((line) => {
      const n = Number(line.dataset.line);
      // igual que isCompleted(step+1) || isActive(step+1) del stepper.ts real
      line.classList.toggle('line-active', (n + 1) <= step);
    });
  }

  /* ---------- Paso 1: email-step.ts ---------- */

  const emailInput = document.getElementById('fp-email');
  const emailError = document.getElementById('fp-emailError');
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  const targetEmail = document.getElementById('targetEmail');

  emailInput.addEventListener('input', () => {
    emailInput.value = emailInput.value.replace(/\s/g, '');
    const valid = GMAIL_PATTERN.test(emailInput.value.trim());
    sendCodeBtn.disabled = !emailInput.value || !valid;
    emailInput.classList.toggle('input-error', Boolean(emailInput.value) && !valid);
    emailError.hidden = !(emailInput.value && !valid);
  });

  emailInput.addEventListener('keypress', (e) => {
    if (e.key === ' ') e.preventDefault();
  });

  sendCodeBtn.addEventListener('click', () => {
    if (!GMAIL_PATTERN.test(emailInput.value.trim())) return;
    targetEmail.textContent = emailInput.value.trim();
    goToStep(2);
    resetDigits();
  });

  /* ---------- Paso 2: verification-step.ts ---------- */

  const digitInputs = Array.from(document.querySelectorAll('.digit-input'));
  const codeError = document.getElementById('codeError');
  const resendBtn = document.getElementById('resendBtn');
  const verifyBtn = document.getElementById('verifyBtn');

  digitInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && index < digitInputs.length - 1) {
        digitInputs[index + 1].focus();
      }
      codeError.hidden = true;
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && index > 0) {
        digitInputs[index - 1].focus();
      }
    });
  });

  function resetDigits() {
    digitInputs.forEach((el) => (el.value = ''));
    setTimeout(() => digitInputs[0].focus(), 50);
  }

  resendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetDigits();
  });

  verifyBtn.addEventListener('click', () => {
    const code = digitInputs.map((el) => el.value).join('');
    if (code.length < digitInputs.length) {
      codeError.hidden = false;
      return;
    }
    goToStep(3);
  });

  /* ---------- Paso 3: new-password-step.ts ---------- */

  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');
  const newPasswordRequirements = document.getElementById('newPasswordRequirements');
  const resetSubmit = document.getElementById('resetSubmit');

  initToggle('toggleNewPass', newPassword);
  initToggle('toggleConfirmNewPass', confirmNewPassword);

  function initToggle(btnId, input) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      const icon = btn.querySelector('iconify-icon');
      icon.setAttribute('icon', input.type === 'password' ? 'mdi:eye-off-outline' : 'mdi:eye-outline');
    });
  }

  function updateResetState() {
    const pass = newPassword.value;
    const reqs = {
      minLength: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
    newPasswordRequirements.querySelectorAll('[data-req]').forEach((el) => {
      el.classList.toggle('met', Boolean(reqs[el.dataset.req]));
    });

    // Igual que isPasswordValid / passwordsMatch en new-password-step.ts:
    // aquí SÍ se exige carácter especial (a diferencia del registro)
    const isPasswordValid = Object.values(reqs).every(Boolean);
    const passwordsMatch = confirmNewPassword.value === newPassword.value && confirmNewPassword.value !== '';

    resetSubmit.disabled = !(isPasswordValid && passwordsMatch);
  }

  newPassword.addEventListener('input', updateResetState);
  confirmNewPassword.addEventListener('input', updateResetState);

  resetSubmit.addEventListener('click', () => {
    if (resetSubmit.disabled) return;
    goToStep(4);
  });

  goToStep(1);
});
