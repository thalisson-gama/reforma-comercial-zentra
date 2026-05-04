/* =================================================================
   ZENTRA ENGENHARIA | Landing Pages (M² Black)
   - 2-step form with progress dots, validation and AtenderBem webhook
   - Hero video click-to-play
   - Depoimentos carousel (snap scroll)
   - Reveal-on-scroll
   - Footer year + UTM passthrough
   ================================================================= */

(function () {
  'use strict';

  // Zentra Engenharia — WhatsApp Business: (21) 3449-5299
  // Format used by wa.me: country code + DDD + number, digits only.
  const WHATSAPP_PHONE = '552134495299';

  /* -----------------------------------------------------------------
     0. Footer year                                                   */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------------
     1. Reveal-on-scroll
     - opt-in via .js-reveal-ready on <html> so inert CSS is the
       no-JS fallback (content always visible)
     - already-in-view elements are marked is-visible immediately
       (no flash of hidden content on first paint)
     - safety net: after 1.5s any unrevealed element is forced visible
       so a slow IntersectionObserver never strands content        */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal-ready');
    // Mark anything already in viewport as visible synchronously
    reveals.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('is-visible');
      }
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach((el) => { if (!el.classList.contains('is-visible')) io.observe(el); });

    setTimeout(() => {
      reveals.forEach((el) => el.classList.add('is-visible'));
    }, 1500);
  }

  /* -----------------------------------------------------------------
     1b. Count-up animation for proof bar
     - Targets any [data-count] element with a numeric attribute
     - Triggers once when the element scrolls into view
     - Uses easeOutCubic for a natural deceleration                   */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const animateCount = (el) => {
      const target = parseFloat(el.getAttribute('data-count') || '0');
      const duration = parseInt(el.getAttribute('data-count-duration') || '1600', 10);
      const start = performance.now();
      const isFloat = !Number.isInteger(target);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const v = target * easeOutCubic(t);
        el.textContent = isFloat ? v.toFixed(1) : Math.round(v).toString();
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = isFloat ? target.toFixed(1) : target.toString();
      };
      requestAnimationFrame(tick);
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCount(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => { el.textContent = '0'; cio.observe(el); });
  }

  /* -----------------------------------------------------------------
     2. Hero video click-to-play                                      */
  const heroVideo = document.querySelector('.hero__video');
  if (heroVideo) {
    const video = heroVideo.querySelector('video');
    const playBtn = heroVideo.querySelector('.hero__video-play');
    if (video && playBtn) {
      const togglePlay = () => {
        if (video.paused) {
          video.muted = false;
          video.play().catch(() => {
            // some browsers block unmuted autoplay — try muted
            video.muted = true;
            video.play();
          });
          heroVideo.classList.add('is-playing');
        } else {
          video.pause();
          heroVideo.classList.remove('is-playing');
        }
      };
      playBtn.addEventListener('click', togglePlay);
      video.addEventListener('click', togglePlay);
      video.addEventListener('ended', () => heroVideo.classList.remove('is-playing'));
    }
  }

  /* -----------------------------------------------------------------
     3. Depoimentos carousel                                          */
  const carousel = document.querySelector('.depo-carousel');
  if (carousel) {
    const track = carousel.querySelector('.depo-carousel__track');
    const prev = carousel.querySelector('[data-depo-prev]');
    const next = carousel.querySelector('[data-depo-next]');
    const step = () => {
      const card = track.querySelector('.depo-card');
      if (!card) return 320;
      const gap = parseInt(getComputedStyle(track).gap, 10) || 18;
      return card.offsetWidth + gap;
    };
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  }

  /* -----------------------------------------------------------------
     4. Smooth scroll + topbar offset for anchor links                */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* -----------------------------------------------------------------
     5. Form: 2-step navigation + validation + webhook                */
  const form = document.getElementById('formulario');
  if (form) initForm(form);

  function initForm(formEl) {
    const pages = formEl.querySelectorAll('.form__page');
    const goNextBtns = formEl.querySelectorAll('[data-form-next]');
    const goBackBtns = formEl.querySelectorAll('[data-form-back]');
    const submitBtn = formEl.querySelector('[type="submit"]');
    const feedback = formEl.querySelector('.form__feedback') || createFeedback(formEl);
    const stepDots = formEl.querySelectorAll('.form__step-dot');
    const stepLine = formEl.querySelector('.form__step-line');

    let current = 0;

    const setStepUI = (idx) => {
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      stepDots.forEach((d, i) => {
        d.classList.toggle('is-active', i === idx);
        d.classList.toggle('is-done', i < idx);
      });
      if (stepLine) {
        stepLine.classList.toggle('is-half', idx >= 1);
        stepLine.classList.toggle('is-full', idx >= pages.length - 1);
      }
    };

    const validatePage = (idx) => {
      const page = pages[idx];
      const fields = page.querySelectorAll('input, select, textarea');
      let firstInvalid = null;
      let ok = true;
      fields.forEach((f) => {
        if (!f.required) return;
        const valid = f.checkValidity();
        f.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (!valid && !firstInvalid) firstInvalid = f;
        if (!valid) ok = false;
      });
      if (firstInvalid) firstInvalid.focus();
      return ok;
    };

    goNextBtns.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      if (!validatePage(current)) return;
      current = Math.min(pages.length - 1, current + 1);
      setStepUI(current);
    }));

    goBackBtns.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      current = Math.max(0, current - 1);
      setStepUI(current);
    }));

    setStepUI(0);

    /* -- WhatsApp formatting helper -------------------------------- */
    const phoneInput = formEl.querySelector('#field-whatsapp');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 6) {
          v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
        } else if (v.length > 2) {
          v = `(${v.slice(0,2)}) ${v.slice(2)}`;
        } else if (v.length > 0) {
          v = `(${v}`;
        }
        e.target.value = v;
      });
    }

    /* -- Hidden field auto-fill (UTMs, page metadata) -------------- */
    const params = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach((k) => {
      const el = formEl.querySelector(`[name="${k}"]`);
      if (el) el.value = params.get(k) || '';
    });
    const pageNameEl = formEl.querySelector('[name="Nome_da_pagina"]');
    if (pageNameEl) pageNameEl.value = document.title || location.pathname;
    const pageUrlEl = formEl.querySelector('[name="URL_da_pagina"]');
    if (pageUrlEl) pageUrlEl.value = location.href;

    /* -- Submission ------------------------------------------------ */
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validatePage(current)) return;

      // Validate all pages once more (defensive)
      for (let i = 0; i < pages.length; i++) {
        if (!validatePage(i)) { current = i; setStepUI(i); return; }
      }

      // Stamp date/time at submit
      const now = new Date();
      const dd = String(now.getDate()).padStart(2,'0');
      const mm = String(now.getMonth()+1).padStart(2,'0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2,'0');
      const mi = String(now.getMinutes()).padStart(2,'0');
      const dataEl = formEl.querySelector('[name="Data"]');
      const horaEl = formEl.querySelector('[name="Horario"]');
      if (dataEl) dataEl.value = `${dd}/${mm}/${yyyy}`;
      if (horaEl) horaEl.value = `${hh}:${mi}`;

      // Strip phone mask before submit
      const phoneRaw = phoneInput ? phoneInput.value.replace(/\D/g,'') : '';

      const fd = new FormData(formEl);
      if (phoneInput) fd.set('WhatsApp', phoneRaw);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        const url = formEl.action;
        await fetch(url, { method: 'POST', body: fd, mode: 'no-cors' });
        // 'no-cors' returns opaque responses; we trust the webhook is configured properly.
        if (window.dataLayer) {
          window.dataLayer.push({ event: 'lead_submit', form_id: 'formulario', page_title: document.title });
        }
        // Redirect the user straight to WhatsApp so the conversation
        // continues there with all their context fresh in mind.
        const nome = (fd.get('Nome') || '').toString().trim().split(' ')[0];
        const servico = (fd.get('servico') || '').toString();
        const lines = [
          'Olá, Zentra! Acabei de preencher o formulário no site.',
          nome ? `Sou o(a) ${nome}` + (servico ? ` e busco ${servico.toLowerCase()}.` : '.') : '',
          'Gostaria de avançar com o orçamento.'
        ].filter(Boolean);
        const msg = encodeURIComponent(lines.join('\n'));
        const wa = `https://wa.me/${WHATSAPP_PHONE}?text=${msg}`;

        showFeedback(feedback, 'Recebemos seu contato. Estamos te redirecionando ao WhatsApp da Zentra…', 'success');
        formEl.reset();
        current = 0;
        setStepUI(0);

        // Try to open in the same tab; fall back to new tab if blocked.
        setTimeout(() => {
          const opened = window.open(wa, '_self');
          if (!opened) window.open(wa, '_blank', 'noopener,noreferrer');
        }, 700);
      } catch (err) {
        showFeedback(feedback, 'Não foi possível enviar agora. Tente novamente em instantes ou nos chame no WhatsApp.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.label || 'Solicitar diagnóstico';
      }
    });
  }

  function createFeedback(formEl) {
    const div = document.createElement('div');
    div.className = 'form__feedback';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.hidden = true;
    formEl.appendChild(div);
    return div;
  }

  function showFeedback(el, text, kind) {
    el.textContent = text;
    el.classList.remove('form__feedback--success', 'form__feedback--error');
    el.classList.add(kind === 'success' ? 'form__feedback--success' : 'form__feedback--error');
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();
