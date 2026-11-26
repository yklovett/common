/* 사내 서비스 공통 확인 대화상자 v1 — css/confirm/v1.css 와 함께 쓴다
 *
 * 기본(Promise<boolean> 반환)
 *   if (!await TwConfirm('삭제하시겠습니까?')) return;
 *   if (!await TwConfirm({
 *           type: 'danger',                 // info(기본) | warning | danger
 *           title: '프로젝트 삭제',
 *           message: '삭제하면 되돌릴 수 없습니다.',
 *           target: 'SKT-5GC-NRF',          // 또는 { label: '대상 프로젝트', value: 'SKT-5GC-NRF' }
 *           confirmText: '삭제',             // 기본 '확인'
 *           cancelText: '취소',
 *           typeToConfirm: false            // true 면 target 값을 입력해야 확인 버튼 활성
 *       })) return;
 *
 * async 로 바꾸기 어려운 곳(콜백)
 *   TwConfirm({...}).then(function (ok) { if (ok) doIt(); });
 *
 * <form> 제출 전 확인 — form 에 data-tw-confirm="문구" (data-tw-confirm-type="danger" 선택)
 * 링크·버튼 클릭 전 확인 — a/button 에 data-tw-confirm="문구" (onclick="return confirm(...)" 대체)
 *
 * ★ 문구는 textContent 로 넣는다(HTML 해석 안 함). 줄바꿈 \n 유지.
 * ★ Esc·바깥 클릭 = 취소, Enter = 포커스가 있는 버튼(확인/취소). 위험(danger)은 기본 포커스가 취소.
 * ★ 열린 Bootstrap 모달 위에서도 동작(모달의 포커스 가두기와 충돌하지 않음).
 */
(function (global) {
    'use strict';

    if (global.TwConfirm) return;

    var ICON = {
        info: '<path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1 8.5H9V9.2h2v5.3Z"/>',
        warning: '<path d="M11.1 2.6a1.3 1.3 0 0 0-2.2 0L1.3 15.7A1.3 1.3 0 0 0 2.4 17.6h15.2a1.3 1.3 0 0 0 1.1-1.9L11.1 2.6ZM11 15H9v-2h2v2Zm0-3.5H9V7h2v4.5Z"/>',
        danger: '<path d="M7.5 2h5l.5 1.5H17v2H3v-2h4L7.5 2ZM4.5 7h11l-.8 9.6a1.5 1.5 0 0 1-1.5 1.4H6.8a1.5 1.5 0 0 1-1.5-1.4L4.5 7Zm3.5 2v7h1.5V9H8Zm2.5 0v7H12V9h-1.5Z"/>'
    };
    var DEFAULT_TITLE = { info: '확인', warning: '확인 필요', danger: '되돌릴 수 없는 작업' };

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function TwConfirm(o) {
        if (typeof o === 'string') o = { message: o };
        o = o || {};
        var type = { info: 1, warning: 1, danger: 1 }[o.type] ? o.type : 'info';
        var target = o.target == null ? null : (typeof o.target === 'object' ? o.target : { value: o.target });

        return new Promise(function (resolve) {
            var bd = el('div', 'twc-backdrop');
            var box = el('div', 'twc-box ' + type);
            box.setAttribute('role', 'alertdialog');
            box.setAttribute('aria-modal', 'true');

            var head = el('div', 'twc-head');
            var icon = el('div', 'twc-icon');
            icon.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' + ICON[type] + '</svg>';
            var text = el('div', 'twc-text');
            var title = el('div', 'twc-title', o.title || DEFAULT_TITLE[type]);
            title.id = 'twc-title-' + Date.now();
            box.setAttribute('aria-labelledby', title.id);
            text.appendChild(title);
            if (o.message) text.appendChild(el('div', 'twc-msg', o.message));

            var input = null;
            if (target && target.value != null && target.value !== '') {
                var t = el('div', 'twc-target');
                if (target.label) t.appendChild(el('small', null, target.label));
                t.appendChild(document.createTextNode(String(target.value)));
                text.appendChild(t);
                if (o.typeToConfirm) {
                    var typed = el('div', 'twc-typed');
                    var lb = el('label', null, '확인을 위해 위 대상 이름을 그대로 입력');
                    input = el('input');
                    input.autocomplete = 'off';
                    input.id = 'twc-input-' + Date.now();
                    lb.htmlFor = input.id;
                    typed.appendChild(lb);
                    typed.appendChild(input);
                    text.appendChild(typed);
                }
            }
            head.appendChild(icon);
            head.appendChild(text);

            var foot = el('div', 'twc-foot');
            var cancel = el('button', 'twc-cancel', o.cancelText || '취소');
            var ok = el('button', 'twc-ok', o.confirmText || '확인');
            cancel.type = ok.type = 'button';
            if (input) ok.disabled = true;
            foot.appendChild(cancel);
            foot.appendChild(ok);

            box.appendChild(head);
            box.appendChild(foot);
            bd.appendChild(box);
            document.body.appendChild(bd);

            var prev = document.activeElement;
            var closed = false;
            function close(r) {
                if (closed) return;
                closed = true;
                document.removeEventListener('keydown', key, true);
                bd.classList.add('leaving');
                var rm = function () { if (bd.parentNode) bd.parentNode.removeChild(bd); };
                bd.addEventListener('animationend', rm, { once: true });
                setTimeout(rm, 300);
                if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* 무시 */ } }
                resolve(r);
            }
            function key(e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
                else if (e.key === 'Enter') {
                    // 확인은 포커스가 확인 버튼(또는 이름 입력칸)에 있을 때만 — 포커스가 상자 밖으로
                    // 빠져 있으면(열린 Bootstrap 모달이 가져간 경우 등) 아무것도 하지 않는다
                    e.preventDefault(); e.stopPropagation();
                    var a = document.activeElement;
                    if (a === cancel) close(false);
                    else if ((a === ok || (input && a === input)) && !ok.disabled) close(true);
                } else if (e.key === 'Tab') {               // 포커스를 상자 안에 가둔다
                    var f = Array.prototype.filter.call(box.querySelectorAll('button, input'), function (x) { return !x.disabled; });
                    var i = f.indexOf(document.activeElement);
                    e.preventDefault();
                    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
                }
            }
            document.addEventListener('keydown', key, true);
            // 열린 Bootstrap 모달의 포커스 가두기(document focusin)가 확인창 포커스를 빼앗지 않게 막는다
            bd.addEventListener('focusin', function (e) { e.stopPropagation(); });
            ok.addEventListener('click', function () { close(true); });
            cancel.addEventListener('click', function () { close(false); });
            bd.addEventListener('mousedown', function (e) { if (e.target === bd) close(false); });
            if (input) {
                input.addEventListener('input', function () { ok.disabled = input.value.trim() !== String(target.value); });
                input.focus();
            } else {
                (type === 'danger' ? cancel : ok).focus();
            }
        });
    }

    /* data-tw-confirm 선언형: form 제출, a·button 클릭 */
    function optsFrom(node) {
        return {
            message: node.getAttribute('data-tw-confirm'),
            type: node.getAttribute('data-tw-confirm-type') || undefined,
            title: node.getAttribute('data-tw-confirm-title') || undefined,
            confirmText: node.getAttribute('data-tw-confirm-ok') || undefined,
            target: node.getAttribute('data-tw-confirm-target') || undefined
        };
    }
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (!f.hasAttribute || !f.hasAttribute('data-tw-confirm') || f._twConfirmed) return;
        e.preventDefault();
        var submitter = e.submitter;
        TwConfirm(optsFrom(f)).then(function (ok) {
            if (!ok) return;
            f._twConfirmed = true;
            if (f.requestSubmit) f.requestSubmit(submitter || undefined); else f.submit();
            f._twConfirmed = false;
        });
    }, true);
    document.addEventListener('click', function (e) {
        var n = e.target.closest && e.target.closest('a[data-tw-confirm], button[data-tw-confirm]');
        if (!n || n._twConfirmed) return;
        if (n.tagName === 'BUTTON' && n.form && n.form.hasAttribute('data-tw-confirm')) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        TwConfirm(optsFrom(n)).then(function (ok) {
            if (!ok) return;
            n._twConfirmed = true;
            n.click();
            n._twConfirmed = false;
        });
    }, true);

    global.TwConfirm = TwConfirm;
})(window);
