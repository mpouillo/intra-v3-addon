async function start() {
    const data = await DataStorage.getFeature('nicknamer');
    if (data.settings?.enabled === false) return;

    await displayNicknames();

    const observer = new MutationObserver(async (mutations, obs) => {
        const profileNameElement = document.querySelector('.text-2xl');
        const emailElement = document.querySelector('a[class*="decoration-[hsl(var(--legacy-main)"][href*="mailto:"]');
        
        if (profileNameElement && emailElement && !profileNameElement.dataset.nicknamerProcessed) {
            profileNameElement.dataset.nicknamerProcessed = "true";
            const currentPageUserLogin = emailElement.textContent.split('@')[0];
            await updateProfileNameElement(profileNameElement, currentPageUserLogin);
        }
        
        obs.disconnect();
        await displayNicknames();
        obs.observe(document.body, { childList: true, subtree: true });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

async function displayNicknames() {
    const data = await DataStorage.getFeature('nicknamer');
    const nicknames = data.nicknames || {};

    Object.entries(nicknames).forEach(([login, nickname]) => {
        if (!login) return;

        const escapedLogin = login.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(`(?<!\\(\\s*)\\b${escapedLogin}\\b(?!\\s*\\(${escapedLogin}\\))`, 'g');
        const newText = `${nickname} (${login})`;

        document.querySelectorAll(`.nicknamer-done[data-login="${login}"]`).forEach(el => {
            if (el.textContent !== newText) {
                el.textContent = newText;
            }
        });

        findAndReplaceDOMText(document.body, {
            find: searchRegex,
            replace: newText,
            preset: 'prose',
            filterElements: function(el) {
                const profileHeader = '.md\\:px-8.py-4.w-full.flex.flex-col.lg\\:flex-row.gap-6.md\\:gap-8';
                const pageHeader = '.w-full.top-0.fixed.z-40.pl-20.h-16';
                const isExcluded = el.classList.contains('nicknamer-done') ||
                                   el.closest(pageHeader) ||
                                   el.closest(profileHeader) ||
                                   ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(el.tagName) ||
                                   el.isContentEditable;
                return !isExcluded;
            }
        });
    });
}

function createProfileHeaderButton(text, topOffset) {
    const button = document.createElement('div');
    button.className = "absolute px-2 py-1 border rounded-full border-neutral-600 bg-ft-gray right-4";
    button.style.top = topOffset + "px";

    const flexWrapper = document.createElement('div');
    flexWrapper.classList.add('text-sm', 'flex', 'flex-row', 'items-center', 'gap-1');

    const textDiv = document.createElement('div');
    textDiv.classList.add('drop-shadow-md');
    textDiv.textContent = text;

    flexWrapper.appendChild(textDiv);
    button.appendChild(flexWrapper);

    return button;
}

async function updateProfileNameElement(profileNameElement, currentPageUserLogin) {
    const data = await DataStorage.getFeature('nicknamer');
    const nicknames = data.nicknames || {};
    const savedName = nicknames[currentPageUserLogin];
    const originalName = profileNameElement.textContent;
    let resetButton = null;

    // Reset button
    const observer = new MutationObserver((mutations, obs) => {
        const profileHeaderTop = document.querySelector('.border.border-neutral-600.bg-ft-gray\\/50.relative');
        const loginLocationBadge = document.querySelector('.absolute.top-2.right-4');

        if (profileHeaderTop && loginLocationBadge) {
            obs.disconnect();
            const offset = loginLocationBadge.offsetHeight + 16;
            resetButton = createProfileHeaderButton("Reset nickname", offset);

            resetButton.classList.add('reset-button');
            resetButton.style.display = savedName ? 'inline' : 'none';
            profileHeaderTop.appendChild(resetButton);
            resetButton.addEventListener('click', async () => {
                const data = await DataStorage.getFeature('nicknamer');
                let nicknames = data.nicknames || {};
                delete nicknames[currentPageUserLogin];
                await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });
                window.location.reload();
            });
        }
    });

    profileNameElement.contentEditable = true;
    profileNameElement.setAttribute('spellcheck', 'false');

    profileNameElement.addEventListener('blur', async () => {
        const newName = profileNameElement.textContent.trim();
        const data = await DataStorage.getFeature('nicknamer');
        let nicknames = data.nicknames || {};

        if (newName !== "" && newName !== originalName) {
            nicknames[currentPageUserLogin] = newName;
            await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });
            profileNameElement.textContent = newName;
            resetButton.style.display = 'inline';
        } else {
            delete nicknames[currentPageUserLogin];
            await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });
            profileNameElement.textContent = originalName;
            resetButton.style.display = 'none';
            window.location.reload();
        }

        profileNameElement.classList.remove('flash-save');
        void profileNameElement.offsetWidth;
        profileNameElement.classList.add('flash-save');
        displayNicknames();
    });

    profileNameElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            profileNameElement.blur();
        }
    });

  observer.observe(document.body, { childList: true, subtree: true });

  if (savedName) profileNameElement.textContent = savedName;
}

start();
