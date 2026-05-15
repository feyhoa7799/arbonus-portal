function arbonusAssetUrl(value) {
  if (!value) return '';
  var clean = String(value).trim().replace('&amp;', '&');
  if (!clean || clean[0] === '/' || clean[0] === '#') return clean;
  if (clean.indexOf('http://') === 0 || clean.indexOf('https://') === 0 || clean.indexOf('data:') === 0 || clean.indexOf('blob:') === 0) return clean;
  if (clean.indexOf('images/') === 0 || clean.indexOf('css/') === 0 || clean.indexOf('js/') === 0 || clean.indexOf('files/') === 0) return '/portal-assets/' + clean;
  return clean;
}

function arbonusPortalPatch() {
  document.querySelectorAll('img[data-original], img[data-img-zoom-url]').forEach(function (img) {
    var original = arbonusAssetUrl(img.getAttribute('data-original') || img.getAttribute('data-img-zoom-url'));
    var current = arbonusAssetUrl(img.getAttribute('src') || '');
    if (!original) return;
    img.setAttribute('data-original', original);
    if (!current || current.indexOf('__resize__20x__') !== -1 || current.indexOf('blank.gif') !== -1) {
      img.setAttribute('src', original);
    } else if (current !== img.getAttribute('src')) {
      img.setAttribute('src', current);
    }
    img.removeAttribute('loading');
    img.style.visibility = 'visible';
    img.style.opacity = '1';
  });

  document.querySelectorAll('[data-content-cover-bg], [data-original], [data-img-zoom-url]').forEach(function (node) {
    var bg = arbonusAssetUrl(node.getAttribute('data-content-cover-bg') || node.getAttribute('data-original') || node.getAttribute('data-img-zoom-url'));
    if (!bg || (node.tagName || '').toLowerCase() === 'img') return;
    if (node.hasAttribute('data-content-cover-bg')) node.setAttribute('data-content-cover-bg', bg);
    if (node.hasAttribute('data-original')) node.setAttribute('data-original', bg);
    var style = node.getAttribute('style') || '';
    var shouldPatch = node.classList.contains('t-bgimg') || node.classList.contains('t-slds__bgimg') || node.classList.contains('t-cover__carrier') || node.hasAttribute('data-content-cover-bg') || style.indexOf('__resize__20x__') !== -1 || style.indexOf('background') !== -1;
    if (!shouldPatch) return;
    node.style.backgroundImage = 'url("' + bg.replace('"', '%22') + '")';
    if (!node.style.backgroundSize) node.style.backgroundSize = 'cover';
    if (!node.style.backgroundPosition) node.style.backgroundPosition = 'center';
    node.style.opacity = '1';
    node.style.visibility = 'visible';
  });

  document.querySelectorAll('[src^="images/"], [href^="images/"]').forEach(function (node) {
    if (node.hasAttribute('src')) node.setAttribute('src', arbonusAssetUrl(node.getAttribute('src')));
    if (node.hasAttribute('href')) node.setAttribute('href', arbonusAssetUrl(node.getAttribute('href')));
  });

  document.querySelectorAll('.t-tildalabel, .t-tildalabel-free, .t-tildalabel__wrapper, [class*="tildalabel"], a[href*="tilda.cc"], a[href*="tilda.ws"]').forEach(function (node) {
    node.remove();
  });

  document.querySelectorAll('body *').forEach(function (node) {
    var text = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text || text.length > 500) return;
    if (text.indexOf('this site was made on') !== -1 || text.indexOf('that helps to create a website') !== -1 || text.indexOf('made on tilda') !== -1 || text.indexOf('create a website without any code') !== -1) {
      node.remove();
    }
  });
}

function arbonusIsEdusonAction(node) {
  var current = node;
  while (current && current !== document.body) {
    var text = (current.textContent || '').toLowerCase();
    if (text.indexOf('eduson') !== -1 || text.indexOf('библиотека курсов') !== -1) return true;
    current = current.parentElement;
  }
  return false;
}

if (!window.__arbonusEdusonPatchInstalled) {
  window.__arbonusEdusonPatchInstalled = true;
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var action = target.closest('a, button, .tn-atom');
    if (!action || !arbonusIsEdusonAction(action)) return;
    var text = (action.textContent || '').toLowerCase();
    var href = action.getAttribute('href') || '';
    var isTargetButton = text.indexOf('получить доступ') !== -1 || text.indexOf('перейти на сайт') !== -1 || href.indexOf('eduson') !== -1;
    if (!isTargetButton) return;
    event.preventDefault();
    event.stopPropagation();
    alert('Пока не доступно, ведутся работы.');
  }, true);
}

function arbonusRunPortalPatch() { arbonusPortalPatch(); }
arbonusRunPortalPatch();
document.addEventListener('DOMContentLoaded', function () {
  arbonusRunPortalPatch();
  setTimeout(arbonusRunPortalPatch, 300);
  setTimeout(arbonusRunPortalPatch, 1000);
  setTimeout(arbonusRunPortalPatch, 2500);
});
window.addEventListener('load', function () {
  arbonusRunPortalPatch();
  setTimeout(arbonusRunPortalPatch, 500);
});
if (window.MutationObserver) {
  new MutationObserver(function () { arbonusRunPortalPatch(); }).observe(document.documentElement, { childList: true, subtree: true });
}
