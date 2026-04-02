const revealNodes = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }

    entry.target.classList.add('reveal-in');
    observer.unobserve(entry.target);
  });
}, {
  threshold: 0.2
});

revealNodes.forEach((node, index) => {
  node.style.transitionDelay = `${index * 70}ms`;
  observer.observe(node);
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    let frame = 0;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = x * 10;
      const rotateX = -y * 10;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform =
          `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
      });
    });

    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(frame);
      el.style.transform = '';
    });
  });
}
