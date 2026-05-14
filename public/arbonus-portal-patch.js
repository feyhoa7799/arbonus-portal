function arbonusPortalPatch(){
  document.querySelectorAll('img[data-original]').forEach(function(img){
    var original = img.getAttribute('data-original');
    var current = img.getAttribute('src') || '';
    if (original && (!current || current.indexOf('__resize__20x__') !== -1 || current.indexOf('blank.gif') !== -1)) {
      img.setAttribute('src', original);
    }
  });

  document.querySelectorAll('[data-content-cover-bg], [data-original], [data-img-zoom-url]').forEach(function(node){
    var bg = node.getAttribute('data-content-cover-bg') || node.getAttribute('data-original') || node.getAttribute('data-img-zoom-url');
    if (!bg || (node.tagName || '').toLowerCase() === 'img') return;
    if (node.classList.contains('t-bgimg') || node.classList.contains('t-slds__bgimg') || node.hasAttribute('data-content-cover-bg')) {
      node.style.backgroundImage = 'url("' + bg.replace(/"/g, '%22') + '")';
      if (!node.style.backgroundSize) node.style.backgroundSize = 'cover';
      if (!node.style.backgroundPosition) node.style.backgroundPosition = 'center';
      node.style.opacity = '1';
      node.style.visibility = 'visible';
    }
  });

  document.querySelectorAll('.t-tildalabel, .t-tildalabel-free, .t-tildalabel__wrapper, [class*="tildalabel"], a[href*="tilda.cc"], a[href*="tilda.ws"]').forEach(function(node){
    node.remove();
  });

  document.querySelectorAll('body *').forEach(function(node){
    var text = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text || text.length > 500) return;
    if (text.indexOf('this site was made on') !== -1 || text.indexOf('that helps to create a website') !== -1 || text.indexOf('made on tilda') !== -1 || text.indexOf('create a website without any code') !== -1) {
      node.remove();
    }
  });
}

arbonusPortalPatch();
document.addEventListener('DOMContentLoaded', function(){
  arbonusPortalPatch();
  setTimeout(arbonusPortalPatch, 300);
  setTimeout(arbonusPortalPatch, 1000);
  setTimeout(arbonusPortalPatch, 2500);
});
window.addEventListener('load', function(){
  arbonusPortalPatch();
  setTimeout(arbonusPortalPatch, 500);
});
