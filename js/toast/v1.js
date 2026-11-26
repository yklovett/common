/* 사내 서비스 공통 알림(토스트) v1 — css/toast/v1.css 와 함께 쓴다
 *
 * 기본
 *   TwToast.success('저장했습니다')
 *   TwToast.error('저장 실패', { title: 'DB 오류', duration: 0 })   // duration 0 = 자동으로 안 닫힘
 *   TwToast.show('warning', '권한이 없습니다')                       // type: success | info | warning | error
 *
 * 페이지 이동 직후에 보여 주기(alert 후 location 이동하던 곳)
 *   TwToast.next('success', '삭제했습니다'); location.href = '/list';
 *
 * Flask flash 연결 — base 템플릿에 한 줄, 스크립트가 자동으로 읽는다
 *   <div id="tw-flash" hidden data-messages='{{ get_flashed_messages(with_categories=true) | tojson }}'></div>
 *   category: success | info | warning | error | danger(=error) | message(=info)
 *
 * 설정(선택, 서비스 JS 에서 한 번)
 *   TwToast.configure({ position: 'bottom-right', max: 4 })
 *
 * ★ 메시지는 textContent 로 넣는다(HTML 해석 안 함). 줄바꿈 \n 은 그대로 줄바꿈된다.
 * ★ 같은 종류·같은 문구가 이미 떠 있으면 새로 쌓지 않고 그 알림의 시간을 다시 센다(폴링 오류 도배 방지).
 */
(function (global) {
    'use strict';

    if (global.TwToast) return;           // 두 번 로드돼도 한 번만

    var cfg = {
        position: 'top-right',            // top-right | bottom-right | top-center | bottom-center
        max: 4,                           // 동시에 보이는 최대 개수(넘치면 가장 오래된 것부터 닫음)
        order: 'outer',                   // outer = 새 알림이 가장자리 쪽(위 위치면 맨 위)
        duration: { success: 3500, info: 4000, warning: 6000, error: 8000 },
        enterMs: 260,
        exitMs: 200,
        collapseMs: 200,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        pauseOnHover: true,
        progressBar: true
    };

    var TYPES = { success: 1, info: 1, warning: 1, error: 1 };
    var ALIAS = { danger: 'error', message: 'info', primary: 'info', secondary: 'info', ok: 'success', fail: 'error', failure: 'error', warn: 'warning' };
    var NEXT_KEY = 'twToastNext';

    var ICON = {
        success: '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm3.1 5.3-3.6 3.6a.7.7 0 0 1-1 0L4.9 8.3a.7.7 0 1 1 1-1l1.1 1.1 3.1-3.1a.7.7 0 1 1 1 1Z"/>',
        info:    '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm1 7.3H7V7.2h2v4.3Z"/>',
        warning: '<path d="M8.9 1.9a1 1 0 0 0-1.8 0L.6 13.3A1 1 0 0 0 1.5 15h13a1 1 0 0 0 .9-1.7L8.9 1.9ZM9 12.5H7v-1.8h2v1.8Zm0-3H7V5.5h2v4Z"/>',
        error:   '<path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm2.8 8.8a.7.7 0 1 1-1 1L8 9 6.2 10.8a.7.7 0 1 1-1-1L7 8 5.2 6.2a.7.7 0 0 1 1-1L8 7l1.8-1.8a.7.7 0 0 1 1 1L9 8l1.8 1.8Z"/>'
    };

    function normType(t) {
        t = String(t || 'info').toLowerCase();
        t = ALIAS[t] || t;
        return TYPES[t] ? t : 'info';
    }

    function reduced() {
        return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function canAnimate(el) { return typeof el.animate === 'function'; }

    function stack() {
        var pos = cfg.position;
        var s = document.querySelector('.twt-stack.' + pos);
        if (!s) {
            s = document.createElement('div');
            s.className = 'twt-stack ' + pos;
            s.setAttribute('aria-live', 'polite');
            document.body.appendChild(s);
        }
        return s;
    }

    function liveSlots(s) {
        return Array.prototype.filter.call(s.children, function (x) { return !x.dataset.leaving; });
    }

    function build(type, message, title) {
        var t = document.createElement('div');
        t.className = 'twt-toast ' + type;
        t.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');

        var icon = document.createElement('div');
        icon.className = 'twt-icon';
        icon.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + ICON[type] + '</svg>';

        var body = document.createElement('div');
        body.className = 'twt-body';
        if (title) {
            var h = document.createElement('div');
            h.className = 'twt-title';
            h.textContent = title;
            body.appendChild(h);
        }
        var m = document.createElement('div');
        m.className = 'twt-msg';
        m.textContent = message;
        body.appendChild(m);

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'twt-close';
        close.setAttribute('aria-label', '닫기');
        close.textContent = '×';

        t.appendChild(icon);
        t.appendChild(body);
        t.appendChild(close);
        return t;
    }

    function leave(slot) {
        if (!slot || slot.dataset.leaving) return;
        slot.dataset.leaving = '1';
        if (slot._twTimer) clearTimeout(slot._twTimer);
        var t = slot.firstChild;
        var done = function () { if (slot.parentNode) slot.parentNode.removeChild(slot); };
        if (!canAnimate(t)) { done(); return; }
        var out = t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: cfg.exitMs, easing: 'ease-in', fill: 'forwards' });
        out.onfinish = function () {
            if (!cfg.collapseMs) { done(); return; }
            var c = slot.animate([{ height: slot.offsetHeight + 'px' }, { height: '0px' }],
                                 { duration: cfg.collapseMs, easing: cfg.easing, fill: 'forwards' });
            c.onfinish = done;
        };
    }

    function arm(slot, ms) {
        if (slot._twTimer) clearTimeout(slot._twTimer);
        if (slot._twBar) slot._twBar.cancel();
        if (!ms) return;                                    // 0 = 수동으로만 닫힘
        var left = ms, start;
        var bar = slot.querySelector('.twt-bar');
        if (bar && canAnimate(bar)) {
            slot._twBar = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards' });
        }
        var run = function () {
            start = Date.now();
            slot._twTimer = setTimeout(function () { leave(slot); }, left);
            if (slot._twBar) slot._twBar.play();
        };
        slot._twPause = function () {
            clearTimeout(slot._twTimer);
            left -= Date.now() - start;
            if (slot._twBar) slot._twBar.pause();
        };
        slot._twResume = run;
        run();
    }

    function show(type, message, opts) {
        opts = opts || {};
        type = normType(type);
        message = message == null ? '' : String(message);
        var title = opts.title ? String(opts.title) : '';
        var ms = opts.duration != null ? opts.duration : cfg.duration[type];

        if (!document.body) {                               // head 에서 불린 경우
            document.addEventListener('DOMContentLoaded', function () { show(type, message, opts); });
            return null;
        }

        var s = stack();
        var key = type + '\u0000' + title + '\u0000' + message;
        var dup = liveSlots(s).filter(function (x) { return x._twKey === key; })[0];
        if (dup) { arm(dup, ms); return dup; }

        var slot = document.createElement('div');
        slot.className = 'twt-slot';
        slot._twKey = key;
        var t = build(type, message, title);
        if (cfg.progressBar && ms) {
            var bar = document.createElement('div');
            bar.className = 'twt-bar';
            t.appendChild(bar);
        }
        slot.appendChild(t);

        var atStart = (cfg.order === 'outer') === (cfg.position.indexOf('top') === 0);
        if (atStart) s.insertBefore(slot, s.firstChild); else s.appendChild(slot);

        var slots = liveSlots(s);
        while (slots.length > cfg.max) {
            var old = atStart ? slots.pop() : slots.shift();
            leave(old);
        }

        if (canAnimate(t)) {
            if (cfg.collapseMs) {
                slot.animate([{ height: '0px' }, { height: slot.offsetHeight + 'px' }], { duration: cfg.collapseMs, easing: cfg.easing });
            }
            var kf = reduced()
                ? [{ opacity: 0 }, { opacity: 1 }]
                : [{ opacity: 0, transform: 'perspective(600px) rotateX(-75deg)', transformOrigin: 'top' },
                   { opacity: 1, transform: 'perspective(600px) rotateX(0deg)', transformOrigin: 'top' }];
            t.animate(kf, { duration: cfg.enterMs, easing: cfg.easing, fill: 'backwards' });
        }

        t.querySelector('.twt-close').addEventListener('click', function () { leave(slot); });
        if (cfg.pauseOnHover) {
            slot.addEventListener('mouseenter', function () { if (slot._twPause) slot._twPause(); });
            slot.addEventListener('mouseleave', function () { if (slot._twResume) slot._twResume(); });
        }
        arm(slot, ms);
        return slot;
    }

    function next(type, message, opts) {
        try {
            var q = JSON.parse(sessionStorage.getItem(NEXT_KEY) || '[]');
            q.push([type, message, opts || {}]);
            sessionStorage.setItem(NEXT_KEY, JSON.stringify(q));
        } catch (e) {
            show(type, message, opts);                      // 저장 불가면 지금 보여 준다
        }
    }

    function drain() {
        try {
            var q = JSON.parse(sessionStorage.getItem(NEXT_KEY) || '[]');
            sessionStorage.removeItem(NEXT_KEY);
            q.forEach(function (x) { show(x[0], x[1], x[2]); });
        } catch (e) { /* 무시 */ }

        var f = document.getElementById('tw-flash');
        if (f && f.dataset.messages) {
            try {
                JSON.parse(f.dataset.messages).forEach(function (x) {
                    if (Array.isArray(x)) show(x[0], x[1]); else show('info', x);
                });
            } catch (e) { /* 무시 */ }
            f.dataset.messages = '';
        }
    }

    function configure(o) {
        o = o || {};
        Object.keys(o).forEach(function (k) {
            if (k === 'duration' && typeof o.duration === 'object') {
                Object.keys(o.duration).forEach(function (t) { cfg.duration[normType(t)] = o.duration[t]; });
            } else if (k in cfg) {
                cfg[k] = o[k];
            }
        });
    }

    function clear() {
        Array.prototype.forEach.call(document.querySelectorAll('.twt-slot'), leave);
    }

    global.TwToast = {
        show: show,
        success: function (m, o) { return show('success', m, o); },
        info:    function (m, o) { return show('info', m, o); },
        warning: function (m, o) { return show('warning', m, o); },
        error:   function (m, o) { return show('error', m, o); },
        next: next,
        configure: configure,
        clear: clear
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drain);
    else drain();
})(window);
