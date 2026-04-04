/**
 * GSAP animation orchestration center.
 *
 * Handles entry animations, hover glow effects, H2 title reveals,
 * ambient orbs, and the worldbook entry fly-to-edit-area animation.
 * Exposes `window.__animateNewEntry__`, `window.__flyToEditArea__`,
 * and `window.__fxEnabled__` on the bridge layer.
 */
export function initGsapAnimations(): void {
  var gsapRef = (window as any).gsap;
  if (!gsapRef) return;

  // ============================================================
  //  Utilities
  // ============================================================
  function qAll(sel: string): Element[] { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function q(sel: string): Element | null { return document.querySelector(sel); }

  var loopTweens: any[] = [];   // All pausable continuous animations
  var orbEls: HTMLElement[] = [];       // Ambient orb DOM
  var glowEls: HTMLElement[] = [];      // Hover glow DOM

  // ============================================================
  //  1. Entry animation — Transformer fold-out
  // ============================================================
  var header = q('.app-header') as HTMLElement | null;
  var logo = q('.app-logo') as HTMLElement | null;
  var title = q('.app-title') as HTMLElement | null;
  var subtitle = q('.app-subtitle') as HTMLElement | null;
  var badge = q('.app-version-badge') as HTMLElement | null;

  var master = gsapRef.timeline({ defaults: { ease: 'power3.out' } });

  if (header) {
    gsapRef.set(header, { y: -40, opacity: 0 });
    master.to(header, { y: 0, opacity: 1, duration: 0.8 }, 0);
  }
  if (logo) {
    gsapRef.set(logo, { scale: 0, rotation: -180 });
    master.to(logo, { scale: 1, rotation: 0, duration: 1, ease: 'back.out(1.7)' }, 0.2);
  }
  if (title) {
    gsapRef.set(title, { x: -30, opacity: 0 });
    master.to(title, { x: 0, opacity: 1, duration: 0.7 }, 0.4);
  }
  if (subtitle) {
    gsapRef.set(subtitle, { x: -20, opacity: 0 });
    master.to(subtitle, { x: 0, opacity: 1, duration: 0.6 }, 0.55);
  }
  if (badge) {
    gsapRef.set(badge, { scale: 0 });
    master.to(badge, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, 0.6);
  }

  // -- Panel: 3D unfold -- point -> line -> surface -> content slides out --
  var panels = qAll('.app-container > *');
  var panelColors = [
    { r: 99, g: 102, b: 241 },   // Core - indigo
    { r: 139, g: 92, b: 246 },   // Character - purple
    { r: 16, g: 185, b: 129 },   // Worldbook - green
    { r: 56, g: 189, b: 248 },   // Preview - sky blue
    { r: 244, g: 114, b: 182 },  // Chat area - pink
    { r: 245, g: 158, b: 11 },   // StatusBar - amber
    { r: 52, g: 211, b: 153 },   // Auditor - emerald
  ];

  function rgba(c: { r: number; g: number; b: number }, a: number): string {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  if (panels.length) {
    var container = q('.app-container') as HTMLElement | null;
    if (container) {
      container.style.perspective = '1400px';
      container.style.perspectiveOrigin = '50% 30%';
    }

    panels.forEach(function (panel: Element, idx: number) {
      var panelEl = panel as HTMLElement;
      var c = panelColors[idx % panelColors.length];
      var delay = 0.7 + idx * 0.4;

      // Save original styles
      var origBorder = getComputedStyle(panelEl).borderColor;
      var origBg = getComputedStyle(panelEl).background;

      // Force panel relative positioning (only for static elements) + hide horizontal overflow during animation
      var origPosition = getComputedStyle(panelEl).position;
      var needSetPosition = origPosition === 'static';
      if (needSetPosition) {
        panelEl.style.position = 'relative';
      }
      panelEl.style.overflowX = 'hidden';

      // === Create "outer frame" rectangle (border-only div) ===
      var frame = document.createElement('div');
      frame.style.cssText =
        'position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:20;' +
        'border:1.5px solid ' + rgba(c, 0.8) + ';' +
        'box-shadow:0 0 12px ' + rgba(c, 0.3) + ', inset 0 0 12px ' + rgba(c, 0.08) + ';' +
        'transform-origin:center center;';
      panelEl.appendChild(frame);

      // === Light sweep bar ===
      var sweep = document.createElement('div');
      sweep.style.cssText =
        'position:absolute;top:0;left:0;width:40%;height:100%;z-index:21;pointer-events:none;opacity:0;' +
        'background:linear-gradient(90deg, transparent, ' + rgba(c, 0.08) + ', ' + rgba(c, 0.25) + ', ' + rgba(c, 0.08) + ', transparent);' +
        'filter:blur(6px);';
      panelEl.appendChild(sweep);

      // === Collect child elements (direct children only, exclude auxiliary layers) ===
      var children: HTMLElement[] = [];
      var childNodes = panelEl.children;
      for (var i = 0; i < childNodes.length; i++) {
        var ch = childNodes[i] as HTMLElement;
        if (ch === frame || ch === sweep) continue;
        if (ch.classList.contains('panel-hover-glow')) continue;
        if (ch.classList.contains('unfold-scan-line') || ch.classList.contains('unfold-border-glow')) continue;
        children.push(ch);
      }

      // === Initial state: entire panel invisible, outer frame starts from a point ===
      gsapRef.set(panelEl, {
        opacity: 0,
        transformOrigin: '50% 50%',
      });
      // Hide all child content
      children.forEach(function (ch) {
        gsapRef.set(ch, { opacity: 0, y: 0 });
      });

      // === Frame initially a point ===
      gsapRef.set(frame, {
        scaleX: 0,
        scaleY: 0,
        opacity: 1,
      });

      // Save children reference for cleanup
      var _panelChildren = children;

      var tl = gsapRef.timeline({ delay: delay });

      // -- Phase 1: panel visible + frame expands from point to horizontal line (0 -> 0.8s) --
      tl.to(panelEl, {
        opacity: 1,
        duration: 0.15,
        ease: 'power1.in',
      }, 0);

      tl.to(frame, {
        scaleX: 1,
        scaleY: 0.015,
        duration: 0.8,
        ease: 'power3.inOut',
      }, 0);

      // Glow pulse while horizontal line expands
      tl.fromTo(frame, {
        boxShadow: '0 0 20px ' + rgba(c, 0.6) + ', inset 0 0 20px ' + rgba(c, 0.2),
      }, {
        boxShadow: '0 0 8px ' + rgba(c, 0.3) + ', inset 0 0 8px ' + rgba(c, 0.05),
        duration: 0.8,
        ease: 'power2.out',
      }, 0);

      // -- Phase 2: line expands vertically into surface (0.7 -> 1.8s) --
      tl.to(frame, {
        scaleY: 1,
        duration: 1.1,
        ease: 'power2.out',
      }, 0.7);

      // Panel background follows reveal (clip-path expands from center line outward)
      gsapRef.set(panelEl, {
        clipPath: 'inset(50% 0% 50% 0%)',
      });
      tl.to(panelEl, {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.1,
        ease: 'power2.out',
      }, 0.7);

      // Sweep light across
      tl.fromTo(sweep, {
        opacity: 1, left: '-40%',
      }, {
        left: '120%',
        duration: 0.9,
        ease: 'power1.inOut',
      }, 1.0);
      tl.to(sweep, { opacity: 0, duration: 0.2 }, 1.8);

      // -- Phase 3: content elements slide out sequentially (from 1.6s) --
      var contentStart = 1.6;
      var slideDur = 0.45;
      var slideGap = 0.12;

      children.forEach(function (ch, ci) {
        var t = contentStart + ci * slideGap;

        gsapRef.set(ch, {
          opacity: 0,
          y: -15,
          scale: 0.97,
          filter: 'blur(4px)',
        });

        tl.to(ch, {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: slideDur,
          ease: 'power2.out',
        }, t);
      });

      // -- Phase 4: frame fades out, restore original styles --
      var frameOutTime = contentStart + children.length * slideGap + 0.2;
      tl.to(frame, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
      }, frameOutTime);

      // -- Cleanup --
      tl.call(function () {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        if (sweep.parentNode) sweep.parentNode.removeChild(sweep);
        panelEl.style.clipPath = '';
        panelEl.style.overflowX = '';
        if (needSetPosition) panelEl.style.position = '';
        panelEl.style.filter = '';
        gsapRef.set(panelEl, { clearProps: 'transform,opacity,scale,clipPath,filter,willChange' });
        _panelChildren.forEach(function (ch) {
          gsapRef.set(ch, { clearProps: 'transform,opacity,scale,y,filter,willChange' });
        });
      }, null, null, frameOutTime + 0.8);
    });
  }

  if (header) {
    var shine = document.createElement('div');
    shine.className = 'header-shine-sweep';
    header.appendChild(shine);
    master.fromTo(shine, { x: '-100%' }, { x: '200%', duration: 1.2, ease: 'power2.inOut' }, 0.8);
  }

  // ============================================================
  //  2. Panel hover glow (no scale, light effect only)
  // ============================================================
  var allPanels = qAll('.panel, .code-window');
  allPanels.forEach(function (panel) {
    var panelEl = panel as HTMLElement;
    var glowEl = document.createElement('div');
    glowEl.className = 'panel-hover-glow';
    panelEl.appendChild(glowEl);
    glowEls.push(glowEl);

    panelEl.addEventListener('mouseenter', function () {
      gsapRef.to(glowEl, { opacity: 1, duration: 0.4 });
    });
    panelEl.addEventListener('mouseleave', function () {
      gsapRef.to(glowEl, { opacity: 0, duration: 0.5 });
    });
    var _glowRAF = 0;
    panelEl.addEventListener('mousemove', function (e: MouseEvent) {
      if (_glowRAF) return;
      _glowRAF = requestAnimationFrame(function () {
        var rect = panelEl.getBoundingClientRect();
        glowEl.style.setProperty('--glow-x', (e.clientX - rect.left) + 'px');
        glowEl.style.setProperty('--glow-y', (e.clientY - rect.top) + 'px');
        _glowRAF = 0;
      });
    });
  });

  // ============================================================
  //  3. H2 title entry
  // ============================================================
  var h2s = qAll('.panel h2');
  if (h2s.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          gsapRef.fromTo(entry.target,
            { x: -20, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
          );
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    h2s.forEach(function (h) { gsapRef.set(h, { opacity: 0 }); obs.observe(h); });
  }

  // ============================================================
  //  4. Logo continuous floating + pulse (pausable)
  // ============================================================
  if (logo) {
    loopTweens.push(gsapRef.to(logo, {
      y: -3, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1,
    }));
    loopTweens.push(gsapRef.to(logo, {
      boxShadow: '0 0 18px rgba(139,92,246,0.5), 0 0 40px rgba(139,92,246,0.2)',
      duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5,
    }));
  }

  // ============================================================
  //  5. Badge breathing light (pausable)
  // ============================================================
  if (badge) {
    loopTweens.push(gsapRef.to(badge, {
      boxShadow: '0 0 12px rgba(139,92,246,0.4), inset 0 0 6px rgba(139,92,246,0.1)',
      duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1,
    }));
  }

  // ============================================================
  //  6. Ambient floating orbs (hideable)
  // ============================================================
  function createOrb(color: string, size: number, posX: number, posY: number, dur: number) {
    var orb = document.createElement('div');
    orb.className = 'ambient-orb';
    orb.style.cssText =
      'width:' + size + 'px;height:' + size + 'px;' +
      'background:radial-gradient(circle, ' + color + ' 0%, transparent 70%);' +
      'left:' + posX + '%;top:' + posY + '%;';
    document.body.appendChild(orb);
    orbEls.push(orb);
    loopTweens.push(gsapRef.to(orb, {
      x: 'random(-80, 80)', y: 'random(-60, 60)',
      duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1,
      delay: Math.random() * 2,
    }));
    loopTweens.push(gsapRef.to(orb, {
      opacity: 'random(0.3, 0.8)',
      duration: dur * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1,
    }));
  }

  createOrb('rgba(139,92,246,0.06)', 500, 10, 20, 12);
  createOrb('rgba(56,189,248,0.05)', 400, 80, 10, 15);
  createOrb('rgba(16,185,129,0.04)', 450, 50, 80, 18);
  createOrb('rgba(245,158,11,0.03)', 350, 25, 65, 14);

  // ============================================================
  //  7. Entry item bounce-in hook
  // ============================================================
  (window as any).__animateNewEntry__ = function (el: HTMLElement) {
    if (!el || !(window as any).gsap) return;
    gsapRef.fromTo(el,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
    );
  };

  // ============================================================
  //  8. Header border flowing light (pausable)
  // ============================================================
  if (header) {
    header.classList.add('header-glow-border');
    var angle = { value: 0 };
    loopTweens.push(gsapRef.to(angle, {
      value: 360, duration: 8, ease: 'none', repeat: -1,
      onUpdate: function () {
        header.style.setProperty('--glow-angle', angle.value + 'deg');
      },
    }));
  }

  // ============================================================
  //  9. Worldbook edit -- text fly animation (arc + typewriter)
  // ============================================================

  /* Quadratic bezier interpolation */
  function quadBezier(t: number, p0: number, p1: number, p2: number): number {
    var u = 1 - t;
    return u * u * p0 + 2 * u * t * p1 + t * t * p2;
  }

  /* Typewriter effect: fill input/textarea character by character */
  function typewriterFill(el: HTMLInputElement | HTMLTextAreaElement, text: string, dur: number) {
    if (!el || !text) return;
    el.value = '';
    var len = text.length;
    var perChar = dur / len;
    var idx = 0;
    el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    el.style.boxShadow = '0 0 12px rgba(139,92,246,0.35), inset 0 0 6px rgba(139,92,246,0.1)';
    el.style.borderColor = 'rgba(139,92,246,0.5)';
    function tick() {
      if (idx < len) {
        el.value += text[idx];
        idx++;
        setTimeout(tick, perChar * 1000);
      } else {
        el.style.boxShadow = '';
        el.style.borderColor = '';
        setTimeout(function () { el.style.transition = ''; }, 350);
      }
    }
    tick();
  }

  /* Select dropdown delayed assignment + flash */
  function flashSetSelect(el: HTMLSelectElement | null, val: string) {
    if (!el) return;
    el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    el.style.boxShadow = '0 0 12px rgba(139,92,246,0.35)';
    el.style.borderColor = 'rgba(139,92,246,0.5)';
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    setTimeout(function () {
      el.style.boxShadow = ''; el.style.borderColor = '';
      setTimeout(function () { el.style.transition = ''; }, 350);
    }, 500);
  }

  (window as any).__flyToEditArea__ = function (entryEl: HTMLElement, data: any): boolean {
    if (!gsapRef || !entryEl) return false;

    var editArea = document.getElementById('wbManualEditArea') as HTMLElement | null;
    if (!editArea) return false;

    var er = entryEl.getBoundingClientRect();
    var ar = editArea.getBoundingClientRect();

    /* -- Build text fragments (with target field IDs) -- */
    var chips: { t: string; c: string; field: string; val: string }[] = [];
    if (data.comment)
      chips.push({ t: '\uD83D\uDCCC ' + data.comment, c: '#c4b5fd', field: 'entryComment', val: data.comment });
    if (data.content) {
      var preview = data.content.length > 28 ? data.content.slice(0, 28) + '…' : data.content;
      chips.push({ t: '\uD83D\uDCDD ' + preview, c: '#93c5fd', field: 'entryContent', val: data.content });
    }
    if (data.keys && data.keys.length)
      chips.push({ t: '\uD83D\uDD11 ' + data.keys.join(', '), c: '#6ee7b7', field: 'entryKeys', val: data.keys.join(', ') });
    chips.push({ t: '\u2699\uFE0F ' + (data.strategy || 'selective'), c: '#fcd34d', field: 'entryStrategy', val: data.strategy || 'selective' });
    if (!chips.length) return false;

    /* -- Coordinates -- */
    var sx = er.left + er.width * 0.4;
    var sy = er.top  + er.height / 2;
    var ex = ar.left + ar.width / 2;
    var ey = Math.max(80, Math.min(ar.top + ar.height * 0.35, window.innerHeight - 80));

    /* Arc control point (offset left or right for curvature) */
    var dxx = ex - sx;
    var dy = ey - sy;
    var curveDir = dxx > 0 ? -1 : 1;
    var cpx = (sx + ex) / 2 + curveDir * Math.min(Math.abs(dy) * 0.5, 200);
    var cpy = Math.min(sy, ey) - Math.abs(dy) * 0.25 - 60;

    /* -- Entry card flash pulse -- */
    gsapRef.fromTo(entryEl,
      { boxShadow: '0 0 0px rgba(139,92,246,0)' },
      {
        boxShadow: '0 0 28px rgba(139,92,246,0.55), inset 0 0 14px rgba(139,92,246,0.15)',
        duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.inOut',
        clearProps: 'boxShadow',
      }
    );

    /* -- Clear form, wait for fragments to arrive then typewriter -- */
    var fieldsToType = ['entryComment', 'entryContent', 'entryKeys'];
    fieldsToType.forEach(function (id) {
      var f = document.getElementById(id) as HTMLInputElement | null;
      if (f) f.value = '';
    });

    /* -- Fragments fly out along arcs one by one -- */
    var flyDur = 0.65;

    chips.forEach(function (s, i) {
      var el = document.createElement('div');
      el.textContent = s.t;
      el.style.cssText =
        'position:fixed;z-index:99999;pointer-events:none;' +
        'font-size:0.74rem;font-weight:700;color:' + s.c + ';' +
        'background:rgba(8,12,28,0.92);padding:5px 14px;border-radius:8px;' +
        'border:1px solid ' + s.c + ';' +
        'box-shadow:0 0 18px ' + s.c + '55,0 2px 8px rgba(0,0,0,0.6);' +
        'white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;' +
        'left:0;top:0;opacity:0;font-family:inherit;letter-spacing:0.02em;';

      /* Particle trail container */
      var trail = document.createElement('div');
      trail.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;overflow:hidden;';
      el.appendChild(trail);

      document.body.appendChild(el);

      var stagger = i * 0.12;
      var perChipOx = (i - (chips.length - 1) / 2) * 32;

      var myCpx = cpx + perChipOx * 1.5;
      var myCpy = cpy - i * 18;
      var myEx  = ex + perChipOx * 0.3;
      var myEy  = ey + i * 6;

      gsapRef.set(el, {
        x: sx, y: sy, scale: 0.1, opacity: 0,
        rotation: gsapRef.utils.random(-12, 12),
      });

      var tl2 = gsapRef.timeline({ delay: stagger });

      /* Phase A -- pop out from behind entry card */
      tl2.to(el, {
        opacity: 1, scale: 1, rotation: gsapRef.utils.random(-4, 4),
        x: sx + perChipOx, y: sy - 35 - i * 8,
        duration: 0.3,
        ease: 'back.out(2.2)',
      });

      /* Phase B -- bezier arc flight */
      var progress = { t: 0 };
      var popX = sx + perChipOx;
      var popY = sy - 35 - i * 8;

      tl2.to(progress, {
        t: 1,
        duration: flyDur,
        ease: 'power2.inOut',
        onUpdate: function () {
          var p = progress.t;
          var cx = quadBezier(p, popX, myCpx, myEx);
          var cy = quadBezier(p, popY, myCpy, myEy);
          gsapRef.set(el, {
            x: cx, y: cy,
            rotation: (1 - p) * gsapRef.utils.random(-6, 6),
            scale: 1 + Math.sin(p * Math.PI) * 0.15,
          });

          var glowStr = Math.sin(p * Math.PI) * 40;
          el.style.boxShadow = '0 0 ' + (18 + glowStr) + 'px ' + s.c + '88, 0 0 ' + (8 + glowStr * 1.5) + 'px ' + s.c + '44, 0 2px 8px rgba(0,0,0,0.6)';
        },
      });

      /* Phase C -- dissolve on arrival + trigger typewriter */
      tl2.to(el, {
        opacity: 0, scale: 0.3,
        duration: 0.25, ease: 'power2.in',
        onComplete: function () {
          el.remove();
          var target = document.getElementById(s.field) as (HTMLInputElement | HTMLSelectElement | null);
          if (target) {
            if (target.tagName === 'SELECT') {
              flashSetSelect(target as HTMLSelectElement, s.val);
            } else {
              var typeDur = Math.min(s.val.length * 0.018, 0.8);
              typewriterFill(target as HTMLInputElement | HTMLTextAreaElement, s.val, Math.max(typeDur, 0.2));
            }
          }
        },
      });
    });

    /* -- Edit area receive light pulse -- */
    var receiveT = chips.length * 0.12 + 0.3 + flyDur + 0.1;
    gsapRef.delayedCall(receiveT, function () {
      gsapRef.fromTo(editArea,
        { boxShadow: '0 0 0 rgba(139,92,246,0)', borderColor: 'rgba(30,41,59,1)' },
        {
          boxShadow: '0 0 30px rgba(139,92,246,0.45), inset 0 0 20px rgba(139,92,246,0.1)',
          borderColor: 'rgba(139,92,246,0.6)',
          duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.inOut',
          clearProps: 'boxShadow,borderColor',
        }
      );

      var extras = [
        { id: 'entryPosition', val: String(data.position || 4) },
        { id: 'entryDepth', val: String(data.depth || 4) },
        { id: 'entryRole', val: String(data.role || 0) },
        { id: 'entryOrder', val: String(data.order || 100) },
        { id: 'entryProb', val: String(data.prob || 100) },
      ];
      extras.forEach(function (item, idx) {
        setTimeout(function () {
          flashSetSelect(document.getElementById(item.id) as HTMLSelectElement | null, item.val);
        }, idx * 80);
      });
    });

    return true;
  };

  // ============================================================
  //  Initial state
  // ============================================================
  // Effects always enabled
  (window as any).__fxEnabled__ = function () { return true; };
}
