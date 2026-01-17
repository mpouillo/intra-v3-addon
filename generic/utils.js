const trashIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>`;

const penIconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
</svg>`;

const imageIconSVG = `
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<circle cx="8.5" cy="8.5" r="1.5"></circle>
				<polyline points="21 15 16 10 5 21"></polyline>
			</svg>`;

function createProfileHeaderButton(text, svgString = null) {
    const button = document.createElement('button');
    button.className = "px-2 py-1 border rounded-full border-neutral-600 bg-ft-gray right-4";

    const flexWrapper = document.createElement('div');
    flexWrapper.classList.add('text-sm', 'flex', 'flex-row', 'items-center', 'gap-1');

	if (svgString) {
		const iconSpan = document.createElement('span');
		iconSpan.classList.add('flex', 'items-center', 'justify-center');
		const parser = new DOMParser();
		const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
		const svgElement = svgDoc.documentElement;

		iconSpan.appendChild(svgElement);
		flexWrapper.appendChild(iconSpan);
	}

    const textDiv = document.createElement('div');
    textDiv.classList.add('drop-shadow-md');
    textDiv.textContent = text;

    flexWrapper.appendChild(textDiv);
    button.appendChild(flexWrapper);

    return button;
}

async function getOrCreateButtonContainer () {
	let container = document.getElementById('betterintra-button-container');
    if (container) return container;

	return new Promise((resolve) => {
        const observer = new MutationObserver((mutations, obs) => {
            const profileHeaderTop = document.querySelector('.border.border-neutral-600.bg-ft-gray\\/50.relative');
            const loginLocationBadge = document.querySelector('.absolute.top-2.right-4');

            if (profileHeaderTop && loginLocationBadge) {
                obs.disconnect();

                // Double check it wasn't created by another script in the meantime
                container = document.getElementById('betterintra-button-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'betterintra-button-container';
                    container.classList.add('right-4', 'absolute');
					container.style.display = 'flex';
					const offset = loginLocationBadge.offsetHeight + 16;
					container.style.marginTop = `${offset}px`;
					profileHeaderTop.appendChild(container);
                }
                resolve(container);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}
