/* 사내 서비스 공통 UI 헬퍼 v1 — css/ui/v1.css 와 함께 쓴다
 *
 * 날짜 표기(사내 표준)
 *   TwFmt.dateTime(v)  → 'YYYY-MM-DD HH:mm'      (표)
 *   TwFmt.dateTimeSec(v) → 'YYYY-MM-DD HH:mm:ss' (상세·이력)
 *   TwFmt.date(v)      → 'YYYY-MM-DD'
 *   TwFmt.number(v)    → '1,234'
 *   v: Date | ISO 문자열 | 'YYYY-MM-DD HH:MM:SS' 문자열 | epoch(ms). 해석 불가·빈 값이면 '-'.
 *   ★ 'YYYY-MM-DD HH:MM:SS' 처럼 시간대 없는 문자열은 로컬(KST) 시각으로 그대로 본다.
 *     'Z'·'+00:00'·'GMT' 가 붙은 값(jsonify 의 datetime 직렬화 등)은 KST 로 바꿔 표시한다.
 *
 * 표 상태 행(조회 중·0건·실패 구분)
 *   TwState.loading(tbody, colspan)
 *   TwState.empty(tbody, colspan, '조건에 맞는 빌드 이력이 없습니다')
 *   TwState.error(tbody, colspan, '조회에 실패했습니다. 잠시 후 다시 시도해 주세요')
 *   colspan 생략 시 tbody 가 속한 표의 thead 열 수를 쓴다.
 *
 * HTML 이스케이프
 *   TwFmt.esc(s) — innerHTML·템플릿 문자열에 사용자 값을 넣을 때
 */
(function (global) {
    'use strict';

    if (global.TwFmt) return;

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function toDate(v) {
        if (v == null || v === '') return null;
        if (v instanceof Date) return isNaN(v) ? null : v;
        if (typeof v === 'number') return new Date(v);
        var s = String(v).trim();
        // 시간대 없는 'YYYY-MM-DD[ T]HH:MM[:SS]' → 로컬 시각
        var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
        var d = new Date(s);                                  // ISO+시간대, RFC 1123(GMT) 등
        return isNaN(d) ? null : d;
    }

    function fmt(v, withTime, withSec) {
        var d = toDate(v);
        if (!d) return '-';
        var out = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        if (withTime) out += ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        if (withSec) out += ':' + pad(d.getSeconds());
        return out;
    }

    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    global.TwFmt = {
        date: function (v) { return fmt(v, false, false); },
        dateTime: function (v) { return fmt(v, true, false); },
        dateTimeSec: function (v) { return fmt(v, true, true); },
        number: function (v) {
            if (v == null || v === '' || isNaN(v)) return v == null || v === '' ? '-' : String(v);
            return Number(v).toLocaleString('ko-KR');
        },
        esc: function (s) { return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); },
        toDate: toDate
    };

    function cols(tbody, colspan) {
        if (colspan) return colspan;
        var table = tbody.closest ? tbody.closest('table') : null;
        var tr = table && table.tHead && table.tHead.rows[table.tHead.rows.length - 1];
        if (!tr) return 1;
        var n = 0;
        Array.prototype.forEach.call(tr.cells, function (c) { n += c.colSpan || 1; });
        return n || 1;
    }

    function row(tbody, colspan, kind, text) {
        if (!tbody) return;
        tbody.innerHTML = '';
        var tr = document.createElement('tr');
        tr.className = 'tw-state-row tw-state-' + kind;
        var td = document.createElement('td');
        td.colSpan = cols(tbody, colspan);
        if (kind === 'loading') {
            var sp = document.createElement('span');
            sp.className = 'tw-spinner';
            sp.setAttribute('aria-hidden', 'true');
            td.appendChild(sp);
        }
        td.appendChild(document.createTextNode(text));
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    global.TwState = {
        loading: function (tbody, colspan, text) { row(tbody, colspan, 'loading', text || '불러오는 중…'); },
        empty: function (tbody, colspan, text) { row(tbody, colspan, 'empty', text || '조회 결과가 없습니다'); },
        error: function (tbody, colspan, text) { row(tbody, colspan, 'error', text || '조회에 실패했습니다. 잠시 후 다시 시도해 주세요'); }
    };
})(window);
