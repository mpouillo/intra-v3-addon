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

async function updateProfileNameElement(profileNameElement, currentPageUserLogin) {
    const data = await DataStorage.getFeature('nicknamer');
    const nicknames = data.nicknames || {};
    const savedName = nicknames[currentPageUserLogin];
    const originalName = profileNameElement.textContent;

    const container = document.createElement('div');
    profileNameElement.parentNode.insertBefore(container, profileNameElement);
    container.appendChild(profileNameElement);

    const resetButton = document.createElement('span');
    resetButton.textContent = 'Reset nickname';
    resetButton.style.display = 'none';
    container.appendChild(resetButton);

    console.log("Loading profile nickname for " + currentPageUserLogin);
    if (savedName) {
        profileNameElement.textContent = savedName;
        resetButton.style.display = 'inline';
        console.log("Profile nickname loaded: " + savedName);
    } else {
        resetButton.style.display = 'none';
    }

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

    resetButton.addEventListener('click', async () => {
        const data = await DataStorage.getFeature('nicknamer');
        let nicknames = data.nicknames || {};

        delete nicknames[currentPageUserLogin];
        await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });
        window.location.reload();
    });

    profileNameElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            profileNameElement.blur();
        }
    });
}

start();
