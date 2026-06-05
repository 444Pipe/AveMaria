/* =========================================================
   AVEMARÍA · interacciones
   ========================================================= */
(function () {
  'use strict';

  const nav      = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  const navToggle= document.getElementById('navToggle');
  const toTop    = document.getElementById('toTop');
  const progress = document.getElementById('scrollProgress');

  /* ---------- Nav + progreso + back-to-top al hacer scroll ---------- */
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    toTop.classList.toggle('show', y > 600);
    if (progress) {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Scrollspy: resaltar la sección visible en el menú ---------- */
  if ('IntersectionObserver' in window) {
    const spyLinks = {};
    navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
      const sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec) spyLinks[sec.id] = a;
    });
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(spyLinks).forEach(function (id) {
          spyLinks[id].classList.toggle('active', id === e.target.id);
        });
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    Object.keys(spyLinks).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Menú móvil ---------- */
  function toggleMenu() {
    const open = navLinks.classList.toggle('open');
    nav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  navToggle.addEventListener('click', toggleMenu);
  navLinks.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (navLinks.classList.contains('open')) toggleMenu();
    });
  });

  /* ---------- Reveal al hacer scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  /* Escalonar la entrada de elementos hermanos (grids) para un efecto en cascada */
  const revealGroups = new Map();
  reveals.forEach(function (el) {
    const p = el.parentElement;
    if (!revealGroups.has(p)) revealGroups.set(p, []);
    revealGroups.get(p).push(el);
  });
  revealGroups.forEach(function (items) {
    if (items.length > 1) items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
    });
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Año en footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Indicador Abierto / Cerrado (hora Colombia, UTC-5) ----------
     Horarios:
       Lun: cerrado
       Mar: 17:00–22:00
       Mié–Jue: 16:00–22:00
       Vie–Sáb: 12:00–22:30
       Dom: 12:00–22:00
  */
  const HOURS = {
    0: [[12 * 60, 22 * 60]],          // domingo
    1: [],                            // lunes (cerrado)
    2: [[17 * 60, 22 * 60]],          // martes
    3: [[16 * 60, 22 * 60]],          // miércoles
    4: [[16 * 60, 22 * 60]],          // jueves
    5: [[12 * 60, 22 * 60 + 30]],     // viernes
    6: [[12 * 60, 22 * 60 + 30]]      // sábado
  };

  function nowInColombia() {
    // Convertir a hora de Colombia (UTC-5, sin horario de verano) de forma robusta
    const utc = Date.now() + (new Date().getTimezoneOffset() * 60000);
    return new Date(utc - 5 * 3600000);
  }

  const DAYNAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function fmtTime(t) {
    const h = Math.floor(t / 60), m = t % 60;
    if (h === 12 && m === 0) return '12:00 m.';
    const ap = h >= 12 ? 'p.m.' : 'a.m.';
    let hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }

  // Próxima apertura buscando hasta una semana hacia adelante.
  function nextOpening(co) {
    const day = co.getDay();
    const mins = co.getHours() * 60 + co.getMinutes();
    for (let d = 0; d < 8; d++) {
      const dd = (day + d) % 7;
      const ranges = HOURS[dd] || [];
      for (let i = 0; i < ranges.length; i++) {
        const start = ranges[i][0];
        if (d === 0) { if (mins < start) return { d: d, dd: dd, start: start }; }
        else { return { d: d, dd: dd, start: start }; }
      }
    }
    return null;
  }

  function updateStatus() {
    const dot  = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;

    const co  = nowInColombia();
    const day = co.getDay();
    const mins = co.getHours() * 60 + co.getMinutes();
    const ranges = HOURS[day] || [];
    const open = ranges.some(function (r) { return mins >= r[0] && mins <= r[1]; });

    if (open) {
      dot.classList.remove('closed');
      text.textContent = 'Abierto ahora';
    } else {
      dot.classList.add('closed');
      const nx = nextOpening(co);
      if (nx) {
        const when = nx.d === 0 ? 'hoy' : nx.d === 1 ? 'mañana' : 'el ' + DAYNAMES[nx.dd];
        text.textContent = 'Cerrado · abre ' + when + ' ' + fmtTime(nx.start);
      } else {
        text.textContent = 'Cerrado ahora';
      }
    }
  }
  updateStatus();
  setInterval(updateStatus, 60000);
})();

/* =========================================================
   MAPA INTERACTIVO DE ZONAS
   ========================================================= */
(function () {
  'use strict';

  var WA = 'https://wa.me/573104964953?text=';

  /* Cada zona: posición en % sobre el mapa (x, y), color e info.
     Las coordenadas x/y (en %) y los nombres se calcaron de la imagen guía
     (statics/guia.png), midiendo el centro de cada globo sobre la ubicación
     real de Avemaría. En el SVG de index.html (viewBox 1000x930) cada zona
     cae sobre su estructura: x% = svgX/10, y% = svgY/9.3. */
  var ZONES = [
    { id:'bbc', name:'BBC · Bebidas', tag:'Bar & Bebidas', icon:'fa-beer-mug-empty', color:'#F2C811', x:34.3, y:17.9,
      desc:'La barra del parche: cervezas bien heladas, cócteles de autor y limonadas naturales para acompañar el atardecer llanero.',
      hours:'Abierto en el horario del restaurante',
      menu:[
        { name:'Cerveza nacional', price:'$7.000' },
        { name:'Michelada Avemaría', price:'$14.000', desc:'Con limón, sal y salsas de la casa' },
        { name:'Cóctel de autor', price:'$22.000' },
        { name:'Limonada de coco', price:'$11.000' },
        { name:'Sangría de la casa (jarra)', price:'$38.000' }
      ] },

    { id:'patriarca', name:'Patriarca · Restaurante', tag:'Asados & Parrilla', icon:'fa-drumstick-bite', color:'#1E9E4A', x:41.9, y:28.7,
      desc:'Carnes al carbón, costillas, chunchulla y nuestras picadas para compartir. El verdadero sabor llanero al fuego.',
      hours:'Abierto en el horario del restaurante',
      menu:[
        { name:'Picada Avemaría', price:'$58.000', desc:'Surtido de carnes para compartir (2 pers.)' },
        { name:'Parrillada mixta', price:'$72.000' },
        { name:'Costillas BBQ', price:'$42.000' },
        { name:'Asado de res', price:'$34.000' },
        { name:'Chunchulla crocante', price:'$26.000' }
      ] },

    { id:'floresta', name:'Floresta · Postres', tag:'Postres & Café', icon:'fa-ice-cream', color:'#3B49B0', x:16.2, y:32.7,
      desc:'El rincón dulce entre el verde: postres caseros, helados artesanales, café de origen y antojos para cerrar con broche de oro.',
      hours:'Abierto en el horario del restaurante',
      menu:[
        { name:'Brownie con helado', price:'$16.000' },
        { name:'Postre de la casa', price:'$14.000' },
        { name:'Helado artesanal', price:'$9.000' },
        { name:'Café & cappuccino', price:'$7.000' }
      ] },

    { id:'macondo', name:'Macondo · Tarima', tag:'Música & Pista de baile', icon:'fa-music', color:'#E11161', x:33.2, y:39.1,
      desc:'El escenario del parche: música en vivo los fines de semana y pista de baile para gozar hasta tarde bajo las estrellas.',
      hours:'Música en vivo: viernes y sábado',
      menuTitle:'Programación',
      menu:['Bandas en vivo','Música llanera','Pista de baile','DJ fines de semana'] },

    { id:'principal', name:'Restaurante Principal', tag:'Comedor cubierto', icon:'fa-utensils', color:'#5B3FB0', x:49.7, y:42.4,
      desc:'El corazón techado de Avemaría, bajo la gran cubierta de paneles solares. Sillas de colores, lámparas artesanales y todo el sabor a la mesa.',
      hours:'Abierto en el horario del restaurante',
      menu:[
        { name:'Picada Avemaría', price:'$58.000', desc:'La insignia, para compartir' },
        { name:'Parrillada mixta', price:'$72.000' },
        { name:'Asado de res', price:'$34.000' },
        { name:'Ensalada de la casa', price:'$18.000' },
        { name:'Plato del día', price:'$26.000' }
      ] },

    { id:'ojarasca', name:'Ojarasca · Restaurante', tag:'Comedor al natural', icon:'fa-leaf', color:'#2EB85C', x:36.9, y:52.7,
      desc:'Mesas al aire libre rodeadas de naturaleza y el sonido del bosque nativo. El plan ideal para compartir en familia, pareja o amigos.',
      hours:'Abierto en el horario del restaurante',
      menu:[
        { name:'Mojarra frita', price:'$36.000' },
        { name:'Mazorcada llanera', price:'$24.000' },
        { name:'Trucha al ajillo', price:'$38.000' },
        { name:'Bandeja típica', price:'$32.000', desc:'Carne, plátano, yuca y arroz' }
      ] },

    { id:'kids', name:'Zona Kids', tag:'Juegos & Familia', icon:'fa-child-reaching', color:'#1FB6C9', x:14.4, y:53,
      desc:'Juegos para los más pequeños: juegos gigantes, rodadero y zona segura, para que la familia entera la pase bueno.',
      hours:'Abierto en el horario del restaurante',
      menuTitle:'Detalles',
      menu:['Juegos infantiles','Juegos gigantes','Zona segura','Menú para niños'] },

    { id:'littleitaly', name:'Little Italy · Pizza', tag:'Pizzería artesanal', icon:'fa-pizza-slice', color:'#D62828', x:53.7, y:58.1,
      desc:'Pizza artesanal horneada en horno de leña, con masa de la casa y sabores únicos. ¡Imperdible!',
      hours:'Viernes a domingo y festivos',
      menu:[
        { name:'Pizza Avemaría', price:'$40.000', desc:'La especial de la casa' },
        { name:'Margarita', price:'$32.000' },
        { name:'Pepperoni', price:'$36.000' },
        { name:'Hawaiana', price:'$35.000' },
        { name:'Calzone relleno', price:'$30.000' }
      ] },

    { id:'entrada', name:'Entrada Ave María', tag:'Ingreso principal', icon:'fa-door-open', color:'#FF158C', x:53.5, y:72.3, info:true,
      desc:'El ingreso a Avemaría desde la vía antigua a Restrepo, a solo 5 minutos de Villavicencio. Zona segura y de fácil acceso.' },

    { id:'parqueaderos', name:'Zona de Parqueaderos', tag:'Parqueo amplio', icon:'fa-square-parking', color:'#E6A817', x:30.7, y:78.1, info:true,
      desc:'Amplio parqueadero sobre la entrada, con espacio de sobra y vigilancia, para que solo te preocupes por pasarla bueno.' }
  ];

  var mapEl  = document.getElementById('zonasMap');
  var listEl = document.getElementById('zonasList');
  var drawer = document.getElementById('zDrawer');
  if (!mapEl || !listEl || !drawer) return;

  var pinEls  = {};
  var chipEls = {};
  var lastFocus = null;

  /* ---------- Construir pins y chips ---------- */
  ZONES.forEach(function (z) {
    /* pin en el mapa */
    var pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'zpin' + (z.info ? ' zpin--info' : '');
    pin.style.left = z.x + '%';
    pin.style.top  = z.y + '%';
    pin.setAttribute('aria-label', z.name + ' — ' + z.tag);
    pin.innerHTML =
      '<span class="zpin__dot" style="--c:' + z.color + '"><i class="fa-solid ' + z.icon + '" aria-hidden="true"></i></span>' +
      '<span class="zpin__label">' + z.name + '</span>';
    pin.addEventListener('click', function () { open(z); });
    mapEl.appendChild(pin);
    pinEls[z.id] = pin;

    /* chip en la lista */
    var li = document.createElement('li');
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'zchip';
    chip.style.setProperty('--c', z.color);
    chip.innerHTML = '<i class="fa-solid ' + z.icon + '" aria-hidden="true"></i> ' + z.name;
    chip.addEventListener('click', function () { open(z); });
    li.appendChild(chip);
    listEl.appendChild(li);
    chipEls[z.id] = chip;
  });

  /* ---------- Referencias del panel ---------- */
  var elIcon  = document.getElementById('zIcon');
  var elTag   = document.getElementById('zTag');
  var elTitle = document.getElementById('zTitle');
  var elDesc  = document.getElementById('zDesc');
  var elHours = document.getElementById('zHours');
  var elHoursTxt = elHours.querySelector('span');
  var elMenuWrap = document.getElementById('zMenuWrap');
  var elMenuTitle= document.getElementById('zMenuTitle');
  var elMenu  = document.getElementById('zMenu');
  var elMenuNote = document.getElementById('zMenuNote');
  var elCta   = document.getElementById('zCta');
  var panel   = drawer.querySelector('.zdrawer__panel');
  var btnClose= document.getElementById('zClose');

  /* ====================== Carrusel de la zona ======================
     Imágenes de PRUEBA. Para usar las reales, agrega a cada zona en el
     arreglo ZONES un campo:  images:['statics/zonas/foto1.jpg', ...]      */
  var carEl    = document.getElementById('zCar');
  var carVp    = document.getElementById('zCarViewport');
  var carTrack = document.getElementById('zCarTrack');
  var carDots  = document.getElementById('zCarDots');
  var carPrev  = document.getElementById('zCarPrev');
  var carNext  = document.getElementById('zCarNext');
  var carIndex = 0, carCount = 0, carTimer = null;

  /* Placeholder LOCAL (SVG data-URI): sin dependencias externas, listo para
     desplegar. Se reemplaza agregando images:['statics/zonas/...'] a la zona. */
  function placeholderImg(color, n, name) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + color + '"/>' +
      '<stop offset="1" stop-color="#15121a"/></linearGradient></defs>' +
      '<rect width="640" height="400" fill="url(#g)"/>' +
      '<g transform="translate(320,168)" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.9">' +
      '<rect x="-50" y="-28" width="100" height="64" rx="12"/><circle r="19"/>' +
      '<path d="M-22 -28 L-12 -44 L12 -44 L22 -28"/></g>' +
      '<text x="320" y="266" text-anchor="middle" fill="#ffffff" font-family="Poppins,Arial,sans-serif" font-size="26" font-weight="700">Foto de prueba ' + n + '</text>' +
      '<text x="320" y="298" text-anchor="middle" fill="#ffffff" opacity="0.82" font-family="Poppins,Arial,sans-serif" font-size="18">' + name + '</text>' +
      '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }
  function zoneImages(z) {
    if (z.images && z.images.length) return z.images;            // fotos reales si existen
    return [1, 2, 3].map(function (n) {                          // placeholders locales de prueba
      return placeholderImg(z.color, n, z.name);
    });
  }
  var prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function stopAuto()    { if (carTimer) { clearInterval(carTimer); carTimer = null; } }
  function startAuto()   { stopAuto(); if (carCount > 1 && !prefersReduced) carTimer = setInterval(nextSlide, 4200); }
  function restartAuto() { startAuto(); }
  function updateDots() {
    Array.prototype.forEach.call(carDots.children, function (d, i) {
      var on = i === carIndex;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  function goTo(i) {
    if (!carCount) return;
    carIndex = (i + carCount) % carCount;
    carTrack.style.transform = 'translateX(' + (-carIndex * 100) + '%)';
    updateDots();
  }
  function nextSlide() { goTo(carIndex + 1); }
  function prevSlide() { goTo(carIndex - 1); }

  function buildCarousel(z) {
    stopAuto();
    var imgs = zoneImages(z);
    carCount = imgs.length; carIndex = 0;
    carTrack.classList.add('no-anim');
    carTrack.style.transform = 'translateX(0)';
    carTrack.innerHTML = imgs.map(function (src, i) {
      return '<div class="zcar__slide">' +
               '<img src="' + src + '" alt="Foto de prueba ' + (i + 1) + ' de ' + z.name + '" ' +
               'loading="lazy" onerror="this.parentNode.classList.add(\'is-broken\')">' +
               '<span class="zcar__cap">Foto ' + (i + 1) + ' / ' + imgs.length + '</span>' +
             '</div>';
    }).join('');
    carDots.innerHTML = imgs.map(function (_, i) {
      return '<button type="button" role="tab" aria-selected="false" aria-label="Ir a imagen ' + (i + 1) + '"></button>';
    }).join('');
    Array.prototype.forEach.call(carDots.children, function (d, i) {
      d.addEventListener('click', function () { goTo(i); restartAuto(); });
    });
    updateDots();
    void carTrack.offsetWidth;                 // reflow para reactivar la transición
    carTrack.classList.remove('no-anim');
    var multi = carCount > 1;
    carPrev.style.display = multi ? '' : 'none';
    carNext.style.display = multi ? '' : 'none';
    carDots.style.display = multi ? '' : 'none';
    if (multi) startAuto();
  }

  carPrev.addEventListener('click', function () { prevSlide(); restartAuto(); });
  carNext.addEventListener('click', function () { nextSlide(); restartAuto(); });
  carEl.addEventListener('mouseenter', stopAuto);
  carEl.addEventListener('mouseleave', restartAuto);

  /* swipe en táctil */
  var tStartX = 0, tDx = 0, tSwiping = false;
  carVp.addEventListener('touchstart', function (e) { tStartX = e.touches[0].clientX; tDx = 0; tSwiping = true; stopAuto(); }, { passive: true });
  carVp.addEventListener('touchmove',  function (e) { if (tSwiping) tDx = e.touches[0].clientX - tStartX; }, { passive: true });
  carVp.addEventListener('touchend',   function () {
    if (tSwiping && Math.abs(tDx) > 40) { tDx < 0 ? nextSlide() : prevSlide(); }
    tSwiping = false; restartAuto();
  });

  function setActive(id) {
    Object.keys(pinEls).forEach(function (k) {
      pinEls[k].classList.toggle('zpin--active', k === id);
      chipEls[k].classList.toggle('zchip--active', k === id);
    });
  }

  /* ---------- Abrir zona ---------- */
  function open(z) {
    panel.style.setProperty('--zc', z.color);
    elIcon.innerHTML = '<i class="fa-solid ' + z.icon + '" aria-hidden="true"></i>';
    elTag.textContent = z.tag;
    elTitle.textContent = z.name;
    elDesc.textContent = z.desc;

    buildCarousel(z);

    if (z.hours) { elHoursTxt.textContent = z.hours; elHours.classList.remove('hidden'); }
    else { elHours.classList.add('hidden'); }

    if (z.menu && z.menu.length) {
      elMenuTitle.textContent = z.menuTitle || 'Especialidades';
      var hasPrices = false;
      elMenu.innerHTML = z.menu.map(function (m) {
        var name  = (typeof m === 'string') ? m : m.name;
        var price = (m && m.price) ? '<span class="zmenu-price">' + m.price + '</span>' : '';
        var desc  = (m && m.desc)  ? '<span class="zmenu-desc">' + m.desc + '</span>'   : '';
        if (m && m.price) hasPrices = true;
        return '<li><span class="zmenu-main"><span class="zmenu-name">' + name + '</span>' + desc + '</span>' + price + '</li>';
      }).join('');
      elMenuNote.classList.toggle('hidden', !hasPrices);
      elMenuWrap.classList.remove('hidden');
    } else {
      elMenuWrap.classList.add('hidden');
    }

    var label = z.info ? 'Escríbenos por WhatsApp' : 'Reservar esta zona';
    elCta.href = WA + encodeURIComponent('Hola Avemaría, quiero información sobre: ' + z.name);
    elCta.innerHTML = '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i> ' + label;

    setActive(z.id);
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }

  /* ---------- Cerrar ---------- */
  function close() {
    stopAuto();
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setActive(null);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  drawer.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (e) {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowRight') { nextSlide(); restartAuto(); return; }
    if (e.key === 'ArrowLeft')  { prevSlide(); restartAuto(); return; }
    if (e.key === 'Tab') {
      // Focus trap: mantener el foco dentro del panel mientras está abierto.
      var sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
      var nodes = Array.prototype.filter.call(panel.querySelectorAll(sel), function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0;
      });
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();

/* =========================================================
   VIDEO / SHOWREEL — autoplay silenciado + toggle de sonido
   ========================================================= */
(function () {
  'use strict';
  var player = document.getElementById('reelPlayer');
  if (!player) return;
  var video    = document.getElementById('reelVideo');
  var soundBtn = document.getElementById('reelSound');

  // Reproduce solo y en bucle, en silencio (requisito de autoplay del navegador).
  function tryPlay() {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});   // ignora rechazo de autoplay
  }
  if (video.readyState >= 2) tryPlay();
  video.addEventListener('canplay', tryPlay, { once: true });

  // Solo reproduce cuando es visible, para no gastar datos fuera de pantalla.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) tryPlay(); else video.pause();
      });
    }, { threshold: 0.25 }).observe(player);
  }

  // Botón para activar/silenciar el audio.
  soundBtn.addEventListener('click', function () {
    video.muted = !video.muted;
    var on = !video.muted;
    if (on) tryPlay();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
    soundBtn.querySelector('i').className =
      on ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  });
})();
