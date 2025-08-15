/**
 * 공통 네비게이션 스크립트
 * 모든 프로젝트에서 공통으로 사용하는 currentSite와 serviceDropdownMenu 기능
 */

// 전역 변수로 currentSite 설정
let currentSite = null;

/**
 * config.yaml에서 login.project 값을 읽어와서 currentSite 설정
 * @param {string} configUrl - config.yaml 파일의 URL
 * @returns {Promise<string>} currentSite 값
 */
async function loadCurrentSite(configUrl) {
    try {
        const response = await fetch(configUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const configText = await response.text();

        // YAML 파싱 (간단한 방식)
        const projectMatch = configText.match(/project:\s*"([^"]+)"/);
        if (projectMatch) {
            currentSite = projectMatch[1];
            return currentSite;
        } else {
            throw new Error('login.project 값을 찾을 수 없습니다.');
        }
    } catch (error) {
        // 기본값으로 fallback
        currentSite = 'admin';
        return currentSite;
    }
}

/**
 * 서비스 드롭다운 메뉴 생성
 * @param {string} site - 사이트 키
 */
async function loadServiceDropdown(site) {
    try {
        const response = await fetch(`https://admin.telcoware.com/services?site=${site}`, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const services = await response.json();
        let dropdownMenu = document.getElementById("serviceDropdownMenu");

        if (!dropdownMenu) {
            return;
        }

        dropdownMenu.innerHTML = ""; // 기존 메뉴 초기화

        services.forEach(service => {
            let listItem = document.createElement("li");
            listItem.innerHTML = `<a class="dropdown-item" href="${service.site_url}" target="_blank">${service.site_name}</a>`;
            dropdownMenu.appendChild(listItem);
        });
    } catch (error) {
        // 에러 처리
    }
}

/**
 * 네비게이션 초기화
 * @param {string} configUrl - config.yaml 파일의 URL
 */
async function initializeNavigation(configUrl) {
    try {
        // currentSite 로드
        await loadCurrentSite(configUrl);

        // 서비스 드롭다운 메뉴 로드
        await loadServiceDropdown(currentSite);
    } catch (error) {
        // 에러 처리
    }
}

/**
 * DOM 로드 완료 후 자동 초기화
 * configUrl이 제공되지 않은 경우 기본값 사용
 */
document.addEventListener("DOMContentLoaded", function () {
    // config.yaml 파일의 URL을 동적으로 생성
    const currentPath = window.location.pathname;
    // /admin/data/templates/index.html -> /admin/data/config.yaml
    const configUrl = currentPath.replace(/\/templates\/[^\/]*$/, '/config.yaml');

    initializeNavigation(configUrl);
});

// 전역에서 사용할 수 있도록 함수들 노출
window.CommonNav = {
    currentSite: () => currentSite,
    loadCurrentSite,
    loadServiceDropdown,
    initializeNavigation
};
