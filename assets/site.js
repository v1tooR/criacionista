/* Comportamentos compartilhados por todas as páginas do protótipo.
   Cada bloco é tolerante à ausência dos elementos, então serve a qualquer página. */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Header sticky ---- */
  var hdr = document.getElementById('hdr');
  var onScroll = function(){ hdr.classList.toggle('is-stuck', window.scrollY > 12); };
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  /* ---- Menu mobile ---- */
  var burger = document.getElementById('burger'), mnav = document.getElementById('mnav');
  burger.addEventListener('click', function(){
    var open = mnav.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  mnav.addEventListener('click', function(e){
    if (e.target.tagName === 'A'){
      mnav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded','false');
    }
  });

  /* ---- Animações de entrada ao rolar ---- */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)){
    revealables.forEach(function(el){ el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, {rootMargin:'0px 0px -12% 0px', threshold:0.08});

    revealables.forEach(function(el){
      // escalona automaticamente os filhos diretos de uma grade
      io.observe(el);
    });

    // stagger automático dentro de grades e trilhos
    document.querySelectorAll('.grid, .cats, .rail, .steps').forEach(function(group){
      Array.prototype.forEach.call(group.children, function(child, i){
        if (child.hasAttribute('data-reveal') && !child.style.getPropertyValue('--d')){
          child.style.setProperty('--d', (i * 90) + 'ms');
        }
      });
    });
  }

  /* ---- Contadores ---- */
  var counters = document.querySelectorAll('[data-count]');
  var runCount = function(el){
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce){ el.textContent = String(target); return; }
    var dur = 1100, t0 = performance.now();
    var tick = function(now){
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window){
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        runCount(en.target);
        cio.unobserve(en.target);
      });
    }, {threshold:0.6});
    counters.forEach(function(el){ cio.observe(el); });
  } else {
    counters.forEach(runCount);
  }


  /* ---- Trilhos horizontais ---- */
  document.querySelectorAll('[data-rail]').forEach(function(nav){
    var rail = document.getElementById('rail-' + nav.getAttribute('data-rail'));
    if (!rail) return;
    var step = function(){
      var first = rail.firstElementChild;
      return first ? first.getBoundingClientRect().width + 22 : 300;
    };
    var sync = function(){
      var max = rail.scrollWidth - rail.clientWidth - 4;
      nav.querySelector('[data-dir="-1"]').disabled = rail.scrollLeft <= 4;
      nav.querySelector('[data-dir="1"]').disabled = rail.scrollLeft >= max;
    };
    nav.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        rail.scrollBy({left: step() * parseInt(b.getAttribute('data-dir'),10) * 2, behavior: reduce ? 'auto' : 'smooth'});
      });
    });
    rail.addEventListener('scroll', sync, {passive:true});
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    // as imagens são lazy: o tamanho do trilho só é final depois que elas carregam
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(rail);
    rail.querySelectorAll('img').forEach(function(img){ img.addEventListener('load', sync); });
    sync();
  });

  /* ---- Vídeos: só carrega o iframe ao clicar ---- */
  document.querySelectorAll('.vthumb[data-yt]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var id = btn.getAttribute('data-yt');
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.title = btn.getAttribute('aria-label') || 'Vídeo';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      btn.replaceWith(frame);
    });
  });

  /* ---- FAQ ---- */
  document.querySelectorAll('.acc').forEach(function(acc){
    var q = acc.querySelector('.acc__q'), a = acc.querySelector('.acc__a');
    q.addEventListener('click', function(){
      var open = acc.classList.contains('is-open');
      // fecha os outros
      document.querySelectorAll('.acc.is-open').forEach(function(o){
        if (o === acc) return;
        o.classList.remove('is-open');
        o.querySelector('.acc__q').setAttribute('aria-expanded','false');
        o.querySelector('.acc__a').style.height = '0px';
      });
      acc.classList.toggle('is-open', !open);
      q.setAttribute('aria-expanded', String(!open));
      a.style.height = open ? '0px' : a.scrollHeight + 'px';
    });
  });

  /* ---- Valores de doação ---- */
  document.querySelectorAll('.doe__val').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.doe__val').forEach(function(o){ o.classList.toggle('is-on', o === b); });
    });
  });

  /* ---- Voltar ao topo: botão flutuante ---- */
  var fab = document.getElementById('fabtop');
  if (fab){
    var onFab = function(){ fab.classList.toggle('is-on', window.scrollY > 720); };
    onFab();
    window.addEventListener('scroll', onFab, {passive:true});
    fab.addEventListener('click', function(e){
      e.preventDefault();
      window.scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'});
      // devolve o foco ao início para quem navega por teclado
      var brand = document.querySelector('.brand');
      if (brand) brand.focus({preventScroll:true});
    });
  }

  /* ---- Avisos dos links que ainda não têm destino nesta prévia ---- */
  var toast = document.getElementById('toast'), toastTimer;
  var showToast = function(text){
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('is-on'); }, 4600);
  };
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-wip]');
    if (!el) return;
    e.preventDefault();
    showToast(el.getAttribute('data-wip') + ' ainda não está funcional nesta prévia. Entra na implementação do Wix.');
  });
})();
