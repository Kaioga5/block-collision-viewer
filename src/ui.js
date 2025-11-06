// UI module: updates DOM and wires UI events. Exposes init(containerRefs, callbacks) and updateUI
let refs = {};
let callbacks = {};

export function init(domRefs, cb) {
  refs = domRefs;
  callbacks = cb;

  refs.addBoxBtn.addEventListener('click', () => {
    callbacks.addBox && callbacks.addBox();
  });

  refs.copyJsonBtn.addEventListener('click', onCopyJson);
  refs.loadJsonBtn.addEventListener('click', onLoadJsonClick);

  refs.boxListContainer.addEventListener('change', onUIInputChange);
  refs.boxListContainer.addEventListener('click', onUIListClick);
}

export function updateUI(boxes, selectedBox) {
  updateBoxListUI(boxes, selectedBox);
  updateJsonOutputUI(boxes);

  refs.noBoxesMsg.style.display = boxes.length === 0 ? 'block' : 'none';
  refs.addBoxBtn.disabled = boxes.length >= 16;
  refs.addBoxBtn.classList.toggle('opacity-50', boxes.length >= 16);
  refs.addBoxBtn.classList.toggle('cursor-not-allowed', boxes.length >= 16);
}

function updateBoxListUI(boxes, selectedBox) {
  refs.boxListContainer.innerHTML = '';
  const template = refs.boxTemplate;

  boxes.forEach((box, index) => {
    const item = template.content.cloneNode(true).firstElementChild;
    item.dataset.id = box.id;

    if (selectedBox && selectedBox.id === box.id) item.classList.add('selected');

    item.querySelector('.color-swatch').style.backgroundColor = `#${box.color.toString(16).padStart(6, '0')}`;
    item.querySelector('.box-name').textContent = `Box ${index + 1}`;

    item.querySelector('.origin-x').value = box.origin[0];
    item.querySelector('.origin-y').value = box.origin[1];
    item.querySelector('.origin-z').value = box.origin[2];
    item.querySelector('.size-w').value = box.size[0];
    item.querySelector('.size-h').value = box.size[1];
    item.querySelector('.size-d').value = box.size[2];

    refs.boxListContainer.appendChild(item);
  });
}

function updateJsonOutputUI(boxes) {
  let jsonString = '{\n    "minecraft:collision_box": [\n';
  const boxStrings = boxes.map(box => {
    const originString = `[${box.origin[0]}, ${box.origin[1]}, ${box.origin[2]}]`;
    const sizeString = `[${box.size[0]}, ${box.size[1]}, ${box.size[2]}]`;
    let boxString = '        {\n';
    boxString += `            "origin": ${originString},\n`;
    boxString += `            "size": ${sizeString}\n`;
    boxString += '        }';
    return boxString;
  });

  jsonString += boxStrings.join(',\n');
  jsonString += '\n    ]\n}';

  refs.jsonOutput.textContent = jsonString;
}

function onUIInputChange(event) {
  if (event.target.tagName !== 'INPUT' || event.target.type !== 'number') return;
  const input = event.target;
  const item = input.closest('.box-item');
  if (!item) return;
  const id = item.dataset.id;

  const newOrigin = [
    parseFloat(item.querySelector('.origin-x').value) || 0,
    parseFloat(item.querySelector('.origin-y').value) || 0,
    parseFloat(item.querySelector('.origin-z').value) || 0,
  ].map(v => Math.round(v));

  const newSize = [
    parseFloat(item.querySelector('.size-w').value) || 1,
    parseFloat(item.querySelector('.size-h').value) || 1,
    parseFloat(item.querySelector('.size-d').value) || 1,
  ].map(v => Math.max(1, Math.round(v)));

  // Ask main to update the model
  callbacks.setBoxValues && callbacks.setBoxValues(id, newOrigin, newSize);
}

function onUIListClick(event) {
  const item = event.target.closest('.box-item');
  if (!item) return;
  const id = item.dataset.id;

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'delete') callbacks.deleteBox && callbacks.deleteBox(id);
    else if (action === 'duplicate') callbacks.duplicateBox && callbacks.duplicateBox(id);
  } else {
    callbacks.selectBox && callbacks.selectBox(id);
  }
}

function onCopyJson() {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = refs.jsonOutput.textContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    refs.copyFeedback.style.opacity = '1';
    setTimeout(() => { refs.copyFeedback.style.opacity = '0'; }, 2000);
  } catch (err) {
    console.error('Failed to copy JSON:', err);
    refs.copyFeedback.textContent = 'Failed to copy.';
    refs.copyFeedback.classList.remove('text-green-400');
    refs.copyFeedback.classList.add('text-red-400');
    refs.copyFeedback.style.opacity = '1';
    setTimeout(() => {
      refs.copyFeedback.style.opacity = '0';
      refs.copyFeedback.textContent = 'Copied to clipboard!';
      refs.copyFeedback.classList.remove('text-red-400');
      refs.copyFeedback.classList.add('text-green-400');
    }, 2000);
  }
}

function onLoadJsonClick() {
  const jsonString = refs.jsonImportInput.value;
  let boxArray = [];
  let jsonToParse = jsonString.trim();

  refs.importSuccess.style.opacity = '0';
  refs.importError.style.opacity = '0';

  try {
    let parsed;
    try {
      parsed = JSON.parse(jsonToParse);
    } catch (e) {
      if (jsonToParse.includes(':') && jsonToParse.includes('[')) {
        jsonToParse = jsonToParse.substring(jsonToParse.indexOf('['));
        parsed = JSON.parse(jsonToParse);
      } else {
        throw new Error('Invalid JSON format.');
      }
    }

    if (parsed && parsed['minecraft:collision_box'] && Array.isArray(parsed['minecraft:collision_box'])) {
      boxArray = parsed['minecraft:collision_box'];
    } else if (Array.isArray(parsed)) {
      boxArray = parsed;
    } else {
      throw new Error("Expected an array or { 'minecraft:collision_box': [...] }.");
    }

    const validBoxes = boxArray.every(b => b.origin && Array.isArray(b.origin) && b.origin.length === 3 && b.size && Array.isArray(b.size) && b.size.length === 3);
    if (!validBoxes) throw new Error('Invalid box data. Each box must have origin[3] and size[3].');

    // delegate loading to main via callback
    callbacks.loadBoxes && callbacks.loadBoxes(boxArray.slice(0, 16));

    refs.importSuccess.textContent = `Successfully loaded ${Math.min(boxArray.length, 16)} boxes!`;
    refs.importSuccess.style.opacity = '1';
    setTimeout(() => { refs.importSuccess.style.opacity = '0'; }, 3000);
    refs.jsonImportInput.value = '';
  } catch (err) {
    console.error('Failed to import JSON:', err);
    refs.importError.textContent = `Error: ${err.message}`;
    refs.importError.style.opacity = '1';
    setTimeout(() => { refs.importError.style.opacity = '0'; }, 4000);
  }
}
