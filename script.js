// ============================================================
// DENVASWEB — script.js
// ============================================================

// ------------------------------------------------------------
// CLOUDINARY ASSET CONFIG
// Single source of truth for every image on the page.
// Every key below is already active — as soon as you upload a
// file to Cloudinary (root of the kat6qihq cloud) with the exact
// public_id shown, it replaces the local fallback in images/
// automatically. Nothing to edit here as you upload one by one.
// f_auto + q_auto let Cloudinary pick the best format (AVIF/WebP)
// and quality per visitor automatically.
// ------------------------------------------------------------
const CLOUDINARY_CLOUD = 'kat6qihq'; // Denvasweb's existing Cloudinary cloud

const assets = {
  'hero-website': 'hero-website-project',
  'hero-webapp': 'hero-webapp-sazon',
  'sazon-urbana-full': 'sazon-urbana-full',
  'project-ironwood': 'project-ironwood',
  'project-pristine': 'project-pristine',
  'project-aldrich': 'project-aldrich',
  'project-steelcrest': 'project-steelcrest',
  'step-website': 'hero-website-project',
  'step-google-maps': 'step-google-maps',
  'step-ads': 'google-ads-visual',
  'logo': 'logo',
};

function cloudinaryUrl(publicId, width) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

// Tries each Cloudinary asset silently. If it's not uploaded yet (404),
// the local fallback image already in src stays untouched — no broken
// images, no code edits needed as you upload files one by one.
function loadCloudinaryAssets() {
  document.querySelectorAll('[data-asset]').forEach(img => {
    const key = img.dataset.asset;
    const publicId = assets[key];
    if (!publicId) return;

    const width = img.dataset.width || 1200;
    const cloudSrc = cloudinaryUrl(publicId, width);

    const probe = new Image();
    probe.onload = () => { img.src = cloudSrc; };
    // onerror: do nothing, local fallback in src stays as-is
    probe.src = cloudSrc;
  });

  // Favicon (SVG) — same silent-probe pattern as images above
  const faviconLink = document.getElementById('favicon-link');
  if (faviconLink) {
    const faviconSrc = cloudinaryUrl('favicon', 64);
    const probe = new Image();
    probe.onload = () => { faviconLink.href = faviconSrc; };
    probe.src = faviconSrc;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCloudinaryAssets();

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('site-header');
  const onScroll = () => {
    if (window.scrollY > 12) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero reveal on load ---------- */
  document.querySelectorAll('.reveal[data-reveal]').forEach(el => {
    // Trigger on next frame so the animation plays
    requestAnimationFrame(() => el.classList.add('in'));
  });

  /* ---------- Dynamic hero word (true crossfade, no blank gap) ---------- */
  const words = ['websites', 'web apps', 'campañas'];
  const dw1 = document.getElementById('dw-1');
  const dw2 = document.getElementById('dw-2');
  if (dw1 && dw2 && !prefersReducedMotion) {
    let wordIndex = 0; // index currently shown by the active element
    let showingFirst = true; // which element (dw1/dw2) is currently active
    setInterval(() => {
      wordIndex = (wordIndex + 1) % words.length;
      const incoming = showingFirst ? dw2 : dw1;
      const outgoing = showingFirst ? dw1 : dw2;
      incoming.textContent = words[wordIndex];
      // Both transitions fire in the same frame — true crossfade, never both at 0
      incoming.classList.add('active');
      outgoing.classList.remove('active');
      showingFirst = !showingFirst;
    }, 2200);
  }

  /* ---------- Scroll reveal for sections ---------- */
  const scrollRevealTargets = document.querySelectorAll(
    '.step-card, .why-item, .price-card'
  );
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    scrollRevealTargets.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1)';
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    scrollRevealTargets.forEach(el => io.observe(el));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all others
      document.querySelectorAll('.faq-question').forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          other.nextElementSibling.style.maxHeight = null;
        }
      });

      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
    });
  });

  /* ---------- Project carousel (autoplay every 4s) ---------- */
  const track = document.getElementById('carousel-track');
  const dotsWrap = document.getElementById('carousel-dots');
  if (track && dotsWrap) {
    const slides = Array.from(track.children);
    let current = 0;
    let autoplayTimer = null;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Ir al proyecto ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      autoplayTimer = setInterval(() => goTo(current + 1), 4000);
    }
    function stopAutoplay() { clearInterval(autoplayTimer); }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    startAutoplay();
    const carouselEl = document.getElementById('project-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    prevBtn.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

    // Pause on hover (desktop only) - resumes on mouse leave
    carouselEl.addEventListener('mouseenter', stopAutoplay);
    carouselEl.addEventListener('mouseleave', startAutoplay);

    // On mobile there's no "hover" - briefly pause on touch so it doesn't
    // fight a swipe, then always resume shortly after. Never stop forever.
    let touchResumeTimer = null;
    carouselEl.addEventListener('touchstart', () => {
      stopAutoplay();
      clearTimeout(touchResumeTimer);
      touchResumeTimer = setTimeout(startAutoplay, 3000);
    }, { passive: true });
  }

  /* ---------- Mobile sticky CTA visibility ---------- */
  const stickyCta = document.getElementById('mobile-sticky-cta');
  const contactSection = document.getElementById('contact');
  const heroSection = document.getElementById('hero');

  if (stickyCta) {
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === heroSection) {
          // Show sticky CTA once hero is out of view
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            stickyCta.classList.add('visible');
          } else {
            stickyCta.classList.remove('visible');
          }
        }
        if (entry.target === contactSection && entry.isIntersecting) {
          // Hide once contact form is reached
          stickyCta.classList.remove('visible');
        }
      });
    }, { threshold: 0 });

    stickyObserver.observe(heroSection);
    stickyObserver.observe(contactSection);
  }

  /* ---------- Contact form submission (Formspree) ---------- */
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      formStatus.textContent = '';
      // keep a copy of what was typed: the form is cleared after a successful send
      const leadData = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          formStatus.textContent = 'Gracias — recibimos tu mensaje. Te respondemos pronto.';
          formStatus.style.color = '#16A34A';
          form.reset();
          // tell other scripts the lead was sent (cal-booking.js opens the calendar)
          document.dispatchEvent(new CustomEvent('lead:submitted', { detail: leadData }));
        } else {
          throw new Error('Form submission failed');
        }
      } catch (err) {
        formStatus.textContent = 'Hubo un problema al enviar. Escríbenos por WhatsApp mientras lo resolvemos.';
        formStatus.style.color = '#DC2626';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar mensaje';
      }
    });
  }

});
