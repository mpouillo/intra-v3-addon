const Nicknamer = {
	targetClass: 'nicknamer-target',
	_isProcessing: false,
    _isBuildingUI: false,

	async getNicknames() {
		const data = await DataStorage.getFeature('nicknamer');
        return data.nicknames || {};
	},

	tagLogins(root, login) {
		if (!login) return;

		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
				acceptNode: (node) => {
					const parent = node.parentElement;
					if (!parent) return NodeFilter.FILTER_REJECT;

					const isForbidden = parent.closest(`script, style, input, textarea, .${this.targetClass}`) ||
										parent.closest('a[href*="mailto:"]') ||
										parent.closest('.w-full.top-0.fixed.z-40.pl-20.h-16');

					if (isForbidden || parent.isContentEditable) {
						return NodeFilter.FILTER_REJECT;
					} else return NodeFilter.FILTER_ACCEPT;
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
			let temp = node;
			while (temp && temp.textContent.includes(login)) {
				temp = this.wrapNode(temp, login);
			}
		});
	},

	wrapNode(textNode, login) {
		const index = textNode.textContent.indexOf(login);
		if (index == -1) return null;

		const loginNode = textNode.splitText(index);
		const remainingTextNode = loginNode.splitText(login.length);
		const span = document.createElement('span');

		span.className = this.targetClass;
		span.dataset.login = login;
		span.textContent = loginNode.textContent;
		loginNode.parentNode.replaceChild(span, loginNode);

		return remainingTextNode;
	},

	async updateLoginInstances(login) {
		const nicknames = await this.getNicknames();
		const nickname = nicknames[login];
		const targets = document.querySelectorAll(`.${this.targetClass}[data-login="${login}"]`);

		targets.forEach(el => {
			const newText = nickname ? `${nickname} (${login})` : login;
			if (el.textContent !== newText) {
				el.textContent = newText;
			}
		});
	},

	syncName(nameElement, newName = null) {
    if (!nameElement.dataset.trueName) {
        nameElement.dataset.trueName = nameElement.textContent.trim();
    }

    if (nameElement.classList.contains('nicknamer-editing-active')) return;

    if (newName) {
        if (nameElement.textContent !== newName) {
            nameElement.textContent = newName;
        }
    } else {
        nameElement.textContent = nameElement.dataset.trueName;
    }
},

	async setupProfileUI(nameElement, login, savedName) {
		if (document.getElementById('nicknamer-button-group') || this._isBuildingUI) return;
		this._isBuildingUI = true;

        // Button container setup
		const buttonContainer = await getOrCreateButtonContainer();

        if (document.getElementById('nicknamer-button-group')) {
            this._isBuildingUI = false;
            return;
        }

		// Edit button setup
		const editButton = createProfileHeaderButton("Edit name", penIconSVG);

		editButton.setAttribute('id', 'nicknamer-edit-button')
		editButton.style.display = 'inline-flex';

		editButton.onclick = async () => {
            nameElement.classList.add('nicknamer-editing-active');
			nameElement.contentEditable = true;
			nameElement.focus();

            const selection = window.getSelection();
			const range = document.createRange();
			
            if (nameElement.childNodes.length > 0) {
                range.selectNodeContents(nameElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
		};

		// Reset button setup
		const resetButton = createProfileHeaderButton("Reset name", trashIconSVG);

		resetButton.id = 'nicknamer-reset-button';
		resetButton.classList.add('button-slide-reveal');
		resetButton.style.display = nameElement.innerText !== nameElement.dataset.trueName ? 'inline-flex' : 'none';

		resetButton.onclick = async () => {
			const currentNicknames = await this.getNicknames();
			delete currentNicknames[login];
			await DataStorage.updateSettings('nicknamer', { nicknames: currentNicknames });

			resetButton.style.display = 'none';
			this.syncName(nameElement);
			nameElement.contentEditable = false;

			this.triggerFlash(nameElement, "#ff4848");
			this.updateLoginInstances(login);
		};

		// Button group setup
		const buttonsGroup = document.createElement('div');

		buttonsGroup.className = 'button-group';
		buttonsGroup.setAttribute('id', 'nicknamer-button-group');
		buttonsGroup.appendChild(resetButton);
		buttonsGroup.appendChild(editButton);

        buttonContainer.appendChild(buttonsGroup);

		// Needed to offset reset button depending on edit button width
		const resizeObserver = new ResizeObserver(() => {
			const width = editButton.offsetWidth;
			buttonsGroup.style.setProperty('--local-edit-width', `${width}px`);
		}).observe(editButton);

        // Name element listeners/attribute setup
        nameElement.setAttribute('spellcheck', 'false');

		nameElement.onblur = async () => {
			const newName = nameElement.textContent.trim();
			const resetButton = document.getElementById('nicknamer-reset-button');

            nameElement.classList.remove('nicknamer-editing-active');
            nameElement.contentEditable = false;

			if (newName !== "" && newName !== nameElement.dataset.trueName) {
				await this.saveNickname(login, newName);
                this.syncName(nameElement, newName);

				if (resetButton) resetButton.style.display = 'inline-flex';
				this.triggerFlash(nameElement, "#00ff6a");

				this.tagLogins(document.body, login);
				this.updateLoginInstances(login);
			} else {
				if (resetButton) resetButton.click();
			}
		};

		nameElement.onkeydown  = (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				nameElement.blur();
			}
		};

		this._isBuildingUI = false;
	},

    triggerFlash(element, color) {
        element.style.setProperty('--flash-color', `${color}`);
        element.classList.remove('flash-text');
        void element.offsetWidth;
        element.classList.add('flash-text');
    },

	async saveNickname(login, newName) {
		const nicknames = await this.getNicknames();
		nicknames[login] = newName;
		await DataStorage.updateSettings('nicknamer', { nicknames: nicknames });
	},

	async init() {
		const data = await DataStorage.getFeature('nicknamer');
		if (data?.settings?.enabled === false) return;

        const nicknames = data.nicknames || {};
    
        // Attempt to tag and update logins on page load
        Object.keys(nicknames).forEach(login => {
            this.tagLogins(document.body, login)
            this.updateLoginInstances(login);
        });

        // Updates attemps after mutations
		const observer = new MutationObserver(async (mutations) => {
            if (this._isProcessing 
                || mutations.every(m => m.target.classList?.contains(this.targetClass) 
                || m.target.id === 'nicknamer-button-group')) {
                    return;
                }

            if (!document.querySelector('.text-2xl')) {
                const existingGroup = document.getElementById('nicknamer-button-group');
                if (existingGroup) existingGroup.remove();
            }

			const nameElement = document.querySelector('.text-2xl');
			const emailElement = document.querySelector('a[href*="mailto:"]');

			if (nameElement && emailElement) {
				const login = emailElement.textContent.split('@')[0].trim();
                const nicknames = await this.getNicknames();
                const savedName = nicknames[login];

                this.syncName(nameElement, savedName);
				this.setupProfileUI(nameElement, login, savedName);
                this.updateLoginInstances(login);
			}

            const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
        
            if (hasAddedNodes) {
                this._isProcessing = true;
                const currentNicknames = await this.getNicknames();
                const keys = Object.keys(currentNicknames);
                
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            keys.forEach(login => this.tagLogins(node, login));
                        }
                    });
                });

                keys.forEach(login => {this.updateLoginInstances(login);
                });

                this._isProcessing = false;
            }
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}
}

Nicknamer.init();
