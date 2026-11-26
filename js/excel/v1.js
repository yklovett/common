/* 사내 서비스 공통 엑셀 다운로드 v1 — 서버측 tw_excel.py(openpyxl)와 같은 스타일(연한 헤더)
 *
 * 필요: xlsx-js-style@1.2.0 (전역 XLSX) 를 먼저 로드
 *   <script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"></script>
 *   <script src="https://yklovett.github.io/common/js/excel/v1.js"></script>
 *
 * 사용
 *   TwExcel.download('목록_20261126.xlsx', '목록', ['이름', '수량', '비고'], [['가', 1200, '메모'], ...]);
 *   // 시트 여러 개: TwExcel.downloadSheets('usage.xlsx', [{name:'개인별', headers:[...], rows:[[...]]}, ...]);
 *   // 확장자 .xlsx 가 없으면 붙인다. rows 는 배열의 배열(값 타입: 숫자는 number 로 넘길 것).
 *
 * 스타일: 헤더 맑은 고딕 10 굵게 #1D4ED8 / 배경 #EEF4FF / 아래 medium #2F6FED, 전체 thin #D0D5DD,
 *   숫자 오른쪽 #,##0, 글자 가운데, 비고·메모·설명 열 왼쪽+줄바꿈, 상태 글자색, 자동필터.
 *   열 너비: 글자당 전각 1.8·그 외 1.1, 머리글 *1.1+3, max(최대+2, 6), 100 초과는 100 고정+줄바꿈.
 * 한계: xlsx-js-style 1.2.0 은 틀 고정(freeze panes)을 지원하지 않아 헤더 고정은 적용하지 않는다.
 */
(function (global) {
  'use strict';
  var FONT = '맑은 고딕';
  var LINE = { style: 'thin', color: { rgb: 'D0D5DD' } };
  var MEMO_WORDS = ['비고', '메모', '설명', '내용', '메시지', 'message', 'remark', 'note'];
  var STATUS_NAMES = ['상태', '결과', '적용여부'];
  var STATUS_COLOR = { '성공': '067647', '완료': '067647', '정상': '067647', '적용완료': '067647',
    '실패': 'D92D20', '오류': 'D92D20', '진행중': 'B54708', '대기': 'B54708' };

  function textWidth(s) {
    var max = 0;
    String(s == null ? '' : s).split('\n').forEach(function (line) {
      var w = 0;
      for (var i = 0; i < line.length; i++) w += line.charCodeAt(i) > 0x2E80 ? 1.8 : 1.1;
      if (w > max) max = w;
    });
    return max;
  }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function numFmt(v) { return Number.isInteger(v) ? '#,##0' : '#,##0.####'; }
  function shown(v) {
    if (v instanceof Date) return v.getHours() || v.getMinutes() ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd';
    if (isNum(v)) return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return v == null ? '' : String(v);
  }

  function buildSheet(headers, rows) {
    var X = global.XLSX;
    var ws = X.utils.aoa_to_sheet([headers].concat(rows), { cellDates: true });
    var memo = {}, status = {}, widths = [];
    headers.forEach(function (h, i) {
      var low = String(h).toLowerCase();
      memo[i] = MEMO_WORDS.some(function (w) { return low.indexOf(w) >= 0; });
      status[i] = STATUS_NAMES.indexOf(String(h)) >= 0;
      widths[i] = textWidth(h) * 1.1 + 3;
    });
    rows.forEach(function (row) {
      headers.forEach(function (_, c) {
        var v = row[c], w;
        if (v instanceof Date) w = shown(v).length;
        else w = textWidth(shown(v));
        if (w > widths[c]) widths[c] = w;
      });
    });
    var wrapCol = {};
    ws['!cols'] = widths.map(function (w, c) {
      var wch = Math.max(w + 2, 6);
      if (wch > 100) { wch = 100; wrapCol[c] = true; }
      return { wch: wch };
    });
    ws['!rows'] = [{ hpt: 24 }];
    var range = X.utils.decode_range(ws['!ref']);
    for (var r = range.s.r; r <= range.e.r; r++) {
      for (var c = range.s.c; c <= range.e.c; c++) {
        var addr = X.utils.encode_cell({ r: r, c: c });
        var cell = ws[addr];
        if (!cell) { cell = ws[addr] = { t: 's', v: '' }; }
        if (r === 0) {
          cell.s = {
            font: { name: FONT, sz: 10, bold: true, color: { rgb: '1D4ED8' } },
            fill: { patternType: 'solid', fgColor: { rgb: 'EEF4FF' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: { top: LINE, left: LINE, right: LINE, bottom: { style: 'medium', color: { rgb: '2F6FED' } } }
          };
          continue;
        }
        var v = rows[r - 1][c];
        var s = {
          font: { name: FONT, sz: 10, color: { rgb: '111827' } },
          border: { top: LINE, bottom: LINE, left: LINE, right: LINE },
          alignment: { vertical: 'center' }
        };
        if (isNum(v)) {
          s.alignment.horizontal = 'right';
          cell.z = numFmt(v);
        } else if (v instanceof Date) {
          s.alignment.horizontal = 'center';
          cell.z = shown(v);
        } else {
          var left = memo[c];
          s.alignment.horizontal = left ? 'left' : 'center';
          if (left || wrapCol[c]) s.alignment.wrapText = true;
          if (status[c] && STATUS_COLOR[v]) s.font = { name: FONT, sz: 10, bold: true, color: { rgb: STATUS_COLOR[v] } };
        }
        if (wrapCol[c]) s.alignment.wrapText = true;
        cell.s = s;
      }
    }
    if (rows.length) ws['!autofilter'] = { ref: 'A1:' + X.utils.encode_col(headers.length - 1) + (rows.length + 1) };
    return ws;
  }

  function downloadSheets(filename, sheets) {
    if (!global.XLSX) throw new Error('xlsx-js-style 이 로드되지 않았습니다');
    var wb = global.XLSX.utils.book_new();
    sheets.forEach(function (sh) {
      global.XLSX.utils.book_append_sheet(wb, buildSheet(sh.headers, sh.rows), String(sh.name).slice(0, 31));
    });
    if (!/\.xlsx$/i.test(filename)) filename += '.xlsx';
    global.XLSX.writeFile(wb, filename);
  }

  global.TwExcel = {
    download: function (filename, sheetName, headers, rows) {
      downloadSheets(filename, [{ name: sheetName, headers: headers, rows: rows }]);
    },
    downloadSheets: downloadSheets
  };
})(window);
