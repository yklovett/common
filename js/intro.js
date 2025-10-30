/**
 * 인트로 애니메이션 스크립트
 * React/Framer Motion 기반 애니메이션을 순수 JavaScript로 변환
 * 로고 애니메이션, 데이터 흐름 라인 등을 포함
 */

(function () {
    'use strict';

    // 세션 스토리지 키
    const INTRO_SHOWN_KEY = 'intro_animation_shown';

    // 상태 관리
    let showIntro = true;

    /**
     * 인트로 애니메이션 표시
     */
    function showIntroAnimation() {
        // 이미 이 세션에서 애니메이션을 본 경우 건너뛰기
        if (sessionStorage.getItem(INTRO_SHOWN_KEY)) {
            return;
        }

        // 애니메이션 표시 플래그 설정
        sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');

        // 페이지 콘텐츠에 blur 효과 추가
        const pageContent = document.body;
        if (pageContent) {
            pageContent.classList.add('intro-blur');
        }

        // 인트로 오버레이 컨테이너 생성
        const introOverlay = document.createElement('div');
        introOverlay.id = 'intro-overlay';
        introOverlay.className = 'intro-overlay';

        // 로고 컨테이너
        const logoContainer = document.createElement('div');
        logoContainer.className = 'intro-logo-container';

        // Glow effect
        const glowEffect = document.createElement('div');
        glowEffect.className = 'intro-glow';

        // 로고 이미지
        const logoImage = document.createElement('img');
        logoImage.src = '/static/telcoware.svg';
        logoImage.alt = 'TELCOWARE';
        logoImage.className = 'intro-logo-img';

        // Shine effect
        const shineEffect = document.createElement('div');
        shineEffect.className = 'intro-shine';

        logoContainer.appendChild(glowEffect);
        logoContainer.appendChild(logoImage);
        logoContainer.appendChild(shineEffect);

        // 데이터 흐름 라인 컨테이너
        const flowLinesContainer = document.createElement('div');
        flowLinesContainer.className = 'intro-flow-lines';

        // 데이터 흐름 라인 생성
        for (let i = 0; i < 6; i++) {
            const flowLine = document.createElement('div');
            flowLine.className = `intro-flow-line intro-flow-line-${i}`;
            flowLine.style.top = `${20 + i * 15}%`;
            flowLinesContainer.appendChild(flowLine);
        }

        // 코너 그라데이션
        const cornerGradient1 = document.createElement('div');
        cornerGradient1.className = 'intro-corner-gradient intro-corner-top-left';

        const cornerGradient2 = document.createElement('div');
        cornerGradient2.className = 'intro-corner-gradient intro-corner-bottom-right';

        // 요소들을 오버레이에 추가
        introOverlay.appendChild(logoContainer);
        introOverlay.appendChild(flowLinesContainer);
        introOverlay.appendChild(cornerGradient1);
        introOverlay.appendChild(cornerGradient2);

        // body에 추가
        document.body.appendChild(introOverlay);

        // 애니메이션 시작
        requestAnimationFrame(() => {
            introOverlay.classList.add('active');
        });

        // 1.2초 후 인트로 애니메이션 종료
        setTimeout(() => {
            introOverlay.classList.add('exit');

            // 페이지 blur 제거
            if (pageContent) {
                pageContent.classList.remove('intro-blur');
            }

            // 애니메이션 완료 후 제거 (0.3초 페이드아웃)
            setTimeout(() => {
                introOverlay.remove();
                showIntro = false;
            }, 300);
        }, 1200);
    }

    /**
     * DOM 로드 완료 시 애니메이션 실행
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showIntroAnimation);
    } else {
        showIntroAnimation();
    }
})();
