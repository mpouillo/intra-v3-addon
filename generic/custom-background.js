async function setCustomBackground() {
    const data = await DataStorage.getFeature('background');
    if (data.settings?.enabled === false) return;

    const customImageUrl = data.image;

	const observer = new MutationObserver(async (mutations, obs) => {
		const emailElement = document.querySelector('a[class*="decoration-[hsl(var(--legacy-main)"][href*="mailto:"]');
		const userLoginElement = document.querySelector('.mr-5.font-bold');

		if (emailElement && userLoginElement) {
			obs.disconnect();

			const currentPageUserLogin = emailElement.textContent.split('@')[0].trim();
			if (currentPageUserLogin !== userLoginElement.textContent.trim()) return;

			if (customImageUrl) {
				const style = document.createElement('style');
				style.id = 'extension-background-override';
				style.textContent = `
					header[class*="bg-cover"] {
						background-image: url("${customImageUrl}") !important;
						background-size: cover !important;
						background-position: center !important;
					}
				`;
				document.head.appendChild(style);
				console.log("Loaded custom background: " + customImageUrl);
			}

			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.accept = 'image/*';
			fileInput.style.display = 'none';
			fileInput.id = 'betterintra-background-file-input';
			document.body.appendChild(fileInput);

			fileInput.addEventListener('change', async (event) => {
				const file = event.target.files[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (e) => {
					const img = new Image();
					img.crossOrigin = "anonymous";
					img.onload = async () => {
						const canvas = document.createElement('canvas');
						const ctx = canvas.getContext('2d');

						const scale = Math.min(1, 1920 / img.width);
						canvas.width = img.width * scale;
						canvas.height = img.height * scale;

						ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

						const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

						await DataStorage.updateSettings('background', { image: compressedBase64 });
						window.location.reload();
					};
					img.src = e.target.result;
				}
				reader.readAsDataURL(file);
			});

			const buttonContainer = await getOrCreateButtonContainer();

			const buttonsGroup = document.createElement('div');
			buttonsGroup.className = 'button-group';

			const uploadButton = createProfileHeaderButton("Edit BG", imageIconSVG);
			const resetButton = createProfileHeaderButton("Reset BG", trashIconSVG);

			const resizeObserver = new ResizeObserver(() => {
				const width = uploadButton.offsetWidth;
				buttonsGroup.style.setProperty('--local-edit-width', `${width}px`);
			});
			resizeObserver.observe(uploadButton);

			uploadButton.setAttribute('id', 'custombg-upload-button');
			uploadButton.style.display = 'inline';

			uploadButton.addEventListener('click', () => {
				fileInput.click();
			});

			resetButton.setAttribute('id', 'custombg-reset-button');
			resetButton.classList.add('button-slide-reveal');
			resetButton.style.display = customImageUrl ? 'inline-flex' : 'none';			

			resetButton.addEventListener('click', async () => {
				await DataStorage.updateSettings('background', {image: null});

				resetButton.style.display = 'none';
				window.location.reload();
			});

			buttonsGroup.appendChild(resetButton);
			buttonsGroup.appendChild(uploadButton);
			buttonContainer.appendChild(buttonsGroup);
		}
	})

	observer.observe(document.body, { childList: true, subtree: true });
}

setCustomBackground();
