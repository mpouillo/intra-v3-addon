const nicknamerTargetClassName = 'nicknamer-target';

async function runNicknamer() {
    let nicknamerData = await DataStorage.getFeature('nicknamer');
    if (nicknamerData.settings?.enabled === false) return;

    let nicknames = nicknamerData.nicknames || {};

    Object.keys(nicknames).forEach(login => {
        tagLogins(document.body, login);
        updateNicknames(nicknames, login);
    });

    let isProcessing = false;

    const observer = new MutationObserver(async (mutations, obs) => {
        if (isProcessing) return;

        nicknamerData = await DataStorage.getFeature('nicknamer');
        nicknames = nicknamerData.nicknames || {};

        const profileNameElement = document.querySelector('.text-2xl');
        const emailElement = document.querySelector('a[class*="decoration-[hsl(var(--legacy-main)"][href*="mailto:"]');

        if (profileNameElement && emailElement && !profileNameElement.dataset.trueName) {
            isProcessing = true;
            profileNameElement.dataset.trueName = profileNameElement.textContent;
            const currentPageUserLogin = emailElement.textContent.split('@')[0];
            await updateProfileNameElement(profileNameElement, currentPageUserLogin);
            isProcessing = false;
        }

        let nodesToScan = [];
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) nodesToScan.push(node);
            })
        });

        if (nodesToScan.length > 0) {
            isProcessing = true;
            nodesToScan.forEach(newNode => {
                Object.keys(nicknames).forEach(login => {
                    tagLogins(newNode, login);
                    updateNicknames(nicknames, login);
                });
            });
            isProcessing = false;
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function tagLogins(rootElement, login) {
    if (!login) return;

    let walker = document.createTreeWalker(
        rootElement,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                const isForbidden = parent.closest(`script, style, input, textarea, .${nicknamerTargetClassName}`) ||
                                    parent.closest('a[href*="mailto:"]') ||
                                    parent.closest('.w-full.top-0.fixed.z-40.pl-20.h-16');

                if (isForbidden || parent.isContentEditable) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    )

    const nodesToProcess = [];
    let currentNode;

    while (currentNode = walker.nextNode()) {
        if (currentNode.textContent.includes(login)) {
            nodesToProcess.push(currentNode);
        }
    }

    nodesToProcess.forEach(node => {
        while (node && node.textContent.includes(login)) {
            node = wrapLoginInNode(node, login);
        }
    });
}

function wrapLoginInNode(textNode, login) {
    const index = textNode.textContent.indexOf(login);
    if (index == -1) return null;

    const loginNode = textNode.splitText(index);
    const remainingTextNode = loginNode.splitText(login.length);

    const span = document.createElement('span');
    span.className = `${nicknamerTargetClassName}`;
    span.dataset.login = login;
    span.textContent = loginNode.textContent;

    loginNode.parentNode.replaceChild(span, loginNode);
    return remainingTextNode;
}

async function updateNicknames(nicknames, login) {
    const nickname = nicknames[login];
    const targets = document.querySelectorAll(`.${nicknamerTargetClassName}[data-login="${login}"]`);

    targets.forEach(el => {
        const newText = nickname ? `${nickname} (${login})` : login;
        if (el.textContent !== newText) {
            el.textContent = newText;
        }
    })
}

async function updateProfileNameElement(profileNameElement, currentPageUserLogin) {
    let nicknamerData = await DataStorage.getFeature('nicknamer');
    const nicknames = nicknamerData.nicknames || {};
    const savedName = nicknames[currentPageUserLogin];
    const trueName = profileNameElement.dataset.trueName;

    const buttonContainer = await getOrCreateButtonContainer();

    const buttonsGroup = document.createElement('div');
    buttonsGroup.className = 'button-group';

    const editButton = createProfileHeaderButton("Edit name", penIconSVG);
    const resetButton = createProfileHeaderButton("Reset name", trashIconSVG);

    editButton.setAttribute('id', 'nicknamer-edit-button')
    editButton.style.display = 'inline-flex';

    resetButton.setAttribute('id', 'nicknamer-reset-button');
    resetButton.classList.add('button-slide-reveal');
    resetButton.style.display = savedName ? 'inline-flex' : 'none';

    const resizeObserver = new ResizeObserver(() => {
        const width = editButton.offsetWidth;
        buttonsGroup.style.setProperty('--local-edit-width', `${width}px`);
    });

    resizeObserver.observe(editButton);

    resetButton.addEventListener('click', async () => {
        const nicknamerData = await DataStorage.getFeature('nicknamer');
        const nicknames = nicknamerData.nicknames || {};

        delete nicknames[currentPageUserLogin];
        await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });

        resetButton.style.display = 'none';
        profileNameElement.textContent = trueName;
        profileNameElement.contentEditable = false;

        profileNameElement.classList.remove('flash-save');
        profileNameElement.classList.remove('flash-reset');
        void profileNameElement.offsetWidth;
        profileNameElement.classList.add('flash-reset');

        updateNicknames(nicknames, currentPageUserLogin);
    });

    editButton.addEventListener('click', async () => {
        const range = document.createRange();
        const selection = window.getSelection()

        profileNameElement.classList.add('nicknamer-editing-active');
        profileNameElement.contentEditable = true;
        profileNameElement.focus();
        
        range.selectNodeContents(profileNameElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    });

    buttonsGroup.appendChild(resetButton);
    buttonsGroup.appendChild(editButton);
    buttonContainer.appendChild(buttonsGroup);

    profileNameElement.setAttribute('spellcheck', 'false');

    profileNameElement.addEventListener('blur', async () => {
        const newName = profileNameElement.textContent.trim();
        const nicknamerData = await DataStorage.getFeature('nicknamer');
        const nicknames = nicknamerData.nicknames || {};

        if (newName !== "" && newName !== trueName) {
            nicknames[currentPageUserLogin] = newName;
            await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });

            profileNameElement.textContent = newName;
            resetButton.style.display = 'inline';

            profileNameElement.classList.remove('flash-reset');
            profileNameElement.classList.remove('flash-save');
            void profileNameElement.offsetWidth;
            profileNameElement.classList.add('flash-save');

            tagLogins(document.body, currentPageUserLogin);
            updateNicknames(nicknames, currentPageUserLogin);
        } else {
            resetButton.click();
        }

        profileNameElement.contentEditable = false;
        profileNameElement.classList.remove('nicknamer-editing-active');
    });

    profileNameElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            profileNameElement.blur();
        }
    });

  if (savedName) profileNameElement.textContent = savedName;
}

runNicknamer();
