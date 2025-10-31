/**
 * 공통 보안 기능 모듈
 * 여러 사이트에서 재사용 가능
 */

// ==================== 비밀번호 보안 규칙 ====================

/**
 * 비밀번호 보안 규칙 검증
 * @param {string} password - 검증할 비밀번호
 * @returns {boolean} - 보안 규칙 충족 여부
 */
function validatePasswordStrength(password) {
    // 최소 6자 이상
    if (password.length < 6) return false;

    // 영문, 숫자, 특수문자 모두 포함
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasLetter && hasNumber && hasSpecial;
}

/**
 * 비밀번호 요구사항 표시 업데이트
 * @param {string} password - 입력된 비밀번호
 * @param {Object} requirementIds - 요구사항 요소들의 ID 객체
 */
function updatePasswordRequirements(password, requirementIds) {
    const requirements = {
        length: password.length >= 6,
        letter: /[a-zA-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // 요구사항 표시 업데이트
    Object.keys(requirements).forEach(key => {
        const elementId = requirementIds[key];
        if (elementId && document.getElementById(elementId)) {
            document.getElementById(elementId).className =
                `requirement ${requirements[key] ? 'met' : 'not-met'}`;
        }
    });

    // 비밀번호 강도 표시
    updatePasswordStrength(password, requirements);
}

/**
 * 비밀번호 강도 표시 업데이트
 * @param {string} password - 입력된 비밀번호
 * @param {Object} requirements - 충족된 요구사항 객체
 */
function updatePasswordStrength(password, requirements) {
    const strengthBar = document.getElementById('strength-bar');
    if (!strengthBar) return;

    const metCount = Object.values(requirements).filter(Boolean).length;

    let strength = 'weak';
    let width = '25%';

    if (metCount === 4 && password.length >= 8) {
        strength = 'strong';
        width = '100%';
    } else if (metCount >= 3) {
        strength = 'medium';
        width = '66%';
    } else if (metCount >= 2) {
        strength = 'weak';
        width = '33%';
    }

    strengthBar.className = `strength-bar strength-${strength}`;
    strengthBar.style.width = width;
}

// ==================== 로그인 실패 지연시간 ====================

let loginAttempts = 0;
let isLocked = false;
let lockoutTimer = null;
let countdownInterval = null;

/**
 * 로컬 스토리지에서 로그인 시도 횟수와 잠금 상태 복원
 */
function restoreLoginState() {
    const savedAttempts = localStorage.getItem('loginAttempts');
    const savedLockTime = localStorage.getItem('lockoutTime');

    if (savedAttempts) {
        loginAttempts = parseInt(savedAttempts);
    }

    if (savedLockTime) {
        const lockTime = parseInt(savedLockTime);
        const now = Date.now();
        const remainingTime = lockTime - now;

        if (remainingTime > 0) {
            // 아직 잠금 상태인 경우
            isLocked = true;
            startLockout(remainingTime);
        } else {
            // 잠금 시간이 지난 경우
            localStorage.removeItem('lockoutTime');
            localStorage.removeItem('loginAttempts');
            loginAttempts = 0;
            isLocked = false;
        }
    }
}

/**
 * 로그인 실패 처리
 */
function handleLoginFailure() {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts.toString());

    if (loginAttempts >= 5) {
        // 5번 실패 시 5분 잠금
        const lockoutDuration = 5 * 60 * 1000; // 5분
        const lockoutTime = Date.now() + lockoutDuration;
        localStorage.setItem('lockoutTime', lockoutTime.toString());

        isLocked = true;
        startLockout(lockoutDuration);

        alert('로그인 실패가 5회 누적되어 5분간 로그인이 제한됩니다.');
    } else if (loginAttempts >= 3) {
        // 3번 실패 시 1분 잠금
        const lockoutDuration = 1 * 60 * 1000; // 1분
        const lockoutTime = Date.now() + lockoutDuration;
        localStorage.setItem('lockoutTime', lockoutTime.toString());

        isLocked = true;
        startLockout(lockoutDuration);

        alert('로그인 실패가 3회 누적되어 1분간 로그인이 제한됩니다.');
    }
}

/**
 * 로그인 잠금 시작
 * @param {number} duration - 잠금 지속 시간 (밀리초)
 */
function startLockout(duration) {
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const countdownDiv = document.getElementById('countdownTimer');
    const attemptsWarning = document.getElementById('attemptsWarning');

    if (!loginForm || !submitBtn) return;

    // 폼 비활성화
    loginForm.classList.add('login-disabled');
    submitBtn.disabled = true;

    // 경고 메시지 표시
    if (attemptsWarning) {
        attemptsWarning.style.display = 'block';
        attemptsWarning.textContent = `로그인 실패: ${loginAttempts}회 (최대 5회)`;
    }

    // 카운트다운 시작
    if (countdownDiv) {
        countdownDiv.style.display = 'block';

        let remainingTime = Math.ceil(duration / 1000);

        countdownInterval = setInterval(() => {
            remainingTime--;

            if (remainingTime <= 0) {
                // 잠금 해제
                clearInterval(countdownInterval);
                unlockLogin();
            } else {
                // 카운트다운 표시
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                countdownDiv.textContent = `잠금 해제까지: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

/**
 * 로그인 잠금 해제
 */
function unlockLogin() {
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const countdownDiv = document.getElementById('countdownTimer');
    const attemptsWarning = document.getElementById('attemptsWarning');

    if (!loginForm || !submitBtn) return;

    // 폼 활성화
    loginForm.classList.remove('login-disabled');
    submitBtn.disabled = false;

    // 메시지 숨기기
    if (countdownDiv) countdownDiv.style.display = 'none';
    if (attemptsWarning) attemptsWarning.style.display = 'none';

    // 상태 초기화
    isLocked = false;
    localStorage.removeItem('lockoutTime');
}

/**
 * 로그인 폼 검증
 * @param {Event} event - 폼 제출 이벤트
 * @returns {boolean} - 검증 통과 여부
 */
function validateLoginForm(event) {
    if (isLocked) {
        event.preventDefault();
        alert('로그인이 일시적으로 제한되었습니다. 잠시 후 다시 시도해주세요.');
        return false;
    }

    const userid = document.getElementById('userid');
    const userpw = document.getElementById('userpw');

    if (!userid || !userpw) return true;

    if (!userid.value.trim() || !userpw.value.trim()) {
        alert('ID와 비밀번호를 모두 입력해주세요.');
        return false;
    }

    return true;
}

/**
 * 로그인 성공 시 호출할 함수
 */
function onLoginSuccess() {
    // 로그인 성공 시 시도 횟수 초기화
    loginAttempts = 0;
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutTime');
}

/**
 * 로그인 실패 시 호출할 함수
 */
function onLoginFailure() {
    handleLoginFailure();
}

// ==================== 초기화 ====================

/**
 * 보안 기능 초기화
 */
function initializeSecurity() {
    // 로그인 상태 복원
    restoreLoginState();

    // 로그인 폼 이벤트 리스너 등록
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            if (!validateLoginForm(event)) {
                return;
            }
        });
    }
}

// DOM 로드 완료 시 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSecurity);
} else {
    initializeSecurity();
}