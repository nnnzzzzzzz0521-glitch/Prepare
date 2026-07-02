// ==UserScript==
// @name         账号密码本地缓存自动填充
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  自动填充账号密码；按钮常驻，点击即更新本地缓存
// @author       you
// @match        *://*/cabin/CACabinLogin.jsp*
// @match        *://*/cabin/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'air_cabin_login_cache_v1';

  function getEl(id) {
    return document.getElementById(id);
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function init() {
    const userInput = getEl('_userid');
    const passInput = getEl('_password');
    const loginImg = getEl('startLoginImg');

    if (!userInput || !passInput || !loginImg) return;

    // 进入页面先尝试自动填充
    const cache = readCache();
    if (cache && cache.userid) userInput.value = cache.userid;
    if (cache && cache.password) passInput.value = cache.password;

    // 按钮始终显示：点击就更新缓存
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '保存账号密码';
    saveBtn.title = '将当前输入框内容保存到本地，下次自动填充';
    saveBtn.style.marginRight = '8px';
    saveBtn.style.height = '24px';
    saveBtn.style.lineHeight = '22px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.verticalAlign = 'middle';

    saveBtn.addEventListener('click', function () {
      const userid = (userInput.value || '').trim();
      const password = passInput.value || '';

      if (!userid) {
        alert('请先输入账号');
        return;
      }
      if (!password) {
        alert('请先输入密码');
        return;
      }

      writeCache({ userid, password });
      alert('已更新本地缓存，下次打开自动填充');
    });

    loginImg.parentNode.insertBefore(saveBtn, loginImg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
