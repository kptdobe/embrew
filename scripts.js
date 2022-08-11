/*
 * Copyright 2020 Emigration Brewing . All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable no-console */
/* global PerformanceObserver window performance fetch document localStorage */

function stamp(message) {
  if (window.name.includes('performance')) {
    console.log(`${new Date() - performance.timing.navigationStart}:${message}`);
  }
}

stamp('start');

export function createTag(name, attrs) {
  const el = document.createElement(name);
  if (typeof attrs === 'object') {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

export function wrapSections(element) {
  document.querySelectorAll(element).forEach(($div) => {
    if (!$div.id) {
      const $wrapper = createTag('div', { class: 'section-wrapper' });
      $div.parentNode.appendChild($wrapper);
      $wrapper.appendChild($div);
    }
  });
}

/**
 * Replace icons with inline SVG and prefix with codeBasePath.
 * @param {Element} element
 */
 export function decorateIcons(element = document) {
  element.querySelectorAll('span.icon').forEach(async (span) => {
    if (span.classList.length < 2 || !span.classList[1].startsWith('icon-')) {
      return;
    }
    const icon = span.classList[1].substring(5);
    // eslint-disable-next-line no-use-before-define
    const resp = await fetch(`${window.hlx.codeBasePath}${ICON_ROOT}/${icon}.svg`);
    if (resp.ok) {
      const iconHTML = await resp.text();
      if (iconHTML.match(/<style/i)) {
        const img = document.createElement('img');
        img.src = `data:image/svg+xml,${encodeURIComponent(iconHTML)}`;
        span.appendChild(img);
      } else {
        span.innerHTML = iconHTML;
      }
    }
  });
}


export async function getConfig() {
  if (!window.embrew.config) {
    const config = {};
    const resp = await fetch('/configuration.json', {
      credentials: 'include',
      mode: 'no-cors',
    });
    let rawJSON = await resp.json();
    if (rawJSON.data) rawJSON = rawJSON.data;
    let waitingForCategory = true;
    let currentCategory;
    rawJSON.forEach((row) => {
      if (row.name) {
        if (row.value) {
          const keyName = row.name;
          currentCategory[keyName] = row.value;
        } else {
          if (waitingForCategory) {
            const categoryName = row.name.replace(':', '');
            if (!config[categoryName]) config[categoryName] = {};
            currentCategory = config[categoryName];
          }
          waitingForCategory = false;
        }
      } else {
        waitingForCategory = true;
      }
    });
    window.embrew.config = config;
  }

  return (window.embrew.config);
}

export function isSameDate(date1, date2) {
  return (date1.getDate() === date2.getDate()
        && date1.getFullYear() === date2.getFullYear()
        && date1.getMonth() === date2.getMonth());
}

// eslint-disable-next-line no-unused-vars
export function timeToHours(time) {
  const trimmed = time.trim();
  const hoursMins = trimmed.replace(/[A-Za-z]/g, '').trim().split(':');

  const hour = ((+hoursMins[0]) % 12) + (trimmed.toLowerCase().includes('pm') ? 12 : 0);
  const mins = hoursMins[1] ? +hoursMins[1] : 0;
  return (hour + mins / 60);
}

export function getDate(date, time) {
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(date)) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateSegs = date.split(' ');
    const timeSegs = time.split(' ');
    const hoursMins = timeSegs[0].split(':');

    const hour = ((+hoursMins[0]) % 12) + (timeSegs[1] && timeSegs[1].toLowerCase() === 'pm' ? 12 : 0);
    const mins = +hoursMins[1];

    const dateAndTime = new Date(+dateSegs[3], months.indexOf(dateSegs[1]),
      +dateSegs[2], hour, mins);
    // console.log(dateAndTime, `${date}->${time}`);

    return (dateAndTime);
  }
  const serial = date;
  const utcDays = Math.floor(serial - 25569) + 1; // hack for negative UTC
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
}

export async function areWeClosed(someDate, type) {
  const config = await getConfig();
  const closedOn = config['Closed on'];
  const days = Object.keys(closedOn);

  const stop = type ? config.Stop[`${type} for Today`] : '';
  if (stop && isSameDate(someDate, new Date())) {
    return ('Today');
  }
  let closed = '';
  days.forEach((day) => {
    const closedDate = getDate(closedOn[day]);
    if (isSameDate(someDate, closedDate)) closed = day;
  });
  // console.log(closed);
  return closed;
}

// eslint-disable-next-line no-unused-vars
function decorateBackgroundSections() {
  document.querySelectorAll('main div.section-wrapper>div>:first-child>img').forEach(($headerImg) => {
    if ($headerImg) {
      const src = $headerImg.getAttribute('src');
      const $wrapper = $headerImg.closest('.section-wrapper');
      $wrapper.style.backgroundImage = `url(${src})`;
      $headerImg.parentNode.remove();
      $wrapper.classList.add('bg-image');
    }
  });

  const $hero = document.querySelector('main>div.section-wrapper');
  if ($hero && $hero.classList.contains('bg-image')) $hero.classList.add('hero');
}

function decorateImageOnlySections() {
  document.querySelectorAll('main div.section-wrapper>div>picture, main div.section-wrapper>div>img').forEach(($img) => {
    const $wrapper = $img.closest('.section-wrapper');
    $wrapper.classList.add('image-only');
  });
}

// eslint-disable-next-line no-unused-vars
export function stashForm(ids) {
  ids.forEach((id) => {
    const { value } = document.getElementById(id);
    localStorage.setItem(id, value);
  });
}

export function getOpeningHours(section) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const openingHours = weekdays.map((day) => {
    const usTime = section[day];
    const ampms = usTime.split('-');
    const [from, to] = ampms.map((ampm) => timeToHours(ampm));
    return ({ from, to });
  });
  return openingHours;
}

export function generateId() {
  let id = '';
  const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 5; i += 1) {
    id += chars.substr(Math.floor(Math.random() * chars.length), 1);
  }
  return id;
}

export function populateForm($form) {
  $form.querySelectorAll('input').forEach(($input) => {
    const { id } = $input;
    if (id) {
      const value = localStorage.getItem(id);
      if (value) $input.value = value;
    }
  });
}

// eslint-disable-next-line no-unused-vars
export function toClassName(name) {
  return (name.toLowerCase().replace(/[^0-9a-z]/gi, '-'));
}

export function hideTitle() {
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    document.querySelector('main h1').remove();
  }
}

export function decoratePhoneLinks() {
  ['tel', 'sms'].forEach((p) => {
    document.querySelectorAll(`a[href*="/${p}/"]`).forEach(($a) => {
      $a.href = `${p}:${$a.href.split(`/${p}/`)[1]}`;
    });
  });
}
export async function addBanner() {
  const l = window.location.pathname;
  if (l.endsWith('/') || l.endsWith('order') || l.endsWith('reservation')) {
    const config = await getConfig();
    const upcomingClosed = [];
    for (let daysOut = 0; daysOut < 10; daysOut += 1) {
      const day = new Date();
      day.setDate(day.getDate() + daysOut);
      let prefix = '';
      if (daysOut === 0) prefix = 'Today';
      if (daysOut === 1) prefix = 'Tomorrow';
      // eslint-disable-next-line no-await-in-loop
      const closedOn = await areWeClosed(day);
      if (closedOn) upcomingClosed.push((prefix ? `${prefix} ` : '') + closedOn);
    }
    if (upcomingClosed.length) {
      const $header = document.querySelector('header');
      const $banner = createTag('div', { class: 'banner' });
      const bannerTemplate = config['Banner Templates'].Closed;
      $banner.innerHTML = bannerTemplate.replace('...', upcomingClosed.join(' & '));
      $header.append($banner);
      setTimeout(() => { $banner.classList.add('appear'); }, 100);
    }
  }
}

/**
 * Loads a CSS file.
 * @param {string} href The path to the CSS file
 */
export function loadCSS(href) {
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', href);
  document.head.appendChild(link);
}

function checkLCPProxy() {
  const $heroImage = document.querySelector('img');
  if (!$heroImage || $heroImage.complete) {
    loadCSS('/lazy-styles.css');
    stamp('loading CSS');
  } else {
    $heroImage.addEventListener('load', checkLCPProxy);
    stamp('registered LCP Proxy listener');
  }
}

function decorateHeroSection() {
  const $section = document.querySelector('.section-wrapper');
  if ($section && $section.querySelector('picture') && $section.querySelector('h1')) {
    $section.className = 'hero-section';
  }
}

function addQuickNav() {
  const h3s = [...document.querySelectorAll('main h3')];
  const h4 = document.querySelector('main h4');
  if (h4 && h3s.length) {
    const div = document.createElement('div');
    div.className = 'menu-switcher';
    const select = document.createElement('select');
    const pl = document.createElement('option');
    pl.textContent = 'Browse the menu ...';
    pl.selected = true;
    pl.disabled = true;
    select.append(pl);
    h3s.forEach((h3) => {
      const option = document.createElement('option');
      option.textContent = h3.textContent;
      option.value = h3.id;
      select.append(option);
    });
    div.append(select);
    h3s[0].parentNode.insertBefore(div, h3s[0]);
    select.addEventListener('change', () => {
      window.location.hash = `#${select.value}`;
    });

  }
}

window.hlx = {
  codeBasePath: '',
}

const ICON_ROOT = '/icons';

function decoratePage() {
  checkLCPProxy();
  stamp('decoratePage start');
  wrapSections('main>div');
  decorateHeroSection();
  // decorateBackgroundSections();
  decorateImageOnlySections();
  decoratePhoneLinks();
  hideTitle();
  addBanner();
  addQuickNav();
  const main = document.querySelector('main');
  decorateIcons(main);
  stamp('decoratePage end');
  if (window.location.href.includes('/host-messages')) {
    document.querySelectorAll('main div > p').forEach(async (p) => {
      if (p.textContent.startsWith('/')) {
        const path = p.textContent.split('.').join('.embed.');
        console.log(path);
        const resp = await fetch(path);
        const text = await resp.text();
        const parent = p;
        parent.innerHTML = text;
        parent.querySelectorAll('script').forEach((script) => {
          const newScript = document.createElement("script");
          newScript.src = script.src;
          newScript.type = script.type;
          newScript.async = script.async;
          newScript.defer = script.defer;
          parent.appendChild(newScript);
          console.log(script);
        })
      }
    });
  }
}

window.embrew = {};

decoratePage();

/* performance instrumentation */

function registerPerformanceLogger() {
  try {
    const polcp = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      stamp(JSON.stringify(entries));
      console.log(entries[0].element);
    });
    polcp.observe({ type: 'largest-contentful-paint', buffered: true });
    const pores = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        stamp(`resource loaded: ${entry.name} - [${Math.round(entry.startTime + entry.duration)}]`);
      });
    });

    pores.observe({ type: 'resource', buffered: true });
  } catch (e) {
    // no output
  }
}

if (window.name.includes('performance')) registerPerformanceLogger();
