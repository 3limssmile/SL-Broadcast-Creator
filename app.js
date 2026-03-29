document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let colors = ['#00FF20', '#33E0FF'];

    // --- Elements ---
    const elements = {
        inputText: document.getElementById('input-text'),
        inputTime: document.getElementById('input-time'),
        effectType: document.getElementById('effect-type'),
        colorsContainer: document.getElementById('colors-container'),
        addColorBtn: document.getElementById('add-color-btn'),
        livePreview: document.getElementById('live-preview'),
        outputBc: document.getElementById('output-bc'),
        copyBCBtn: document.querySelector('.copy-btn[data-target="output-bc"]'),
        formatBtns: document.querySelectorAll('.format-btn')
    };

    // --- Format Toolbar Logic ---
    const sizeSlider = document.getElementById('size-slider');
    const sizeInput = document.getElementById('size-input');
    const colorPickerInput = document.getElementById('color-picker');
    const colorHexInput = document.getElementById('color-hex-input');

    if (sizeSlider && sizeInput) {
        sizeSlider.addEventListener('input', (e) => {
            sizeInput.value = e.target.value;
        });
        sizeInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (!isNaN(val)) {
                sizeSlider.value = Math.min(Math.max(val, 1), 178);
            }
        });
        sizeInput.addEventListener('change', (e) => {
            // Enforce value on blur/enter
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 45;
            val = Math.min(Math.max(val, 1), 178);
            sizeInput.value = val;
            sizeSlider.value = val;
        });
    }

    if (colorPickerInput && colorHexInput) {
        colorPickerInput.addEventListener('input', (e) => {
            colorHexInput.value = e.target.value.toUpperCase();
        });
        colorHexInput.addEventListener('input', (e) => {
            let val = e.target.value;
            if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
                colorPickerInput.value = val;
            }
        });
        colorHexInput.addEventListener('change', (e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                colorPickerInput.value = val;
                colorHexInput.value = val.toUpperCase();
            } else {
                colorHexInput.value = colorPickerInput.value.toUpperCase();
            }
        });
    }

    function wrapText(textarea, startTag, endTag) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        textarea.value = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end);

        // Restore selection
        textarea.focus();
        textarea.selectionStart = start + startTag.length;
        textarea.selectionEnd = textarea.selectionStart + selectedText.length;

        updateGenerators();
    }


    elements.formatBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tag = btn.getAttribute('data-tag');

            if (tag) {
                // Simple tags: b, i, u, s
                wrapText(elements.inputText, `<${tag}>`, `</${tag}>`);
            } else if (btn.classList.contains('format-size')) {
                const size = sizeInput.value;
                wrapText(elements.inputText, `<size=${size}>`, `</size>`);
            } else if (btn.classList.contains('format-color')) {
                const col = colorHexInput.value;
                wrapText(elements.inputText, `<color=${col}>`, `</color>`);
            } else if (btn.classList.contains('format-mark')) {
                wrapText(elements.inputText, `<mark>`, `</mark>`);
            }
        });
    });

    // --- Color Management UI ---
    function renderColors() {
        elements.colorsContainer.innerHTML = '';

        const effect = elements.effectType.value;
        const isNone = effect === 'none';
        const isGenerated = ['rainbow', 'random', 'randomWord'].includes(effect);

        if (isNone || isGenerated) {
            elements.addColorBtn.style.display = 'none';
            return;
        }

        elements.addColorBtn.style.display = 'block';

        for (let i = 0; i < colors.length; i++) {
            const row = document.createElement('div');
            row.className = 'color-stop-row';

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = colors[i];
            colorInput.addEventListener('input', (e) => {
                colors[i] = e.target.value;
                infoSpan.textContent = e.target.value.toUpperCase();
                updateGenerators();
            });

            const infoSpan = document.createElement('span');
            infoSpan.className = 'color-info';
            infoSpan.textContent = colors[i].toUpperCase();

            row.appendChild(colorInput);
            row.appendChild(infoSpan);

            if (colors.length > 2) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-color-btn';
                removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                removeBtn.addEventListener('click', () => {
                    colors.splice(i, 1);
                    renderColors();
                    updateGenerators();
                });
                row.appendChild(removeBtn);
            }

            elements.colorsContainer.appendChild(row);
        }
    }

    elements.addColorBtn.addEventListener('click', () => {
        colors.push('#ffffff');
        renderColors();
        updateGenerators();
    });

    // --- Helpers ---
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHex(r, g, b) {
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
    }

    function interpolateColor(color1, color2, factor) {
        if (arguments.length < 3) { factor = 0.5; }
        var result = {
            r: Math.round(color1.r + factor * (color2.r - color1.r)),
            g: Math.round(color1.g + factor * (color2.g - color1.g)),
            b: Math.round(color1.b + factor * (color2.b - color1.b))
        };
        return result;
    }

    function getRandomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    }

    function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    }

    // --- Parser Engine ---
    // Extract Unity Rich Text tags so they aren't colorized
    function parseTextIntoTokens(text) {
        const regex = /(<[^>]+>)/g; // Match anything inside < >
        let tokens = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Push preceding text as char tokens (ignore newlines/spaces for counting color length, but keep them for structure)
            if (match.index > lastIndex) {
                let str = text.substring(lastIndex, match.index);
                for (let char of str) {
                    tokens.push({ type: 'text', value: char });
                }
            }
            // Push the tag itself
            tokens.push({ type: 'tag', value: match[0] });
            lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < text.length) {
            let str = text.substring(lastIndex);
            for (let char of str) {
                tokens.push({ type: 'text', value: char });
            }
        }
        return tokens;
    }

    // --- Core Gradient Engine ---
    function updateGenerators() {
        let rawText = elements.inputText.value;
        rawText = rawText.replace(/\\n/g, '\n');

        const time = parseInt(elements.inputTime.value) || 10;
        const effect = elements.effectType.value;

        if (!rawText) {
            elements.livePreview.innerHTML = '';
            elements.outputBc.value = `bc ${time} `;
            return;
        }

        // 1. Break text into tags and characters
        const tokens = parseTextIntoTokens(rawText);

        // 2. Count "colorable" characters (excludes tags and newlines - sadly not spaces)
        let colorableLength = 0;
        for (let t of tokens) {
            if (t.type === 'text') colorableLength++;
        }

        // 3. Prepare Colors based on effect
        let charColors = [];
        if (effect !== 'none' && colorableLength > 0) {
            if (effect === 'rainbow') {
                for (let i = 0; i < colorableLength; i++) {
                    let hue = (i / Math.max(1, colorableLength - 1)) * 360;
                    charColors.push(hslToHex(hue, 100, 50));
                }
            } else if (effect === 'random') {
                for (let i = 0; i < colorableLength; i++) charColors.push(getRandomColor());
            } else if (effect === 'randomWord') {
                let currentWordColor = getRandomColor();
                let idx = 0;
                for (let t of tokens) {
                    if (t.type === 'text') {
                        if (t.value === ' ' || t.value === '\n') {
                            currentWordColor = getRandomColor();
                        }
                        charColors[idx++] = currentWordColor;
                    }
                }
            } else {
                // Standard multi-color gradient
                if (colors.length < 2) colors = ['#ffffff', '#ffffff'];
                const segments = colors.length - 1;
                for (let i = 0; i < colorableLength; i++) {
                    if (colorableLength <= 1) {
                        charColors.push(colors[0].toUpperCase());
                        continue;
                    }
                    let percent = i / (colorableLength - 1);
                    let segmentIndex = Math.min(Math.floor(percent * segments), segments - 1);

                    let c1 = hexToRgb(colors[segmentIndex]);
                    let c2 = hexToRgb(colors[segmentIndex + 1]);

                    let rangeStart = segmentIndex / segments;
                    let rangeEnd = (segmentIndex + 1) / segments;
                    let localFactor = (percent - rangeStart) / (rangeEnd - rangeStart);

                    let blended = interpolateColor(c1, c2, localFactor);
                    charColors.push(rgbToHex(blended.r, blended.g, blended.b));
                }
            }
        }

        // 4. Build Output Command and Preview HTML
        let unityOut = "";
        let previewHtml = "";
        let colorIndex = 0;

        let currentSize = 45;
        let sizeStack = [currentSize];

        for (let t of tokens) {
            if (t.type === 'tag') {
                // It's a Unity tag. Add directly to output.
                unityOut += t.value;

                // For preview HTML, convert some common Unity tags to HTML equivs
                let tagLower = t.value.toLowerCase();

                if (tagLower.startsWith('<color=')) {
                    let cMatch = t.value.match(/<color=([^>]+)>/i);
                    let webCol = cMatch ? cMatch[1] : 'inherit';
                    previewHtml += `<span style="color:${webCol}">`;
                } else if (tagLower === '</color>') {
                    previewHtml += `</span>`;
                } else if (tagLower.startsWith('<size=')) {
                    let sMatch = t.value.match(/<size=([^>]+)>/i);
                    let newSize = sMatch ? parseInt(sMatch[1]) : currentSize;
                    if (isNaN(newSize)) newSize = currentSize;
                    sizeStack.push(newSize);
                    currentSize = newSize;

                    let cssSize = sMatch ? sMatch[1] + 'px' : 'inherit';
                    previewHtml += `<span style="font-size:${cssSize}; line-height: 1;">`;
                } else if (tagLower === '</size>') {
                    if (sizeStack.length > 1) {
                        sizeStack.pop();
                    }
                    currentSize = sizeStack[sizeStack.length - 1];
                    previewHtml += `</span>`;
                } else if (tagLower === '<s>') previewHtml += `<del>`;
                else if (tagLower === '</s>') previewHtml += `</del>`;
                else if (tagLower === '<mark>') {
                    previewHtml += `<span style="background-color:#898900;">`;
                } else if (tagLower === '</mark>') {
                    previewHtml += `</span>`;
                } else {
                    // Just pass standard b, i, u through as HTML allows them mostly
                    previewHtml += t.value;
                }

            } else if (t.type === 'text') {
                // It's a character. Apply global gradient if not 'none'
                let char = t.value;

                if (char === '\n') {
                    unityOut += "\\n";
                    previewHtml += "<br/>";
                } else {
                    if (char === ' ') {
                        unityOut += " ";
                        previewHtml += "&nbsp;";
                    } else {
                        if (effect !== 'none') {
                            let col = charColors[colorIndex];
                            unityOut += `<color=${col}>${char}</color>`;
                            previewHtml += `<span style="color:${col}">${char}</span>`;
                        } else {
                            unityOut += char;
                            previewHtml += char;
                        }
                    }
                }
                colorIndex++;
            }
        }

        // 5. Finalize the command
        elements.outputBc.value = `bc ${time} ${unityOut}`;
        elements.livePreview.innerHTML = `<div style="width: 100%;">${previewHtml}</div>`;
    }

    // --- Listeners ---
    [elements.inputText, elements.inputTime, elements.effectType].forEach(el => {
        el.addEventListener('input', updateGenerators);
        el.addEventListener('change', () => {
            renderColors();
            updateGenerators();
        });
    });

    if (elements.copyBCBtn) {
        elements.copyBCBtn.addEventListener('click', () => {
            elements.outputBc.select();
            elements.outputBc.setSelectionRange(0, 99999);
            document.execCommand('copy');

            const icon = elements.copyBCBtn.querySelector('i');
            icon.className = 'fa-solid fa-check';
            elements.copyBCBtn.classList.replace('btn-primary', 'btn-secondary');
            setTimeout(() => {
                icon.className = 'fa-solid fa-copy';
                elements.copyBCBtn.classList.replace('btn-secondary', 'btn-primary');
            }, 1000);
        });
    }

    // --- Init ---
    renderColors();
    updateGenerators();
});
