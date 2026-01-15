async function start() {
    const data = await DataStorage.getFeature('background');
    if (data.settings?.enabled === false) return;

    const customImageUrl = data.image;

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

	let uploadButton = null;

 	const observer = new MutationObserver((mutations, obs) => {
        const profileHeaderTop = document.querySelector('.border.border-neutral-600.bg-ft-gray\\/50.relative');
        const loginLocationBadge = document.querySelector('.absolute.top-2.right-4');

        if (profileHeaderTop && loginLocationBadge) {
            obs.disconnect();
            const offset = loginLocationBadge.offsetHeight + 56;
            uploadButton = createProfileHeaderButton("Edit BG", offset);

			uploadButton.classList.add('upload-button');
            uploadButton.style.display = 'inline';
            profileHeaderTop.appendChild(uploadButton);
			
			uploadButton.addEventListener('click', () => {
				fileInput.click();
			})
        }
    });

	observer.observe(document.body, { childList: true, subtree: true });
}

start();
