// HTML overlays: intro, HUD, catalogue, tour captions and the detail view.
import { catalogueNo } from './museum.js';
import { Minimap } from './minimap.js';
import { say, count, tr, LANGUAGES, getLanguage } from './i18n.js';

const $ = (id) => document.getElementById(id);

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false && c !== '') el.append(c);
  return el;
}

const paragraphs = (text) => String(text || '').split(/\n\s*\n/).filter(Boolean).map((p) => h('p', {}, p));
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));
const shortNo = catalogueNo;

let touch = false;
let me = null; // the profile
let enterState = 'loading'; // loading | ready | failed: what the big button says
let soundOn = true;
let tourPaused = false;
let fullscreenOn = false;

export function init(profile, isTouch) {
  touch = isTouch;
  me = profile;
  applyLanguage();
}

// Translates the static markup: data-i18n (text), data-i18n-html (text with <kbd>), data-i18n-label (aria-label).
// Text built in code, like the prompt and the catalogue, is redrawn by the callers (see main.js).
export function applyLanguage() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = say(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = say(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', say(el.dataset.i18nLabel));
  document.title = `${me.name} · ${tr(me.role)}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', say('description'));
  $('intro-eyebrow').textContent = `${say('permanent')}${me.since ? ` · ${say('est', { n: me.since })}` : ''}`;
  $('intro-name').textContent = me.name;
  $('intro-role').textContent = tr(me.role);
  $('enter-btn').textContent = say({ loading: 'intro.loading', ready: 'intro.enter', failed: 'intro.error' }[enterState]);
  setSound(soundOn);
  setTourPaused(tourPaused);
  setFullscreen(fullscreenOn);
  lastRoom = null; // forces the room name and prompt to be rewritten
  lastTarget = undefined;
  for (const b of document.querySelectorAll('.lang-btn')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLanguage()));
}

// A button per language in every .lang-switch
export function buildLanguageSwitches(onPick) {
  for (const box of document.querySelectorAll('.lang-switch')) {
    box.replaceChildren(...LANGUAGES.map((l) => h('button', {
      type: 'button', class: 'lang-btn', 'data-lang': l.code, lang: l.code, 'aria-pressed': String(l.code === getLanguage()), onclick: () => onPick(l.code),
    }, l.name)));
  }
}

export function bind(on) {
  $('enter-btn').onclick = on.enter;
  $('intro-tour-btn').onclick = on.tour;
  $('intro-cat-btn').onclick = on.browse;
  $('cat-tour-btn').onclick = on.tour;
  $('cat-sound-btn').onclick = on.sound;
  $('cat-volume').addEventListener('input', (e) => on.volume(e.target.value / 100));
  $('resume-btn').onclick = on.resume;
  $('catalogue-close').onclick = on.resume;
  $('catalogue').addEventListener('click', (e) => { if (e.target.id === 'catalogue') on.resume(); }); // a click outside the panel
  $('menu-btn').onclick = on.browse;
  $('fullscreen-btn').onclick = on.fullscreen;
  $('inspect-close').onclick = on.closeInspect;
  $('inspect').addEventListener('click', (e) => { if (e.target.id === 'inspect') on.closeInspect(); });
  $('tour-prev').onclick = on.tourPrev;
  $('tour-next').onclick = on.tourNext;
  $('tour-room').onclick = on.tourRoom;
  $('tour-pause').onclick = on.tourPause;
  $('tour-more').onclick = on.tourMore;
  $('tour-stop').onclick = on.tourStop;
}

export function ready() {
  const btn = $('enter-btn');
  btn.disabled = false;
  $('intro-tour-btn').disabled = false;
  enterState = 'ready';
  btn.textContent = say('intro.enter');
  btn.focus();
}

export function fail(message) {
  const btn = $('enter-btn');
  enterState = 'failed';
  btn.textContent = say('intro.error');
  $('intro-error').textContent = message;
  $('intro-error').hidden = false;
}

// Which overlay is visible: 'intro' | 'catalogue' | 'inspect' | null (walking)
export function showScreen(name) {
  for (const id of ['intro', 'catalogue', 'inspect']) $(id).hidden = id !== name;
  $('hud').hidden = name !== null;
}

// Fade to black to hide a teleport
export function fade(fn) {
  const el = $('fade');
  el.classList.add('on');
  setTimeout(() => {
    fn();
    requestAnimationFrame(() => el.classList.remove('on'));
  }, 220);
}

let lastRoom = null;
export function setRoom(room) {
  if (room === lastRoom) return;
  lastRoom = room;
  $('hud-room-no').textContent = room.numeral ? say('room', { n: room.numeral }) : say('welcome');
  $('hud-room-title').textContent = room.title;
}

let lastTarget;
export function setPrompt(ex) {
  if (ex === lastTarget) return;
  lastTarget = ex;
  $('crosshair').classList.toggle('active', !!ex);
  const p = $('prompt');
  p.hidden = !ex;
  if (!ex) return;
  fill(p,
    h('kbd', {}, touch ? say('tap') : 'E'),
    h('span', { class: 'prompt-title' }, ex.title),
    ex.no ? h('span', { class: 'prompt-no' }, shortNo(ex)) : null,
  );
}

export function setFullscreen(on) {
  fullscreenOn = on;
  const btn = $('fullscreen-btn');
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-label', say(on ? 'hud.exitFullscreen' : 'hud.fullscreen'));
}

export function setResumeHint(on) {
  $('resume-hint').hidden = !on;
}

// mini-map

let miniMap = null;

export function buildMap(museum) {
  miniMap = new Minimap($('minimap'), museum);
}

export function drawMiniMap(player, room) {
  miniMap?.draw(player, room);
}

// catalogue

// First image of a piece, or its painted title card
function pictureFor(ex) {
  const shot = ex.media?.find((m) => m.type === 'image');
  return shot ? shot.src : ex.fallbackURL();
}

function workTile(ex, onOpen) {
  const img = h('img', { src: pictureFor(ex), alt: '', loading: 'lazy', decoding: 'async' });
  img.onerror = () => { img.onerror = null; img.src = ex.fallbackURL(); };
  return h('li', {},
    h('button', { class: 'cat-work', onclick: () => onOpen(ex) },
      h('span', { class: 'cat-thumb' }, img),
      h('span', { class: 'cat-work-text' },
        h('span', { class: 'cat-work-no' }, shortNo(ex)),
        h('span', { class: 'cat-work-title' }, ex.title),
        ex.tagline ? h('span', { class: 'cat-work-line' }, ex.tagline) : null)));
}

function languageTile(ex, onOpen) {
  return h('li', {},
    h('button', { class: 'cat-lang', style: `--tile: ${ex.color}`, onclick: () => onOpen(ex) },
      h('span', { class: 'cat-glyph' }, ex.glyph || ex.title.slice(0, 2)),
      h('span', { class: 'cat-work-text' },
        h('span', { class: 'cat-work-title' }, ex.title),
        ex.medium ? h('span', { class: 'cat-work-line' }, ex.medium) : null)));
}

export function buildCatalogue(museum, { onGoto, onOpen }) {
  const list = $('catalogue-list');
  list.replaceChildren();
  for (const room of museum.plan) {
    if (room.kind === 'hub') continue;
    const langs = room.kind === 'languages';
    const n = room.exhibits.length;
    list.append(h('section', { class: 'cat-room', style: `--hall: ${room.wall}; --hall-ink: ${room.ink.ink}; --hall-soft: ${room.ink.soft}` },
      h('header', { class: 'cat-banner' },
        h('span', { class: 'cat-numeral', 'aria-hidden': 'true' }, room.numeral),
        h('div', { class: 'cat-banner-text' },
          h('h3', {}, room.title),
          h('p', {}, [room.subtitle, count(langs ? 'piece' : 'work', n)].filter(Boolean).join(' · '))),
        h('button', { class: 'cat-go', onclick: () => onGoto(room) }, say('cat.walk'), h('span', { 'aria-hidden': 'true' }, ' →'))),
      h('ul', { class: `cat-works${langs ? ' cat-works--langs' : ''}` },
        room.exhibits.map((ex) => (langs ? languageTile(ex, onOpen) : workTile(ex, onOpen))))));
  }
  if (museum.contact) {
    list.append(h('section', { class: 'cat-room', style: '--hall: #2a2622; --hall-ink: #f3eee4; --hall-soft: rgba(243,238,228,0.7)' },
      h('header', { class: 'cat-banner' },
        h('span', { class: 'cat-numeral', 'aria-hidden': 'true' }, '@'),
        h('div', { class: 'cat-banner-text' },
          h('h3', {}, say('cat.contact')),
          h('p', {}, say('together'))),
        h('button', { class: 'cat-go', onclick: () => onOpen(museum.contact) }, say('getInTouch'), h('span', { 'aria-hidden': 'true' }, ' →')))));
  }
}

export function showCatalogue() {
  showScreen('catalogue');
}

export function setSound(on) {
  soundOn = on;
  $('cat-sound-btn').textContent = say(on ? 'cat.soundOn' : 'cat.soundOff');
  $('catalogue').classList.toggle('is-muted', !on);
}

export function setVolume(v) {
  const percent = Math.round(v * 100);
  const slider = $('cat-volume');
  slider.value = percent;
  slider.style.setProperty('--fill', `${percent}%`);
  $('cat-volume-value').textContent = `${percent}%`;
}

// tour bar

export function setTouring(on) {
  $('hud').classList.toggle('is-touring', on);
  $('tour').hidden = !on;
}

export function showTour(stop, index, total) {
  $('tour-eyebrow').textContent = stop.eyebrow;
  $('tour-title').textContent = stop.title;
  $('tour-line').textContent = stop.text ?? '';
  $('tour-count').textContent = `${index + 1} / ${total}`;
  $('tour-more').hidden = !stop.ex;
  $('tour-prev').disabled = index === 0;
  $('tour-bar').style.transform = 'scaleX(0)';
}

let lastProgress = -1;
export function setTourProgress(p) {
  const v = Math.round(p * 200) / 200;
  if (v === lastProgress) return;
  lastProgress = v;
  $('tour-bar').style.transform = `scaleX(${v})`;
}

export function setTourPaused(paused) {
  tourPaused = paused;
  $('tour-pause').textContent = say(paused ? 'tour.resume' : 'tour.pause');
  $('tour').classList.toggle('paused', paused);
}

// detail view

let gallery = null; // open in the detail view

function mediaElement(ex, m) {
  if (m.type === 'video') {
    const v = h('video', { src: m.src, poster: m.poster, controls: '', loop: '', playsinline: '', 'aria-label': ex.title });
    v.muted = true; // needed for autoplay
    v.autoplay = true;
    return v;
  }
  if (m.type === 'embed') {
    return h('iframe', {
      src: m.src, title: ex.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', allowfullscreen: '',
    });
  }
  const img = h('img', { alt: m.caption || ex.title, src: m.type === 'card' ? ex.fallbackURL() : m.src });
  img.onerror = () => { img.onerror = null; img.src = ex.fallbackURL(); };
  return img;
}

function thumbSource(ex, m) {
  if (m.type === 'card') return ex.fallbackURL();
  return m.type === 'image' ? m.src : m.poster ?? ex.fallbackURL();
}

function showMedia(i) {
  const { ex, media } = gallery;
  gallery.index = (i + media.length) % media.length;
  const m = media[gallery.index];
  const figure = $('inspect-media');
  figure.replaceChildren(mediaElement(ex, m));
  if (m.caption) figure.append(h('figcaption', {}, m.caption));
  if (media.length > 1) {
    figure.append(
      h('button', { class: 'media-nav media-nav--prev', 'aria-label': say('inspect.prevPic'), onclick: () => showMedia(gallery.index - 1) }, '‹'),
      h('button', { class: 'media-nav media-nav--next', 'aria-label': say('inspect.nextPic'), onclick: () => showMedia(gallery.index + 1) }, '›'),
    );
  }
  [...$('inspect-thumbs').children].forEach((t, k) => {
    t.classList.toggle('active', k === gallery.index);
    t.setAttribute('aria-current', k === gallery.index ? 'true' : 'false');
  });
  $('inspect-thumbs').children[gallery.index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function stepMedia(delta) {
  if (gallery && gallery.media.length > 1) showMedia(gallery.index + delta);
}

const section = (title, ...kids) => h('section', { class: 'inspect-block' }, h('p', { class: 'eyebrow' }, title), ...kids);

export function openInspect(ex, { profile, view = 0, onWalk, onOpen, onPrev, onNext }) {
  const panel = $('inspect-panel');
  const body = $('inspect-body');
  const hasMedia = ex.kind === 'project';
  gallery = hasMedia ? { ex, media: ex.media, index: 0 } : null;

  panel.classList.toggle('no-media', !hasMedia);
  $('inspect-stage').hidden = !hasMedia;
  $('inspect-media').replaceChildren();
  $('inspect-thumbs').replaceChildren();
  if (hasMedia) {
    $('inspect-thumbs').hidden = ex.media.length < 2;
    ex.media.forEach((m, i) => {
      $('inspect-thumbs').append(h('button', {
        class: `thumb${m.type === 'video' || m.type === 'embed' ? ' thumb--video' : ''}`, 'aria-label': m.caption || say('inspect.picture', { n: i + 1 }), onclick: () => showMedia(i),
      }, h('img', { src: thumbSource(ex, m), alt: '' })));
    });
    showMedia(view);
  }

  const links = (items) => items.length
    ? h('div', { class: 'inspect-links' }, items.map((l) => h('a', { class: 'btn btn--small', href: l.url, target: '_blank', rel: 'noopener' }, tr(l.label))))
    : null;

  if (ex.kind === 'contact') {
    fill(body,
      h('p', { class: 'eyebrow' }, say('inspect.end')),
      h('h2', {}, say('getInTouch')),
      h('p', { class: 'inspect-medium' }, say('together')),
      profile.email ? h('p', {}, say('inspect.quickest')) : (profile.links?.length ? h('p', {}, say('inspect.findMe')) : null),
      profile.email ? h('a', { class: 'inspect-email', href: `mailto:${profile.email}` }, profile.email) : null,
      links(profile.links ?? []),
    );
  } else {
    const related = ex.related.length
      ? h('div', { class: 'inspect-related' },
        h('p', { class: 'eyebrow' }, say(ex.kind === 'language' ? 'inspect.seenIn' : 'inspect.writtenIn')),
        h('ul', {}, ex.related.map((r) => h('li', {},
          h('button', { class: 'chip', onclick: () => onOpen(r) }, h('span', { class: 'chip-no' }, shortNo(r)), r.title)))))
      : null;
    const otherTags = (ex.tags ?? []).filter((t) => !ex.related.some((r) => r.title.toLowerCase() === String(t).toLowerCase()));
    const lead = ex.tagline && ex.tagline !== ex.description ? h('p', { class: 'inspect-lead' }, ex.tagline) : null;

    fill(body,
      h('p', { class: 'eyebrow' }, catalogueNo(ex)),
      h('h2', {}, ex.title),
      ex.medium ? h('p', { class: 'inspect-medium' }, ex.medium) : null,
      h('p', { class: 'inspect-room' }, `${say('room', { n: ex.room.numeral })} · ${ex.room.title}`, ex.context ? ` · ${ex.context}` : ''),
      lead,
      h('div', { class: 'inspect-text' }, paragraphs(ex.description)),
      ex.role ? section(say('inspect.myPart'), h('p', {}, ex.role)) : null,
      ex.with?.length ? section(say('inspect.madeWith'), h('p', {}, ex.with.join(', '))) : null,
      ex.highlights?.length ? section(say('inspect.worth'), h('ul', { class: 'inspect-list' }, ex.highlights.map((t) => h('li', {}, t)))) : null,
      otherTags.length ? h('ul', { class: 'tags' }, otherTags.map((t) => h('li', {}, t))) : null,
      related,
      links(ex.links ?? []),
      onWalk ? h('button', { class: 'btn btn--ghost inspect-walk', onclick: onWalk }, say('inspect.walkTo')) : null,
      onPrev || onNext
        ? h('nav', { class: 'inspect-pager', 'aria-label': say('inspect.others') },
          onPrev ? h('button', { class: 'pager pager--prev', onclick: onPrev.go }, h('span', { class: 'eyebrow' }, say('inspect.prev')), h('span', { class: 'pager-title' }, onPrev.title)) : h('span'),
          onNext ? h('button', { class: 'pager pager--next', onclick: onNext.go }, h('span', { class: 'eyebrow' }, say('inspect.next')), h('span', { class: 'pager-title' }, onNext.title)) : h('span'))
        : null,
    );
  }
  showScreen('inspect');
  $('inspect-panel').scrollTop = 0;
  body.scrollTop = 0;
  $('inspect-close').focus();
}

export function closeInspect() {
  gallery = null;
  $('inspect-media').replaceChildren(); // stops any playing video
}
