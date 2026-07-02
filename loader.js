// ==UserScript==
// @name         航班准备
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  航班准备
// @author       No
// @match        *://kccabin.airchina.com.cn/cabin/servlet/PrepareServlet?method=startPrepare&loopids=*
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @connect      62.234.31.31
// ==/UserScript==

(function () {
    'use strict';

    const CORE_URL = 'http://62.234.31.31:9000/api/js/file/load';
    const INJECT_SCRIPT_ID = 'tm-flight-prepare-core-loader';

    function log(...args) {
        console.log('[航班准备-外壳]', ...args);
    }

    function showError(message, error) {
        console.error('[航班准备-外壳]', message, error || '');
        alert(message);
    }

    function getCookieByNameFromDocument(name) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = document.cookie.match(new RegExp('(?:^|; )' + escapedName + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function getUserIdFromCookie() {
        return new Promise((resolve) => {
            const fallbackValue = getCookieByNameFromDocument('userid');

            try {
                if (typeof GM_cookie === 'undefined' || !GM_cookie || typeof GM_cookie.list !== 'function') {
                    log('GM_cookie 不可用，改用 document.cookie');
                    resolve(fallbackValue || '');
                    return;
                }

                GM_cookie.list({ name: 'userid' }, (cookies, error) => {
                    if (error) {
                        console.error('[航班准备-外壳] GM_cookie.list error:', error);
                    }

                    if (cookies && cookies.length > 0 && cookies[0] && cookies[0].value) {
                        resolve(cookies[0].value);
                        return;
                    }

                    log('GM_cookie 未获取到 userid，回退到 document.cookie');
                    resolve(fallbackValue || '');
                });
            } catch (e) {
                console.error('[航班准备-外壳] GM_cookie 调用异常:', e);
                resolve(fallbackValue || '');
            }
        });
    }

    function buildRequestUrl(userid) {
        const timestamp = Date.now();
        let url = `${CORE_URL}?t=${timestamp}`;
        if (userid) {
            url += `&account=${encodeURIComponent(userid)}`;
        }
        return url;
    }

    function injectToPageContext(code) {
        const oldScript = document.getElementById(INJECT_SCRIPT_ID);
        if (oldScript) {
            oldScript.remove();
        }

        const script = document.createElement('script');
        script.id = INJECT_SCRIPT_ID;
        script.type = 'text/javascript';
        script.textContent = code;

        (document.head || document.documentElement).appendChild(script);
        script.remove();
    }

    function formatResponseError(response) {
        let detail = '';

        try {
            if (response && response.responseText) {
                const data = JSON.parse(response.responseText);
                if (data && data.message) {
                    detail = `，错误信息：${data.message}`;
                }
            }
        } catch (e) {
            // 忽略 JSON 解析失败
        }

        return `核心脚本拉取失败，状态码：${response.status || '未知'}${detail}`;
    }

    async function loadCoreScript() {
        try {
            const userid = await getUserIdFromCookie();

            log('当前获取到的 userid:', userid || '[空]');
            log('document.cookie:', document.cookie || '[空]');

            if (!userid) {
                showError('未获取到 userid，移动端 cookie 可能不可用，请检查登录状态或 cookie 读取权限。');
                return;
            }

            const requestUrl = buildRequestUrl(userid);
            log('开始拉取云端核心脚本:', requestUrl);

            GM_xmlhttpRequest({
                method: 'GET',
                url: requestUrl,
                timeout: 15000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                onload: function (response) {
                    if (response.status !== 200) {
                        showError(formatResponseError(response), response);
                        return;
                    }

                    const code = (response.responseText || '').trim();
                    if (!code) {
                        showError('核心脚本返回为空，无法执行。');
                        return;
                    }

                    try {
                        log('云端核心脚本拉取成功，开始注入执行');
                        injectToPageContext(code);
                        log('核心脚本注入完成');
                    } catch (e) {
                        showError('核心逻辑运行出错，请检查控制台。', e);
                    }
                },
                onerror: function (err) {
                    showError('无法连接到云服务器，请检查网络！', err);
                },
                ontimeout: function () {
                    showError('连接云服务器超时，请稍后重试！');
                }
            });
        } catch (e) {
            showError('初始化加载失败，请检查控制台。', e);
        }
    }

    loadCoreScript();
})();